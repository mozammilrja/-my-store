import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { axe, open, signIn } from "./support.js"

/*
 * Logistics analytics against the seeded records (seed/50-logistics.ts), the
 * order panel's courier choice, the configured couriers in Payments, and the
 * real webhook endpoints in Settings.
 *
 * The API here runs with no courier integration (SHIPPING_PROVIDER=none), so
 * the panel's manual path is tested against the API as it is. The
 * multi-carrier path is then driven with the integrations and quotes
 * responses in the API's own shape, answered by the test, to check what the
 * panel shows and exactly what it sends to book.
 */

test.describe.configure({ mode: "serial" })

const region = (page, title) => page.locator("section").filter({ has: page.getByRole("heading", { name: title, exact: true }) }).first()

test("figures match the records; a missing figure is a dash with its reason", async ({ page, context }) => {
  await signIn(context)
  await open(page, "logistics-analytics")
  await expect(page.locator("main h1").first()).toHaveText(/logistics analytics/i)

  // 6 parcels: 4 delivered, 1 returned to origin, 1 moving.
  await expect(page.getByText("Parcels booked6")).toBeVisible()
  await expect(page.getByText("4 delivered, 1 returned to origin")).toBeVisible()
  await expect(page.getByText("80%").first()).toBeVisible()

  const carriers = page.getByRole("table", { name: "Carriers" })
  const delhivery = carriers.getByRole("row").filter({ hasText: "Delhivery Surface" })
  await expect(delhivery).toContainText("Delhivery direct")
  await expect(delhivery).toContainText("75%")
  await expect(delhivery).toContainText("2 of 3 promised")
  const fleet = carriers.getByRole("row").filter({ hasText: "Everwear Fleet" })
  // Our fleet gives no promised date: a dash with its reason, not 0%.
  await expect(fleet.getByText("(no promised delivery dates)")).toBeAttached()

  const warehouses = page.getByRole("table", { name: "Warehouses" })
  await expect(warehouses.getByRole("row").filter({ hasText: "SEL-LG01" })).toContainText("Seller location")
  await expect(warehouses.getByRole("row").filter({ hasText: "BLR-FC1" })).toContainText("20 h")

  await expect(page.getByText("₹1,000.00").first()).toBeVisible() // cash still with a rider
  await expect(region(page, "Why deliveries failed")).toContainText("Consignee refused")
  await expect(region(page, "Return reasons")).toContainText("Too small")
  await expect(page.getByText(/Freight cost per parcel/)).toBeVisible()
  await expect(page.getByText("Delivered ÷ (delivered + returned to origin)", { exact: false }).first()).toBeVisible()

  // The daily chart switches measure, one series at a time.
  await page.getByRole("group", { name: "Daily measure" }).getByRole("button", { name: "Delivered" }).click()
  await expect(page.getByRole("group", { name: "Daily measure" }).getByRole("button", { name: "Delivered" })).toHaveAttribute("aria-pressed", "true")
  await axe(page)
})

test("ranges: 7 days holds only the recent parcel; a custom range applies", async ({ page, context }) => {
  await signIn(context)
  await open(page, "logistics-analytics")
  await page.getByRole("button", { name: "Last 7 days" }).click()
  await expect(page.getByText("0 delivered, 0 returned to origin")).toBeVisible()
  // Nothing closed in the window: the rate is a dash, not 0%.
  await expect(page.getByText("(no closed parcels in this range)").first()).toBeAttached()

  await page.getByRole("button", { name: "Custom range" }).click()
  const iso = (d) => d.toISOString().slice(0, 10)
  await page.getByLabel("Range start").fill(iso(new Date(Date.now() - 12 * 86_400_000)))
  await page.getByLabel("Range end").fill(iso(new Date()))
  await page.getByRole("button", { name: "Apply" }).click()
  await expect(page.getByText("4 delivered, 1 returned to origin")).toBeVisible()
  await axe(page)
})

test("order panel: with no courier set up, the shipment is recorded by hand", async ({ page, context }) => {
  await signIn(context)
  await open(page, "order-management")
  await expect(page.getByText("No courier integration is configured, so shipments are recorded by hand.")).toBeVisible()
  await expect(page.getByRole("button", { name: /Book with/ })).toHaveCount(0)
})

