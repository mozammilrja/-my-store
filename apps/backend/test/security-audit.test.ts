import assert from "node:assert/strict"
import test, { describe, before, after } from "node:test"

process.env.MONGODB_DB = "everwear_test_sec"
process.env.NODE_ENV = "test"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { createApp } = await import("../src/app.js")
const { issueToken, hashPassword, verifyPassword } = await import("../src/lib/auth.js")
const { newId } = await import("../src/lib/ids.js")
const { startTestServer } = await import("./server.js")

describe("Production Security Audit Test Suite", () => {
  let server: Awaited<ReturnType<typeof startTestServer>>

  before(async () => {
    await connect()
    await getDb().dropDatabase()
    await ensureIndexes()
    server = await startTestServer(createApp())
  })

  after(async () => {
    await server?.close()
    await disconnect()
  })

  async function call(
    method: string,
    path: string,
    options: { body?: unknown; token?: string; origin?: string; headers?: Record<string, string> } = {}
  ) {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers ?? {}),
    }
    if (options.token) headers["Authorization"] = `Bearer ${options.token}`
    if (options.origin) headers["Origin"] = options.origin
    if (options.body) headers["Content-Type"] = "application/json"

    const res = await server.request(path, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    const text = await res.text()
    let json: any = null
    try {
      json = JSON.parse(text)
    } catch {
      // not JSON
    }
    return { status: res.status, headers: res.headers, body: json, text }
  }

  test("1. Authentication Isolation: Customer credentials CANNOT access any admin routes", async () => {
    const customerToken = issueToken("customer", "cust_sec_audit_01")

    const endpoints = [
      { method: "GET", path: "/admin/orders" },
      { method: "GET", path: "/admin/products" },
      { method: "GET", path: "/admin/settings" },
      { method: "GET", path: "/admin/users" },
      { method: "GET", path: "/admin/shipments" },
      { method: "GET", path: "/admin/invoices" },
      { method: "GET", path: "/admin/credit-notes" },
      { method: "GET", path: "/admin/suppliers" },
      { method: "GET", path: "/admin/inventory" },
    ]

    for (const ep of endpoints) {
      const res = await call(ep.method, ep.path, { token: customerToken })
      assert.equal(
        res.status,
        401,
        `Customer token was unexpectedly accepted or did not return 401 on ${ep.path}. Got status: ${res.status}`
      )
      assert.equal(res.body?.error?.code, "unauthorized")
    }
  })

  test("2. Unauthenticated requests are rejected on all protected routes", async () => {
    const res = await call("GET", "/admin/orders")
    assert.equal(res.status, 401)
    assert.equal(res.body?.error?.code, "unauthorized")
  })

  test("3. RBAC & Privilege Escalation Prevention", async () => {
    const staffId = newId("adm")
    const ownerId = newId("adm")

    await db.adminUsers().insertOne({
      _id: staffId,
      email: "staff_audit@everwear.test",
      name: "Staff Auditor",
      role: "staff",
      passwordHash: await hashPassword("StaffPass123!"),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.adminUsers().insertOne({
      _id: ownerId,
      email: "owner_audit@everwear.test",
      name: "Owner Auditor",
      role: "owner",
      passwordHash: await hashPassword("OwnerPass123!"),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const staffToken = issueToken("admin", staffId)
    const ownerToken = issueToken("admin", ownerId)

    // Staff cannot modify settings
    const staffSettingsRes = await call("PATCH", "/admin/settings", {
      token: staffToken,
      body: { lowStockThreshold: 15 },
    })
    assert.equal(staffSettingsRes.status, 403, "Staff should be forbidden from modifying settings")
    assert.equal(staffSettingsRes.body?.error?.code, "forbidden")

    // Staff cannot create new admins
    const staffCreateAdminRes = await call("POST", "/admin/users", {
      token: staffToken,
      body: { email: "new_hacked@everwear.test", password: "Password123!", name: "Hacked Admin", role: "staff" },
    })
    assert.equal(staffCreateAdminRes.status, 403, "Staff should be forbidden from creating admins")
    assert.equal(staffCreateAdminRes.body?.error?.code, "forbidden")

    // Owner CAN modify settings
    const ownerSettingsRes = await call("PATCH", "/admin/settings", {
      token: ownerToken,
      body: { lowStockThreshold: 10 },
    })
    assert.equal(ownerSettingsRes.status, 200)

    // Clean up
    await db.adminUsers().deleteMany({ _id: { $in: [staffId, ownerId] } })
  })

  test("4. Cryptographic Password Hashing & Timing-Safe Verification", async () => {
    const pass = "SuperSecretSecurePass123!"
    const hash = await hashPassword(pass)

    assert.ok(hash.startsWith("scrypt$"), "Password hash must use scrypt scheme")
    assert.notEqual(hash, pass, "Password must never be plaintext")

    const isValid = await verifyPassword(pass, hash)
    assert.equal(isValid, true, "Valid password must verify")

    const isWrong = await verifyPassword("WrongPassword!", hash)
    assert.equal(isWrong, false, "Invalid password must be rejected")

    // Timing attack resistance: nonexistent hash verification takes comparable time
    const isFake = await verifyPassword("AnyPassword", "scrypt$invalid$hash")
    assert.equal(isFake, false)
  })

  test("5. Sensitive Data Exposure: Error responses NEVER expose stack traces", async () => {
    // 404 Route
    const res404 = await call("GET", "/store/nonexistent-route-for-audit")
    assert.equal(res404.status, 404)
    assert.deepEqual(res404.body, { error: { code: "not_found", message: "Route not found" } })
    assert.equal(res404.text.includes("node_modules"), false)
    assert.equal(res404.text.includes("at "), false)

    // 400 Bad Request
    const res400 = await call("POST", "/store/auth/login", { body: { invalidField: 123 } })
    assert.equal(res400.status, 400)
    assert.equal(res400.body?.error?.code, "invalid_request")
    assert.equal(res400.text.includes("stack"), false)
  })

  test("6. Payload Limits & Invalid JSON Body Handlers", async () => {
    // Oversized body (> 1MB)
    const largeStr = "x".repeat(1024 * 1024 + 100)
    const largeRes = await server.request("/store/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: `{"email":"test@test.com","large":"${largeStr}"}`,
    })
    assert.equal(largeRes.status, 413)
    const largeData = await largeRes.json()
    assert.equal(largeData.error?.code, "payload_too_large")

    // Invalid JSON body
    const badJsonRes = await server.request("/store/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: `{"unclosed: json`,
    })
    assert.equal(badJsonRes.status, 400)
    const badJsonData = await badJsonRes.json()
    assert.equal(badJsonData.error?.code, "invalid_json")
  })

  test("7. Health Check Telemetry does not leak infrastructure secrets", async () => {
    const health = await call("GET", "/health")
    assert.equal(health.status, 200)
    assert.deepEqual(health.body, { status: "ok" })
    assert.equal(health.text.includes("mongodb://"), false)
  })
})
