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
  address1: "12 MG Road",
  city: "Bengaluru",
  postalCode: "560001",
  countryCode: "in",
}

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
    taxRate: 12,
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
      { _id: "var_m", title: "M", options: { Size: "M" }, prices: { inr: 2000 }, manageInventory: true, allowBackorder: false, stock: 5 },
      { _id: "var_l", title: "L", options: { Size: "L" }, prices: { inr: 2000 }, manageInventory: true, allowBackorder: false, stock: 1 },
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

const newCart = async (headers: Record<string, string> = {}) => (await call("POST", "/store/carts", { country: "IN" }, headers)).body.cart

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
    // 4000 items - 400 discount + 500 shipping = 4100, +12% tax = 492
    assert.deepEqual(promo.body.cart.totals, { itemSubtotal: 4000, discountTotal: 400, shippingTotal: 500, taxTotal: 492, total: 4592 })
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

describe("business buyers (GSTIN)", () => {
  test("a GSTIN on the cart is validated, carried to the order and printed on the invoice", async () => {
    const cart = await newCart()
    await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_m", quantity: 1 })
    const bad = await call("PATCH", `/store/carts/${cart.id}`, { buyerGstin: { gstin: "12345", legalName: "Acme" } })
    assert.equal(bad.status, 400)

    const set = await call("PATCH", `/store/carts/${cart.id}`, {
      email: "buyer@example.com",
      shippingAddress: address,
      buyerGstin: { gstin: "29aabcu9603r1zm", legalName: "Acme Traders Pvt Ltd" },
    })
    assert.equal(set.status, 200)
    assert.deepEqual(set.body.cart.buyerGstin, { gstin: "29AABCU9603R1ZM", legalName: "Acme Traders Pvt Ltd" })

    await call("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" })
    const placed = await call("POST", `/store/carts/${cart.id}/complete`)
    assert.equal(placed.status, 201)
    assert.equal(placed.body.order.buyerGstin.gstin, "29AABCU9603R1ZM")

    const invoice = await call("GET", `/store/orders/${placed.body.order.id}/invoice`, undefined, { "x-cart-id": cart.id })
    assert.equal(invoice.status, 200)
    assert.equal(invoice.body.invoice.customerGstin, "29AABCU9603R1ZM")
    assert.equal(invoice.body.invoice.customerLegalName, "Acme Traders Pvt Ltd")
  })

  test("null removes the GSTIN again", async () => {
    const cart = await newCart()
    await call("PATCH", `/store/carts/${cart.id}`, { buyerGstin: { gstin: "29AABCU9603R1ZM", legalName: "Acme" } })
    const cleared = await call("PATCH", `/store/carts/${cart.id}`, { buyerGstin: null })
    assert.equal(cleared.status, 200)
    assert.equal(cleared.body.cart.buyerGstin, null)
  })
})

describe("default address", () => {
  test("making an address the default moves it to the front", async () => {
    const reg = await call("POST", "/store/auth/register", { email: "addr@example.com", password: "long-enough-1" })
    const auth = { authorization: `Bearer ${reg.body.token}` }
    await call("POST", "/store/customers/me/addresses", { ...address, address1: "1 First St" }, auth)
    const two = await call("POST", "/store/customers/me/addresses", { ...address, address1: "2 Second St" }, auth)
    const second = two.body.customer.addresses[1]
    const made = await call("POST", `/store/customers/me/addresses/${second.id}/default`, undefined, auth)
    assert.equal(made.status, 200)
    assert.deepEqual(made.body.customer.addresses.map((a: Json) => a.address1), ["2 Second St", "1 First St"])
    assert.equal((await call("POST", "/store/customers/me/addresses/addr_missing/default", undefined, auth)).status, 404)
    assert.equal((await call("POST", `/store/customers/me/addresses/${second.id}/default`)).status, 401)
  })
})

describe("delivery instructions", () => {
  test("a courier note is saved on the cart, copied to the order, and can be cleared", async () => {
    const cart = await newCart()
    await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_m", quantity: 1 })
    const long = await call("PATCH", `/store/carts/${cart.id}`, { deliveryInstructions: "x".repeat(301) })
    assert.equal(long.status, 400)
    const set = await call("PATCH", `/store/carts/${cart.id}`, { deliveryInstructions: "  Leave with the lobby concierge  " })
    assert.equal(set.body.cart.deliveryInstructions, "Leave with the lobby concierge")
    const cleared = await call("PATCH", `/store/carts/${cart.id}`, { deliveryInstructions: "" })
    assert.equal(cleared.body.cart.deliveryInstructions, null)

    await call("PATCH", `/store/carts/${cart.id}`, { email: "note@example.com", shippingAddress: address, deliveryInstructions: "Ring twice" })
    await call("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" })
    const placed = await call("POST", `/store/carts/${cart.id}/complete`)
    assert.equal(placed.status, 201)
    assert.equal(placed.body.order.deliveryInstructions, "Ring twice")
  })
})
