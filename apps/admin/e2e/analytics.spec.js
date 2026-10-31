import { test, expect } from "@playwright/test"
import { getAdminToken, seed, API_URL } from "./helpers.js"

/**
 * Analytics was a thousand lines of channel economics and margin tables typed
 * into the file. These check the replacement against the database: the figures
 * on screen are recomputed here from /admin/orders and must agree.
 */

const auth = (token) => ({ Authorization: `Bearer ${token}` })

/** Recounts the headline figures straight from the order records. */
async function recount(request, token, days) {
  const res = await request.get(`${API_URL}/admin/orders?limit=100`, { headers: auth(token) })
  const { orders } = await res.json()
  const dash = await (await request.get(`${API_URL}/admin/dashboard`, { headers: auth(token) })).json()

  const to = Date.now()
  const from = to - (days - 1) * 24 * 60 * 60 * 1000
  const inRange = orders.filter((o) => {
    const t = new Date(o.createdAt).getTime()
    return o.currency === dash.currency && t >= from - 24 * 60 * 60 * 1000 && t <= to
  })
  const live = inRange.filter((o) => o.status !== "canceled")
  return {
    currency: dash.currency,
    orders: live.length,
    units: live.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0),
    grossSales: live.reduce((n, o) => n + o.totals.itemSubtotal, 0),
  }
}

test("the API's analytics agree with the order records", async ({ request }) => {
  const token = await getAdminToken(request)
  const res = await request.get(`${API_URL}/admin/analytics`, { headers: auth(token) })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()

  const expected = await recount(request, token, 30)
  expect(body.currency).toBe(expected.currency)
  expect(body.totals.orders).toBe(expected.orders)
  expect(body.totals.units).toBe(expected.units)
  expect(body.totals.grossSales).toBe(expected.grossSales)

  // Net sales is gross less discounts and refunds, and is stated as such.
  expect(body.totals.netSales).toBe(
    body.totals.grossSales - body.totals.discounts - body.totals.refunds
  )
  // Cancelled orders are counted apart from revenue, never inside it.
  expect(body.totals.cancelledOrders).toBeGreaterThanOrEqual(0)
})

test("a start date after its end is refused", async ({ request }) => {
  const token = await getAdminToken(request)
  const res = await request.get(
    `${API_URL}/admin/analytics?from=2026-10-30T00:00:00.000Z&to=2026-10-01T00:00:00.000Z`,
    { headers: auth(token) }
  )
  expect(res.status()).toBe(400)
})

test("the page shows real figures and names how they are calculated", async ({
  page,
  context,
  request,
}) => {
  const token = await getAdminToken(request)
  await seed(context, { token })
  const body = await (await request.get(`${API_URL}/admin/analytics`, { headers: auth(token) })).json()

  await page.goto("/analytics-and-reports")
  await expect(page.locator("main h1")).toHaveText(/analytics/i)

  // The orders KPI carries the number the API computed.
  await expect(page.locator("main")).toContainText(String(body.totals.orders))
  // Every metric states its definition rather than leaving the operator guessing.
  await expect(page.locator("main")).toContainText(/Gross sales less discounts and refunds/i)
  await expect(page.locator("main")).toContainText(/Before tax and shipping/i)
  await expect(page.locator("main")).toContainText(/Order total divided by orders/i)

  // Every chart names what it plots rather than leaving a bare shape.
  const charts = page.locator('main [role="img"][aria-label]')
  expect(await charts.count()).toBeGreaterThan(0)
  await expect(charts.first()).toHaveAttribute("aria-label", /.+/)

  // The trend is reachable without a pointer: the days are under the chart.
  await page.getByText("View the days as a table").click()
  await expect(page.locator("main table caption, main thead")).not.toHaveCount(0)

  // Ranked bars carry their figure on the row, not only on hover.
  const ranked = page.locator('main [title*="%"]')
  expect(await ranked.count()).toBeGreaterThan(0)
  await expect(ranked.first()).toHaveAttribute("title", /\d/)
})

