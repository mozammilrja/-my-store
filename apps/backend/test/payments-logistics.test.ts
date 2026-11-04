import assert from "node:assert/strict"
import crypto from "node:crypto"
import { test } from "node:test"
import { verifyRazorpaySignature, verifyRazorpayWebhook } from "../src/lib/payments/razorpay.js"
import { createDelhiveryShipment } from "../src/lib/logistics/delhivery.js"
import { createBlueDartShipment } from "../src/lib/logistics/bluedart.js"
import type { OrderDoc } from "../src/db/schema.js"

test("payments: razorpay cryptographic verification", async () => {
  process.env.RAZORPAY_KEY_SECRET = "test_razorpay_secret_key_12345"
  const orderId = "order_rzp_984210"
  const paymentId = "pay_rzp_884120"
  const payload = `${orderId}|${paymentId}`
  const validSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest("hex")

  // Valid signature returns true
  const valid = verifyRazorpaySignature({
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: validSignature,
  })
  assert.equal(valid, true, "Valid Razorpay signature must be accepted")

  // Tampered paymentId fails verification
  const invalidTampered = verifyRazorpaySignature({
    razorpayOrderId: orderId,
    razorpayPaymentId: "pay_tampered_999",
    razorpaySignature: validSignature,
    secret: "test_razorpay_secret_key_12345",
  })
  assert.equal(invalidTampered, false, "Tampered payload must fail signature verification")
})

test("payments: razorpay webhook verification", async () => {
  const secret = "whsec_test_razorpay_secret_67890"
  const payload = JSON.stringify({ event: "payment.captured", id: "evt_123" })
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex")

  const valid = verifyRazorpayWebhook(payload, signature, secret)
  assert.equal(valid, true, "Valid Razorpay webhook signature must be accepted")

  const tampered = verifyRazorpayWebhook(payload.replace("evt_123", "evt_999"), signature, secret)
  assert.equal(tampered, false, "Tampered Razorpay webhook payload must be rejected")
})

test("logistics: delhivery & bluedart carrier waybill generation", async () => {
  const dummyOrder: OrderDoc = {
    _id: "order_test_999",
    displayId: 1042,
    cartId: "cart_test_999",
    regionId: "reg_in",
    currency: "inr",
    email: "customer@example.com",
    items: [
      {
        _id: "item_1",
        productId: "prod_1",
        variantId: "var_1",
        productTitle: "Everwear Linen Shirt",
        productHandle: "linen-shirt",
        variantTitle: "L / White",
        quantity: 1,
        unitPrice: 2499,
      },
    ],
    shippingAddress: {
      firstName: "Aarav",
      lastName: "Patel",
      address1: "42 Indiranagar",
      city: "Bengaluru",
      postalCode: "560038",
      countryCode: "IN",
      phone: "9886012345",
    },
    billingAddress: {
      firstName: "Aarav",
      lastName: "Patel",
      address1: "42 Indiranagar",
      city: "Bengaluru",
      postalCode: "560038",
      countryCode: "IN",
    },
    shippingOption: { _id: "so_std", name: "Standard", amount: 0 },
    promoCodes: [],
    totals: { itemSubtotal: 2499, discountTotal: 0, shippingTotal: 0, taxTotal: 267, total: 2499 },
    paymentMethod: "cod",
    paymentStatus: "awaiting",
    fulfillmentStatus: "unfulfilled",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const dlv = await createDelhiveryShipment(dummyOrder)
  assert.ok(dlv.awb.startsWith("DLV1042"), "Delhivery generates compliant waybill starting with DLV")
  assert.equal(dlv.success, true)

  const bd = await createBlueDartShipment(dummyOrder)
  assert.ok(bd.awb.startsWith("841042"), "BlueDart generates compliant waybill starting with series 84")
  assert.equal(bd.success, true)
})
