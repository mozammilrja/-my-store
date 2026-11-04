import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"

// Isolated database; set before the app reads its settings.
process.env.MONGODB_DB = "everwear_test_concierge"
process.env.NODE_ENV = "test"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())

const book = async (body: Record<string, unknown>) => {
  const res = await request("/store/concierge/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: (await res.json()) as Record<string, any> }
}

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)

/** A valid request; each test overrides what it is about. */
const valid = (over: Record<string, unknown> = {}) => ({
  service: "home",
  location: "Doorstep In-Home",
  name: "Radhika Singhania",
  phone: "+91 98200 11111",
  date: day(3),
  slot: "02:30 PM – 04:00 PM",
  occasions: ["Wedding / Festive Edit", "Wedding / Festive Edit", "Black Tie / Evening Gala"],
  notes: "Relaxed linen, size M.",
  ...over,
})

before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()
})

after(async () => {
  await getDb().dropDatabase()
  await close()
  await disconnect()
})

describe("concierge bookings", () => {
  test("a valid request is stored and gets a reference", async () => {
    const { status, body } = await book(valid())
    assert.equal(status, 201, JSON.stringify(body))
    assert.match(body.booking.reference, /^CNC-\d{4}-\d{4,}$/)
    assert.equal(body.booking.status, "requested")

    const stored = await db.conciergeBookings().findOne({ _id: body.booking.id })
    assert.ok(stored)
    assert.equal(stored.name, "Radhika Singhania")
    assert.equal(stored.customerId, null, "anonymous requests carry no customer")
    assert.deepEqual(stored.occasions, ["Wedding / Festive Edit", "Black Tie / Evening Gala"], "duplicates dropped")
  })

  test("references are unique and increase", async () => {
    const a = await book(valid({ phone: "+91 98200 22222" }))
    const b = await book(valid({ phone: "+91 98200 33333" }))
    assert.notEqual(a.body.booking.reference, b.body.booking.reference)
  })

  test("a date in the past is refused", async () => {
    const { status, body } = await book(valid({ phone: "+91 98200 44444", date: day(-1) }))
    assert.equal(status, 400)
    assert.equal(body.code ?? body.error?.code, "date_in_past")
  })

  test("a date too far ahead is refused", async () => {
    const { status } = await book(valid({ phone: "+91 98200 55555", date: day(120) }))
    assert.equal(status, 400)
  })

  test("missing or malformed fields are refused", async () => {
    assert.equal((await book(valid({ phone: "call me" }))).status, 400)
    assert.equal((await book(valid({ service: "spa" }))).status, 400)
    assert.equal((await book(valid({ name: "" }))).status, 400)
  })

  test("one phone number is rate limited", async () => {
    const phone = "+91 98200 66666"
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) statuses.push((await book(valid({ phone }))).status)
    assert.deepEqual(statuses, [201, 201, 201, 201, 201, 429])
  })
})
