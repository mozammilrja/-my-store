import { env } from "../../env.js"
import { db, type CartDoc, type OrderDoc, type PaymentAttemptDoc } from "../../db/schema.js"
import { ApiError, badRequest, conflict } from "../errors.js"
import { newId } from "../ids.js"
import { placeOrder, priceCart } from "../checkout/place-order.js"
import { log } from "../log.js"
import {
  captureRazorpayPayment,
  createRazorpayOrder,
  createRazorpayRefund,
  fetchRazorpayOrderPayments,
  fetchRazorpayPayment,
  isRazorpayConfigured,
  type RazorpayPayment,
} from "./razorpay.js"

/*
 * The one path a Razorpay payment takes to become an order, whichever signal
 * arrives first: the checkout callback, the payment.captured webhook, or the
 * reconciliation sweep. Each re-reads the payment from Razorpay; nothing the
 * browser says about a payment is trusted.
 */

const ttlMs = () => env.PAYMENT_ATTEMPT_TTL_MINUTES * 60_000

/**
 * The Razorpay order to pay this cart with. An open attempt for the same
 * amount is reused, so double-clicking Pay (or reopening the window) never
 * creates a second Razorpay order. A changed total gets a fresh attempt.
 */
export async function openPaymentAttempt(cart: CartDoc): Promise<PaymentAttemptDoc> {
  if (!isRazorpayConfigured()) throw badRequest("Online payment isn't available right now. Please choose Cash on Delivery.", "payment_unavailable")
  if (cart.completedAt) throw conflict("This bag has already been checked out", "cart_completed")
  const { totals } = await priceCart(cart)
  const now = new Date()
  const open = await db
    .paymentAttempts()
    .findOne({ cartId: cart._id, status: "created", amount: totals.total, currency: cart.currency, expiresAt: { $gt: now } }, { sort: { createdAt: -1 } })
  if (open) return open

  const attemptId = newId("pat")
  const rzp = await createRazorpayOrder({ amount: totals.total, currency: cart.currency, receipt: attemptId, notes: { cartId: cart._id, attemptId } })
  if (rzp.amount !== totals.total) throw new Error(`Razorpay order ${rzp.id} has amount ${rzp.amount}, expected ${totals.total}`)
  const attempt: PaymentAttemptDoc = {
    _id: attemptId,
    cartId: cart._id,
    provider: "razorpay",
    providerOrderId: rzp.id,
    amount: rzp.amount,
    currency: cart.currency,
    status: "created",
    expiresAt: new Date(now.getTime() + ttlMs()),
    createdAt: now,
    updatedAt: now,
  }
  await db.paymentAttempts().insertOne(attempt)
  // Any older open attempt for this cart (a different total) can no longer be paid into an order.
  await db
    .paymentAttempts()
    .updateMany({ cartId: cart._id, status: "created", _id: { $ne: attemptId } }, { $set: { status: "expired", failureReason: "superseded", updatedAt: now } })
  log.info("payment.attempt_created", { attemptId, cartId: cart._id, providerOrderId: rzp.id, amount: rzp.amount })
  return attempt
}

/** Refunds a payment we can't turn into an order, so the shopper is never charged for nothing. */
async function refundUnplaceable(attempt: PaymentAttemptDoc, payment: RazorpayPayment, reason: string) {
  const receipt = `auto_${payment.id}`.slice(0, 40)
  try {
    const refund = await createRazorpayRefund({ paymentId: payment.id, amount: payment.amount, receipt, notes: { attemptId: attempt._id, reason } })
    log.warn("payment.auto_refunded", { attemptId: attempt._id, paymentId: payment.id, refundId: refund.id, reason })
  } catch (e) {
    // Already refunded, or Razorpay unreachable: flag for a person to check.
    log.error("payment.auto_refund_failed", { attemptId: attempt._id, paymentId: payment.id, reason, error: (e as Error).message })
  }
  await db
    .paymentAttempts()
    .updateOne({ _id: attempt._id, status: { $ne: "paid" } }, { $set: { status: "refunded", paymentId: payment.id, failureReason: reason, updatedAt: new Date() } })
}

