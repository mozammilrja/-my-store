import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import webpush from "web-push"
import { createNotifyStub } from "./notify-stub.js"

/*
 * Outbound notifications end to end against local stand-ins for every
 * provider: what gets queued for which event and recipient, preferences,
 * de-duplication, each provider's request (SMTP, SES signed, MSG91,
 * Twilio, Meta WhatsApp, Gupshup, web push decrypted, FCM with OAuth),
 * retries with backoff, dead letters, the delivery OTP resolved only at
 * send time, expired devices, and admin controls.
 */
const stub = createNotifyStub()
const { url, smtpPort } = await stub.start()
const vapid = webpush.generateVAPIDKeys()
Object.assign(process.env, {
  MONGODB_DB: "everwear_test_notifications",
  NODE_ENV: "test",
  SHIPPING_PROVIDER: "none",
  STOREFRONT_URL: "https://everwear.test/in",
  MAIL_FROM: "Everwear <orders@everwear.test>",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: String(smtpPort),
  SMTP_USER: "mailer",
  SMTP_PASS: "smtp-pass",
  SES_REGION: "ap-south-1",
  SES_ACCESS_KEY_ID: "AKIDTEST",
  SES_SECRET_ACCESS_KEY: stub.state.sesSecret,
  SES_API_BASE: url,
  MSG91_AUTH_KEY: "msg91-key",
  MSG91_API_BASE: url,
  TWILIO_ACCOUNT_SID: "ACtest",
  TWILIO_AUTH_TOKEN: "twilio-token",
  TWILIO_FROM: "+15005550006",
  TWILIO_API_BASE: url,
  WHATSAPP_META_TOKEN: "meta-token",
  WHATSAPP_META_PHONE_NUMBER_ID: "1098765",
  WHATSAPP_META_API_BASE: url,
  GUPSHUP_API_KEY: "gupshup-key",
  GUPSHUP_SOURCE: "919000000000",
  GUPSHUP_APP_NAME: "everwear",
  GUPSHUP_API_BASE: url,
  VAPID_PUBLIC_KEY: vapid.publicKey,
  VAPID_PRIVATE_KEY: vapid.privateKey,
  FCM_SERVICE_ACCOUNT_BASE64: Buffer.from(JSON.stringify({ project_id: "everwear-test", client_email: "fcm@everwear-test.iam.gserviceaccount.com", private_key: stub.fcmPrivateKey, token_uri: `${url}/token` })).toString("base64"),
  FCM_API_BASE: url,
  FCM_TOKEN_URL: `${url}/token`,
})

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { env } = await import("../src/env.js")
const { issueToken } = await import("../src/lib/auth.js")
const { newOtp, openOtp } = await import("../src/lib/fleet/support.js")
const { deliverDue, notifyCustomer, notifyRider } = await import("../src/lib/notify/index.js")
const { processOutboxEvents } = await import("../src/lib/outbox-worker.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")

