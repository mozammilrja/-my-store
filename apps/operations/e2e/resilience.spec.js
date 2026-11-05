import { test, expect } from "@playwright/test"
import { API_URL, getAdminToken, seed, gotoModule, MODULES } from "./helpers.js"

/**
 * The admin must never answer with a blank page. These cover the two ways it
 * used to: a render-time throw unmounting the React root, and an expired
 * session stranding every query in a skeleton that never resolved.
 */

test("a module that throws while rendering is contained, not fatal", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  // Rows of `null` are enough to throw inside the order mapper.
  await page.route("**/admin/orders*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ orders: [null, null], count: 2, page: 1, pages: 1 }),
    })
  )

  // Not gotoModule: that waits for a page heading, which the error state has none of.
  await page.goto("/#/order-management")
  await page.waitForLoadState("networkidle")

  // The shell survives, so the operator can navigate away.
  await expect(page.locator("nav").getByText(/^Overview$/).first()).toBeVisible()
  await expect(page.getByRole("alert")).toContainText(/could not be displayed/i)
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible()
})

test("an expired session sends the viewer to the login page with a notice, never an endless skeleton", async ({
  page,
  context,
  request,
}) => {
  // Signed in, then the API stops accepting the session (expired, revoked,
  // or the account suspended): every admin call answers 401.
  await seed(context, { token: await getAdminToken(request) })
  await page.route(`${API_URL}/admin/**`, (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "unauthorized", message: "Unauthorized" } }),
    })
  )

  for (const path of ["returns-and-exchanges", "order-management", "customers-and-loyalty"]) {
    await page.goto(`/admin/${path}`)
    await expect(page, path).toHaveURL(/\/login$/)
    await expect(page.getByRole("status"), path).toContainText(/session has ended/i)
    await expect(page.getByLabel(/email/i), path).toBeVisible()
  }
})

test("every module renders content rather than an empty main", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  for (const { path } of MODULES) {
    await gotoModule(page, path)
    const text = (await page.locator("main").innerText()).trim()
    expect(text.length, `${path} rendered an almost empty main`).toBeGreaterThan(200)
    expect(text, `${path} tripped the error boundary`).not.toMatch(/could not be displayed/i)
  }
})

test("a legacy #/module link still lands on the right page", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })

  // The admin routed on the hash before react-router. Those links are still in
  // bookmarks, so they are rewritten to the path before React mounts.
  await page.goto("/#/returns-and-exchanges")
  await expect(page).toHaveURL(/\/admin\/returns-and-exchanges$/)
  await expect(page.locator("main h1")).toHaveText(/returns/i)

  // Then the admin lived at the site root; those paths now redirect under /admin.
  await page.goto("/order-management?q=asha")
  await expect(page).toHaveURL(/\/admin\/order-management\?q=asha$/)
  await expect(page.locator("main h1")).toHaveText(/^orders$/i)
})
