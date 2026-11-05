import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"

/*
 * Own delivery fleet end to end over HTTP, with no courier integration at
 * all: rider onboarding, booking at the packing station, offers, pickup at
 * the dock, OTP delivery with cash, failed attempts to RTO and back on the
 * shelf, cash reconciliation, earnings, and who may see what.
 */
process.env.MONGODB_DB = "everwear_test_fleet"
process.env.NODE_ENV = "test"
process.env.SHIPPING_PROVIDER = "none"
process.env.PRIVATE_UPLOADS_DIR = "/tmp/everwear-test-private-uploads"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { issueToken, hashPassword } = await import("../src/lib/auth.js")
const { sweepDispatch } = await import("../src/lib/fleet/dispatch.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())
type Json = Record<string, any>
const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const res = await request(path, { method, headers: { "content-type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: res.status, body: (await res.json().catch(() => null)) as Json, headers: res.headers }
}
const bearer = (t: string) => ({ authorization: `Bearer ${t}` })
const owner = bearer(issueToken("admin", "admin_owner"))
const finance = bearer(issueToken("admin", "admin_finance"))
const sup = bearer(issueToken("warehouse", "whu_sup"))
const customer = bearer(issueToken("customer", "cus_1"))
const ravi = bearer(issueToken("rider", "rdr_ravi"))
const anil = bearer(issueToken("rider", "rdr_anil"))

const address = { firstName: "Aarav", lastName: "Sharma", address1: "12 CMH Road, Indiranagar", city: "Bengaluru", postalCode: "560038", province: "Karnataka", countryCode: "in", phone: "+91 9886012345" }
const farAddress = { ...address, address1: "4 Lodhi Road", city: "New Delhi", postalCode: "110003", province: "Delhi" }

async function placeCod(lines: { variantId: string; quantity: number }[], addr = address) {
  const cart = (await call("POST", "/store/carts", { country: "in" }, customer)).body.cart
  for (const l of lines) assert.equal((await call("POST", `/store/carts/${cart.id}/items`, l, customer)).status, 200)
  await call("PATCH", `/store/carts/${cart.id}`, { email: "aarav@example.com", shippingAddress: addr, billingAddress: addr }, customer)
  await call("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" }, customer)
  const placed = await call("POST", `/store/carts/${cart.id}/complete`, undefined, customer)
  assert.equal(placed.status, 201, JSON.stringify(placed.body))
  return placed.body.order as Json
}

/** Warehouse floor up to the label, then the booking choice. */
async function packed(orderId: string) {
  const f = (await db.fulfilments().findOne({ orderId }))!
  for (const [path, body] of [["/accept", {}], ["/picking/start", {}]] as const) assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}${path}`, body, sup)).status, 200)
  for (const l of f.lines) await call("POST", `/warehouse/fulfilments/${f._id}/picking/scan`, { barcode: l.sku, quantity: l.quantity }, sup)
  await call("POST", `/warehouse/fulfilments/${f._id}/picking/complete`, {}, sup)
  await call("POST", `/warehouse/fulfilments/${f._id}/qc`, { result: "passed" }, sup)
  const p = await call("POST", `/warehouse/fulfilments/${f._id}/pack`, { orderCode: f.code, scans: f.lines.flatMap((l) => Array(l.quantity).fill(l.sku)), weightKg: 0.5, lengthCm: 30, breadthCm: 25, heightCm: 5 }, sup)
  assert.equal(p.status, 200, JSON.stringify(p.body))
  return p.body.fulfilment as Json
}

async function bookOwnFleet(orderId: string) {
  const f = await packed(orderId)
  const label = await call("POST", `/warehouse/fulfilments/${f._id}/label`, { packageCode: f.package.code, ownFleet: true }, sup)
  assert.equal(label.status, 200, JSON.stringify(label.body))
  assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}/label/verify`, { awb: label.body.fulfilment.awb }, sup)).status, 200)
  return label.body.fulfilment as Json
}

