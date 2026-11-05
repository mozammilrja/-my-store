import assert from "node:assert/strict"
import crypto from "node:crypto"
import { after, before, describe, test } from "node:test"
import { createProviderStub } from "./provider-stub.js"

/*
 * The marketplace end to end over HTTP: two sellers (one ships their own
 * orders, the store ships for the other), KYC and approval, listings and
 * review, stock at the seller's location and by advance shipping notice into
 * a store warehouse, a mixed order split by who ships it with an invoice per
 * issuer, the seller's own fulfilment, the money ledger on delivery,
 * settlement and payout, a returned item reversing the seller's lines,
 * performance, suspension, and who can see what.
 */
const stub = createProviderStub()
const stubUrl = await stub.start()
Object.assign(process.env, {
  MONGODB_DB: "everwear_test_marketplace",
  NODE_ENV: "test",
  RAZORPAY_KEY_ID: "rzp_test_stubkey",
  RAZORPAY_KEY_SECRET: "stub_key_secret_for_tests_only",
  RAZORPAY_WEBHOOK_SECRET: "stub_webhook_secret",
  RAZORPAY_API_BASE: stubUrl,
  SHIPPING_PROVIDER: "none",
})

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { issueToken } = await import("../src/lib/auth.js")
const { paidShare } = await import("../src/lib/returns/returns.js")
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
const finance = bearer(issueToken("admin", "admin_finance"))
const staff = bearer(issueToken("admin", "admin_staff"))
const sup = bearer(issueToken("warehouse", "whu_sup"))
const customer = bearer(issueToken("customer", "cus_1"))

const address = { firstName: "Kavya", lastName: "Rao", address1: "9 Lavelle Road", city: "Bengaluru", postalCode: "560001", province: "Karnataka", countryCode: "in", phone: "+91 9886077777" }
const kyc = (pan: string, gstin: string | null) => ({
  businessType: "proprietorship",
  legalName: "Kavya Textiles",
  pan,
  gstin,
  registeredAddress: { line1: "14 Commercial Street", city: "Bengaluru", state: "Karnataka", postalCode: "560001" },
  bank: { accountName: "Kavya Textiles", accountNumber: "50100123456789", ifsc: "HDFC0001234" },
  pickupAddress: { line1: "14 Commercial Street", city: "Bengaluru", state: "Karnataka", postalCode: "560001", phone: "9845011111" },
})
const listing = (sku: string, price: number) => ({
  title: `Handblock Kurta ${sku}`,
  description: "Cotton, hand block printed.",
  categoryIds: ["cat_kurtas"],
  images: ["/uploads/products/abc123.jpg"],
  options: [{ title: "Size", values: ["M"] }],
  variants: [{ sku, options: { Size: "M" }, price }],
})

let a: { token: Record<string, string>; id: string; listingId: string; variantId: string } = {} as never
let b: { token: Record<string, string>; id: string; listingId: string; variantId: string } = {} as never
let order: Json

async function walkWarehouse(fulfilmentId: string, headers: Record<string, string>) {
  const f = (await db.fulfilments().findOne({ _id: fulfilmentId }))!
  for (const step of ["accept", "picking/start"]) assert.equal((await call("POST", `/warehouse/fulfilments/${f._id}/${step}`, {}, headers)).status, 200)
  for (const l of f.lines) await call("POST", `/warehouse/fulfilments/${f._id}/picking/scan`, { barcode: l.sku, quantity: l.quantity }, headers)
  await call("POST", `/warehouse/fulfilments/${f._id}/picking/complete`, {}, headers)
  await call("POST", `/warehouse/fulfilments/${f._id}/qc`, { result: "passed" }, headers)
  const p = (await call("POST", `/warehouse/fulfilments/${f._id}/pack`, { orderCode: f.code, scans: f.lines.flatMap((l) => Array(l.quantity).fill(l.sku)), weightKg: 0.5, lengthCm: 30, breadthCm: 20, heightCm: 5 }, headers)).body.fulfilment
  const l = (await call("POST", `/warehouse/fulfilments/${f._id}/label`, { packageCode: p.package.code, manual: { carrier: "Delhivery", awb: `DLV${f.displayId}${f._id.slice(-4)}` } }, headers)).body.fulfilment
  await call("POST", `/warehouse/fulfilments/${f._id}/label/verify`, { awb: l.awb }, headers)
  return l
}
const deliver = async (shipmentId: string) => {
  assert.equal((await call("POST", `/admin/shipments/${shipmentId}/status`, { status: "in_transit", note: "Picked up" }, owner)).status, 200)
  assert.equal((await call("POST", `/admin/shipments/${shipmentId}/status`, { status: "delivered", note: "Courier confirmed delivery" }, owner)).status, 200)
}

