import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { createProviderStub } from "./provider-stub.js"

/*
 * Delhivery direct, next to Shiprocket: quotes from both compared, booking
 * with Delhivery (waybill at creation, COD amount, weight in grams, seller
 * GSTIN), label, one pickup request per building and day, tracking by poll
 * and by scan push (NDR, re-attempt, delivery), cancellation, a reverse
 * pickup for a return, and the status mapping itself. Both providers are the
 * local stand-in in ./provider-stub.ts, with the request and response shapes
 * from their API docs.
 */
const stub = createProviderStub()
const stubUrl = await stub.start()
process.env.MONGODB_DB = "everwear_test_delhivery"
process.env.NODE_ENV = "test"
process.env.SHIPPING_PROVIDER = "delhivery"
process.env.SHIPROCKET_EMAIL = "ops@example.com"
process.env.SHIPROCKET_PASSWORD = "stub-password"
process.env.SHIPROCKET_PICKUP_LOCATION = "Primary"
process.env.SHIPROCKET_API_BASE = stubUrl
process.env.DELHIVERY_API_TOKEN = "dlv_stub_token"
process.env.DELHIVERY_PICKUP_LOCATION = "EVERWEAR BLR"
process.env.DELHIVERY_WEBHOOK_TOKEN = "dlv-push-token"
process.env.DELHIVERY_API_BASE = stubUrl
process.env.SHIPPING_ORIGIN_PINCODE = "560001"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { issueToken } = await import("../src/lib/auth.js")
const { mapDelhiveryStatus } = await import("../src/lib/shipping/status.js")
const { schedulePickups, syncStaleShipments } = await import("../src/lib/shipping/service.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())
type Json = Record<string, any>
const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const res = await request(path, { method, headers: { "content-type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: res.status, body: (await res.json().catch(() => null)) as Json }
}
const owner = { authorization: `Bearer ${issueToken("admin", "admin_owner")}` }
const push = (body: unknown, token = "dlv-push-token") => call("POST", "/store/webhooks/courier-tracking/dlv", body, { authorization: `Bearer ${token}` })

const address = (postalCode = "560038") => ({ firstName: "Aarav", lastName: "Sharma", address1: "100 Feet Road, Indiranagar", city: "Bengaluru", postalCode, province: "Karnataka", countryCode: "in", phone: "+91 9886012345" })

async function codOrder(postalCode?: string) {
  const cart = (await call("POST", "/store/carts", { country: "in" })).body.cart
  await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_m", quantity: 1 })
  await call("PATCH", `/store/carts/${cart.id}`, { email: "aarav@example.com", shippingAddress: address(postalCode), billingAddress: address(postalCode) })
  await call("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" })
  const placed = await call("POST", `/store/carts/${cart.id}/complete`)
  assert.equal(placed.status, 201, JSON.stringify(placed.body))
  return placed.body.order.id as string
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
    taxInclusive: true,
    shippingOptions: [{ _id: "so_std", name: "Standard Delivery", amount: 0 }],
    createdAt: now,
    updatedAt: now,
  } as never)
  await db.products().insertOne({
    _id: "prod_shirt",
    handle: "linen-shirt",
    title: "Linen Shirt",
    status: "published",
    images: [],
    categoryIds: [],
    collectionId: null,
    tags: [],
    weight: 700,
    options: [{ title: "Size", values: ["M"] }],
    variants: [{ _id: "var_m", title: "M", options: { Size: "M" }, prices: { inr: 249000 }, manageInventory: true, allowBackorder: false, stock: 100 }],
    createdAt: now,
    updatedAt: now,
  } as never)
  await db.adminUsers().insertOne({ _id: "admin_owner", email: "owner@example.com", passwordHash: "x", role: "owner", createdAt: now, updatedAt: now } as never)
  await db.warehouses().deleteMany({})
  await db.warehouses().insertOne({
    _id: "wh_1",
    code: "BLR-FC1",
    name: "Bengaluru FC",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    address: "12 MG Road",
    gstin: "29AAGCB7383J1Z4",
    status: "active",
    isDefault: true,
    delhiveryPickupLocation: "EVERWEAR BLR FC1",
    createdAt: now,
    updatedAt: now,
  } as never)
  await db.settings().insertOne({ _id: "store", storeName: "Everwear", lowStockThreshold: 3, seller: { legalName: "Everwear Retail Pvt Ltd", address: "12 MG Road, Bengaluru", phone: "+91 8000000000", email: "ops@example.com" }, updatedAt: now } as never)
})