const { request, close } = await startTestServer(createApp())
type Json = Record<string, any>
const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const res = await request(path, { method, headers: { "content-type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: res.status, body: (await res.json().catch(() => null)) as Json }
}
const bearer = (t: string) => ({ authorization: `Bearer ${t}` })
const owner = bearer(issueToken("admin", "admin_owner"))
const staff = bearer(issueToken("admin", "admin_staff"))
const asha = bearer(issueToken("customer", "cus_asha"))
const ravi = bearer(issueToken("rider", "rdr_ravi"))
const address = { firstName: "Asha", lastName: "Nair", address1: "21 Church Street", city: "Bengaluru", postalCode: "560001", province: "Karnataka", countryCode: "in", phone: "+91 98860 99999" }

const deliveries = (filter: Json = {}) => db.notificationDeliveries().find(filter, { sort: { createdAt: 1 } }).toArray()
/** Runs the worker until nothing is due (retries scheduled later stay queued). */
async function drain() {
  for (let i = 0; i < 20; i++) if (!(await deliverDue())) return
}
/** Makes scheduled retries due now. */
const fastForward = () => db.notificationDeliveries().updateMany({ status: "queued" }, { $set: { nextAttemptAt: new Date(Date.now() - 1000) } })
const setTemplate = (event: string, body: Json) => call("PUT", `/admin/notifications/templates/${event}`, body, owner)

let order: Json

before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()
  const now = new Date()
  await db.regions().insertOne({ _id: "reg_in", name: "India", currency: "inr", countries: [{ code: "in", name: "India" }], taxRate: 12, taxInclusive: true, shippingOptions: [{ _id: "so_std", name: "Standard Delivery", amount: 0 }], createdAt: now, updatedAt: now } as never)
  await db.products().insertOne({ _id: "prod_tee", handle: "tee", title: "Organic Tee", status: "published", images: [], categoryIds: [], collectionId: null, tags: [], options: [{ title: "Size", values: ["M"] }], variants: [{ _id: "var_m", sku: "EW-TEE-M", title: "M", options: { Size: "M" }, prices: { inr: 99900 }, manageInventory: true, allowBackorder: false, stock: 50 }], createdAt: now, updatedAt: now } as never)
  await db.customers().insertOne({ _id: "cus_asha", email: "asha@example.com", firstName: "Asha", phone: "9886099999", addresses: [], createdAt: now, updatedAt: now })
  await db.adminUsers().insertMany([
    { _id: "admin_owner", email: "owner@example.com", passwordHash: "x", role: "owner", createdAt: now, updatedAt: now },
    { _id: "admin_staff", email: "staff@example.com", passwordHash: "x", role: "staff", createdAt: now, updatedAt: now },
  ] as never)
  await db.riders().insertOne({ _id: "rdr_ravi", email: "ravi@example.com", phone: "9000000001", name: "Ravi Kumar", passwordHash: "x", status: "approved", vehicle: { type: "bike" }, documents: [], warehouseId: null, zoneIds: [], shifts: [], online: false, lastLocation: null, createdAt: now, updatedAt: now } as never)
  await db.settings().insertOne({ _id: "store", storeName: "Everwear", lowStockThreshold: 3, updatedAt: now } as never)
})

after(async () => {
  await getDb().dropDatabase()
  await close()
  await disconnect()
  await stub.close()
})

describe("set up by the customer and the owner", () => {
  test("a customer opts in to WhatsApp and registers this browser for push", async () => {
    const before = await call("GET", "/store/customers/me/notification-preferences", undefined, asha)
    assert.deepEqual(before.body.preferences, { email: true, sms: true, whatsapp: false, push: true }, "WhatsApp is opt-in")
    assert.equal((await call("PATCH", "/store/customers/me/notification-preferences", { whatsapp: true }, asha)).body.preferences.whatsapp, true)
    assert.ok((await db.customers().findOne({ _id: "cus_asha" }))!.notificationPrefs?.whatsappOptInAt, "opt-in time recorded")
    assert.equal((await call("GET", "/store/push/key")).body.publicKey, vapid.publicKey)
    const sub = stub.browserSubscription(url, "asha-laptop")
    assert.equal((await call("POST", "/store/customers/me/push-subscriptions", sub, asha)).status, 201)
    assert.equal((await call("POST", "/store/customers/me/push-subscriptions", sub, asha)).status, 201, "registering twice is fine")
    assert.equal(await db.pushSubscriptions().countDocuments({ ownerId: "cus_asha" }), 1)
  })

  test("in production only real browser push services are accepted", async () => {
    env.NODE_ENV = "production"
    try {
      const res = await call("POST", "/store/customers/me/push-subscriptions", { endpoint: "http://169.254.169.254/latest", keys: { p256dh: "x".repeat(40), auth: "y".repeat(16) } }, asha)
      assert.equal(res.status, 400)
    } finally {
      env.NODE_ENV = "test"
    }
  })

  test("the owner sets provider templates; staff can't; bad names are refused", async () => {
    assert.equal((await setTemplate("order_confirmed", { msg91FlowId: "64f0aa11bb22cc33", whatsapp: { name: "order_confirmed_v2", language: "en" } })).status, 200)
    assert.equal((await setTemplate("delivery_otp", { msg91FlowId: "64f0aa11bb22cc44" })).status, 200)
    assert.equal((await call("PUT", "/admin/notifications/templates/delivered", { msg91FlowId: "64f0aa11bb22cc55" }, staff)).status, 403)
    assert.equal((await setTemplate("delivered", { whatsapp: { name: "Order Delivered!", language: "en" } })).status, 400)
    const status = (await call("GET", "/admin/notifications/status", undefined, owner)).body
    assert.deepEqual(status.channels, { email: "smtp", sms: "msg91", whatsapp: "meta", push: { webPush: true, fcm: true } })
  })
})

