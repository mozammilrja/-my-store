import assert from "node:assert/strict"
import crypto from "node:crypto"
import { after, before, describe, test } from "node:test"
import { createProviderStub } from "./provider-stub.js"

/*
 * Warehouse fulfilment end to end over HTTP: stock receiving, allocation at
 * checkout, pick / QC / pack / label / manifest / handover, courier tracking,
 * returns with inspection, and the guards around each (wrong scans, other
 * warehouses' data, roles, concurrency, illegal transitions). Razorpay and
 * Shiprocket are the local stand-in in ./provider-stub.ts.
 */
const stub = createProviderStub()
const stubUrl = await stub.start()
process.env.MONGODB_DB = "everwear_test_fulfilment"
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
  return { status: res.status, body: (await res.json().catch(() => null)) as Json }
}
const bearer = (t: string) => ({ authorization: `Bearer ${t}` })
const owner = bearer(issueToken("admin", "admin_owner"))
const blrSup = bearer(issueToken("warehouse", "whu_blr_sup"))
const blrPicker = bearer(issueToken("warehouse", "whu_blr_pick"))
const delSup = bearer(issueToken("warehouse", "whu_del_sup"))
const customer = bearer(issueToken("customer", "cus_1"))

const blrAddress = { firstName: "Aarav", lastName: "Sharma", address1: "100 Feet Road", city: "Bengaluru", postalCode: "560038", province: "Karnataka", countryCode: "in", phone: "+91 9886012345" }
const delAddress = { firstName: "Isha", lastName: "Kapoor", address1: "4 Lodhi Road", city: "New Delhi", postalCode: "110003", province: "Delhi", countryCode: "in", phone: "+91 9811012345" }

const variantStock = async (variantId: string) => (await db.products().findOne({ "variants._id": variantId }))!.variants.find((v) => v._id === variantId)!.stock
const level = async (warehouseId: string, variantId: string) => (await db.stockLevels().findOne({ warehouseId, variantId }))!

