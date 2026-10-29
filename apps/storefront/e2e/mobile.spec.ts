import { expect, test } from "@playwright/test"

const COUNTRY = "dk"
const PAGES = ["", "/store", "/categories/shirts", "/products/t-shirt", "/cart", "/account", "/search?q=tee", "/shipping"]

test("mobile menu opens, navigates and closes", async ({ page }) => {
  await page.goto(`/${COUNTRY}`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("nav-menu-button").click()
  const menu = page.getByRole("dialog")
  await expect(menu).toBeVisible()
  await menu.getByRole("link", { name: "Shop all" }).click()
  await expect(page).toHaveURL(/\/store/)
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("filters open in a sheet on mobile", async ({ page }) => {
  await page.goto(`/${COUNTRY}/store`, { waitUntil: "domcontentloaded" })
  await page.getByRole("button", { name: "Filters" }).click()
  await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible()
  await page.getByRole("button", { name: "Show results" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

for (const width of [360, 390, 768]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    for (const path of PAGES) {
      await page.goto(`/${COUNTRY}${path}`, { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(500)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `${path || "/"} overflows by ${overflow}px`).toBeLessThanOrEqual(0)
    }
  })
}
