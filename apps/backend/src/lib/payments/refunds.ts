import { db, type OrderDoc, type RefundDoc } from "../../db/schema.js"
import { badRequest, conflict } from "../errors.js"
import { newId } from "../ids.js"
import { log } from "../log.js"
import { ProviderError } from "../providers/http.js"
import { createRazorpayRefund, fetchRazorpayPaymentRefunds, fetchRazorpayRefund, isRazorpayConfigured } from "./razorpay.js"
import { syncOrderRefundStatus } from "./settle.js"

/** Money already returned or on its way, which a new refund must fit beside. */
const committed = async (orderId: string, exceptId?: string) =>
  (await db.refunds().find({ orderId, status: { $in: ["requested", "pending", "processed"] }, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).toArray()).reduce(
    (s, r) => s + r.amount,
    0
  )

/**
 * Refunds part or all of an order's payment. Online payments are refunded
 * through Razorpay and count as refunded once Razorpay accepts them; a cash on
 * delivery order (cash collected) records a manual refund. The ceiling is
 * re-checked after the refund is recorded, so two concurrent refunds can't
 * together exceed what was paid.
 */
export async function refundOrder(order: OrderDoc, params: { amount?: number; reason: string; adminId: string }): Promise<RefundDoc> {
  if (order.paymentStatus === "awaiting") throw badRequest("Nothing has been paid on this order yet.", "not_paid")
  const online = order.paymentMethod === "razorpay"
  const paymentId = order.paymentDetails?.razorpayPaymentId
  if (online && !paymentId) throw badRequest("This order has no Razorpay payment to refund.", "no_payment")
  if (online && !isRazorpayConfigured()) throw badRequest("Razorpay isn't configured, so online refunds can't be sent.", "payment_unavailable")

  const already = await committed(order._id)
  const amount = params.amount ?? order.totals.total - already
  if (amount <= 0) throw conflict(`Order #${order.displayId} is already fully refunded.`, "refund_ceiling_exceeded")
  if (already + amount > order.totals.total) {
    throw conflict(`At most ${order.totals.total - already} can still be refunded on this order.`, "refund_ceiling_exceeded")
  }

  const now = new Date()
  const refund: RefundDoc = {
    _id: newId("rfd"),
    orderId: order._id,
    displayId: order.displayId,
    provider: online ? "razorpay" : "manual",
    paymentId: paymentId ?? "",
    amount,
    currency: order.currency,
    reason: params.reason,
    status: online ? "requested" : "processed",
    createdBy: params.adminId,
    createdAt: now,
    updatedAt: now,
  }
  await db.refunds().insertOne(refund)
  if ((await committed(order._id, refund._id)) + amount > order.totals.total) {
    await db.refunds().deleteOne({ _id: refund._id })
    throw conflict("Another refund was just made on this order. Reload and try again.", "refund_ceiling_exceeded")
  }

  if (online) {
    try {
      const rzp = await createRazorpayRefund({ paymentId: paymentId!, amount, receipt: refund._id, notes: { refundId: refund._id, orderId: order._id } })
      refund.providerRefundId = rzp.id
      refund.status = rzp.status === "processed" ? "processed" : rzp.status === "failed" ? "failed" : "pending"
    } catch (e) {
      if (e instanceof ProviderError && e.uncertain) {
        // Razorpay may or may not have it: leave "requested" for reconcileRefunds to resolve.
        refund.failureReason = e.message
        log.warn("refund.uncertain", { refundId: refund._id, orderId: order._id, error: e.message })
      } else {
        refund.status = "failed"
        refund.failureReason = (e as Error).message
        log.error("refund.rejected", { refundId: refund._id, orderId: order._id, error: (e as Error).message })
      }
    }
    await db.refunds().updateOne(
      { _id: refund._id },
      { $set: { status: refund.status, updatedAt: new Date(), ...(refund.providerRefundId ? { providerRefundId: refund.providerRefundId } : {}), ...(refund.failureReason ? { failureReason: refund.failureReason } : {}) } }
    )
  }
  await syncOrderRefundStatus(order._id)
  if (refund.status === "failed") throw badRequest(`Razorpay refused the refund: ${refund.failureReason}`, "refund_failed")
  log.info("refund.created", { refundId: refund._id, orderId: order._id, amount, status: refund.status })
  return refund
}

/**
 * Resolves refunds whose outcome is unknown or still pending: looks them up on
 * Razorpay (by our refund id in the notes) and records what Razorpay says.
 */
export async function reconcileRefunds(limit = 25): Promise<number> {
  if (!isRazorpayConfigured()) return 0
  const open = await db
    .refunds()
    .find({ provider: "razorpay", status: { $in: ["requested", "pending"] }, updatedAt: { $lt: new Date(Date.now() - 60_000) } }, { limit })
    .toArray()
  let changed = 0
  for (const r of open) {
    try {
      const rzp = r.providerRefundId
        ? await fetchRazorpayRefund(r.paymentId, r.providerRefundId)
        : (await fetchRazorpayPaymentRefunds(r.paymentId)).find((x) => x.notes?.refundId === r._id)
      // Requested but never reached Razorpay: it can be retried by hand.
      const status: RefundDoc["status"] = !rzp ? "failed" : rzp.status === "processed" ? "processed" : rzp.status === "failed" ? "failed" : "pending"
      if (status !== r.status || (rzp && !r.providerRefundId)) {
        await db.refunds().updateOne(
          { _id: r._id },
          { $set: { status, updatedAt: new Date(), ...(rzp ? { providerRefundId: rzp.id } : { failureReason: "Not found on Razorpay" }) } }
        )
        await syncOrderRefundStatus(r.orderId)
        changed++
      }
    } catch (e) {
      log.warn("refund.reconcile_failed", { refundId: r._id, error: (e as Error).message })
    }
  }
  return changed
}