async function cart(lines: { variantId: string; quantity: number }[], address = blrAddress, headers: Record<string, string> = {}) {
  const c = (await call("POST", "/store/carts", { country: "in" }, headers)).body.cart
  for (const l of lines) {
    const added = await call("POST", `/store/carts/${c.id}/items`, l, headers)
    assert.equal(added.status, 200, JSON.stringify(added.body))
  }
  await call("PATCH", `/store/carts/${c.id}`, { email: "shopper@example.com", shippingAddress: address, billingAddress: address }, headers)
  await call("POST", `/store/carts/${c.id}/shipping`, { optionId: "so_std" }, headers)
  return c.id as string
}
const cod = async (cartId: string, headers: Record<string, string> = {}) => call("POST", `/store/carts/${cartId}/complete`, undefined, headers)
async function prepaid(cartId: string, headers: Record<string, string> = {}) {
  const intent = (await call("POST", `/store/carts/${cartId}/payment-intent`, { provider: "razorpay" }, headers)).body
  const p = stub.pay(intent.razorpayOrderId)
  const signature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${intent.razorpayOrderId}|${p.id}`).digest("hex")
  return call("POST", `/store/carts/${cartId}/confirm-payment`, { provider: "razorpay", razorpayOrderId: intent.razorpayOrderId, razorpayPaymentId: p.id, razorpaySignature: signature }, headers)
}
const fulfilmentsOf = (orderId: string) => db.fulfilments().find({ orderId }, { sort: { createdAt: 1 } }).toArray()
const receive = (headers: Record<string, string>, warehouseId: string, variantId: string, quantity: number) =>
  call("POST", "/warehouse/stock/operations", { type: "receive", warehouseId, variantId, quantity, reference: "GRN-1" }, headers)

/** Walks a fulfilment from assigned to ready to dispatch, as the floor would. */
async function throughPacking(id: string, headers = blrSup) {
  assert.equal((await call("POST", `/warehouse/fulfilments/${id}/accept`, {}, headers)).status, 200)
  assert.equal((await call("POST", `/warehouse/fulfilments/${id}/picking/start`, {}, headers)).status, 200)
  const f = (await db.fulfilments().findOne({ _id: id }))!
  for (const l of f.lines) assert.equal((await call("POST", `/warehouse/fulfilments/${id}/picking/scan`, { barcode: l.sku, quantity: l.quantity }, headers)).status, 200)
  assert.equal((await call("POST", `/warehouse/fulfilments/${id}/picking/complete`, {}, headers)).status, 200)
  assert.equal((await call("POST", `/warehouse/fulfilments/${id}/qc`, { result: "passed" }, headers)).status, 200)
  const scans = f.lines.flatMap((l) => Array(l.quantity).fill(l.sku))
  const packed = await call("POST", `/warehouse/fulfilments/${id}/pack`, { orderCode: f.code, scans, weightKg: 0.6, lengthCm: 30, breadthCm: 25, heightCm: 5 }, headers)
  assert.equal(packed.status, 200, JSON.stringify(packed.body))
  const label = await call("POST", `/warehouse/fulfilments/${id}/label`, { packageCode: packed.body.fulfilment.package.code }, headers)
  assert.equal(label.status, 200, JSON.stringify(label.body))
  assert.equal((await call("POST", `/warehouse/fulfilments/${id}/label/verify`, { awb: label.body.fulfilment.awb }, headers)).status, 200)
  return (await db.fulfilments().findOne({ _id: id }))!
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
    policies: { returnWindowDays: 30 },
    createdAt: now,
    updatedAt: now,
  } as never)
  const variant = (id: string, size: string, stock = 0) => ({ _id: id, sku: `EW-SH-${size}`, title: size, options: { Size: size }, prices: { inr: 149900 }, manageInventory: true, allowBackorder: false, stock })
  await db.products().insertOne({
    _id: "prod_shirt",
    handle: "linen-shirt",
    title: "Linen Shirt",
    status: "published",
    images: [],
    categoryIds: [],
    collectionId: null,
    tags: [],
    options: [{ title: "Size", values: ["S", "M", "L", "XL", "XXL"] }],
    variants: [variant("var_s", "S"), variant("var_m", "M"), variant("var_l", "L"), variant("var_xl", "XL"), variant("var_xxl", "XXL", 4)],
    weight: 400,
    createdAt: now,
    updatedAt: now,
  } as never)
  await db.adminUsers().insertOne({ _id: "admin_owner", email: "owner@example.com", passwordHash: "unused", role: "owner", createdAt: now, updatedAt: now } as never)
  await db.customers().insertOne({ _id: "cus_1", email: "shopper@example.com", addresses: [], createdAt: now, updatedAt: now })
  await db.warehouses().deleteMany({})
  await db.warehouses().insertMany([
    { _id: "wh_blr", code: "BLR-FC1", name: "Bengaluru FC", city: "Bengaluru", state: "Karnataka", pincode: "560068", address: "Hosur Road", status: "active", isDefault: true, shiprocketPickupLocation: "BLR-Hosur", createdAt: now, updatedAt: now },
    { _id: "wh_del", code: "DEL-FC1", name: "Delhi FC", city: "New Delhi", state: "Delhi", pincode: "110020", address: "Okhla Phase 3", status: "active", shiprocketPickupLocation: "DEL-Okhla", createdAt: now, updatedAt: now },
  ])
  const hash = await hashPassword("floor-password-1")
  const staff = (id: string, role: string, warehouseIds: string[]) => ({ _id: id, email: `${id}@example.com`, passwordHash: hash, name: id, role, warehouseIds, status: "active", createdAt: now, updatedAt: now })
  await db.warehouseUsers().insertMany([staff("whu_blr_sup", "supervisor", ["wh_blr"]), staff("whu_blr_pick", "picker", ["wh_blr"]), staff("whu_del_sup", "supervisor", ["wh_del"])] as never)
  await db.settings().insertOne({ _id: "store", storeName: "Everwear", lowStockThreshold: 3, seller: { phone: "+91 8000000000", email: "ops@example.com" }, updatedAt: now } as never)
})

after(async () => {
  await getDb().dropDatabase()
  await close()
  await disconnect()
  await stub.close()
})

describe("stock receiving and the ledger", () => {
  test("received stock becomes sellable, one ledger row per move", async () => {
    assert.equal((await receive(blrSup, "wh_blr", "var_m", 5)).status, 201)
    assert.equal((await receive(delSup, "wh_del", "var_m", 3)).status, 201)
    assert.equal((await receive(blrSup, "wh_blr", "var_s", 1)).status, 201)
    assert.equal((await receive(delSup, "wh_del", "var_s", 1)).status, 201)
    assert.equal((await receive(blrSup, "wh_blr", "var_l", 3)).status, 201)
    assert.equal((await receive(blrSup, "wh_blr", "var_xl", 1)).status, 201)
    assert.equal(await variantStock("var_m"), 8)
    assert.equal(await variantStock("var_s"), 2)
    assert.equal((await level("wh_blr", "var_m")).available, 5)
    const rows = await db.stockLedger().find({ variantId: "var_m" }).toArray()
    assert.equal(rows.length, 2)
    assert.ok(rows.every((r) => r.reason === "receive" && r.from === "outside" && r.to === "available"))
  })

  test("a supervisor can't move stock in another warehouse; a picker can't move stock at all", async () => {
    assert.equal((await receive(delSup, "wh_blr", "var_m", 1)).status, 404)
    assert.equal((await receive(blrPicker, "wh_blr", "var_m", 1)).status, 403)
  })

  test("an adjustment can't take stock below zero and needs a note", async () => {
    const neg = await call("POST", "/warehouse/stock/operations", { type: "adjust", warehouseId: "wh_blr", variantId: "var_xl", delta: -5, note: "Cycle count" }, blrSup)
    assert.equal(neg.status, 409)
    assert.equal(neg.body.error.code, "insufficient_stock")
    assert.equal((await call("POST", "/warehouse/stock/operations", { type: "adjust", warehouseId: "wh_blr", variantId: "var_xl", delta: -1 }, blrSup)).status, 400)
    assert.equal(await variantStock("var_xl"), 1)
  })

  test("stock of a warehouse-managed variant can't be overwritten from the product page", async () => {
    const res = await call("PATCH", "/admin/products/prod_shirt", { variants: [{ id: "var_m", stock: 999 }] }, owner)
    assert.equal(res.status, 409)
    assert.equal(res.body.error.code, "warehouse_managed")
    assert.equal(await variantStock("var_m"), 8)
  })

  test("opening balance brings a legacy variant under warehouse management once", async () => {
    const res = await call("POST", "/admin/stock-levels/opening-balance", { warehouseId: "wh_del", variantIds: ["var_xxl"] }, owner)
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.equal((await level("wh_del", "var_xxl")).available, 4)
    assert.equal(await variantStock("var_xxl"), 4, "the sellable count isn't counted twice")
    assert.equal((await call("POST", "/admin/stock-levels/opening-balance", { warehouseId: "wh_blr", variantIds: ["var_xxl"] }, owner)).status, 409)
  })
})

describe("scenario 1: prepaid order, Bengaluru warehouse, through to delivery", () => {
  let orderId = ""
  let f: Json = {}

  test("the paid order is allocated to the nearest warehouse with stock reserved", async () => {
    const placed = await prepaid(await cart([{ variantId: "var_m", quantity: 1 }], blrAddress, customer), customer)
    assert.equal(placed.status, 201, JSON.stringify(placed.body))
    orderId = placed.body.order.id
    const [ful] = await fulfilmentsOf(orderId)
    assert.ok(ful)
    f = ful
    assert.equal(ful.warehouseId, "wh_blr", "560038 is closer to 560068 than to 110020")
    assert.equal(ful.status, "assigned")
    assert.equal(ful.destination.postalCode, "560038")
    assert.equal(JSON.stringify(ful).includes("9886012345"), false, "no customer phone in the warehouse record")
    const l = await level("wh_blr", "var_m")
    assert.equal(l.available, 4)
    assert.equal(l.reserved, 1)
    assert.equal(await variantStock("var_m"), 7)
    const history = (await call("GET", `/admin/orders/${orderId}/history`, undefined, owner)).body.events
    assert.deepEqual(history.map((e: Json) => `${e.machine}:${e.to}`), ["fulfilment:assigned", "order:pending", "payment:paid"])
  })

  test("the Delhi supervisor can't see Bengaluru's order", async () => {
    assert.equal((await call("GET", `/warehouse/fulfilments/${f._id}`, undefined, delSup)).status, 404)
    const queue = (await call("GET", "/warehouse/fulfilments", undefined, delSup)).body.fulfilments
    assert.equal(queue.some((x: Json) => x._id === f._id), false)
  })

  test("picking refuses the wrong size and an over-pick, and moves nothing", async () => {
    await call("POST", `/warehouse/fulfilments/${f._id}/accept`, {}, blrSup)
    const early = await call("POST", `/warehouse/fulfilments/${f._id}/picking/scan`, { barcode: "EW-SH-M" }, blrPicker)
    assert.equal(early.status, 409, "scan before picking has started")
    assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}/picking/start`, {}, blrPicker)).status, 200)
    const wrong = await call("POST", `/warehouse/fulfilments/${f._id}/picking/scan`, { barcode: "EW-SH-L" }, blrPicker)
    assert.equal(wrong.status, 422)
    assert.equal(wrong.body.error.code, "wrong_item")
    assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}/picking/complete`, {}, blrPicker)).status, 409)
    assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}/picking/scan`, { barcode: "ew-sh-m" }, blrPicker)).status, 200)
    const over = await call("POST", `/warehouse/fulfilments/${f._id}/picking/scan`, { barcode: "EW-SH-M" }, blrPicker)
    assert.equal(over.body.error.code, "over_pick")
    const l = await level("wh_blr", "var_m")
    assert.equal(l.reserved, 0)
    assert.equal(l.picked, 1)
    assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}/picking/complete`, {}, blrPicker)).status, 200)
  })

  test("a picker can't inspect or pack", async () => {
    assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}/qc`, { result: "passed" }, blrPicker)).status, 403)
  })

  test("packing checks the slip and every unit; the label must go on this parcel", async () => {
    assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}/qc`, { result: "passed" }, blrSup)).status, 200)
    const dims = { weightKg: 0.5, lengthCm: 30, breadthCm: 25, heightCm: 4 }
    assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}/pack`, { orderCode: "FUL-9999-1", scans: ["EW-SH-M"], ...dims }, blrSup)).body.error.code, "wrong_order")
    assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}/pack`, { orderCode: f.code, scans: ["EW-SH-L"], ...dims }, blrSup)).body.error.code, "wrong_item")
    assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}/pack`, { orderCode: f.code, scans: ["EW-SH-M", "EW-SH-M"], ...dims }, blrSup)).body.error.code, "over_pack")
    const packed = await call("POST", `/warehouse/fulfilments/${f._id}/pack`, { orderCode: f.code, scans: ["EW-SH-M"], ...dims }, blrSup)
    assert.equal(packed.status, 200)
    assert.equal((await level("wh_blr", "var_m")).packed, 1)

    assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}/label`, { packageCode: "PKG-NOPE" }, blrSup)).body.error.code, "wrong_package")
    const label = await call("POST", `/warehouse/fulfilments/${f._id}/label`, { packageCode: packed.body.fulfilment.package.code }, blrSup)
    assert.equal(label.status, 200, JSON.stringify(label.body))
    assert.match(label.body.fulfilment.awb, /^AWB\d+$/, "the AWB is the courier's")
    assert.ok(label.body.label.labelUrl)
    assert.equal(stub.state.pickupLocations.get(f.code), "BLR-Hosur", "booked from this warehouse's pickup address")
    const shipment = (await db.shipments().findOne({ fulfilmentId: f._id }))!
    assert.equal(shipment.parcel.weightKg, 0.5, "the weight measured at packing")
    assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}/label/verify`, { awb: "AWB0" }, blrSup)).body.error.code, "wrong_awb")
    assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}/label/verify`, { awb: label.body.fulfilment.awb }, blrSup)).status, 200)
    f = (await db.fulfilments().findOne({ _id: f._id }))!
  })

  test("an order booked through the warehouse can't be booked again from the order page", async () => {
    const res = await call("POST", `/admin/orders/${orderId}/shipments`, {}, owner)
    assert.equal(res.status, 409)
    assert.equal(res.body.error.code, "warehouse_fulfilment")
  })

  test("manifest, dock scans and close: the parcel leaves the building", async () => {
    const m = await call("POST", "/warehouse/manifests", { warehouseId: "wh_blr", carrier: f.carrier }, blrSup)
    assert.equal(m.status, 201, JSON.stringify(m.body))
    assert.deepEqual(m.body.manifest.awbs, [f.awb])
    assert.equal(m.body.manifest.manifestUrls.length, 1)
    assert.ok((await db.shipments().findOne({ _id: f.shipmentId }))!.pickup, "courier pickup requested")
    assert.equal((await call("POST", `/warehouse/manifests/${m.body.manifest._id}/scan`, { awb: "AWB-OTHER" }, blrSup)).body.error.code, "not_on_manifest")
    assert.equal((await call("POST", `/warehouse/manifests/${m.body.manifest._id}/scan`, { awb: f.awb }, blrSup)).status, 200)
    assert.equal((await call("POST", `/warehouse/manifests/${m.body.manifest._id}/scan`, { awb: f.awb }, blrSup)).body.error.code, "already_scanned")
    const closed = await call("POST", `/warehouse/manifests/${m.body.manifest._id}/close`, { courierExecutive: "Ravi (Delhivery)" }, blrSup)
    assert.equal(closed.status, 200)
    const done = (await db.fulfilments().findOne({ _id: f._id }))!
    assert.equal(done.status, "dispatched")
    const l = await level("wh_blr", "var_m")
    assert.equal(l.packed, 0)
    assert.equal(l.dispatchedTotal, 1)
    // Dispatch is our side; the order isn't "shipped" until the courier reports the pickup.
    assert.equal((await db.orders().findOne({ _id: orderId }))!.fulfillmentStatus, "unfulfilled")
  })

  test("courier tracking delivers the order; a repeated webhook changes nothing", async () => {
    const hook = (body: Json) => call("POST", "/store/webhooks/courier-tracking", body, { "x-api-key": "stub-tracking-token" })
    await hook({ awb: f.awb, shipment_status_id: 42, shipment_status: "PICKED UP", scans: [{ date: "2026-11-06 11:00:00", activity: "Picked up", location: "Bengaluru", "sr-status": 42 }] })
    assert.equal((await db.orders().findOne({ _id: orderId }))!.fulfillmentStatus, "shipped")
    const delivered = { awb: f.awb, shipment_status_id: 7, shipment_status: "DELIVERED", scans: [{ date: "2026-11-08 15:00:00", activity: "Delivered", location: "Bengaluru", "sr-status": 7 }] }
    await hook(delivered)
    const again = await hook(delivered)
    assert.equal(again.body.duplicate, true)
    const order = (await db.orders().findOne({ _id: orderId }))!
    assert.equal(order.fulfillmentStatus, "delivered")
    assert.equal(order.status, "completed", "paid and delivered")
    const completions = await db.statusEvents().countDocuments({ orderId, machine: "order", to: "completed" })
    assert.equal(completions, 1)
  })

  test("scenario 4: return, warehouse inspection restocks, refund closes it", async () => {
    const filed = await call("POST", `/store/customers/me/orders/${orderId}/returns`, { reason: "Too small" }, customer)
    assert.equal(filed.status, 201, JSON.stringify(filed.body))
    const early = await call("POST", `/warehouse/returns/${orderId}/inspect`, { warehouseId: "wh_blr", lines: [{ itemId: f.lines[0].itemId, quantity: 1, condition: "sellable" }] }, blrSup)
    assert.equal(early.status, 409, "not approved yet")
    assert.equal((await call("POST", `/admin/orders/${orderId}/return-request`, { action: "approve", reason: "Within window" }, owner)).status, 200)
    assert.equal((await call("POST", `/admin/orders/${orderId}/return-request`, { action: "approve", reason: "Twice" }, owner)).status, 409, "no duplicate transition")
    const sellableBefore = await variantStock("var_m")
    const inspect = await call("POST", `/warehouse/returns/${orderId}/inspect`, { warehouseId: "wh_blr", lines: [{ itemId: f.lines[0].itemId, quantity: 1, condition: "sellable", notes: "Tags intact" }] }, blrSup)
    assert.equal(inspect.status, 200, JSON.stringify(inspect.body))
    assert.equal(inspect.body.status, "inspected")
    assert.equal(await variantStock("var_m"), sellableBefore + 1, "sellable again only after inspection")
    const reasons = (await db.stockLedger().find({ "ref.id": orderId }).toArray()).map((r) => r.reason)
    assert.deepEqual(reasons, ["return_receive", "return_restock"])
    const refund = await call("POST", `/admin/orders/${orderId}/return-request`, { action: "refund", reason: "Return inspected" }, owner)
    assert.equal(refund.status, 200, JSON.stringify(refund.body))
    const order = (await db.orders().findOne({ _id: orderId }))!
    assert.equal(order.returnRequest?.status, "refunded")
    assert.equal(order.fulfillmentStatus, "returned")
    assert.equal(order.paymentStatus, "refunded")
  })
})

describe("scenario 2: COD order ships from Delhi", () => {
  test("allocated to the Delhi warehouse; delivered COD stays open until the cash is settled", async () => {
    const placed = await cod(await cart([{ variantId: "var_m", quantity: 1 }], delAddress))
    assert.equal(placed.status, 201, JSON.stringify(placed.body))
    const [f] = await fulfilmentsOf(placed.body.order.id)
    assert.equal(f!.warehouseId, "wh_del")
    assert.equal(f!.paymentMethod, "cod")
    const ready = await throughPacking(f!._id, delSup)
    assert.equal(stub.state.pickupLocations.get(ready.code), "DEL-Okhla")
    await call("POST", "/store/webhooks/courier-tracking", { awb: ready.awb, shipment_status_id: 7, shipment_status: "DELIVERED", scans: [] }, { "x-api-key": "stub-tracking-token" })
    const order = (await db.orders().findOne({ _id: placed.body.order.id }))!
    assert.equal(order.fulfillmentStatus, "delivered")
    assert.equal(order.paymentStatus, "awaiting")
    assert.equal(order.status, "pending")
  })
})

describe("allocation rules", () => {
  test("split fulfilment: one unit from each warehouse when neither holds both", async () => {
    const placed = await cod(await cart([{ variantId: "var_s", quantity: 2 }]))
    assert.equal(placed.status, 201, JSON.stringify(placed.body))
    const fs = await fulfilmentsOf(placed.body.order.id)
    assert.deepEqual(fs.map((f) => [f.warehouseId, f.lines[0]!.quantity]).sort(), [["wh_blr", 1], ["wh_del", 1]])
    assert.equal(await variantStock("var_s"), 0)
  })

  test("with split fulfilment off, an order no single warehouse can fill fails and rolls back", async () => {
    await receive(blrSup, "wh_blr", "var_s", 1)
    await receive(delSup, "wh_del", "var_s", 1)
    await db.settings().updateOne({ _id: "store" }, { $set: { allowSplitFulfilment: false } })
    try {
      const reservedBefore = (await level("wh_blr", "var_s")).reserved
      const cartId = await cart([{ variantId: "var_s", quantity: 2 }])
      const res = await cod(cartId)
      assert.equal(res.status, 409)
      assert.equal(res.body.error.code, "out_of_stock")
      assert.equal(await variantStock("var_s"), 2, "the sellable count was put back by the rollback")
      assert.equal((await level("wh_blr", "var_s")).reserved, reservedBefore)
      assert.equal(await db.orders().countDocuments({ cartId }), 0)
    } finally {
      await db.settings().updateOne({ _id: "store" }, { $set: { allowSplitFulfilment: true } })
    }
  })

  test("concurrent checkouts for the last unit: exactly one order, one reservation", async () => {
    const carts = await Promise.all(Array.from({ length: 6 }, () => cart([{ variantId: "var_xl", quantity: 1 }])))
    const results = await Promise.all(carts.map((c) => cod(c)))
    assert.equal(results.filter((r) => r.status === 201).length, 1, JSON.stringify(results.map((r) => r.status)))
    const l = await level("wh_blr", "var_xl")
    assert.equal(l.available, 0)
    assert.equal(l.reserved, 1)
    assert.equal(await variantStock("var_xl"), 0)
    assert.equal(await db.stockLedger().countDocuments({ variantId: "var_xl", reason: "reserve" }), 1)
  })

  test("a declined order moves to the next warehouse; its stock is released", async () => {
    await receive(delSup, "wh_del", "var_l", 2)
    const placed = await cod(await cart([{ variantId: "var_l", quantity: 1 }]))
    const [f] = await fulfilmentsOf(placed.body.order.id)
    assert.equal(f!.warehouseId, "wh_blr")
    const res = await call("POST", `/warehouse/fulfilments/${f!._id}/reject`, { reason: "Rack damaged, can't reach it" }, blrSup)
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.reallocated, true)
    assert.equal((await level("wh_blr", "var_l")).reserved, 0)
    const live = await db.fulfilments().find({ orderId: placed.body.order.id, active: true }).toArray()
    assert.deepEqual(live.map((x) => x.warehouseId), ["wh_del"])
    assert.equal((await level("wh_del", "var_l")).reserved, 1)
    assert.equal((await call("POST", `/warehouse/fulfilments/${f!._id}/accept`, {}, blrSup)).status, 409, "a rejected fulfilment is final")
  })

  test("admin override reassigns with an audit entry", async () => {
    const placed = await cod(await cart([{ variantId: "var_m", quantity: 1 }]))
    const [f] = await fulfilmentsOf(placed.body.order.id)
    const target = f!.warehouseId === "wh_blr" ? "wh_del" : "wh_blr"
    const res = await call("POST", `/admin/fulfilments/${f!._id}/reassign`, { warehouseId: target, reason: "Festival backlog at the first hub" }, owner)
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.fulfilment.warehouseId, target)
    assert.equal(res.body.fulfilment.assignment.method, "manual")
    assert.ok(await db.auditLogs().findOne({ action: "fulfilment.reassign", targetId: f!._id }))
  })

  test("cancelling an order releases its reservation exactly once", async () => {
    const before = await variantStock("var_m")
    const placed = await cod(await cart([{ variantId: "var_m", quantity: 2 }]))
    assert.equal(await variantStock("var_m"), before - 2)
    const res = await call("POST", `/admin/orders/${placed.body.order.id}/cancel`, {}, owner)
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(await variantStock("var_m"), before)
    const [f] = await fulfilmentsOf(placed.body.order.id)
    assert.equal(f!.status, "cancelled")
    assert.equal((await call("POST", `/admin/orders/${placed.body.order.id}/cancel`, {}, owner)).status, 409)
    assert.equal(await variantStock("var_m"), before)
  })

  test("a failed inspection writes the unit off as damaged and reserves a replacement", async () => {
    const placed = await cod(await cart([{ variantId: "var_l", quantity: 1 }]))
    const [f] = await fulfilmentsOf(placed.body.order.id)
    const wh = f!.warehouseId
    const sup = wh === "wh_blr" ? blrSup : delSup
    await call("POST", `/warehouse/fulfilments/${f!._id}/accept`, {}, sup)
    await call("POST", `/warehouse/fulfilments/${f!._id}/picking/start`, {}, sup)
    await call("POST", `/warehouse/fulfilments/${f!._id}/picking/scan`, { barcode: "EW-SH-L" }, sup)
    await call("POST", `/warehouse/fulfilments/${f!._id}/picking/complete`, {}, sup)
    const before = await level(wh, "var_l")
    const qc = await call("POST", `/warehouse/fulfilments/${f!._id}/qc`, { result: "failed", failures: [{ itemId: f!.lines[0]!.itemId, quantity: 1, reason: "Stain on the collar" }] }, sup)
    assert.equal(qc.status, 200, JSON.stringify(qc.body))
    assert.equal(qc.body.fulfilment.status, "picking_pending")
    const after = await level(wh, "var_l")
    assert.equal(after.damaged, before.damaged + 1)
    assert.equal(after.picked, before.picked - 1)
    if (before.available > 0) {
      assert.equal(after.reserved, before.reserved + 1)
      assert.equal(qc.body.fulfilment.lines[0].short, 0)
    } else {
      assert.equal(qc.body.fulfilment.lines[0].short, 1)
    }
  })
})

describe("floor app endpoints", () => {
  test("summary counts live work at one warehouse only", async () => {
    const res = await call("GET", "/warehouse/summary?warehouseId=wh_blr", undefined, blrSup)
    assert.equal(res.status, 200)
    const live = await db.fulfilments().countDocuments({ warehouseId: "wh_blr", active: true, status: { $ne: "dispatched" } })
    assert.equal(Object.values(res.body.byStatus as Record<string, number>).reduce((a, b) => a + b, 0), live)
    assert.ok(res.body.damagedUnits >= 1, "the QC write-off is on hold")
    assert.equal((await call("GET", "/warehouse/summary?warehouseId=wh_blr", undefined, delSup)).status, 404)
  })

  test("catalogue lookup finds a variant by scanned SKU, any case", async () => {
    const res = await call("GET", "/warehouse/catalog/lookup?sku=ew-sh-xxl", undefined, blrSup)
    assert.equal(res.status, 200)
    assert.equal(res.body.items[0].variantId, "var_xxl")
    assert.equal(res.body.items[0].prices, undefined, "no prices on the floor")
    assert.equal((await call("GET", "/warehouse/catalog/lookup?sku=EW-SH-.*", undefined, blrSup)).status, 404, "input is not a pattern")
  })

  test("stock rows carry titles; destinations need the stock permission", async () => {
    const stock = (await call("GET", "/warehouse/stock?warehouseId=wh_blr&sku=EW-SH-M", undefined, blrSup)).body.stock
    assert.equal(stock[0].productTitle, "Linen Shirt")
    assert.equal(stock[0].variantTitle, "M")
    assert.equal((await call("GET", "/warehouse/destinations", undefined, blrPicker)).status, 403)
    assert.deepEqual((await call("GET", "/warehouse/destinations", undefined, blrSup)).body.warehouses.map((w: Json) => w.code), ["BLR-FC1", "DEL-FC1"])
  })

  test("fulfilment detail includes the courier label", async () => {
    const f = (await db.fulfilments().findOne({ warehouseId: "wh_blr", status: "dispatched" }))!
    const res = await call("GET", `/warehouse/fulfilments/${f._id}`, undefined, blrSup)
    assert.equal(res.body.label.awb, f.awb)
    assert.ok(res.body.label.labelUrl)
  })
})

describe("access", () => {
  test("admin and warehouse tokens are not interchangeable", async () => {
    assert.equal((await call("GET", "/warehouse/fulfilments", undefined, owner)).status, 401)
    assert.equal((await call("GET", "/admin/fulfilments", undefined, blrSup)).status, 401)
    assert.equal((await call("GET", "/warehouse/fulfilments", undefined, customer)).status, 401)
  })

  test("a suspended account loses access on its next request", async () => {
    await db.warehouseUsers().updateOne({ _id: "whu_blr_pick" }, { $set: { status: "suspended" } })
    assert.equal((await call("GET", "/warehouse/me", undefined, blrPicker)).status, 401)
    await db.warehouseUsers().updateOne({ _id: "whu_blr_pick" }, { $set: { status: "active" } })
  })

  test("warehouse login works with the password and rejects a wrong one", async () => {
    assert.equal((await call("POST", "/warehouse/auth/login", { email: "whu_blr_sup@example.com", password: "wrong-password" })).status, 401)
    const ok = await call("POST", "/warehouse/auth/login", { email: "whu_blr_sup@example.com", password: "floor-password-1" })
    assert.equal(ok.status, 200)
    assert.equal((await call("GET", "/warehouse/me", undefined, bearer(ok.body.token))).body.user.warehouseIds[0], "wh_blr")
  })

  test("admins create warehouse staff; the password hash never leaves the API", async () => {
    const res = await call("POST", "/admin/warehouse-users", { email: "packer@example.com", name: "Packer One", role: "packer", warehouseIds: ["wh_blr"], password: "long-enough-pass" }, owner)
    assert.equal(res.status, 201)
    assert.equal(res.body.user.passwordHash, undefined)
    assert.equal((await call("POST", "/admin/warehouse-users", { email: "x@example.com", name: "X", role: "packer", warehouseIds: ["wh_nope"], password: "long-enough-pass" }, owner)).status, 400)
  })
})