describe("an order, end to end", () => {
  test("order placed: one message per channel, each provider called correctly", async () => {
    const cart = (await call("POST", "/store/carts", { country: "in" }, asha)).body.cart
    await call("POST", `/store/carts/${cart.id}/items`, { variantId: "var_m", quantity: 1 }, asha)
    await call("PATCH", `/store/carts/${cart.id}`, { email: "asha@example.com", shippingAddress: address, billingAddress: address }, asha)
    await call("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" }, asha)
    order = (await call("POST", `/store/carts/${cart.id}/complete`, undefined, asha)).body.order
    assert.equal((await deliveries()).length, 0, "nothing is sent until the order has committed and the outbox runs")
    await processOutboxEvents()
    const queued = await deliveries({ event: "order_confirmed" })
    assert.deepEqual(queued.map((d) => d.channel).sort(), ["email", "push", "sms", "whatsapp"])
    await drain()
    const sent = await deliveries({ event: "order_confirmed" })
    assert.ok(sent.every((d) => d.status === "sent" && d.providerMessageId), JSON.stringify(sent.map((d) => [d.channel, d.status, d.lastError])))

    const mail = stub.state.mail.at(-1)!
    assert.deepEqual(mail.to, ["asha@example.com"])
    assert.equal(mail.auth, "mailer", "SMTP login used")
    assert.match(mail.data, new RegExp(`Subject: Order #${order.displayId} confirmed`))
    // Quoted-printable soft line breaks ("=" + CRLF) are undone first, as a mail client would.
    assert.match(mail.data.replace(/=\r\n/g, ""), /https:\/\/everwear\.test\/in\/order\/order_\w+\/track/)

    const sms = stub.recorded("/api/v5/flow").at(-1)!
    assert.equal(sms.headers.authkey, "msg91-key")
    assert.equal(sms.body.template_id, "64f0aa11bb22cc33")
    assert.deepEqual(sms.body.recipients, [{ mobiles: "919886099999", var1: "Asha", var2: `#${order.displayId}`, var3: "Rs 999.00" }])

    const wa = stub.recorded("/v21.0/1098765/messages").at(-1)!
    assert.equal(wa.headers.authorization, "Bearer meta-token")
    assert.equal(wa.body.to, "919886099999")
    assert.deepEqual(wa.body.template, { name: "order_confirmed_v2", language: { code: "en" }, components: [{ type: "body", parameters: [{ type: "text", text: "Asha" }, { type: "text", text: `#${order.displayId}` }, { type: "text", text: "Rs 999.00" }] }] })

    assert.deepEqual(stub.state.pushedPayloads.at(-1), { title: `Order #${order.displayId} confirmed`, body: `Thank you for shopping with Everwear. Your order #${order.displayId} for Rs 999.00 is confirmed and is being prepared.`, url: `https://everwear.test/in/order/${order.id}/track`, tag: "order_confirmed" })
  })

  test("the same event twice sends nothing new", async () => {
    const o = (await db.orders().findOne({ _id: order.id }))!
    assert.equal(await notifyCustomer(o, "order_confirmed", `order:${o._id}:confirmed`), 0)
    assert.equal((await deliveries({ event: "order_confirmed" })).length, 4)
  })

  test("shipment updates from the courier reach the customer once per step; no template, no SMS", async () => {
    const ship = await call("POST", `/admin/orders/${order.id}/shipments`, { manual: { carrier: "Delhivery", awb: "DLV55501" } }, owner)
    assert.equal(ship.status, 201, JSON.stringify(ship.body))
    const id = ship.body.shipment._id
    await call("POST", `/admin/shipments/${id}/status`, { status: "in_transit", note: "Left the hub" }, owner)
    await call("POST", `/admin/shipments/${id}/status`, { status: "out_for_delivery", note: "With the courier" }, owner)
    await drain()
    const shipped = await deliveries({ event: "order_shipped" })
    assert.deepEqual(shipped.map((d) => d.channel).sort(), ["email", "push", "sms", "whatsapp"])
    // order_shipped has no MSG91 flow or WhatsApp template yet: those are skipped, not failed.
    assert.deepEqual(shipped.filter((d) => d.status === "skipped").map((d) => [d.channel, d.skipReason]).sort(), [
      ["sms", "No MSG91 flow id set for order_shipped"],
      ["whatsapp", "No approved WhatsApp template set for order_shipped"],
    ])
    assert.ok(stub.state.mail.some((m) => /has shipped/.test(m.data) && /DLV55501/.test(m.data.replace(/=\r\n/g, ""))))
    assert.equal((await deliveries({ event: "out_for_delivery" })).length, 3, "sms, whatsapp, push")
    const feed = (await call("GET", "/store/customers/me/notifications", undefined, asha)).body.notifications
    assert.ok(feed.some((n: Json) => n.title === `Order #${order.displayId} has shipped`), "also in the in-app feed")
  })
})

