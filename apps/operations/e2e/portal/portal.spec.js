import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

/*
 * One portal, one sign-in, each role in its own workspace. Every account is
 * seeded by e2e/portal/api-server.ts with the password below.
 */
test.describe.configure({ mode: "serial" })

const API = "http://localhost:9197"
const MAIL = "http://localhost:9198"
const PASSWORD = "portal-password-1"

async function signIn(page, email, password = PASSWORD) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
}

/** Calls the API from the page, as the app would, with the session cookie and portal header. */
const apiStatus = (page, path) =>
  page.evaluate(async ([api, p]) => (await fetch(api + p, { credentials: "include", headers: { "x-everwear-ops": "1" } })).status, [API, path])

async function signOut(page) {
  await page.getByRole("button", { name: /^Account menu for/ }).click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login$/)
}

async function axe(page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([])
}

test("signed out, every area sends you to the one sign-in page", async ({ page }) => {
  for (const path of ["/", "/admin/overview", "/warehouse", "/delivery", "/seller", "/account"]) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/login$/)
  }
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
  await axe(page)
})

const ROLES = [
  { email: "owner@everwear.test", home: /\/admin\/overview$/, heading: "Overview", api: { "/admin/me": 200, "/warehouse/me": 401, "/rider/me": 401, "/seller/me": 401 }, denied: ["/warehouse", "/delivery", "/seller"] },
  { email: "admin@everwear.test", home: /\/admin\/overview$/, heading: "Overview", api: { "/admin/me": 200, "/warehouse/me": 401 }, denied: ["/warehouse", "/seller"] },
  { email: "supervisor@everwear.test", home: /\/warehouse$/, heading: "Orders", api: { "/warehouse/me": 200, "/admin/me": 401, "/rider/me": 401, "/seller/me": 401 }, denied: ["/admin/overview", "/delivery", "/seller"] },
  { email: "picker@everwear.test", home: /\/warehouse$/, heading: "Orders", api: { "/warehouse/me": 200, "/admin/me": 401 }, denied: ["/admin/users-and-role-access", "/seller"] },
  { email: "rider@everwear.test", home: /\/delivery$/, heading: "Your route", api: { "/rider/me": 200, "/admin/me": 401, "/warehouse/me": 401, "/seller/me": 401 }, denied: ["/admin/overview", "/warehouse", "/seller"] },
  { email: "seller@everwear.test", home: /\/seller$/, heading: "Kavya Textiles", api: { "/seller/me": 200, "/admin/me": 401, "/warehouse/me": 401, "/rider/me": 401 }, denied: ["/admin/payments-and-reconciliation", "/warehouse/stock", "/delivery/cash"] },
]

