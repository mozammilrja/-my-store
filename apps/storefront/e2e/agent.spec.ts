import { expect, test } from "@playwright/test"

const COUNTRY = "dk"

const variantId = async (page: import("@playwright/test").Page) => {
  await page.goto(`/${COUNTRY}/products/t-shirt`, { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("add-product-button")).toBeEnabled()
  return page.locator('input[name="variant_id"]').inputValue()
}

const createSession = async (request: import("@playwright/test").APIRequestContext, id: string) => {
  const response = await request.post("/ucp/v1/checkout-sessions", {
    data: {
      line_items: [{ item: { id }, quantity: 1 }],
      buyer: { email: "agent-buyer@example.com" },
      fulfillment: {
        methods: [
          {
            type: "shipping",
            destinations: [
              {
                first_name: "Agent",
                last_name: "Buyer",
                street_address: "Nørregade 1",
                address_locality: "Copenhagen",
                postal_code: "1165",
                address_country: "DK",
              },
            ],
          },
        ],
      },
    },
  })
  expect(response.status()).toBe(201)
  return response.json()
}

test("agent checkout hands off to the shopper and stops exposing their details", async ({ page, request, browser }) => {
  const id = await variantId(page)
  const session = await createSession(request, id)
  expect(session.buyer?.email).toBe("agent-buyer@example.com")
  expect(session.continue_url).toContain("/cart/resume/")

  // A fresh visitor with no bag goes straight to checkout.
  const shopper = await browser.newContext()
  const shopperPage = await shopper.newPage()
  await shopperPage.goto(session.continue_url, { waitUntil: "domcontentloaded" })
  await expect(shopperPage).toHaveURL(/\/checkout/)
  await shopper.close()

  const after = await (await request.get(`/ucp/v1/checkout-sessions/${session.id}`)).json()
  expect(after.buyer).toBeUndefined()
  expect(after.fulfillment).toBeUndefined()

  const update = await request.put(`/ucp/v1/checkout-sessions/${session.id}`, {
    data: { buyer: { email: "attacker@example.com" } },
  })
  expect(update.status()).toBeGreaterThanOrEqual(400)
})

test("a checkout link asks before replacing a filled bag", async ({ page, request }) => {
  const id = await variantId(page)
  await page.getByTestId("add-product-button").click()
  await expect(page.getByTestId("nav-cart-count").first()).not.toHaveText("0")

  const session = await createSession(request, id)
  await page.goto(session.continue_url, { waitUntil: "domcontentloaded" })
  await expect(page).toHaveURL(/\/confirm$/)
  await expect(page.getByRole("heading", { name: /already have items/i })).toBeVisible()

  await page.getByTestId("confirm-switch-cart").click()
  await expect(page).toHaveURL(/\/checkout/)
})
