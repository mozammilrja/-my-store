import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"

process.env.MONGODB_DB = "everwear_test_concurrency"
process.env.NODE_ENV = "test"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")
const { processOutboxEvents, expireStaleReservations } = await import("../src/lib/outbox-worker.js")
const { newId } = await import("../src/lib/ids.js")

const { request, close } = await startTestServer(createApp())
type Json = Record<string, any>

const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const res = await request(path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const text = await res.text()
  let data: Json = {}
  try {
    data = JSON.parse(text)
  } catch {
    // raw text
  }
  return { status: res.status, body: data }
}

const testAddress = {
  firstName: "Aarav",
  lastName: "Sharma",
  address1: "100 MG Road",
  city: "Bengaluru",
  postalCode: "560001",
  countryCode: "in",
}

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
    taxInclusive: true,
    shippingOptions: [{ _id: "so_std", name: "Standard Delivery", amount: 0 }],
    createdAt: now,
    updatedAt: now,
  })

  // Product with exactly 1 unit in stock for the overselling test
  await db.products().insertOne({
    _id: "prod_scarce",
    handle: "scarce-jacket",
    title: "Scarce Jacket",
    status: "published",
    images: [],
    categoryIds: [],
    collectionId: null,
    tags: ["exclusive"],
    options: [{ title: "Size", values: ["M"] }],
    variants: [
      {
        _id: "var_scarce_1",
        title: "M",
        options: { Size: "M" },
        prices: { inr: 499900 },
        manageInventory: true,
        allowBackorder: false,
        stock: 1, // Only 1 in stock!
      },
    ],
    createdAt: now,
    updatedAt: now,
  })

  // Product with multiple items for overlapping SKU test
  await db.products().insertOne({
    _id: "prod_multi",
    handle: "multi-shirt",
    title: "Multi Shirt",
    status: "published",
    images: [],
    categoryIds: [],
    collectionId: null,
    tags: ["shirts"],
    options: [{ title: "Color", values: ["Blue", "White"] }],
    variants: [
      {
        _id: "var_blue",
        title: "Blue",
        options: { Color: "Blue" },
        prices: { inr: 199900 },
        manageInventory: true,
        allowBackorder: false,
        stock: 10,
      },
      {
        _id: "var_white",
        title: "White",
        options: { Color: "White" },
        prices: { inr: 199900 },
        manageInventory: true,
        allowBackorder: false,
        stock: 5,
      },
    ],
    createdAt: now,
    updatedAt: now,
  })

  // Promotion with usage limit of 3
  await db.promotions().insertOne({
    _id: "promo_limit_3",
    code: "FLASH3",
    type: "percentage",
    value: 20,
    active: true,
    usageLimit: 3,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  })
})

after(async () => {
  await close()
  await disconnect()
})

