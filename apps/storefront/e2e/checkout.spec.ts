import { expect, test } from "@playwright/test"

const COUNTRY = "in"

/**
 * Guest checkout with the manual (system default) payment provider, the only
 * one configured on this backend. Creates a real order in the local database.
 */
test("guest checkout reaches order confirmation", async ({ page }) => {
  test.setTimeout(180_000)

  await page.goto(`/${COUNTRY}/products/heavyweight-fleece-hooded-sweatshirt`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("add-product-button").click()
  await expect(page.getByTestId("nav-cart-count").first()).not.toHaveText("0")

  await page.goto(`/${COUNTRY}/checkout?step=address`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("shipping-first-name-input").fill("Test")
  await page.getByTestId("shipping-last-name-input").fill("Shopper")
  await page.getByTestId("shipping-address-input").fill("12 MG Road")
  await page.getByTestId("shipping-postal-code-input").fill("560001")
  await page.getByTestId("shipping-city-input").fill("Bengaluru")
  await page.getByTestId("shipping-country-select").selectOption("in")
  await page.getByTestId("shipping-email-input").fill(`e2e+${Date.now()}@example.com`)
  // One thing at a time. ADDRESS: CONTINUE saves the address.
  await expect(page.getByTestId("delivery-option-radio")).toHaveCount(0)
  await page.getByTestId("checkout-continue-button").click()

  // DELIVERY: only the delivery methods; CONTINUE saves the choice.
  await expect(page).toHaveURL(/step=delivery/)
  await expect(page.getByTestId("shipping-first-name-input")).toHaveCount(0)
  await page.getByTestId("delivery-option-radio").first().click()
  await page.getByTestId("checkout-continue-button").click()

  // PAYMENT: only the payment options; PLACE ORDER.
  await expect(page).toHaveURL(/step=payment/)
  await expect(page.getByTestId("deliver-to-summary")).toContainText("12 MG Road")
  await page.getByRole("tab", { name: /pay on delivery/i }).click()
  await page.getByTestId("submit-order-button").click()

  await expect(page).toHaveURL(/\/order\/order_[0-9a-z]+\/confirmed/, { timeout: 60_000 })
  await expect(page.getByRole("heading", { name: /^Thank you/ })).toBeVisible()
  await expect(page.getByTestId("payment-method")).toHaveText(/cash on delivery/i)
  await expect(page.getByTestId("order-items")).toBeVisible()

  // Tracking and the tax invoice open from the confirmation page.
  const confirmation = page.url()
  await page.getByTestId("order-track-link").click()
  await expect(page).toHaveURL(/\/order\/order_[0-9a-z]+\/track$/)
  await expect(page.getByTestId("track-status")).toHaveText("Preparing your order")
  await expect(page.getByTestId("order-timeline")).toBeVisible()

  await page.goto(confirmation)
  await page.getByTestId("order-invoice-link").click()
  await expect(page).toHaveURL(/\/order\/order_[0-9a-z]+\/invoice$/)
  await expect(page.getByTestId("invoice-number")).not.toBeEmpty()
  await expect(page.getByTestId("invoice-words")).toContainText(/Rupees.*Only$/)

  // The bag is empty after the order.
  await page.goto(`/${COUNTRY}/cart`, { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("empty-cart-message")).toBeVisible()
})

test("continuing without an address shows what to fix and stays on the address page", async ({ page }) => {
  await page.goto(`/${COUNTRY}/products/heavyweight-fleece-hooded-sweatshirt`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("add-product-button").click()
  await expect(page.getByTestId("nav-cart-count").first()).not.toHaveText("0")

  await page.goto(`/${COUNTRY}/checkout`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("checkout-continue-button").click()
  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByText(/delivery address/i).first()).toBeVisible()
})

test("a failed online payment offers recovery, and pay on delivery completes the order", async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto(`/${COUNTRY}/products/heavyweight-fleece-hooded-sweatshirt`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("add-product-button").click()
  await expect(page.getByTestId("nav-cart-count").first()).not.toHaveText("0")

  await page.goto(`/${COUNTRY}/checkout`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("shipping-first-name-input").fill("Retry")
  await page.getByTestId("shipping-last-name-input").fill("Shopper")
  await page.getByTestId("shipping-address-input").fill("12 MG Road")
  await page.getByTestId("shipping-postal-code-input").fill("560001")
  await page.getByTestId("shipping-city-input").fill("Bengaluru")
  await page.getByTestId("shipping-email-input").fill(`e2e+${Date.now()}@example.com`)
  await page.getByTestId("checkout-continue-button").click()
  await expect(page).toHaveURL(/step=delivery/)
  await page.getByTestId("checkout-continue-button").click()
  await expect(page).toHaveURL(/step=payment/)

  // UPI can't complete here (no gateway window), so checkout lands on recovery.
  await page.getByRole("tab", { name: /instant upi/i }).click()
  await page.getByTestId("submit-order-button").click()
  await expect(page).toHaveURL(/\/checkout\/payment-failed\?method=upi/, { timeout: 30_000 })
  await expect(page.getByRole("heading", { name: /couldn.t complete your payment/i })).toBeVisible()

  // Switching to pay on delivery comes back with COD selected and finishes.
  await page.getByTestId("payment-switch-cod").click()
  await expect(page).toHaveURL(/step=payment&method=cod/)
  await expect(page.getByRole("tab", { name: /pay on delivery/i })).toHaveAttribute("aria-selected", "true")
  await page.getByTestId("submit-order-button").click()
  await expect(page).toHaveURL(/\/order\/order_[0-9a-z]+\/confirmed/, { timeout: 60_000 })
})

test("checkout without a bag shows not found", async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  const response = await page.goto(`${test.info().project.use.baseURL}/${COUNTRY}/checkout`, { waitUntil: "domcontentloaded" })
  expect(response?.status()).toBe(404)
  await context.close()
})