/** Manifest and dock handover to the rider's name. */
async function handOver(awb: string, rider = "Ravi") {
  const m = await call("POST", "/warehouse/manifests", { warehouseId: "wh_blr", carrier: "Everwear Fleet" }, sup)
  assert.equal(m.status, 201, JSON.stringify(m.body))
  assert.equal((await call("POST", `/warehouse/manifests/${m.body.manifest._id}/scan`, { awb }, sup)).status, 200)
  assert.equal((await call("POST", `/warehouse/manifests/${m.body.manifest._id}/close`, { courierExecutive: rider }, sup)).status, 200)
}

const taskOf = async (orderId: string) => (await db.deliveryTasks().findOne({ orderId }))!
const otpFor = async (orderId: string) => (await call("GET", `/store/orders/${orderId}`, undefined, customer)).body.order.delivery

before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()
  const now = new Date()
  await db.regions().insertOne({ _id: "reg_in", name: "India", currency: "inr", countries: [{ code: "in", name: "India" }], taxRate: 12, taxInclusive: true, shippingOptions: [{ _id: "so_std", name: "Standard Delivery", amount: 0 }], createdAt: now, updatedAt: now } as never)
  await db.products().insertOne({
    _id: "prod_tee",
    handle: "tee",
    title: "Organic Tee",
    status: "published",
    images: [],
    categoryIds: [],
    collectionId: null,
    tags: [],
    options: [{ title: "Size", values: ["M"] }],
    variants: [{ _id: "var_m", sku: "EW-TEE-M", title: "M", options: { Size: "M" }, prices: { inr: 99900 }, manageInventory: true, allowBackorder: false, stock: 0 }],
    createdAt: now,
    updatedAt: now,
  } as never)
  await db.adminUsers().insertMany([
    { _id: "admin_owner", email: "owner@example.com", passwordHash: "x", role: "owner", createdAt: now, updatedAt: now },
    { _id: "admin_finance", email: "finance@example.com", passwordHash: "x", role: "finance_manager", createdAt: now, updatedAt: now },
  ] as never)
  await db.customers().insertOne({ _id: "cus_1", email: "aarav@example.com", addresses: [], createdAt: now, updatedAt: now })
  await db.warehouses().deleteMany({})
  await db.warehouses().insertMany([
    { _id: "wh_blr", code: "BLR-FC1", name: "Bengaluru FC", city: "Bengaluru", state: "Karnataka", pincode: "560068", address: "Hosur Road", lat: 12.9, lng: 77.6, status: "active", isDefault: true, createdAt: now, updatedAt: now },
    { _id: "wh_del", code: "DEL-FC1", name: "Delhi FC", city: "New Delhi", state: "Delhi", pincode: "110020", address: "Okhla", status: "active", createdAt: now, updatedAt: now },
  ])
  await db.warehouseUsers().insertOne({ _id: "whu_sup", email: "sup@example.com", passwordHash: "x", name: "Sup", role: "supervisor", warehouseIds: ["wh_blr", "wh_del"], status: "active", createdAt: now, updatedAt: now } as never)
  await db.settings().insertOne({ _id: "store", storeName: "Everwear", lowStockThreshold: 3, updatedAt: now } as never)
  const hash = await hashPassword("rider-password-1")
  const rider = (id: string, name: string, phone: string) => ({ _id: id, email: `${id}@example.com`, phone, name, passwordHash: hash, status: "pending", vehicle: { type: "bike", registration: "KA01AB1234" }, documents: [], warehouseId: null, zoneIds: [], shifts: [], online: false, lastLocation: null, createdAt: now, updatedAt: now })
  await db.riders().insertMany([rider("rdr_ravi", "Ravi Kumar", "9000000001"), rider("rdr_anil", "Anil Rao", "9000000002")] as never)
  for (const [wh, qty] of [["wh_blr", 10], ["wh_del", 5]] as const) {
    assert.equal((await call("POST", "/warehouse/stock/operations", { type: "receive", warehouseId: wh, variantId: "var_m", quantity: qty }, sup)).status, 201)
  }
})

after(async () => {
  await getDb().dropDatabase()
  await close()
  await disconnect()
})

