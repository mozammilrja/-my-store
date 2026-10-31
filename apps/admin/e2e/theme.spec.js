import { test, expect } from "@playwright/test"
import { MODULES, getAdminToken, seed, gotoModule, THEME_KEY } from "./helpers.js"

/** Relative luminance of a computed `rgb()` / `rgba()` string. */
const LUMINANCE = `(value) => {
  const parts = value.match(/[\\d.]+/g) || []
  const [r, g, b] = parts.map(Number)
  const channel = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}`

async function surfaceLuminance(page) {
  return page.evaluate(
    ([lumSrc]) => {
      // eslint-disable-next-line no-new-func
      const lum = new Function(`return ${lumSrc}`)()
      const read = (sel) => {
        const el = document.querySelector(sel)
        return el ? lum(getComputedStyle(el).backgroundColor) : null
      }
      return {
        body: lum(getComputedStyle(document.body).backgroundColor),
        sidebar: read("aside"),
        header: read("header"),
        text: lum(getComputedStyle(document.body).color),
        dark: document.documentElement.classList.contains("dark"),
      }
    },
    [LUMINANCE]
  )
}

test("light mode is genuinely light across every shell surface", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request), theme: "light" })
  await gotoModule(page, "overview")

  const l = await surfaceLuminance(page)
  expect(l.dark).toBe(false)
  expect(l.body).toBeGreaterThan(0.7)
  expect(l.sidebar).toBeGreaterThan(0.7)
  expect(l.header).toBeGreaterThan(0.7)
  expect(l.text).toBeLessThan(0.1)
})

test("dark mode is genuinely dark across every shell surface", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request), theme: "dark" })
  await gotoModule(page, "overview")

  const l = await surfaceLuminance(page)
  expect(l.dark).toBe(true)
  expect(l.body).toBeLessThan(0.05)
  expect(l.sidebar).toBeLessThan(0.05)
  expect(l.header).toBeLessThan(0.08)
  expect(l.text).toBeGreaterThan(0.7)
})

test("the theme toggle repaints the whole UI without a reload", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request), theme: "light" })
  await gotoModule(page, "order-management")

  // A sentinel survives only if the document is never reloaded.
  await page.evaluate(() => {
    window.__themeSentinel = "alive"
  })

  const before = await surfaceLuminance(page)
  expect(before.dark).toBe(false)

  await page.getByRole("button", { name: /^Theme:/ }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)

  const after = await surfaceLuminance(page)
  expect(after.dark).toBe(true)
  expect(after.body).toBeLessThan(0.05)
  expect(after.sidebar).toBeLessThan(0.05)
  expect(after.header).toBeLessThan(0.08)

  expect(await page.evaluate(() => window.__themeSentinel)).toBe("alive")
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe("dark")
})

test("every module paints dark surfaces in dark mode", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request), theme: "dark" })

  for (const mod of MODULES) {
    await gotoModule(page, mod.path)
    const bright = await page.evaluate(() => {
      const lum = (value) => {
        const parts = value.match(/[\d.]+/g) || []
        const [r, g, b, a = 1] = parts.map(Number)
        if (a < 0.9) return 0
        const channel = (c) => {
          const s = c / 255
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
      }
      const offenders = []
      for (const el of document.querySelectorAll("main *")) {
        const r = el.getBoundingClientRect()
        // Only large opaque panels; small chips may legitimately be bright.
        if (r.width < 160 || r.height < 60) continue
        const bg = getComputedStyle(el).backgroundColor
        if (lum(bg) > 0.5) offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} ${bg}`)
      }
      return [...new Set(offenders)].slice(0, 4)
    })
    expect(bright, `${mod.path} paints a light panel in dark mode`).toEqual([])
  }
})

test("overlays and portals follow the theme", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request), theme: "dark" })
  await gotoModule(page, "overview")

  // Profile menu
  await page.getByRole("button", { name: /Ananya Sharma|VP Operations/ }).first().click()
  const menu = page.getByRole("menu")
  await expect(menu).toBeVisible()
  const menuLum = await menu.evaluate((el) => {
    const parts = getComputedStyle(el).backgroundColor.match(/[\d.]+/g).map(Number)
    const channel = (c) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * channel(parts[0]) + 0.7152 * channel(parts[1]) + 0.0722 * channel(parts[2])
  })
  expect(menuLum).toBeLessThan(0.1)
  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()

  // Hub listbox in the sidebar footer
  await page.getByRole("button", { name: /Node hub/i }).click()
  const listbox = page.getByRole("listbox", { name: /fulfillment node/i })
  await expect(listbox).toBeVisible()
  const listLum = await listbox.evaluate((el) => {
    const parts = getComputedStyle(el).backgroundColor.match(/[\d.]+/g).map(Number)
    const channel = (c) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * channel(parts[0]) + 0.7152 * channel(parts[1]) + 0.0722 * channel(parts[2])
  })
  expect(listLum).toBeLessThan(0.1)
  await page.keyboard.press("Escape")
  await expect(listbox).toBeHidden()
})
