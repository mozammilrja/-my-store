import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"

// Isolated database; set before the app reads its settings.
process.env.MONGODB_DB = "everwear_test_catalog"
process.env.NODE_ENV = "test"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())
type Json = Record<string, any>

const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const res = await request(path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return { status: res.status, body: (await res.json()) as Json }
}

const list = async (query: string) => {
  const { status, body } = await call("GET", `/store/products?country=in&limit=50&${query}`)
  assert.equal(status, 200, `listing failed for ${query}: ${JSON.stringify(body)}`)
  return body
}

const handles = (body: Json) => (body.products as Json[]).map((p) => p.handle).sort()

/**
 * Catalog data the listing card depends on: brand, MRP, saving, rating,
 * sponsorship, per-size stock, and the filters and sorts the sidebar drives.
 */
before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()
  const now = new Date()

  await db.regions().insertOne({
    _id: "reg_in",
    name: "India",
    currency: "inr",
    countries: [{ code: "in", name: "India" }],
    taxRate: 0,
    taxInclusive: true,
    shippingOptions: [{ _id: "so_std", name: "Standard", amount: 9900 }],
    createdAt: now,
    updatedAt: now,
  })

  const variant = (id: string, size: string, price: number, mrp: number | null, stock: number) => ({
    _id: id,
    title: size,
    options: { Size: size },
    prices: { inr: price },
    ...(mrp === null ? {} : { compareAtPrices: { inr: mrp } }),
    manageInventory: true,
    allowBackorder: false,
    stock,
  })

  // Deep discount, highly rated, sponsored, one size sold out.
  await db.products().insertOne({
    _id: "prod_tee",
    handle: "deal-tee",
    title: "Deal Tee",
    brand: "Jockey",
    status: "published",
    thumbnail: "/images/a.jpg",
    images: ["/images/a.jpg", "/images/b.jpg", "/images/c.jpg"],
    categoryIds: [],
    collectionId: null,
    tags: ["new-arrival", "sponsored"],
    options: [{ title: "Size", values: ["S", "M", "L"] }],
    variants: [
      variant("var_tee_s", "S", 35400, 99900, 4),
      variant("var_tee_m", "M", 35400, 99900, 0),
      variant("var_tee_l", "L", 39900, 99900, 7),
    ],
    createdAt: new Date(now.getTime() - 3000),
    updatedAt: now,
  })

  // Small discount, no reviews, fully in stock.
  await db.products().insertOne({
    _id: "prod_shirt",
    handle: "plain-shirt",
    title: "Plain Shirt",
    brand: "Levis",
    status: "published",
    thumbnail: "/images/s.jpg",
    images: ["/images/s.jpg"],
    categoryIds: [],
    collectionId: null,
    tags: [],
    options: [{ title: "Size", values: ["M", "L"] }],
    variants: [variant("var_sh_m", "M", 180000, 200000, 5), variant("var_sh_l", "L", 180000, 200000, 5)],
    createdAt: new Date(now.getTime() - 2000),
    updatedAt: now,
  })

  // No discount at all, and every size sold out.
  await db.products().insertOne({
    _id: "prod_gone",
    handle: "sold-out-cap",
    title: "Sold Out Cap",
    brand: "Levis",
    status: "published",
    thumbnail: "/images/c.jpg",
    images: ["/images/c.jpg"],
    categoryIds: [],
    collectionId: null,
    tags: [],
    options: [{ title: "Size", values: ["S"] }],
    variants: [variant("var_cap_s", "S", 50000, null, 0)],
    createdAt: new Date(now.getTime() - 1000),
    updatedAt: now,
  })

  // A draft must never reach the shop.
  await db.products().insertOne({
    _id: "prod_draft",
    handle: "secret-draft",
    title: "Secret Draft",
    brand: "Jockey",
    status: "draft",
    images: [],
    categoryIds: [],
    collectionId: null,
    tags: [],
    options: [{ title: "Size", values: ["M"] }],
    variants: [variant("var_dr_m", "M", 10000, null, 5)],
    createdAt: now,
    updatedAt: now,
  })

  await db.productReviews().insertMany([
    {
      _id: "rev_1",
      productId: "prod_tee",
      customerId: "cus_a",
      customerName: "A Shopper",
      rating: 5,
      comment: "Great fit and the fabric held up.",
      verifiedPurchase: true,
      status: "approved",
      createdAt: now,
    },
    {
      _id: "rev_2",
      productId: "prod_tee",
      customerId: "cus_b",
      customerName: "B Shopper",
      rating: 4,
      comment: "Good value for the price paid.",
      verifiedPurchase: true,
      status: "approved",
      createdAt: now,
    },
    {
      // Pending reviews must not count towards the badge.
      _id: "rev_3",
      productId: "prod_shirt",
      customerId: "cus_c",
      customerName: "C Shopper",
      rating: 1,
      comment: "Awaiting moderation, should not count.",
      verifiedPurchase: false,
      status: "pending",
      createdAt: now,
    },
  ])
})

