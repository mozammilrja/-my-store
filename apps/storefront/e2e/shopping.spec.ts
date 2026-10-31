import { expect, test } from "@playwright/test"

const COUNTRY = "dk"
const PRODUCT = `/${COUNTRY}/products/t-shirt`

const bagCount = async (page: import("@playwright/test").Page) => {
  // The header badge is omitted entirely when the bag is empty.
  const badge = page.getByTestId("nav-cart-count").first()
  if ((await badge.count()) === 0) {
    return 0
  }
  const text = await badge.textContent()
  return Number(text?.replace(/\D/g, "") ?? 0)
}

test.describe("shopping journey", () => {
  test("home page shows real catalog data", async ({ page }) => {
    await page.goto(`/${COUNTRY}`, { waitUntil: "domcontentloaded" })
    await expect(page).toHaveTitle(/Everwear/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByTestId("product-wrapper").first()).toBeVisible()
    await expect(page.getByRole("heading", { name: "Shop by category" })).toBeVisible()
  })

  test("variant selection updates the selected variant", async ({ page }) => {
    await page.goto(PRODUCT, { waitUntil: "domcontentloaded" })
    const options = page.getByTestId("product-options")
    await expect(options.first()).toBeVisible()

    const form = page.getByTestId("product-actions")
    await form.getByText("White", { exact: true }).click()
    await form.getByText("XL", { exact: true }).click()
    await expect(page).toHaveURL(/v_id=variant_/)
    const first = new URL(page.url()).searchParams.get("v_id")

    await form.getByText("M", { exact: true }).click()
    await expect.poll(() => new URL(page.url()).searchParams.get("v_id")).not.toBe(first)
    await expect(page.getByTestId("product-availability")).toContainText(/In stock|Out of stock/)
  })

  test("add to bag, change quantity and remove", async ({ page }) => {
    await page.goto(PRODUCT, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("add-product-button")).toBeEnabled()
    const before = await bagCount(page)

    // A rapid double click must add exactly one unit.
    await page.getByTestId("add-product-button").dblclick()
    await expect.poll(() => bagCount(page)).toBe(before + 1)
    await page.waitForTimeout(1500)
    expect(await bagCount(page)).toBe(before + 1)

    // The quantity buttons only work once the page has hydrated.
    await page.goto(`/${COUNTRY}/cart`, { waitUntil: "networkidle" })
    const row = page.getByTestId("product-row").filter({ hasText: "Everwear T-Shirt" }).first()
    await expect(row).toBeVisible()
    const qty = row.getByTestId("product-quantity")
    const start = Number(await qty.textContent())

    await row.getByRole("button", { name: "Increase quantity" }).click()
    await expect(qty).toHaveText(String(start + 1))
    const total = page.getByTestId("cart-total")
    await expect(total).not.toHaveAttribute("data-value", "0")

    await row.getByTestId("product-delete-button").click()
    await expect(page.getByTestId("product-row").filter({ hasText: "Everwear T-Shirt" })).toHaveCount(0)
  })

  test("store listing filters and sorts", async ({ page }) => {
    await page.goto(`/${COUNTRY}/store`, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("products-list")).toBeVisible()
    await page.getByTestId("option-refinement").filter({ hasText: /^M\d+$/ }).first().click()
    await expect(page).toHaveURL(/option=Size%3AM/)
    await expect(page.getByTestId("products-list")).toBeVisible()
  })

  test("quick add from a product card adds one item", async ({ page }) => {
    await page.goto(`/${COUNTRY}`, { waitUntil: "domcontentloaded" })
    const card = page.getByTestId("product-wrapper").filter({ has: page.getByTestId("quick-add") }).first()
    await card.scrollIntoViewIfNeeded()
    const before = await bagCount(page)
    await card.hover()
    const size = card.getByTestId("quick-add").getByRole("button", { name: /^Add size/ }).filter({ hasNot: page.locator("[disabled]") }).first()
    await expect(size).toBeVisible()
    await size.click()
    await expect.poll(() => bagCount(page)).toBe(before + 1)
  })

  test("unknown product shows not found", async ({ page }) => {
    const response = await page.goto(`/${COUNTRY}/products/does-not-exist-xyz`, { waitUntil: "domcontentloaded" })
    expect(response?.status()).toBe(404)
  })
})
