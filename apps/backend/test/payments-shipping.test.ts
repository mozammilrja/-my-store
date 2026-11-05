import assert from "node:assert/strict"
import crypto from "node:crypto"
import { after, before, describe, test } from "node:test"
import { createProviderStub } from "./provider-stub.js"

/*
 * Razorpay and Shiprocket flows end to end through the API, against a local
 * stand-in for both providers (./provider-stub.ts). Settings are fixed before
 * the app reads its environment.
 */
const stub = createProviderStub()
const stubUrl = await stub.start()
process.env.MONGODB_DB = "everwear_test_payments_shipping"
process.env.NODE_ENV = "test"
process.env.RAZORPAY_KEY_ID = "rzp_test_stubkey"
process.env.RAZORPAY_KEY_SECRET = "stub_key_secret_for_tests_only"
process.env.RAZORPAY_WEBHOOK_SECRET = "stub_webhook_secret"
process.env.RAZORPAY_API_BASE = stubUrl
process.env.SHIPPING_PROVIDER = "shiprocket"
process.env.SHIPROCKET_EMAIL = "ops@example.com"
process.env.SHIPROCKET_PASSWORD = "stub-password"
process.env.SHIPROCKET_PICKUP_LOCATION = "Primary"
process.env.SHIPROCKET_WEBHOOK_TOKEN = "stub-tracking-token"
process.env.SHIPROCKET_API_BASE = stubUrl
process.env.SHIPPING_ORIGIN_PINCODE = "560001"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { issueToken, hashPassword } = await import("../src/lib/auth.js")
const { reconcilePaymentAttempts } = await import("../src/lib/payments/settle.js")
const { reconcileRefunds } = await import("../src/lib/payments/refunds.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())
const ownerToken = issueToken("admin", "admin_owner")
const staffToken = issueToken("admin", "admin_staff")

type Json = Record<string, any>
const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const res = await request(path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  })
  return { status: res.status, body: (await res.json().catch(() => null)) as Json }
}
const owner = { authorization: `Bearer ${ownerToken}` }
const staff = { authorization: `Bearer ${staffToken}` }

const address = {
  firstName: "Aarav",
  lastName: "Sharma",
  address1: "100 Feet Road, Indiranagar",
  city: "Bengaluru",
  postalCode: "560038",
  province: "Karnataka",
  countryCode: "in",
  phone: "+91 9886012345",
}

/** A cart ready to pay: one shirt, address, standard delivery. */
async function readyCart(quantity = 1) {
  const cart = (await call("POST", "/store/carts", { country: "in" })).body.cart
  await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_m", quantity })
  await call("PATCH", `/store/carts/${cart.id}`, { email: "aarav@example.com", shippingAddress: address, billingAddress: address })
  await call("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" })
  return cart.id as string
}

const sign = (orderId: string, paymentId: string) =>
  crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex")

const webhook = async (event: Json, eventId: string, secret = process.env.RAZORPAY_WEBHOOK_SECRET!) => {
  const raw = JSON.stringify(event)
  const signature = crypto.createHmac("sha256", secret).update(raw).digest("hex")
  return call("POST", "/store/webhooks/razorpay", raw, { "x-razorpay-signature": signature, "x-razorpay-event-id": eventId })
}

const capturedEvent = (p: { id: string; order_id: string; amount: number }) => ({
  event: "payment.captured",
  payload: { payment: { entity: { ...p, currency: "INR", status: "captured" } } },
})

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
    taxInclusive: true,
    shippingOptions: [{ _id: "so_std", name: "Standard Delivery", amount: 0 }],
    createdAt: now,
    updatedAt: now,
  })
  await db.products().insertOne({
    _id: "prod_shirt",
    handle: "linen-shirt",
    title: "Linen Shirt",
    status: "published",
    images: [],
    categoryIds: [],
    collectionId: null,
    tags: [],
    options: [{ title: "Size", values: ["M"] }],
    variants: [{ _id: "var_m", title: "M", options: { Size: "M" }, prices: { inr: 249000 }, manageInventory: true, allowBackorder: false, stock: 100 }],
    createdAt: now,
    updatedAt: now,
  } as never)
  const passwordHash = await hashPassword("owner-password-1")
  await db.adminUsers().insertMany([
    { _id: "admin_owner", email: "owner@example.com", passwordHash, role: "owner", createdAt: now, updatedAt: now },
    { _id: "admin_staff", email: "staff@example.com", passwordHash, role: "staff", createdAt: now, updatedAt: now },
  ] as never)
  await db.warehouses().deleteMany({})
  await db.warehouses().insertOne({
    _id: "wh_1",
    code: "BLR-FC1",
    name: "Bengaluru FC",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    address: "12 MG Road",
    status: "active",
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  } as never)
  await db.settings().insertOne({ _id: "store", storeName: "Everwear", lowStockThreshold: 3, seller: { phone: "+91 8000000000", email: "ops@example.com" }, updatedAt: now } as never)
})

