import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"

// Isolated database; set before the app reads its settings.
process.env.MONGODB_DB = "everwear_test_tracking"
process.env.NODE_ENV = "test"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
type OrderDoc = import("../src/db/schema.js").OrderDoc
type ShipmentDoc = import("../src/db/schema.js").ShipmentDoc
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())
const getOrder = async (id: string, cartId: string) => {
  const res = await request(`/store/orders/${id}`, { headers: { "x-cart-id": cartId } })
  return { status: res.status, body: (await res.json()) as Record<string, any> }
}

const address = {
  firstName: "Test",
  lastName: "Shopper",
  address1: "12 MG Road",
  city: "Bengaluru",
  postalCode: "560001",
  countryCode: "in",
}

const order = (n: number, extra: Partial<OrderDoc> = {}): OrderDoc => {
  const now = new Date("2026-11-04T09:00:00Z")
  return {
    _id: `order_${String(n).padStart(16, "0")}`,
    displayId: 1000 + n,
    cartId: `cart_${String(n).padStart(16, "0")}`,
    regionId: "reg_in",
    currency: "inr",
    email: "track@example.com",
    items: [
      { _id: "li1", productId: "p1", variantId: "var_aaaaaa", productTitle: "Hoodie", productHandle: "hoodie", variantTitle: "S", quantity: 1, unitPrice: 279000 },
    ],
    shippingAddress: address,
    billingAddress: address,
    shippingOption: { _id: "so_std", name: "Standard", amount: 0 },
    promoCodes: [],
    totals: { itemSubtotal: 279000, discountTotal: 0, shippingTotal: 0, taxTotal: 33480, total: 312480 },
    paymentMethod: "cod",
    paymentStatus: "awaiting",
    fulfillmentStatus: "unfulfilled",
    status: "pending",
    createdAt: now,
    updatedAt: now,
    ...extra,
  }
}

const shipment = (o: OrderDoc, extra: Partial<ShipmentDoc> = {}): ShipmentDoc => ({
  _id: `ship_${o.displayId}`,
  orderId: o._id,
  displayId: o.displayId,
  carrier: "delhivery",
  awb: `DLV${o.displayId}`,
  status: "in_transit",
  // Stored out of order on purpose: the API must return them oldest first.
  trackingEvents: [
    { timestamp: new Date("2026-11-05T08:30:00Z"), status: "In transit", location: "Delhi Gateway", note: "Arrived at hub" },
    { timestamp: new Date("2026-11-04T14:00:00Z"), status: "Manifested", location: "Bengaluru Central Hub", note: "Label generated" },
  ],
  isReturn: false,
  customer: { name: "Test Shopper", city: "Bengaluru", postalCode: "560001" },
  itemsCount: 1,
  createdAt: new Date("2026-11-04T14:00:00Z"),
  updatedAt: new Date("2026-11-05T08:30:00Z"),
  ...extra,
})

before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()
})

after(async () => {
  await close()
  await getDb().dropDatabase()
  await disconnect()
})

