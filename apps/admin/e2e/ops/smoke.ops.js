import { expect, test } from "@playwright/test"
import { open, signIn } from "./support.js"

test("the admin opens against the throwaway API", async ({ page, context }) => {
  await signIn(context)
  await open(page, "overview")
  await expect(page.locator("main h1").first()).toHaveText(/overview/i)
})

const SCREENS = [
  ["warehouse-operations", /warehouse operations/i],
  ["delivery-fleet", /delivery fleet/i],
  ["logistics-analytics", /logistics analytics/i],
  ["marketplace-sellers", /sellers/i],
  ["cash-on-delivery", /cash on delivery/i],
  ["notifications", /notifications/i],
]
for (const [path, title] of SCREENS) {
  test(`${path} is in the menu and opens`, async ({ page, context }) => {
    await signIn(context)
    await open(page, path)
    await expect(page.locator("main h1").first()).toHaveText(title)
  })
}