describe("Everwear High-Concurrency & Correctness Suite", () => {
  test("1. Overselling: 100 simultaneous requests for 1 remaining stock item", async () => {
    const now = new Date()
    const region = await db.regions().findOne({ currency: "inr" })
    const product = await db.products().findOne({ _id: "prod_scarce" })
    const variant = product?.variants[0]!

    const lineItem = {
      _id: "li_scarce_1",
      productId: product!._id,
      variantId: variant._id,
      productTitle: product!.title,
      productHandle: product!.handle,
      variantTitle: variant.title,
      quantity: 1,
      unitPrice: variant.prices.inr!,
    }

    const carts = Array.from({ length: 100 }, (_, i) => ({
      _id: newId("cart"),
      regionId: region!._id,
      currency: "inr",
      email: `buyer${i}@everwear.test`,
      items: [{ ...lineItem, _id: `li_${i}` }],
      shippingAddress: testAddress,
      billingAddress: testAddress,
      shippingOptionId: "so_std",
      promoCodes: [],
      createdAt: now,
      updatedAt: now,
    }))

    await db.carts().insertMany(carts)

    // Fire all 100 checkouts simultaneously
    const results = await Promise.all(
      carts.map((c) => call("POST", `/store/carts/${c._id}/complete`))
    )

    const successes = results.filter((r) => r.status === 201)
    const outOfStockFailures = results.filter((r) => r.status === 409)

    // Exactly 1 request must win; 99 must be rejected
    assert.equal(successes.length, 1, "Exactly one order must be successfully placed")
    assert.equal(outOfStockFailures.length, 99, "99 orders must fail with 409 out of stock")

    // Verify database stock is exactly 0 and never dropped below 0
    const updatedProd = await db.products().findOne({ _id: "prod_scarce" })
    const updatedVariant = updatedProd?.variants.find((v) => v._id === "var_scarce_1")
    assert.equal(updatedVariant?.stock, 0, "Stock must be exactly 0")

    // Verify only 1 order exists for this product variant
    const orders = await db.orders().find({ "items.variantId": "var_scarce_1" }).toArray()
    assert.equal(orders.length, 1, "Only 1 order must be recorded in MongoDB")
  })

  test("2. Idempotency: 20 duplicate checkouts with identical idempotency key", async () => {
    const { body: cb } = await call("POST", "/store/carts", { country: "in" })
    const cartId = cb.cart.id
    await call("POST", `/store/carts/${cartId}/items`, { variantId: "var_blue", quantity: 1 })
    await call("PATCH", `/store/carts/${cartId}`, {
      email: "idempotent.shopper@everwear.test",
      shippingAddress: testAddress,
    })
    await call("POST", `/store/carts/${cartId}/shipping`, { optionId: "so_std" })

    const IDEMPOTENCY_KEY = `idem_key_${Date.now()}`

    // Send 20 concurrent requests with the identical Idempotency-Key
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        call("POST", `/store/carts/${cartId}/complete`, {}, { "idempotency-key": IDEMPOTENCY_KEY })
      )
    )

    const successStatuses = results.filter((r) => r.status === 201)
    assert.equal(successStatuses.length, 20, "All 20 requests must return HTTP 201")

    // All must return the exact same order displayId and order ID
    const firstOrderId = results[0]?.body?.order?.id
    const firstDisplayId = results[0]?.body?.order?.displayId
    assert.ok(firstOrderId, "First order ID must exist")

    for (const res of results) {
      assert.equal(res.body.order.id, firstOrderId, "Order IDs must match exactly across all responses")
      assert.equal(res.body.order.displayId, firstDisplayId, "Display IDs must match exactly")
    }

    // Exactly 1 order doc must exist for this cart
    const orderDocs = await db.orders().find({ cartId }).toArray()
    assert.equal(orderDocs.length, 1, "Only 1 order document must exist in MongoDB")
  })

  test("3. Overlapping SKU checkouts across multiple carts", async () => {
    // 5 concurrent carts buying 1 unit of var_white (stock is 5)
    const cartIds: string[] = []
    for (let i = 0; i < 5; i++) {
      const { body: cb } = await call("POST", "/store/carts", { country: "in" })
      const cId = cb.cart.id
      await call("POST", `/store/carts/${cId}/items`, { variantId: "var_white", quantity: 1 })
      await call("PATCH", `/store/carts/${cId}`, {
        email: `overlap${i}@everwear.test`,
        shippingAddress: testAddress,
      })
      await call("POST", `/store/carts/${cId}/shipping`, { optionId: "so_std" })
      cartIds.push(cId)
    }

    const results = await Promise.all(
      cartIds.map((cId) => call("POST", `/store/carts/${cId}/complete`))
    )

    const successes = results.filter((r) => r.status === 201)
    assert.equal(successes.length, 5, "All 5 carts must successfully checkout")

    // Var_white stock started at 5 and must now be 0
    const product = await db.products().findOne({ _id: "prod_multi" })
    const varWhite = product?.variants.find((v) => v._id === "var_white")
    assert.equal(varWhite?.stock, 0, "White shirt stock must be exactly 0")

    // Subsequent checkout attempt must fail
    const { body: extraCart } = await call("POST", "/store/carts", { country: "in" })
    await call("POST", `/store/carts/${extraCart.cart.id}/items`, { variantId: "var_white", quantity: 1 })
    await call("PATCH", `/store/carts/${extraCart.cart.id}`, {
      email: "extra@everwear.test",
      shippingAddress: testAddress,
    })
    await call("POST", `/store/carts/${extraCart.cart.id}/shipping`, { optionId: "so_std" })
    const extraCheckout = await call("POST", `/store/carts/${extraCart.cart.id}/complete`)
    assert.equal(extraCheckout.status, 409, "Must return 409 out of stock")
  })

  test("4. Duplicate payment webhooks deduplication", async () => {
    // Create an order in 'awaiting' status
    const { body: cb } = await call("POST", "/store/carts", { country: "in" })
    const cartId = cb.cart.id
    await call("POST", `/store/carts/${cartId}/items`, { variantId: "var_blue", quantity: 1 })
    await call("PATCH", `/store/carts/${cartId}`, {
      email: "webhook.test@everwear.test",
      shippingAddress: testAddress,
    })
    await call("POST", `/store/carts/${cartId}/shipping`, { optionId: "so_std" })

    const { body: ordRes } = await call("POST", `/store/carts/${cartId}/complete`)
    const orderId = ordRes.order.id

    const webhookEvent = {
      id: `evt_test_${Date.now()}`,
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: `pay_test_${Date.now()}`,
            amount: ordRes.order.totals.total,
            currency: "INR",
            notes: { orderId },
          },
        },
      },
    }

    // Send 10 duplicate concurrent webhooks
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        call("POST", "/store/webhooks/razorpay", webhookEvent, {
          "x-razorpay-signature": "dummy_sig",
          "x-razorpay-event-id": webhookEvent.id,
        })
      )
    )

    // All should return HTTP 200 (idempotent webhook acknowledgement)
    for (const r of results) {
      assert.equal(r.status, 200)
    }

    // Verify order is paid
    const updatedOrder = await db.orders().findOne({ _id: orderId })
    assert.equal(updatedOrder?.paymentStatus, "paid")

    // Exactly 1 webhook event record stored in payment_webhook_events
    const eventCount = await db.paymentWebhookEvents().countDocuments({ eventId: webhookEvent.id })
    assert.equal(eventCount, 1, "Only 1 webhook record should be stored in MongoDB")
  })

  test("5. Coupon limit race condition (limit: 3, 10 concurrent checkouts)", async () => {
    const now = new Date()
    const region = await db.regions().findOne({ currency: "inr" })
    const product = await db.products().findOne({ _id: "prod_multi" })
    const variant = product?.variants.find((v) => v._id === "var_blue")!

    const lineItem = {
      _id: "li_blue_coupon",
      productId: product!._id,
      variantId: variant._id,
      productTitle: product!.title,
      productHandle: product!.handle,
      variantTitle: variant.title,
      quantity: 1,
      unitPrice: variant.prices.inr!,
    }

    const carts = Array.from({ length: 10 }, (_, i) => ({
      _id: newId("cart"),
      regionId: region!._id,
      currency: "inr",
      email: `flash${i}@everwear.test`,
      items: [{ ...lineItem, _id: `li_${i}` }],
      shippingAddress: testAddress,
      billingAddress: testAddress,
      shippingOptionId: "so_std",
      promoCodes: ["FLASH3"],
      createdAt: now,
      updatedAt: now,
    }))

    await db.carts().insertMany(carts)

    // Fire all 10 checkouts simultaneously
    const results = await Promise.all(
      carts.map((c) => call("POST", `/store/carts/${c._id}/complete`))
    )

    const successes = results.filter((r) => r.status === 201)
    const failures = results.filter((r) => r.status === 409)

    // Exactly 3 can use the coupon
    assert.equal(successes.length, 3, "Exactly 3 checkouts can redeem FLASH3")
    assert.equal(failures.length, 7, "Remaining 7 checkouts must be rejected with 409")

    const promo = await db.promotions().findOne({ code: "FLASH3" })
    assert.equal(promo?.usageCount, 3, "Promotion usageCount must equal exactly 3")
  })

  test("6. Refund ceiling: duplicate/excess refunds rejected", async () => {
    // Create an order
    const { body: cb } = await call("POST", "/store/carts", { country: "in" })
    const cartId = cb.cart.id
    await call("POST", `/store/carts/${cartId}/items`, { variantId: "var_blue", quantity: 1 })
    await call("PATCH", `/store/carts/${cartId}`, {
      email: "refund.test@everwear.test",
      shippingAddress: testAddress,
    })
    await call("POST", `/store/carts/${cartId}/shipping`, { optionId: "so_std" })
    const { body: ordRes } = await call("POST", `/store/carts/${cartId}/complete`)
    const orderId = ordRes.order.id
    const totalAmount = ordRes.order.totals.total

    // Mark paid in DB
    await db.orders().updateOne({ _id: orderId }, { $set: { paymentStatus: "paid" } })

    // Sign in as owner
    const adminUser = await db.adminUsers().findOne({ role: "owner" })
    const token = (await import("../src/lib/auth.js")).issueToken("admin", adminUser!._id)

    // First refund: partial refund of 50000 paise
    const ref1 = await call(
      "POST",
      `/admin/orders/${orderId}/return-request`,
      { action: "refund", reason: "Partial item return", amount: 50000 },
      { authorization: `Bearer ${token}` }
    )
    assert.equal(ref1.status, 200)

    // Attempt second refund exceeding remaining balance:
    // Remaining is totalAmount - 50000. Requesting totalAmount should fail!
    const ref2 = await call(
      "POST",
      `/admin/orders/${orderId}/return-request`,
      { action: "refund", reason: "Excess refund", amount: totalAmount },
      { authorization: `Bearer ${token}` }
    )
    assert.equal(ref2.status, 409, "Must reject refund that exceeds payment ceiling")
    assert.equal(ref2.body.error.code, "refund_ceiling_exceeded")
  })

  test("7. Multi-Warehouse Stock Allocation & Telemetry", async () => {
    const adminUser = await db.adminUsers().findOne({ role: "owner" })
    const token = (await import("../src/lib/auth.js")).issueToken("admin", adminUser!._id)

    // Check default warehouses
    const whRes = await call("GET", "/admin/warehouses", undefined, { authorization: `Bearer ${token}` })
    assert.equal(whRes.status, 200)
    assert.ok(whRes.body.warehouses.length >= 4, "Must have default fulfillment hubs")

    const blrHub = whRes.body.warehouses.find((w: any) => w.code === "BLR-FC1")
    assert.ok(blrHub, "BLR-FC1 hub must exist")

    // Adjust inventory in BLR-FC1
    const adjRes = await call(
      "POST",
      "/admin/inventory/adjust",
      {
        productId: "prod_multi",
        variantId: "var_blue",
        adjustment: 15,
        hubId: "BLR-FC1",
        reason: "Inbound stock shipment receipt",
      },
      { authorization: `Bearer ${token}` }
    )
    assert.equal(adjRes.status, 200)
    assert.equal(adjRes.body.adjustment, 15)

    // Check inventory movement ledger
    const movRes = await call("GET", "/admin/inventory/movements", undefined, { authorization: `Bearer ${token}` })
    assert.equal(movRes.status, 200)
    assert.ok(movRes.body.movements.length > 0, "Movements ledger must record adjustment")
    const lastMov = movRes.body.movements[0]
    assert.equal(lastMov.hubId, "BLR-FC1")
    assert.equal(lastMov.quantity, 15)
  })

  test("8. Stale reservation expiration and transactional outbox processor", async () => {
    const now = new Date()
    // Insert an expired reservation
    await db.inventoryReservations().insertOne({
      _id: "res_stale_1",
      cartId: "cart_stale",
      items: [{ variantId: "var_blue", sku: "SKU-BLUE", quantity: 2, hubId: "BLR-FC1" }],
      status: "active",
      expiresAt: new Date(now.getTime() - 60000), // 1 minute ago
      createdAt: new Date(now.getTime() - 120000),
      updatedAt: new Date(now.getTime() - 120000),
    })

    // Run expiration sweeper
    const expiredCount = await expireStaleReservations()
    assert.ok(expiredCount >= 1, "Must expire stale reservation")

    const resDoc = await db.inventoryReservations().findOne({ _id: "res_stale_1" })
    assert.equal(resDoc?.status, "expired", "Reservation status must be expired")

    // Run outbox processor
    const processedOutbox = await processOutboxEvents()
    assert.ok(processedOutbox >= 0, "Outbox processor must execute cleanly")
  })
})
