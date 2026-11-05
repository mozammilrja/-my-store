import assert from "node:assert/strict"
import { after, before, test } from "node:test"

/*
 * Logistics analytics against known records: every figure is checked against
 * what the seeded shipments, fulfilments, delivery tasks, remittances and
 * returns say, including the window edges and the definitions (delivered
 * rate over closed parcels, first attempt, on time by the promised IST day).
 */
process.env.MONGODB_DB = "everwear_test_logistics_analytics"
process.env.NODE_ENV = "test"
process.env.SHIPPING_PROVIDER = "none"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { issueToken } = await import("../src/lib/auth.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())
const owner = { authorization: `Bearer ${issueToken("admin", "admin_owner")}` }
const get = async (path: string) => {
  const res = await request(path, { headers: owner })
  return { status: res.status, body: (await res.json()) as Record<string, any> }
}

const at = (s: string) => new Date(s)
const ev = (status: string, internalStatus: string, when: string) => ({ timestamp: at(when), status, internalStatus, location: "", note: "" })
let n = 0
function shipment(o: Record<string, unknown>) {
  n++
  return {
    _id: `ship_${n}`,
    orderId: `ord_${n}`,
    displayId: 1000 + n,
    provider: "delhivery",
    carrier: "Delhivery Surface",
    awb: `AWB${n}`,
    status: "in_transit",
    items: [],
    parcel: { weightKg: 0.5, lengthCm: 30, breadthCm: 25, heightCm: 5 },
    trackingEvents: [],
    isReturn: false,
    active: true,
    customer: { name: "A", phone: "9", city: "Bengaluru", postalCode: "560038" },
    itemsCount: 1,
    createdAt: at("2026-10-10T06:00:00Z"),
    updatedAt: at("2026-10-10T06:00:00Z"),
    ...o,
  }
}

before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()
  await db.adminUsers().insertOne({ _id: "admin_owner", email: "o@example.com", passwordHash: "x", role: "owner", createdAt: new Date(), updatedAt: new Date() } as never)
  await db.warehouses().deleteMany({})
  await db.warehouses().insertMany([
    { _id: "wh_blr", code: "BLR-FC1", name: "Bengaluru FC", city: "Bengaluru", state: "KA", pincode: "560001", address: "x", status: "active", createdAt: new Date(), updatedAt: new Date() },
    { _id: "wh_sel", code: "SEL-0001", name: "Kavya Textiles", city: "Jaipur", state: "RJ", pincode: "302001", address: "x", status: "active", sellerId: "sel_1", createdAt: new Date(), updatedAt: new Date() },
  ] as never)
  await db.shipments().insertMany([
    // Delivered first time, a day before the promise: 2 days in transit.
    shipment({ status: "delivered", trackingEvents: [ev("Picked", "picked_up", "2026-10-10T08:00:00Z"), ev("Delivered", "delivered", "2026-10-12T08:00:00Z")], deliveredAt: at("2026-10-12T08:00:00Z"), estimatedDelivery: at("2026-10-13T12:00:00Z") }),
    // Delivered after a failed attempt, on the promised IST day late in the evening (still on time): 4 days.
    shipment({ status: "delivered", ndr: { reason: "Consignee unavailable", attempts: 1, updatedAt: new Date() }, trackingEvents: [ev("In Transit", "in_transit", "2026-10-10T08:00:00Z"), ev("Pending", "delivery_failed", "2026-10-13T13:00:00Z"), ev("Delivered", "delivered", "2026-10-14T17:00:00Z")], deliveredAt: at("2026-10-14T17:00:00Z"), estimatedDelivery: at("2026-10-14T06:00:00Z") }),
    // Late: delivered the day after the promise. 6 days.
    shipment({ status: "delivered", trackingEvents: [ev("Picked", "picked_up", "2026-10-10T08:00:00Z")], deliveredAt: at("2026-10-16T08:00:00Z"), estimatedDelivery: at("2026-10-15T06:00:00Z"), customer: { name: "B", phone: "9", city: "New Delhi", postalCode: "110003" } }),
    // Returned to origin after a refusal.
    shipment({ status: "rto_delivered", ndr: { reason: "Consignee refused", attempts: 2, updatedAt: new Date() }, customer: { name: "C", phone: "9", city: "New Delhi", postalCode: "110017" } }),
    // Still moving.
    shipment({ status: "in_transit" }),
    // Our fleet, delivered with no promise date.
    shipment({ provider: "own_fleet", carrier: "Everwear Fleet", status: "delivered", trackingEvents: [ev("Out", "out_for_delivery", "2026-10-11T04:00:00Z")], deliveredAt: at("2026-10-11T06:00:00Z") }),
    // Cancelled: counted on its own only.
    shipment({ status: "cancelled", active: false }),
    // Outside the window, and a return parcel: neither counts.
    shipment({ status: "delivered", createdAt: at("2026-08-01T00:00:00Z"), deliveredAt: at("2026-08-03T00:00:00Z") }),
    shipment({ isReturn: true, status: "delivered", deliveredAt: at("2026-10-12T00:00:00Z") }),
  ] as never)

  const ful = (o: Record<string, unknown>) => ({ orderId: `o_${o._id}`, displayId: 1, lines: [], paymentMethod: "cod", destination: {}, assignment: {}, rejectedBy: [], active: true, updatedAt: new Date(), ...o })
  await db.fulfilments().insertMany([
    ful({ _id: "f1", code: "F1", warehouseId: "wh_blr", warehouseCode: "BLR-FC1", status: "dispatched", createdAt: at("2026-10-10T00:00:00Z"), package: { packedAt: at("2026-10-10T04:00:00Z") }, handedOverAt: at("2026-10-10T10:00:00Z") }),
    ful({ _id: "f2", code: "F2", warehouseId: "wh_blr", warehouseCode: "BLR-FC1", status: "handed_over", createdAt: at("2026-10-11T00:00:00Z"), package: { packedAt: at("2026-10-11T08:00:00Z") }, handedOverAt: at("2026-10-12T06:00:00Z") }),
    ful({ _id: "f3", code: "F3", warehouseId: "wh_blr", warehouseCode: "BLR-FC1", status: "picking", createdAt: at("2026-10-12T00:00:00Z") }),
    ful({ _id: "f4", code: "F4", warehouseId: "wh_blr", warehouseCode: "BLR-FC1", status: "rejected", active: false, createdAt: at("2026-10-12T00:00:00Z") }),
    ful({ _id: "f5", code: "F5", warehouseId: "wh_sel", warehouseCode: "SEL-0001", status: "dispatched", createdAt: at("2026-10-12T00:00:00Z"), package: { packedAt: at("2026-10-12T02:00:00Z") }, dispatchedAt: at("2026-10-12T05:00:00Z") }),
  ] as never)

  await db.riders().insertMany([
    { _id: "rid_1", email: "r1@example.com", phone: "1", passwordHash: "x", name: "Imran", status: "approved", vehicle: { type: "bike" }, documents: [], warehouseId: "wh_blr", zoneIds: [], shifts: [], online: false, createdAt: new Date(), updatedAt: new Date() },
    { _id: "rid_2", email: "r2@example.com", phone: "2", passwordHash: "x", name: "Sana", status: "approved", vehicle: { type: "bike" }, documents: [], warehouseId: "wh_blr", zoneIds: [], shifts: [], online: false, createdAt: new Date(), updatedAt: new Date() },
  ] as never)
  const task = (o: Record<string, unknown>) => ({ shipmentId: `s_${o._id}`, fulfilmentId: `f_${o._id}`, orderId: `o_${o._id}`, displayId: 1, warehouseId: "wh_blr", zoneId: "z", declinedBy: [], stop: {}, attempts: [], earnings: [], cod: null, createdAt: at("2026-10-11T00:00:00Z"), updatedAt: new Date(), ...o })
  await db.deliveryTasks().insertMany([
    task({ _id: "t1", code: "EWF1", status: "delivered", riderId: "rid_1", cod: { due: 249000, currency: "inr", collected: 249000, remittanceId: "rem_1" } }),
    task({ _id: "t2", code: "EWF2", status: "delivered", riderId: "rid_1", attempts: [{ at: new Date(), reason: "customer_unavailable", riderId: "rid_1" }], cod: { due: 100000, currency: "inr", collected: 100000, remittanceId: null } }),
    task({ _id: "t3", code: "EWF3", status: "rto", riderId: "rid_2", attempts: [{ at: new Date(), reason: "customer_refused", riderId: "rid_2" }, { at: new Date(), reason: "customer_refused", riderId: "rid_2" }] }),
    task({ _id: "t4", code: "EWF4", status: "unassigned", riderId: null }),
  ] as never)
  await db.codRemittances().insertMany([
    { _id: "rem_1", code: "REM-1", riderId: "rid_1", taskIds: ["t1"], expected: 249000, declared: 249000, counted: 248000, status: "mismatch", submittedAt: at("2026-10-12T12:00:00Z") },
  ] as never)
  const ret = (o: Record<string, unknown>) => ({ orderId: `o_${o._id}`, displayId: 1, customerId: null, method: "pickup", refundableAmount: 1000, currency: "inr", updatedAt: new Date(), ...o })
  await db.returns().insertMany([
    ret({ _id: "r1", code: "RET-1", type: "return", status: "refunded", items: [{ itemId: "i", variantId: "v", productId: "p", productTitle: "T", variantTitle: "M", quantity: 2, reason: "too_small" }], requestedAt: at("2026-10-15T00:00:00Z"), resolution: { action: "refund", at: at("2026-10-19T00:00:00Z"), by: "a" } }),
    ret({ _id: "r2", code: "RET-2", type: "exchange", status: "requested", items: [{ itemId: "i", variantId: "v", productId: "p", productTitle: "T", variantTitle: "M", quantity: 1, reason: "too_small" }, { itemId: "j", variantId: "w", productId: "p", productTitle: "T", variantTitle: "L", quantity: 1, reason: "damaged" }], requestedAt: at("2026-10-16T00:00:00Z") }),
  ] as never)
})

