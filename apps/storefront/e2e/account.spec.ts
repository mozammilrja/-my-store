import { expect, test } from "@playwright/test"

const COUNTRY = "in"
const password = "Correct-horse-42"

test("register, see the account, log out, log back in", async ({ page }) => {
  test.setTimeout(150_000)
  const email = `e2e-account+${Date.now()}@example.com`

  await page.goto(`/${COUNTRY}/account`, { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("login-page")).toBeVisible()
  await page.getByRole("button", { name: /join us|register|create/i }).first().click()

  await expect(page.getByTestId("register-page")).toBeVisible()
  await page.getByTestId("first-name-input").fill("Ada")
  await page.getByTestId("last-name-input").fill("Tester")
  await page.getByTestId("email-input").fill(email)
  await page.getByTestId("password-input").fill(password)
  await page.getByTestId("register-button").click()

  // Either signed straight in, or asked to verify the email (both are valid backend setups).
  const nav = page.getByTestId("account-nav")
  const verify = page.getByTestId("register-verification-message")
  await expect(nav.or(verify)).toBeVisible({ timeout: 30_000 })
  test.skip(await verify.isVisible(), "Backend requires email verification")

  await expect(page.getByText(email).first()).toBeVisible()
  await page.getByTestId("logout-button").filter({ visible: true }).first().click()
  await expect(page.getByTestId("login-page")).toBeVisible()

  await page.getByTestId("email-input").fill(email)
  await page.getByTestId("password-input").fill(password)
  await page.getByTestId("sign-in-button").click()
  await expect(nav).toBeVisible({ timeout: 30_000 })
})

test("wrong password shows an error", async ({ page }) => {
  await page.goto(`/${COUNTRY}/account`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("email-input").fill("nobody-here@example.com")
  await page.getByTestId("password-input").fill("not-the-password")
  await page.getByTestId("sign-in-button").click()
  await expect(page.getByTestId("login-error-message")).toBeVisible()
})

test("protected account pages need a session", async ({ page }) => {
  for (const path of ["profile", "addresses", "orders"]) {
    await page.goto(`/${COUNTRY}/account/${path}`, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("login-page")).toBeVisible()
    await expect(page.getByTestId("account-nav")).toHaveCount(0)
  }
})

test("the bag follows the account: empty after sign-out, back after sign-in", async ({ page }) => {
  test.setTimeout(150_000)
  const email = `e2e-bag+${Date.now()}@example.com`
  const badge = page.getByTestId("nav-cart-count").first()

  // Register, then put something in the bag.
  await page.goto(`/${COUNTRY}/account`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("register-switch").click()
  await page.getByTestId("first-name-input").fill("Bag")
  await page.getByTestId("last-name-input").fill("Tester")
  await page.getByTestId("email-input").fill(email)
  await page.getByTestId("password-input").fill(password)
  await page.getByTestId("register-button").click()
  const nav = page.getByTestId("account-nav")
  await expect(nav).toBeVisible({ timeout: 30_000 })

  await page.goto(`/${COUNTRY}/store`)
  const href = await page.getByTestId("product-wrapper").first().locator("a[href*='/products/']").first().getAttribute("href")
  await page.goto(href!)
  const add = page.getByTestId("add-product-button")
  await expect(add).toBeEnabled({ timeout: 20_000 })
  await add.click()
  await expect(badge).toHaveText("1", { timeout: 20_000 })

  // Signing out empties this browser's bag, header count included.
  await page.goto(`/${COUNTRY}/account`)
  await page.getByTestId("logout-button").filter({ visible: true }).first().click()
  await expect(page.getByTestId("login-page")).toBeVisible()
  await expect(badge).toHaveCount(0)
  await page.goto(`/${COUNTRY}/cart`)
  await expect(page.getByTestId("nav-cart-count")).toHaveCount(0)

  // Signing back in restores it.
  await page.goto(`/${COUNTRY}/account`)
  await page.getByTestId("email-input").fill(email)
  await page.getByTestId("password-input").fill(password)
  await page.getByTestId("sign-in-button").click()
  await expect(nav).toBeVisible({ timeout: 30_000 })
  await expect(badge).toHaveText("1", { timeout: 20_000 })
})