after(async () => {
  await getDb().dropDatabase()
  await close()
  await disconnect()
  await stub.close()
})

describe("Razorpay payments", () => {
  test("intent creates one Razorpay order for the exact total and reuses it", async () => {
    const cartId = await readyCart()
    const a = await call("POST", `/store/carts/${cartId}/payment-intent`, { provider: "razorpay" })
    const b = await call("POST", `/store/carts/${cartId}/payment-intent`, { provider: "razorpay" })
    assert.equal(a.status, 200)
    assert.equal(a.body.amount, 249000)
    assert.equal(a.body.keyId, "rzp_test_stubkey")
    assert.equal(b.body.razorpayOrderId, a.body.razorpayOrderId, "a second Pay click reuses the open order")
    assert.equal(JSON.stringify(a.body).includes("stub_key_secret"), false, "the key secret never reaches the browser")
  })

  test("successful payment places one paid order; confirming again returns the same order", async () => {
    const cartId = await readyCart()
    const intent = (await call("POST", `/store/carts/${cartId}/payment-intent`, { provider: "razorpay" })).body
    const p = stub.pay(intent.razorpayOrderId)
    const body = { provider: "razorpay", razorpayOrderId: intent.razorpayOrderId, razorpayPaymentId: p.id, razorpaySignature: sign(intent.razorpayOrderId, p.id) }
    const first = await call("POST", `/store/carts/${cartId}/confirm-payment`, body)
    assert.equal(first.status, 201)
    assert.equal(first.body.order.paymentStatus, "paid")
    const again = await call("POST", `/store/carts/${cartId}/confirm-payment`, body)
    assert.equal(again.body.order.id, first.body.order.id)
    assert.equal(await db.orders().countDocuments({ cartId }), 1)
    const attempt = await db.paymentAttempts().findOne({ providerOrderId: intent.razorpayOrderId })
    assert.equal(attempt?.status, "paid")
    assert.equal(attempt?.orderId, first.body.order.id)
  })

  test("an authorized payment is captured through Razorpay before the order is placed", async () => {
    const cartId = await readyCart()
    const intent = (await call("POST", `/store/carts/${cartId}/payment-intent`, { provider: "razorpay" })).body
    const p = stub.pay(intent.razorpayOrderId, { status: "authorized" })
    const res = await call("POST", `/store/carts/${cartId}/confirm-payment`, {
      provider: "razorpay",
      razorpayOrderId: intent.razorpayOrderId,
      razorpayPaymentId: p.id,
      razorpaySignature: sign(intent.razorpayOrderId, p.id),
    })
    assert.equal(res.status, 201)
    assert.equal(stub.state.payments.get(p.id)?.status, "captured")
  })

  test("invalid signature and a payment from another order are both refused", async () => {
    const cartId = await readyCart()
    const intent = (await call("POST", `/store/carts/${cartId}/payment-intent`, { provider: "razorpay" })).body
    const p = stub.pay(intent.razorpayOrderId)
    const bad = await call("POST", `/store/carts/${cartId}/confirm-payment`, { provider: "razorpay", razorpayOrderId: intent.razorpayOrderId, razorpayPaymentId: p.id, razorpaySignature: "0".repeat(64) })
    assert.equal(bad.status, 400)
    assert.equal(bad.body.error.code, "invalid_signature")

    // A real, correctly signed payment for a cheaper cart can't pay this one.
    const other = await readyCart()
    const otherIntent = (await call("POST", `/store/carts/${other}/payment-intent`, { provider: "razorpay" })).body
    const cheap = stub.pay(otherIntent.razorpayOrderId)
    const swapped = await call("POST", `/store/carts/${cartId}/confirm-payment`, {
      provider: "razorpay",
      razorpayOrderId: otherIntent.razorpayOrderId,
      razorpayPaymentId: cheap.id,
      razorpaySignature: sign(otherIntent.razorpayOrderId, cheap.id),
    })
    assert.equal(swapped.status, 400)
    assert.equal(swapped.body.error.code, "payment_mismatch")
    assert.equal(await db.orders().countDocuments({ cartId }), 0)
  })

  test("a failed payment places no order and records the bank's reason", async () => {
    const cartId = await readyCart()
    const intent = (await call("POST", `/store/carts/${cartId}/payment-intent`, { provider: "razorpay" })).body
    const p = stub.pay(intent.razorpayOrderId, { status: "failed" })
    const res = await call("POST", `/store/carts/${cartId}/confirm-payment`, { provider: "razorpay", razorpayOrderId: intent.razorpayOrderId, razorpayPaymentId: p.id, razorpaySignature: sign(intent.razorpayOrderId, p.id) })
    assert.equal(res.status, 402)
    assert.equal(await db.orders().countDocuments({ cartId }), 0)
    assert.equal((await db.paymentAttempts().findOne({ providerOrderId: intent.razorpayOrderId }))?.failureReason, "Payment declined by bank")
  })

  test("if the bag changed during payment, the payment is refunded instead of kept", async () => {
    const cartId = await readyCart()
    const intent = (await call("POST", `/store/carts/${cartId}/payment-intent`, { provider: "razorpay" })).body
    const p = stub.pay(intent.razorpayOrderId)
    await call("POST", `/store/carts/${cartId}/items`, { variantId: "var_m", quantity: 1 }) // total doubles after paying
    const res = await call("POST", `/store/carts/${cartId}/confirm-payment`, { provider: "razorpay", razorpayOrderId: intent.razorpayOrderId, razorpayPaymentId: p.id, razorpaySignature: sign(intent.razorpayOrderId, p.id) })
    assert.equal(res.status, 409)
    assert.match(res.body.error.message, /refunded/)
    assert.equal(stub.state.payments.get(p.id)?.amount_refunded, p.amount)
    assert.equal((await db.paymentAttempts().findOne({ providerOrderId: intent.razorpayOrderId }))?.status, "refunded")
  })

  test("webhook: no secret match is refused; a captured payment the browser never confirmed still becomes an order, once", async () => {
    const cartId = await readyCart()
    const intent = (await call("POST", `/store/carts/${cartId}/payment-intent`, { provider: "razorpay" })).body
    const p = stub.pay(intent.razorpayOrderId)
    const event = capturedEvent(p)
    const forged = await webhook(event, "evt_forged", "not-the-secret")
    assert.equal(forged.status, 400)
    assert.equal(await db.orders().countDocuments({ cartId }), 0)

    // Ten concurrent redeliveries of the same event: one order, one event record.
    const results = await Promise.all(Array.from({ length: 10 }, () => webhook(event, "evt_delayed_1")))
    assert.ok(results.every((r) => r.status === 200 || r.status === 409), `statuses: ${results.map((r) => r.status)}`)
    await webhook(event, "evt_delayed_1") // settles any delivery that was told to retry
    assert.equal(await db.orders().countDocuments({ cartId }), 1)
    assert.equal((await db.orders().findOne({ cartId }))?.paymentStatus, "paid")
    assert.equal(await db.paymentWebhookEvents().countDocuments({ provider: "razorpay", eventId: "evt_delayed_1" }), 1)
    const dup = await webhook(event, "evt_delayed_1")
    assert.equal(dup.body.duplicate, true)
  })

  test("paying the same bag twice keeps one order and refunds the second charge", async () => {
    const cartId = await readyCart()
    const first = (await call("POST", `/store/carts/${cartId}/payment-intent`, { provider: "razorpay" })).body
    const p1 = stub.pay(first.razorpayOrderId)
    const p2 = stub.pay(first.razorpayOrderId) // shopper paid in two tabs
    await call("POST", `/store/carts/${cartId}/confirm-payment`, { provider: "razorpay", razorpayOrderId: first.razorpayOrderId, razorpayPaymentId: p1.id, razorpaySignature: sign(first.razorpayOrderId, p1.id) })
    const second = await webhook(capturedEvent(p2), "evt_double_2")
    assert.equal(second.status, 200)
    assert.equal(await db.orders().countDocuments({ cartId }), 1)
    assert.equal(stub.state.payments.get(p2.id)?.amount_refunded, p2.amount, "the second charge is refunded")
  })

  test("reconciliation settles a lost payment and expires unpaid attempts", async () => {
    const cartId = await readyCart()
    const intent = (await call("POST", `/store/carts/${cartId}/payment-intent`, { provider: "razorpay" })).body
    stub.pay(intent.razorpayOrderId)
    const stale = await readyCart()
    const staleIntent = (await call("POST", `/store/carts/${stale}/payment-intent`, { provider: "razorpay" })).body
    const old = new Date(Date.now() - 60 * 60_000)
    await db.paymentAttempts().updateMany({ providerOrderId: { $in: [intent.razorpayOrderId, staleIntent.razorpayOrderId] } }, { $set: { createdAt: old, expiresAt: old } })
    await reconcilePaymentAttempts()
    assert.equal((await db.orders().findOne({ cartId }))?.paymentStatus, "paid")
    assert.equal((await db.paymentAttempts().findOne({ providerOrderId: staleIntent.razorpayOrderId }))?.status, "expired")
  })
})

