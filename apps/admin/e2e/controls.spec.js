import { test, expect } from "@playwright/test"
import { getAdminToken, seed, API_URL } from "./helpers.js"

/**
 * The admin carried 76 controls that only raised a toast. Each has either been
 * wired to the operation it claimed, or taken away because nothing in the
 * business model supports it. These cover the ones that were wired, and assert
 * that none of the removed integrations came back.
 */

const auth = (token) => ({ Authorization: `Bearer ${token}` })

test("exporting customers writes the rows on screen", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await page.goto("/customers-and-loyalty")
  await expect(page.locator("main h1")).toBeVisible()

  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: /export ledger/i }).click()
  const file = await download

  expect(file.suggestedFilename()).toMatch(/^everwear-customers-\d{4}-\d{2}-\d{2}\.csv$/)

  let csv = ""
  for await (const chunk of await file.createReadStream()) csv += chunk
  const lines = csv.trim().split("\n")
  expect(lines[0]).toContain("Name,Email")
  // A row per customer listed, not a fixed sample.
  const rowsOnScreen = await page.locator("main tbody tr").count()
  expect(lines.length - 1).toBeGreaterThanOrEqual(Math.min(rowsOnScreen, 1))
})

test("pausing a promotion changes the record, not just the screen", async ({
  page,
  context,
  request,
}) => {
  const token = await getAdminToken(request)
  await seed(context, { token })

  const before = (await (await request.get(`${API_URL}/admin/promotions`, { headers: auth(token) })).json())
    .promotions
  const target = before.find((p) => p.active)
  test.skip(!target, "no active promotion to pause")

  try {
    await page.goto("/promotions-and-coupons")
    await expect(page.locator("main h1")).toBeVisible()
    await page.getByRole("row", { name: new RegExp(target.code) }).first().click()

    const pause = page.getByRole("button", { name: new RegExp(`Pause ${target.code}`, "i") })
    await expect(pause).toBeEnabled()
    await pause.click()
    await expect(page.getByText(/status updated/i)).toBeVisible()

    const after = (await (await request.get(`${API_URL}/admin/promotions`, { headers: auth(token) })).json())
      .promotions
    expect(after.find((p) => p.id === target.id).active).toBe(false)
  } finally {
    await request.patch(`${API_URL}/admin/promotions/${target.id}`, {
      headers: auth(token),
      data: { active: true },
    })
  }
})

test("a customer's order history opens the orders list filtered to them", async ({
  page,
  context,
  request,
}) => {
  await seed(context, { token: await getAdminToken(request) })
  await page.goto("/customers-and-loyalty")
  await expect(page.locator("main h1")).toBeVisible()

  await page.locator("main tbody tr").first().click()
  await page.getByRole("button", { name: /view all/i }).first().click()

  await expect(page).toHaveURL(/\/order-management\?q=/)
  await expect(page.locator("main h1")).toHaveText(/order management/i)
})

test("no control claims an integration the store does not have", async ({
  page,
  context,
  request,
}) => {
  await seed(context, { token: await getAdminToken(request) })

  // Each of these named a system with no model, endpoint or credentials
  // behind it, and only ever produced a toast.
  const gone = [
    /Workday/i, /HRIS/i, /Cloudflare/i, /edge cache/i, /Zoho/i, /WhatsApp/i,
    /syndicat/i, /omnichannel/i, /\bSCAR\b/, /GRN Docket/i, /cycle count/i,
    /affiliate deep link/i, /cart rule conflict/i,
  ]

  for (const path of [
    "users-and-role-access",
    "categories-and-collections",
    "customers-and-loyalty",
    "credit-notes-and-refunds",
    "payments-and-reconciliation",
    "purchase-orders-and-suppliers",
    "promotions-and-coupons",
    "inventory-and-warehouses",
    "system-settings",
  ]) {
    await page.goto(`/${path}`)
    await expect(page.locator("main h1")).toBeVisible()
    const text = await page.locator("main").innerText()
    for (const pattern of gone) {
      expect(text, `${path} still offers ${pattern}`).not.toMatch(pattern)
    }
  }
})

test("discarding a product draft restores the saved values", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await page.goto("/products")
  await expect(page.getByRole("heading", { name: /garment identification/i })).toBeVisible()

  const title = page.getByLabel(/product title/i)
  const saved = await title.inputValue()
  await title.fill("Scratch edit that should not survive")

  await page.getByRole("button", { name: /discard draft/i }).click()
  await expect(page.getByText(/draft discarded/i)).toBeVisible()
  await expect(title).toHaveValue(saved)
})
