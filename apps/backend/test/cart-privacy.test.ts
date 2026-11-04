import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"

// Isolated database; set before the app reads its settings.
process.env.MONGODB_DB = "everwear_test_cart_privacy"
process.env.NODE_ENV = "test"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())
type Json = Record<string, any>

const call = async (method: string, path: string, token?: string, body?: unknown) => {
  const res = await request(path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return { status: res.status, body: (await res.json().catch(() => null)) as Json }
}

const register = async (email: string) => {
  const { status, body } = await call("POST", "/store/auth/register", undefined, { email, password: "Correct-horse-42" })
  assert.equal(status, 201, JSON.stringify(body))
  return body.token as string
}

let owner = ""
let stranger = ""

before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()
  const now = new Date()
  await db.regions().insertOne({
    _id: "reg_in",
    name: "India",
    currency: "inr",
    countries: [{ code: "in", name: "India" }],
    taxRate: 12,
    taxInclusive: false,
    shippingOptions: [{ _id: "so_std", name: "Standard", amount: 500 }],
    createdAt: now,
    updatedAt: now,
  })
  owner = await register("owner@example.com")
  stranger = await register("stranger@example.com")
})

after(async () => {
  await getDb().dropDatabase()
  await close()
  await disconnect()
})

describe("bag privacy", () => {
  test("a guest bag stays open to whoever holds its id", async () => {
    const { body } = await call("POST", "/store/carts", undefined, { country: "in" })
    assert.equal((await call("GET", `/store/carts/${body.cart.id}`)).status, 200)
  })

  test("a bag tied to an account answers only to that account", async () => {
    const created = await call("POST", "/store/carts", owner, { country: "in" })
    assert.equal(created.status, 201)
    const id = created.body.cart.id
    assert.ok(created.body.cart.customerId, "made while signed in, so it belongs to the account")

    assert.equal((await call("GET", `/store/carts/${id}`, owner)).status, 200, "the owner sees it")
    assert.equal((await call("GET", `/store/carts/${id}`)).status, 404, "signed out: hidden")
    assert.equal((await call("GET", `/store/carts/${id}`, stranger)).status, 404, "another account: hidden")
    assert.equal(
      (await call("PATCH", `/store/carts/${id}`, undefined, { email: "x@example.com" })).status,
      404,
      "and it cannot be changed without the owner's token"
    )
  })

  test("signing in finds the account's last bag only when it has items", async () => {
    const { body } = await call("GET", "/store/customers/me/cart", owner)
    assert.equal(body.cartId, null, "the owner's bag above is empty")
    assert.equal((await call("GET", "/store/customers/me/cart")).status, 401)
  })
})
