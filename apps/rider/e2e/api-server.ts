/*
 * The Everwear API for the rider browser tests: the real app on its own
 * throwaway database (everwear_e2e_rider, reset on start) and no courier
 * integration. Seeds a hub with a delivery zone, an approved rider (offline),
 * floor staff, stock, and two COD orders that go through the real warehouse
 * API: allocated, picked, packed, booked on our own fleet and handed over at
 * the dock, ready for the rider to collect.
 *
 * The customer's token is written to e2e/.state.json (git-ignored) so the
 * test can read the OTP the way the customer's order page does.
 */
import { writeFile } from "node:fs/promises"
import { createServer } from "node:http"

const PORT = Number(process.env.E2E_API_PORT ?? 9192)
const { default: webpush } = await import("web-push")
const vapid = webpush.generateVAPIDKeys()
Object.assign(process.env, {
  NODE_ENV: "test",
  MONGODB_DB: "everwear_e2e_rider",
  RIDER_CORS: "http://localhost:7201,http://127.0.0.1:7201",
  WAREHOUSE_CORS: "",
  STORE_CORS: "",
  ADMIN_CORS: "",
  SHIPPING_PROVIDER: "none",
  PRIVATE_UPLOADS_DIR: "/tmp/everwear-e2e-rider-private",
  VAPID_PUBLIC_KEY: vapid.publicKey,
  VAPID_PRIVATE_KEY: vapid.privateKey,
  RAZORPAY_KEY_ID: "",
  RAZORPAY_KEY_SECRET: "",
})

const { connect, getDb } = await import("../../backend/src/db/client.ts")
const { db, ensureIndexes } = await import("../../backend/src/db/schema.ts")
const { hashPassword, issueToken } = await import("../../backend/src/lib/auth.ts")
const { createApp } = await import("../../backend/src/app.ts")

await connect()
if (!getDb().databaseName.includes("e2e")) throw new Error("Refusing to reset a non-e2e database")
await getDb().dropDatabase()
await ensureIndexes()

