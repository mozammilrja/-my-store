/*
 * The Everwear API for the seller hub browser tests: the real app on its own
 * throwaway database (everwear_e2e_seller, reset on start), no providers.
 * Seeds, through the real onboarding code, an approved seller who ships their
 * own orders, a live listing with stock at their location, and a cash on
 * delivery order for it waiting to be accepted.
 */
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"

const PORT = Number(process.env.E2E_API_PORT ?? 9193)
Object.assign(process.env, { NODE_ENV: "test", MONGODB_DB: "everwear_e2e_seller", OPS_CORS: "http://localhost:7311", SELLER_CORS: "", STORE_CORS: "", SHIPPING_PROVIDER: "none", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "", UPLOADS_DIR: join(tmpdir(), "everwear-e2e-seller-uploads") })

const { connect, getDb } = await import("../../../backend/src/db/client.ts")
const { db, ensureIndexes } = await import("../../../backend/src/db/schema.ts")
const { approveSeller, registerSeller, submitKyc, updateKyc, verifyItem } = await import("../../../backend/src/lib/marketplace/sellers.ts")
const { createListing, reviewListing, submitListing } = await import("../../../backend/src/lib/marketplace/products.ts")
const { runStockOperation } = await import("../../../backend/src/lib/inventory/operations.ts")
const { createApp } = await import("../../../backend/src/app.ts")

await connect()
if (!getDb().databaseName.includes("e2e")) throw new Error("Refusing to reset a non-e2e database")
await getDb().dropDatabase()
await ensureIndexes()
const now = new Date()
await db.regions().insertOne({ _id: "reg_in", name: "India", currency: "inr", countries: [{ code: "in", name: "India" }], taxRate: 12, taxInclusive: true, shippingOptions: [{ _id: "so_std", name: "Standard Delivery", amount: 0 }], policies: { returnWindowDays: 15, freeReturns: true, shippingRate: 0, handlingDays: { min: 1, max: 2 }, transitDays: { min: 2, max: 5 } }, createdAt: now, updatedAt: now } as never)
await db.categories().insertMany([{ _id: "cat_kurtas", name: "Kurtas", handle: "kurtas", createdAt: now, updatedAt: now }, { _id: "cat_sarees", name: "Sarees", handle: "sarees", createdAt: now, updatedAt: now }] as never)
await db.warehouses().deleteMany({})
await db.warehouses().insertOne({ _id: "wh_blr", code: "BLR-FC1", name: "Bengaluru FC", city: "Bengaluru", state: "Karnataka", pincode: "560068", address: "Hosur Road", status: "active", isDefault: true, createdAt: now, updatedAt: now } as never)
await db.settings().insertOne({ _id: "store", storeName: "Everwear", lowStockThreshold: 3, updatedAt: now } as never)

const admin = { type: "admin" as const, id: "e2e-admin", name: "e2e" }
let seller = await registerSeller({ email: "kavya@textiles.in", phone: "9845011111", displayName: "Kavya Textiles", password: "seller-password-1", fulfilmentModel: "seller" })
seller = await updateKyc(seller, {
  businessType: "proprietorship",
  legalName: "Kavya Textiles",
  pan: "AAPFU0939F",
  gstin: "27AAPFU0939F1ZV",
  registeredAddress: { line1: "14 Commercial Street", city: "Bengaluru", state: "Karnataka", postalCode: "560001" },
  bank: { accountName: "Kavya Textiles", accountNumber: "50100123456789", ifsc: "HDFC0001234" },
  pickupAddress: { line1: "14 Commercial Street", city: "Bengaluru", state: "Karnataka", postalCode: "560001", phone: "9845011111" },
})
seller = await submitKyc(seller)
for (const item of ["pan", "gstin", "bank"] as const) await verifyItem(seller._id, item, admin)
seller = await approveSeller(seller._id, admin)
const listing = await createListing(seller, { title: "Handblock Kurta", description: "Cotton", categoryIds: ["cat_kurtas"], images: ["/uploads/products/seed.jpg"], options: [{ title: "Size", values: ["M"] }], variants: [{ sku: "KAV-KUR-M", options: { Size: "M" }, price: 189900 }] })
await submitListing(seller, listing._id)
await reviewListing(listing._id, "approved", admin)
await runStockOperation({ type: "receive", warehouseId: seller.warehouseId!, variantId: listing.variants[0]!._id, quantity: 6 }, { type: "seller", id: seller._id })

const app = createApp()
const seeder = createServer(app)
await new Promise<void>((r) => seeder.listen(0, "127.0.0.1", () => r()))
const base = `http://127.0.0.1:${(seeder.address() as import("node:net").AddressInfo).port}`
const j = async (m: string, p: string, b?: unknown) => {
  const res = await fetch(base + p, { method: m, headers: { "content-type": "application/json" }, ...(b ? { body: JSON.stringify(b) } : {}) })
  const out = (await res.json()) as Record<string, any>
  if (!res.ok) throw new Error(`${m} ${p}: ${JSON.stringify(out)}`)
  return out
}
const address = { firstName: "Meera", lastName: "Iyer", address1: "4 Residency Road", city: "Bengaluru", postalCode: "560025", province: "Karnataka", countryCode: "in", phone: "+91 9886011111" }
const cart = (await j("POST", "/store/carts", { country: "in" })).cart
await j("POST", `/store/carts/${cart.id}/items`, { variantId: listing.variants[0]!._id, quantity: 1 })
await j("PATCH", `/store/carts/${cart.id}`, { email: "meera@example.com", shippingAddress: address, billingAddress: address })
await j("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" })
await j("POST", `/store/carts/${cart.id}/complete`)
seeder.close()
const server = createServer(app)
await new Promise<void>((r) => server.listen(PORT, "127.0.0.1", () => r()))
console.log(`e2e seller API ready on port ${PORT}`)
process.on("SIGTERM", () => process.exit(0))
process.on("SIGINT", () => process.exit(0))
