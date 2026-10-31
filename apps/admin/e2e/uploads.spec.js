import { test, expect } from "@playwright/test"
import { getAdminToken, seed, gotoModule, API_URL } from "./helpers.js"

/**
 * The upload flow used to fake a success: when the API call failed it made a
 * blob: URL, added it to the strip and showed a success toast, so the operator
 * believed an image was saved that had never left the browser. These cover the
 * states it should show instead, and that a real upload is actually persisted.
 */

// A 1x1 PNG, the smallest thing the backend's magic-byte sniff accepts.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
)

/** The catalog opens with the first product already in the editor. */
async function openFirstProduct(page) {
  await gotoModule(page, "products")
  await expect(page.getByRole("heading", { name: /studio 360/i })).toBeVisible()
}

test("an oversized file is refused before any request is made", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  let uploadCalls = 0
  await page.route("**/admin/uploads", (route) => {
    uploadCalls++
    return route.continue()
  })
  await openFirstProduct(page)

  await page.locator('input[type="file"]').setInputFiles({
    name: "huge.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(6 * 1024 * 1024, 1),
  })

  await expect(page.getByText(/the limit is 5 MB/i)).toBeVisible()
  expect(uploadCalls, "a file over the limit should never reach the API").toBe(0)
})

test("an unsupported type is refused before any request is made", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  let uploadCalls = 0
  await page.route("**/admin/uploads", (route) => {
    uploadCalls++
    return route.continue()
  })
  await openFirstProduct(page)

  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4"),
  })

  await expect(page.getByText(/use PNG, JPEG or WebP/i)).toBeVisible()
  expect(uploadCalls).toBe(0)
})

test("a failed upload shows the error and adds no asset", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await openFirstProduct(page)

  const before = await page.locator('[alt^="Perspective"], [alt^="Primary"]').count()

  await page.route("**/admin/uploads", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "server_error", message: "Storage is unavailable" } }),
    })
  )
  await page.locator('input[type="file"]').setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: PNG })

  await expect(page.getByText(/storage is unavailable/i).first()).toBeVisible()
  await expect(page.getByRole("button", { name: /^retry$/i })).toBeVisible()
  // No success wording anywhere, and the saved strip is unchanged.
  await expect(page.getByText(/image saved/i)).toHaveCount(0)
  expect(await page.locator('[alt^="Perspective"], [alt^="Primary"]').count()).toBe(before)
})

test("a real upload is saved on the product and survives a reload", async ({ page, context, request }) => {
  const token = await getAdminToken(request)
  await seed(context, { token })

  // Remember the product this test is about to edit so it can be put back.
  const auth = { Authorization: `Bearer ${token}` }
  const first = (await (await request.get(`${API_URL}/admin/products?limit=1`, { headers: auth })).json())
    .products[0]

  await openFirstProduct(page)

  const patches = []
  page.on("request", (r) => {
    if (r.method() === "PATCH" && r.url().includes("/admin/products/")) patches.push(r.postDataJSON())
  })

  await page.locator('input[type="file"]').setInputFiles({ name: "studio.png", mimeType: "image/png", buffer: PNG })

  await expect(page.getByText(/image saved/i)).toBeVisible({ timeout: 15000 })

  // The upload was written onto the product, not just held in component state.
  expect(patches.length, "an upload must PATCH the product's images").toBeGreaterThan(0)
  const images = patches.at(-1).images
  expect(Array.isArray(images)).toBe(true)
  expect(images.some((i) => i.startsWith("/uploads/"))).toBe(true)

  // And it is still there after a reload, served by the API.
  await page.reload()
  await openFirstProduct(page)
  const srcs = await page.locator("img").evaluateAll((els) => els.map((e) => e.getAttribute("src") || ""))
  expect(srcs.some((s) => s.includes("/uploads/")), "the saved image should come back from the API").toBe(true)

  // Leave the catalog as it was found.
  await request.patch(`${API_URL}/admin/products/${first.id}`, {
    headers: auth,
    data: { images: first.images },
  })
})
