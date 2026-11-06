import { test, expect } from "@playwright/test"
import {
  MODULES,
  getAdminToken,
  seed,
  gotoModule,
  pageOverflow,
  escapingElements,
  overlappingControls,
} from "./helpers.js"

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 860 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-414", width: 414, height: 896 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-360", width: 360, height: 780 },
]

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    for (const mod of MODULES) {
      test(`${mod.path} reflows without sideways scroll`, async ({ page, context, request }) => {
        await seed(context, { token: await getAdminToken(request) })
        await gotoModule(page, mod.path)

        expect(await pageOverflow(page), `${mod.path} at ${vp.width}px scrolls sideways`).toBe(0)
        expect(await escapingElements(page), `${mod.path} at ${vp.width}px paints outside`).toEqual([])
        expect(await overlappingControls(page), `${mod.path} at ${vp.width}px overlaps`).toEqual([])
      })
    }
  })
}

test.describe("mobile shell", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test("the sidebar is off-canvas and opens from the header", async ({ page, context, request }) => {
    await seed(context, { token: await getAdminToken(request) })
    await gotoModule(page, "overview")

    const aside = page.locator("aside")
    const offscreen = await aside.evaluate((el) => el.getBoundingClientRect().right <= 0)
    expect(offscreen, "sidebar covers the content at 390px").toBe(true)

    await page.getByRole("button", { name: /open navigation/i }).click()
    await page.waitForTimeout(400)
    expect(await aside.evaluate((el) => el.getBoundingClientRect().left)).toBe(0)

    await page.getByRole("link", { name: /^Products/ }).click()
    await expect(page.locator("main h1")).toHaveText(/^products$/i)
    await page.waitForTimeout(400)
    expect(await aside.evaluate((el) => el.getBoundingClientRect().right <= 0)).toBe(true)
    expect(await pageOverflow(page)).toBe(0)
  })

  test("header controls stay reachable", async ({ page, context, request }) => {
    await seed(context, { token: await getAdminToken(request) })
    await gotoModule(page, "overview")

    for (const name of [/open navigation/i, /open command palette/i, /operational alerts/i, /^Theme:/]) {
      const control = page.getByRole("button", { name }).first()
      await expect(control).toBeVisible()
      const box = await control.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(390)
    }
  })
})

/**
 * Every visible dialog fits a 360px phone: inside the viewport, and either
 * short enough to see whole or scrollable inside.
 */
async function dialogProblems(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const vh = window.innerHeight
    const out = []
    for (const d of document.querySelectorAll('[role="dialog"], dialog[open]')) {
      if (!d.checkVisibility?.()) continue
      const r = d.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue
      const name = d.getAttribute("aria-label") || d.textContent.trim().slice(0, 30)
      if (r.left < -1 || r.right > vw + 1) out.push(`${name}: ${Math.round(r.left)}..${Math.round(r.right)} outside 0..${vw}`)
      if (r.bottom > vh + 1) {
        // Taller than the screen: something inside it has to scroll.
        const scrolls = [d, ...d.querySelectorAll("*")].some((el) => /auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight)
        if (!scrolls) out.push(`${name}: ${Math.round(r.bottom)}px tall on a ${vh}px screen and nothing scrolls`)
      }
    }
    return out
  })
}

test.describe("phone overlays (360px)", () => {
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true })

  test("the command palette fits and its results scroll", async ({ page, context, request }) => {
    await seed(context, { token: await getAdminToken(request) })
    await gotoModule(page, "overview")
    await page.getByRole("button", { name: /open command palette/i }).first().click()
    await expect(page.getByRole("dialog").first()).toBeVisible()
    expect(await dialogProblems(page)).toEqual([])
    expect(await pageOverflow(page)).toBe(0)
  })

  test("the notifications panel fits", async ({ page, context, request }) => {
    await seed(context, { token: await getAdminToken(request) })
    await gotoModule(page, "overview")
    await page.getByRole("button", { name: /operational alerts/i }).first().click()
    await expect(page.getByRole("dialog").first()).toBeVisible()
    expect(await dialogProblems(page)).toEqual([])
  })

  test("an order's details open below the list and fit", async ({ page, context, request }) => {
    await seed(context, { token: await getAdminToken(request) })
    await gotoModule(page, "order-management")
    await page.getByRole("row", { name: /#1004/ }).click()
    // Below xl the inspector is a card under the list, not an overlay.
    const close = page.getByRole("button", { name: "Close order details" })
    await expect(close).toBeVisible()
    await expect(page.locator("main").getByRole("heading", { name: "#1004" })).toBeVisible()
    expect(await pageOverflow(page)).toBe(0)
    expect(await escapingElements(page)).toEqual([])
  })

  test("the create-order dialog fits", async ({ page, context, request }) => {
    await seed(context, { token: await getAdminToken(request) })
    await gotoModule(page, "order-management")
    await page.getByRole("button", { name: "Create manual order" }).click()
    await expect(page.getByRole("dialog").first()).toBeVisible()
    await page.waitForTimeout(300)
    expect(await dialogProblems(page)).toEqual([])
    expect(await pageOverflow(page)).toBe(0)
  })

  test("the product editor fits", async ({ page, context, request }) => {
    await seed(context, { token: await getAdminToken(request) })
    await gotoModule(page, "products")
    await page.getByRole("button", { name: "Add New Style" }).click()
    await page.waitForTimeout(500)
    expect(await dialogProblems(page)).toEqual([])
    expect(await pageOverflow(page)).toBe(0)
    expect(await escapingElements(page)).toEqual([])
  })

  test("the account menu fits", async ({ page, context, request }) => {
    await seed(context, { token: await getAdminToken(request) })
    await gotoModule(page, "overview")
    await page.locator("header").getByRole("button", { expanded: false }).last().click()
    const menu = page.getByRole("menu").first()
    await expect(menu).toBeVisible()
    const box = await menu.boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(360)
  })
})