for (const role of ROLES) {
  test(`${role.email} lands on their own dashboard and can't open anyone else's`, async ({ page }) => {
    await signIn(page, role.email)
    await expect(page).toHaveURL(role.home)
    await expect(page.getByRole("heading", { name: role.heading, exact: true }).first()).toBeVisible()
    for (const [path, status] of Object.entries(role.api)) expect(await apiStatus(page, path), path).toBe(status)
    for (const path of role.denied) {
      await page.goto(path)
      await expect(page.getByRole("heading", { name: /isn't part of your account/ })).toBeVisible()
    }
  })
}

test("a staff member's sidebar shows only floor pages, and their role", async ({ page }) => {
  await signIn(page, "picker@everwear.test")
  const nav = page.getByRole("navigation", { name: "Main" }).first()
  await expect(nav.getByRole("link")).toHaveText(["Orders", "Dispatch", "Stock", "Returns"])
  await page.getByRole("button", { name: /^Account menu for/ }).click()
  await expect(page.getByRole("menu", { name: "Account" })).toContainText("Warehouse staff")
  // One workspace: no switcher.
  await expect(page.getByRole("group", { name: "Workspaces" })).toHaveCount(0)
  await axe(page)
})

test("one person with two jobs switches between them in the same session", async ({ page }) => {
  await signIn(page, "multi@everwear.test")
  await expect(page).toHaveURL(/\/warehouse$/)
  await expect(page.getByText("DEL-FC1")).toBeVisible()
  await page.getByRole("button", { name: /^Account menu for/ }).click()
  const menu = page.getByRole("menu", { name: "Account" })
  await expect(menu).toContainText("Warehouse supervisor")
  await expect(menu).toContainText("Delivery rider")
  await menu.getByRole("menuitem", { name: "Delivery" }).click()
  await expect(page).toHaveURL(/\/delivery$/)
  await expect(page.getByRole("heading", { name: "Your route" })).toBeVisible()
  expect(await apiStatus(page, "/warehouse/me")).toBe(200)
  expect(await apiStatus(page, "/rider/me")).toBe(200)
  // The Delhi supervisor can't read Bengaluru's floor.
  expect(await apiStatus(page, "/warehouse/summary?warehouseId=wh_blr")).toBe(404)
})

test("Ctrl+K lists only pages of your own workspaces", async ({ page }) => {
  await signIn(page, "rider@everwear.test")
  await expect(page.getByRole("heading", { name: "Your route" })).toBeVisible()
  await page.keyboard.press("Control+k")
  const dialog = page.getByRole("dialog", { name: "Go to a page" })
  await expect(dialog.getByRole("option")).toHaveText([/Today/, /Cash/, /Earnings/, /Profile/])
  await dialog.getByRole("combobox").fill("cash")
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/delivery\/cash$/)
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Cash")
})

test("asking for a page before signing in takes you there after, if it's yours", async ({ page }) => {
  await page.goto("/warehouse/stock")
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel("Email").fill("supervisor@everwear.test")
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/warehouse\/stock$/)
})

test("old admin links still work, under /admin", async ({ page }) => {
  await signIn(page, "owner@everwear.test")
  await expect(page).toHaveURL(/\/admin\/overview$/)
  await page.goto("/users-and-role-access")
  await expect(page).toHaveURL(/\/admin\/users-and-role-access$/)
  await page.goto("/#/products")
  await expect(page).toHaveURL(/\/admin\/products$/)
})

test("sign-out ends the session on the server: reopening a page doesn't bring it back", async ({ page }) => {
  await signIn(page, "seller@everwear.test")
  await expect(page).toHaveURL(/\/seller$/)
  await page.goto("/seller/listings")
  await signOut(page)
  expect(await apiStatus(page, "/seller/me")).toBe(401)
  await page.goBack()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto("/seller/listings")
  await expect(page).toHaveURL(/\/login$/)
})

test("a session ended elsewhere sends you to sign in with a notice", async ({ browser }) => {
  const phone = await (await browser.newContext()).newPage()
  const laptop = await (await browser.newContext()).newPage()
  await signIn(phone, "rider@everwear.test")
  await expect(phone).toHaveURL(/\/delivery$/)
  await signIn(laptop, "rider@everwear.test")
  await expect(laptop).toHaveURL(/\/delivery$/)
  await laptop.goto("/account")
  await laptop.getByRole("button", { name: "Sign out other devices" }).click()
  await expect(laptop.getByText("This device")).toBeVisible()
  await expect(laptop.getByRole("button", { name: /^Sign out .* signed in/ })).toHaveCount(0)
  // The phone's next request is refused; it lands on the sign-in with the reason.
  await phone.getByRole("link", { name: "Cash" }).last().click()
  await expect(phone).toHaveURL(/\/login$/)
  await expect(phone.getByText("Your session has ended")).toBeVisible()
})

test("a suspended account can't sign in", async ({ page }) => {
  await signIn(page, "suspended@everwear.test")
  await expect(page.getByRole("alert")).toContainText("Email or password is incorrect")
  await expect(page).toHaveURL(/\/login$/)
})

test("change password from Account & security; the old one stops working", async ({ page }) => {
  await signIn(page, "picker@everwear.test")
  await page.getByRole("button", { name: /^Account menu for/ }).click()
  await page.getByRole("menuitem", { name: "Account & security" }).click()
  await expect(page).toHaveURL(/\/account$/)
  await expect(page.getByRole("main").getByText("Pavan Picker")).toBeVisible()
  await page.getByLabel("Current password").fill(PASSWORD)
  await page.getByLabel(/^New password/).fill("picker-new-password")
  await page.getByLabel("Type the new password again").fill("picker-new-password")
  await page.getByRole("button", { name: "Change password" }).click()
  await expect(page.getByRole("status").filter({ hasText: "Password changed" })).toBeVisible()
  await axe(page)
  await signOut(page)
  await signIn(page, "picker@everwear.test")
  await expect(page.getByRole("alert")).toContainText("Email or password is incorrect")
  await signIn(page, "picker@everwear.test", "picker-new-password")
  await expect(page).toHaveURL(/\/warehouse$/)
})

test("forgot password: the emailed link sets a new password once", async ({ page, request }) => {
  await page.goto("/login")
  await page.getByRole("link", { name: "Forgot password?" }).click()
  await page.getByLabel("Email").fill("seller@everwear.test")
  await page.getByRole("button", { name: "Email me a reset link" }).click()
  await expect(page.getByText("Check your email")).toBeVisible()
  let mail
  await expect.poll(async () => (mail = await (await request.get(MAIL)).json()).resetLink, { timeout: 10_000 }).toBeTruthy()
  expect(mail.to).toEqual(["seller@everwear.test"])
  const link = new URL(mail.resetLink)
  await page.goto(`${link.pathname}${link.search}`)
  await page.getByLabel("New password").fill("seller-reset-password")
  await page.getByLabel("Type it again").fill("seller-reset-password")
  await page.getByRole("button", { name: "Set new password" }).click()
  await expect(page.getByText("Password changed")).toBeVisible()
  // The link works once.
  await page.goto(`${link.pathname}${link.search}`)
  await page.getByLabel("New password").fill("seller-other-password")
  await page.getByLabel("Type it again").fill("seller-other-password")
  await page.getByRole("button", { name: "Set new password" }).click()
  await expect(page.getByRole("alert")).toContainText("expired or was already used")
  await signIn(page, "seller@everwear.test", "seller-reset-password")
  await expect(page).toHaveURL(/\/seller$/)
})

test("phone-sized screens keep the account menu and navigation reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, "supervisor@everwear.test")
  await expect(page).toHaveURL(/\/warehouse$/)
  await expect(page.getByRole("button", { name: /^Account menu for/ })).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Main" }).last().getByRole("link", { name: "Dispatch" })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
