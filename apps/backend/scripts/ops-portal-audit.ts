/*
 * Read-only report for the move to the operations portal
 * (docs/OPERATIONS_PORTAL.md). Nothing is written: the portal needs no data
 * migration. It reads the four account collections and reports:
 *   - accounts per kind and state, and which of them can sign in to the portal;
 *   - emails held by more than one kind of account (one sign-in opens all the
 *     ones that share the password);
 *   - the portal's own collections (sessions, reset links) and their indexes,
 *     which the API creates on start.
 *
 *   npm run ops:audit            (from apps/backend; uses .env)
 */
import { connect, disconnect, getDb } from "../src/db/client.js"
import { db } from "../src/db/schema.js"
import { canSignIn } from "../src/lib/ops-access.js"

await connect()
const realms = {
  admin: db.adminUsers(),
  warehouse: db.warehouseUsers(),
  rider: db.riders(),
  seller: db.sellers(),
} as const

console.log(`Database: ${getDb().databaseName}\n`)
console.log("Accounts")
const byEmail = new Map<string, string[]>()
for (const [realm, coll] of Object.entries(realms)) {
  const docs = await (coll as typeof realms.admin).find({}, { projection: { email: 1, status: 1, role: 1 } }).toArray()
  const states = new Map<string, number>()
  let usable = 0
  for (const d of docs as { email: string; status?: string }[]) {
    const state = d.status ?? "active"
    states.set(state, (states.get(state) ?? 0) + 1)
    if (canSignIn(realm as keyof typeof realms, d)) usable++
    byEmail.set(d.email, [...(byEmail.get(d.email) ?? []), realm])
  }
  const parts = [...states].map(([k, v]) => `${k} ${v}`).join(", ")
  console.log(`  ${realm.padEnd(10)} ${String(docs.length).padStart(5)}  (${parts || "none"}); can sign in: ${usable}`)
}

const shared = [...byEmail].filter(([, r]) => r.length > 1)
console.log(`\nEmails with more than one kind of account: ${shared.length}`)
for (const [email, r] of shared) console.log(`  ${email}: ${r.join(" + ")}`)
if (shared.length) console.log("  One sign-in opens each of these whose password matches the one typed; the others stay closed until their passwords are made the same.")

const [sessions, live, resets] = await Promise.all([
  db.opsSessions().countDocuments(),
  db.opsSessions().countDocuments({ revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } }),
  db.opsPasswordResets().countDocuments(),
])
const indexes = async (name: string) => (await getDb().collection(name).indexes().catch(() => [])).map((i) => i.name).join(", ") || "none (created when the API starts)"
console.log(`\nPortal collections`)
console.log(`  ops_sessions          ${sessions} (${live} live); indexes: ${await indexes("ops_sessions")}`)
console.log(`  ops_password_resets   ${resets}; indexes: ${await indexes("ops_password_resets")}`)
console.log("\nNo documents were changed.")
await disconnect()
