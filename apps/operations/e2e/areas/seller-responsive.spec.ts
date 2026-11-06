import { expect, test } from "@playwright/test"
import { layoutProblems, navReachable, WIDTHS } from "./responsive-support"

/*
 * Every Seller Hub screen, plus sign-up and the portal's own pages, at phone,
 * tablet and laptop widths. Runs before the workflow spec and changes nothing.
 */

test.describe.configure({ mode: "serial" })

const SCREENS = ["/seller", "/seller/listings", "/seller/listings/new", "/seller/stock", "/seller/orders", "/seller/sales", "/seller/returns", "/seller/payments", "/seller/reports"]

for (const vp of WIDTHS) {
  test(`seller screens at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp)
    for (const path of ["/login", "/forgot-password", "/reset-password?token=abc", "/seller/register"]) {
      await page.goto(path)
      await expect(page.getByRole("heading").first()).toBeVisible()
      expect(await layoutProblems(page), `${path} at ${vp.width}px`).toEqual([])
    }
    await page.goto("/login")
    await page.getByLabel("Email").fill("kavya@textiles.in")
    await page.getByLabel("Password", { exact: true }).fill("seller-password-1")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page.getByRole("heading", { name: "Kavya Textiles" })).toBeVisible()
    for (const path of SCREENS) {
      await page.goto(path)
      await expect(page.getByRole("main").getByRole("heading").first()).toBeVisible()
      await page.waitForLoadState("networkidle")
      await navReachable(page)
      expect(await layoutProblems(page), `${path} at ${vp.width}px`).toEqual([])
    }
    // An order's detail page, when there is one.
    await page.goto("/seller/orders")
    const order = page.getByRole("main").locator('a[href^="/seller/orders/"]').first()
    if (await order.count()) {
      await order.click()
      await page.waitForLoadState("networkidle")
      expect(await layoutProblems(page), `order detail at ${vp.width}px`).toEqual([])
    }
    await page.goto("/account")
    await page.waitForLoadState("networkidle")
    expect(await layoutProblems(page), `/account at ${vp.width}px`).toEqual([])
  })
}