after(async () => {
  await getDb().dropDatabase()
  await close()
  await disconnect()
})

test("couriers: delivered rate over closed parcels, first attempt, on time by the promised IST day, transit days", async () => {
  const r = await get("/admin/analytics/logistics?from=2026-10-01T00:00:00Z&to=2026-10-31T23:59:59Z")
  assert.equal(r.status, 200, JSON.stringify(r.body))
  const t = r.body.totals
  assert.equal(t.booked, 6)
  assert.equal(t.cancelled, 1)
  assert.equal(t.delivered, 4)
  assert.equal(t.returnedToOrigin, 1)
  assert.equal(t.inFlight, 1)
  assert.equal(t.deliveredRate, 80, "4 delivered of 5 closed")
  const dlv = r.body.carriers.find((c: any) => c.carrier === "Delhivery Surface")
  assert.equal(dlv.booked, 5)
  assert.equal(dlv.delivered, 3)
  assert.equal(dlv.deliveredRate, 75)
  assert.equal(dlv.firstAttemptRate, 66.7, "2 of 3 delivered without a failed attempt")
  assert.deepEqual(dlv.onTime, { promised: 3, met: 2 }, "the evening delivery on the promised day counts as on time")
  assert.equal(dlv.medianTransitDays, 4.4, "2, 4.375 and 6 days")
  const fleet = r.body.carriers.find((c: any) => c.provider === "own_fleet")
  assert.equal(fleet.carrier, "Everwear Fleet")
  assert.equal(fleet.onTimeRate, null, "no promise, no on-time figure")
  assert.equal(fleet.medianTransitDays, 0.1)
})