describe("retries, dead letters and preferences", () => {
  test("a provider outage is retried with backoff until it gets through", async () => {
    await setTemplate("delivered", { msg91FlowId: "64f0aa11bb22cc55" })
    stub.state.fail.set("/api/v5/flow", [503, 503])
    const o = (await db.orders().findOne({ _id: order.id }))!
    await notifyCustomer(o, "delivered", `test:${o._id}:delivered`)
    await drain()
    let sms = (await deliveries({ event: "delivered", channel: "sms" }))[0]!
    assert.equal(sms.status, "queued")
    assert.equal(sms.attempts, 1)
    assert.ok(sms.nextAttemptAt.getTime() > Date.now() + 50_000, "first retry about a minute later")
    await fastForward()
    await drain()
    await fastForward()
    await drain()
    sms = (await deliveries({ event: "delivered", channel: "sms" }))[0]!
    assert.equal(sms.status, "sent")
    assert.equal(sms.attempts, 3)
  })

  test("a permanent refusal goes straight to dead letters; an admin can retry it", async () => {
    stub.state.fail.set("/api/v5/flow", [400])
    const o = (await db.orders().findOne({ _id: order.id }))!
    await notifyCustomer(o, "delivered", `test:${o._id}:delivered:2`)
    await drain()
    const dead = (await deliveries({ status: "dead" }))[0]!
    assert.equal(dead.channel, "sms")
    assert.equal(dead.attempts, 1)
    assert.match(dead.lastError!, /forced 400/)
    assert.equal((await call("POST", `/admin/notifications/deliveries/${dead._id}/retry`, {}, staff)).status, 403)
    assert.equal((await call("POST", `/admin/notifications/deliveries/${dead._id}/retry`, {}, owner)).status, 200)
    await drain()
    assert.equal((await db.notificationDeliveries().findOne({ _id: dead._id }))!.status, "sent")
  })

  test("five failed attempts end in dead letters", async () => {
    stub.state.fail.set("/api/v5/flow", [500, 500, 500, 500, 500])
    const o = (await db.orders().findOne({ _id: order.id }))!
    await notifyCustomer(o, "delivered", `test:${o._id}:delivered:3`)
    for (let i = 0; i < 6; i++) {
      await drain()
      await fastForward()
    }
    const d = (await deliveries({ key: { $regex: "delivered:3:sms" } }))[0]!
    assert.equal(d.status, "dead")
    assert.equal(d.attempts, 5)
  })

  test("a refused email address is permanent", async () => {
    stub.state.smtpReject.add("asha@example.com")
    try {
      const o = (await db.orders().findOne({ _id: order.id }))!
      await notifyCustomer(o, "order_packed", `test:${o._id}:packed`)
      await drain()
      const d = (await deliveries({ event: "order_packed", channel: "email" }))[0]!
      assert.equal(d.status, "dead")
      assert.match(d.lastError!, /SMTP/)
    } finally {
      stub.state.smtpReject.clear()
    }
  })

  test("a customer who turns SMS off gets no SMS", async () => {
    await call("PATCH", "/store/customers/me/notification-preferences", { sms: false }, asha)
    const o = (await db.orders().findOne({ _id: order.id }))!
    await notifyCustomer(o, "delivered", `test:${o._id}:delivered:4`)
    assert.deepEqual((await deliveries({ key: { $regex: "delivered:4" } })).map((d) => d.channel).sort(), ["email", "push", "whatsapp"])
    await call("PATCH", "/store/customers/me/notification-preferences", { sms: true }, asha)
  })
})