after(async () => {
  await close()
  await getDb().dropDatabase()
  await disconnect()
})

describe("listing card data", () => {
  test("a product carries brand, MRP, saving, rating and sponsorship", async () => {
    const body = await list("id=prod_tee")
    const p = body.products[0]

    assert.equal(p.brand, "Jockey")
    assert.equal(p.priceRange.min, 35400)
    assert.equal(p.compareAtPrice, 99900, "MRP is the cheapest variant's compare-at")
    assert.equal(p.discountPercent, 65, "(99900-35400)/99900 rounds to 65%")
    assert.deepEqual(p.compareAtPriceRange, { min: 99900, max: 99900 })
    assert.equal(p.sponsored, true)
    assert.equal(p.inStock, true)
    assert.equal(p.rating, 4.5, "mean of the two approved reviews")
    assert.equal(p.ratingCount, 2)
    assert.equal(p.images.length, 3, "the whole gallery ships with the list")
  })

  test("per-size availability is exposed so a sold-out size can be disabled", async () => {
    const body = await list("id=prod_tee")
    const byTitle = Object.fromEntries(
      (body.products[0].variants as Json[]).map((v) => [v.title, v])
    )
    assert.equal(byTitle.S.inStock, true)
    assert.equal(byTitle.M.inStock, false, "M has zero stock")
    assert.equal(byTitle.L.inStock, true)
    assert.equal(byTitle.S.discountPercent, 65)
    assert.equal(byTitle.L.discountPercent, 60, "L is priced higher, so it saves less")
  })

  test("a product with no sale reports no MRP and no saving", async () => {
    const body = await list("id=prod_gone")
    const p = body.products[0]
    assert.equal(p.compareAtPrice, null)
    assert.equal(p.discountPercent, null)
    assert.equal(p.compareAtPriceRange, null)
    assert.equal(p.onSale, false)
    assert.equal(p.inStock, false, "every size is out of stock")
  })

  test("an unreviewed product reports no rating rather than zero stars", async () => {
    const body = await list("id=prod_shirt")
    assert.equal(body.products[0].rating, null)
    assert.equal(body.products[0].ratingCount, 0)
  })

  test("drafts stay out of the shop", async () => {
    const body = await list("")
    assert.ok(!handles(body).includes("secret-draft"))
    assert.equal(body.count, 3)
  })
})

