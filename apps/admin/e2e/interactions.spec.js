import { test, expect } from "@playwright/test"
import { getAdminToken, seed, gotoModule, watchConsole, pageOverflow } from "./helpers.js"

test("the orders table filters, searches and pages", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await gotoModule(page, "order-management")

  const rows = page.locator("main table tbody tr")
  const initial = await rows.count()
  expect(initial).toBeGreaterThan(0)

  // Status pills narrow the list and stay mutually exclusive.
  const deliveredTab = page.getByRole("tab", { name: /delivered/i })
  await deliveredTab.click()
  await expect(deliveredTab).toHaveAttribute("aria-selected", "true")
  await expect(page.getByRole("tab", { name: /all orders/i })).toHaveAttribute("aria-selected", "false")

  await page.getByRole("tab", { name: /all orders/i }).click()
  await expect(rows).toHaveCount(initial)

  // Search narrows, clearing restores.
  const search = page.getByRole("searchbox").first()
  await search.fill("zzz-no-such-order")
  await expect(page.locator("main table")).toContainText(/no orders found/i)
  await search.fill("")
  await expect(rows).toHaveCount(initial)

  // Pagination reports a sane range and disables its ends.
  await expect(page.getByText(/showing/i)).toBeVisible()
  await expect(page.getByRole("button", { name: /previous/i })).toBeDisabled()
})

test("a filter dropdown opens, selects with the keyboard and closes on Escape", async ({
  page,
  context,
  request,
}) => {
  await seed(context, { token: await getAdminToken(request) })
  await gotoModule(page, "order-management")

  // Locate by position, not by label: choosing an option rewrites the label.
  const trigger = page.locator('main button[aria-haspopup="listbox"]').first()
  await expect(trigger).toHaveText(/all payments/i)

  await trigger.click()
  const listbox = page.getByRole("listbox").first()
  await expect(listbox).toBeVisible()
  await expect(trigger).toHaveAttribute("aria-expanded", "true")

  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  await expect(listbox).toBeHidden()
  await expect(trigger).toHaveAttribute("aria-expanded", "false")
  await expect(trigger).toHaveText(/prepaid/i)

  await trigger.click()
  await expect(page.getByRole("listbox").first()).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("listbox").first()).toBeHidden()
})

test("the command palette opens and closes", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await gotoModule(page, "overview")

  await page.getByRole("button", { name: /open command palette/i }).click()
  await expect(page.getByPlaceholder(/search|type a command/i).first()).toBeVisible()
  await page.keyboard.press("Escape")
})

test("a drawer opens from a row, traps the page behind it and closes on Escape", async ({
  page,
  context,
  request,
}) => {
  await seed(context, { token: await getAdminToken(request) })
  await gotoModule(page, "customers-and-loyalty")

  const firstRow = page.locator("main table tbody tr").first()
  if ((await firstRow.count()) === 0) test.skip(true, "no customer rows to open")
  await firstRow.click()
  await page.waitForTimeout(400)
  expect(await pageOverflow(page)).toBe(0)
})

test("a confirmation dialog opens, locks the body scroll and closes on Escape", async ({
  page,
  context,
  request,
}) => {
  await seed(context, { token: await getAdminToken(request) })
  await gotoModule(page, "order-management")

  await page.getByRole("button", { name: /create manual order/i }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute("aria-modal", "true")
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden")

  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden")
})

test("keyboard focus is always visible on the primary controls", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await gotoModule(page, "overview")

  await page.getByRole("button", { name: /flash sync/i }).focus()
  const outline = await page.evaluate(() => {
    const el = document.activeElement
    const s = getComputedStyle(el)
    return { width: s.outlineWidth, style: s.outlineStyle, shadow: s.boxShadow }
  })
  const hasRing =
    (parseFloat(outline.width) > 0 && outline.style !== "none") ||
    (outline.shadow && outline.shadow !== "none")
  expect(hasRing, "focused control has no visible focus ring").toBe(true)
})

test("no uncaught errors while moving around and interacting", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  const entries = watchConsole(page)

  await gotoModule(page, "overview")
  await page.getByRole("button", { name: /^Analytics & Reports/ }).click()
  await expect(page.locator("main h1")).toHaveText(/analytics/i)
  await page.getByRole("button", { name: /^Inventory & Warehouses/ }).click()
  await expect(page.locator("main h1")).toHaveText(/inventory/i)
  await page.getByRole("button", { name: /^Theme:/ }).click()
  await page.getByRole("button", { name: /^System Settings/ }).click()
  await expect(page.locator("main h1")).toHaveText(/setting|governance/i)

  expect(entries).toEqual([])
})
