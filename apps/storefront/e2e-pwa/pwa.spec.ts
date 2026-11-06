import { devices, expect, test, type Page } from "@playwright/test"

/*
 * The storefront as an installed app, on the production build: manifest and
 * icons, installability, what the service worker keeps (public files only,
 * never pages or API data), the offline page, and the install offer.
 */
test.describe.configure({ mode: "serial" })

const controlled = (page: Page) => page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20_000 })
const phone = (d: (typeof devices)[string]) => ({ viewport: d.viewport, userAgent: d.userAgent, deviceScaleFactor: d.deviceScaleFactor, isMobile: d.isMobile, hasTouch: d.hasTouch })

test("the manifest describes an installable shop app, with real icons of each size", async ({ page, request }) => {
  await page.goto("/in")
  const href = await page.locator('link[rel="manifest"]').getAttribute("href")
  const m = await (await request.get(href!)).json()
  expect(m).toMatchObject({ display: "standalone", start_url: "/in?source=pwa", scope: "/", short_name: "AVELIQ" })
  for (const icon of [...m.icons, { src: "/icons/apple-touch-icon.png", sizes: "180x180" }, { src: "/icons/badge-96.png", sizes: "96x96" }]) {
    const size = await page.evaluate(
      (src) => new Promise<string>((ok, bad) => Object.assign(new Image(), { onload(this: HTMLImageElement) { ok(`${this.naturalWidth}x${this.naturalHeight}`) }, onerror: bad, src })),
      icon.src
    )
    expect(size, icon.src).toBe(icon.sizes)
  }
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/apple-touch-icon.png")
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/)
})

test("Chrome finds nothing stopping installation once the service worker runs", async ({ page }) => {
  await page.goto("/in")
  await controlled(page).catch(async () => {
    await page.reload()
    await controlled(page)
  })
  const cdp = await page.context().newCDPSession(page)
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors")
  // Test browsers run in a private profile, where Chrome never installs; every real requirement must pass.
  expect(installabilityErrors.filter((e: { errorId: string }) => e.errorId !== "in-incognito")).toEqual([])
  expect((await cdp.send("Page.getAppManifest")).errors).toEqual([])
})

test("only public static files are cached: no pages, no bag, no API answers", async ({ page }) => {
  await page.goto("/in")
  await controlled(page)
  await page.reload()
  await page.goto("/in/store")
  await page.locator('a[href*="/products/"]').first().click()
  await page.waitForURL(/\/products\//)
  await page.goto("/in/cart")
  await page.goto("/in/account")
  await page.waitForLoadState("networkidle")
  const cached = await page.evaluate(async () => {
    const out: string[] = []
    for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) out.push(req.url)
    return out
  })
  expect(cached.length).toBeGreaterThan(5)
  const origin = new URL(page.url()).origin
  for (const url of cached) {
    const u = new URL(url)
    expect(u.origin, url).toBe(origin)
    expect(/^\/(_next\/static|fonts|brand|icons|images)\/|^\/_next\/image$|^\/offline\.html$/.test(u.pathname), url).toBe(true)
  }
  expect(cached.some((u) => /\/in(\/|$)|\/api\/|\/cart|\/account|\/checkout/.test(new URL(u).pathname))).toBe(false)
})

test("offline, a page that can't load shows the offline page; back online it loads by itself", async ({ page, context }) => {
  await page.goto("/in")
  await controlled(page)
  await context.setOffline(true)
  await page.goto("/in/store").catch(() => {})
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
  // Back online, the offline page reloads by itself and the real page appears.
  await context.setOffline(false)
  await expect(page.getByRole("heading", { name: "You're offline" })).toHaveCount(0)
  await expect(page).toHaveURL(/\/in\/store/)
})

test.describe("on an iPhone", () => {
  test.use(phone(devices["iPhone 13"]))

  test("after a few pages, shoppers are shown how to add the shop to the home screen; never on account or checkout pages", async ({ page }) => {
    const offer = page.getByRole("dialog", { name: "Add AVELIQ to your home screen" })
    await page.goto("/in")
    await expect(offer).toHaveCount(0)
    await page.goto("/in/store")
    await page.goto("/in/cart")
    await expect(offer).toContainText("Add to Home Screen")
    await page.goto("/in/account")
    await page.waitForLoadState("networkidle")
    await expect(offer).toHaveCount(0)
    await page.goto("/in")
    await offer.getByRole("button", { name: "Not now" }).click()
    await expect(offer).toHaveCount(0)
    await page.reload()
    await page.waitForLoadState("networkidle")
    await expect(offer).toHaveCount(0)
  })
})

test.describe("on an Android phone", () => {
  test.use(phone(devices["Pixel 7"]))

  test("Install opens the browser's own install dialog", async ({ page }) => {
    await page.goto("/in")
    await page.goto("/in/store")
    await page.goto("/in")
    await page.evaluate(() => {
      const e = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
        prompt: async () => void ((window as unknown as { __prompted: boolean }).__prompted = true),
        userChoice: Promise.resolve({ outcome: "accepted" }),
      })
      window.dispatchEvent(e)
    })
    const offer = page.getByRole("dialog", { name: "Add AVELIQ to your home screen" })
    await offer.getByRole("button", { name: "Install" }).click()
    expect(await page.evaluate(() => (window as unknown as { __prompted: boolean }).__prompted)).toBe(true)
    await expect(offer).toHaveCount(0)
  })
})
