import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

/*
 * The seller hub against the real API: a new seller applies (KYC checked as
 * they type, then sent for review); an approved seller who ships their own
 * orders accepts, packs, books and hands over an order; creates a listing
 * with a photo and sends it for review; records stock; and sees payments
 * and performance.
 */

test.describe.configure({ mode: "serial" })

const toast = (page: Page, text: string | RegExp) => page.locator("[aria-live] [role=status], [aria-live] [role=alert]").filter({ hasText: text })
async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([])
}
async function signIn(page: Page) {
  // The portal's one sign-in; sellers land in /seller.
  await page.goto("/login")
  await page.getByLabel("Email").fill("kavya@textiles.in")
  await page.getByLabel("Password", { exact: true }).fill("seller-password-1")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("heading", { name: "Kavya Textiles" })).toBeVisible()
}

test("a new seller applies; KYC mistakes are caught before review", async ({ page }) => {
  await page.goto("/seller/register")
  await page.getByLabel("Shop name (shown to customers)").fill("Ravi Crafts")
  await page.getByLabel("Mobile number").fill("98450 22222")
  await page.getByLabel("Email").fill("ravi@crafts.in")
  await page.getByLabel("Password").fill("a-long-password")
  await page.getByText("Everwear ships them").click()
  await page.getByRole("button", { name: "Create seller account" }).click()
  await expect(page.getByRole("heading", { name: "Set up your seller account" })).toBeVisible()
  await axe(page)
  await page.getByLabel("Legal name (as on PAN)").fill("Ravi Crafts")
  await page.getByLabel("PAN", { exact: true }).fill("ABCDE1234F")
  await page.getByLabel("Registered address").fill("2 MG Road")
  await page.getByLabel("City", { exact: true }).fill("Bengaluru")
  await page.getByLabel("State", { exact: true }).fill("Karnataka")
  await page.getByLabel("PIN", { exact: true }).fill("560001")
  await page.getByLabel("Account holder").fill("Ravi Crafts")
  await page.getByLabel(/Account number/).fill("123456789012")
  await page.getByLabel("IFSC").fill("SBIN0001234")
  await page.getByRole("button", { name: "Save details" }).click()
  await expect(toast(page, "valid PAN")).toBeVisible()
  await page.getByLabel("PAN", { exact: true }).fill("BBBPR1234C")
  await page.getByRole("button", { name: "Save details" }).click()
  await expect(toast(page, "Saved")).toBeVisible()
  await expect(page.getByLabel(/Account number \(ending 9012\)/)).toBeVisible()
  await page.getByRole("button", { name: "Submit for review" }).click()
  await expect(page.getByText("Your details are with us for review.")).toBeVisible()
  await expect(page.getByLabel("PAN", { exact: true })).toBeDisabled()
  await page.getByRole("button", { name: /Account menu for/ }).click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test("an order: accept, pack, book, address only once packed, hand over", async ({ page }) => {
  await signIn(page)
  await axe(page)
  await page.getByRole("link", { name: /To accept\s*1/ }).click()
  await page.getByRole("link", { name: /FUL-\d+-1/ }).click()
  await expect(page.getByText("Ship to")).toHaveCount(0)
  await page.getByRole("button", { name: "Accept" }).click()
  await expect(toast(page, "Accepted")).toBeVisible()
  await page.getByLabel("Weight (kg)").fill("0.4")
  await page.getByLabel("Length (cm)").fill("30")
  await page.getByLabel("Breadth (cm)").fill("22")
  await page.getByLabel("Height (cm)").fill("4")
  await page.getByRole("button", { name: "Packed" }).click()
  await expect(page.getByRole("heading", { name: "Ship to" })).toBeVisible()
  await expect(page.getByText("4 Residency Road")).toBeVisible()
  await expect(page.getByText("9886011111")).toHaveCount(0)
  await page.getByLabel("Courier").fill("Delhivery")
  await page.getByLabel("AWB").fill("DLV7788990")
  await page.getByRole("button", { name: "Record AWB" }).click()
  await expect(page.getByText(/Ready for the courier/)).toBeVisible()
  await axe(page)
  await page.getByRole("link", { name: "Orders" }).first().click()
  await page.getByRole("tab", { name: /Ready for pickup/ }).click()
  await page.getByLabel("Pickup person's name").fill("Suresh (Delhivery)")
  await page.getByRole("button", { name: "Hand over" }).click()
  await expect(toast(page, "1 parcel(s) handed to Delhivery")).toBeVisible()
  await page.getByRole("tab", { name: /Shipped/ }).click()
  await expect(page.getByText("DLV7788990")).toBeVisible()
})

test("a new listing with a photo goes to review", async ({ page }) => {
  await signIn(page)
  await page.getByRole("link", { name: "Listings" }).first().click()
  await page.getByRole("link", { name: "New listing" }).click()
  await page.getByLabel("Title").fill("Ajrakh Cotton Saree")
  await page.getByLabel("Description").fill("Hand block printed with natural dyes.")
  // The admin's select: open it, then pick the category.
  await page.getByLabel("Category").click()
  await page.getByRole("option", { name: "Sarees" }).click()
  // A real 1x1 PNG, uploaded through the API.
  await page.locator("input[type=file]").setInputFiles({ name: "saree.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5f0000000049454e44ae426082", "hex") })
  await expect(page.getByRole("img", { name: "Photo 1" })).toBeVisible()
  await page.getByLabel("Sizes (comma-separated)").fill("Free")
  await page.getByLabel("SKU for Free").fill("kav-sar-free")
  await page.getByLabel("Price for Free").fill("3499")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(toast(page, "Saved")).toBeVisible()
  await page.getByRole("button", { name: "Submit for review" }).click()
  await expect(page.getByText("In review. You can still make changes.")).toBeVisible()
  await page.getByRole("link", { name: "Listings" }).first().click()
  await expect(page.getByRole("link", { name: /Ajrakh Cotton Saree.*In review/ })).toBeVisible()
  await axe(page)
})

test("stock in, payments and performance", async ({ page }) => {
  await signIn(page)
  await page.getByRole("link", { name: "Stock" }).first().click()
  const row = page.getByRole("row", { name: /KAV-KUR-M/ })
  await expect(row.getByRole("cell").nth(1)).toHaveText("5")
  await row.getByRole("button", { name: "Update" }).click()
  await page.getByLabel("Units").fill("4")
  await page.getByRole("button", { name: "Record" }).click()
  await expect(toast(page, "Stock updated")).toBeVisible()
  await expect(row.getByRole("cell").nth(1)).toHaveText("9")
  await page.getByRole("link", { name: "Payments" }).first().click()
  await expect(page.getByText("Payable now")).toBeVisible()
  await expect(page.getByText(/None yet/)).toBeVisible()
  await axe(page)
  await page.getByRole("link", { name: "Performance" }).first().click()
  await expect(page.getByText("Accepted on time")).toBeVisible()
  await expect(page.getByRole("definition").filter({ hasText: /^100%$/ }).first()).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: "test-results/areas/seller-performance-phone.png", fullPage: true })
  await axe(page)
})
