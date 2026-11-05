import assert from "node:assert/strict"
import crypto from "node:crypto"
import { test } from "node:test"

// Settings are read once at import, so set them before loading the modules.
process.env.NODE_ENV = "test"
process.env.RAZORPAY_KEY_ID = "rzp_test_unit"
process.env.RAZORPAY_KEY_SECRET = "test_razorpay_secret_key_12345"
process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test_razorpay_secret_67890"
const { verifyRazorpaySignature, verifyRazorpayWebhook } = await import("../src/lib/payments/razorpay.js")
const { mapShiprocketStatus, shouldAdvance, fulfillmentFor } = await import("../src/lib/shipping/status.js")

test("payments: checkout signature is HMAC-SHA256 of order_id|payment_id with the key secret", () => {
  const orderId = "order_rzp_984210"
  const paymentId = "pay_rzp_884120"
  const good = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex")
  assert.equal(verifyRazorpaySignature({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: good }), true)
  assert.equal(verifyRazorpaySignature({ razorpayOrderId: orderId, razorpayPaymentId: "pay_tampered", razorpaySignature: good }), false)
  assert.equal(verifyRazorpaySignature({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: "short" }), false)
})

test("payments: webhook signature covers the exact raw body", () => {
  const raw = JSON.stringify({ event: "payment.captured", id: "evt_123" })
  const sig = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(raw).digest("hex")
  assert.equal(verifyRazorpayWebhook(raw, sig), true)
  assert.equal(verifyRazorpayWebhook(raw + " ", sig), false, "re-serialised JSON must not verify")
})

test("shipping: courier statuses map to internal ones, and unknown ones are not guessed", () => {
  assert.equal(mapShiprocketStatus(7, "DELIVERED"), "delivered")
  assert.equal(mapShiprocketStatus(17, null), "out_for_delivery")
  assert.equal(mapShiprocketStatus(null, "RTO Delivered"), "rto_delivered")
  assert.equal(mapShiprocketStatus(null, "Undelivered - customer not available"), "delivery_failed")
  assert.equal(mapShiprocketStatus(9999, "Something new"), null)
  assert.equal(shouldAdvance("delivered", "in_transit"), false)
  assert.equal(shouldAdvance("delivery_failed", "out_for_delivery"), true)
  assert.equal(fulfillmentFor("rto_delivered"), "returned")
})
