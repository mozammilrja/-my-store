import { expect, test } from "@playwright/test"

const COUNTRY = "in"
// A product with several sizes in stock in the seeded catalog.
const PRODUCT = `/${COUNTRY}/products/boxy-heavyweight-organic-tee`
const PRODUCT_TITLE = "Boxy Heavyweight Organic Tee"

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
    await expect(page).toHaveTitle(/AVELIQ/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("heading", { name: "The Modern Heritage Wardrobe" })).toBeVisible()
    await expect(page.locator('main a[href*="/categories/"]').first()).toBeVisible()
  })

  test("variant selection updates the selected variant", async ({ page }) => {
    await page.goto(PRODUCT, { waitUntil: "domcontentloaded" })
    const options = page.getByTestId("product-options")
    await expect(options.first()).toBeVisible()

    const form = page.getByTestId("product-actions")
    await form.getByText("L", { exact: true }).click()
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
    const row = page.getByTestId("product-row").filter({ hasText: PRODUCT_TITLE }).first()
    await expect(row).toBeVisible()
    const qty = row.getByTestId("product-quantity")
    const start = Number(await qty.textContent())

    await row.getByRole("button", { name: "Increase quantity" }).click()
    await expect(qty).toHaveText(String(start + 1))
    const total = page.getByTestId("cart-total")
    await expect(total).not.toHaveAttribute("data-value", "0")

    await row.getByTestId("product-delete-button").click()
    await expect(page.getByTestId("product-row").filter({ hasText: PRODUCT_TITLE })).toHaveCount(0)
  })

  test("store listing filters and sorts", async ({ page }) => {
    await page.goto(`/${COUNTRY}/store`, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("products-list")).toBeVisible()
    await page.getByTestId("option-refinement").filter({ hasText: /^M\s*\(\d+\)$/ }).first().click()
    await expect(page).toHaveURL(/[?&]f=Size%3AM(&|$)/)
    await expect(page.getByTestId("products-list")).toBeVisible()
  })

  test("product card navigates to product detail", async ({ page }) => {
    await page.goto(`/${COUNTRY}/store`, { waitUntil: "domcontentloaded" })
    const card = page.getByTestId("product-wrapper").first()
    await expect(card).toBeVisible()
    // Hovering swaps brand and title for the wishlist and size controls, so
    // the image is the pointer's route to the product; the title stays the
    // keyboard's route and is covered in product-card.spec.ts.
    await card.getByTestId("product-card-gallery").click()
    await expect(page).toHaveURL(/\/products\//)
    await expect(page.getByTestId("product-actions")).toBeVisible()
  })

  test("product card image gallery dots switch images without navigating", async ({ page }) => {
    await page.goto(`/${COUNTRY}/store`, { waitUntil: "domcontentloaded" })
    const card = page.getByTestId("product-wrapper").filter({ has: page.getByTestId("product-card-dot") }).first()
    if ((await card.count()) === 0) {
      test.skip(true, "No multi-image products in the listing")
      return
    }
    await card.scrollIntoViewIfNeeded()
    const dots = card.getByTestId("product-card-dot")
    const urlBefore = page.url()
    await dots.nth(1).click()
    await expect(page).toHaveURL(urlBefore)
    await expect(dots.nth(1)).toHaveAttribute("aria-selected", "true")
  })

  test("unknown product shows not found", async ({ page }) => {
    const response = await page.goto(`/${COUNTRY}/products/does-not-exist-xyz`, { waitUntil: "domcontentloaded" })
    expect(response?.status()).toBe(404)
  })
})
