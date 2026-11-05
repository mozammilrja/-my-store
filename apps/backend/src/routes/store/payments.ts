import { createHash } from "node:crypto"
import { Router } from "express"
import { z } from "zod"
import { db } from "../../db/schema.js"
import { env } from "../../env.js"
import { priceCart } from "../../lib/checkout/place-order.js"
import { badRequest, notFound } from "../../lib/errors.js"
import { log } from "../../lib/log.js"
import { isRazorpayConfigured, verifyRazorpaySignature, verifyRazorpayWebhook } from "../../lib/payments/razorpay.js"
import { applyRazorpayEvent, openPaymentAttempt, settleRazorpayPayment } from "../../lib/payments/settle.js"
import { claimWebhookEvent } from "../../lib/providers/webhook-events.js"
import { toStoreOrder } from "../../lib/serialize.js"

export const storePaymentRoutes = Router()

const cartId = z.string().regex(/^cart_[0-9a-z]{16}$/, "invalid cart id")

/**
 * Which ways to pay work right now, so checkout only offers those. Online
 * methods (UPI, cards, net banking) all go through Razorpay and are available
 * only when its keys are configured; cash on delivery is always available.
 */
storePaymentRoutes.get("/payment-methods", (_req, res) => {
  const online = isRazorpayConfigured()
  res.json({
    online,
    provider: online ? "razorpay" : null,
    methods: {
      upi: online,
      card: online,
      netbanking: online,
      cod: true,
    },
  })
})

/**
 * Opens online payment for the cart: a Razorpay order for its exact total,
 * reused while it stays open. Cash on delivery needs no intent.
 */
storePaymentRoutes.post("/carts/:id/payment-intent", async (req, res) => {
  const body = z.object({ provider: z.enum(["razorpay", "cod"]) }).parse(req.body)
  const cart = await db.carts().findOne({ _id: cartId.parse(req.params.id) })
  if (!cart) throw notFound("Cart")
  if (body.provider === "cod") {
    const { totals } = await priceCart(cart)
    res.json({ provider: "cod", amount: totals.total, currency: cart.currency, ready: true })
    return
  }
  const attempt = await openPaymentAttempt(cart)
  res.json({
    provider: "razorpay",
    attemptId: attempt._id,
    razorpayOrderId: attempt.providerOrderId,
    amount: attempt.amount,
    currency: attempt.currency,
    // The public key id only; the secret never leaves the server.
    keyId: env.RAZORPAY_KEY_ID,
    expiresAt: attempt.expiresAt,
  })
})

/**
 * The checkout window reported a payment. Its signature is checked, then the
 * payment is re-read from Razorpay and settled; the order is placed only for
 * a captured payment of the exact amount for this cart's attempt.
 */
storePaymentRoutes.post("/carts/:id/confirm-payment", async (req, res) => {
  const body = z
    .object({
      provider: z.literal("razorpay"),
      razorpayOrderId: z.string().min(1).max(100),
      razorpayPaymentId: z.string().min(1).max(100),
      razorpaySignature: z.string().min(1).max(200),
    })
    .parse(req.body)
  const id = cartId.parse(req.params.id)
  if (!isRazorpayConfigured()) throw badRequest("Online payment isn't available right now. Please choose Cash on Delivery.", "payment_unavailable")

  const attempt = await db.paymentAttempts().findOne({ providerOrderId: body.razorpayOrderId, cartId: id })
  if (!attempt) throw badRequest("This payment doesn't belong to this checkout.", "payment_mismatch")
  if (!verifyRazorpaySignature(body)) {
    log.warn("payment.invalid_signature", { attemptId: attempt._id, cartId: id })
    throw badRequest("We couldn't verify this payment. If money was taken, it will be refunded or confirmed automatically.", "invalid_signature")
  }
  const order = await settleRazorpayPayment(attempt, body.razorpayPaymentId)
  res.status(201).json({ order: toStoreOrder(order) })
})

/**
 * Where a checkout's payment stands, for the page that waits on a payment the
 * bank hasn't confirmed yet. Re-checks Razorpay; never trusts the browser.
 */
storePaymentRoutes.get("/carts/:id/payment-status", async (req, res) => {
  const id = cartId.parse(req.params.id)
  const cart = await db.carts().findOne({ _id: id })
  if (!cart) throw notFound("Cart")
  if (cart.orderId) {
    res.json({ status: "paid", orderId: cart.orderId })
    return
  }
  const attempt = await db.paymentAttempts().findOne({ cartId: id }, { sort: { createdAt: -1 } })
  res.json({ status: attempt?.status ?? "none", failureReason: attempt?.failureReason ?? null })
})

/**
 * Razorpay webhooks. Refused unless RAZORPAY_WEBHOOK_SECRET is set and the
 * x-razorpay-signature matches the raw body. Each event id is applied once; a
 * failed one is applied again when Razorpay redelivers it.
 */
storePaymentRoutes.post("/webhooks/razorpay", async (req, res) => {
  const signature = req.header("x-razorpay-signature")
  const rawBody = (req as { rawBody?: Buffer }).rawBody
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    log.error("webhook.razorpay_unconfigured", {})
    res.status(503).json({ error: { code: "webhook_unconfigured", message: "Webhook secret not configured" } })
    return
  }
  if (!signature || !rawBody || !verifyRazorpayWebhook(rawBody, signature)) {
    log.warn("webhook.razorpay_bad_signature", { hasSignature: !!signature })
    res.status(400).json({ error: { code: "invalid_signature", message: "Invalid signature" } })
    return
  }
  const event = req.body as { event?: string; payload?: unknown }
  const eventId = req.header("x-razorpay-event-id") ?? createHash("sha256").update(rawBody).digest("hex")
  const claim = await claimWebhookEvent("razorpay", eventId, event.event ?? "unknown", event, signature)
  if (claim === "done") {
    res.json({ status: "ok", duplicate: true })
    return
  }
  if (claim === "busy") {
    res.status(409).json({ error: { code: "in_progress", message: "Event is being processed" } })
    return
  }
  try {
    const outcome = await applyRazorpayEvent(event as Parameters<typeof applyRazorpayEvent>[0])
    await db.paymentWebhookEvents().updateOne({ provider: "razorpay", eventId }, { $set: { status: outcome, processedAt: new Date() }, $unset: { error: "" } })
    res.json({ status: "ok" })
  } catch (e) {
    const message = (e as Error).message
    await db.paymentWebhookEvents().updateOne({ provider: "razorpay", eventId }, { $set: { status: "failed", error: message.slice(0, 500) } })
    log.error("webhook.razorpay_failed", { eventId, event: event.event, error: message })
    // Non-2xx: Razorpay redelivers, and the event is applied again.
    res.status(500).json({ error: { code: "processing_failed", message: "Will retry" } })
  }
})
