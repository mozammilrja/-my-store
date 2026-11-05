import { test, expect } from "@playwright/test"
import { getAdminToken, seed, gotoModule, API_URL, ADMIN_EMAIL, ADMIN_PASSWORD } from "./helpers.js"

/**
 * The store has two admin roles, owner and staff. `/admin/settings` writes and
 * every `/admin/users` write are owner-only; the API enforces that and these
 * tests assert both halves: the server refusing a staff token, and the UI
 * saying so before the request is made.
 */

/** Serves a staff identity for `/admin/me` so the UI's gating can be exercised. */
async function asRole(page, role) {
  await page.route("**/admin/me", async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    body.admin.role = role
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
  })
}

const ownerOnlyControl = (page, name) => page.getByRole("button", { name })

test("an owner can reach the owner-only controls", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await asRole(page, "owner")

  await gotoModule(page, "users-and-role-access")
  await expect(ownerOnlyControl(page, /invite team member/i)).toBeEnabled()

  await gotoModule(page, "system-settings")
  await expect(ownerOnlyControl(page, /save configuration/i)).toBeEnabled()
})

test("a staff account sees owner-only controls disabled and told why", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await asRole(page, "staff")

  await gotoModule(page, "users-and-role-access")
  const invite = ownerOnlyControl(page, /invite team member/i)
  await expect(invite).toBeDisabled()
  await expect(invite).toHaveAttribute("title", /only an owner/i)
  // Row-level deletes are gone entirely rather than left to fail on click.
  await expect(page.locator('main button[title="Delete"]')).toHaveCount(0)

  await gotoModule(page, "system-settings")
  const save = ownerOnlyControl(page, /save configuration/i)
  await expect(save).toBeDisabled()
  await expect(save).toHaveAttribute("title", /only an owner/i)
})

test("the API refuses owner-only writes for a staff token", async ({ request }) => {
  const ownerToken = await getAdminToken(request)
  const email = `rbac-e2e-${Date.now()}@everwear.test`
  const password = "probePassword123"

  const created = await request.post(`${API_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: { email, password, name: "RBAC probe", role: "staff" },
  })
  expect(created.status()).toBe(201)
  const staffId = (await created.json()).user.id

  try {
    const login = await request.post(`${API_URL}/admin/auth/login`, { data: { email, password } })
    expect(login.ok()).toBeTruthy()
    const staffToken = (await login.json()).token
    const asStaff = { Authorization: `Bearer ${staffToken}` }

    // Owner-only writes are refused for staff.
    expect((await request.patch(`${API_URL}/admin/settings`, { headers: asStaff, data: { storeName: "Nope" } })).status()).toBe(403)
    expect((await request.post(`${API_URL}/admin/users`, { headers: asStaff, data: { email: "x@y.test", password: "abcdefghijkl", role: "owner" } })).status()).toBe(403)
    expect((await request.delete(`${API_URL}/admin/users/${staffId}`, { headers: asStaff })).status()).toBe(403)

    // Everything a staff account is meant to read still works.
    for (const path of ["orders", "products", "dashboard", "customers"]) {
      expect((await request.get(`${API_URL}/admin/${path}`, { headers: asStaff })).status(), path).toBe(200)
    }
  } finally {
    await request.delete(`${API_URL}/admin/users/${staffId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    })
  }
})

test("no module exposes a vendor role or vendor-only surface", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await gotoModule(page, "users-and-role-access")

  // The data model has exactly two roles. "Vendor" in this admin means a
  // supplier record in procurement, never an account role.
  const roleOptions = await page.evaluate(() =>
    [...document.querySelectorAll('[role="option"], option')].map((o) => o.textContent.trim().toLowerCase())
  )
  expect(roleOptions.some((o) => o.includes("vendor"))).toBe(false)

  await page.getByRole("button", { name: /invite team member/i }).click()
  const dialogRoles = await page.evaluate(() =>
    [...document.querySelectorAll('[role="dialog"] [role="option"], [role="dialog"] option')].map((o) =>
      o.textContent.trim().toLowerCase()
    )
  )
  expect(dialogRoles.some((o) => o.includes("vendor"))).toBe(false)
})