before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()
  const now = new Date()
  await db.regions().insertOne({ _id: "reg_in", name: "India", currency: "inr", countries: [{ code: "in", name: "India" }], taxRate: 12, taxInclusive: true, shippingOptions: [{ _id: "so_std", name: "Standard Delivery", amount: 9900 }], policies: { returnWindowDays: 15, freeReturns: true, shippingRate: 0, handlingDays: { min: 1, max: 2 }, transitDays: { min: 2, max: 5 } }, createdAt: now, updatedAt: now } as never)
  await db.categories().insertOne({ _id: "cat_kurtas", name: "Kurtas", handle: "kurtas", createdAt: now, updatedAt: now } as never)
  await db.products().insertOne({ _id: "prod_store", handle: "store-tee", title: "Store Tee", status: "published", images: [], categoryIds: [], collectionId: null, tags: [], options: [{ title: "Size", values: ["M"] }], variants: [{ _id: "var_store", sku: "EW-TEE-M", title: "M", options: { Size: "M" }, prices: { inr: 100000 }, manageInventory: true, allowBackorder: false, stock: 0 }], createdAt: now, updatedAt: now } as never)
  await db.adminUsers().insertMany([
    { _id: "admin_owner", email: "owner@example.com", passwordHash: "x", role: "owner", createdAt: now, updatedAt: now },
    { _id: "admin_finance", email: "fin@example.com", passwordHash: "x", role: "finance_manager", createdAt: now, updatedAt: now },
    { _id: "admin_staff", email: "staff@example.com", passwordHash: "x", role: "staff", createdAt: now, updatedAt: now },
  ] as never)
  await db.customers().insertOne({ _id: "cus_1", email: "kavya@example.com", addresses: [], createdAt: now, updatedAt: now })
  await db.warehouses().deleteMany({})
  await db.warehouses().insertOne({ _id: "wh_blr", code: "BLR-FC1", name: "Bengaluru FC", city: "Bengaluru", state: "Karnataka", pincode: "560068", address: "Hosur Road", status: "active", isDefault: true, createdAt: now, updatedAt: now } as never)
  await db.warehouseUsers().insertOne({ _id: "whu_sup", email: "sup@example.com", passwordHash: "x", name: "Sup", role: "supervisor", warehouseIds: ["wh_blr"], status: "active", createdAt: now, updatedAt: now } as never)
  await db.settings().insertOne({ _id: "store", storeName: "Everwear", lowStockThreshold: 3, updatedAt: now } as never)
  assert.equal((await call("POST", "/warehouse/stock/operations", { type: "receive", warehouseId: "wh_blr", variantId: "var_store", quantity: 10 }, sup)).status, 201)
})

after(async () => {
  await getDb().dropDatabase()
  await close()
  await disconnect()
  await stub.close()
})

