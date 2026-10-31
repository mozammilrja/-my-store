import { test, expect } from "@playwright/test"
import { getAdminToken, seed, gotoModule, API_URL } from "./helpers.js"

const SKELETON = 'main [role="status"][aria-busy="true"]'

/** Holds a route open until `release()` is called, so the skeleton can be read. */
function stallRoute(page, pattern) {
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  page.route(pattern, async (route) => {
    await gate
    await route.continue()
  })
  return () => release()
}

test("the initial load shows a content-shaped skeleton, then the real content", async ({
  page,
  context,
  request,
}) => {
  await seed(context, { token: await getAdminToken(request) })
  const release = stallRoute(page, `${API_URL}/admin/orders*`)

  await page.goto("/#/order-management", { waitUntil: "load" })

  const skeleton = page.locator(SKELETON)
  await expect(skeleton).toBeVisible()
  await expect(skeleton).toHaveAttribute("aria-busy", "true")
  // It is a layout, not a spinner: it carries placeholder blocks and a table.
  expect(await skeleton.locator("table").count()).toBeGreaterThan(0)
  expect(await skeleton.locator(".animate-shimmer").count()).toBeGreaterThan(10)

  const skeletonBox = await skeleton.boundingBox()

  release()
  await expect(skeleton).toBeHidden()
  await expect(page.locator("main table")).toBeVisible()

  // The skeleton reserved the same column the content then takes: both are
  // the first child of the page container.
  const contentBox = await page.locator("main > div > *").first().boundingBox()
  expect(Math.abs(skeletonBox.width - contentBox.width)).toBeLessThan(2)
  expect(Math.abs(skeletonBox.x - contentBox.x)).toBeLessThan(2)
})

test("each module's skeleton matches the shape of that module", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })

  // Settings is a form module: its skeleton must show form rows, not a table.
  let release = stallRoute(page, `${API_URL}/admin/settings*`)
  await page.goto("/#/system-settings", { waitUntil: "load" })
  let skeleton = page.locator(SKELETON)
  await expect(skeleton).toBeVisible()
  expect(await skeleton.locator("table").count()).toBe(0)
  release()
  await expect(skeleton).toBeHidden()

  // The dashboard is a chart module: its skeleton must show KPI tiles.
  release = stallRoute(page, `${API_URL}/admin/dashboard*`)
  await page.goto("/#/overview", { waitUntil: "load" })
  skeleton = page.locator(SKELETON)
  await expect(skeleton).toBeVisible()
  expect(await skeleton.locator("div.min-h-\\[7\\.5rem\\]").count()).toBeGreaterThanOrEqual(4)
  release()
  await expect(skeleton).toBeHidden()
})

test("a loading pass does not shift the layout under it", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  const release = stallRoute(page, `${API_URL}/admin/orders*`)

  await page.goto("/#/order-management", { waitUntil: "load" })
  await expect(page.locator(SKELETON)).toBeVisible()

  await page.evaluate(() => {
    window.__cls = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__cls += entry.value
      }
    }).observe({ type: "layout-shift", buffered: true })
  })

  release()
  await expect(page.locator(SKELETON)).toBeHidden()
  await page.waitForTimeout(600)

  const cls = await page.evaluate(() => window.__cls)
  expect(cls, "swapping the skeleton for content shifted the layout").toBeLessThan(0.1)
})

test("a failed request shows an error state with a retry, never an endless skeleton", async ({
  page,
  context,
  request,
}) => {
  await seed(context, { token: await getAdminToken(request) })
  await page.route(`${API_URL}/admin/credit-notes*`, (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "server_error", message: "Ledger service unavailable" } }),
    })
  )

  await page.goto("/#/credit-notes-and-refunds", { waitUntil: "load" })

  const alert = page.getByRole("alert").first()
  await expect(alert).toBeVisible({ timeout: 30_000 })
  await expect(alert).toContainText(/could not be loaded/i)
  await expect(alert.getByRole("button", { name: /retry/i })).toBeVisible()
  await expect(page.locator(SKELETON)).toHaveCount(0)
})

test("an empty response shows an empty state, not a skeleton", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await page.route(`${API_URL}/admin/orders*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ orders: [], count: 0, page: 1, pages: 1 }),
    })
  )

  await gotoModule(page, "order-management")
  await expect(page.locator(SKELETON)).toHaveCount(0)
  await expect(page.locator("main table")).toBeVisible()
})

test("a background refetch keeps the current content on screen", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await gotoModule(page, "overview")

  const rowsBefore = await page.locator("main table tbody tr").count()
  expect(rowsBefore).toBeGreaterThan(0)

  let refetched = false
  page.on("response", (res) => {
    if (res.url().includes("/admin/dashboard")) refetched = true
  })

  await page.getByRole("button", { name: /flash sync/i }).click()
  // Content must never be replaced by a skeleton while refetching in the background.
  await expect(page.locator(SKELETON)).toHaveCount(0)
  await expect(page.locator("main table tbody tr")).toHaveCount(rowsBefore)
  await page.waitForTimeout(1500)
  expect(refetched).toBe(true)
})

test("reduced motion stops the shimmer", async ({ browser, request, baseURL }) => {
  // A dedicated context: the emulation has to be set when the context is made.
  const context = await browser.newContext({
    baseURL,
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  })
  try {
    await seed(context, { token: await getAdminToken(request) })
    const page = await context.newPage()
    const release = stallRoute(page, `${API_URL}/admin/orders*`)

    await page.goto("/#/order-management", { waitUntil: "load" })
    const skeleton = page.locator(SKELETON)
    await expect(skeleton).toBeVisible()

    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true)

    const shimmer = skeleton.locator(".animate-shimmer").first()
    await expect(shimmer).toBeAttached()
    const duration = await shimmer.evaluate((el) => getComputedStyle(el).animationDuration)
    expect(parseFloat(duration), `shimmer still runs for ${duration}`).toBeLessThan(0.05)

    release()
    await expect(skeleton).toBeHidden()
  } finally {
    await context.close()
  }
})