export class PaymentNotSettled extends ApiError {}

/**
 * Settles one Razorpay payment against its attempt: verifies it with
 * Razorpay, captures it if only authorized, and places the order. Safe to
 * call any number of times for the same payment.
 */
export async function settleRazorpayPayment(attempt: PaymentAttemptDoc, paymentId: string): Promise<OrderDoc> {
  // The same payment settled before (callback and webhook both arrived): same order.
  if (attempt.status === "paid" && attempt.orderId && attempt.paymentId === paymentId) {
    const order = await db.orders().findOne({ _id: attempt.orderId })
    if (order) return order
  }
  let payment = await fetchRazorpayPayment(paymentId)
  if (payment.order_id !== attempt.providerOrderId) {
    throw new PaymentNotSettled(400, "payment_mismatch", "This payment doesn't belong to this checkout.")
  }
  if (payment.amount !== attempt.amount || payment.currency.toLowerCase() !== attempt.currency.toLowerCase()) {
    throw new PaymentNotSettled(400, "payment_mismatch", "The amount paid doesn't match this checkout.")
  }
  if (payment.status === "failed") {
    await db
      .paymentAttempts()
      .updateOne(
        { _id: attempt._id, status: "created" },
        { $set: { status: "failed", paymentId, method: payment.method, failureReason: payment.error_description ?? "Payment failed", updatedAt: new Date() } }
      )
    throw new PaymentNotSettled(402, "payment_failed", payment.error_description ?? "The payment didn't go through. No money was taken.")
  }
  if (payment.status === "authorized") payment = await captureRazorpayPayment(payment.id, payment.amount, payment.currency)
  if (payment.status !== "captured") {
    throw new PaymentNotSettled(409, "payment_pending", "Your payment is still being confirmed by the bank. We'll update your order as soon as it is.")
  }

  try {
    const { order, created } = await placeOrder(attempt.cartId, {
      method: "razorpay",
      attemptId: attempt._id,
      razorpayOrderId: attempt.providerOrderId,
      razorpayPaymentId: payment.id,
      amount: payment.amount,
      paidAt: new Date(payment.created_at * 1000),
    })
    // The cart was already placed by a different payment: this one is a second charge.
    if (!created && order.paymentDetails?.razorpayPaymentId !== payment.id) {
      await refundUnplaceable(attempt, payment, "duplicate_payment")
      log.warn("payment.duplicate_refunded", { orderId: order._id, paymentId: payment.id })
    } else if (created) {
      log.info("payment.settled", { orderId: order._id, displayId: order.displayId, attemptId: attempt._id, paymentId: payment.id, amount: payment.amount })
    }
    return order
  } catch (e) {
    // Money was taken but no order can be placed (bag changed, sold out, code used up): give it back.
    if (e instanceof ApiError && e.status < 500) {
      await refundUnplaceable(attempt, payment, e.code)
      throw new PaymentNotSettled(e.status, e.code, `${e.message} Your payment has been refunded in full.`)
    }
    throw e
  }
}

/** Settles whatever Razorpay recorded against an attempt (webhook without an id, or reconciliation). */
async function settleFromRazorpay(attempt: PaymentAttemptDoc) {
  const payments = await fetchRazorpayOrderPayments(attempt.providerOrderId)
  const paid = payments.find((p) => p.status === "captured" || p.status === "authorized")
  if (paid) return settleRazorpayPayment(attempt, paid.id)
  return null
}

/**
 * Background sweep for payments whose outcome we never heard (browser closed
 * after paying, webhook lost): settles them from Razorpay's record, and
 * expires attempts nobody paid within the TTL.
 */
