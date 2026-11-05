import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createHash } from "node:crypto"
import { expect } from "@playwright/test"

export const API_URL = process.env.ADMIN_E2E_API_URL ?? "http://localhost:9100"
export const ADMIN_EMAIL = process.env.ADMIN_E2E_EMAIL ?? "admin@everwear.test"
export const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD ?? "adminpassword123"

export const THEME_KEY = "everwear_admin_theme"
/** The operations portal's session cookie (httpOnly, set by POST /ops/auth/login). */
export const SESSION_COOKIE = "everwear_ops"

/** The modules the nav offers, in nav order. They live under /admin in the portal. */
export const MODULES = [
  { path: "overview", title: /^overview$/i },
  { path: "analytics-and-reports", title: /analytics/i },
  { path: "order-management", title: /^orders$/i },
  { path: "products", title: /^products$/i },
  { path: "returns-and-exchanges", title: /returns/i },
  { path: "inventory-and-warehouses", title: /inventory/i },
  { path: "purchase-orders-and-suppliers", title: /purchase order|procurement/i },
  { path: "gst-and-tax-invoices", title: /gst|invoice|tax/i },
  { path: "payments-and-reconciliation", title: /payment|settlement|reconcil/i },
  { path: "categories-and-collections", title: /categor|collection|taxonomy/i },
  { path: "shipments-and-dispatch", title: /shipment|dispatch/i },
  { path: "warehouse-operations", title: /^warehouse operations$/i },
  { path: "delivery-fleet", title: /^delivery fleet$/i },
  { path: "logistics-analytics", title: /^logistics analytics$/i },
  { path: "marketplace-sellers", title: /^sellers & settlements$/i },
  { path: "customers-and-loyalty", title: /customer|loyalty|clientel/i },
  { path: "cash-on-delivery", title: /^cash on delivery$/i },
  { path: "credit-notes-and-refunds", title: /credit note|refund/i },
  { path: "promotions-and-coupons", title: /promotion|coupon|campaign/i },
  { path: "users-and-role-access", title: /user|role|access/i },
  { path: "notifications", title: /^notifications$/i },
  { path: "system-settings", title: /setting|governance/i },
]

const CACHE = path.join(os.tmpdir(), `everwear-admin-e2e-auth-${createHash("sha256").update(`${API_URL}|${ADMIN_EMAIL}`).digest("hex").slice(0, 16)}.json`)
const CACHE_TTL_MS = 30 * 60 * 1000

let cached = null

function readCache() {
  try {
    const c = JSON.parse(fs.readFileSync(CACHE, "utf8"))
    if (c.token && c.cookie && Date.now() - c.at < CACHE_TTL_MS) return c
  } catch {
    /* no usable cache */
  }
  return null
}

/**
 * One sign-in per run, shared across spec files through a short-lived cache:
 * the API rate-limits sign-ins per email, which a suite signing in per test
 * (the typography matrix opens ~180 pages) would exhaust on its own.
 *
 * Two credentials come back: the portal session cookie, which the browser
 * uses exactly as a person's would, and a bearer token from the admin's
 * original login route, which the API still accepts and the specs use for
 * their own API-level checks.
 */
async function signInOnce(request) {
  if (cached) return cached
  cached = readCache()
  if (cached) return cached

  const portal = await request.post(`${API_URL}/ops/auth/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
  expect(portal.ok(), portal.status() === 429 ? "portal sign-in is rate-limited; wait and re-run" : `portal sign-in failed: ${portal.status()}`).toBeTruthy()
  const setCookie = portal.headersArray().find((h) => h.name.toLowerCase() === "set-cookie" && h.value.startsWith(`${SESSION_COOKIE}=`))
  expect(setCookie, "the sign-in set the session cookie").toBeTruthy()
  const cookie = setCookie.value.split(";")[0].slice(SESSION_COOKIE.length + 1)

  const legacy = await request.post(`${API_URL}/admin/auth/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
  expect(legacy.ok(), `admin login failed: ${legacy.status()}`).toBeTruthy()

  cached = { token: (await legacy.json()).token, cookie, at: Date.now() }
  try {
    fs.writeFileSync(CACHE, JSON.stringify(cached))
  } catch {
    /* cache is an optimisation, not a requirement */
  }
  return cached
}

/** Forgets the cached sign-in: a fresh throwaway database has none of its sessions. */
export function resetAuthCache() {
  cached = null
  fs.rmSync(CACHE, { force: true })
}

/** A bearer token for the specs' own API calls. */
export async function getAdminToken(request) {
  return (await signInOnce(request)).token
}

/**
 * Signs the browser context in (the portal session cookie, as the sign-in
 * form would leave it) and sets the theme before any app script runs.
 * `token` is accepted for the specs' old call shape; the session is what
 * the browser uses.
 */
export async function seed(context, { theme = "light" } = {}) {
  const { cookie } = await signInOnce(context.request)
  const api = new URL(API_URL)
  await context.addCookies([{ name: SESSION_COOKIE, value: cookie, domain: api.hostname, path: "/", httpOnly: true, sameSite: "Strict", secure: false }])
  await context.addInitScript(
    ([themeKey, themeValue]) => {
      try {
        localStorage.setItem(themeKey, themeValue)
      } catch {
        /* storage unavailable */
      }
    },
    [THEME_KEY, theme]
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
  await page.goto(`/admin/${path}`, { waitUntil: "load" })

  /*
   * Wait for the module to finish loading before looking for its heading.
   *
   * While a module loads it replaces the whole page with SkeletonPage, which
   * draws a grey bar where the title goes and carries no h1 at all. Checking
   * for the heading first therefore raced the API: under the load of a full
   * run one module per run would miss its window and fail with "element not
   * found", a different module each time.
   */
  await page.waitForFunction(
    () => !document.querySelector('main [role="status"][aria-busy="true"]'),
    undefined,
    { timeout: 30_000 }
  )
  await expect(page.locator("main h1")).toBeVisible()

  /*
   * Then the web fonts, before anything measures text. Until Inter and the
   * icon font load the browser lays out with a wider fallback, so borderline
   * strings wrap to an extra line and typography assertions failed depending
   * on whether the font was already cached.
   *
   * waitForFunction rather than evaluating the fonts.ready promise: a module
   * that rewrites the URL on mount navigates underneath us and destroys the
   * execution context mid-promise. waitForFunction re-runs after a navigation
   * instead of failing.
   */
  await page.waitForFunction(() => document.fonts.status === "loaded", undefined, {
    timeout: 15_000,
  })
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
      // checkVisibility() is false for controls not rendered, such as those inside a closed <details>.
      return r.width > 4 && r.height > 4 && s.visibility !== "hidden" && s.opacity !== "0" && s.pointerEvents !== "none" && el.checkVisibility?.() !== false
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
