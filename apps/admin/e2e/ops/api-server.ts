/*
 * The Everwear API for the admin operations browser tests (fleet, COD,
 * notifications, marketplace, warehouses, logistics analytics): the real app
 * on its own throwaway database (everwear_e2e_admin_ops, reset on start), no
 * providers. A base store is seeded here; each area adds its own records in
 * ./seed/<area>.ts (an exported `seed(ctx)`), run in file-name order.
 * Admin tokens for each role are written to ./.state.json for the specs.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createServer } from "node:http"
import { fileURLToPath } from "node:url"

const PORT = Number(process.env.E2E_API_PORT ?? 9194)
/** Several runs can share a machine: each slot has its own ports, database and state file. */
const SLOT = process.env.OPS_SLOT ?? ""
/** Only these seed areas (comma-separated, matched against file names); all when unset. */
const ONLY = (process.env.OPS_SEEDS ?? "").split(",").map((x) => x.trim()).filter(Boolean)
const WEB = process.env.E2E_WEB_ORIGIN ?? "http://localhost:7091"
Object.assign(process.env, {
  NODE_ENV: "test",
  MONGODB_DB: `everwear_e2e_admin_ops${SLOT ? `_${SLOT}` : ""}`,
  ADMIN_CORS: `${WEB},${WEB.replace("localhost", "127.0.0.1")}`,
  STORE_CORS: "",
  // Image links point at this server, not the dev API on 9100.
  API_PUBLIC_URL: `http://127.0.0.1:${PORT}`,
  SHIPPING_PROVIDER: "none",
  RAZORPAY_KEY_ID: "",
  RAZORPAY_KEY_SECRET: "",
  // Uploaded and seeded images go to a throwaway folder, never the repo's uploads.
  UPLOADS_DIR: join(tmpdir(), `everwear-e2e-admin-ops-uploads${SLOT ? `-${SLOT}` : ""}`),
})
rmSync(process.env.UPLOADS_DIR!, { recursive: true, force: true })
mkdirSync(join(process.env.UPLOADS_DIR!, "products"), { recursive: true })

const { connect, getDb } = await import("../../../backend/src/db/client.ts")
const { db, ensureIndexes } = await import("../../../backend/src/db/schema.ts")
const { hashPassword, issueToken } = await import("../../../backend/src/lib/auth.ts")
const { createApp } = await import("../../../backend/src/app.ts")

await connect()
if (!getDb().databaseName.includes("e2e")) throw new Error("Refusing to reset a non-e2e database")
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
  policies: { returnWindowDays: 15, freeReturns: true, shippingRate: 0, handlingDays: { min: 1, max: 2 }, transitDays: { min: 2, max: 5 } },
  createdAt: now,
  updatedAt: now,
} as never)
await db.categories().insertMany([{ _id: "cat_kurtas", name: "Kurtas", handle: "kurtas", createdAt: now, updatedAt: now }] as never)
await db.warehouses().deleteMany({})
await db.warehouses().insertOne({ _id: "wh_blr", code: "BLR-FC1", name: "Bengaluru FC", city: "Bengaluru", state: "Karnataka", pincode: "560068", address: "Hosur Road", status: "active", isDefault: true, createdAt: now, updatedAt: now } as never)
await db.settings().insertOne({ _id: "store", storeName: "Everwear", lowStockThreshold: 3, seller: { legalName: "Everwear Retail Pvt Ltd", phone: "+91 8000000000", email: "ops@everwear.test" }, updatedAt: now } as never)
const passwordHash = await hashPassword("ops-password-1")
const admins = [
  { _id: "adm_owner", email: "owner@everwear.test", name: "Owner", role: "owner" },
  { _id: "adm_finance", email: "finance@everwear.test", name: "Farah (Finance)", role: "finance_manager" },
  { _id: "adm_staff", email: "staff@everwear.test", name: "Sam (Staff)", role: "staff" },
]
await db.adminUsers().insertMany(admins.map((a) => ({ ...a, passwordHash, createdAt: now, updatedAt: now })) as never)

const app = createApp()
const seeder = createServer(app)
await new Promise<void>((r) => seeder.listen(0, "127.0.0.1", () => r()))
const base = `http://127.0.0.1:${(seeder.address() as import("node:net").AddressInfo).port}`
const ownerToken = issueToken("admin", "adm_owner")
/** Calls the real API while seeding; `as` picks the token (an admin token by default). */
const api = async (method: string, path: string, body?: unknown, headers: Record<string, string> = { authorization: `Bearer ${ownerToken}` }) => {
  const res = await fetch(base + path, { method, headers: { "content-type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const out = (await res.json().catch(() => null)) as Record<string, any>
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(out)}`)
  return out
}
const ctx = { db, now, api, issueToken, hashPassword, admin: { type: "admin" as const, id: "adm_owner", name: "Owner" } }
export type SeedContext = typeof ctx

const dir = fileURLToPath(new URL("./seed/", import.meta.url))
for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts") && (!ONLY.length || f.startsWith("00-") || ONLY.some((o) => f.includes(o)))).sort()) {
  const mod = (await import(new URL(`./seed/${file}`, import.meta.url).href)) as { seed: (c: SeedContext) => Promise<void> }
  await mod.seed(ctx)
  console.log(`seeded ${file}`)
}
seeder.close()

writeFileSync(
  fileURLToPath(new URL(`./.state${SLOT ? `.${SLOT}` : ""}.json`, import.meta.url)),
  JSON.stringify({ tokens: Object.fromEntries(admins.map((a) => [a.role === "finance_manager" ? "finance" : a.role, issueToken("admin", a._id)])) }, null, 2)
)
const server = createServer(app)
await new Promise<void>((r) => server.listen(PORT, "127.0.0.1", () => r()))
console.log(`e2e admin ops API ready on port ${PORT}`)
process.on("SIGTERM", () => process.exit(0))
process.on("SIGINT", () => process.exit(0))