describe("onboarding", () => {
  let zoneId = ""

  test("a rider registers as pending and can't go online", async () => {
    const reg = await call("POST", "/rider/auth/register", { email: "new@example.com", phone: "+91 98450 12345", name: "New Rider", password: "a-long-password", vehicle: { type: "scooter", registration: "KA 05 MN 4321" } })
    assert.equal(reg.status, 201, JSON.stringify(reg.body))
    assert.equal(reg.body.rider.status, "pending")
    assert.equal(reg.body.rider.passwordHash, undefined)
    assert.equal((await call("POST", "/rider/me/availability", { online: true }, bearer(reg.body.token))).status, 403)
    assert.equal((await call("GET", "/rider/tasks", undefined, bearer(reg.body.token))).status, 403)
    assert.equal((await call("POST", "/rider/auth/register", { email: "new2@example.com", phone: "9845012345", name: "Dup", password: "a-long-password", vehicle: { type: "bike" } })).status, 409, "phone is unique")
  })

  test("approval needs verified documents and a zone", async () => {
    const zone = await call("POST", "/admin/delivery-zones", { code: "BLR-EAST", name: "Bengaluru East", warehouseId: "wh_blr", pincodes: ["560038", "560008"], codAllowed: true }, owner)
    assert.equal(zone.status, 201)
    zoneId = zone.body.zone._id
    const early = await call("POST", "/admin/riders/rdr_ravi/status", { status: "approved", reason: "Checks done" }, owner)
    assert.equal(early.body.error.code, "documents_unverified")
    for (const r of [ravi, anil]) {
      await call("PUT", "/rider/me/documents/driving_licence", { number: "KA0120190001234" }, r)
      const doc = await call("PUT", "/rider/me/documents/aadhaar", { number: "1234 5678 9012" }, r)
      assert.match(doc.body.rider.documents.find((d: Json) => d.type === "aadhaar").number, /^•+9012$/, "numbers are masked back to the rider")
    }
    for (const id of ["rdr_ravi", "rdr_anil"]) {
      for (const t of ["driving_licence", "aadhaar"]) assert.equal((await call("POST", `/admin/riders/${id}/documents/${t}/verify`, {}, owner)).status, 200)
      assert.equal((await call("POST", `/admin/riders/${id}/status`, { status: "approved", reason: "x" + "yz" }, owner)).body.error.code, "no_zone")
      assert.equal((await call("PATCH", `/admin/riders/${id}/assignment`, { warehouseId: "wh_blr", zoneIds: [zoneId] }, owner)).status, 200)
      assert.equal((await call("POST", `/admin/riders/${id}/status`, { status: "approved", reason: "Checks done" }, owner)).status, 200)
    }
    assert.ok(await db.auditLogs().findOne({ action: "rider.approved", targetId: "rdr_ravi" }))
  })

  test("only Ravi goes online for now", async () => {
    const on = await call("POST", "/rider/me/availability", { online: true }, ravi)
    assert.equal(on.status, 200)
    assert.equal(on.body.rider.online, true)
  })
})

