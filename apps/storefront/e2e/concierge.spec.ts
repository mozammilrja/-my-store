import { expect, test } from "@playwright/test"

const PAGE = "/in/concierge"

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

test.describe("concierge page", () => {
  test("renders every section from the design", async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Concierge")
    await expect(page.getByTestId("concierge-service")).toHaveCount(3)
    for (const heading of [
      "The Three Concierge Suites",
      "Book Your Private Session",
      "Meet Your Private Stylists",
      "The 4-Step In-Home Fitting Protocol",
      "Frequently Asked Inquiries",
    ]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible()
    }
  })

  test("the header's Concierge link opens it", async ({ page }) => {
    await page.goto("/in/store")
    await page.getByRole("link", { name: "Concierge" }).first().click()
    await expect(page).toHaveURL(/\/in\/concierge$/)
  })

  test("picking a suite fills in the booking form", async ({ page }) => {
    await page.goto(PAGE)
    await page.getByRole("button", { name: "Select Modality" }).nth(1).click()
    await expect(page.getByTestId("concierge-selected")).toHaveText("Doorstep Try-At-Home Trial")
    await expect(page.locator("#cn-location")).toHaveValue("Doorstep In-Home")
  })

  test("requesting a stylist names them in the booking", async ({ page }) => {
    await page.goto(PAGE)
    await page.getByRole("button", { name: /Request Slot/ }).nth(1).click()
    await expect(page.getByText("Stylist: Vikram Sen")).toBeVisible()
  })

  test("FAQ answers open and close", async ({ page }) => {
    await page.goto(PAGE)
    const answer = page.getByText(/zero obligation to purchase/)
    await expect(answer).toBeHidden()
    await page.getByText("What if none of the items in my Try-At-Home box fit?").click()
    await expect(answer).toBeVisible()
  })

  test("a booking request is sent and gets a reference", async ({ page }) => {
    await page.goto(PAGE)
    // A fresh number per run keeps clear of the API's per-phone rate limit.
    const phone = `+91 9${String(Date.now()).slice(-9)}`
    await page.getByLabel("Full Client Name *").fill("E2E Test Client")
    await page.getByLabel("Contact Number (WhatsApp Enabled) *").fill(phone)
    await page.getByLabel("Preferred Date *").fill(inDays(5))
    await page.getByRole("button", { name: /Confirm Concierge Appointment/ }).click()
    await expect(page.getByTestId("concierge-success")).toContainText(/CNC-\d{4}-\d+/, { timeout: 15_000 })
  })
})