export async function reconcilePaymentAttempts(limit = 25): Promise<number> {
  if (!isRazorpayConfigured()) return 0
  const now = Date.now()
  const stale = await db
    .paymentAttempts()
    .find({ status: "created", createdAt: { $lt: new Date(now - 2 * 60_000) } }, { sort: { createdAt: 1 }, limit })
    .toArray()
  let settled = 0
  for (const attempt of stale) {
    try {
      const order = await settleFromRazorpay(attempt)
      if (order) settled++
      else if (attempt.expiresAt.getTime() < now) {
        await db.paymentAttempts().updateOne({ _id: attempt._id, status: "created" }, { $set: { status: "expired", updatedAt: new Date() } })
      }
    } catch (e) {
      log.warn("payment.reconcile_failed", { attemptId: attempt._id, error: (e as Error).message })
    }
  }
  return settled
}

type RazorpayEvent = {
  event: string
  payload: {
    payment?: { entity: RazorpayPayment }
    order?: { entity: { id: string } }
    refund?: { entity: { id: string; payment_id: string; amount: number; status: string } }
  }
}

/** Applies one verified webhook event. Throws to have Razorpay retry later. */
export async function applyRazorpayEvent(event: RazorpayEvent): Promise<"processed" | "ignored"> {
  const payment = event.payload.payment?.entity
  switch (event.event) {
    case "payment.captured":
    case "payment.authorized":
    case "order.paid": {
      const providerOrderId = payment?.order_id ?? event.payload.order?.entity.id
      if (!providerOrderId) return "ignored"
      const attempt = await db.paymentAttempts().findOne({ providerOrderId })
      if (!attempt) return "ignored"
      try {
        if (payment) await settleRazorpayPayment(attempt, payment.id)
        else await settleFromRazorpay(attempt)
      } catch (e) {
        // A settled-but-unplaceable payment was refunded; that event is done.
        if (e instanceof PaymentNotSettled && e.code !== "payment_pending") return "processed"
        throw e
      }
      return "processed"
    }
    case "payment.failed": {
      if (!payment?.order_id) return "ignored"
      await db
        .paymentAttempts()
        .updateOne(
          { providerOrderId: payment.order_id, status: "created" },
          { $set: { status: "failed", paymentId: payment.id, method: payment.method, failureReason: payment.error_description ?? "Payment failed", updatedAt: new Date() } }
        )
      return "processed"
    }
    case "refund.processed":
    case "refund.failed":
    case "refund.created": {
      const refund = event.payload.refund?.entity
      if (!refund) return "ignored"
      const status = event.event === "refund.processed" ? "processed" : event.event === "refund.failed" ? "failed" : "pending"
      const doc = await db
        .refunds()
        .findOneAndUpdate({ providerRefundId: refund.id, status: { $ne: "processed" } }, { $set: { status, updatedAt: new Date() } }, { returnDocument: "after" })
      if (doc) await syncOrderRefundStatus(doc.orderId)
      return doc ? "processed" : "ignored"
    }
    default:
      return "ignored"
  }
}

/**
 * The order's payment status from its refunds: money counts as returned once
 * Razorpay accepted the refund (pending or processed). Failed ones don't count.
 */
export async function syncOrderRefundStatus(orderId: string) {
  const order = await db.orders().findOne({ _id: orderId })
  if (!order || order.paymentStatus === "awaiting") return
  const refunds = await db.refunds().find({ orderId, status: { $in: ["pending", "processed"] } }).toArray()
  const refunded = refunds.reduce((s, r) => s + r.amount, 0)
  const paymentStatus: OrderDoc["paymentStatus"] = refunded <= 0 ? "paid" : refunded >= order.totals.total ? "refunded" : "partially_refunded"
  if (paymentStatus !== order.paymentStatus) {
    await db.orders().updateOne({ _id: orderId }, { $set: { paymentStatus, updatedAt: new Date() } })
  }
}