describe("store order tracking events", () => {
  test("an unshipped order has no shipment and so no events", async () => {
    const o = order(1)
    await db.orders().insertOne(o)
    const { status, body } = await getOrder(o._id, o.cartId)
    assert.equal(status, 200)
    assert.equal(body.order.shipment, undefined)
  })

  test("a shipped order carries its shipment's scans, oldest first, and nothing else", async () => {
    const o = order(2, {
      fulfillmentStatus: "shipped",
      shipment: { carrier: "delhivery", awb: "DLV1002", status: "in_transit", shippedAt: new Date("2026-11-04T14:00:00Z") },
    })
    await db.orders().insertOne(o)
    await db.shipments().insertOne(shipment(o))
    // A return shipment for the same order must not leak into the outbound timeline.
    await db.shipments().insertOne(
      shipment(o, {
        _id: "ship_return",
        awb: "RET1002",
        isReturn: true,
        trackingEvents: [{ timestamp: new Date("2026-11-06T10:00:00Z"), status: "Return pickup", location: "Bengaluru", note: "" }],
      })
    )

    const { status, body } = await getOrder(o._id, o.cartId)
    assert.equal(status, 200)
    const s = body.order.shipment
    assert.equal(s.awb, "DLV1002")
    assert.equal(s.shippedAt, "2026-11-04T14:00:00.000Z")
    assert.deepEqual(s.events, [
      { timestamp: "2026-11-04T14:00:00.000Z", status: "Manifested", location: "Bengaluru Central Hub", note: "Label generated" },
      { timestamp: "2026-11-05T08:30:00.000Z", status: "In transit", location: "Delhi Gateway", note: "Arrived at hub" },
    ])
  })

  test("a shipment summary with no shipment record gives an empty timeline, not invented scans", async () => {
    const o = order(3, { fulfillmentStatus: "shipped", shipment: { carrier: "custom", awb: "CUST-1003", status: "manifested" } })
    await db.orders().insertOne(o)
    const { body } = await getOrder(o._id, o.cartId)
    assert.deepEqual(body.order.shipment.events, [])
  })

  test("events stay private: another cart cannot read them", async () => {
    const { status } = await getOrder(order(2)._id, "cart_9999999999999999")
    assert.equal(status, 403)
  })

  test("payment capture time and gateway reference are exposed only when they exist", async () => {
    const cod = await getOrder(order(1)._id, order(1).cartId)
    assert.equal(cod.body.order.paidAt, undefined)
    assert.equal(cod.body.order.paymentReference, undefined)

    const o = order(4, {
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      paymentDetails: { provider: "razorpay", razorpayPaymentId: "pay_test123", paidAt: new Date("2026-11-04T09:05:00Z") },
    })
    await db.orders().insertOne(o)
    const { body } = await getOrder(o._id, o.cartId)
    assert.equal(body.order.paidAt, "2026-11-04T09:05:00.000Z")
    assert.equal(body.order.paymentReference, "pay_test123")
  })
})

describe("invoice dispatch warehouse", () => {
  const invoiceFor = async (o: OrderDoc) => {
    await db.invoices().insertOne({
      _id: `inv_${o.displayId}`,
      invoiceNumber: `INV-2026-${o.displayId}`,
      orderId: o._id,
      displayId: o.displayId,
      customerName: "Test Shopper",
      shippingAddress: address,
      billingAddress: address,
      items: [],
      subtotal: 0,
      cgstTotal: 0,
      sgstTotal: 0,
      igstTotal: 0,
      grandTotal: 0,
      currency: "inr",
      status: "issued",
      issuedAt: new Date(),
    })
    const res = await request(`/store/orders/${o._id}/invoice`, { headers: { "x-cart-id": o.cartId } })
    assert.equal(res.status, 200)
    return ((await res.json()) as Record<string, any>).invoice
  }

  test("the hub the order's stock left from, when recorded", async () => {
    const o = order(10)
    await db.orders().insertOne(o)
    await db.inventoryMovements().insertOne({
      _id: "mov_10",
      sku: "SKU-aaaaaa",
      variantId: "var_aaaaaa",
      hubId: "DEL-FC1",
      type: "outbound",
      quantity: 1,
      referenceType: "order",
      referenceId: o._id,
      balanceAfter: 0,
      createdAt: new Date(),
    })
    await db.warehouses().updateOne({ code: "DEL-FC1" }, { $set: { gstin: "06AABCE1234F1ZW" } })
    const inv = await invoiceFor(o)
    assert.equal(inv.dispatchFrom.code, "DEL-FC1")
    assert.equal(inv.dispatchFrom.gstin, "06AABCE1234F1ZW")
    assert.equal(inv.dispatchFrom.lat, null, "no location invented for a warehouse without one")
    assert.equal(inv.dispatchFrom.state, "Haryana")
    assert.equal(inv.dispatchFrom.isDefault, false)
    assert.equal(inv.dispatchFrom.source, "allocated")
  })

  test("falls back to the default warehouse, then to null when there is none", async () => {
    const o = order(11)
    await db.orders().insertOne(o)
    const inv = await invoiceFor(o)
    const def = await db.warehouses().findOne({ isDefault: true, status: "active" })
    assert.equal(inv.dispatchFrom.code, def!.code)
    assert.equal(inv.dispatchFrom.isDefault, true)
    assert.equal(inv.dispatchFrom.source, "default")
    assert.equal(inv.dispatchFrom.gstin, def!.gstin ?? null, "no GSTIN is invented for a warehouse without one")

    await db.warehouses().deleteMany({})
    const o2 = order(12)
    await db.orders().insertOne(o2)
    assert.equal((await invoiceFor(o2)).dispatchFrom, null)
  })
})

