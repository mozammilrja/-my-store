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
  { name: "mobile-390", width: 390, height: 844 },
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
    await expect(page.locator("main h1")).toHaveText(/catalog/i)
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
