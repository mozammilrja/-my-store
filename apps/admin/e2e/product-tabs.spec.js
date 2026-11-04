import { test, expect } from "@playwright/test"
import { getAdminToken, seed, API_URL } from "./helpers.js"

/**
 * The product editor showed seven tabs but had no TabsContent at all: every
 * panel rendered at once and clicking a tab only moved a highlight. Two of the
 * seven had no content written for them. These cover each tab owning its own
 * panel, the URL carrying which one is open, and the two new panels actually
 * writing to the database.
 */

const TABS = [
  { label: "1. Basic Details", slug: null, marker: /Garment Identification/i },
  { label: "2. Images & Media", slug: "media", marker: /Studio 360/i },
  { label: "3. Size & Colour Variants", slug: "variants", marker: /Size and colour variants/i },
  { label: "4. Pricing & MRP", slug: "pricing", marker: /Commercial Pricing/i },
  { label: "5. HSN & GST Setup", slug: "tax", marker: /Statutory HSN/i },
  { label: "6. Stock Allocation", slug: "stock", marker: /Stock allocation/i },
  { label: "7. Storefront & SEO", slug: "storefront", marker: /Storefront listing/i },
]

const panel = (page) => page.locator('[data-testid="product-tab-panel"]')

test("each tab shows its own panel and nothing from another", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await page.goto("/products")
  await expect(panel(page)).toBeVisible()

  for (const tab of TABS) {
    await page.getByRole("tab", { name: tab.label }).click()
    // Wait for the panel to swap before reading it, or the assertion races the render.
    await expect(panel(page), `${tab.label} should render its own content`).toContainText(tab.marker)

    const text = await panel(page).innerText()
    for (const other of TABS.filter((t) => t.label !== tab.label)) {
      expect(text, `${tab.label} must not also show ${other.label}`).not.toMatch(other.marker)
    }

    const search = new URL(page.url()).searchParams.get("tab")
    expect(search, `${tab.label} should set the URL`).toBe(tab.slug)
  }
})

test("a tab can be opened directly by URL and survives a refresh", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })

  for (const tab of TABS) {
    await page.goto(tab.slug ? `/products?tab=${tab.slug}` : "/products")
    await expect(panel(page), tab.label).toContainText(tab.marker)
    await expect(page.getByRole("tab", { name: tab.label })).toHaveAttribute("aria-selected", "true")

    await page.reload()
    await expect(panel(page), `${tab.label} after reload`).toContainText(tab.marker)
  }
})

test("browser back and forward move between tabs", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await page.goto("/products")

  await page.getByRole("tab", { name: "6. Stock Allocation" }).click()
  await expect(panel(page)).toContainText(/Stock allocation/i)
  await page.getByRole("tab", { name: "7. Storefront & SEO" }).click()
  await expect(panel(page)).toContainText(/Storefront listing/i)

  await page.goBack()
  await expect(panel(page)).toContainText(/Stock allocation/i)
  await page.goForward()
  await expect(panel(page)).toContainText(/Storefront listing/i)
})

test("stock allocation writes the new quantity to the product", async ({ page, context, request }) => {
  const token = await getAdminToken(request)
  const auth = { Authorization: `Bearer ${token}` }
  await seed(context, { token })

  const before = (await (await request.get(`${API_URL}/admin/products?limit=1`, { headers: auth })).json())
    .products[0]
  const variant = before.variants[0]
  const target = (variant.stock ?? 0) + 3

  try {
    await page.goto("/products?tab=stock")
    const field = page.getByLabel(new RegExp(`Units on hand for ${variant.title}`, "i")).first()
    await field.fill(String(target))

    const save = page.getByRole("button", { name: /save stock/i })
    await expect(save).toBeEnabled()
    await save.click()
    await expect(page.getByText(/stock updated/i)).toBeVisible()

    const after = (await (await request.get(`${API_URL}/admin/products/${before.id}`, { headers: auth })).json())
      .product
    expect(after.variants.find((v) => v.id === variant.id).stock).toBe(target)

    // Editing one variant must not move the others.
    for (const other of before.variants.filter((v) => v.id !== variant.id)) {
      expect(after.variants.find((v) => v.id === other.id).stock, other.title).toBe(other.stock)
    }
  } finally {
    await request.patch(`${API_URL}/admin/products/${before.id}`, {
      headers: auth,
      data: { variants: before.variants.map((v) => ({ id: v.id, stock: v.stock })) },
    })
  }
})

test("storefront fields persist and drive the previewed URL", async ({ page, context, request }) => {
  const token = await getAdminToken(request)
  const auth = { Authorization: `Bearer ${token}` }
  await seed(context, { token })

  const before = (await (await request.get(`${API_URL}/admin/products?limit=1`, { headers: auth })).json())
    .products[0]
  const description = `Seeded by the e2e suite at ${Date.now()}`

  try {
    await page.goto("/products?tab=storefront")
    await page.getByLabel(/Meta description/i).fill(description)

    // The preview reads the live field, not the saved value.
    await expect(panel(page)).toContainText(description)

    const save = page.getByRole("button", { name: /save storefront fields/i })
    await expect(save).toBeEnabled()
    await save.click()
    await expect(page.getByText(/storefront fields saved/i)).toBeVisible()

    const after = (await (await request.get(`${API_URL}/admin/products/${before.id}`, { headers: auth })).json())
      .product
    expect(after.description).toBe(description)
  } finally {
    await request.patch(`${API_URL}/admin/products/${before.id}`, {
      headers: auth,
      data: { description: before.description ?? "", handle: before.handle, status: before.status },
    })
  }
})

test("an invalid handle is refused before any request is made", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  let patches = 0
  await page.route("**/admin/products/*", (route) => {
    if (route.request().method() === "PATCH") patches++
    return route.continue()
  })

  await page.goto("/products?tab=storefront")
  await page.getByLabel(/URL handle/i).fill("Not A Valid Handle!")

  await expect(panel(page)).toContainText(/lowercase letters, numbers and dashes/i)
  await expect(page.getByRole("button", { name: /save storefront fields/i })).toBeDisabled()
  expect(patches).toBe(0)
})