describe("onboarding", () => {
  test("a seller signs up and their KYC is checked as it's entered", async () => {
    const reg = await call("POST", "/seller/auth/register", { email: "kavya@textiles.in", phone: "98450 11111", displayName: "Kavya Textiles", password: "a-long-password", fulfilmentModel: "seller" })
    assert.equal(reg.status, 201)
    assert.equal(reg.body.seller.status, "draft")
    a.token = bearer(reg.body.token)
    a.id = reg.body.seller._id
    assert.equal((await call("PUT", "/seller/me/kyc", kyc("ABCDE1234F", null), a.token)).body.error.code, "invalid_pan", "4th letter must be a holder type")
    assert.equal((await call("PUT", "/seller/me/kyc", kyc("AAPFU0939F", "27AAPFU0939F1ZW"), a.token)).body.error.code, "invalid_gstin", "bad check character")
    assert.equal((await call("PUT", "/seller/me/kyc", kyc("AAPPK1234L", "27AAPFU0939F1ZV"), a.token)).body.error.code, "gstin_pan_mismatch")
    const ok = await call("PUT", "/seller/me/kyc", kyc("AAPFU0939F", "27AAPFU0939F1ZV"), a.token)
    assert.equal(ok.status, 200, JSON.stringify(ok.body))
    assert.deepEqual(ok.body.seller.bank, { accountName: "Kavya Textiles", ifsc: "HDFC0001234", last4: "6789" })
    assert.equal(JSON.stringify(await db.sellers().findOne({ _id: a.id })).includes("50100123456789"), false, "account number stored encrypted")
    assert.equal((await call("POST", "/seller/me/kyc/submit", {}, a.token)).body.seller.status, "submitted")
    assert.equal((await call("PUT", "/seller/me/kyc", { legalName: "Changed" }, a.token)).body.error.code, "kyc_locked")
  })

  test("approval needs each item verified; the bank number is shown only to finance, audited", async () => {
    assert.equal((await call("POST", `/admin/sellers/${a.id}/approve`, {}, owner)).body.error.code, "kyc_unverified")
    for (const item of ["pan", "gstin", "bank"]) assert.equal((await call("POST", `/admin/sellers/${a.id}/verify/${item}`, {}, owner)).status, 200)
    assert.equal((await call("GET", `/admin/sellers/${a.id}/bank`, undefined, staff)).status, 403)
    assert.equal((await call("GET", `/admin/sellers/${a.id}/bank`, undefined, finance)).body.accountNumber, "50100123456789")
    assert.ok(await db.auditLogs().findOne({ action: "seller.bank_viewed", targetId: a.id }))
    const appr = await call("POST", `/admin/sellers/${a.id}/approve`, { commissionPct: 12 }, owner)
    assert.equal(appr.status, 200, JSON.stringify(appr.body))
    const wh = (await db.warehouses().findOne({ sellerId: a.id }))!
    assert.equal(wh.pincode, "560001")
    assert.equal(wh.gstin, "27AAPFU0939F1ZV")
    assert.equal(appr.body.seller.warehouseId, wh._id)
  })

  test("a store-fulfilled seller without a GSTIN", async () => {
    const reg = await call("POST", "/seller/auth/register", { email: "ravi@crafts.in", phone: "98450 22222", displayName: "Ravi Crafts", password: "a-long-password", fulfilmentModel: "platform" })
    b.token = bearer(reg.body.token)
    b.id = reg.body.seller._id
    const k = kyc("BBBPR1234C", null)
    delete (k as Json).pickupAddress
    assert.equal((await call("PUT", "/seller/me/kyc", { ...k, legalName: "Ravi Crafts" }, b.token)).status, 200)
    await call("POST", "/seller/me/kyc/submit", {}, b.token)
    for (const item of ["pan", "bank"]) await call("POST", `/admin/sellers/${b.id}/verify/${item}`, {}, owner)
    assert.equal((await call("POST", `/admin/sellers/${b.id}/approve`, {}, owner)).status, 200)
    assert.equal((await db.sellers().findOne({ _id: b.id }))!.warehouseId ?? null, null, "no location of their own")
  })
})

