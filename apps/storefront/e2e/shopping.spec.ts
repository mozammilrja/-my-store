import { expect, test } from "@playwright/test"

const COUNTRY = "dk"
const PRODUCT = `/${COUNTRY}/products/t-shirt`

const bagCount = async (page: import("@playwright/test").Page) => {
  const text = await page.getByTestId("nav-cart-count").first().textContent()
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

    await page.getByText("White", { exact: true }).click()
    await page.getByText("XL", { exact: true }).click()
    await expect(page).toHaveURL(/v_id=variant_/)
    const first = new URL(page.url()).searchParams.get("v_id")

    await page.getByText("M", { exact: true }).click()
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

    await page.goto(`/${COUNTRY}/cart`, { waitUntil: "domcontentloaded" })
    const row = page.getByTestId("product-row").filter({ hasText: "Medusa T-Shirt" }).first()
    await expect(row).toBeVisible()
    const qty = row.getByTestId("product-quantity")
    const start = Number(await qty.textContent())

    await row.getByRole("button", { name: "Increase quantity" }).click()
    await expect(qty).toHaveText(String(start + 1))
    const total = page.getByTestId("cart-total")
    await expect(total).not.toHaveAttribute("data-value", "0")

    await row.getByTestId("product-delete-button").click()
    await expect(page.getByTestId("product-row").filter({ hasText: "Medusa T-Shirt" })).toHaveCount(0)
  })

  test("store listing filters and sorts", async ({ page }) => {
    await page.goto(`/${COUNTRY}/store`, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("products-list")).toBeVisible()
    await page.getByRole("button", { name: "M", exact: true }).first().click()
    await expect(page).toHaveURL(/refinementList/)
    await expect(page.getByTestId("products-list")).toBeVisible()
  })

  test("unknown product shows not found", async ({ page }) => {
    const response = await page.goto(`/${COUNTRY}/products/does-not-exist-xyz`, { waitUntil: "domcontentloaded" })
    expect(response?.status()).toBe(404)
  })
})
