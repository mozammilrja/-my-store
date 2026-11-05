import { expect, test } from "@playwright/test"
import { axe, open, signIn, toast } from "./support.js"

/*
 * Delivery fleet and cash on delivery against the real API (seed/20-fleet.ts):
 * checking and approving a rider, assigning a waiting parcel by hand, a
 * delivered parcel's attempts and earnings, zones, and counting a cash
 * hand-over that comes up short. Runs in order on one seeded database.
 */

test.describe.configure({ mode: "serial" })

const main = (page) => page.locator("main")

test("a rider is approved only once the licence is verified", async ({ page, context }) => {
  await signIn(context)
  await open(page, "delivery-fleet")
  await expect(main(page).getByText("Riders to check")).toBeVisible()
  await page.getByRole("tab", { name: /Riders/ }).click()
  const panel = page.getByLabel("Rider Ravi Kumar")
  await expect(panel).toBeVisible()
  await expect(page.getByText("Driving licence not verified")).toBeVisible()
  const approve = page.getByRole("button", { name: "Approve rider" })
  await expect(approve).toBeDisabled()
  await axe(page)

  await page.getByRole("button", { name: "Verify Driving licence" }).click()
  await expect(toast(page, "Driving licence verified")).toBeVisible()
  await expect(approve).toBeEnabled()
  await approve.click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Note for the record").fill("Licence and Aadhaar checked in person")
  await dialog.getByRole("button", { name: "Approve" }).click()
  await expect(toast(page, "Ravi Kumar approved")).toBeVisible()
  await page.getByRole("tab", { name: /^Approved/ }).click()
  await expect(page.getByRole("row", { name: /Ravi Kumar/ })).toBeVisible()
})

test("a waiting parcel is assigned to a rider in its zone by hand", async ({ page, context }) => {
  await signIn(context)
  await open(page, "delivery-fleet")
  const panel = page.getByLabel("Delivery EWF-1001")
  await expect(panel).toBeVisible()
  await panel.getByLabel("Rider to assign").click()
  await page.getByRole("option", { name: /Imran Pasha/ }).click()
  await panel.getByRole("button", { name: "Assign", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Why assign by hand").fill("Imran is already in Indiranagar")
  await dialog.getByRole("button", { name: "Assign", exact: true }).click()
  await expect(toast(page, "EWF-1001 assigned to Imran Pasha")).toBeVisible()
  await page.getByRole("tab", { name: /^Assigned/ }).click()
  const assigned = page.getByLabel("Delivery EWF-1001")
  await expect(assigned.getByText("Imran Pasha")).toBeVisible()
  await expect(page.getByText("Imran is already in Indiranagar")).toBeVisible()
  await axe(page)
})

test("a delivered parcel shows its failed attempt, the rider's pay and proof of delivery", async ({ page, context }) => {
  await signIn(context)
  await open(page, "delivery-fleet")
  await page.getByRole("tab", { name: /^Delivered/ }).click()
  await page.getByRole("row", { name: /EWF-1002/ }).click()
  const panel = page.getByLabel("Delivery EWF-1002")
  await expect(panel.getByText("Failed attempts (1)")).toBeVisible()
  await expect(panel.getByText(/Customer unavailable/)).toBeVisible()
  await expect(panel.getByText("Rider earnings")).toBeVisible()
  await expect(panel.getByText(/Received by Meera/)).toBeVisible()
  await expect(panel.getByText("No photo was taken.")).toBeVisible()
})

test("zones: PIN codes are checked before saving", async ({ page, context }) => {
  await signIn(context)
  await open(page, "delivery-fleet")
  await page.getByRole("tab", { name: "Zones" }).click()
  await expect(page.getByRole("row", { name: /BLR-EAST/ })).toBeVisible()
  await page.getByRole("button", { name: "Add a zone" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Code", { exact: true }).fill("blr-south")
  await dialog.getByLabel("Name", { exact: true }).fill("Bengaluru South")
  await dialog.getByLabel(/PIN codes/).fill("560068, 56007")
  await expect(dialog.getByText("Not six-digit PIN codes: 56007")).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Save zone" })).toBeDisabled()
  await dialog.getByLabel(/PIN codes/).fill("560068, 560076")
  await dialog.getByRole("button", { name: "Save zone" }).click()
  await expect(toast(page, "Zone BLR-SOUTH saved")).toBeVisible()
  await expect(page.getByRole("row", { name: /BLR-SOUTH/ })).toBeVisible()
  await axe(page)
})

test("a hand-over counted short is a mismatch, kept open for a recount", async ({ page, context }) => {
  await signIn(context, "finance")
  await open(page, "cash-on-delivery")
  await expect(main(page).getByLabel("Cash with riders").getByText("Sana Rao")).toBeVisible()
  await expect(main(page).getByLabel("Cash with riders").getByText("₹1,000.00")).toBeVisible()
  const panel = page.getByLabel(/^Hand-over REM-/)
  await expect(panel.getByText("₹2,490.00").first()).toBeVisible()
  await panel.getByLabel("Cash counted (₹)").fill("2480")
  await expect(panel.getByText("Short by ₹10.00: this will be recorded as a mismatch.")).toBeVisible()
  await panel.getByLabel("Note").fill("One ₹10 note missing")
  await panel.getByRole("button", { name: "Record count" }).click()
  await expect(toast(page, /flagged: counted ₹2,480.00 of ₹2,490.00/)).toBeVisible()
  await page.getByRole("tab", { name: /Mismatches/ }).click()
  const flagged = page.getByLabel(/^Hand-over REM-/)
  await expect(flagged.getByText(/Short by ₹10.00: One ₹10 note missing/)).toBeVisible()
  await expect(flagged.getByLabel("Recount (₹)")).toBeVisible()
  await axe(page)
})

test("staff can see cash but not count it, nor dispatch", async ({ page, context }) => {
  await signIn(context, "staff")
  await open(page, "cash-on-delivery")
  await page.getByRole("tab", { name: /Mismatches/ }).click()
  await expect(page.getByText("Counting is for finance and the owner.")).toBeVisible()
  await open(page, "delivery-fleet")
  await page.getByRole("tab", { name: /^All/ }).click()
  await page.getByRole("row", { name: /EWF-1001/ }).click()
  await expect(page.getByText("Your role can view deliveries; dispatch is for store admins and order managers.")).toBeVisible()
})
