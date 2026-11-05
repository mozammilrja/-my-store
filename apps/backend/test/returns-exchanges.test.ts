import assert from "node:assert/strict"
import crypto from "node:crypto"
import { after, before, describe, test } from "node:test"
import { createProviderStub } from "./provider-stub.js"

/*
 * Returns and exchanges end to end over HTTP, with Razorpay and Shiprocket
 * as the local stand-in: what can be returned and for how much, partial and
 * repeat returns, self-ship, courier pickup driven by tracking webhooks,
 * warehouse inspection, refunds (instant, pending then settled, refused),
 * exchanges as zero-value replacement orders, cancellation, rejection,
 * legacy returns and who may see what.
 */
const stub = createProviderStub()
const stubUrl = await stub.start()
process.env.MONGODB_DB = "everwear_test_returns_exchanges"
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
const { db, ensureIndexes, migrateEmbeddedReturns } = await import("../src/db/schema.js")
const { issueToken } = await import("../src/lib/auth.js")
const { reconcileRefunds } = await import("../src/lib/payments/refunds.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())
type Json = Record<string, any>
const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const res = await request(path, { method, headers: { "content-type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: res.status, body: (await res.json().catch(() => null)) as Json }
}
const bearer = (t: string) => ({ authorization: `Bearer ${t}` })
const owner = bearer(issueToken("admin", "admin_owner"))
const sup = bearer(issueToken("warehouse", "whu_sup"))
const asha = bearer(issueToken("customer", "cus_asha"))
const other = bearer(issueToken("customer", "cus_other"))
const hook = (body: Json) => call("POST", "/store/webhooks/courier-tracking", body, { "x-api-key": "stub-tracking-token" })

const address = { firstName: "Asha", lastName: "Nair", address1: "21 Church Street", city: "Bengaluru", postalCode: "560001", province: "Karnataka", countryCode: "in", phone: "+91 9886099999" }

/** A paid (Razorpay) order, delivered: the starting point of every return here. */
async function deliveredOrder(lines: { variantId: string; quantity: number }[], promo?: string) {
  const cart = (await call("POST", "/store/carts", { country: "in" }, asha)).body.cart
  for (const l of lines) assert.equal((await call("POST", `/store/carts/${cart.id}/items`, l, asha)).status, 200)
  await call("PATCH", `/store/carts/${cart.id}`, { email: "asha@example.com", shippingAddress: address, billingAddress: address }, asha)
  await call("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" }, asha)
  if (promo) assert.equal((await call("POST", `/store/carts/${cart.id}/promotions`, { codes: [promo] }, asha)).status, 200)
  const intent = (await call("POST", `/store/carts/${cart.id}/payment-intent`, { provider: "razorpay" }, asha)).body
  const p = stub.pay(intent.razorpayOrderId)
  const signature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${intent.razorpayOrderId}|${p.id}`).digest("hex")
  const placed = await call("POST", `/store/carts/${cart.id}/confirm-payment`, { provider: "razorpay", razorpayOrderId: intent.razorpayOrderId, razorpayPaymentId: p.id, razorpaySignature: signature }, asha)
  assert.equal(placed.status, 201, JSON.stringify(placed.body))
  const id = placed.body.order.id as string
  // Delivered by the courier a few days ago (the delivery itself is covered elsewhere).
  await db.orders().updateOne({ _id: id }, { $set: { fulfillmentStatus: "delivered", "shipment.deliveredAt": new Date(Date.now() - 3 * 86_400_000) } })
  return (await db.orders().findOne({ _id: id }))!
}

const options = async (orderId: string) => (await call("GET", `/store/customers/me/orders/${orderId}/return-options`, undefined, asha)).body
const file = (body: Json, who = asha) => call("POST", "/store/customers/me/returns", body, who)
const act = (id: string, action: string, body: Json = {}) => call("POST", `/admin/returns/${id}/${action}`, body, owner)
const inspect = (id: string, lines: Json[]) => call("POST", `/warehouse/returns/${id}/inspect`, { warehouseId: "wh_blr", lines }, sup)
const mine = async (id: string) => (await call("GET", `/store/customers/me/returns/${id}`, undefined, asha)).body.return

before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()
  const now = new Date()
  await db.regions().insertOne({ _id: "reg_in", name: "India", currency: "inr", countries: [{ code: "in", name: "India" }], taxRate: 12, taxInclusive: true, shippingOptions: [{ _id: "so_std", name: "Standard Delivery", amount: 9900 }], policies: { returnWindowDays: 15, freeReturns: true, shippingRate: 0, handlingDays: { min: 1, max: 2 }, transitDays: { min: 2, max: 5 } }, createdAt: now, updatedAt: now } as never)
  const v = (id: string, size: string, price: number, stock: number) => ({ _id: id, sku: `EW-KUR-${size}`, title: size, options: { Size: size }, prices: { inr: price }, manageInventory: true, allowBackorder: false, stock })
  await db.products().insertMany([
    { _id: "prod_kurta", handle: "kurta", title: "Linen Kurta", status: "published", images: [], categoryIds: [], collectionId: null, tags: [], options: [{ title: "Size", values: ["S", "M", "L", "XL"] }], variants: [v("var_s", "S", 200000, 0), v("var_m", "M", 200000, 0), v("var_l", "L", 200000, 0), v("var_xl", "XL", 240000, 5)], createdAt: now, updatedAt: now },
    { _id: "prod_scarf", handle: "scarf", title: "Silk Scarf", status: "published", images: [], categoryIds: [], collectionId: null, tags: [], options: [{ title: "Size", values: ["One"] }], variants: [{ _id: "var_scarf", sku: "EW-SCF", title: "One", options: { Size: "One" }, prices: { inr: 100000 }, manageInventory: true, allowBackorder: false, stock: 20 }], createdAt: now, updatedAt: now },
  ] as never)
  await db.promotions().insertOne({ _id: "promo_10", code: "TEN", type: "percentage", value: 10, active: true, usageLimit: null, usageCount: 0, createdAt: now, updatedAt: now } as never)
  await db.adminUsers().insertOne({ _id: "admin_owner", email: "owner@example.com", passwordHash: "x", role: "owner", createdAt: now, updatedAt: now } as never)
  await db.customers().insertMany([
    { _id: "cus_asha", email: "asha@example.com", addresses: [], createdAt: now, updatedAt: now },
    { _id: "cus_other", email: "other@example.com", addresses: [], createdAt: now, updatedAt: now },
  ])
  await db.warehouses().deleteMany({})
  await db.warehouses().insertOne({ _id: "wh_blr", code: "BLR-FC1", name: "Bengaluru FC", city: "Bengaluru", state: "Karnataka", pincode: "560068", address: "Hosur Road", status: "active", isDefault: true, createdAt: now, updatedAt: now } as never)
  await db.warehouseUsers().insertOne({ _id: "whu_sup", email: "sup@example.com", passwordHash: "x", name: "Sup", role: "supervisor", warehouseIds: ["wh_blr"], status: "active", createdAt: now, updatedAt: now } as never)
  await db.settings().insertOne({ _id: "store", storeName: "Everwear", lowStockThreshold: 3, seller: { phone: "+91 8000000000", email: "ops@example.com" }, updatedAt: now } as never)
  // Kurtas are stocked in the warehouse: M and L for sale, S sold out.
  for (const [variantId, qty] of [["var_m", 6], ["var_l", 1]] as const) {
    assert.equal((await call("POST", "/warehouse/stock/operations", { type: "receive", warehouseId: "wh_blr", variantId, quantity: qty }, sup)).status, 201)
  }
})

after(async () => {
  await getDb().dropDatabase()
  await close()
  await disconnect()
  await stub.close()
})

describe("what can be returned, and for how much", () => {
  test("refunds are each line's share of what was paid, discount spread, delivery kept", async () => {
    const order = await deliveredOrder([{ variantId: "var_m", quantity: 2 }, { variantId: "var_scarf", quantity: 1 }], "TEN")
    const o = await options(order._id)
    assert.equal(o.windowDays, 15)
    const kurta = o.items.find((i: Json) => i.productTitle === "Linen Kurta")
    const scarf = o.items.find((i: Json) => i.productTitle === "Silk Scarf")
    const goods = order.totals.total - order.totals.shippingTotal
    assert.equal(kurta.refundPerUnit, Math.floor((200000 * goods) / order.totals.itemSubtotal))
    assert.ok(kurta.refundPerUnit < 200000, "the 10% discount isn't refunded")
    assert.ok(kurta.refundPerUnit * 2 + scarf.refundPerUnit <= goods, "never more than was paid for the goods")
    // Exchange: other sizes of the same price that are in stock (L), not the sold-out S or the dearer XL.
    assert.deepEqual(kurta.exchangeFor.map((x: Json) => x.title), ["L"])
    assert.deepEqual(scarf.exchangeFor, [])
  })

  test("a partial return, then another for what's left, never more than bought", async () => {
    const order = await deliveredOrder([{ variantId: "var_scarf", quantity: 3 }])
    const itemId = order.items[0]!._id
    const first = await file({ orderId: order._id, type: "return", method: "self_ship", items: [{ itemId, quantity: 2, reason: "quality" }] })
    assert.equal(first.status, 201, JSON.stringify(first.body))
    assert.equal(first.body.return.code, `RET-${order.displayId}-1`)
    assert.equal((await file({ orderId: order._id, type: "return", method: "self_ship", items: [{ itemId, quantity: 1, reason: "quality" }] })).body.error.code, "return_exists", "one open at a time")
    assert.equal((await call("POST", `/store/customers/me/returns/${first.body.return.id}/cancel`, {}, asha)).status, 200)
    // Cancelled returns don't count; a rejected one doesn't either.
    const again = await file({ orderId: order._id, type: "return", method: "self_ship", items: [{ itemId, quantity: 3, reason: "other", note: "Gift duplicates" }] })
    assert.equal(again.status, 201)
    assert.equal((await act(again.body.return.id, "reject", { note: "Outside policy for gifts" })).status, 200)
    const third = await file({ orderId: order._id, type: "return", method: "self_ship", items: [{ itemId, quantity: 4, reason: "quality" }] })
    assert.equal(third.status, 400, "can't return more than bought")
    assert.equal((await file({ orderId: order._id, type: "return", method: "self_ship", items: [{ itemId, quantity: 1, reason: "other" }] })).status, 400, "other needs a note")
  })

  test("an exchange must name an available size at the same price", async () => {
    const order = await deliveredOrder([{ variantId: "var_m", quantity: 1 }])
    const itemId = order.items[0]!._id
    for (const v of ["var_s", "var_xl", undefined]) {
      const res = await file({ orderId: order._id, type: "exchange", method: "pickup", items: [{ itemId, quantity: 1, reason: "too_small", ...(v ? { exchangeVariantId: v } : {}) }] })
      assert.equal(res.body.error.code, "exchange_unavailable", String(v))
    }
  })
})

describe("self-ship return, inspected and refunded", () => {
  let id = ""
  let order: Json

  test("approved, the customer adds the AWB, the warehouse finds it by that AWB", async () => {
    order = await deliveredOrder([{ variantId: "var_m", quantity: 2 }], "TEN")
    const ret = await file({ orderId: order._id, type: "return", method: "self_ship", items: [{ itemId: order.items[0]._id, quantity: 1, reason: "too_large", note: "Fits loose" }] })
    id = ret.body.return.id
    assert.equal(ret.body.return.canAddShipping, false, "not before approval")
    assert.equal((await call("POST", `/store/customers/me/returns/${id}/ship`, { carrier: "India Post", awb: "EZ123456789IN" }, asha)).status, 409)
    assert.equal((await act(id, "approve")).status, 200)
    assert.equal((await call("POST", `/store/customers/me/returns/${id}/ship`, { carrier: "India Post", awb: "EZ123456789IN" }, other)).status, 404, "another customer can't touch it")
    const shipped = await call("POST", `/store/customers/me/returns/${id}/ship`, { carrier: "India Post", awb: "ez123456789in" }, asha)
    assert.equal(shipped.body.return.status, "in_transit")
    assert.equal(shipped.body.return.canCancel, false)
    const found = await call("GET", "/warehouse/returns/lookup?awb=EZ123456789IN", undefined, sup)
    assert.equal(found.body.return.returnId, id)
    assert.equal(found.body.return.reason, "Too large: Fits loose")
  })

  test("inspection restocks; the refund is capped at the line's paid share", async () => {
    const before = (await db.stockLevels().findOne({ warehouseId: "wh_blr", variantId: "var_m" }))!.available
    const insp = await inspect(id, [{ itemId: order.items[0]._id, quantity: 1, condition: "sellable" }])
    assert.equal(insp.status, 200, JSON.stringify(insp.body))
    assert.equal((await db.stockLevels().findOne({ warehouseId: "wh_blr", variantId: "var_m" }))!.available, before + 1)
    const ret = (await db.returns().findOne({ _id: id }))!
    assert.equal((await act(id, "refund", { amount: ret.refundableAmount + 1 })).body.error.code, "refund_ceiling_exceeded")
    assert.equal((await act(id, "exchange")).body.error.code, "not_exchange")
    const refund = await act(id, "refund")
    assert.equal(refund.status, 200, JSON.stringify(refund.body))
    assert.equal(refund.body.return.status, "refunded")
    assert.equal(refund.body.refund.amount, ret.refundableAmount)
    assert.ok(refund.body.creditNoteNumber)
    const o = (await db.orders().findOne({ _id: order._id }))!
    assert.equal(o.paymentStatus, "partially_refunded")
    assert.equal(o.fulfillmentStatus, "delivered", "one of two units came back")
    const view = await mine(id)
    assert.deepEqual(view.timeline.map((t: Json) => t.status), ["requested", "approved", "in_transit", "received", "inspected", "refunded"])
    assert.equal(view.refund.status, "processed")
    const notices = await db.notifications().find({ recipientId: "cus_asha", "metadata.returnId": id }).toArray()
    assert.ok(notices.some((n) => n.type === "refund_processed"))
  })
})

describe("courier pickup exchange", () => {
  let id = ""
  let order: Json
  let awb = ""

  test("the pickup is booked, the customer can still cancel until it's collected", async () => {
    order = await deliveredOrder([{ variantId: "var_m", quantity: 1 }])
    const ret = await file({ orderId: order._id, type: "exchange", method: "pickup", items: [{ itemId: order.items[0]._id, quantity: 1, reason: "too_small", exchangeVariantId: "var_l" }] })
    assert.equal(ret.status, 201, JSON.stringify(ret.body))
    id = ret.body.return.id
    assert.equal(ret.body.return.items[0].exchangeFor, "L")
    await act(id, "approve")
    const pickup = await act(id, "pickup")
    assert.equal(pickup.status, 200, JSON.stringify(pickup.body))
    assert.equal(pickup.body.return.status, "pickup_scheduled")
    assert.equal(pickup.body.shipment.returnId, id)
    awb = (await call("POST", `/admin/shipments/${pickup.body.shipment._id}/assign-courier`, {}, owner)).body.shipment.awb
    assert.ok(awb)
    assert.equal((await mine(id)).canCancel, true)
  })

  test("courier scans move it: picked up is in transit, delivered is received", async () => {
    await hook({ awb, shipment_status_id: 42, shipment_status: "PICKED UP", scans: [{ date: "2026-11-06 10:00:00", activity: "Picked up from customer", location: "Bengaluru", "sr-status": 42 }] })
    assert.equal((await db.returns().findOne({ _id: id }))!.status, "in_transit")
    assert.equal((await call("POST", `/store/customers/me/returns/${id}/cancel`, {}, asha)).status, 409, "too late to cancel")
    await hook({ awb, shipment_status_id: 7, shipment_status: "DELIVERED", scans: [{ date: "2026-11-07 15:00:00", activity: "Delivered to warehouse", location: "Bengaluru", "sr-status": 7 }] })
    assert.equal((await db.returns().findOne({ _id: id }))!.status, "received")
    const view = await mine(id)
    assert.equal(view.pickup.awb, awb)
    assert.ok(view.pickup.events.length >= 2)
  })

  test("inspected, then exchanged: a zero-value replacement order, stock reserved, not itself returnable", async () => {
    await inspect(id, [{ itemId: order.items[0]._id, quantity: 1, condition: "sellable" }])
    const lBefore = (await db.products().findOne({ _id: "prod_kurta" }))!.variants.find((v) => v._id === "var_l")!.stock
    const ex = await act(id, "exchange", { note: "Swap to L" })
    assert.equal(ex.status, 200, JSON.stringify(ex.body))
    assert.equal(ex.body.return.status, "exchanged")
    const replacement = (await db.orders().findOne({ _id: ex.body.exchangeOrder.id }))!
    assert.equal(replacement.totals.total, 0)
    assert.equal(replacement.paymentStatus, "paid")
    assert.equal(replacement.items[0]!.variantId, "var_l")
    assert.deepEqual(replacement.exchangeOf, { orderId: order._id, displayId: order.displayId, returnId: id })
    assert.equal((await db.products().findOne({ _id: "prod_kurta" }))!.variants.find((v) => v._id === "var_l")!.stock, lBefore - 1)
    const f = await db.fulfilments().findOne({ orderId: replacement._id })
    assert.equal(f?.warehouseId, "wh_blr", "allocated to a warehouse like any order")
    assert.equal(f?.lines[0]?.reserved, true)
    assert.equal((await db.orders().findOne({ _id: order._id }))!.fulfillmentStatus, "returned")
    await db.orders().updateOne({ _id: replacement._id }, { $set: { fulfillmentStatus: "delivered", "shipment.deliveredAt": new Date() } })
    assert.equal((await options(replacement._id)).error?.code ?? (await call("GET", `/store/customers/me/orders/${replacement._id}/return-options`, undefined, asha)).body.error.code, "not_returnable")
    assert.equal((await mine(id)).exchangeOrder.displayId, replacement.displayId)
  })

  test("an exchange with no stock left is refused, and it can be refunded instead", async () => {
    // The only L was used by the exchange above.
    const o = await deliveredOrder([{ variantId: "var_m", quantity: 1 }])
    await db.products().updateOne({ _id: "prod_kurta", "variants._id": "var_l" }, { $set: { "variants.$.stock": 1 } })
    const ret = (await file({ orderId: o._id, type: "exchange", method: "self_ship", items: [{ itemId: o.items[0]._id, quantity: 1, reason: "too_small", exchangeVariantId: "var_l" }] })).body.return
    await db.products().updateOne({ _id: "prod_kurta", "variants._id": "var_l" }, { $set: { "variants.$.stock": 0 } })
    await act(ret.id, "approve")
    await call("POST", `/store/customers/me/returns/${ret.id}/ship`, { carrier: "DTDC", awb: "D1234567" }, asha)
    await inspect(ret.id, [{ itemId: o.items[0]._id, quantity: 1, condition: "sellable" }])
    const ex = await act(ret.id, "exchange")
    assert.equal(ex.status, 409)
    assert.equal(ex.body.error.code, "out_of_stock")
    assert.equal((await db.returns().findOne({ _id: ret.id }))!.status, "inspected", "nothing half done")
    assert.equal((await act(ret.id, "refund")).body.return.status, "refunded")
  })
})

describe("refund outcomes and rejection", () => {
  const ready = async () => {
    const o = await deliveredOrder([{ variantId: "var_scarf", quantity: 1 }])
    const ret = (await file({ orderId: o._id, type: "return", method: "self_ship", items: [{ itemId: o.items[0]._id, quantity: 1, reason: "changed_mind" }] })).body.return
    await act(ret.id, "approve")
    await call("POST", `/store/customers/me/returns/${ret.id}/ship`, { carrier: "DTDC", awb: `D${Date.now()}` }, asha)
    await inspect(ret.id, [{ itemId: o.items[0]._id, quantity: 1, condition: "sellable" }])
    return ret.id as string
  }

  test("a refund Razorpay settles later: pending, then refunded on reconciliation", async () => {
    const id = await ready()
    stub.state.refundMode = "pending"
    try {
      const r = await act(id, "refund")
      assert.equal(r.body.return.status, "refund_pending")
      assert.equal((await mine(id)).refund.status, "pending")
    } finally {
      stub.state.refundMode = "ok"
    }
    for (const r of stub.state.refunds.values()) r.status = "processed"
    await db.refunds().updateMany({}, { $set: { updatedAt: new Date(Date.now() - 5 * 60_000) } })
    await reconcileRefunds()
    assert.equal((await db.returns().findOne({ _id: id }))!.status, "refunded")
  })

  test("a refund Razorpay refuses leaves the return to be resolved again", async () => {
    const id = await ready()
    stub.state.refundMode = "reject"
    try {
      assert.equal((await act(id, "refund")).status, 400)
    } finally {
      stub.state.refundMode = "ok"
    }
    assert.equal((await db.returns().findOne({ _id: id }))!.status, "inspected")
  })

  test("rejected after inspection, with the reason shown to the customer", async () => {
    const id = await ready()
    assert.equal((await act(id, "reject")).status, 400, "needs a reason")
    const r = await act(id, "reject", { note: "Worn and washed; tags removed" })
    assert.equal(r.body.return.status, "rejected")
    assert.equal((await mine(id)).rejectionReason, "Worn and washed; tags removed")
  })
})

describe("compatibility and access", () => {
  test("a return written onto the order by older code becomes a return record", async () => {
    const o = await deliveredOrder([{ variantId: "var_scarf", quantity: 1 }])
    await db.orders().updateOne({ _id: o._id }, { $set: { returnRequest: { status: "approved", reason: "Old flow", items: [{ itemId: o.items[0]._id, quantity: 1 }], requestedAt: new Date(), updatedAt: new Date() } } })
    await migrateEmbeddedReturns()
    const ret = (await db.returns().findOne({ orderId: o._id }))!
    assert.equal(ret.status, "approved")
    assert.equal(ret.refundableAmount, o.items[0]!.unitPrice)
    assert.equal((await db.orders().findOne({ _id: o._id }))!.returnRequest?.returnId, ret._id)
    assert.equal((await file({ orderId: o._id, type: "return", method: "self_ship", items: [{ itemId: o.items[0]._id, quantity: 1, reason: "quality" }] })).body.error.code, "return_exists")
  })

  test("customers see only their own returns", async () => {
    const theirs = (await call("GET", "/store/customers/me/returns", undefined, other)).body.returns
    assert.equal(theirs.length, 0)
    const mineList = (await call("GET", "/store/customers/me/returns", undefined, asha)).body.returns
    assert.ok(mineList.length >= 5)
    assert.equal((await call("GET", `/store/customers/me/returns/${mineList[0].id}`, undefined, other)).status, 404)
    assert.equal((await call("GET", "/store/customers/me/returns")).status, 401)
  })

  test("only the owner acts on returns from the admin", async () => {
    await db.adminUsers().insertOne({ _id: "admin_staff", email: "staff@example.com", passwordHash: "x", role: "staff", createdAt: new Date(), updatedAt: new Date() } as never)
    const r = await db.returns().findOne({ status: "requested" })
    const any = r ?? (await db.returns().findOne({}))!
    assert.equal((await call("POST", `/admin/returns/${any._id}/approve`, {}, bearer(issueToken("admin", "admin_staff")))).status, 403)
    assert.equal((await call("GET", "/admin/returns", undefined, owner)).body.returns.length > 0, true)
  })
})
