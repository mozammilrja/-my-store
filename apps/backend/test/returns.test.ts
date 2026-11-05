import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"

// Isolated database; set before the app reads its settings.
process.env.MONGODB_DB = "everwear_test_returns"
process.env.NODE_ENV = "test"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
type OrderDoc = import("../src/db/schema.js").OrderDoc
type RegionDoc = import("../src/db/schema.js").RegionDoc
const { issueToken } = await import("../src/lib/auth.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())
const CUSTOMER = "cus_returns000000001"
const token = issueToken("customer", CUSTOMER)

const fileReturn = async (orderId: string, body: unknown) => {
  const res = await request(`/store/customers/me/orders/${orderId}/returns`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: (await res.json()) as Record<string, any> }
}

const address = { firstName: "Test", lastName: "Shopper", address1: "12 MG Road", city: "Bengaluru", postalCode: "560001", countryCode: "in" }
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)

const order = (n: number, extra: Partial<OrderDoc> = {}): OrderDoc => {
  const now = new Date()
  return {
    _id: `order_${String(n).padStart(16, "0")}`,
    displayId: 2000 + n,
    cartId: `cart_${String(n).padStart(16, "0")}`,
    customerId: CUSTOMER,
    regionId: "reg_in",
    currency: "inr",
    email: "returns@example.com",
    items: [
      { _id: "li1", productId: "p1", variantId: "var_aaaaaa", productTitle: "Hoodie", productHandle: "hoodie", variantTitle: "S", quantity: 2, unitPrice: 100000 },
      { _id: "li2", productId: "p2", variantId: "var_bbbbbb", productTitle: "Shirt", productHandle: "shirt", variantTitle: "M", quantity: 1, unitPrice: 50000 },
    ],
    shippingAddress: address,
    billingAddress: address,
    shippingOption: { _id: "so_std", name: "Standard", amount: 0 },
    promoCodes: [],
    totals: { itemSubtotal: 250000, discountTotal: 0, shippingTotal: 0, taxTotal: 0, total: 250000 },
    paymentMethod: "cod",
    paymentStatus: "paid",
    fulfillmentStatus: "delivered",
    status: "completed",
    shipment: { carrier: "delhivery", awb: `DLV${n}`, status: "delivered", deliveredAt: daysAgo(2) } as OrderDoc["shipment"],
    createdAt: now,
    updatedAt: now,
    ...extra,
  }
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
    taxRate: 0,
    taxInclusive: true,
    policies: { returnWindowDays: 7, freeReturns: true, shippingRate: 0, handlingDays: { min: 1, max: 2 }, transitDays: { min: 2, max: 4 } },
    shippingOptions: [],
    createdAt: now,
    updatedAt: now,
  } as RegionDoc)
  await db.orders().insertMany([
    order(1),
    order(2, { fulfillmentStatus: "shipped", shipment: undefined }),
    order(3, { status: "canceled" }),
    order(4, { shipment: { carrier: "delhivery", awb: "DLV4", status: "delivered", deliveredAt: daysAgo(10) } as OrderDoc["shipment"] }),
    order(5),
    order(6),
  ])
})

after(async () => {
  await getDb().dropDatabase()
  await close()
  await disconnect()
})

describe("customer return requests", () => {
  test("records the chosen lines and quantities", async () => {
    const res = await fileReturn(order(1)._id, { reason: "Refund: Size is too large", items: [{ itemId: "li1", quantity: 1 }] })
    assert.equal(res.status, 201)
    const saved = await db.orders().findOne({ _id: order(1)._id })
    assert.equal(saved?.returnRequest?.status, "requested")
    assert.deepEqual(saved?.returnRequest?.items, [{ itemId: "li1", quantity: 1 }])
  })

  test("refuses a second request while one is open", async () => {
    const res = await fileReturn(order(1)._id, { reason: "Again" })
    assert.equal(res.status, 409)
    assert.equal(res.body.error.code, "return_exists")
  })

  test("refuses orders that are not delivered, canceled, or past the window", async () => {
    for (const [n, code] of [[2, "not_returnable"], [3, "not_returnable"], [4, "return_window_closed"]] as const) {
      const res = await fileReturn(order(n)._id, { reason: "Size" })
      assert.equal(res.status, 400, `order ${n}`)
      assert.equal(res.body.error.code, code, `order ${n}`)
    }
  })

  test("refuses lines not on the order or more than was bought", async () => {
    assert.equal((await fileReturn(order(5)._id, { reason: "Size", items: [{ itemId: "nope", quantity: 1 }] })).status, 400)
    assert.equal((await fileReturn(order(5)._id, { reason: "Size", items: [{ itemId: "li2", quantity: 2 }] })).status, 400)
    assert.equal((await fileReturn(order(5)._id, { reason: "Size", items: [] })).status, 400)
  })

  test("with no lines given, returns the whole order", async () => {
    assert.equal((await fileReturn(order(6)._id, { reason: "Other" })).status, 201)
    const saved = await db.orders().findOne({ _id: order(6)._id })
    assert.deepEqual(saved?.returnRequest?.items, [
      { itemId: "li1", quantity: 2 },
      { itemId: "li2", quantity: 1 },
    ])
  })
})