test("order panel: quotes from both couriers, and booking sends the chosen one", async ({ page, context }) => {
  await signIn(context)
  const sent = []
  await page.route("**/admin/integrations", (route) =>
    route.fulfill({
      json: {
        razorpay: { configured: false, webhook: false, mode: null },
        shipping: { provider: "delhivery", carriers: [{ id: "delhivery", webhook: true }, { id: "shiprocket", webhook: false }], webhook: false, originPincode: "560068" },
      },
    })
  )
  await page.route("**/admin/orders/*/couriers", (route) =>
    route.fulfill({
      json: {
        configured: true,
        serviceable: true,
        couriers: [
          { provider: "shiprocket", courierId: 10, name: "Delhivery Surface", rate: 7950, etdDays: 4, etd: null, cod: true },
          { provider: "delhivery", courierId: 1, name: "Delhivery Surface", rate: 10500, etdDays: null, etd: null, cod: true },
          { provider: "delhivery", courierId: 2, name: "Delhivery Express", rate: 14200, etdDays: null, etd: null, cod: true },
        ],
        recommended: { provider: "delhivery", courierId: 1 },
        recommendedId: 1,
        unavailable: [],
      },
    })
  )
  await page.route("**/admin/orders/*/shipments", async (route) => {
    if (route.request().method() !== "POST") return route.fallback()
    sent.push(route.request().postDataJSON())
    await route.fulfill({ status: 409, json: { error: { code: "test_stop", message: "Stopped by the test after reading the booking" } } })
  })
  await open(page, "order-management")
  await page.getByRole("button", { name: "Compare couriers (Delhivery and Shiprocket)" }).click()
  const choice = page.getByRole("group", { name: "Courier" })
  await expect(choice.getByRole("radio")).toHaveCount(3)
  await expect(choice.getByText("Recommended")).toBeVisible()
  await expect(choice).toContainText("Delhivery direct")
  await expect(choice).toContainText("Shiprocket")
  await choice.getByText("Delhivery Express").click()
  await page.getByRole("button", { name: "Book Delhivery Express" }).click()
  await expect.poll(() => sent.length).toBe(1)
  expect(sent[0]).toEqual({ carrier: "delhivery", courierId: 2 })
  // A Shiprocket quote books the order, then assigns that courier.
  await page.unroute("**/admin/orders/*/shipments")
  const assigned = []
  await page.route("**/admin/orders/*/shipments", async (route) => {
    if (route.request().method() !== "POST") return route.fallback()
    sent.push(route.request().postDataJSON())
    await route.fulfill({ status: 201, json: { shipment: { _id: "ship_test", provider: "shiprocket", awb: "", status: "ready_to_ship" } } })
  })
  await page.route("**/admin/shipments/ship_test/assign-courier", async (route) => {
    assigned.push(route.request().postDataJSON())
    await route.fulfill({ status: 409, json: { error: { code: "test_stop", message: "Stopped by the test after reading the assignment" } } })
  })
  await choice.getByText("Shiprocket").first().click()
  await page.getByRole("button", { name: "Book Delhivery Surface" }).click()
  await expect.poll(() => assigned.length).toBe(1)
  expect(sent[1]).toEqual({ carrier: "shiprocket" })
  expect(assigned[0]).toEqual({ courierId: 10 })
  // The shipment section is what this panel change owns; the rest of the order drawer is checked elsewhere.
  const r = await new AxeBuilder({ page }).include('[aria-labelledby="order-shipment-h"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
  expect(r.violations.map((v) => v.id)).toEqual([])
})

test("payments shows the configured couriers; settings lists the real webhook endpoints", async ({ page, context }) => {
  await signIn(context)
  await open(page, "payments-and-reconciliation")
  await expect(page.getByText("Courier: none configured (shipments recorded by hand)")).toBeVisible()
  await open(page, "system-settings")
  await page.getByRole("tab", { name: /Webhooks/ }).click()
  for (const path of ["/store/webhooks/razorpay", "/store/webhooks/courier-tracking", "/store/webhooks/courier-tracking/dlv"]) {
    await expect(page.getByText(`http://localhost:${9194 + Number(process.env.OPS_SLOT ?? 0) * 10}${path}`, { exact: true })).toBeVisible()
  }
  await expect(page.getByText("Not set up")).toHaveCount(3)
  await expect(page.getByText(/hdfc|bluedart/i)).toHaveCount(0)
  await axe(page)
})

test("the shell loads with a clean console; the hub switcher lists the real warehouses and opens one", async ({ page, context }) => {
  await signIn(context)
  const problems = []
  page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && problems.push(m.text()))
  page.on("pageerror", (e) => problems.push(e.message))
  await open(page, "overview")
  await page.getByRole("button", { name: /Node hub/i }).click()
  const list = page.getByRole("listbox", { name: /fulfillment node/i })
  await expect(list.getByRole("option")).toHaveCount(1)
  await expect(list.getByRole("option", { name: /Bengaluru FC/ })).toContainText("BLR-FC1")
  await expect(list).not.toContainText("SEL-LG01") // a seller's location isn't one of ours
  await expect(list).not.toContainText(/BOM-Fulfillment|Bhiwandi/)
  await list.getByRole("option", { name: /Bengaluru FC/ }).click()
  await expect(page).toHaveURL(/\/warehouse-operations\?warehouse=wh_blr$/)
  expect(problems).toEqual([])
})
