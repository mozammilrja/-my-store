import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

/*
 * One seeded COD order (2 x M, 1 x L Indigo tee) goes across the floor in a
 * real browser: accept, pick with a wrong-size scan refused, inspect, pack
 * with a wrong-item scan refused, courier booking, label check, manifest,
 * dock scan and dispatch. Then the stock it moved, and a return inspection.
 */

test.describe.configure({ mode: "serial" })

const PASSWORD = "floor-password-1"

async function signIn(page: Page, email: string) {
  // The portal's one sign-in; floor staff land in /warehouse.
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible()
}

async function scan(page: Page, field: string | RegExp, code: string) {
  const input = page.getByLabel(field)
  await input.fill(code)
  await input.press("Enter")
}

const toast = (page: Page, text: string | RegExp) => page.locator("[aria-live] [role=status], [aria-live] [role=alert]").filter({ hasText: text })

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([])
}

let slip = ""

test("a picker sees incoming work but can't accept it", async ({ page }) => {
  await signIn(page, "picker@everwear.test")
  const incoming = page.getByRole("tab", { name: /Incoming/ })
  await expect(incoming).toContainText("2")
  const row = page.getByRole("link", { name: /FUL-1001-1/ })
  slip = (await row.locator(".font-mono").first().textContent())!.trim()
  await row.click()
  await expect(page.getByText("Your role (picker) can't do that step.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Accept order" })).toHaveCount(0)
  await page.getByRole("button", { name: /Account menu for/ }).click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test("the order goes from incoming to dispatched on the floor", async ({ page }) => {
  await signIn(page, "supervisor@everwear.test")
  await axe(page)

  // Open the order by scanning its pick slip.
  await scan(page, "Scan a pick slip to open its order", slip.toLowerCase())
  await expect(page.getByRole("heading", { name: slip })).toBeVisible()

  await page.getByRole("button", { name: "Accept order" }).click()
  await expect(toast(page, "accepted")).toBeVisible()
  await page.getByRole("button", { name: "Start picking" }).click()

  // The wrong size is refused and nothing is picked.
  await scan(page, "Scan each item's SKU barcode", "EW-TEE-XL")
  await expect(toast(page, "isn't on this pick list")).toBeVisible()
  await expect(page.getByRole("button", { name: "Picking complete" })).toBeDisabled()
  for (const sku of ["EW-TEE-M", "EW-TEE-M", "ew-tee-l"]) {
    await scan(page, "Scan each item's SKU barcode", sku)
    await expect(toast(page, new RegExp(sku, "i"))).toBeVisible()
  }
  await expect(page.getByRole("button", { name: "Picking complete" })).toBeEnabled()
  await page.getByRole("button", { name: "Picking complete" }).click()

  await page.getByRole("button", { name: "All units pass" }).click()
  await expect(page.getByRole("heading", { name: "Packing station" })).toBeVisible()

  // Packing: the slip, then every unit; a unit from another order is refused.
  await scan(page, "Scan the pick slip", "FUL-0000-9")
  await expect(toast(page, "another order")).toBeVisible()
  await scan(page, "Scan the pick slip", slip)
  await scan(page, "Scan each unit into the box", "EW-TEE-XL")
  await expect(toast(page, "doesn't belong in this parcel")).toBeVisible()
  for (const sku of ["EW-TEE-M", "EW-TEE-L", "EW-TEE-M"]) await scan(page, "Scan each unit into the box", sku)
  await expect(page.getByText("All 3 units scanned")).toBeVisible()
  await page.getByLabel("Weight (kg)").fill("0.8")
  await page.getByLabel("Length (cm)").fill("32")
  await page.getByLabel("Breadth (cm)").fill("24")
  await page.getByLabel("Height (cm)").fill("6")
  await page.getByRole("button", { name: "Finish packing" }).click()

  // Label: this PIN code has our own riders too; this one goes by courier.
  const pkg = page.locator("figcaption").filter({ hasText: /^PKG-/ })
  await expect(pkg).toBeVisible()
  await expect(page.getByRole("radio", { name: /Everwear Fleet/ })).toBeChecked()
  await page.getByRole("radio", { name: /Courier/ }).check()
  await expect(page.getByRole("img", { name: /Barcode PKG-/ })).toBeVisible()
  await scan(page, "Scan the parcel label to book the courier", (await pkg.textContent())!)
  await expect(page.getByRole("heading", { name: "Apply the courier label" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Open courier label (PDF)" })).toHaveAttribute("href", /labels\.example/)
  const awb = (await page.locator("p", { hasText: "AWB" }).locator(".font-mono").textContent())!.trim()
  expect(awb).toMatch(/^AWB\d+$/)
  await scan(page, "Scan the AWB on the applied label", "AWB0")
  await expect(toast(page, "isn't this parcel's label")).toBeVisible()
  await scan(page, "Scan the AWB on the applied label", awb)
  await expect(page.getByText(/Packed and labelled/)).toBeVisible()
  await axe(page)

  // Dispatch: manifest, dock scan, close.
  await page.getByRole("link", { name: "Dispatch" }).first().click()
  await page.getByRole("button", { name: "Create manifest" }).click()
  await expect(toast(page, "Courier pickup requested")).toBeVisible()
  await expect(page.getByRole("link", { name: "Courier manifest" })).toBeVisible()
  await scan(page, /Scan each parcel as the courier takes it/, awb)
  await expect(page.getByText("Handed over", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Close manifest" }).click()
  await page.getByLabel("Courier executive's name").fill("Suresh (Delhivery)")
  await page.getByRole("button", { name: "Dispatch 1 parcel(s)" }).click()
  await expect(page.getByRole("heading", { name: "Recently closed" })).toBeVisible()
  await expect(page.getByText("Suresh (Delhivery)")).toBeVisible()
  await axe(page)
})

test("stock shows what the order moved, with its ledger", async ({ page }) => {
  await signIn(page, "supervisor@everwear.test")
  await page.getByRole("link", { name: "Stock" }).first().click()
  const m = page.getByRole("row", { name: /EW-TEE-M/ })
  // 6 received, 2 dispatched: 4 available, nothing reserved or packed.
  await expect(m.getByRole("cell").nth(2)).toHaveText("4")
  await expect(m.getByRole("cell").nth(3)).toHaveText("0")
  await m.getByRole("button").click()
  await expect(page.getByText("Received 6, dispatched 2 in total.")).toBeVisible()
  await expect(page.getByRole("dialog").getByText(/^dispatch$/i)).toBeVisible()
  await axe(page)
})

test("a returned parcel is graded; only sellable units go back on the shelf", async ({ page }) => {
  await signIn(page, "supervisor@everwear.test")
  await page.getByRole("link", { name: "Returns" }).first().click()
  await scan(page, /Scan the return parcel's AWB/, "900")
  await expect(page.getByText("Too large")).toBeVisible()
  await page.getByLabel("Sellable").fill("1")
  await page.getByLabel("Condition notes").fill("One unit has a torn hem")
  await page.getByRole("button", { name: "Record inspection" }).click()
  await expect(toast(page, "inspected")).toBeVisible()

  await page.getByRole("link", { name: "Stock" }).first().click()
  const xl = page.getByRole("row", { name: /EW-TEE-XL/ })
  await expect(xl.getByRole("cell").nth(2)).toHaveText("3") // 2 received + 1 restocked
  await expect(xl.getByRole("cell").nth(6)).toHaveText("1") // 1 damaged
})

test("a parcel for our own riders: booked on Everwear Fleet, our label, its own manifest", async ({ page }) => {
  await signIn(page, "supervisor@everwear.test")
  await scan(page, "Scan a pick slip to open its order", "FUL-1002-1")
  await page.getByRole("button", { name: "Accept order" }).click()
  await page.getByRole("button", { name: "Start picking" }).click()
  await scan(page, "Scan each item's SKU barcode", "EW-TEE-L")
  await page.getByRole("button", { name: "Picking complete" }).click()
  await page.getByRole("button", { name: "All units pass" }).click()
  await scan(page, "Scan the pick slip", "FUL-1002-1")
  await scan(page, "Scan each unit into the box", "EW-TEE-L")
  for (const [label, v] of [["Weight (kg)", "0.4"], ["Length (cm)", "30"], ["Breadth (cm)", "24"], ["Height (cm)", "4"]] as const) await page.getByLabel(label).fill(v)
  await page.getByRole("button", { name: "Finish packing" }).click()
  await expect(page.getByRole("radio", { name: /Everwear Fleet.*Bengaluru East/ })).toBeChecked()
  const pkg = (await page.locator("figcaption").filter({ hasText: /^PKG-/ }).textContent())!
  await scan(page, "Scan the parcel label to book Everwear Fleet", pkg)
  await expect(page.getByRole("heading", { name: "Apply the Everwear Fleet label" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Print Everwear Fleet label" })).toBeVisible()
  const awb = (await page.locator("p", { hasText: "AWB" }).locator(".font-mono").textContent())!.trim()
  expect(awb).toMatch(/^EWF\d{9}$/)
  // Our label carries the address, so it isn't on screen until printed.
  await expect(page.getByText("100 Feet Road")).toHaveCount(0)
  await scan(page, "Scan the AWB on the applied label", awb)
  await expect(page.getByText(/Packed and labelled \(Everwear Fleet/)).toBeVisible()
  await page.getByRole("link", { name: "Dispatch" }).first().click()
  await expect(page.getByText("Everwear Fleet", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Create manifest" }).click()
  await expect(toast(page, "Manifest MAN-")).toBeVisible()
  await scan(page, /Scan each parcel as the courier takes it/, awb)
  await page.getByRole("button", { name: "Close manifest" }).click()
  await page.getByLabel("Courier executive's name").fill("Ravi (Everwear Fleet)")
  await page.getByRole("button", { name: "Dispatch 1 parcel(s)" }).click()
  await expect(page.getByText("Ravi (Everwear Fleet)")).toBeVisible()
  await axe(page)
})

test("works one-handed on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, "supervisor@everwear.test")
  await expect(page.getByRole("navigation", { name: "Main" }).last()).toBeVisible()
  await page.screenshot({ path: "test-results/areas/mobile-orders.png", fullPage: true })
  await page.getByRole("link", { name: "Stock" }).last().click()
  await page.screenshot({ path: "test-results/areas/mobile-stock.png", fullPage: true })
  await axe(page)
  // Dark theme: same contrast rules.
  await page.getByRole("button", { name: "Switch light or dark theme" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.getByRole("link", { name: "Orders" }).last().click()
  await page.screenshot({ path: "test-results/areas/mobile-orders-dark.png", fullPage: true })
  await axe(page)
})
