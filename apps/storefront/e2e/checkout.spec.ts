import { expect, test } from "@playwright/test"

const COUNTRY = "dk"

/**
 * Guest checkout with the manual (system default) payment provider, the only
 * one configured on this backend. Creates a real order in the local database.
 */
test("guest checkout reaches order confirmation", async ({ page }) => {
  test.setTimeout(180_000)

  await page.goto(`/${COUNTRY}/products/t-shirt`)
  await page.getByTestId("add-product-button").click()
  await expect(page.getByTestId("nav-cart-count").first()).not.toHaveText("(0)")

  await page.goto(`/${COUNTRY}/checkout?step=address`)
  await page.getByTestId("shipping-first-name-input").fill("Test")
  await page.getByTestId("shipping-last-name-input").fill("Shopper")
  await page.getByTestId("shipping-address-input").fill("Nørregade 1")
  await page.getByTestId("shipping-postal-code-input").fill("1165")
  await page.getByTestId("shipping-city-input").fill("Copenhagen")
  await page.getByTestId("shipping-country-select").selectOption("dk")
  await page.getByTestId("shipping-email-input").fill(`e2e+${Date.now()}@example.com`)
  await page.getByTestId("submit-address-button").click()

  await expect(page).toHaveURL(/step=delivery/)
  await page.getByTestId("delivery-option-radio").first().click()
  await page.getByTestId("submit-delivery-option-button").click()

  await expect(page).toHaveURL(/step=payment/)
  await page.getByText(/manual payment/i).first().click()
  await page.getByTestId("submit-payment-button").click()

  await expect(page).toHaveURL(/step=review/)
  await page.getByTestId("submit-order-button").click()

  await expect(page).toHaveURL(/\/order\/order_[A-Z0-9]+\/confirmed/, { timeout: 60_000 })
  await expect(page.getByText(/thank you|order/i).first()).toBeVisible()

  // The bag is empty after the order.
  await page.goto(`/${COUNTRY}/cart`)
  await expect(page.getByTestId("empty-cart-message")).toBeVisible()
})

test("checkout without a bag shows not found", async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  const response = await page.goto(`${test.info().project.use.baseURL}/${COUNTRY}/checkout`)
  expect(response?.status()).toBe(404)
  await context.close()
})
