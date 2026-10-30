import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"

process.env.MONGODB_DB = "everwear_test_e2e"
process.env.NODE_ENV = "test"
process.env.JWT_SECRET = "01234567890123456789012345678901"

const { connect, disconnect, getDb } = await import("../src/db/client.js")
const { db, ensureIndexes } = await import("../src/db/schema.js")
const { createApp } = await import("../src/app.js")
const { startTestServer } = await import("./server.js")
const { hashPassword } = await import("../src/lib/auth.js")

const { request, close } = await startTestServer(createApp())
type Json = Record<string, any>

const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const res = await request(path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return { status: res.status, body: (await res.json().catch(() => null)) as Json }
}

const customerAddress = {
  firstName: "Aarav",
  lastName: "Sharma",
  address1: "100 Feet Road, Indiranagar",
  city: "Bengaluru",
  postalCode: "560038",
  province: "Karnataka",
  countryCode: "in",
  phone: "+91 9886012345",
}

let adminToken = ""
let customerToken = ""
let customerId = ""
let productId = "prod_e2e_1"
let variantId = "var_e2e_1"

before(async () => {
  await connect()
  await getDb().dropDatabase()
  await ensureIndexes()

  // 1. Seed Indian region
  await db.regions().insertOne({
    _id: "reg_in",
    name: "India",
    currency: "inr",
    countries: [{ code: "in", name: "India" }],
    taxRate: 12,
    taxInclusive: false,
    shippingOptions: [
      { _id: "so_std", name: "Standard Delivery (India)", amount: 0 },
      { _id: "so_exp", name: "Express Delivery (India)", amount: 9900 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // 2. Seed Admin user
  const adminPasswordHash = await hashPassword("adminpassword123")
  await db.adminUsers().insertOne({
    _id: "admin_owner",
    email: "owner@everwear.test",
    passwordHash: adminPasswordHash,
    name: "Owner Admin",
    role: "owner",
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // 3. Seed test product with 50 units in stock
  await db.products().insertOne({
    _id: productId,
    handle: "handloom-tussar-silk-kurta",
    title: "Handloom Tussar Silk Kurta",
    status: "published",
    options: [{ title: "Size", values: ["M", "L"] }],
    variants: [
      {
        _id: variantId,
        title: "M / Natural Tussar",
        sku: "EVR-KUR-TSR-M",
        options: { Size: "M" },
        prices: { inr: 349900 }, // ₹3,499.00
        stock: 50,
        manageInventory: true,
        allowBackorder: false,
      },
      {
        _id: "var_e2e_2",
        title: "L / Natural Tussar",
        sku: "EVR-KUR-TSR-L",
        options: { Size: "L" },
        prices: { inr: 349900 },
        stock: 50,
        manageInventory: true,
        allowBackorder: false,
      },
    ],
    categoryIds: [],
    images: [],
    tags: ["handloom", "silk"],
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Authenticate Admin
  const adminLogin = await call("POST", "/admin/auth/login", {
    email: "owner@everwear.test",
    password: "adminpassword123",
  })
  assert.equal(adminLogin.status, 200)
  adminToken = adminLogin.body.token
})

describe("End-to-End Customer & Admin Integrated Flow", () => {
  test("1. Customer registration, login, and profile addresses", async () => {
    // Register
    const reg = await call("POST", "/store/auth/register", {
      email: "aarav.sharma@example.com",
      password: "customerpassword123",
      firstName: "Aarav",
      lastName: "Sharma",
      phone: "+91 9886012345",
    })
    assert.equal(reg.status, 201)
    customerToken = reg.body.token
    assert.ok(customerToken)

    // Verify authenticated profile retrieval
    const me = await call("GET", "/store/customers/me", undefined, {
      Authorization: `Bearer ${customerToken}`,
    })
    assert.equal(me.status, 200)
    assert.equal(me.body.customer.email, "aarav.sharma@example.com")
    customerId = me.body.customer.id

    // Add customer address
    const addAddress = await call("POST", "/store/customers/me/addresses", customerAddress, {
      Authorization: `Bearer ${customerToken}`,
    })
    assert.equal(addAddress.status, 201)
    assert.equal(addAddress.body.customer.addresses.length, 1)
  })

  test("2. Cart creation, adding items, stock deduction, and COD order placement", async () => {
    // Create Cart
    const cartRes = await call("POST", "/store/carts", { country: "in" })
    assert.equal(cartRes.status, 201)
    const cartId = cartRes.body.cart.id

    // Associate customer
    const setCust = await call("POST", `/store/carts/${cartId}/customer`, undefined, {
      Authorization: `Bearer ${customerToken}`,
    })
    assert.equal(setCust.status, 200)

    // Add 2 units of Handloom Tussar Kurta
    const addItem = await call("POST", `/store/carts/${cartId}/items`, {
      variantId,
      quantity: 2,
    })
    assert.equal(addItem.status, 200)

    // Set Shipping Address & Option
    await call("PATCH", `/store/carts/${cartId}`, {
      email: "aarav.sharma@example.com",
      shippingAddress: customerAddress,
      billingAddress: customerAddress,
    })
    await call("POST", `/store/carts/${cartId}/shipping`, { optionId: "so_std" })

    // Initial stock check
    const prodBefore = await db.products().findOne({ _id: productId })
    const variantBefore = prodBefore?.variants.find((v) => v._id === variantId)
    assert.equal(variantBefore?.stock, 50)

    // Complete order via Cash on Delivery
    const complete = await call("POST", `/store/carts/${cartId}/complete`)
    assert.equal(complete.status, 201)
    const order = complete.body.order
    assert.ok(order.id)
    assert.equal(order.paymentStatus, "awaiting")
    assert.equal(order.fulfillmentStatus, "unfulfilled")
    assert.equal(order.paymentMethod, "cod")

    // VERIFY MONGODB ATOMIC STOCK DEDUCTION
    const prodAfter = await db.products().findOne({ _id: productId })
    const variantAfter = prodAfter?.variants.find((v) => v._id === variantId)
    assert.equal(variantAfter?.stock, 48, "Stock must be deducted by exactly 2 in MongoDB")

    // VERIFY ORDER CANCELLATION RESTORES STOCK
    const cancelRes = await call("POST", `/admin/orders/${order.id}/cancel`, undefined, {
      Authorization: `Bearer ${adminToken}`,
    })
    assert.equal(cancelRes.status, 200)
    assert.equal(cancelRes.body.order.status, "canceled")

    const prodRestored = await db.products().findOne({ _id: productId })
    const variantRestored = prodRestored?.variants.find((v) => v._id === variantId)
    assert.equal(variantRestored?.stock, 50, "Canceled order must restore stock in MongoDB")
  })

  test("3. Online Payment (Razorpay Intent & Confirmation) with automated GST Invoice", async () => {
    // Create new Cart
    const cartRes = await call("POST", "/store/carts", { country: "in" })
    const cartId = cartRes.body.cart.id

    await call("POST", `/store/carts/${cartId}/customer`, undefined, {
      Authorization: `Bearer ${customerToken}`,
    })
    await call("POST", `/store/carts/${cartId}/items`, { variantId, quantity: 1 })
    await call("PATCH", `/store/carts/${cartId}`, {
      email: "aarav.sharma@example.com",
      shippingAddress: customerAddress,
      billingAddress: customerAddress,
    })
    await call("POST", `/store/carts/${cartId}/shipping`, { optionId: "so_std" })

    // Call payment-intent
    const intentRes = await call("POST", `/store/carts/${cartId}/payment-intent`, {
      provider: "razorpay",
    })
    assert.equal(intentRes.status, 200)
    assert.equal(intentRes.body.provider, "razorpay")

    // Confirm payment
    const confirmRes = await call("POST", `/store/carts/${cartId}/confirm-payment`, {
      provider: "razorpay",
      razorpayOrderId: intentRes.body.razorpayOrderId,
      razorpayPaymentId: "pay_test_online_89410",
      razorpaySignature: "sig_valid_test",
    })
    assert.equal(confirmRes.status, 201)
    const paidOrder = confirmRes.body.order
    assert.equal(paidOrder.paymentStatus, "paid")
    assert.equal(paidOrder.paymentMethod, "razorpay")

    // VERIFY GST INVOICE ISSUED IN MONGODB
    const invoice = await db.invoices().findOne({ orderId: paidOrder.id })
    assert.ok(invoice, "Automated GST invoice must be created in MongoDB invoices collection")
    assert.equal(invoice?.status, "paid")
    assert.equal(invoice?.customerName, "Aarav Sharma")

    // 4. Admin Manifests Carrier Shipment (Delhivery)
    const shipRes = await call(
      "POST",
      `/admin/orders/${paidOrder.id}/shipment`,
      { carrier: "delhivery" },
      { Authorization: `Bearer ${adminToken}` }
    )
    assert.equal(shipRes.status, 201)
    const shipment = shipRes.body.shipment
    assert.ok(shipment.awb, "AWB must be generated for carrier shipment")
    assert.equal(shipment.carrier, "delhivery")

    // Verify shipment record in MongoDB
    const shipDoc = await db.shipments().findOne({ orderId: paidOrder.id })
    assert.ok(shipDoc)
    assert.equal(shipDoc?.status, "manifested")

    // 5. Track Carrier Shipment
    const trackRes = await call("GET", `/admin/orders/${paidOrder.id}/track`, undefined, {
      Authorization: `Bearer ${adminToken}`,
    })
    assert.equal(trackRes.status, 200)
    assert.equal(trackRes.body.carrier, "delhivery")

    // 6. Customer Returns & Admin Issues Credit Note
    const approveReturn = await call(
      "POST",
      `/admin/orders/${paidOrder.id}/return-request`,
      { reason: "Size exchange needed", action: "approve" },
      { Authorization: `Bearer ${adminToken}` }
    )
    assert.equal(approveReturn.status, 200)
    assert.ok(approveReturn.body.returnAwb)

    // Admin processes refund
    const refundRes = await call(
      "POST",
      `/admin/orders/${paidOrder.id}/return-request`,
      { reason: "Inspection passed", action: "refund" },
      { Authorization: `Bearer ${adminToken}` }
    )
    assert.equal(refundRes.status, 200)
    assert.equal(refundRes.body.status, "refunded")

    // VERIFY CREDIT NOTE IN MONGODB
    const creditNote = await db.creditNotes().findOne({ orderId: paidOrder.id })
    assert.ok(creditNote, "Credit note must be issued in MongoDB credit_notes collection")
    assert.equal(creditNote?.status, "settled")
  })

  test("7. Procurement Purchase Orders & Inventory Telemetry Adjustment in MongoDB", async () => {
    // Admin creates Purchase Order
    const poRes = await call(
      "POST",
      "/admin/purchase-orders",
      {
        supplierId: "sup_jaipur_01",
        supplierName: "Jaipur Handlooms Co.",
        hubId: "BLR-FC1",
        items: [{ sku: "EVR-KUR-TSR-M", name: "Handloom Tussar Kurta", quantity: 100, unitCost: 150000 }],
      },
      { Authorization: `Bearer ${adminToken}` }
    )
    assert.equal(poRes.status, 201)
    const poNumber = poRes.body.purchaseOrder.poNumber
    assert.ok(poNumber)

    const poDoc = await db.purchaseOrders().findOne({ poNumber })
    assert.ok(poDoc)
    assert.equal(poDoc?.status, "submitted")

    // Admin adjusts inventory stock
    const adjustRes = await call(
      "POST",
      "/admin/inventory/adjust",
      {
        productId,
        variantId,
        adjustment: 25,
        reason: "Warehouse GRN inbound arrival",
      },
      { Authorization: `Bearer ${adminToken}` }
    )
    assert.equal(adjustRes.status, 200)

    // Verify stock is adjusted in MongoDB product variant
    const productUpdated = await db.products().findOne({ _id: productId })
    const variantUpdated = productUpdated?.variants.find((v) => v._id === variantId)
    // 50 initial - 1 (paid order) + 25 = 74
    assert.equal(variantUpdated?.stock, 74, "Stock must accurately reflect inbound adjustment in MongoDB")
  })

  after(async () => {
    await close()
    await disconnect()
  })
})