describe("listing filters", () => {
  test("brand", async () => {
    assert.deepEqual(handles(await list("brand=Levis")), ["plain-shirt", "sold-out-cap"])
    assert.deepEqual(handles(await list("brand=Jockey")), ["deal-tee"])
    // Repeating the parameter widens the match.
    assert.equal((await list("brand=Levis&brand=Jockey")).count, 3)
    assert.equal((await list("brand=Nope")).count, 0)
  })

  test("price range, against the cheapest variant", async () => {
    assert.deepEqual(handles(await list("maxPrice=60000")), ["deal-tee", "sold-out-cap"])
    assert.deepEqual(handles(await list("minPrice=100000")), ["plain-shirt"])
    assert.deepEqual(handles(await list("minPrice=40000&maxPrice=60000")), ["sold-out-cap"])
    // An inverted range matches nothing rather than erroring.
    assert.equal((await list("minPrice=90000&maxPrice=10000")).count, 0)
  })

  test("minimum discount", async () => {
    assert.deepEqual(handles(await list("minDiscount=50")), ["deal-tee"])
    assert.deepEqual(handles(await list("minDiscount=10")), ["deal-tee", "plain-shirt"])
    assert.equal((await list("minDiscount=99")).count, 0)
  })

  test("minimum rating counts only approved reviews", async () => {
    assert.deepEqual(handles(await list("minRating=4")), ["deal-tee"])
    assert.equal((await list("minRating=5")).count, 0, "the 4.5 average is below 5")
    // prod_shirt's only review is pending, so it is not rated at all.
    assert.ok(!handles(await list("minRating=1")).includes("plain-shirt"))
  })

  test("in-stock drops products with nothing buyable", async () => {
    assert.deepEqual(handles(await list("inStock=true")), ["deal-tee", "plain-shirt"])
  })

  test("size values OR within the axis", async () => {
    assert.deepEqual(handles(await list("size=S")), ["deal-tee", "sold-out-cap"])
    assert.deepEqual(handles(await list("size=S&size=L")), [
      "deal-tee",
      "plain-shirt",
      "sold-out-cap",
    ])
    assert.equal((await list("size=XXL")).count, 0)
  })

  test("option filters still work in their original Title:Value form", async () => {
    assert.deepEqual(handles(await list("option=Size%3AM")), ["deal-tee", "plain-shirt"])
  })

  test("filters combine", async () => {
    assert.deepEqual(handles(await list("brand=Levis&inStock=true")), ["plain-shirt"])
    assert.equal((await list("brand=Levis&minDiscount=50")).count, 0)
  })

  test("a bad filter value is refused, not ignored", async () => {
    const { status } = await call("GET", "/store/products?country=in&minRating=9")
    assert.equal(status, 400)
  })
})

describe("listing sorts", () => {
  test("best discount first", async () => {
    const body = await list("sort=discount")
    assert.equal(body.products[0].handle, "deal-tee", "65% leads")
    assert.equal(body.products[2].handle, "sold-out-cap", "no discount trails")
  })

  test("customer rating first", async () => {
    const body = await list("sort=rating")
    assert.equal(body.products[0].handle, "deal-tee")
  })

  test("popularity leads with the most-reviewed", async () => {
    const body = await list("sort=popularity")
    assert.equal(body.products[0].handle, "deal-tee")
  })

  test("price sorts are unchanged", async () => {
    assert.equal((await list("sort=price_asc")).products[0].handle, "deal-tee")
    assert.equal((await list("sort=price_desc")).products[0].handle, "plain-shirt")
  })
})

describe("facets", () => {
  test("brands, discounts and ratings come back with counts", async () => {
    const { status, body } = await call("GET", "/store/facets?country=in")
    assert.equal(status, 200)

    assert.deepEqual(body.brands, [
      { value: "Levis", count: 2 },
      { value: "Jockey", count: 1 },
    ])
    const tiers = Object.fromEntries((body.discounts as Json[]).map((d) => [d.value, d.count]))
    assert.equal(tiers[10], 2, "both discounted products clear 10%")
    assert.equal(tiers[60], 1, "only the tee clears 60%")
    assert.equal(tiers[70], undefined, "empty tiers are omitted")
    assert.deepEqual(body.ratings, [{ value: 4, count: 1 }, { value: 3, count: 1 }, { value: 2, count: 1 }])
    assert.deepEqual(body.priceRange, { min: 35400, max: 180000 })
  })

  test("a search narrows the facet counts to what it matches", async () => {
    const matched = await list("q=tee")
    assert.deepEqual(handles(matched), ["deal-tee"])
    const tee = (matched.products as Json[])[0]!

    const { status, body } = await call("GET", "/store/facets?country=in&q=tee")
    assert.equal(status, 200)
    assert.deepEqual(body.brands, [{ value: tee.brand, count: 1 }])
    const sizes = (body.options as Json[]).find((o) => o.title === "Size")
    assert.ok(sizes, "the tee's sizes are faceted")
    assert.ok(sizes.values.every((v: Json) => v.count === 1), "every size count is the tee alone")
  })
})