describe("scenario 5: own fleet, COD, OTP, cash", () => {
  let order: Json
  let awb = ""

  test("a destination outside every zone can't be booked on the fleet", async () => {
    const far = await placeCod([{ variantId: "var_m", quantity: 1 }], farAddress)
    const f = await packed(far.id)
    const res = await call("POST", `/warehouse/fulfilments/${f._id}/label`, { packageCode: f.package.code, ownFleet: true }, sup)
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, "not_in_zone")
    assert.equal((await call("GET", `/warehouse/fulfilments/${f._id}`, undefined, sup)).body.ownFleet, null)
  })

  test("booked at the packing station with our own tracking number, offered to the online rider", async () => {
    order = await placeCod([{ variantId: "var_m", quantity: 2 }])
    const f = await bookOwnFleet(order.id)
    awb = f.awb
    assert.match(awb, /^EWF\d{9}$/)
    assert.equal(f.carrier, "Everwear Fleet")
    const task = await taskOf(order.id)
    assert.equal(task.status, "offered")
    assert.equal(task.offer?.riderId, "rdr_ravi")
    assert.equal(task.cod?.due, order.totals.total, "cash due comes from the order")
    const label = await call("GET", `/warehouse/fulfilments/${f._id}/own-label`, undefined, sup)
    assert.equal(label.body.label.to.postalCode, "560038")
    assert.equal(label.body.label.cod.amount, order.totals.total)
  })

  test("the offer shows the area and cash, not the address; another rider can't see it", async () => {
    const { offers } = (await call("GET", "/rider/tasks", undefined, ravi)).body
    assert.equal(offers.length, 1)
    assert.equal(offers[0].area.postalCode, "560038")
    assert.equal(offers[0].stop, undefined)
    const task = await taskOf(order.id)
    assert.equal((await call("GET", `/rider/tasks/${task._id}`, undefined, anil)).status, 404)
    assert.equal((await call("POST", `/rider/tasks/${task._id}/accept`, {}, anil)).status, 404)
  })

  test("accepted: address visible, phone still hidden", async () => {
    const task = await taskOf(order.id)
    const acc = await call("POST", `/rider/tasks/${task._id}/accept`, {}, ravi)
    assert.equal(acc.status, 200, JSON.stringify(acc.body))
    assert.equal(acc.body.task.status, "assigned")
    assert.equal(acc.body.task.stop.address1, "12 CMH Road, Indiranagar")
    assert.equal(acc.body.task.stop.phone, null)
    assert.equal((await call("POST", `/rider/tasks/${task._id}/accept`, {}, ravi)).status, 409, "no duplicate transition")
  })

  test("pickup waits for the warehouse handover, then the parcel is with the rider", async () => {
    const early = await call("POST", "/rider/pickup", { awb }, ravi)
    assert.equal(early.status, 422)
    assert.equal(early.body.error.code, "not_handed_over")
    await handOver(awb)
    assert.equal((await call("POST", "/rider/pickup", { awb: "EWF000000000" }, ravi)).body.error.code, "not_yours")
    const ok = await call("POST", "/rider/pickup", { awb: awb.toLowerCase() }, ravi)
    assert.equal(ok.status, 200, JSON.stringify(ok.body))
    assert.equal(ok.body.task.status, "picked_up")
    const o = (await db.orders().findOne({ _id: order.id }))!
    assert.equal(o.fulfillmentStatus, "shipped")
    assert.equal(o.shipment?.carrier, "Everwear Fleet")
  })

  test("out for delivery: the customer sees the OTP, the rider sees the phone but never the OTP", async () => {
    const task = await taskOf(order.id)
    assert.equal((await call("POST", "/rider/me/location", { lat: 12.97, lng: 77.64 }, ravi)).body.error.code, "not_delivering", "no tracking before the run")
    const start = await call("POST", "/rider/tasks/start", { taskIds: [task._id] }, ravi)
    assert.equal(start.status, 200, JSON.stringify(start.body))
    assert.equal(start.body.tasks[0].stop.phone, "9886012345")
    assert.equal(JSON.stringify(start.body).includes((await otpFor(order.id)).otp), false, "OTP not in the rider's response")
    const d = await otpFor(order.id)
    assert.match(d.otp, /^\d{6}$/)
    assert.equal(d.rider.firstName, "Ravi")
    assert.equal(d.cashDue, order.totals.total)
    assert.equal(d.location, null)
    assert.equal((await call("POST", "/rider/me/location", { lat: 12.97, lng: 77.64, accuracy: 15 }, ravi)).status, 200)
    assert.deepEqual([(await otpFor(order.id)).location.lat, (await otpFor(order.id)).location.lng], [12.97, 77.64])
    const stored = (await db.deliveryTasks().findOne({ _id: task._id }))!
    assert.equal(JSON.stringify(stored).includes(d.otp), false, "OTP not stored in clear")
  })

  test("wrong OTP and wrong cash are refused; the right ones deliver", async () => {
    const task = await taskOf(order.id)
    const { otp } = await otpFor(order.id)
    const wrong = await call("POST", `/rider/tasks/${task._id}/deliver`, { otp: otp === "000000" ? "111111" : "000000", receiverName: "Aarav", codCollected: order.totals.total }, ravi)
    assert.equal(wrong.status, 422)
    assert.equal(wrong.body.error.code, "wrong_otp")
    const less = await call("POST", `/rider/tasks/${task._id}/deliver`, { otp, receiverName: "Aarav", codCollected: order.totals.total - 100 }, ravi)
    assert.equal(less.body.error.code, "cod_amount", "the rider can't change what's owed")
    const noCash = await call("POST", `/rider/tasks/${task._id}/deliver`, { otp, receiverName: "Aarav" }, ravi)
    assert.equal(noCash.body.error.code, "cod_required")

    // Proof photo travels as multipart; a tiny real PNG.
    const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5f0000000049454e44ae426082", "hex")
    const form = new FormData()
    form.set("otp", otp)
    form.set("receiverName", "Aarav Sharma")
    form.set("codCollected", String(order.totals.total))
    form.set("lat", "12.9716")
    form.set("lng", "77.6412")
    form.set("photo", new Blob([new Uint8Array(png)], { type: "image/png" }), "door.png")
    const res = await request(`/rider/tasks/${task._id}/deliver`, { method: "POST", headers: ravi, body: form })
    const body = (await res.json()) as Json
    assert.equal(res.status, 200, JSON.stringify(body))
    assert.equal(body.task.status, "delivered")
    assert.equal(body.task.stop, null, "address gone once delivered")
    const o = (await db.orders().findOne({ _id: order.id }))!
    assert.equal(o.fulfillmentStatus, "delivered")
    assert.equal(o.paymentStatus, "awaiting", "cash isn't payment until finance counts it")
    assert.equal((await otpFor(order.id)).otp, null)
    const photo = await request(`/admin/delivery-tasks/${task._id}/pod-photo`, { headers: owner })
    assert.equal(photo.status, 200)
    assert.equal(photo.headers.get("content-type"), "image/png")
    assert.equal((await request(`/admin/delivery-tasks/${task._id}/pod-photo`)).status, 401)
    const stored = (await db.deliveryTasks().findOne({ _id: task._id }))!
    assert.equal((await request(`/uploads/${stored.pod!.photo}`)).status, 404, "never served publicly")
    assert.equal(stored.pod?.lat, 12.9716)
  })

  test("COD reconciliation: a short count is flagged, an exact count marks the order paid", async () => {
    const cash = (await call("GET", "/rider/cash", undefined, ravi)).body
    assert.equal(cash.inHand, order.totals.total)
    const rem = await call("POST", "/rider/cash/remit", { declared: order.totals.total }, ravi)
    assert.equal(rem.status, 201)
    assert.equal((await call("POST", "/rider/cash/remit", { declared: 0 }, ravi)).body.error.code, "nothing_to_remit")
    const id = rem.body.remittance._id
    assert.equal((await call("POST", `/admin/cod-remittances/${id}/reconcile`, { counted: 1 }, bearer(issueToken("admin", "admin_owner_nope")))).status, 401)
    const short = await call("POST", `/admin/cod-remittances/${id}/reconcile`, { counted: order.totals.total - 50000, note: "Counted twice" }, finance)
    assert.equal(short.body.remittance.status, "mismatch")
    assert.equal((await db.orders().findOne({ _id: order.id }))!.paymentStatus, "awaiting")
    const exact = await call("POST", `/admin/cod-remittances/${id}/reconcile`, { counted: order.totals.total, note: "Found the missing note" }, finance)
    assert.equal(exact.body.remittance.status, "reconciled")
    const o = (await db.orders().findOne({ _id: order.id }))!
    assert.equal(o.paymentStatus, "paid")
    assert.equal(o.status, "completed")
    assert.equal((await call("POST", `/admin/cod-remittances/${id}/reconcile`, { counted: order.totals.total }, finance)).status, 409, "closed")
    const events = (await call("GET", `/admin/orders/${order.id}/history`, undefined, owner)).body.events.map((e: Json) => `${e.machine}:${e.to}`)
    for (const e of ["delivery:offered", "delivery:assigned", "delivery:picked_up", "delivery:out_for_delivery", "delivery:delivered", "payment:paid", "order:completed"]) assert.ok(events.includes(e), e)
  })
})

