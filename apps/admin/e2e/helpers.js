import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect } from "@playwright/test"

export const API_URL = process.env.ADMIN_E2E_API_URL ?? "http://localhost:9100"
export const ADMIN_EMAIL = process.env.ADMIN_E2E_EMAIL ?? "admin@everwear.test"
export const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD ?? "adminpassword123"

export const THEME_KEY = "everwear_admin_theme"
export const TOKEN_KEY = "everwear_admin_token"

/** The sixteen modules the nav offers, in nav order. */
export const MODULES = [
  { path: "overview", title: /executive overview/i },
  { path: "analytics-and-reports", title: /analytics/i },
  { path: "order-management", title: /order management/i },
  { path: "products", title: /catalog/i },
  { path: "returns-and-exchanges", title: /returns/i },
  { path: "inventory-and-warehouses", title: /inventory/i },
  { path: "purchase-orders-and-suppliers", title: /purchase order|procurement/i },
  { path: "gst-and-tax-invoices", title: /gst|invoice|tax/i },
  { path: "payments-and-reconciliation", title: /payment|settlement|reconcil/i },
  { path: "categories-and-collections", title: /categor|collection|taxonomy/i },
  { path: "shipments-and-dispatch", title: /shipment|dispatch/i },
  { path: "customers-and-loyalty", title: /customer|loyalty|clientel/i },
  { path: "credit-notes-and-refunds", title: /credit note|refund/i },
  { path: "promotions-and-coupons", title: /promotion|coupon|campaign/i },
  { path: "users-and-role-access", title: /user|role|access/i },
  { path: "system-settings", title: /setting|governance/i },
]

const TOKEN_CACHE = path.join(os.tmpdir(), "everwear-admin-e2e-token.json")
const TOKEN_TTL_MS = 30 * 60 * 1000

let cachedToken = null

function readCachedToken() {
  try {
    const { token, at } = JSON.parse(fs.readFileSync(TOKEN_CACHE, "utf8"))
    if (token && Date.now() - at < TOKEN_TTL_MS) return token
  } catch {
    /* no usable cache */
  }
  return null
}

/**
 * One sign-in per run, shared across spec files through a short-lived cache.
 * `/admin/auth/login` allows five attempts per fifteen minutes, which a suite
 * that signs in per spec file would exhaust on its own.
 */
export async function getAdminToken(request) {
  if (cachedToken) return cachedToken
  cachedToken = readCachedToken()
  if (cachedToken) return cachedToken

  const res = await request.post(`${API_URL}/admin/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  expect(
    res.ok(),
    res.status() === 429
      ? "admin login is rate-limited (5 attempts / 15 min); wait and re-run"
      : `admin login failed: ${res.status()}`
  ).toBeTruthy()

  cachedToken = (await res.json()).token
  try {
    fs.writeFileSync(TOKEN_CACHE, JSON.stringify({ token: cachedToken, at: Date.now() }))
  } catch {
    /* cache is an optimisation, not a requirement */
  }
  return cachedToken
}

/** Seeds the token and theme before any app script runs. */
export async function seed(context, { token, theme = "light" } = {}) {
  await context.addInitScript(
    ([tokenKey, tokenValue, themeKey, themeValue]) => {
      try {
        if (tokenValue) localStorage.setItem(tokenKey, tokenValue)
        localStorage.setItem(themeKey, themeValue)
      } catch {
        /* storage unavailable */
      }
    },
    [TOKEN_KEY, token, THEME_KEY, theme]
  )
}

/** Collects console errors and page errors for the life of the page. */
export function watchConsole(page) {
  const entries = []
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") entries.push(msg.text())
  })
  page.on("pageerror", (err) => entries.push(`pageerror: ${err.message}`))
  return entries
}

/** Navigates to a module and waits for its content, not just the shell. */
export async function gotoModule(page, path) {
  await page.goto(`/#/${path}`, { waitUntil: "load" })
  await expect(page.locator("main h1")).toBeVisible()
  await page.waitForFunction(
    () => !document.querySelector('main [role="status"][aria-busy="true"]'),
    undefined,
    { timeout: 20_000 }
  )
}

/** scrollWidth beyond clientWidth means the page itself scrolls sideways. */
export function pageOverflow(page) {
  return page.evaluate(() => {
    const de = document.documentElement
    return Math.max(0, de.scrollWidth - de.clientWidth)
  })
}

/**
 * Pairs of visible interactive controls whose on-screen boxes overlap.
 * Rects are clipped by every scrolling or hidden ancestor first, so content
 * parked outside a scroll panel is not counted.
 */
export function overlappingControls(page) {
  return page.evaluate(() => {
    const clips = (el) => {
      const s = getComputedStyle(el)
      return /auto|scroll|hidden|clip/.test(s.overflowX) || /auto|scroll|hidden|clip/.test(s.overflowY)
    }
    const visibleRect = (el) => {
      const r = el.getBoundingClientRect()
      const box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
      for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
        if (!clips(p)) continue
        const pr = p.getBoundingClientRect()
        box.left = Math.max(box.left, pr.left)
        box.top = Math.max(box.top, pr.top)
        box.right = Math.min(box.right, pr.right)
        box.bottom = Math.min(box.bottom, pr.bottom)
      }
      return box
    }

    const controls = [
      ...document.querySelectorAll('main button, main a, main input, main select, main [role="tab"]'),
    ].filter((el) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return r.width > 4 && r.height > 4 && s.visibility !== "hidden" && s.opacity !== "0" && s.pointerEvents !== "none"
    })

    const hits = []
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i]
        const b = controls[j]
        if (a.contains(b) || b.contains(a)) continue
        const ra = visibleRect(a)
        const rb = visibleRect(b)
        if (ra.right <= ra.left || ra.bottom <= ra.top) continue
        if (rb.right <= rb.left || rb.bottom <= rb.top) continue
        const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
        const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
        if (ox > 4 && oy > 4) {
          hits.push(
            `${a.tagName.toLowerCase()}[${(a.textContent || a.ariaLabel || "").trim().slice(0, 24)}] x ` +
              `${b.tagName.toLowerCase()}[${(b.textContent || b.ariaLabel || "").trim().slice(0, 24)}]`
          )
        }
      }
    }
    return hits.slice(0, 8)
  })
}

/** Elements painted past the right edge that no ancestor scroller accounts for. */
export function escapingElements(page) {
  return page.evaluate(() => {
    const de = document.documentElement
    const vw = de.clientWidth
    const clips = (el) => {
      const s = getComputedStyle(el)
      return /auto|scroll|hidden|clip/.test(s.overflowX)
    }
    const out = []
    for (const el of document.querySelectorAll("main *")) {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      if (getComputedStyle(el).position === "fixed") continue
      if (r.right <= vw + 1) continue
      let inside = false
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (clips(p)) {
          inside = true
          break
        }
      }
      if (!inside) {
        out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`)
      }
    }
    return out.slice(0, 6)
  })
}

/** Rendered text smaller than 10px is below the project's readability floor. */
export function tinyText(page) {
  return page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll("main *")) {
      const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      if (!hasOwnText) continue
      const fs = parseFloat(getComputedStyle(el).fontSize)
      if (fs && fs < 10) out.push(`${fs}px "${el.textContent.trim().slice(0, 24)}"`)
    }
    return [...new Set(out)].slice(0, 6)
  })
}

/** Icon-only controls with no accessible name. */
export function unlabelledControls(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("main button, header button, aside button")]
      .filter((el) => !(el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || "").trim())
      .map((el) => String(el.className).slice(0, 60))
      .slice(0, 6)
  )
}