describe("listings and stock", () => {
  test("listings go live only after review; SKUs are unique across the catalogue", async () => {
    assert.equal((await call("POST", "/seller/listings", listing("EW-TEE-M", 150000), a.token)).body.error.code, "duplicate_sku")
    const la = await call("POST", "/seller/listings", listing("KAV-KUR-M", 200000), a.token)
    assert.equal(la.status, 201, JSON.stringify(la.body))
    a.listingId = la.body.listing.id
    a.variantId = la.body.listing.variants[0].id
    assert.equal(la.body.listing.status, "draft")
    assert.equal((await call("POST", `/seller/listings/${a.listingId}/submit`, {}, a.token)).body.listing.review.status, "pending")
    assert.equal((await call("POST", `/admin/listings/${a.listingId}/reject`, {}, owner)).status, 400, "a rejection says why")
    assert.equal((await call("POST", `/admin/listings/${a.listingId}/approve`, {}, owner)).body.listing.status, "published")
    const lb = await call("POST", "/seller/listings", listing("RAV-KUR-M", 150000), b.token)
    b.listingId = lb.body.listing.id
    b.variantId = lb.body.listing.variants[0].id
    await call("POST", `/seller/listings/${b.listingId}/submit`, {}, b.token)
    await call("POST", `/admin/listings/${b.listingId}/approve`, {}, owner)
    assert.equal((await call("GET", `/seller/listings/${a.listingId}`, undefined, b.token)).status, 404, "another seller's listing")
  })

  test("a live listing can change its price but not its wording", async () => {
    const changed = await call("PUT", `/seller/listings/${a.listingId}`, { ...listing("KAV-KUR-M", 200000), title: "Renamed" }, a.token)
    assert.equal(changed.body.error.code, "listing_live")
    assert.equal((await call("PUT", `/seller/listings/${a.listingId}`, listing("KAV-KUR-M", 210000), a.token)).status, 200)
    await call("PUT", `/seller/listings/${a.listingId}`, listing("KAV-KUR-M", 200000), a.token)
  })

  test("the self-shipping seller stocks their location; the other sends stock to a store warehouse", async () => {
    assert.equal((await call("POST", "/seller/stock/operations", { type: "receive", variantId: a.variantId, quantity: 5 }, a.token)).status, 201)
    assert.equal((await call("POST", "/seller/stock/operations", { type: "receive", variantId: b.variantId, quantity: 5 }, b.token)).body.error.code, "platform_fulfilled")
    const asn = await call("POST", "/seller/inbound", { warehouseId: "wh_blr", lines: [{ variantId: b.variantId, quantity: 4 }] }, b.token)
    assert.equal(asn.status, 201, JSON.stringify(asn.body))
    await call("POST", `/seller/inbound/${asn.body.shipment._id}/shipped`, { carrier: "DTDC", awb: "D998877" }, b.token)
    const code = asn.body.shipment.code
    assert.equal((await call("POST", `/warehouse/inbound/${code}/receive`, { counts: [{ variantId: b.variantId, quantity: 5 }] }, sup)).status, 400, "more than announced")
    assert.equal((await call("POST", `/warehouse/inbound/${code}/receive`, { counts: [{ variantId: b.variantId, quantity: 3 }] }, sup)).body.shipment.status, "receiving")
    assert.equal((await call("POST", `/warehouse/inbound/${code}/receive`, { counts: [], close: true }, sup)).body.shipment.status, "closed", "closed one short")
    const stockB = (await call("GET", "/seller/stock", undefined, b.token)).body.stock[0]
    assert.equal(stockB.available, 3)
    assert.deepEqual(stockB.warehouses, [{ code: "BLR-FC1", available: 3 }])
    assert.equal((await call("GET", "/seller/stock", undefined, a.token)).body.stock[0].available, 5)
  })
})

