import { expect, test, type Page } from "@playwright/test"

/*
 * Phone, tablet and desktop widths: no page scrolls sideways, the header's
 * bag stays on screen, primary actions are big enough to tap, and checkout
 * can be walked from the address to the payment step on a phone. Read-only
 * apart from a bag per run (no order is placed here; checkout.spec.ts does).
 */

const COUNTRY = "in"
const API = process.env.E2E_API_URL ?? "http://localhost:9100"
// Any product with stock: the other suites place real orders, so a fixed one can sell out.
let PRODUCT = "/products/boxy-heavyweight-organic-tee"
const PAGES = () => ["", "/store", "/categories/men", "/search?q=shirt", PRODUCT, "/cart", "/account", "/concierge", "/contact", "/shipping", "/returns", "/order", "/this-page-does-not-exist"]

test.beforeAll(async ({ request }) => {
  const res = await request.get(`${API}/store/products?country=${COUNTRY}&limit=50`)
  const { products } = (await res.json()) as { products: { handle: string; variants?: { inStock?: boolean; available?: number | null }[] }[] }
  const inStock = products.find((p) => (p.variants ?? []).length > 0 && (p.variants ?? []).every((v) => v.inStock))
  if (inStock) PRODUCT = `/products/${inStock.handle}`
})
const WIDTHS = [360, 375, 390, 414, 768, 1280]

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
}

/** Waits until the client has hydrated enough for a click to register. */
async function addToBag(page: Page) {
  const add = page.getByTestId("add-product-button")
  await expect(add).toBeEnabled()
  await expect(async () => {
    await add.click()
    await expect(page.getByTestId("nav-cart-count").first()).not.toHaveText("0", { timeout: 2000 })
  }).toPass({ timeout: 30_000 })
}

for (const width of WIDTHS) {
  const phone = width < 768
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: phone ? 800 : 900 }, isMobile: width < 1024, hasTouch: width < 1024 })

    test("no page scrolls sideways and the bag stays on screen", async ({ page }) => {
      // Thirteen pages; the first run against a dev server compiles each of them.
      test.setTimeout(360_000)
      for (const path of PAGES()) {
        await page.goto(`/${COUNTRY}${path}`, { waitUntil: "load" })
        expect(await overflow(page), `${path || "/"} overflows`).toBeLessThanOrEqual(0)
        const bag = page.getByTestId("nav-cart-link").first()
        if (await bag.count()) {
          const box = await bag.boundingBox()
          expect(box, `${path || "/"}: bag link visible`).not.toBeNull()
          expect(box!.x + box!.width, `${path || "/"}: bag link inside the viewport`).toBeLessThanOrEqual(width)
        }
      }
    })

    test("the product page's add-to-bag is on screen and big enough to tap", async ({ page }) => {
      await page.goto(`/${COUNTRY}${PRODUCT}`, { waitUntil: "load" })
      const add = page.getByTestId("add-product-button")
      await add.scrollIntoViewIfNeeded()
      const box = (await add.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
    })
  })
}

for (const width of [360, 414, 768]) {
  test(`checkout goes from address to payment at ${width}px`, async ({ browser }) => {
    test.setTimeout(180_000)
    const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true })
    const page = await context.newPage()
    await page.goto(`/${COUNTRY}${PRODUCT}`, { waitUntil: "load" })
    await addToBag(page)

    const check = async (step: string) => {
      expect(await overflow(page), `${step} overflows`).toBeLessThanOrEqual(0)
      const next = page.getByTestId(step === "payment" ? "submit-order-button" : "checkout-continue-button")
      await next.scrollIntoViewIfNeeded()
      const box = (await next.boundingBox())!
      expect(box.height, `${step}: button height`).toBeGreaterThanOrEqual(44)
      expect(box.x + box.width, `${step}: button inside the viewport`).toBeLessThanOrEqual(width)
    }

    await page.goto(`/${COUNTRY}/checkout?step=address`, { waitUntil: "load" })
    await page.getByTestId("shipping-first-name-input").fill("Test")
    await page.getByTestId("shipping-last-name-input").fill("Shopper")
    await page.getByTestId("shipping-address-input").fill("12 MG Road")
    await page.getByTestId("shipping-postal-code-input").fill("560001")
    await page.getByTestId("shipping-city-input").fill("Bengaluru")
    await expect(page.getByTestId("shipping-phone-input")).toHaveAttribute("type", "tel")
    await expect(page.getByTestId("shipping-postal-code-input")).toHaveAttribute("inputmode", "numeric")
    const country = page.getByTestId("shipping-country-select")
    if (!/india/i.test((await country.textContent()) ?? "")) {
      await country.click()
      await page.getByRole("option", { name: /india/i }).click()
    }
    await page.getByTestId("shipping-email-input").fill(`e2e-responsive+${Date.now()}@example.com`)
    await check("address")
    await page.getByTestId("checkout-continue-button").click()

    await expect(page).toHaveURL(/step=delivery/)
    await page.getByTestId("delivery-option-radio").first().click()
    await check("delivery")
    await page.getByTestId("checkout-continue-button").click()

    await expect(page).toHaveURL(/step=review/)
    await check("review")
    await page.getByTestId("checkout-continue-button").click()

    await expect(page).toHaveURL(/step=payment/)
    await check("payment")
    await context.close()
  })
}
