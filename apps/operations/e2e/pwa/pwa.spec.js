import { devices, expect, test } from "@playwright/test"

/*
 * The operations portal as an installed app, on the production build.
 * Accounts come from e2e/portal/api-server.ts (password below).
 */
test.describe.configure({ mode: "serial" })

const API = "http://localhost:9207"
const PASSWORD = "portal-password-1"

async function signIn(page, email) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
}

/** A phone's screen, touch and browser identity, in the configured Chrome. */
const phone = ({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch }) => ({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch })

const controlled = (page) => page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15_000 })

test("the manifest describes an installable app, and every icon is a real PNG of its size", async ({ page, request }) => {
  await page.goto("/login")
  const href = await page.locator('link[rel="manifest"]').getAttribute("href")
  const res = await request.get(href)
  expect(res.headers()["content-type"]).toContain("manifest")
  const m = await res.json()
  expect(m).toMatchObject({ display: "standalone", start_url: "/?source=pwa", scope: "/", short_name: "AVELIQ Ops" })
  expect(m.icons.map((i) => `${i.sizes} ${i.purpose}`)).toEqual(expect.arrayContaining(["192x192 any", "512x512 any", "512x512 maskable"]))
  for (const icon of [...m.icons, { src: "/icons/apple-touch-icon.png", sizes: "180x180" }, { src: "/icons/badge-96.png", sizes: "96x96" }]) {
    const size = await page.evaluate(
      (src) => new Promise((ok, bad) => Object.assign(new Image(), { onload() { ok(`${this.naturalWidth}x${this.naturalHeight}`) }, onerror: bad, src })),
      icon.src
    )
    expect(size, icon.src).toBe(icon.sizes)
  }
  expect(m.shortcuts.map((s) => s.url)).toEqual(["/delivery?source=pwa", "/warehouse?source=pwa", "/seller?source=pwa", "/admin/overview?source=pwa"])
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute("content", /^#/)
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/apple-touch-icon.png")
})

test("Chrome finds nothing stopping installation once the service worker runs", async ({ page }) => {
  await page.goto("/login")
  await controlled(page).catch(async () => {
    await page.reload()
    await controlled(page)
  })
  const cdp = await page.context().newCDPSession(page)
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors")
  // Test browsers run in a private profile, where Chrome never installs; every real requirement must pass.
  expect(installabilityErrors.filter((e) => e.errorId !== "in-incognito")).toEqual([])
  const { errors } = await cdp.send("Page.getAppManifest")
  expect(errors).toEqual([])
})

test("the service worker stores only the app shell and this site's static files, never API data", async ({ page }) => {
  await signIn(page, "rider@everwear.test")
  await expect(page.getByRole("heading", { name: "Your route" })).toBeVisible()
  await controlled(page)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Your route" })).toBeVisible()
  await page.getByRole("link", { name: "Cash" }).last().click()
  await page.waitForLoadState("networkidle")
  const cached = await page.evaluate(async () => {
    const out = []
    for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) out.push(req.url)
    return out
  })
  expect(cached.length).toBeGreaterThan(3)
  for (const url of cached) {
    const u = new URL(url)
    expect(u.origin, url).toBe(new URL(page.url()).origin)
    expect(u.pathname === "/" || /^\/(assets|icons|brand|fonts)\/|^\/(offline\.html|favicon\.svg|manifest\.webmanifest)$/.test(u.pathname), url).toBe(true)
  }
  expect(cached.some((u) => u.startsWith(API))).toBe(false)
})

test("offline, the installed app still opens and says it can't reach the server", async ({ page, context }) => {
  await signIn(page, "rider@everwear.test")
  await expect(page.getByRole("heading", { name: "Your route" })).toBeVisible()
  await controlled(page)
  await context.setOffline(true)
  await expect(page.getByRole("status").filter({ hasText: "What you do now is kept" })).toBeVisible()
  await page.reload()
  // The shell comes from the cache; the session can't be checked, and the app says so.
  await expect(page.getByText(/Can't reach the server/)).toBeVisible()
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
  await context.setOffline(false)
  await page.getByRole("button", { name: "Try again" }).click()
  await expect(page.getByRole("heading", { name: "Your route" })).toBeVisible()
})

test.describe("on an iPhone", () => {
  test.use(phone(devices["iPhone 13"]))

  test("riders are shown how to add the app to the home screen, once", async ({ page }) => {
    await signIn(page, "rider@everwear.test")
    await expect(page.getByRole("heading", { name: "Your route" })).toBeVisible()
    const offer = page.getByRole("dialog", { name: "Install the app on this phone" })
    await expect(offer).toContainText("Add to Home Screen")
    await offer.getByRole("button", { name: "Not now" }).click()
    await expect(offer).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole("heading", { name: "Your route" })).toBeVisible()
    await expect(offer).toHaveCount(0)
    // Still reachable from the account menu.
    await page.getByRole("button", { name: /^Account menu for/ }).click()
    await page.getByRole("menuitem", { name: "Install app" }).click()
    await expect(page.getByText("Add to Home Screen")).toBeVisible()
  })
})

test.describe("on an Android phone", () => {
  test.use(phone(devices["Pixel 7"]))

  test("the Install button opens the browser's own install dialog", async ({ page }) => {
    await signIn(page, "supervisor@everwear.test")
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible()
    // Chrome fires this when the site qualifies; here it is fired by hand with a stand-in prompt.
    await page.evaluate(() => {
      const e = new Event("beforeinstallprompt", { cancelable: true })
      e.prompt = async () => void (window.__prompted = true)
      e.userChoice = Promise.resolve({ outcome: "accepted" })
      window.dispatchEvent(e)
    })
    const offer = page.getByRole("dialog", { name: "Install the app on this phone" })
    await offer.getByRole("button", { name: "Install" }).click()
    expect(await page.evaluate(() => window.__prompted)).toBe(true)
    await expect(offer).toHaveCount(0)
  })
})

const WIDTHS = [360, 375, 390, 414, 768, 1280]
for (const width of WIDTHS) {
  test(`sign-in, password reset and account pages fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 768 ? 800 : 900 })
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    await page.goto("/login")
    expect(await overflow()).toBeLessThanOrEqual(0)
    const signInButton = page.getByRole("button", { name: "Sign in" })
    expect((await signInButton.boundingBox()).height).toBeGreaterThanOrEqual(44)
    await page.goto("/forgot-password")
    expect(await overflow()).toBeLessThanOrEqual(0)
    await signIn(page, "admin@everwear.test")
    await expect(page).toHaveURL(/\/admin\/overview$/)
    await page.goto("/account")
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible()
    expect(await overflow()).toBeLessThanOrEqual(0)
  })
}