describe("Refunds", () => {
  let orderId = ""
  before(async () => {
    const cartId = await readyCart()
    const intent = (await call("POST", `/store/carts/${cartId}/payment-intent`, { provider: "razorpay" })).body
    const p = stub.pay(intent.razorpayOrderId)
    orderId = (await call("POST", `/store/carts/${cartId}/confirm-payment`, { provider: "razorpay", razorpayOrderId: intent.razorpayOrderId, razorpayPaymentId: p.id, razorpaySignature: sign(intent.razorpayOrderId, p.id) })).body.order.id
  })

  test("staff can't refund; an owner's partial then full refund go through Razorpay", async () => {
    assert.equal((await call("POST", `/admin/orders/${orderId}/refunds`, { amount: 1000, reason: "Goodwill" }, staff)).status, 403)
    const part = await call("POST", `/admin/orders/${orderId}/refunds`, { amount: 49000, reason: "Partial: damaged button" }, owner)
    assert.equal(part.status, 201)
    assert.match(part.body.refund.providerRefundId, /^rfnd_/)
    assert.equal((await db.orders().findOne({ _id: orderId }))?.paymentStatus, "partially_refunded")
    const rest = await call("POST", `/admin/orders/${orderId}/refunds`, { reason: "Rest of the order" }, owner)
    assert.equal(rest.body.refund.amount, 200000)
    assert.equal((await db.orders().findOne({ _id: orderId }))?.paymentStatus, "refunded")
    const over = await call("POST", `/admin/orders/${orderId}/refunds`, { amount: 100, reason: "Too much" }, owner)
    assert.equal(over.status, 409)
  })

  test("a rejected refund changes nothing; an unknown outcome is resolved by reconciliation", async () => {
    const cartId = await readyCart()
    const intent = (await call("POST", `/store/carts/${cartId}/payment-intent`, { provider: "razorpay" })).body
    const p = stub.pay(intent.razorpayOrderId)
    const id = (await call("POST", `/store/carts/${cartId}/confirm-payment`, { provider: "razorpay", razorpayOrderId: intent.razorpayOrderId, razorpayPaymentId: p.id, razorpaySignature: sign(intent.razorpayOrderId, p.id) })).body.order.id

    stub.state.refundMode = "reject"
    const rejected = await call("POST", `/admin/orders/${id}/refunds`, { amount: 1000, reason: "Test reject" }, owner)
    assert.equal(rejected.status, 400)
    assert.equal((await db.orders().findOne({ _id: id }))?.paymentStatus, "paid", "a refused refund isn't recorded as money returned")

    stub.state.refundMode = "timeout"
    const unknown = await call("POST", `/admin/orders/${id}/refunds`, { amount: 1000, reason: "Test timeout" }, owner)
    assert.equal(unknown.status, 201)
    assert.equal(unknown.body.refund.status, "requested")
    stub.state.refundMode = "ok"
    await db.refunds().updateMany({ orderId: id, status: "requested" }, { $set: { updatedAt: new Date(Date.now() - 5 * 60_000) } })
    await reconcileRefunds()
    // The stand-in never received it, so reconciliation marks it failed for a person to retry.
    assert.equal((await db.refunds().findOne({ orderId: id, reason: "Test timeout" }))?.status, "failed")
  })

  test("online payment status can't be set by hand", async () => {
    const res = await call("POST", `/admin/orders/${orderId}/status`, { paymentStatus: "refunded" }, owner)
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, "gateway_managed")
  })
})