describe("scenario 3: failed attempts, RTO and back on the shelf", () => {
  let order: Json
  let awb = ""

  test("a declined offer goes to the next rider; a lapsed one too", async () => {
    await call("POST", "/rider/me/availability", { online: true }, anil)
    order = await placeCod([{ variantId: "var_m", quantity: 1 }])
    awb = (await bookOwnFleet(order.id)).awb
    let task = await taskOf(order.id)
    const first = task.offer!.riderId
    const firstToken = first === "rdr_ravi" ? ravi : anil
    assert.equal((await call("POST", `/rider/tasks/${task._id}/decline`, { reason: "Bike puncture" }, firstToken)).status, 200)
    task = await taskOf(order.id)
    assert.equal(task.status, "offered")
    assert.notEqual(task.offer!.riderId, first)
    // The second rider doesn't answer in time.
    await db.deliveryTasks().updateOne({ _id: task._id }, { $set: { "offer.expiresAt": new Date(Date.now() - 1000) } })
    await sweepDispatch()
    task = await taskOf(order.id)
    assert.equal(task.status, "unassigned", "both riders passed; it waits for an admin or a new rider")
    assert.deepEqual([...task.declinedBy].sort(), ["rdr_anil", "rdr_ravi"])
  })

  test("an admin assigns it by hand, with an audit entry", async () => {
    const task = await taskOf(order.id)
    const res = await call("POST", `/admin/delivery-tasks/${task._id}/assign`, { riderId: "rdr_anil", reason: "Ravi's run is full" }, owner)
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.task.riderId, "rdr_anil")
    assert.equal(res.body.task.otp, undefined)
    assert.ok(await db.auditLogs().findOne({ action: "delivery.assign", targetId: task._id }))
  })

  test("three failed attempts send it back; each is recorded with its reason", async () => {
    await handOver(awb, "Anil")
    const task = await taskOf(order.id)
    assert.equal((await call("POST", "/rider/pickup", { awb }, anil)).status, 200)
    const reasons = ["customer_unavailable", "premises_closed", "customer_refused"]
    for (const [i, reason] of reasons.entries()) {
      assert.equal((await call("POST", "/rider/tasks/start", { taskIds: [task._id] }, anil)).status, 200)
      const fail = await call("POST", `/rider/tasks/${task._id}/fail`, { reason, note: `Attempt ${i + 1}`, ...(i === 0 ? { rescheduledFor: new Date(Date.now() + 86_400_000).toISOString() } : {}) }, anil)
      assert.equal(fail.status, 200, JSON.stringify(fail.body))
      if (i < 2) {
        assert.equal(fail.body.task.status, "attempt_failed")
        assert.equal((await db.shipments().findOne({ awb }))!.status, "delivery_failed")
      }
    }
    const done = await taskOf(order.id)
    assert.equal(done.status, "rto")
    assert.deepEqual(done.attempts.map((a) => a.reason), reasons)
    assert.equal((await db.shipments().findOne({ awb }))!.status, "rto_initiated")
    assert.equal((await call("POST", "/rider/tasks/start", { taskIds: [task._id] }, anil)).status, 409, "can't go out again")
  })

  test("received back at the warehouse: graded units return to stock, the unpaid COD order is cancelled", async () => {
    const before = (await db.stockLevels().findOne({ warehouseId: "wh_blr", variantId: "var_m" }))!
    const look = await call("GET", `/warehouse/rto/${awb}`, undefined, sup)
    assert.equal(look.status, 200, JSON.stringify(look.body))
    const itemId = look.body.rto.lines[0].itemId
    assert.equal((await call("POST", `/warehouse/rto/${awb}/receive`, { warehouseId: "wh_blr", grades: [{ itemId, sellable: 2, damaged: 0 }] }, sup)).status, 400, "grades must match the parcel")
    const res = await call("POST", `/warehouse/rto/${awb}/receive`, { warehouseId: "wh_blr", grades: [{ itemId, sellable: 1, damaged: 0 }] }, sup)
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const after = (await db.stockLevels().findOne({ warehouseId: "wh_blr", variantId: "var_m" }))!
    assert.equal(after.available, before.available + 1)
    assert.equal((await taskOf(order.id)).status, "returned")
    assert.equal((await db.shipments().findOne({ awb }))!.status, "rto_delivered")
    const o = (await db.orders().findOne({ _id: order.id }))!
    assert.equal(o.status, "canceled")
    assert.equal(o.fulfillmentStatus, "returned")
    assert.equal((await call("POST", `/warehouse/rto/${awb}/receive`, { warehouseId: "wh_blr", grades: [{ itemId, sellable: 1, damaged: 0 }] }, sup)).status, 404, "only once")
  })

  test("earnings: one delivery for Ravi, three failed attempts for Anil", async () => {
    const r = (await call("GET", "/rider/earnings", undefined, ravi)).body
    const a = (await call("GET", "/rider/earnings", undefined, anil)).body
    assert.deepEqual([r.deliveries, r.failedAttempts, r.amount], [1, 0, 4000])
    assert.deepEqual([a.deliveries, a.failedAttempts, a.amount], [0, 3, 4500])
    assert.equal((await call("GET", "/rider/history", undefined, anil)).body.tasks[0].stop, null)
  })
})