describe("the delivery OTP", () => {
  test("decrypted only when sent: in the SMS, never stored, never in push", async () => {
    const { sealed } = newOtp()
    const now = new Date()
    await db.deliveryTasks().insertOne({ _id: "dlv_otp", code: "EWF100000099", shipmentId: "ship_x", fulfilmentId: "ful_x", orderId: order.id, displayId: order.displayId, warehouseId: "wh_x", zoneId: "zone_x", status: "out_for_delivery", riderId: "rdr_ravi", declinedBy: [], stop: { name: "Asha", phone: "9886099999", address1: "21 Church Street", city: "Bengaluru", postalCode: "560001" }, cod: null, otp: sealed, attempts: [], earnings: [], createdAt: now, updatedAt: now })
    const o = (await db.orders().findOne({ _id: order.id }))!
    await notifyCustomer(o, "delivery_otp", "otp:dlv_otp:1", {}, { secret: { otpTaskId: "dlv_otp" } })
    const stored = await deliveries({ event: "delivery_otp" })
    assert.ok(stored.every((d) => !JSON.stringify(d).includes(openOtp(sealed))), "the code isn't stored")
    await drain()
    const sms = stub.recorded("/api/v5/flow").at(-1)!
    assert.equal(sms.body.template_id, "64f0aa11bb22cc44")
    assert.equal(sms.body.recipients[0].var1, openOtp(sealed))
    const push = stub.state.pushedPayloads.at(-1) as Json
    assert.equal(JSON.stringify(push).includes(openOtp(sealed)), false, "not on a lock screen")
  })

  test("once delivered, a queued OTP message is dropped", async () => {
    await db.deliveryTasks().updateOne({ _id: "dlv_otp" }, { $set: { status: "delivered", otp: null } })
    const o = (await db.orders().findOne({ _id: order.id }))!
    await notifyCustomer(o, "delivery_otp", "otp:dlv_otp:2", {}, { secret: { otpTaskId: "dlv_otp" } })
    await drain()
    const sms = (await deliveries({ key: { $regex: "^otp:dlv_otp:2:sms" } }))[0]!
    assert.equal(sms.status, "skipped")
    assert.equal(sms.skipReason, "The delivery code is no longer valid")
  })
})

