import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { createNotifyStub } from "./notify-stub.js"

/*
 * The operations portal's single sign-in (routes/ops/auth.ts): one session for
 * every operational account an email holds, accepted by the realm routes in
 * place of their bearer tokens, with roles derived on the server, the CSRF
 * header, suspension, revocation, password change and reset (the reset email
 * goes through a local SMTP server), and the realm routes' own isolation still
 * applying to a portal session.
 */
const stub = createNotifyStub()
const { smtpPort } = await stub.start()
Object.assign(process.env, {
  MONGODB_DB: "everwear_test_ops_portal",
  NODE_ENV: "test",
  SHIPPING_PROVIDER: "none",
  NOTIFY_EMAIL_PROVIDER: "smtp",
  MAIL_FROM: "Everwear <ops@everwear.test>",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: String(smtpPort),
  OPS_APP_URL: "https://ops.everwear.test",
  ADMIN_CORS: "https://ops.everwear.test",
  OPS_CORS: "",
})

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { hashPassword, issueToken } = await import("../src/lib/auth.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())

const PW = "correct-horse-battery-1"
type Res = { status: number; body: any; cookie: string | null; setCookie: string[] }

/** A browser tab: keeps the session cookie and sends the portal header. */
function browser() {
  let cookie: string | null = null
  const call = async (method: string, path: string, body?: unknown, opts: { header?: boolean; bearer?: string } = {}): Promise<Res> => {
    const res = await request(path, {
      method,
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(cookie ? { cookie } : {}),
        ...(opts.header === false ? {} : { "x-everwear-ops": "1" }),
        ...(opts.bearer ? { authorization: `Bearer ${opts.bearer}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const setCookie = res.headers.getSetCookie()
    for (const c of setCookie) {
      const [pair] = c.split(";")
      cookie = pair!.endsWith("=") ? null : pair!
    }
    return { status: res.status, body: res.status === 204 ? null : await res.json(), cookie, setCookie }
  }
  return { call, get cookie() { return cookie }, set cookie(c) { cookie = c } }
}

const now = new Date()
const base = { createdAt: now, updatedAt: now }

before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()
  const hash = await hashPassword(PW)
  const other = await hashPassword("a-different-password-9")
  await db.warehouses().deleteMany({})
  await db.warehouses().insertMany([
    { _id: "wh_blr", code: "BLR-FC1", name: "Bengaluru", city: "Bengaluru", state: "Karnataka", pincode: "560068", address: "Hosur Road", status: "active", ...base },
    { _id: "wh_del", code: "DEL-FC1", name: "Delhi", city: "Delhi", state: "Delhi", pincode: "110020", address: "Okhla", status: "active", ...base },
  ] as never)
  await db.adminUsers().insertMany([
    { _id: "adm_owner", email: "owner@everwear.test", passwordHash: hash, role: "owner", name: "Owner", ...base },
    { _id: "adm_owner2", email: "owner2@everwear.test", passwordHash: hash, role: "owner", ...base },
    { _id: "adm_store", email: "store@everwear.test", passwordHash: hash, role: "store_admin", ...base },
    { _id: "adm_staff", email: "staff@everwear.test", passwordHash: hash, role: "staff", ...base },
  ] as never)
  await db.warehouseUsers().insertMany([
    { _id: "whu_sup", email: "multi@everwear.test", passwordHash: hash, name: "Meera", role: "supervisor", warehouseIds: ["wh_blr"], status: "active", ...base },
    { _id: "whu_pick", email: "picker@everwear.test", passwordHash: hash, name: "Pavan", role: "picker", warehouseIds: ["wh_blr"], status: "active", ...base },
    { _id: "whu_gone", email: "gone@everwear.test", passwordHash: hash, name: "Gone", role: "packer", warehouseIds: ["wh_blr"], status: "suspended", ...base },
  ] as never)
  const rider = (id: string, email: string, phone: string, status: string, passwordHash = hash) =>
    ({ _id: id, email, phone, name: id, passwordHash, status, vehicle: { type: "bike" }, documents: [], warehouseId: "wh_blr", zoneIds: [], shifts: [], online: false, lastLocation: null, ...base }) as never
  await db.riders().insertMany([rider("rdr_multi", "multi@everwear.test", "9000000001", "approved"), rider("rdr_two", "rider2@everwear.test", "9000000002", "approved"), rider("rdr_no", "rejected@everwear.test", "9000000003", "rejected")])
  // Same email, different password: not part of a session opened with PW.
  await db.sellers().insertOne({ _id: "sel_multi", code: "SEL-0001", displayName: "Meera Crafts", email: "multi@everwear.test", phone: "9000000010", passwordHash: other, status: "approved", fulfilmentModel: "seller", ...base } as never)
  await db.deliveryTasks().insertOne({ _id: "dlv_two", code: "EWF1", shipmentId: "s", fulfilmentId: "f", orderId: "o", displayId: 1, warehouseId: "wh_blr", zoneId: "z", status: "assigned", riderId: "rdr_two", declinedBy: [], stop: { name: "A", phone: "9886099999", address1: "x", city: "Bengaluru", postalCode: "560001" }, cod: null, attempts: [], earnings: [], ...base } as never)
})

after(async () => {
  await getDb().dropDatabase()
  await close()
  await disconnect()
  await stub.close()
})

test("an owner signs in once: httpOnly SameSite=Strict cookie, OWNER role, admin area only", async () => {
  const b = browser()
  const res = await b.call("POST", "/ops/auth/login", { email: "Owner@Everwear.test", password: PW })
  assert.equal(res.status, 200, JSON.stringify(res.body))
  assert.match(res.setCookie[0]!, /^everwear_ops=[\w-]{40,}; Path=\/; HttpOnly; SameSite=Strict; Max-Age=43200/)
  assert.deepEqual(res.body.roles, ["OWNER"])
  assert.deepEqual(res.body.areas, ["admin"])
  assert.equal(res.body.home, "/admin")
  assert.equal(JSON.stringify(res.body).includes("passwordHash"), false)

  assert.equal((await b.call("GET", "/admin/me")).status, 200)
  assert.equal((await b.call("GET", "/ops/auth/me")).body.email, "owner@everwear.test")
  // The session holds no warehouse, rider or seller account: those APIs refuse it.
  for (const path of ["/warehouse/me", "/rider/me", "/seller/me"]) assert.equal((await b.call("GET", path)).status, 401, path)
  // Only the hash is stored.
  const stored = await db.opsSessions().findOne({ _id: res.body.session.id })
  assert.ok(stored && !b.cookie!.includes(stored.tokenHash))
})

test("the session cookie alone is refused without the portal header (CSRF)", async () => {
  const b = browser()
  await b.call("POST", "/ops/auth/login", { email: "owner@everwear.test", password: PW })
  const res = await b.call("GET", "/admin/me", undefined, { header: false })
  assert.equal(res.status, 403)
  assert.equal(res.body.error.code, "csrf")
  assert.equal((await b.call("POST", "/admin/users", { email: "x@everwear.test", password: "long-enough-pass", role: "staff" }, { header: false })).status, 403)
})

test("one email with several accounts gets each whose password matches, and the matching roles", async () => {
  const b = browser()
  const res = await b.call("POST", "/ops/auth/login", { email: "multi@everwear.test", password: PW })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.roles, ["WAREHOUSE_SUPERVISOR", "DELIVERY_RIDER"])
  assert.deepEqual(res.body.areas, ["warehouse", "delivery"])
  assert.equal(res.body.home, "/warehouse")
  assert.equal(res.body.accounts.seller, undefined, "the seller account has another password")
  assert.equal((await b.call("GET", "/warehouse/me")).body.user.role, "supervisor")
  assert.equal((await b.call("GET", "/rider/me")).status, 200)
  assert.equal((await b.call("GET", "/seller/me")).status, 401)
  assert.equal((await b.call("GET", "/admin/me")).status, 401)
})

test("roles: other admin roles are ADMIN, floor roles other than supervisor are WAREHOUSE_STAFF", async () => {
  assert.deepEqual((await browser().call("POST", "/ops/auth/login", { email: "store@everwear.test", password: PW })).body.roles, ["ADMIN"])
  assert.deepEqual((await browser().call("POST", "/ops/auth/login", { email: "picker@everwear.test", password: PW })).body.roles, ["WAREHOUSE_STAFF"])
})

test("wrong passwords, suspended and rejected accounts don't sign in, and failures are audited", async () => {
  const before = await db.auditLogs().countDocuments({ action: "ops.login_failed" })
  for (const [email, password] of [["owner@everwear.test", "wrong-password-xx"], ["nobody@everwear.test", PW], ["gone@everwear.test", PW], ["rejected@everwear.test", PW]]) {
    const res = await browser().call("POST", "/ops/auth/login", { email, password })
    assert.equal(res.status, 401, email)
    assert.equal(res.body.error.message, "Email or password is incorrect")
    assert.equal(res.cookie, null)
  }
  assert.equal(await db.auditLogs().countDocuments({ action: "ops.login_failed" }), before + 4)
})

test("warehouse assignment, rider assignment and admin roles still apply to a portal session", async () => {
  const sup = browser()
  await sup.call("POST", "/ops/auth/login", { email: "multi@everwear.test", password: PW })
  assert.equal((await sup.call("GET", "/warehouse/summary?warehouseId=wh_blr")).status, 200)
  assert.equal((await sup.call("GET", "/warehouse/summary?warehouseId=wh_del")).status, 404, "not assigned to Delhi")
  assert.equal((await sup.call("GET", "/warehouse/fulfilments?warehouseId=wh_del")).status, 404)
  assert.equal((await sup.call("GET", "/rider/tasks/dlv_two")).status, 404, "another rider's delivery")

  const two = browser()
  await two.call("POST", "/ops/auth/login", { email: "rider2@everwear.test", password: PW })
  assert.equal((await two.call("GET", "/rider/tasks/dlv_two")).status, 200)

  const staff = browser()
  await staff.call("POST", "/ops/auth/login", { email: "staff@everwear.test", password: PW })
  assert.equal((await staff.call("POST", "/admin/users", { email: "new@everwear.test", password: "long-enough-pass", role: "staff" })).status, 403)
  assert.equal((await staff.call("GET", "/admin/audit-logs")).status, 403)
})

test("sign-out ends the session on the server, not just in the browser", async () => {
  const b = browser()
  await b.call("POST", "/ops/auth/login", { email: "owner@everwear.test", password: PW })
  const kept = b.cookie
  const out = await b.call("POST", "/ops/auth/logout")
  assert.equal(out.status, 200)
  assert.match(out.setCookie[0]!, /everwear_ops=; .*Max-Age=0/)
  b.cookie = kept
  assert.equal((await b.call("GET", "/admin/me")).status, 401, "replaying the old cookie fails")
  assert.equal((await b.call("GET", "/ops/auth/me")).status, 401)
})

test("an expired session is refused", async () => {
  const b = browser()
  const res = await b.call("POST", "/ops/auth/login", { email: "owner@everwear.test", password: PW })
  await db.opsSessions().updateOne({ _id: res.body.session.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } })
  assert.equal((await b.call("GET", "/admin/me")).status, 401)
})

test("the old bearer tokens keep working for each realm (rollback path)", async () => {
  const bearer = browser()
  assert.equal((await bearer.call("GET", "/admin/me", undefined, { header: false, bearer: issueToken("admin", "adm_owner") })).status, 200)
  assert.equal((await bearer.call("GET", "/warehouse/me", undefined, { header: false, bearer: issueToken("warehouse", "whu_sup") })).status, 200)
  assert.equal((await bearer.call("GET", "/rider/me", undefined, { header: false, bearer: issueToken("rider", "rdr_two") })).status, 200)
  // A token for one realm never opens another.
  assert.equal((await bearer.call("GET", "/admin/me", undefined, { header: false, bearer: issueToken("rider", "rdr_two") })).status, 401)
})

test("suspending an admin ends their portal sessions and older bearer tokens at once; they can't sign back in", async () => {
  const owner = browser()
  await owner.call("POST", "/ops/auth/login", { email: "owner@everwear.test", password: PW })
  const staff = browser()
  await staff.call("POST", "/ops/auth/login", { email: "staff@everwear.test", password: PW })
  const oldToken = issueToken("admin", "adm_staff")
  await new Promise((r) => setTimeout(r, 1100))

  const res = await owner.call("PATCH", "/admin/users/adm_staff", { status: "suspended" })
  assert.equal(res.status, 200, JSON.stringify(res.body))
  assert.equal(res.body.user.status, "suspended")
  assert.equal((await staff.call("GET", "/admin/me")).status, 401)
  assert.equal((await browser().call("GET", "/admin/me", undefined, { header: false, bearer: oldToken })).status, 401)
  assert.equal((await browser().call("POST", "/admin/auth/login", { email: "staff@everwear.test", password: PW })).status, 401)
  assert.equal((await browser().call("POST", "/ops/auth/login", { email: "staff@everwear.test", password: PW })).status, 401)
  assert.ok(await db.auditLogs().findOne({ action: "admin_user.suspend", targetId: "adm_staff", adminId: "adm_owner" }))

  await owner.call("PATCH", "/admin/users/adm_staff", { status: "active" })
  assert.equal((await browser().call("POST", "/ops/auth/login", { email: "staff@everwear.test", password: PW })).status, 200)
})

test("an owner can't suspend themselves, and the last owner who can sign in can't be demoted or suspended", async () => {
  const owner = browser()
  await owner.call("POST", "/ops/auth/login", { email: "owner@everwear.test", password: PW })
  assert.equal((await owner.call("PATCH", "/admin/users/adm_owner", { status: "suspended" })).body.error.code, "self")
  assert.equal((await owner.call("PATCH", "/admin/users/adm_owner2", { status: "suspended" })).status, 200)
  // owner2 suspended: demoting owner to store_admin (not just "staff") would leave no owner.
  const demote = await owner.call("PATCH", "/admin/users/adm_owner", { role: "store_admin" })
  assert.equal(demote.status, 409)
  assert.equal(demote.body.error.code, "last_owner")
  await owner.call("PATCH", "/admin/users/adm_owner2", { status: "active" })
})

test("sessions can be listed and revoked by their owner, and by admins for other accounts", async () => {
  const phone = browser()
  await phone.call("POST", "/ops/auth/login", { email: "rider2@everwear.test", password: PW })
  const laptop = browser()
  await laptop.call("POST", "/ops/auth/login", { email: "rider2@everwear.test", password: PW })
  const list = await laptop.call("GET", "/ops/auth/sessions")
  assert.ok(list.body.sessions.length >= 2)
  assert.equal(list.body.sessions.filter((s: any) => s.current).length, 1)
  assert.equal((await laptop.call("POST", "/ops/auth/sessions/revoke-others")).status, 200)
  assert.equal((await phone.call("GET", "/rider/me")).status, 401)
  assert.equal((await laptop.call("GET", "/rider/me")).status, 200)
  // Someone else's session id isn't theirs to end.
  const owner = browser()
  const o = await owner.call("POST", "/ops/auth/login", { email: "owner@everwear.test", password: PW })
  assert.equal((await laptop.call("DELETE", `/ops/auth/sessions/${o.body.session.id}`)).status, 404)

  const store = browser()
  await store.call("POST", "/ops/auth/login", { email: "store@everwear.test", password: PW })
  assert.equal((await store.call("POST", "/admin/accounts/rider/rdr_two/revoke-sessions")).status, 200)
  assert.equal((await laptop.call("GET", "/rider/me")).status, 401)
  assert.equal((await store.call("POST", "/admin/accounts/admin/adm_owner/revoke-sessions")).status, 403, "store admins can't sign owners out")
  const staff = browser()
  await staff.call("POST", "/ops/auth/login", { email: "staff@everwear.test", password: PW })
  assert.equal((await staff.call("POST", "/admin/accounts/rider/rdr_two/revoke-sessions")).status, 403)
  assert.ok(await db.auditLogs().findOne({ action: "account.sessions_revoked", targetId: "rdr_two" }))
})

test("changing the password updates every account in the session and signs other devices out", async () => {
  const a = browser()
  await a.call("POST", "/ops/auth/login", { email: "multi@everwear.test", password: PW })
  const b = browser()
  await b.call("POST", "/ops/auth/login", { email: "multi@everwear.test", password: PW })
  assert.equal((await a.call("POST", "/ops/auth/password", { currentPassword: "not-it-at-all", newPassword: "a-brand-new-password" })).status, 400)
  assert.equal((await a.call("POST", "/ops/auth/password", { currentPassword: PW, newPassword: "short" })).status, 400)
  const ok = await a.call("POST", "/ops/auth/password", { currentPassword: PW, newPassword: "a-brand-new-password" })
  assert.deepEqual(ok.body.changed, ["warehouse", "rider"])
  assert.equal((await a.call("GET", "/warehouse/me")).status, 200, "this device stays signed in")
  assert.equal((await b.call("GET", "/warehouse/me")).status, 401, "the other device is signed out")
  assert.equal((await browser().call("POST", "/ops/auth/login", { email: "multi@everwear.test", password: PW })).status, 401)
  const again = await browser().call("POST", "/ops/auth/login", { email: "multi@everwear.test", password: "a-brand-new-password" })
  assert.deepEqual(again.body.roles, ["WAREHOUSE_SUPERVISOR", "DELIVERY_RIDER"])
})

test("forgot password emails a single-use link; unknown emails get the same answer and no email", async () => {
  const signedIn = browser()
  await signedIn.call("POST", "/ops/auth/login", { email: "picker@everwear.test", password: PW })
  stub.state.mail.length = 0

  assert.equal((await browser().call("POST", "/ops/auth/password/forgot", { email: "nobody@everwear.test" })).status, 202)
  assert.equal((await browser().call("POST", "/ops/auth/password/forgot", { email: "picker@everwear.test" })).status, 202)
  await new Promise((r) => setTimeout(r, 200))
  assert.equal(stub.state.mail.length, 1)
  assert.deepEqual(stub.state.mail[0]!.to, ["picker@everwear.test"])
  // The body is quoted-printable: undo soft line breaks and =XX escapes.
  const data = stub.state.mail[0]!.data.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16)))
  const token = decodeURIComponent(/reset-password\?token=([\w%-]+)/.exec(data)![1]!)
  assert.match(data, /https:\/\/ops\.everwear\.test\/reset-password/)

  assert.equal((await browser().call("POST", "/ops/auth/password/reset", { token, password: "short" })).status, 400)
  const reset = await browser().call("POST", "/ops/auth/password/reset", { token, password: "picker-new-password" })
  assert.equal(reset.status, 200, JSON.stringify(reset.body))
  assert.equal((await signedIn.call("GET", "/warehouse/me")).status, 401, "existing sessions end on reset")
  assert.equal((await browser().call("POST", "/ops/auth/password/reset", { token, password: "picker-other-password" })).body.error.code, "invalid_token", "single use")
  assert.equal((await browser().call("POST", "/ops/auth/login", { email: "picker@everwear.test", password: "picker-new-password" })).status, 200)
  assert.ok(await db.auditLogs().findOne({ action: "ops.password_reset", adminEmail: "picker@everwear.test" }))
})

test("the portal's origin may call every operational API with credentials; others may not", async () => {
  for (const path of ["/ops/auth/me", "/admin/me", "/warehouse/me", "/rider/me", "/seller/me"]) {
    const ok = await request(path, { method: "OPTIONS", headers: { origin: "https://ops.everwear.test", "access-control-request-method": "GET", "access-control-request-headers": "x-everwear-ops" } })
    assert.equal(ok.headers.get("access-control-allow-origin"), "https://ops.everwear.test", path)
    assert.equal(ok.headers.get("access-control-allow-credentials"), "true")
    const evil = await request(path, { method: "OPTIONS", headers: { origin: "https://evil.example", "access-control-request-method": "GET" } })
    assert.equal(evil.headers.get("access-control-allow-origin"), null, path)
  }
})