test("the date range filters the figures and survives a refresh", async ({
  page,
  context,
  request,
}) => {
  await seed(context, { token: await getAdminToken(request) })
  await page.goto("/analytics-and-reports")
  await expect(page.locator("main h1")).toBeVisible()

  const ordersShown = async () =>
    Number(
      (await page.locator("main").innerText()).match(/\bOrders\n([\d,]+)/)?.[1]?.replace(/,/g, "") ?? -1
    )

  /*
   * The screen keeps the previous result on screen while the next one loads,
   * so reading the figure straight after the click can read the old range.
   * Wait for the request that the click triggers to come back.
   */
  const pickRange = async (label) => {
    const settled = page.waitForResponse(
      (r) => r.url().includes("/admin/analytics") && r.status() === 200
    )
    await page.getByRole("button", { name: label }).click()
    await settled
    await expect(page.locator("main h1")).toBeVisible()
  }

  await pickRange("Last 90 days")
  await expect(page).toHaveURL(/range=90d/)
  const wide = await ordersShown()
  expect(wide, "the orders figure should be readable on the board").toBeGreaterThanOrEqual(0)

  await pickRange("Last 7 days")
  await expect(page).toHaveURL(/range=7d/)
  const narrow = await ordersShown()

  // A shorter window cannot contain more orders than a longer one.
  expect(narrow).toBeLessThanOrEqual(wide)

  await page.reload()
  await expect(page).toHaveURL(/range=7d/)
  await expect(page.locator("main h1")).toBeVisible()
  await expect
    .poll(ordersShown, { message: "the 7 day figure should come back after a refresh" })
    .toBe(narrow)
})

test("comparison is only offered when asked for, and says when it cannot compare", async ({
  page,
  context,
  request,
}) => {
  await seed(context, { token: await getAdminToken(request) })
  await page.goto("/analytics-and-reports")
  await expect(page.locator("main h1")).toBeVisible()

  // No fabricated trend until a comparison period is requested.
  await expect(page.locator("main")).not.toContainText(/vs previous/i)

  const compared = page.waitForResponse(
    (r) => r.url().includes("compare=previous") && r.status() === 200
  )
  await page.getByRole("button", { name: "Compare" }).click()
  await compared
  await expect(page).toHaveURL(/compare=previous/)
  await expect(page.locator("main")).toContainText(/vs previous|No comparable period/i)
})

test("every data region has an empty state rather than a blank panel", async ({
  page,
  context,
  request,
}) => {
  await seed(context, { token: await getAdminToken(request) })
  // An empty result set, so each region must say so in its own words.
  await page.route("**/admin/analytics*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        range: { from: "2026-01-01T00:00:00.000Z", to: "2026-01-02T00:00:00.000Z", timezone: "Asia/Kolkata" },
        region: { id: "r", name: "India", currency: "inr" },
        currency: "inr",
        totals: {
          grossSales: 0, discounts: 0, tax: 0, shipping: 0, refunds: 0, refundedOrders: 0,
          netSales: 0, total: 0, orders: 0, cancelledOrders: 0, units: 0, aov: null,
          activeCustomers: 0, newCustomers: 0, returningCustomers: 0, returnRate: null,
        },
        previous: null, daily: [], orderStatus: [], paymentStatus: [], paymentMethods: [],
        topProducts: [], categories: [], returnReasons: [], shipments: [], promotions: [],
        invoices: [], lowStockVariants: 0, purchaseOrders: [],
      }),
    })
  )

  await page.goto("/analytics-and-reports")
  await expect(page.locator("main h1")).toBeVisible()

  await expect(page.locator("main")).toContainText(/No orders in this range/i)
  await expect(page.locator("main")).toContainText(/Nothing sold in this range/i)
  await expect(page.locator("main")).toContainText(/No invoices in this range/i)
  await expect(page.locator("main")).toContainText(/No purchase orders in this range/i)
  // An unavailable average is a dash, never a zero dressed up as a result.
  await expect(page.locator("main")).toContainText("—")
})

test("analytics fits every viewport without sideways scroll", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await page.goto("/analytics-and-reports")
  await expect(page.locator("main h1")).toBeVisible()

  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.waitForTimeout(250)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(overflow, `${width}px`).toBe(0)
  }
})