describe("a mixed order", () => {
  test("split by who ships it, with one invoice per issuer that adds up to the order", async () => {
    const cart = (await call("POST", "/store/carts", { country: "in" }, customer)).body.cart
    for (const v of ["var_store", a.variantId, b.variantId]) assert.equal((await call("POST", `/store/carts/${cart.id}/items`, { variantId: v, quantity: 1 }, customer)).status, 200)
    await call("PATCH", `/store/carts/${cart.id}`, { email: "kavya@example.com", shippingAddress: address, billingAddress: address }, customer)
    await call("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" }, customer)
    const intent = (await call("POST", `/store/carts/${cart.id}/payment-intent`, { provider: "razorpay" }, customer)).body
    const p = stub.pay(intent.razorpayOrderId)
    const sig = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${intent.razorpayOrderId}|${p.id}`).digest("hex")
    const placed = await call("POST", `/store/carts/${cart.id}/confirm-payment`, { provider: "razorpay", razorpayOrderId: intent.razorpayOrderId, razorpayPaymentId: p.id, razorpaySignature: sig }, customer)
    assert.equal(placed.status, 201, JSON.stringify(placed.body))
    order = placed.body.order
    const fs = await db.fulfilments().find({ orderId: order.id }).toArray()
    const sellerWh = (await db.sellers().findOne({ _id: a.id }))!.warehouseId
    assert.deepEqual(fs.map((f) => [f.warehouseId, f.lines.map((l) => l.sku).sort()]).sort(), [
      [sellerWh, ["KAV-KUR-M"]],
      ["wh_blr", ["EW-TEE-M", "RAV-KUR-M"]],
    ].sort())
    const invoices = await db.invoices().find({ orderId: order.id }).toArray()
    assert.equal(invoices.length, 3)
    assert.equal(invoices.reduce((n, i) => n + i.grandTotal, 0), order.totals.total, "invoices add up to the order")
    const kav = invoices.find((i) => i.sellerId === a.id)!
    assert.match(kav.invoiceNumber, /^SEL-0001\/INV-/)
    assert.equal(kav.issuer?.gstin, "27AAPFU0939F1ZV")
    assert.deepEqual(kav.items.map((i) => i.name), ["Handblock Kurta KAV-KUR-M (M)"])
    const store = invoices.find((i) => !i.sellerId)!
    assert.ok(store.items.some((i) => i.sku === "DELIVERY"), "delivery on the store's invoice")
    const inv = await call("GET", `/store/orders/${order.id}/invoice`, undefined, customer)
    assert.equal(inv.body.invoice.id, store._id)
    assert.equal(inv.body.sellerInvoices.length, 2)
  })

  test("the seller ships their part: accept, pack, address only once packed, ship, hand over", async () => {
    const mine = (await call("GET", "/seller/orders", undefined, a.token)).body.orders
    assert.equal(mine.length, 1)
    const id = mine[0]._id
    assert.equal((await call("GET", `/seller/orders/${id}`, undefined, a.token)).body.shipTo, null, "no address before packing")
    assert.equal((await call("GET", `/seller/orders/${id}`, undefined, b.token)).status, 409, "the other seller doesn't ship their own")
    assert.equal((await call("POST", `/seller/orders/${id}/pack`, { weightKg: 0.4, lengthCm: 30, breadthCm: 20, heightCm: 4 }, a.token)).body.error.code, "not_accepted")
    assert.equal((await call("POST", `/seller/orders/${id}/accept`, {}, a.token)).status, 200)
    const packed = await call("POST", `/seller/orders/${id}/pack`, { weightKg: 0.4, lengthCm: 30, breadthCm: 20, heightCm: 4 }, a.token)
    assert.equal(packed.body.order.status, "packed", JSON.stringify(packed.body))
    const detail = (await call("GET", `/seller/orders/${id}`, undefined, a.token)).body
    assert.equal(detail.shipTo.postalCode, "560001")
    assert.equal(JSON.stringify(detail).includes("9886077777"), false, "never the customer's phone")
    // After allocation at checkout (by the customer's order), every step is the seller's.
    assert.deepEqual([...new Set(detail.history.filter((e: Json) => e.to !== "assigned").map((e: Json) => e.actor.type))], ["seller"])
    const shipped = await call("POST", `/seller/orders/${id}/ship`, { manual: { carrier: "Delhivery", awb: "DLVKAV0001" } }, a.token)
    assert.equal(shipped.body.order.status, "ready_to_dispatch", JSON.stringify(shipped.body))
    const handed = await call("POST", "/seller/handover", { carrier: "Delhivery", courierExecutive: "Suresh (Delhivery)" }, a.token)
    assert.equal(handed.body.manifest.status, "closed")
    assert.equal((await db.fulfilments().findOne({ _id: id }))!.status, "dispatched")
    assert.equal((await db.stockLevels().findOne({ variantId: a.variantId }))!.dispatchedTotal, 1)
  })

  test("delivered: each seller's ledger gets the sale, fees and deductions, once", async () => {
    const sellerShip = (await db.shipments().findOne({ awb: "DLVKAV0001" }))!
    await deliver(sellerShip._id)
    const storeF = (await db.fulfilments().findOne({ orderId: order.id, warehouseId: "wh_blr" }))!
    const l = await walkWarehouse(storeF._id, sup)
    await deliver(l.shipmentId)
    await call("POST", `/admin/shipments/${sellerShip._id}/status`, { status: "delivered", note: "Repeated" }, owner)

    const o = (await db.orders().findOne({ _id: order.id }))!
    const kavItem = o.items.find((i) => i.variantId === a.variantId)!
    const sale = paidShare(o, kavItem._id, 1)
    const taxable = Math.round((sale * 100) / 112)
    const linesA = await db.sellerLedger().find({ sellerId: a.id }).toArray()
    const byKind = Object.fromEntries(linesA.map((x) => [x.kind, x.amount]))
    assert.deepEqual(byKind, {
      sale,
      commission: -Math.round(sale * 0.12),
      commission_gst: -Math.round(Math.round(sale * 0.12) * 0.18),
      tcs: -Math.round(taxable * 0.005),
      tds: -Math.round(sale * 0.001),
    })
    assert.equal(sale, 200000, "the item's price, without the delivery charge (no discount on this order)")
    const linesB = await db.sellerLedger().find({ sellerId: b.id }).toArray()
    assert.equal(linesB.find((x) => x.kind === "fulfilment_fee")!.amount, -3000, "the store shipped for them")
    assert.equal(linesB.find((x) => x.kind === "commission")!.amount, -Math.round(linesB.find((x) => x.kind === "sale")!.amount * 0.15))
    assert.ok(linesA.every((x) => x.status === "pending" && x.payableFrom > new Date(Date.now() + 14 * 86_400_000)), "payable after the return window")
  })
})

describe("money", () => {
  test("nothing settles inside the return window; afterwards each seller gets one settlement, once", async () => {
    assert.equal((await call("POST", "/admin/settlements/run", {}, finance)).body.settlements.length, 0)
    await db.sellerLedger().updateMany({}, { $set: { payableFrom: new Date(Date.now() - 1000) } })
    assert.equal((await call("POST", "/admin/settlements/run", {}, staff)).status, 403)
    const run = await call("POST", "/admin/settlements/run", {}, finance)
    assert.equal(run.body.settlements.length, 2)
    const sa = run.body.settlements.find((s: Json) => s.sellerId === a.id)
    const ledgerA = await db.sellerLedger().find({ sellerId: a.id }).toArray()
    assert.equal(sa.net, ledgerA.reduce((n, x) => n + x.amount, 0))
    assert.ok(ledgerA.every((x) => x.status === "settled" && x.settlementId === sa._id))
    assert.equal((await call("POST", "/admin/settlements/run", {}, finance)).body.settlements.length, 0, "no double payout")
    assert.equal((await call("POST", `/admin/settlements/${sa._id}/paid`, { utr: "123" }, finance)).status, 400)
    assert.equal((await call("POST", `/admin/settlements/${sa._id}/paid`, { utr: "HDFCR52026110512345" }, finance)).body.settlement.status, "paid")
    const bal = (await call("GET", "/seller/balance", undefined, a.token)).body
    assert.equal(bal.paidOut, sa.net)
    assert.equal((await call("GET", "/seller/settlements", undefined, a.token)).body.settlements[0].payout.utr, "HDFCR52026110512345")
  })

  test("a returned seller item: the seller inspects it, stock comes back, the refund reverses their lines", async () => {
    const kavItem = order.items.find((i: Json) => i.productTitle.includes("KAV"))
    const ret = await call("POST", "/store/customers/me/returns", { orderId: order.id, type: "return", method: "self_ship", items: [{ itemId: kavItem.id, quantity: 1, reason: "too_small" }] }, customer)
    assert.equal(ret.status, 201, JSON.stringify(ret.body))
    const id = ret.body.return.id
    await call("POST", `/admin/returns/${id}/approve`, {}, owner)
    await call("POST", `/store/customers/me/returns/${id}/ship`, { carrier: "India Post", awb: "EZ555666777IN" }, customer)
    assert.deepEqual((await call("GET", "/seller/returns", undefined, a.token)).body.returns.map((r: Json) => r.code), [ret.body.return.code])
    assert.equal((await call("GET", "/seller/returns", undefined, b.token)).body.returns.length, 0)
    const insp = await call("POST", `/seller/returns/${id}/inspect`, { lines: [{ itemId: kavItem.id, quantity: 1, condition: "sellable" }] }, a.token)
    assert.equal(insp.status, 200, JSON.stringify(insp.body))
    assert.equal((await call("GET", "/seller/stock", undefined, a.token)).body.stock[0].available, 5, "back on the seller's shelf")
    const refund = await call("POST", `/admin/returns/${id}/refund`, {}, owner)
    assert.equal(refund.body.return.status, "refunded", JSON.stringify(refund.body))
    const reversals = await db.sellerLedger().find({ sellerId: a.id, reversal: true }).toArray()
    assert.deepEqual(reversals.map((x) => x.kind).sort(), ["commission", "commission_gst", "sale", "tcs", "tds"])
    const original = await db.sellerLedger().find({ sellerId: a.id, reversal: false }).toArray()
    assert.equal(reversals.reduce((n, x) => n + x.amount, 0), -original.reduce((n, x) => n + x.amount, 0), "fully reversed")
    assert.ok(reversals.every((x) => x.status === "pending"), "taken from the next settlement")
  })

  test("performance from what's recorded", async () => {
    const perf = (await call("GET", "/seller/performance", undefined, a.token)).body
    assert.equal(perf.fulfilment.orders, 1)
    assert.equal(perf.fulfilment.accepted, 1)
    assert.equal(perf.fulfilment.acceptedLate, 0)
    assert.equal(perf.fulfilment.dispatched, 1)
    assert.equal(perf.sales.unitsSold, 1)
    assert.equal(perf.sales.unitsReturned, 1)
    assert.equal(perf.sales.returnRate, 100)
    assert.equal((await call("GET", `/admin/sellers/${b.id}/performance`, undefined, owner)).body.fulfilment, null, "the store ships for them")
  })
})

describe("suspension and access", () => {
  test("a suspended seller's listings come off sale and they can't work; reapproval restores them", async () => {
    assert.equal((await call("POST", `/admin/sellers/${a.id}/suspend`, { reason: "Late dispatches" }, owner)).status, 200)
    assert.equal((await db.products().findOne({ _id: a.listingId }))!.status, "draft")
    assert.equal((await db.warehouses().findOne({ sellerId: a.id }))!.acceptsOrders, false)
    assert.equal((await call("GET", "/seller/orders", undefined, a.token)).status, 403)
    assert.equal((await call("GET", "/seller/me", undefined, a.token)).status, 200, "they can still sign in and see why")
    assert.equal((await call("POST", `/admin/sellers/${a.id}/approve`, {}, owner)).status, 200)
    assert.equal((await db.products().findOne({ _id: a.listingId }))!.status, "published")
    assert.equal((await db.warehouses().findOne({ sellerId: a.id }))!.acceptsOrders, true)
  })

  test("seller, admin and customer tokens don't cross", async () => {
    assert.equal((await call("GET", "/seller/me", undefined, owner)).status, 401)
    assert.equal((await call("GET", "/admin/sellers", undefined, a.token)).status, 401)
    assert.equal((await call("GET", "/seller/me", undefined, customer)).status, 401)
    assert.equal((await call("GET", "/warehouse/fulfilments", undefined, a.token)).status, 401)
  })
})
