import assert from "node:assert/strict"
import { after, before, test } from "node:test"

/*
 * Admin warehouse edits: a partial edit changes only what it names (it used
 * to reset status and the default flag), courier pickup names can be cleared,
 * and only owners, store admins and inventory managers can change warehouses.
 */
process.env.MONGODB_DB = "everwear_test_admin_warehouses"
process.env.NODE_ENV = "test"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { issueToken } = await import("../src/lib/auth.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())
const as = (id: string) => ({ authorization: `Bearer ${issueToken("admin", id)}` })
const call = async (method: string, path: string, body: unknown, headers: Record<string, string>) => {
  const res = await request(path, { method, headers: { "content-type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: res.status, body: (await res.json()) as Record<string, any> }
}

before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()
  const now = new Date()
  await db.adminUsers().insertMany(
    (["owner", "staff", "inventory_manager"] as const).map((role) => ({ _id: `adm_${role}`, email: `${role}@example.com`, passwordHash: "x", role, createdAt: now, updatedAt: now })) as never
  )
  await db.warehouses().deleteMany({})
})

after(async () => {
  await getDb().dropDatabase()
  await close()
  await disconnect()
})

test("create applies defaults; a partial edit leaves status and the default flag alone", async () => {
  const created = await call("POST", "/admin/warehouses", { code: "blr-fc1", name: "Bengaluru FC", city: "Bengaluru", state: "Karnataka", pincode: "560068", address: "Hosur Road", isDefault: true, delhiveryPickupLocation: "EVERWEAR BLR" }, as("adm_owner"))
  assert.equal(created.status, 201, JSON.stringify(created.body))
  const w = created.body.warehouse
  assert.equal(w.status, "active")
  assert.equal(w.isDefault, true)

  const renamed = await call("PATCH", `/admin/warehouses/${w._id}`, { name: "Bengaluru Fulfilment Centre" }, as("adm_inventory_manager"))
  assert.equal(renamed.status, 200)
  assert.equal(renamed.body.warehouse.isDefault, true, "still the default")
  assert.equal(renamed.body.warehouse.status, "active")

  await call("PATCH", `/admin/warehouses/${w._id}`, { status: "inactive" }, as("adm_owner"))
  const again = await call("PATCH", `/admin/warehouses/${w._id}`, { leadDispatcher: "Ravi" }, as("adm_owner"))
  assert.equal(again.body.warehouse.status, "inactive", "an edit doesn't reactivate an inactive warehouse")
})

test("courier pickup names can be cleared back to the account default", async () => {
  const w = (await db.warehouses().findOne({ code: "BLR-FC1" }))!
  assert.equal(w.delhiveryPickupLocation, "EVERWEAR BLR")
  const cleared = await call("PATCH", `/admin/warehouses/${w._id}`, { delhiveryPickupLocation: null, leadDispatcher: null }, as("adm_owner"))
  assert.equal(cleared.status, 200)
  const after = (await db.warehouses().findOne({ _id: w._id }))!
  assert.equal("delhiveryPickupLocation" in after, false)
  assert.equal("leadDispatcher" in after, false)
  assert.equal(after.name, "Bengaluru Fulfilment Centre")
})

test("staff can look but can't create, edit or remove warehouses", async () => {
  const w = (await db.warehouses().findOne({ code: "BLR-FC1" }))!
  assert.equal((await call("GET", "/admin/warehouses", undefined, as("adm_staff"))).status, 200)
  assert.equal((await call("POST", "/admin/warehouses", { code: "DEL-FC1", name: "Delhi FC", city: "Delhi", state: "Delhi", pincode: "110001", address: "Okhla Phase 2" }, as("adm_staff"))).status, 403)
  assert.equal((await call("PATCH", `/admin/warehouses/${w._id}`, { name: "x y" }, as("adm_staff"))).status, 403)
  assert.equal((await call("DELETE", `/admin/warehouses/${w._id}`, undefined, as("adm_staff"))).status, 403)
})
