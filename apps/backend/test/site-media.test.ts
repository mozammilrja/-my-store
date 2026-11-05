import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"

// Isolated database; set before the app reads its settings.
process.env.MONGODB_DB = "everwear_test_site_media"
process.env.NODE_ENV = "test"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { issueToken, hashPassword } = await import("../src/lib/auth.js")
const { ensureSiteMedia, SITE_MEDIA_SLOTS } = await import("../src/lib/site-media.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())
const admin = { authorization: `Bearer ${issueToken("admin", "admin_media")}`, "content-type": "application/json" }
const KEY = "men/hero.jpg"
const path = `/admin/site-media/${encodeURIComponent(KEY)}`

before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()
  const now = new Date()
  await db.adminUsers().insertOne({ _id: "admin_media", email: "media@everwear.test", passwordHash: await hashPassword("media-password-1"), role: "staff", createdAt: now, updatedAt: now })
  await ensureSiteMedia()
})

after(async () => {
  await getDb().dropDatabase()
  await close()
  await disconnect()
})

describe("site media", () => {
  test("seeds every slot with the image the storefront ships", async () => {
    const res = await request("/store/site-media")
    assert.equal(res.status, 200)
    const { media } = (await res.json()) as { media: Record<string, string> }
    assert.equal(Object.keys(media).length, SITE_MEDIA_SLOTS.length)
    assert.equal(media[KEY], "/images/men/hero.jpg")
  })

  test("an admin replaces an image, the store serves it, and reset restores it", async () => {
    const set = await request(path, { method: "PATCH", headers: admin, body: JSON.stringify({ url: "/uploads/new-hero.jpg" }) })
    assert.equal(set.status, 200)
    const body = (await set.json()) as { media: { isDefault: boolean; path: string } }
    assert.equal(body.media.path, "/uploads/new-hero.jpg")
    assert.equal(body.media.isDefault, false)

    const { media } = (await (await request("/store/site-media")).json()) as { media: Record<string, string> }
    assert.match(media[KEY]!, /\/uploads\/new-hero\.jpg$/)

    // Re-seeding on the next start keeps the admin's choice.
    await ensureSiteMedia()
    assert.equal((await db.siteMedia().findOne({ _id: KEY }))?.url, "/uploads/new-hero.jpg")

    const reset = await request(`${path}/reset`, { method: "POST", headers: admin })
    assert.equal(((await reset.json()) as { media: { path: string } }).media.path, "/images/men/hero.jpg")
  })

  test("rejects URLs that are not uploads, shipped images or https, and unknown slots", async () => {
    const bad = await request(path, { method: "PATCH", headers: admin, body: JSON.stringify({ url: "javascript:alert(1)" }) })
    assert.equal(bad.status, 400)
    const missing = await request(`/admin/site-media/${encodeURIComponent("nope.jpg")}`, { method: "PATCH", headers: admin, body: JSON.stringify({ url: "/uploads/x.jpg" }) })
    assert.equal(missing.status, 404)
  })

  test("needs an admin to change anything", async () => {
    const res = await request(path, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: "/uploads/x.jpg" }) })
    assert.equal(res.status, 401)
  })
})
