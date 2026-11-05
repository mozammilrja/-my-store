import { expect, test } from "@playwright/test"
import { axe, open, signIn, toast } from "./support.js"

/*
 * Warehouse operations against the real API (seed/10-warehouses.ts):
 * warehouses with their courier pickup names and a read-only seller
 * location, stock moves and the ledger, an opening balance, floor staff, and
 * moving an unstarted fulfilment to another warehouse. A finance user sees
 * what their role allows and why the rest isn't offered.
 */

test.describe.configure({ mode: "serial" })

/** Picks an option in the admin's popover select (a button named by its aria-label). */
async function choose(scope, page, label, option) {
  await scope.getByRole("button", { name: label, exact: true }).click()
  await page.getByRole("option", { name: option }).click()
}
const tab = (page, name) => page.getByRole("tablist", { name: "Warehouse operations" }).getByRole("tab", { name })

test("warehouses: add with checks, courier pickup names, seller location read-only", async ({ page, context }) => {
  await signIn(context)
  await open(page, "warehouse-operations")
  const table = page.getByRole("table", { name: "Warehouses" })
  await expect(table.getByRole("row", { name: /BLR-FC1/ })).toContainText("Default")
  await expect(table.getByRole("row", { name: /DEL-FC1/ })).toContainText("PIN 11, 12")
  await expect(table.getByRole("row", { name: /SEL-0009/ })).toContainText("Seller")
  await axe(page)

  await page.getByRole("button", { name: "Add warehouse" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Code", { exact: true }).fill("hyd-fc1")
  await dialog.getByLabel("Name", { exact: true }).fill("Hyderabad FC")
  await dialog.getByLabel("Address", { exact: true }).fill("Survey 12, Shamshabad")
  await dialog.getByLabel("City", { exact: true }).fill("Hyderabad")
  await dialog.getByLabel("State", { exact: true }).fill("Telangana")
  await dialog.getByLabel("PIN code", { exact: true }).fill("501218")
  await dialog.getByLabel("GSTIN", { exact: true }).fill("36ABC")
  await dialog.getByLabel("Delhivery warehouse name", { exact: true }).fill("EVERWEAR HYD")
  await axe(page)
  await dialog.getByRole("button", { name: "Add warehouse" }).click()
  await expect(dialog.getByRole("alert")).toContainText("GSTIN")
  await dialog.getByLabel("GSTIN", { exact: true }).fill("36AAGCB7383J1Z4")
  await dialog.getByRole("button", { name: "Add warehouse" }).click()
  await expect(toast(page, "HYD-FC1 added")).toBeVisible()
  await expect(table.getByRole("row", { name: /HYD-FC1/ })).toContainText("Delhivery: EVERWEAR HYD")

  await table.getByRole("row", { name: /DEL-FC1/ }).click()
  await page.getByRole("dialog").getByLabel("Shiprocket pickup nickname", { exact: true }).fill("Delhi Okhla")
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click()
  await expect(toast(page, "DEL-FC1 saved")).toBeVisible()
  await expect(table.getByRole("row", { name: /DEL-FC1/ })).toContainText("Shiprocket: Delhi Okhla")
  await expect(table.getByRole("row", { name: /DEL-FC1/ })).toContainText("PIN 11, 12")

  await table.getByRole("row", { name: /SEL-0009/ }).click()
  await expect(page.getByRole("dialog").getByText("A marketplace seller's own dispatch location")).toBeVisible()
  await expect(page.getByRole("dialog").getByLabel("Name", { exact: true })).toBeDisabled()
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click()
})

test("stock: a count correction through the ledger, and an opening balance once", async ({ page, context }) => {
  await signIn(context)
  await open(page, "warehouse-operations")
  await tab(page, "Stock").click()
  const levels = page.getByRole("table", { name: "Stock levels" })
  const row = levels.getByRole("row", { name: /EW-KUR-L/ })
  await expect(row.getByRole("cell").nth(1)).toHaveText("3")
  await axe(page)

  await row.getByRole("button", { name: "Move stock for EW-KUR-L at BLR-FC1" }).click()
  const dialog = page.getByRole("dialog")
  await choose(dialog, page, "Movement", "Count correction")
  await dialog.getByLabel("Change in units (+ or −)", { exact: true }).fill("-1")
  await expect(dialog.getByRole("button", { name: "Record" })).toBeDisabled()
  await dialog.getByLabel("Note (required)", { exact: true }).fill("Cycle count, aisle B")
  await dialog.getByRole("button", { name: "Record" }).click()
  await expect(toast(page, "Stock updated")).toBeVisible()
  await expect(row.getByRole("cell").nth(1)).toHaveText("2")

  await row.click()
  const ledger = page.getByRole("table", { name: "Stock ledger" })
  await expect(page.getByText("EW-KUR-L at BLR-FC1 · latest 100")).toBeVisible()
  await expect(ledger.getByRole("row", { name: /Correction: 1 available → outside/ })).toContainText("Cycle count, aisle B")
  await expect(ledger.getByRole("row", { name: /Goods in: 3 outside → available/ })).toContainText("GRN-0001")

  for (const attempt of ["first", "again"]) {
    await page.getByRole("button", { name: "Opening balance" }).click()
    const ob = page.getByRole("dialog")
    await choose(ob, page, "Warehouse for the opening balance", /BLR-FC1/)
    await ob.getByLabel("Find an item", { exact: true }).fill("Silk")
    await ob.getByRole("button", { name: "Search" }).click()
    await ob.getByLabel(/Silk Scarf · Free/).check()
    await ob.getByRole("button", { name: "Record opening balance" }).click()
    if (attempt === "first") {
      await expect(toast(page, "Opening balance recorded")).toBeVisible()
      await expect(levels.getByRole("row", { name: /EW-SCARF/ }).getByRole("cell").nth(1)).toHaveText("7")
    } else {
      await expect(ob.getByRole("alert")).toContainText("already has warehouse stock")
      await ob.getByRole("button", { name: "Cancel" }).click()
    }
  }
})

test("staff: add a packer, suspend a picker", async ({ page, context }) => {
  await signIn(context)
  await open(page, "warehouse-operations")
  await tab(page, "Staff").click()
  const table = page.getByRole("table", { name: "Warehouse staff" })
  await expect(table.getByRole("row", { name: /Priya Nair/ })).toContainText("Picker")
  await axe(page)

  await page.getByRole("button", { name: "Add staff" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Name", { exact: true }).fill("Ravi Kumar")
  await dialog.getByLabel("Email", { exact: true }).fill("ravi@everwear.test")
  await choose(dialog, page, "Role", "Packer")
  await dialog.getByLabel("Password", { exact: true }).fill("short")
  await expect(dialog.getByRole("button", { name: "Add staff" })).toBeDisabled()
  await dialog.getByLabel("Password", { exact: true }).fill("packer-password-1")
  await dialog.getByLabel(/DEL-FC1/).check()
  await dialog.getByRole("button", { name: "Add staff" }).click()
  await expect(toast(page, "Ravi Kumar can now sign in to the warehouse app")).toBeVisible()
  await expect(table.getByRole("row", { name: /Ravi Kumar/ })).toContainText("BLR-FC1, DEL-FC1")

  await table.getByRole("row", { name: /Priya Nair/ }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Suspend" }).click()
  await expect(toast(page, "Priya Nair is suspended")).toBeVisible()
  await expect(table.getByRole("row", { name: /Priya Nair/ })).toContainText("Suspended")
})

test("fulfilments: the board by status and warehouse, history, moving one before picking", async ({ page, context }) => {
  await signIn(context)
  await open(page, "warehouse-operations")
  await tab(page, "Fulfilments").click()
  await expect(page.getByRole("tab", { name: /To start\s*2/ })).toBeVisible()
  const board = page.getByRole("table", { name: "Fulfilments" })
  await expect(board.getByRole("row", { name: /FUL-/ })).toHaveCount(2)
  await axe(page)

  await page.getByRole("tab", { name: /To start/ }).click()
  await board.getByRole("row", { name: /FUL-/ }).first().click()
  const panel = page.getByRole("region").or(page.locator("[aria-label^='Fulfilment FUL-']")).first()
  await expect(panel.getByText("Assigned", { exact: true }).first()).toBeVisible()
  await expect(panel.getByRole("heading", { name: "History" })).toBeVisible()
  await panel.getByRole("button", { name: "Move to another warehouse" }).click()
  const dialog = page.getByRole("dialog")
  await choose(dialog, page, "Move to warehouse", /DEL-FC1/)
  await dialog.getByLabel("Reason", { exact: true }).fill("Bengaluru short-staffed today")
  await dialog.getByRole("button", { name: "Move order" }).click()
  await expect(toast(page, "Moved to DEL-FC1")).toBeVisible()
  await expect(page.locator("[aria-label^='Fulfilment FUL-']")).toContainText("DEL-FC1")
  await expect(page.locator("[aria-label^='Fulfilment FUL-']")).toContainText("Bengaluru short-staffed today")

  await choose(page, page, "Warehouse", "DEL-FC1")
  await page.getByRole("tab", { name: /^All/ }).click()
  await expect(board.getByRole("row", { name: /FUL-/ })).toHaveCount(1)
  await expect(board.getByRole("row", { name: /FUL-/ })).toContainText("DEL-FC1")
  await choose(page, page, "Warehouse", "BLR-FC1")
  await page.getByRole("tab", { name: /Rejected or cancelled/ }).click()
  await expect(board.getByRole("row", { name: /FUL-/ })).toHaveCount(1)
})

test("a finance user can look but not move stock or manage staff, and is told why", async ({ page, context }) => {
  await signIn(context, "finance")
  await open(page, "warehouse-operations")
  await tab(page, "Stock").click()
  await expect(page.getByText("Moving stock needs an inventory manager, store admin or owner.")).toBeVisible()
  await expect(page.getByRole("button", { name: /Move stock for/ })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Opening balance" })).toHaveCount(0)
  await tab(page, "Staff").click()
  await expect(page.getByText("Warehouse staff accounts are managed by a store admin, inventory manager or owner.")).toBeVisible()
  await axe(page)
})
