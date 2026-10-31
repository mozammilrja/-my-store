import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"

process.env.MONGODB_DB = "everwear_test_admin"
process.env.NODE_ENV = "test"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { hashPassword, issueToken } = await import("../src/lib/auth.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())
type Json = Record<string, any>
let token = ""
const call = async (method: string, path: string, body?: unknown, auth = true) => {
  const res = await request(path, {
    method,
    headers: { "content-type": "application/json", ...(auth ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return { status: res.status, body: (await res.json()) as Json }
}

before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()
  const now = new Date()
  await db.adminUsers().insertOne({ _id: "admin_1", email: "owner@everwear.test", passwordHash: await hashPassword("owner-password-1"), role: "owner", createdAt: now, updatedAt: now })
  await db.regions().insertOne({ _id: "reg_eu", name: "Europe", currency: "eur", countries: [{ code: "dk", name: "Denmark" }], taxRate: 0, taxInclusive: false, shippingOptions: [{ _id: "so_std", name: "Standard", amount: 500 }], createdAt: now, updatedAt: now })
})

after(async () => {
  await close()
  await getDb().dropDatabase()
  await disconnect()
})

describe("admin access", () => {
  test("login works and wrong passwords don't", async () => {
    assert.equal((await call("POST", "/admin/auth/login", { email: "owner@everwear.test", password: "nope" }, false)).status, 401)
    const ok = await call("POST", "/admin/auth/login", { email: "owner@everwear.test", password: "owner-password-1" }, false)
    assert.equal(ok.status, 200)
    token = ok.body.token
    assert.equal((await call("GET", "/admin/me")).body.admin.email, "owner@everwear.test")
  })

  test("no token, or a customer token, is refused", async () => {
    assert.equal((await call("GET", "/admin/orders", undefined, false)).status, 401)
    const customerToken = issueToken("customer", "admin_1")
    const res = await request("/admin/orders", { headers: { authorization: `Bearer ${customerToken}` } })
    assert.equal(res.status, 401)
  })
})

describe("products", () => {
  let id = ""
  test("create builds every option combination", async () => {
    const res = await call("POST", "/admin/products", {
      title: "Test Hoodie",
      status: "published",
      options: [
        { title: "Size", values: ["S", "M"] },
        { title: "Color", values: ["Black", "White"] },
      ],
      prices: { eur: 5900 },
      stock: 10,
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.product.variants.length, 4)
    assert.equal(res.body.product.totalStock, 40)
    id = res.body.product.id
  })

  test("prices, sale prices and stock can be edited; bad input is refused", async () => {
    const { body } = await call("GET", `/admin/products/${id}`)
    const v = body.product.variants[0]
    const res = await call("PATCH", `/admin/products/${id}`, {
      variants: [{ id: v.id, prices: { eur: 4900 }, compareAtPrices: { eur: 5900 }, stock: 9 }],
    })
    assert.equal(res.status, 200)
    const edited = res.body.product.variants.find((x: Json) => x.id === v.id)
    assert.deepEqual([edited.prices.eur, edited.compareAtPrices.eur, edited.stock], [4900, 5900, 9])
    assert.equal((await call("PATCH", `/admin/products/${id}`, { variants: [{ id: v.id, stock: -1 }] })).status, 400)
    assert.equal((await call("PATCH", `/admin/products/${id}`, { categoryIds: ["pcat_missing"] })).status, 400)
    assert.equal((await call("PATCH", `/admin/products/${id}`, { images: ["javascript:alert(1)"] })).status, 400)
  })

  test("uploads accept real images only", async () => {
    const form = new FormData()
    form.append("file", new File([Buffer.from("<svg onload=alert(1)>")], "x.png", { type: "image/png" }))
    const bad = await request("/admin/uploads", { method: "POST", body: form, headers: { authorization: `Bearer ${token}` } })
    assert.equal(bad.status, 400)
    const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d5a5370000000049454e44ae426082", "hex")
    const good = new FormData()
    good.append("file", new File([png], "dot.png", { type: "image/png" }))
    const ok = await request("/admin/uploads", { method: "POST", body: good, headers: { authorization: `Bearer ${token}` } })
    assert.equal(ok.status, 201)
    assert.match(((await ok.json()) as Json).path, /^\/uploads\/products\/[0-9a-f]{16}\.png$/)
  })
})

describe("settings", () => {
  test("defaults answer before anything is saved", async () => {
    const { body } = await call("GET", "/admin/settings")
    assert.equal(body.settings.lowStockThreshold, 5)
    assert.equal(body.settings.storeName, "AVELIQ")
  })

  test("an owner can change the low-stock threshold and the dashboard follows", async () => {
    const saved = await call("PATCH", "/admin/settings", { lowStockThreshold: 99 })
    assert.equal(saved.status, 200)
    assert.equal(saved.body.settings.lowStockThreshold, 99)

    const { body } = await call("GET", "/admin/dashboard")
    assert.equal(body.lowStockThreshold, 99)

    await call("PATCH", "/admin/settings", { lowStockThreshold: 5 })
  })

  test("unknown keys are refused", async () => {
    assert.equal((await call("PATCH", "/admin/settings", { nope: 1 })).status, 400)
  })
})

describe("users and roles", () => {
  let staffId = ""
  let staffToken = ""

  test("an owner can add an admin", async () => {
    const res = await call("POST", "/admin/users", {
      email: "staff@everwear.test",
      password: "staff-password-1",
      name: "Sam Staff",
      role: "staff",
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.user.role, "staff")
    staffId = res.body.user.id

    const login = await call(
      "POST",
      "/admin/auth/login",
      { email: "staff@everwear.test", password: "staff-password-1" },
      false
    )
    assert.equal(login.status, 200)
    staffToken = login.body.token
  })

  test("the same email cannot be added twice", async () => {
    const res = await call("POST", "/admin/users", {
      email: "staff@everwear.test",
      password: "another-password-1",
    })
    assert.equal(res.status, 409)
  })

  test("staff may read the list but not change it", async () => {
    const asStaff = (method: string, path: string, body?: unknown) =>
      request(path, {
        method,
        headers: { "content-type": "application/json", authorization: `Bearer ${staffToken}` },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })

    assert.equal((await asStaff("GET", "/admin/users")).status, 200)
    assert.equal((await asStaff("POST", "/admin/users", { email: "x@y.test", password: "0123456789abc" })).status, 403)
    assert.equal((await asStaff("PATCH", "/admin/settings", { storeName: "Nope" })).status, 403)
  })

  test("the last owner cannot be demoted or deleted", async () => {
    const demote = await call("PATCH", "/admin/users/admin_1", { role: "staff" })
    assert.equal(demote.status, 409)
    assert.equal((await call("DELETE", "/admin/users/admin_1")).status, 409)
  })

  test("an admin can be removed", async () => {
    assert.equal((await call("DELETE", `/admin/users/${staffId}`)).status, 200)
    assert.equal((await call("GET", "/admin/users")).body.users.length, 1)
  })
})

describe("orders", () => {
  const placeOrder = async () => {
    const { body: list } = await call("GET", "/admin/products")
    const variant = list.products[0].variants[1]
    const { body: c } = await call("POST", "/store/carts", { country: "dk" }, false)
    await call("POST", `/store/carts/${c.cart.id}/items`, { variantId: variant.id, quantity: 2 }, false)
    await call("PATCH", `/store/carts/${c.cart.id}`, { email: "buyer@example.com", shippingAddress: { firstName: "A", lastName: "B", address1: "Street 1", city: "Copenhagen", postalCode: "1000", countryCode: "dk" } }, false)
    await call("POST", `/store/carts/${c.cart.id}/shipping`, { optionId: "so_std" }, false)
    const { body } = await call("POST", `/store/carts/${c.cart.id}/complete`, undefined, false)
    return { order: body.order, variantId: variant.id, productId: list.products[0].id }
  }

  test("status moves only forward and completes when delivered and paid", async () => {
    const { order } = await placeOrder()
    assert.equal((await call("POST", `/admin/orders/${order.id}/status`, { fulfillmentStatus: "delivered" })).status, 400)
    assert.equal((await call("POST", `/admin/orders/${order.id}/status`, { fulfillmentStatus: "shipped" })).status, 200)
    await call("POST", `/admin/orders/${order.id}/status`, { fulfillmentStatus: "delivered" })
    const done = await call("POST", `/admin/orders/${order.id}/status`, { paymentStatus: "paid" })
    assert.equal(done.body.order.status, "completed")
    assert.equal((await call("POST", `/admin/orders/${order.id}/cancel`)).status, 409)
  })

  test("canceling puts the stock back", async () => {
    const { order, variantId, productId } = await placeOrder()
    const stockOf = async () => (await db.products().findOne({ _id: productId }))!.variants.find((v) => v._id === variantId)!.stock
    const before = await stockOf()
    const res = await call("POST", `/admin/orders/${order.id}/cancel`)
    assert.equal(res.body.order.status, "canceled")
    assert.equal(await stockOf(), before + 2)
  })

  test("the list filters by placed-at range", async () => {
    const { order } = await placeOrder()
    const { createdAt } = (await db.orders().findOne({ _id: order.id }))!
    const earlier = new Date(createdAt.getTime() - 60_000).toISOString()
    const later = new Date(createdAt.getTime() + 60_000).toISOString()

    const inRange = await call("GET", `/admin/orders?from=${earlier}&to=${later}`)
    assert.ok(inRange.body.orders.some((o: Json) => o.id === order.id))

    const onlyOlder = await call("GET", `/admin/orders?to=${earlier}`)
    assert.ok(!onlyOlder.body.orders.some((o: Json) => o.id === order.id))

    assert.equal((await call("GET", `/admin/orders?from=${later}&to=${earlier}`)).status, 400)
  })

  test("dashboard reports one operating region's revenue and work to do", async () => {
    const { body } = await call("GET", "/admin/dashboard")
    // One region is operated, so revenue is a single figure rather than a
    // per-currency comparison, and it is reported in that region's currency.
    assert.equal(typeof body.currency, "string")
    assert.equal(body.region.currency, body.currency)
    assert.equal(typeof body.revenue.total, "number")
    assert.ok(body.revenue.orders >= 1)
    assert.ok(body.daily.every((d: Json) => typeof d.day === "string"))
    assert.equal(typeof body.attention.toShip, "number")
  })
})

describe("promotions", () => {
  test("validation and lifecycle", async () => {
    assert.equal((await call("POST", "/admin/promotions", { code: "BIG", type: "percentage", value: 150 })).status, 400)
    assert.equal((await call("POST", "/admin/promotions", { code: "FIVE", type: "fixed", value: 500 })).status, 400)
    const ok = await call("POST", "/admin/promotions", { code: "save10", type: "percentage", value: 10 })
    assert.equal(ok.body.promotion.code, "SAVE10")
    const off = await call("PATCH", `/admin/promotions/${ok.body.promotion.id}`, { active: false })
    assert.equal(off.body.promotion.active, false)
  })
})