describe("doorstep delivery preferences", () => {
  const patch = (id: string, body: unknown, cartId?: string) =>
    request(`/store/orders/${id}/delivery-preferences`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...(cartId ? { "x-cart-id": cartId } : {}) },
      body: JSON.stringify(body),
    })

  test("the order's owner can pick a slot and options; they come back on the order", async () => {
    const o = order(20)
    await db.orders().insertOne(o)
    let { body } = await getOrder(o._id, o.cartId)
    assert.equal(body.order.deliveryPreferences, undefined)
    assert.equal(body.order.preferencesEditable, true)

    const res = await patch(o._id, { slot: "evening", options: { measuringTape: true } }, o.cartId)
    assert.equal(res.status, 200)
    ;({ body } = await getOrder(o._id, o.cartId))
    assert.equal(body.order.deliveryPreferences.slot, "evening")
    assert.deepEqual(body.order.deliveryPreferences.options, { measuringTape: true, reusableBox: false })

    // Options not sent keep their stored value.
    assert.equal((await patch(o._id, { slot: null, options: { reusableBox: true } }, o.cartId)).status, 200)
    ;({ body } = await getOrder(o._id, o.cartId))
    assert.equal(body.order.deliveryPreferences.slot, null)
    assert.deepEqual(body.order.deliveryPreferences.options, { measuringTape: true, reusableBox: true })
  })

  test("strangers are refused and bad input is a 400", async () => {
    const o = order(21)
    await db.orders().insertOne(o)
    assert.equal((await patch(o._id, { slot: "morning" })).status, 403)
    assert.equal((await patch(o._id, { slot: "morning" }, "cart_9999999999999999")).status, 403)
    assert.equal((await patch(o._id, { slot: "midnight" }, o.cartId)).status, 400)
    assert.equal((await patch(o._id, { slot: "morning", options: { champagne: true } }, o.cartId)).status, 400)
    assert.equal((await db.orders().findOne({ _id: o._id }))?.deliveryPreferences, undefined)
  })

  test("once shipped or canceled the preferences are locked (409)", async () => {
    const shipped = order(22, { fulfillmentStatus: "shipped", shipment: { carrier: "delhivery", awb: "DLV1022", status: "manifested" } })
    const canceled = order(23, { status: "canceled" })
    await db.orders().insertMany([shipped, canceled])
    for (const o of [shipped, canceled]) {
      const res = await patch(o._id, { slot: "morning" }, o.cartId)
      assert.equal(res.status, 409)
      assert.equal(((await res.json()) as any).error.code, "order_not_editable")
      assert.equal((await getOrder(o._id, o.cartId)).body.order.preferencesEditable, false)
    }
  })

  test("the order payload names the warehouse it ships from", async () => {
    const o = order(24)
    await db.orders().insertOne(o)
    const { body } = await getOrder(o._id, o.cartId)
    // Warehouses were removed by an earlier test in this file: none to name.
    assert.equal(body.order.dispatchFrom, null)
  })
})