describe("access and reliability", () => {
  test("tokens don't cross: rider vs admin vs warehouse vs customer", async () => {
    assert.equal((await call("GET", "/rider/tasks", undefined, owner)).status, 401)
    assert.equal((await call("GET", "/admin/riders", undefined, ravi)).status, 401)
    assert.equal((await call("GET", "/rider/tasks", undefined, sup)).status, 401)
    assert.equal((await call("GET", "/rider/me", undefined, customer)).status, 401)
  })

  test("a suspended rider is taken offline and can't work", async () => {
    assert.equal((await call("POST", "/admin/riders/rdr_anil/status", { status: "suspended", reason: "Documents expired" }, owner)).status, 200)
    assert.equal((await db.riders().findOne({ _id: "rdr_anil" }))!.online, false)
    assert.equal((await call("GET", "/rider/tasks", undefined, anil)).status, 403)
  })

  test("only finance or the owner reconciles cash", async () => {
    const staff = bearer(issueToken("admin", "admin_staff"))
    await db.adminUsers().insertOne({ _id: "admin_staff", email: "staff@example.com", passwordHash: "x", role: "staff", createdAt: new Date(), updatedAt: new Date() } as never)
    const r = await db.codRemittances().findOne({})
    assert.equal((await call("POST", `/admin/cod-remittances/${r!._id}/reconcile`, { counted: 0 }, staff)).status, 403)
  })

  test("route order works through the nearest PIN code first", async () => {
    const { orderStops } = await import("../src/lib/fleet/support.js")
    const stops = ["560001", "560038", "110003", "560068"].map((p, i) => ({ _id: `t${i}`, stop: { postalCode: p } }))
    assert.deepEqual(orderStops({ pincode: "560068" }, stops).map((s) => s.stop.postalCode), ["560068", "560038", "560001", "110003"])
    const geo = [
      { _id: "far", stop: { postalCode: "560001", lat: 13.1, lng: 77.6 } },
      { _id: "near", stop: { postalCode: "560001", lat: 12.91, lng: 77.6 } },
      { _id: "mid", stop: { postalCode: "560001", lat: 13.0, lng: 77.6 } },
    ]
    assert.deepEqual(orderStops({ pincode: "560068", lat: 12.9, lng: 77.6 }, geo).map((s) => s._id), ["near", "mid", "far"])
  })

  test("shifts are checked in India time, including overnight shifts", async () => {
    const { onShift } = await import("../src/lib/fleet/support.js")
    // 2026-11-05 is a Thursday (day 4). 04:30 UTC = 10:00 IST.
    const at = new Date("2026-11-05T04:30:00Z")
    assert.equal(onShift({ shifts: [{ day: 4, start: "09:00", end: "18:00" }] }, at), true)
    assert.equal(onShift({ shifts: [{ day: 4, start: "11:00", end: "18:00" }] }, at), false)
    assert.equal(onShift({ shifts: [{ day: 3, start: "22:00", end: "11:00" }] }, at), true, "Wednesday night into Thursday morning")
  })
})