test("destinations and failure reasons", async () => {
  const r = (await get("/admin/analytics/logistics?from=2026-10-01T00:00:00Z&to=2026-10-31T23:59:59Z")).body
  const blr = r.destinations.find((d: any) => d.zone === "560")
  const del = r.destinations.find((d: any) => d.zone === "110")
  assert.equal(blr.booked, 4)
  assert.equal(del.booked, 2)
  assert.equal(del.rtoRate, 50)
  const reasons = Object.fromEntries(r.failureReasons.map((x: any) => [x.reason, x.count]))
  assert.equal(reasons["customer refused"], 2, "a rider's two recorded attempts")
  assert.equal(reasons["Consignee refused"], 1)
  assert.equal(reasons["customer unavailable"], 1)
})

test("warehouses: dispatch speed, open work, rejections; seller locations marked", async () => {
  const r = (await get("/admin/analytics/logistics?from=2026-10-01T00:00:00Z&to=2026-10-31T23:59:59Z")).body
  const blr = r.warehouses.find((w: any) => w.code === "BLR-FC1")
  assert.equal(blr.orders, 4)
  assert.equal(blr.rejected, 1)
  assert.equal(blr.dispatched, 2)
  assert.equal(blr.open, 1)
  assert.equal(blr.medianHoursToPack, 6, "4 h and 8 h")
  assert.equal(blr.medianHoursToDispatch, 20, "10 h and 30 h")
  assert.equal(blr.dispatchedWithin24h, 50)
  const sel = r.warehouses.find((w: any) => w.code === "SEL-0001")
  assert.equal(sel.seller, true)
  assert.equal(sel.medianHoursToDispatch, 5)
})

test("fleet: per rider, cash on hand now, remittance mismatches", async () => {
  const f = (await get("/admin/analytics/logistics?from=2026-10-01T00:00:00Z&to=2026-10-31T23:59:59Z")).body.fleet
  assert.equal(f.tasks, 4)
  assert.equal(f.unassigned, 1)
  assert.equal(f.deliveredRate, 66.7)
  assert.equal(f.firstAttemptRate, 50)
  const imran = f.riders.find((x: any) => x.name === "Imran")
  assert.equal(imran.delivered, 2)
  assert.equal(imran.codCollected, 349000)
  assert.equal(f.cash.onHand, 100000, "collected on t2 and not yet handed in")
  assert.deepEqual(f.cash.onHandByRider, [{ riderId: "rid_1", name: "Imran", amount: 100000, parcels: 1 }])
  assert.equal(f.cash.mismatches, 1)
  assert.equal(f.cash.expected - f.cash.counted, 1000)
})

test("returns: reasons by units, refund time; a range outside sees none of it", async () => {
  const r = (await get("/admin/analytics/logistics?from=2026-10-01T00:00:00Z&to=2026-10-31T23:59:59Z")).body.returns
  assert.equal(r.requested, 2)
  assert.equal(r.exchanges, 1)
  assert.equal(r.units, 4)
  assert.deepEqual(r.byReason[0], { reason: "too_small", units: 3 })
  assert.equal(r.medianDaysToRefund, 4)
  const empty = (await get("/admin/analytics/logistics?from=2026-01-01T00:00:00Z&to=2026-01-31T00:00:00Z")).body
  assert.equal(empty.totals.booked, 0)
  assert.equal(empty.totals.deliveredRate, null)
  assert.equal(empty.returns.requested, 0)
  assert.equal((await get("/admin/analytics/logistics?from=2026-10-31T00:00:00Z&to=2026-10-01T00:00:00Z")).status, 400)
})