after(async () => {
  await getDb().dropDatabase()
  await close()
  await disconnect()
  await stub.close()
})

describe("Delhivery status mapping", () => {
  test("forward, NDR, RTO, reverse and cancelled statuses map; unknown wording leaves the status alone", () => {
    assert.equal(mapDelhiveryStatus("UD", "Manifested"), "shipment_created")
    assert.equal(mapDelhiveryStatus("UD", "Not Picked"), "pickup_scheduled")
    assert.equal(mapDelhiveryStatus("UD", "In Transit"), "in_transit")
    assert.equal(mapDelhiveryStatus("UD", "Pending"), "in_transit")
    assert.equal(mapDelhiveryStatus("UD", "Dispatched"), "out_for_delivery")
    assert.equal(mapDelhiveryStatus("UD", "Pending", "EOD-11"), "delivery_failed", "an end-of-day NDR code is a failed attempt")
    assert.equal(mapDelhiveryStatus("DL", "Delivered"), "delivered")
    assert.equal(mapDelhiveryStatus("RT", "In Transit"), "rto_in_transit")
    assert.equal(mapDelhiveryStatus("DL", "RTO"), "rto_delivered")
    assert.equal(mapDelhiveryStatus("PP", "Scheduled"), "pickup_scheduled")
    assert.equal(mapDelhiveryStatus("PU", "In Transit"), "in_transit")
    assert.equal(mapDelhiveryStatus("DL", "DTO"), "delivered", "a reverse pickup delivered back to the warehouse")
    assert.equal(mapDelhiveryStatus("CN", "Canceled"), "cancelled")
    assert.equal(mapDelhiveryStatus("UD", "Something new"), null)
  })
})