describe("wishlist", () => {
  let token = ""

  before(async () => {
    const res = await call("POST", "/store/auth/register", {
      email: "wish@example.com",
      password: "sufficiently-long-password",
      firstName: "Wish",
      lastName: "Lister",
    })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    token = res.body.token
  })

  const auth = () => ({ authorization: `Bearer ${token}` })

  test("a signed-out visitor is refused", async () => {
    const { status } = await call("GET", "/store/customers/me/wishlist")
    assert.equal(status, 401)
  })

  test("saving, listing and removing a product", async () => {
    const empty = await call("GET", "/store/customers/me/wishlist", undefined, auth())
    assert.deepEqual(empty.body.productIds, [])

    const added = await call("POST", "/store/customers/me/wishlist", { productId: "prod_tee" }, auth())
    assert.equal(added.status, 200)
    assert.deepEqual(added.body.productIds, ["prod_tee"])

    const listed = await call("GET", "/store/customers/me/wishlist", undefined, auth())
    assert.deepEqual(listed.body.productIds, ["prod_tee"])
    assert.equal(listed.body.items[0].handle, "deal-tee")

    const removed = await call(
      "DELETE",
      "/store/customers/me/wishlist/prod_tee",
      undefined,
      auth()
    )
    assert.equal(removed.status, 200)
    assert.deepEqual(removed.body.productIds, [])
  })

  test("saving the same product twice does not duplicate it", async () => {
    await call("POST", "/store/customers/me/wishlist", { productId: "prod_shirt" }, auth())
    const again = await call("POST", "/store/customers/me/wishlist", { productId: "prod_shirt" }, auth())
    assert.deepEqual(again.body.productIds, ["prod_shirt"])
    await call("DELETE", "/store/customers/me/wishlist/prod_shirt", undefined, auth())
  })

  test("an unpublished or unknown product cannot be saved", async () => {
    const draft = await call("POST", "/store/customers/me/wishlist", { productId: "prod_draft" }, auth())
    assert.equal(draft.status, 404)
    const missing = await call("POST", "/store/customers/me/wishlist", { productId: "nope" }, auth())
    assert.equal(missing.status, 404)
  })

  test("removing something never saved is a no-op", async () => {
    const { status, body } = await call(
      "DELETE",
      "/store/customers/me/wishlist/prod_gone",
      undefined,
      auth()
    )
    assert.equal(status, 200)
    assert.deepEqual(body.productIds, [])
  })
})

describe("quick add to bag", () => {
  test("a sold-out size is refused", async () => {
    const cart = await call("POST", "/store/carts", { country: "IN" })
    const res = await call("POST", `/store/carts/${cart.body.cart.id}/items`, {
      variantId: "var_tee_m",
      quantity: 1,
    })
    assert.equal(res.status, 409)
    assert.equal(res.body.error.code, "out_of_stock")
  })

  test("an available size adds the right variant at the catalog price", async () => {
    const cart = await call("POST", "/store/carts", { country: "IN" })
    const res = await call("POST", `/store/carts/${cart.body.cart.id}/items`, {
      variantId: "var_tee_s",
      quantity: 1,
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.cart.items.length, 1)
    assert.equal(res.body.cart.items[0].variantId, "var_tee_s")
    assert.equal(res.body.cart.items[0].variantTitle, "S")
    assert.equal(res.body.cart.items[0].unitPrice, 35400)
  })

  test("asking for more than the stock on hand is refused", async () => {
    const cart = await call("POST", "/store/carts", { country: "IN" })
    const res = await call("POST", `/store/carts/${cart.body.cart.id}/items`, {
      variantId: "var_tee_s",
      quantity: 5,
    })
    assert.equal(res.status, 409)
    assert.equal(res.body.error.code, "insufficient_stock")
  })
})
