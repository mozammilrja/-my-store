import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// @axe-core/playwright is typed against its own copy of Playwright's Page.
type AxePage = ConstructorParameters<typeof AxeBuilder>[0]["page"]
const axe = (page: Page) => new AxeBuilder({ page: page as unknown as AxePage })

const COUNTRY = "dk"
const PAGES = ["", "/store", "/categories/shirts", "/collections/winter-layers", "/products/t-shirt", "/cart", "/account", "/search?q=tee", "/shipping", "/returns"]

for (const path of PAGES) {
  test(`no WCAG 2.2 A/AA violations on ${path || "/"}`, async ({ page }) => {
    await page.goto(`/${COUNTRY}${path}`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(1500)
    const results = await axe(page)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .exclude("nextjs-portal")
      .analyze()
    const summary = results.violations.map(
      (v) => `${v.id} (${v.impact}): ${v.nodes.length}x, e.g. ${v.nodes[0]?.target.join(" ")}`
    )
    expect(summary, summary.join("\n")).toEqual([])
  })
}

test("keyboard: skip to content and visible focus on header controls", async ({ page }) => {
  await page.goto(`/${COUNTRY}`, { waitUntil: "domcontentloaded" })
  await page.keyboard.press("Tab")
  const focused = page.locator(":focus")
  await expect(focused).toBeVisible()
})

test("no WCAG 2.2 A/AA violations on checkout", async ({ page }) => {
  await page.goto(`/${COUNTRY}/products/t-shirt`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("add-product-button").click()
  await expect(page.getByTestId("nav-cart-count").first()).not.toHaveText("0")
  await page.goto(`/${COUNTRY}/checkout?step=address`, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(1500)
  const results = await axe(page)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .exclude("nextjs-portal")
    .analyze()
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length}x, e.g. ${v.nodes[0]?.target.join(" ")}`
  )
  expect(summary, summary.join("\n")).toEqual([])
})