describe("Shiprocket shipping", () => {
  let codOrderId = ""
  const tracking = async (body: Json, token = "stub-tracking-token") =>
    call("POST", "/store/webhooks/courier-tracking", body, { "x-api-key": token })

  before(async () => {
    const cartId = await readyCart()
    codOrderId = (await call("POST", `/store/carts/${cartId}/complete`)).body.order.id
  })

  test("serviceability: delivery window for a served pincode, not serviceable for an unserved one", async () => {
    const ok = await call("GET", "/store/shipping/serviceability?pincode=560038")
    assert.equal(ok.body.serviceable, true)
    assert.equal(ok.body.fastestDays, 2)
    stub.state.unserviceable.add("999999")
    const no = await call("GET", "/store/shipping/serviceability?pincode=999999")
    assert.equal(no.body.serviceable, false)
    const couriers = await call("GET", `/admin/orders/${codOrderId}/couriers`, undefined, staff)
    assert.equal(couriers.body.couriers[0].rate, 7950, "rates are converted to paise")
  })

  test("book, assign courier (AWB), label, pickup; a second booking is refused", async () => {
    const booked = await call("POST", `/admin/orders/${codOrderId}/shipments`, {}, owner)
    assert.equal(booked.status, 201)
    assert.equal(booked.body.shipment.status, "ready_to_ship")
    assert.equal((await call("POST", `/admin/orders/${codOrderId}/shipments`, {}, owner)).status, 409)
    const id = booked.body.shipment._id
    const assigned = await call("POST", `/admin/shipments/${id}/assign-courier`, { courierId: 10 }, owner)
    assert.match(assigned.body.shipment.awb, /^AWB/)
    assert.equal(assigned.body.shipment.carrier, "Delhivery Surface")
    const label = await call("POST", `/admin/shipments/${id}/label`, {}, owner)
    assert.match(label.body.shipment.labelUrl, /^https:\/\/labels\.example\//)
    const pickup = await call("POST", `/admin/shipments/${id}/pickup`, {}, owner)
    assert.equal(pickup.body.shipment.status, "pickup_scheduled")
    assert.equal(pickup.body.shipment.pickup.token, "PKT-77")
    const order = await db.orders().findOne({ _id: codOrderId })
    assert.equal(order?.shipment?.awb, assigned.body.shipment.awb)
  })

  test("tracking webhooks: bad token refused; scans move the parcel forward, duplicates and stale scans don't", async () => {
    const s = (await db.shipments().findOne({ orderId: codOrderId }))!
    assert.equal((await tracking({ awb: s.awb, shipment_status_id: 7 }, "wrong")).status, 401)

    const inTransit = { awb: s.awb, shipment_status: "IN TRANSIT", shipment_status_id: 18, scans: [{ date: "2026-11-07 14:00:00", activity: "Bag received at hub", location: "Bengaluru Hub", "sr-status": 18, "sr-status-label": "IN TRANSIT" }] }
    await tracking(inTransit)
    await tracking(inTransit)
    let shipment = (await db.shipments().findOne({ _id: s._id }))!
    assert.equal(shipment.status, "in_transit")
    assert.equal(shipment.trackingEvents.length, 1, "a redelivered webhook adds no duplicate scan")
    assert.equal((await db.orders().findOne({ _id: codOrderId }))?.fulfillmentStatus, "shipped")

    await tracking({ awb: s.awb, shipment_status: "DELIVERED", shipment_status_id: 7, scans: [{ date: "2026-11-08 11:00:00", activity: "Delivered to consignee", location: "Bengaluru", "sr-status": 7, "sr-status-label": "DELIVERED" }] })
    await tracking({ awb: s.awb, shipment_status: "IN TRANSIT", shipment_status_id: 18, scans: [] }) // late, out-of-order
    shipment = (await db.shipments().findOne({ _id: s._id }))!
    assert.equal(shipment.status, "delivered", "a late scan never moves a delivered parcel back")
    const order = await db.orders().findOne({ _id: codOrderId })
    assert.equal(order?.fulfillmentStatus, "delivered")
    assert.equal(order?.paymentStatus, "awaiting", "delivered COD is not paid until the cash is collected")
  })

  test("failed delivery raises an NDR that can be re-attempted; cancellation only before pickup", async () => {
    const cartId = await readyCart()
    const id = (await call("POST", `/store/carts/${cartId}/complete`)).body.order.id
    const booked = (await call("POST", `/admin/orders/${id}/shipments`, {}, owner)).body.shipment
    const withAwb = (await call("POST", `/admin/shipments/${booked._id}/assign-courier`, {}, owner)).body.shipment
    // Cancel before pickup: cancelled with Shiprocket, order free to ship again.
    const cancelled = await call("POST", `/admin/shipments/${booked._id}/cancel`, {}, owner)
    assert.equal(cancelled.body.shipment.status, "cancelled")
    assert.ok(stub.state.cancelled.has(booked.providerOrderId))
    assert.equal((await db.orders().findOne({ _id: id }))?.fulfillmentStatus, "unfulfilled")
    assert.equal(withAwb.status, "shipment_created")

    const again = (await call("POST", `/admin/orders/${id}/shipments`, {}, owner)).body.shipment
    const awb = (await call("POST", `/admin/shipments/${again._id}/assign-courier`, {}, owner)).body.shipment.awb
    await tracking({ awb, shipment_status: "PICKED UP", shipment_status_id: 42, scans: [] })
    assert.equal((await call("POST", `/admin/shipments/${again._id}/cancel`, {}, owner)).status, 409, "no cancelling once picked up")
    await tracking({ awb, shipment_status: "UNDELIVERED", shipment_status_id: 21, scans: [{ date: "2026-11-09 19:00:00", activity: "Customer not available", location: "Bengaluru", "sr-status": 21, "sr-status-label": "UNDELIVERED" }] })
    const failed = (await db.shipments().findOne({ _id: again._id }))!
    assert.equal(failed.status, "delivery_failed")
    assert.equal(failed.ndr?.reason, "Customer not available")
    const ndr = await call("POST", `/admin/shipments/${again._id}/ndr`, { action: "reattempt", comment: "Customer home after 6 PM" }, owner)
    assert.equal(ndr.status, 200)
    assert.deepEqual(stub.state.ndrActions.at(-1), { awb, action: "re-attempt" })
  })

  test("approved return books a real reverse pickup", async () => {
    await db.orders().updateOne(
      { _id: codOrderId },
      { $set: { returnRequest: { status: "requested", reason: "Size", items: [{ itemId: (await db.orders().findOne({ _id: codOrderId }))!.items[0]!._id, quantity: 1 }], requestedAt: new Date(), updatedAt: new Date() } } }
    )
    assert.equal((await call("POST", `/admin/orders/${codOrderId}/return-request`, { action: "approve", reason: "OK" }, owner)).status, 200)
    const pickup = await call("POST", `/admin/orders/${codOrderId}/return-request`, { action: "schedule_pickup", reason: "Book pickup" }, owner)
    assert.equal(pickup.status, 200)
    assert.equal(pickup.body.shipment.isReturn, true)
    assert.ok(pickup.body.shipment.providerShipmentId)
  })
})