describe("Delhivery direct with Shiprocket alongside", () => {
  let orderId = ""
  let shipmentId = ""
  let awb = ""

  before(async () => {
    orderId = await codOrder()
  })

  test("quotes from both integrations, cheapest first; COD and Express only where Delhivery offers them", async () => {
    const q = await call("GET", `/admin/orders/${orderId}/couriers`, undefined, owner)
    assert.equal(q.status, 200, JSON.stringify(q.body))
    const names = q.body.couriers.map((c: Json) => `${c.provider}:${c.name}`).sort()
    assert.deepEqual(names, ["delhivery:Delhivery Express", "delhivery:Delhivery Surface", "shiprocket:Blue Dart Air", "shiprocket:Delhivery Surface"])
    const rates = q.body.couriers.map((c: Json) => c.rate)
    assert.deepEqual(rates, [...rates].sort((a: number, b: number) => a - b), "cheapest first")
    const surface = q.body.couriers.find((c: Json) => c.provider === "delhivery" && c.courierId === 1)
    // 58 base + 12 per 500 g (0.5 kg default) + 35 COD = ₹105, in paise.
    assert.equal(surface.rate, 10500)
    assert.deepEqual(q.body.recommended, { provider: "delhivery", courierId: 1 }, "the default integration's cheapest leads")

    stub.state.dlv.noCod.add("560038")
    const noCod = await call("GET", `/admin/orders/${orderId}/couriers`, undefined, owner)
    assert.ok(noCod.body.couriers.every((c: Json) => c.provider === "shiprocket"), "Delhivery left out where it doesn't collect cash")
    stub.state.dlv.noCod.delete("560038")
    stub.state.dlv.noExpress = true
    const noExpress = await call("GET", `/admin/orders/${orderId}/couriers`, undefined, owner)
    assert.ok(!noExpress.body.couriers.some((c: Json) => c.name === "Delhivery Express"))
    stub.state.dlv.noExpress = false

    const shopper = await call("GET", "/store/shipping/serviceability?pincode=560038&cod=true")
    assert.equal(shopper.body.serviceable, true)
    assert.equal(shopper.body.codAvailable, true)
  })

  test("booking with Delhivery Express: waybill at once, COD amount, weight in grams, the warehouse's Delhivery name and GSTIN", async () => {
    const booked = await call("POST", `/admin/orders/${orderId}/shipments`, { carrier: "delhivery", courierId: 2 }, owner)
    assert.equal(booked.status, 201, JSON.stringify(booked.body))
    const s = booked.body.shipment
    shipmentId = s._id
    awb = s.awb
    assert.equal(s.provider, "delhivery")
    assert.equal(s.carrier, "Delhivery Express")
    assert.equal(s.status, "shipment_created")
    assert.match(awb, /^\d{13}$/)
    const sent = stub.state.dlv.shipments.get(awb)!
    assert.equal(sent.payment_mode, "COD")
    assert.equal(sent.cod_amount, "2490")
    assert.equal(sent.shipping_mode, "Express")
    assert.equal(sent.weight, "700", "product weight in grams")
    assert.equal(sent.pickup, "EVERWEAR BLR FC1")
    assert.equal(sent.seller_gst_tin, "29AAGCB7383J1Z4")
    assert.equal((await db.orders().findOne({ _id: orderId }))?.shipment?.awb, awb)
    assert.equal((await call("POST", `/admin/orders/${orderId}/shipments`, { carrier: "delhivery" }, owner)).status, 409, "one live parcel per order")
    assert.equal((await call("POST", `/admin/shipments/${shipmentId}/assign-courier`, {}, owner)).status, 409, "Delhivery already gave the AWB")
  })

  test("label and pickup; a second parcel the same day joins the existing pickup", async () => {
    const label = await call("POST", `/admin/shipments/${shipmentId}/label`, {}, owner)
    assert.equal(label.body.shipment.labelUrl, `https://dlv-labels.example/${awb}.pdf`)
    const pickup = await call("POST", `/admin/shipments/${shipmentId}/pickup`, {}, owner)
    assert.equal(pickup.status, 200, JSON.stringify(pickup.body))
    assert.equal(pickup.body.shipment.status, "pickup_scheduled")
    assert.equal(stub.state.dlv.pickups.length, 1)
    assert.equal(stub.state.dlv.pickups[0]!.pickup_location, "EVERWEAR BLR FC1")

    const other = await codOrder()
    const second = (await call("POST", `/admin/orders/${other}/shipments`, { carrier: "delhivery" }, owner)).body.shipment
    assert.equal(second.carrier, "Delhivery Surface")
    const again = await call("POST", `/admin/shipments/${second._id}/pickup`, {}, owner)
    assert.equal(again.status, 200, "Delhivery's 'already exists' for today counts as booked")
    assert.equal(stub.state.dlv.pickups.length, 1)
  })

  test("a manifest's parcels go in one pickup request per building, sized to the count", async () => {
    const before = stub.state.dlv.pickups.length
    stub.state.dlv.pickups.length = 0 // a new day at the hub
    const ids: string[] = []
    for (let i = 0; i < 2; i++) ids.push((await call("POST", `/admin/orders/${await codOrder()}/shipments`, { carrier: "delhivery" }, owner)).body.shipment._id)
    await schedulePickups(ids)
    assert.equal(stub.state.dlv.pickups.length, 1)
    assert.equal(stub.state.dlv.pickups[0]!.expected_package_count, 2)
    for (const id of ids) assert.equal((await db.shipments().findOne({ _id: id }))?.status, "pickup_scheduled")
    assert.ok(before >= 1)
  })

  test("tracking: polled scans and pushed scans move the parcel forward once; NDR, re-attempt, delivery", async () => {
    assert.equal((await push(stub.dlvScan(awb, { Status: "In Transit", StatusType: "UD", at: "2026-11-06T09:00:00" }), "wrong")).status, 401)
    stub.dlvScan(awb, { Status: "In Transit", StatusType: "UD", at: "2026-11-06T09:00:00", instructions: "Shipment picked up" })
    await call("POST", `/admin/shipments/${shipmentId}/sync`, {}, owner)
    let s = (await db.shipments().findOne({ _id: shipmentId }))!
    assert.equal(s.status, "in_transit")
    assert.equal((await db.orders().findOne({ _id: orderId }))?.fulfillmentStatus, "shipped")
    assert.equal(s.estimatedDelivery?.toISOString(), new Date("2026-11-10T23:59:59+05:30").toISOString(), "Delhivery's IST date read as IST")

    const ofd = stub.dlvScan(awb, { Status: "Dispatched", StatusType: "UD", at: "2026-11-07T08:30:00", instructions: "Out for delivery" })
    assert.equal((await push(ofd)).status, 200)
    const dup = await push(ofd)
    assert.equal(dup.body.duplicate, true, "the same push is applied once")
    s = (await db.shipments().findOne({ _id: shipmentId }))!
    assert.equal(s.status, "out_for_delivery")

    await push(stub.dlvScan(awb, { Status: "Pending", StatusType: "UD", at: "2026-11-07T19:10:00", instructions: "Consignee unavailable", code: "EOD-11" }))
    s = (await db.shipments().findOne({ _id: shipmentId }))!
    assert.equal(s.status, "delivery_failed")
    assert.equal(s.ndr?.reason, "Consignee unavailable")

    const rto = await call("POST", `/admin/shipments/${shipmentId}/ndr`, { action: "return", comment: "Customer refused" }, owner)
    assert.equal(rto.status, 409)
    assert.equal(rto.body.error.code, "courier_unsupported")
    const re = await call("POST", `/admin/shipments/${shipmentId}/ndr`, { action: "reattempt", comment: "Customer home after 6 PM" }, owner)
    assert.equal(re.status, 200)
    assert.deepEqual(stub.state.dlv.reattempts, [awb])

    await push(stub.dlvScan(awb, { Status: "Dispatched", StatusType: "UD", at: "2026-11-08T09:00:00" }))
    await push(stub.dlvScan(awb, { Status: "Delivered", StatusType: "DL", at: "2026-11-08T12:40:00", instructions: "Delivered to consignee" }))
    await push(stub.dlvScan(awb, { Status: "In Transit", StatusType: "UD", at: "2026-11-06T10:00:00" })) // late scan
    s = (await db.shipments().findOne({ _id: shipmentId }))!
    assert.equal(s.status, "delivered")
    assert.equal(s.deliveredAt?.toISOString(), new Date("2026-11-08T12:40:00+05:30").toISOString())
    assert.equal((await db.orders().findOne({ _id: orderId }))?.fulfillmentStatus, "delivered")
    const events = await call("GET", "/admin/webhook-events?provider=delhivery", undefined, owner)
    assert.ok(events.body.events.length >= 4)
  })

  test("the tracking sweep polls Delhivery parcels it hasn't heard from", async () => {
    const id = (await call("POST", `/admin/orders/${await codOrder()}/shipments`, { carrier: "delhivery" }, owner)).body.shipment._id
    const s = (await db.shipments().findOne({ _id: id }))!
    stub.dlvScan(s.awb, { Status: "In Transit", StatusType: "UD", at: "2026-11-06T11:00:00" })
    await db.shipments().updateMany({ status: { $nin: ["delivered", "cancelled"] } }, { $set: { lastSyncedAt: new Date(Date.now() - 3600_000) } })
    assert.ok((await syncStaleShipments(50)) >= 1)
    assert.equal((await db.shipments().findOne({ _id: id }))?.status, "in_transit")
  })

  test("cancelling before pickup cancels the waybill; after pickup it's refused", async () => {
    const id = await codOrder()
    const s = (await call("POST", `/admin/orders/${id}/shipments`, { carrier: "delhivery" }, owner)).body.shipment
    const cancelled = await call("POST", `/admin/shipments/${s._id}/cancel`, {}, owner)
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body))
    assert.ok(stub.state.dlv.cancelled.has(s.awb))
    assert.equal((await db.orders().findOne({ _id: id }))?.fulfillmentStatus, "unfulfilled")
    const again = (await call("POST", `/admin/orders/${id}/shipments`, { carrier: "delhivery" }, owner)).body.shipment
    assert.notEqual(again.awb, s.awb, "a fresh waybill under a new reference")
    assert.equal(stub.state.dlv.shipments.get(again.awb)?.order.endsWith("-2"), true)
    await push(stub.dlvScan(again.awb, { Status: "In Transit", StatusType: "UD", at: "2026-11-06T12:00:00" }))
    assert.equal((await call("POST", `/admin/shipments/${again._id}/cancel`, {}, owner)).status, 409)
  })

  test("a refused booking says why and leaves the order free to book again", async () => {
    const id = await codOrder()
    stub.state.dlv.failCreate = "Pincode is not serviceable for the payment mode"
    const refused = await call("POST", `/admin/orders/${id}/shipments`, { carrier: "delhivery" }, owner)
    assert.equal(refused.status, 400)
    assert.match(refused.body.error.message, /not serviceable for the payment mode/)
    assert.equal(await db.shipments().countDocuments({ orderId: id }), 0)
    assert.equal((await call("POST", `/admin/orders/${id}/shipments`, { carrier: "delhivery" }, owner)).status, 201)
  })

  test("Shiprocket still books when asked for by name", async () => {
    const id = await codOrder()
    const s = await call("POST", `/admin/orders/${id}/shipments`, { carrier: "shiprocket" }, owner)
    assert.equal(s.status, 201)
    assert.equal(s.body.shipment.provider, "shiprocket")
    assert.equal(s.body.shipment.status, "ready_to_ship")
  })

  test("a return delivered by Delhivery is collected by Delhivery: a reverse pickup to the warehouse", async () => {
    const order = (await db.orders().findOne({ _id: orderId }))!
    await db.orders().updateOne(
      { _id: orderId },
      { $set: { returnRequest: { status: "requested", reason: "Size", items: [{ itemId: order.items[0]!._id, quantity: 1 }], requestedAt: new Date(), updatedAt: new Date() } } }
    )
    assert.equal((await call("POST", `/admin/orders/${orderId}/return-request`, { action: "approve", reason: "OK" }, owner)).status, 200)
    const pickup = await call("POST", `/admin/orders/${orderId}/return-request`, { action: "schedule_pickup", reason: "Book pickup" }, owner)
    assert.equal(pickup.status, 200, JSON.stringify(pickup.body))
    const r = pickup.body.shipment
    assert.equal(r.provider, "delhivery")
    assert.equal(r.isReturn, true)
    const sent = stub.state.dlv.shipments.get(r.awb)!
    assert.equal(sent.payment_mode, "Pickup")
    assert.equal(sent.pin, "560038", "collected from the customer's pincode")
    assert.equal(sent.pickup, "EVERWEAR BLR FC1", "delivered to the registered warehouse")
    await push(stub.dlvScan(r.awb, { Status: "In Transit", StatusType: "PU", at: "2026-11-12T10:00:00" }))
    await push(stub.dlvScan(r.awb, { Status: "DTO", StatusType: "DL", at: "2026-11-14T15:00:00" }))
    assert.equal((await db.shipments().findOne({ _id: r._id }))?.status, "delivered")
  })
})