describe("the other providers", () => {
  test("Twilio SMS: form post, basic auth, +91 number", async () => {
    env.NOTIFY_SMS_PROVIDER = "twilio"
    try {
      const o = (await db.orders().findOne({ _id: order.id }))!
      await notifyCustomer(o, "delivered", `test:${o._id}:twilio`)
      await drain()
      const r = stub.recorded("/2010-04-01/Accounts/ACtest/Messages.json").at(-1)!
      assert.equal(r.headers.authorization, `Basic ${Buffer.from("ACtest:twilio-token").toString("base64")}`)
      assert.deepEqual(r.body, { To: "+919886099999", Body: `Your Everwear order #${order.displayId} has been delivered. - Everwear`, From: "+15005550006" })
      assert.equal((await deliveries({ key: { $regex: "twilio:sms" } }))[0]!.provider, "twilio")
    } finally {
      delete env.NOTIFY_SMS_PROVIDER
    }
  })

  test("Gupshup WhatsApp: template id and params as form fields", async () => {
    env.NOTIFY_WHATSAPP_PROVIDER = "gupshup"
    await setTemplate("refund_processed", { gupshupTemplateId: "c1f0e2d3-gupshup" })
    try {
      const o = (await db.orders().findOne({ _id: order.id }))!
      await notifyCustomer(o, "refund_processed", `test:${o._id}:gupshup`, { amount: 49950 })
      await drain()
      const r = stub.recorded("/wa/api/v1/template/msg").at(-1)!
      assert.equal(r.headers.apikey, "gupshup-key")
      assert.equal(r.body.destination, "919886099999")
      assert.equal(r.body["src.name"], "everwear")
      assert.deepEqual(JSON.parse(r.body.template), { id: "c1f0e2d3-gupshup", params: ["Rs 499.50", `#${order.displayId}`] })
    } finally {
      delete env.NOTIFY_WHATSAPP_PROVIDER
    }
  })

  test("Amazon SES: SigV4-signed request the service verifies", async () => {
    env.NOTIFY_EMAIL_PROVIDER = "ses"
    try {
      const o = (await db.orders().findOne({ _id: order.id }))!
      await notifyCustomer(o, "payment_received", `test:${o._id}:ses`, { amount: 99900 })
      await drain()
      const d = (await deliveries({ key: { $regex: "ses:email" } }))[0]!
      assert.equal(d.status, "sent", d.lastError)
      assert.equal(d.provider, "ses")
      const r = stub.recorded("/v2/email/outbound-emails").at(-1)!
      assert.deepEqual(r.body.Destination, { ToAddresses: ["asha@example.com"] })
      assert.match(r.body.Content.Simple.Subject.Data, /Payment received/)
    } finally {
      delete env.NOTIFY_EMAIL_PROVIDER
    }
  })

  test("FCM: OAuth with the service account, then the message; an unregistered token is forgotten", async () => {
    assert.equal((await call("POST", "/rider/push-subscriptions", { token: "fcm-device-token-ravi-0001-abcdef" }, ravi)).status, 201)
    assert.equal((await call("POST", "/rider/push-subscriptions", { token: "gone-device-token-ravi-0002-abcdef" }, ravi)).status, 201)
    await notifyRider("rdr_ravi", "delivery_assigned", "test:ravi:assigned", { awb: "EWF100000123" })
    await drain()
    const sent = stub.recorded("/v1/projects/everwear-test/messages:send")
    assert.equal(stub.recorded("/token").length, 1, "one access token, cached")
    assert.ok(sent.some((r) => r.body.message.token === "fcm-device-token-ravi-0001-abcdef" && r.body.message.notification.title === "Delivery EWF100000123 assigned to you"))
    assert.equal(await db.pushSubscriptions().countDocuments({ token: /^gone-/ }), 0)
    assert.equal((await deliveries({ key: { $regex: "ravi:assigned:push" } }))[0]!.status, "sent", "one device got it")
    const sms = stub.recorded("/api/v5/flow").filter((r) => r.body.recipients[0].mobiles === "919000000001")
    assert.equal(sms.length, 0, "delivery_assigned has no MSG91 flow, so the rider SMS is skipped")
  })

  test("a browser that unsubscribed is forgotten", async () => {
    await call("POST", "/store/customers/me/push-subscriptions", { endpoint: `${url}/push/unknown-device`, keys: stub.browserSubscription(url, "temp").keys }, asha)
    const o = (await db.orders().findOne({ _id: order.id }))!
    await notifyCustomer(o, "order_packed", `test:${o._id}:packed:2`)
    await drain()
    assert.equal(await db.pushSubscriptions().countDocuments({ endpoint: `${url}/push/unknown-device` }), 0)
    assert.equal(await db.pushSubscriptions().countDocuments({ ownerId: "cus_asha" }), 1, "the working browser stays")
  })

  test("admins see every message and its outcome", async () => {
    const list = (await call("GET", "/admin/notifications/deliveries?status=dead", undefined, owner)).body.deliveries
    assert.ok(list.length >= 2)
    assert.equal(list[0].content.html, undefined, "bodies stay out of the list")
    const status = (await call("GET", "/admin/notifications/status", undefined, owner)).body
    assert.ok(status.deliveries.sent > 5)
  })
})
