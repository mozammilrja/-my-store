/*
 * The Everwear API for the warehouse browser tests: the real app on its own
 * throwaway database (everwear_e2e_warehouse, dropped on start), with the
 * local Razorpay/Shiprocket stand-in from the backend tests in front of the
 * courier calls. Seeds two warehouses, floor staff, stock received through
 * the stock ledger, one COD order placed through the store API (so it is
 * allocated exactly as in production) and one delivered order with an
 * approved return waiting at the dock.
 *
 * Run by playwright.config.ts with the backend's .env for MONGODB_URI and
 * JWT_SECRET.
 */
import { createServer } from "node:http"
import { createProviderStub } from "../../backend/test/provider-stub.ts"

const stub = createProviderStub()
const stubUrl = await stub.start()
const PORT = Number(process.env.E2E_API_PORT ?? 9191)
Object.assign(process.env, {
  NODE_ENV: "test",
  MONGODB_DB: "everwear_e2e_warehouse",
  WAREHOUSE_CORS: "http://localhost:7101,http://127.0.0.1:7101",
  STORE_CORS: "",
  ADMIN_CORS: "",
  SHIPPING_PROVIDER: "shiprocket",
  SHIPROCKET_EMAIL: "ops@example.com",
  SHIPROCKET_PASSWORD: "stub-password",
  SHIPROCKET_PICKUP_LOCATION: "Primary",
  SHIPROCKET_WEBHOOK_TOKEN: "stub-tracking-token",
  SHIPROCKET_API_BASE: stubUrl,
  SHIPPING_ORIGIN_PINCODE: "560001",
  RAZORPAY_KEY_ID: "",
  RAZORPAY_KEY_SECRET: "",
})

const { connect, getDb, withTransaction } = await import("../../backend/src/db/client.ts")
const { db, ensureIndexes } = await import("../../backend/src/db/schema.ts")
const { hashPassword } = await import("../../backend/src/lib/auth.ts")
const { moveStock } = await import("../../backend/src/lib/inventory/stock.ts")
const { createApp } = await import("../../backend/src/app.ts")

await connect()
if (!getDb().databaseName.includes("e2e")) throw new Error("Refusing to reset a non-e2e database")
await getDb().dropDatabase()
await ensureIndexes()

const now = new Date()
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)
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
const variant = (id: string, size: string) => ({ _id: id, sku: `EW-TEE-${size}`, title: size, options: { Size: size, Colour: "Indigo" }, prices: { inr: 99900 }, manageInventory: true, allowBackorder: false, stock: 0 })
await db.products().insertOne({
  _id: "prod_tee",
  handle: "organic-tee",
  title: "Organic Cotton Tee",
  status: "published",
  images: [],
  categoryIds: [],
  collectionId: null,
  tags: [],
  options: [{ title: "Size", values: ["M", "L", "XL"] }],
  variants: [variant("var_tee_m", "M"), variant("var_tee_l", "L"), variant("var_tee_xl", "XL")],
  weight: 250,
  createdAt: now,
  updatedAt: now,
} as never)
await db.warehouses().deleteMany({})
await db.warehouses().insertMany([
  { _id: "wh_blr", code: "BLR-FC1", name: "Bengaluru FC", city: "Bengaluru", state: "Karnataka", pincode: "560068", address: "Hosur Road", status: "active", isDefault: true, shiprocketPickupLocation: "BLR-Hosur", createdAt: now, updatedAt: now },
  { _id: "wh_del", code: "DEL-FC1", name: "Delhi FC", city: "New Delhi", state: "Delhi", pincode: "110020", address: "Okhla Phase 3", status: "active", createdAt: now, updatedAt: now },
])
const passwordHash = await hashPassword("floor-password-1")
const staff = (id: string, email: string, name: string, role: string, warehouseIds: string[]) => ({ _id: id, email, name, role, warehouseIds, passwordHash, status: "active", createdAt: now, updatedAt: now })
await db.warehouseUsers().insertMany([
  staff("whu_sup", "supervisor@everwear.test", "Meera Supervisor", "supervisor", ["wh_blr", "wh_del"]),
  staff("whu_pick", "picker@everwear.test", "Ravi Picker", "picker", ["wh_blr"]),
] as never)
await db.settings().insertOne({ _id: "store", storeName: "Everwear", lowStockThreshold: 3, seller: { phone: "+91 8000000000", email: "ops@example.com" }, updatedAt: now } as never)

// Goods arrive through the ledger, as they would from a receiving dock.
const actor = { type: "system" as const, id: "e2e-seed" }
await withTransaction(async (session) => {
  for (const [variantId, qty, bin] of [["var_tee_m", 6, "A-01-1"], ["var_tee_l", 4, "A-01-2"], ["var_tee_xl", 2, "A-01-3"]] as const) {
    await moveStock({ warehouseId: "wh_blr", variantId, from: "outside", to: "available", quantity: qty, reason: "receive", ref: { type: "receipt", id: "GRN-E2E-1" }, actor }, session)
    await db.stockLevels().updateOne({ warehouseId: "wh_blr", variantId }, { $set: { binCode: bin } }, { session })
  }
})

const app = createApp()
const server = createServer(app)
await new Promise<void>((resolve) => server.listen(PORT, "127.0.0.1", () => resolve()))
const base = `http://127.0.0.1:${PORT}`
const call = async (method: string, path: string, body?: unknown) => {
  const res = await fetch(base + path, { method, headers: { "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const json = (await res.json()) as Record<string, any>
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(json)}`)
  return json
}

// A shopper in Bengaluru checks out (COD) two Indigo tees in M and one in L.
const address = { firstName: "Aarav", lastName: "Sharma", address1: "100 Feet Road", city: "Bengaluru", postalCode: "560038", province: "Karnataka", countryCode: "in", phone: "+91 9886012345" }
const cart = (await call("POST", "/store/carts", { country: "in" })).cart
await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_tee_m", quantity: 2 })
await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_tee_l", quantity: 1 })
await call("PATCH", `/store/carts/${cart.id}`, { email: "aarav@example.com", shippingAddress: address, billingAddress: address })
await call("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" })
const placed = await call("POST", `/store/carts/${cart.id}/complete`)

// An earlier order, delivered, whose approved return has just come back.
await db.orders().insertOne({
  _id: "order_returned",
  displayId: 900,
  cartId: "cart_returned",
  regionId: "reg_in",
  currency: "inr",
  customerId: null,
  email: "isha@example.com",
  items: [{ _id: "li_ret", productId: "prod_tee", variantId: "var_tee_xl", productTitle: "Organic Cotton Tee", productHandle: "organic-tee", variantTitle: "XL", quantity: 2, unitPrice: 99900 }],
  shippingAddress: address,
  billingAddress: address,
  shippingOption: { _id: "so_std", name: "Standard Delivery", amount: 0 },
  promoCodes: [],
  totals: { itemSubtotal: 199800, discountTotal: 0, shippingTotal: 0, taxTotal: 21407, total: 199800 },
  paymentMethod: "cod",
  paymentStatus: "paid",
  fulfillmentStatus: "delivered",
  returnRequest: { status: "approved", reason: "Too large", items: [{ itemId: "li_ret", quantity: 2 }], requestedAt: daysAgo(3), updatedAt: daysAgo(2) },
  status: "completed",
  createdAt: daysAgo(12),
  updatedAt: daysAgo(2),
} as never)

console.log(`e2e API ready on ${base} (order #${placed.order.displayId})`)

const stop = async () => {
  server.close()
  await stub.close()
  process.exit(0)
}
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