const now = new Date()
await db.regions().insertOne({ _id: "reg_in", name: "India", currency: "inr", countries: [{ code: "in", name: "India" }], taxRate: 12, taxInclusive: true, shippingOptions: [{ _id: "so_std", name: "Standard Delivery", amount: 0 }], createdAt: now, updatedAt: now } as never)
await db.products().insertOne({
  _id: "prod_tee",
  handle: "organic-tee",
  title: "Organic Cotton Tee",
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
await db.warehouses().deleteMany({})
await db.warehouses().insertOne({ _id: "wh_blr", code: "BLR-FC1", name: "Bengaluru Hub", city: "Bengaluru", state: "Karnataka", pincode: "560068", address: "Hosur Road", lat: 12.9, lng: 77.62, status: "active", isDefault: true, createdAt: now, updatedAt: now } as never)
await db.deliveryZones().insertOne({ _id: "zone_east", code: "BLR-EAST", name: "Bengaluru East", warehouseId: "wh_blr", pincodes: ["560038", "560008"], codAllowed: true, active: true, createdAt: now, updatedAt: now })
await db.warehouseUsers().insertOne({ _id: "whu_sup", email: "sup@everwear.test", passwordHash: "x", name: "Hub Supervisor", role: "supervisor", warehouseIds: ["wh_blr"], status: "active", createdAt: now, updatedAt: now } as never)
await db.customers().insertOne({ _id: "cus_1", email: "aarav@example.com", addresses: [], createdAt: now, updatedAt: now })
await db.settings().insertOne({ _id: "store", storeName: "Everwear", lowStockThreshold: 3, updatedAt: now } as never)
await db.riders().insertOne({
  _id: "rdr_ravi",
  email: "ravi@everwear.test",
  phone: "9000000001",
  name: "Ravi Kumar",
  passwordHash: await hashPassword("rider-password-1"),
  status: "approved",
  vehicle: { type: "bike", registration: "KA01AB1234" },
  documents: [
    { type: "driving_licence", number: "KA0120190001234", verified: true },
    { type: "aadhaar", number: "123456789012", verified: true },
  ],
  warehouseId: "wh_blr",
  zoneIds: ["zone_east"],
  shifts: [],
  online: false,
  lastLocation: null,
  createdAt: now,
  updatedAt: now,
} as never)

// Seed through a private port first; the public port (and its /health, which
// Playwright waits on) opens only once everything is in place.
const app = createApp()
const seeder = createServer(app)
await new Promise<void>((resolve) => seeder.listen(0, "127.0.0.1", () => resolve()))
const base = `http://127.0.0.1:${(seeder.address() as import("node:net").AddressInfo).port}`
const sup = { authorization: `Bearer ${issueToken("warehouse", "whu_sup")}` }
const customerToken = issueToken("customer", "cus_1")
const customer = { authorization: `Bearer ${customerToken}` }
const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const res = await fetch(base + path, { method, headers: { "content-type": "application/json", ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const json = (await res.json()) as Record<string, any>
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(json)}`)
  return json
}

await call("POST", "/warehouse/stock/operations", { type: "receive", warehouseId: "wh_blr", variantId: "var_m", quantity: 10 }, sup)

const orders: { id: string; displayId: number; awb: string; total: number }[] = []
for (const [line1, name] of [["12 CMH Road, Indiranagar", "Aarav"], ["7 Old Madras Road, Ulsoor", "Meera"]] as const) {
  const address = { firstName: name, lastName: "Sharma", address1: line1, city: "Bengaluru", postalCode: "560038", province: "Karnataka", countryCode: "in", phone: "+91 9886012345" }
  const cart = (await call("POST", "/store/carts", { country: "in" }, customer)).cart
  await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_m", quantity: 1 }, customer)
  await call("PATCH", `/store/carts/${cart.id}`, { email: "aarav@example.com", shippingAddress: address, billingAddress: address }, customer)
  await call("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" }, customer)
  const { order } = await call("POST", `/store/carts/${cart.id}/complete`, undefined, customer)
  const f = (await db.fulfilments().findOne({ orderId: order.id }))!
  for (const step of ["accept", "picking/start"]) await call("POST", `/warehouse/fulfilments/${f._id}/${step}`, {}, sup)
  await call("POST", `/warehouse/fulfilments/${f._id}/picking/scan`, { barcode: "EW-TEE-M" }, sup)
  await call("POST", `/warehouse/fulfilments/${f._id}/picking/complete`, {}, sup)
  await call("POST", `/warehouse/fulfilments/${f._id}/qc`, { result: "passed" }, sup)
  const packed = (await call("POST", `/warehouse/fulfilments/${f._id}/pack`, { orderCode: f.code, scans: ["EW-TEE-M"], weightKg: 0.4, lengthCm: 30, breadthCm: 25, heightCm: 4 }, sup)).fulfilment
  const labelled = (await call("POST", `/warehouse/fulfilments/${f._id}/label`, { packageCode: packed.package.code, ownFleet: true }, sup)).fulfilment
  await call("POST", `/warehouse/fulfilments/${f._id}/label/verify`, { awb: labelled.awb }, sup)
  orders.push({ id: order.id, displayId: order.displayId, awb: labelled.awb, total: order.totals.total })
}
const manifest = (await call("POST", "/warehouse/manifests", { warehouseId: "wh_blr", carrier: "Everwear Fleet" }, sup)).manifest
for (const o of orders) await call("POST", `/warehouse/manifests/${manifest._id}/scan`, { awb: o.awb }, sup)
await call("POST", `/warehouse/manifests/${manifest._id}/close`, { courierExecutive: "Ravi Kumar" }, sup)

seeder.close()
const server = createServer(app)
await new Promise<void>((resolve) => server.listen(PORT, "127.0.0.1", () => resolve()))
await writeFile(new URL("./.state.json", import.meta.url), JSON.stringify({ api: `http://127.0.0.1:${PORT}`, customerToken, orders }, null, 2))
console.log(`e2e rider API ready on port ${PORT}: ${orders.map((o) => o.awb).join(", ")}`)

process.on("SIGTERM", () => {
  server.close()
  process.exit(0)
})
process.on("SIGINT", () => process.exit(0))
