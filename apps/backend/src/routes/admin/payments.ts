import { Router } from "express"
import { z } from "zod"
import { db } from "../../db/schema.js"
import { env } from "../../env.js"
import { forbidden, notFound } from "../../lib/errors.js"
import { isRazorpayConfigured } from "../../lib/payments/razorpay.js"
import { reconcileRefunds, refundOrder } from "../../lib/payments/refunds.js"
import { reconcilePaymentAttempts } from "../../lib/payments/settle.js"
import { shippingConfigured, syncStaleShipments } from "../../lib/shipping/service.js"

export const adminPaymentRoutes = Router()

/** Which integrations are live, so the admin can say why a button is unavailable. */
adminPaymentRoutes.get("/integrations", (_req, res) => {
  res.json({
    razorpay: { configured: isRazorpayConfigured(), webhook: !!env.RAZORPAY_WEBHOOK_SECRET, mode: env.RAZORPAY_KEY_ID?.startsWith("rzp_live_") ? "live" : env.RAZORPAY_KEY_ID ? "test" : null },
    shipping: { provider: shippingConfigured() ? "shiprocket" : "none", webhook: !!env.SHIPROCKET_WEBHOOK_TOKEN, originPincode: env.SHIPPING_ORIGIN_PINCODE ?? null },
  })
})

/** Every online payment attempt (Razorpay order) and what became of it. */
adminPaymentRoutes.get("/payment-attempts", async (req, res) => {
  const q = z.object({ status: z.enum(["created", "paid", "failed", "expired", "refunded"]).optional() }).parse(req.query)
  const attempts = await db.paymentAttempts().find(q.status ? { status: q.status } : {}, { sort: { createdAt: -1 }, limit: 200 }).toArray()
  res.json({ attempts })
})

adminPaymentRoutes.get("/refunds", async (_req, res) => {
  res.json({ refunds: await db.refunds().find({}, { sort: { createdAt: -1 }, limit: 200 }).toArray() })
})

adminPaymentRoutes.get("/orders/:id/payments", async (req, res) => {
  const order = await db.orders().findOne({ _id: req.params.id })
  if (!order) throw notFound("Order")
  const [attempts, refunds] = await Promise.all([
    db.paymentAttempts().find({ cartId: order.cartId }, { sort: { createdAt: -1 } }).toArray(),
    db.refunds().find({ orderId: order._id }, { sort: { createdAt: -1 } }).toArray(),
  ])
  res.json({ attempts, refunds })
})

/** Refunds part or all of an order's payment (owner only). */
adminPaymentRoutes.post("/orders/:id/refunds", async (req, res) => {
  if (req.admin!.role !== "owner") throw forbidden("Only an owner can refund")
  const body = z.object({ amount: z.number().int().positive().optional(), reason: z.string().trim().min(3).max(300) }).parse(req.body)
  const order = await db.orders().findOne({ _id: req.params.id })
  if (!order) throw notFound("Order")
  const refund = await refundOrder(order, { ...body, adminId: req.admin!.id })
  res.status(201).json({ refund })
})

/** Recent provider webhooks and whether they applied, for spotting failures. */
adminPaymentRoutes.get("/webhook-events", async (req, res) => {
  const q = z.object({ provider: z.enum(["razorpay", "shiprocket"]).optional(), status: z.enum(["processing", "processed", "failed", "ignored"]).optional() }).parse(req.query)
  const events = await db
    .paymentWebhookEvents()
    .find({ ...(q.provider ? { provider: q.provider } : {}), ...(q.status ? { status: q.status } : {}) }, { sort: { createdAt: -1 }, limit: 100, projection: { payload: 0, signature: 0 } })
    .toArray()
  res.json({ events })
})

/** Runs the reconciliation sweeps now instead of waiting for the background timer. */
adminPaymentRoutes.post("/reconcile", async (req, res) => {
  if (req.admin!.role !== "owner") throw forbidden("Only an owner can run reconciliation")
  const [payments, refunds, shipments] = await Promise.all([reconcilePaymentAttempts(), reconcileRefunds(), syncStaleShipments()])
  res.json({ payments, refunds, shipments })
})
