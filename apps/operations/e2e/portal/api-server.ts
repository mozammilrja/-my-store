/*
 * The Everwear API for the portal browser tests (e2e/portal): the real app on
 * a throwaway database (everwear_e2e_portal, reset on start) with one account
 * of every operational kind, a multi-role email and a suspended one. Password
 * reset emails go to a local SMTP server (the backend's notify stand-in); the
 * test reads the last one from GET /__mail on MAIL_PORT.
 */
import { createServer } from "node:http"
import { createNotifyStub } from "../../../backend/test/notify-stub.ts"

const PORT = Number(process.env.E2E_API_PORT ?? 9197)
const MAIL_PORT = Number(process.env.E2E_MAIL_PORT ?? 9198)
const WEB = process.env.E2E_WEB_ORIGIN ?? "http://localhost:7131"

const stub = createNotifyStub()
const { smtpPort } = await stub.start()
Object.assign(process.env, {
  NODE_ENV: "test",
  MONGODB_DB: process.env.E2E_DB ?? "everwear_e2e_portal",
  ADMIN_CORS: WEB,
  OPS_CORS: WEB,
  STORE_CORS: "",
  API_PUBLIC_URL: `http://localhost:${PORT}`,
  OPS_APP_URL: WEB,
  SHIPPING_PROVIDER: "none",
  RAZORPAY_KEY_ID: "",
  RAZORPAY_KEY_SECRET: "",
  NOTIFY_EMAIL_PROVIDER: "smtp",
  MAIL_FROM: "Everwear <ops@everwear.test>",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: String(smtpPort),
  ADMIN_LOGIN_MAX_ATTEMPTS: "1000",
})

const { connect, getDb } = await import("../../../backend/src/db/client.ts")
const { db, ensureIndexes } = await import("../../../backend/src/db/schema.ts")
const { hashPassword } = await import("../../../backend/src/lib/auth.ts")
const { createApp } = await import("../../../backend/src/app.ts")

await connect()
if (!getDb().databaseName.includes("e2e")) throw new Error("Refusing to reset a non-e2e database")
await getDb().dropDatabase()
await ensureIndexes()

const now = new Date()
const base = { createdAt: now, updatedAt: now }
const passwordHash = await hashPassword("portal-password-1")
await db.warehouses().deleteMany({})
await db.warehouses().insertMany([
  { _id: "wh_blr", code: "BLR-FC1", name: "Bengaluru FC", city: "Bengaluru", state: "Karnataka", pincode: "560068", address: "Hosur Road", status: "active", isDefault: true, ...base },
  { _id: "wh_del", code: "DEL-FC1", name: "Delhi FC", city: "Delhi", state: "Delhi", pincode: "110020", address: "Okhla", status: "active", ...base },
] as never)
await db.regions().insertOne({ _id: "reg_in", name: "India", currency: "inr", countries: [{ code: "in", name: "India" }], taxRate: 12, taxInclusive: true, shippingOptions: [{ _id: "so_std", name: "Standard Delivery", amount: 0 }], ...base } as never)
await db.settings().insertOne({ _id: "store", storeName: "Everwear", lowStockThreshold: 3, updatedAt: now } as never)
await db.adminUsers().insertMany([
  { _id: "adm_owner", email: "owner@everwear.test", name: "Olivia Owner", role: "owner", passwordHash, ...base },
  { _id: "adm_store", email: "admin@everwear.test", name: "Arjun Admin", role: "store_admin", passwordHash, ...base },
] as never)
await db.warehouseUsers().insertMany([
  { _id: "whu_sup", email: "supervisor@everwear.test", name: "Sunita Supervisor", role: "supervisor", warehouseIds: ["wh_blr"], status: "active", passwordHash, ...base },
  { _id: "whu_pick", email: "picker@everwear.test", name: "Pavan Picker", role: "picker", warehouseIds: ["wh_blr"], status: "active", passwordHash, ...base },
  { _id: "whu_gone", email: "suspended@everwear.test", name: "Sid Suspended", role: "packer", warehouseIds: ["wh_blr"], status: "suspended", passwordHash, ...base },
  // One person, two jobs: floor supervisor at Delhi and a rider.
  { _id: "whu_multi", email: "multi@everwear.test", name: "Meera Multi", role: "supervisor", warehouseIds: ["wh_del"], status: "active", passwordHash, ...base },
] as never)
const rider = (id: string, email: string, phone: string, name: string) =>
  ({ _id: id, email, phone, name, passwordHash, status: "approved", vehicle: { type: "bike", registration: "KA01AB1234" }, documents: [], warehouseId: "wh_blr", zoneIds: [], shifts: [], online: false, lastLocation: null, ...base }) as never
await db.riders().insertMany([rider("rdr_ravi", "rider@everwear.test", "9000000001", "Ravi Rider"), rider("rdr_multi", "multi@everwear.test", "9000000002", "Meera Multi")])
await db.sellers().insertOne({ _id: "sel_kavya", code: "SEL-0001", displayName: "Kavya Textiles", email: "seller@everwear.test", phone: "9000000010", passwordHash, status: "approved", fulfilmentModel: "seller", commissionRate: 15, ...base } as never)

createApp().listen(PORT, "localhost", () => console.log(`portal e2e API on http://localhost:${PORT}`))

// The last email the API sent, for the password reset test.
createServer((req, res) => {
  if (req.url === "/health") return void res.end("ok")
  const last = stub.state.mail.at(-1)
  const data = (last?.data ?? "").replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16)))
  res.setHeader("content-type", "application/json")
  res.end(JSON.stringify({ to: last?.to ?? null, count: stub.state.mail.length, resetLink: /https?:\/\/\S*reset-password\?token=[\w%-]+/.exec(data)?.[0] ?? null }))
}).listen(MAIL_PORT, "localhost")
