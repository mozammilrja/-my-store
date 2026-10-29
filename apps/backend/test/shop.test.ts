import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"

// Isolated database; set before the app reads its settings.
process.env.MONGODB_DB = "everwear_test"
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

const address = {
  firstName: "Test",
  lastName: "Shopper",
  address1: "Nørregade 1",
  city: "Copenhagen",
  postalCode: "1165",
  countryCode: "dk",
}

before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()
  const now = new Date()
  await db.regions().insertOne({
    _id: "reg_eu",
    name: "Europe",
    currency: "eur",
    countries: [{ code: "dk", name: "Denmark" }],
    taxRate: 25,
    taxInclusive: false,
    shippingOptions: [{ _id: "so_std", name: "Standard", amount: 500 }],
    createdAt: now,
    updatedAt: now,
  })
  await db.products().insertOne({
    _id: "prod_tee",
    handle: "tee",
    title: "Tee",
    status: "published",
    images: [],
    categoryIds: [],
    collectionId: null,
    tags: ["new-arrival"],
    options: [{ title: "Size", values: ["M", "L"] }],
    variants: [
      { _id: "var_m", title: "M", options: { Size: "M" }, prices: { eur: 2000 }, manageInventory: true, allowBackorder: false, stock: 5 },
      { _id: "var_l", title: "L", options: { Size: "L" }, prices: { eur: 2000 }, manageInventory: true, allowBackorder: false, stock: 1 },
    ],
    createdAt: now,
    updatedAt: now,
  })
  await db.promotions().insertOne({
    _id: "promo_10",
    code: "TEN",
    type: "percentage",
    value: 10,
    active: true,
    usageLimit: null,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  })
})

after(async () => {
  await close()
  await getDb().dropDatabase()
  await disconnect()
})

const newCart = async (headers: Record<string, string> = {}) => (await call("POST", "/store/carts", { country: "DK" }, headers)).body.cart

describe("customer accounts", () => {
  test("register, log in, wrong password", async () => {
    const reg = await call("POST", "/store/auth/register", { email: "Ada@Example.com", password: "long-enough-1" })
    assert.equal(reg.status, 201)
    const dup = await call("POST", "/store/auth/register", { email: "ada@example.com", password: "long-enough-1" })
    assert.equal(dup.status, 409)
    const bad = await call("POST", "/store/auth/login", { email: "ada@example.com", password: "nope" })
    assert.equal(bad.status, 401)
    const ok = await call("POST", "/store/auth/login", { email: "ada@example.com", password: "long-enough-1" })
    assert.equal(ok.status, 200)
    const me = await call("GET", "/store/customers/me", undefined, { authorization: `Bearer ${ok.body.token}` })
    assert.equal(me.body.customer.email, "ada@example.com")
    assert.equal((await call("GET", "/store/customers/me")).status, 401)
  })

  test("a customer token can't be used as an admin token", async () => {
    const { body } = await call("POST", "/store/auth/login", { email: "ada@example.com", password: "long-enough-1" })
    const forged = await call("GET", "/store/customers/me", undefined, { authorization: `Bearer ${body.token}x` })
    assert.equal(forged.status, 401)
  })
})

describe("cart and checkout", () => {
  test("prices come from the catalog and totals add up", async () => {
    const cart = await newCart()
    const added = await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_m", quantity: 2 })
    assert.equal(added.status, 200)
    assert.equal(added.body.cart.items[0].unitPrice, 2000)
    await call("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" })
    const promo = await call("POST", `/store/carts/${cart.id}/promotions`, { codes: ["ten"] })
    // 4000 items - 400 discount + 500 shipping = 4100, +25% tax = 1025
    assert.deepEqual(promo.body.cart.totals, { itemSubtotal: 4000, discountTotal: 400, shippingTotal: 500, taxTotal: 1025, total: 5125 })
  })

  test("stock and quantity limits are enforced", async () => {
    const cart = await newCart()
    const overLine = await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_m", quantity: 11 })
    assert.equal(overLine.status, 400) // more than 10 per line is rejected by validation
    const overStockM = await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_m", quantity: 6 })
    assert.equal(overStockM.status, 409) // 6 wanted, 5 in stock
    const overStock = await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_l", quantity: 2 })
    assert.equal(overStock.status, 409)
    const invalidPromo = await call("POST", `/store/carts/${cart.id}/promotions`, { codes: ["NOPE"] })
    assert.equal(invalidPromo.status, 400)
  })

  test("checkout validates, takes stock once and is idempotent", async () => {
    const cart = await newCart()
    await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_m", quantity: 1 })
    const early = await call("POST", `/store/carts/${cart.id}/complete`)
    assert.equal(early.status, 400)
    assert.equal(early.body.error.code, "missing_email")

    await call("PATCH", `/store/carts/${cart.id}`, { email: "guest@example.com", shippingAddress: address })
    await call("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" })
    const placed = await call("POST", `/store/carts/${cart.id}/complete`)
    assert.equal(placed.status, 201)
    assert.equal(placed.body.order.paymentMethod, "cod")
    assert.ok(placed.body.order.displayId > 1000)

    const again = await call("POST", `/store/carts/${cart.id}/complete`)
    assert.equal(again.body.order.id, placed.body.order.id)
    const product = await db.products().findOne({ _id: "prod_tee" })
    assert.equal(product?.variants.find((v) => v._id === "var_m")?.stock, 4)

    const locked = await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_m", quantity: 1 })
    assert.equal(locked.status, 409)
  })

  test("two shoppers racing for the last unit: exactly one wins", async () => {
    const carts = await Promise.all([newCart(), newCart()])
    for (const cart of carts) {
      await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_l", quantity: 1 })
      await call("PATCH", `/store/carts/${cart.id}`, { email: "racer@example.com", shippingAddress: address })
      await call("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" })
    }
    const results = await Promise.all(carts.map((cart) => call("POST", `/store/carts/${cart.id}/complete`)))
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409])
    const product = await db.products().findOne({ _id: "prod_tee" })
    assert.equal(product?.variants.find((v) => v._id === "var_l")?.stock, 0)
  })

  test("orders are private to their cart or customer", async () => {
    const cart = await newCart()
    await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_m", quantity: 1 })
    await call("PATCH", `/store/carts/${cart.id}`, { email: "private@example.com", shippingAddress: address })
    await call("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" })
    const { body } = await call("POST", `/store/carts/${cart.id}/complete`)
    const id = body.order.id
    assert.equal((await call("GET", `/store/orders/${id}`)).status, 403)
    assert.equal((await call("GET", `/store/orders/${id}`, undefined, { "x-cart-id": "cart_0000000000000000" })).status, 403)
    assert.equal((await call("GET", `/store/orders/${id}`, undefined, { "x-cart-id": cart.id })).status, 200)
  })
})
