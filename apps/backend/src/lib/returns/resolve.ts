import { withTransaction } from "../../db/client.js"
import { db, type ActorRef, type LineItem, type OrderDoc, type ReturnDoc } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { allocate } from "../fulfilment/allocate.js"
import { newId } from "../ids.js"
import { refundOrder } from "../payments/refunds.js"
import { cancelShipment, createReturnShipment } from "../shipping/service.js"
import { recordTransition } from "../state/machines.js"
import { moveReturn } from "./returns.js"

/*
 * What the store decides about a return: approve or reject the request,
 * book the reverse pickup, and once the goods are inspected, refund (only
 * up to what the customer paid for those items), send the exchange, or
 * reject it.
 */

type Admin = Extract<ActorRef, { type: "admin" }> | ActorRef

export const approveReturn = (ret: ReturnDoc, actor: Admin, note?: string) => moveReturn(ret, "approved", actor, note)

export async function rejectReturn(ret: ReturnDoc, actor: Admin, reason: string) {
  if (!["requested", "approved", "inspected"].includes(ret.status)) throw conflict("This return can't be rejected now.", "invalid_transition")
  return moveReturn(ret, "rejected", actor, reason, { rejectionReason: reason, ...(ret.status === "inspected" ? { resolution: { action: "reject", at: new Date(), by: actor.id, note: reason } } : {}) })
}

/** The customer (or an admin) calls it off before the items have left the door. A booked pickup is cancelled with the courier first. */
export async function cancelReturn(ret: ReturnDoc, actor: ActorRef, reason: string) {
  if (!["requested", "approved", "pickup_scheduled"].includes(ret.status)) throw conflict("The items are already on their way back; this return can't be cancelled now.", "invalid_transition")
  if (ret.shipmentId) {
    const s = await db.shipments().findOne({ _id: ret.shipmentId })
    if (s && s.active) await cancelShipment(s._id)
  }
  return moveReturn(ret, "cancelled", actor, reason)
}

/** Books the reverse pickup with the courier for an approved pickup return. */
export async function bookReturnPickup(ret: ReturnDoc, actor: Admin) {
  if (ret.method !== "pickup") throw conflict("The customer is sending this one back themselves.", "self_ship_return")
  if (ret.status !== "approved") throw conflict("Approve the return before booking its pickup.", "return_not_approved")
  const order = await db.orders().findOne({ _id: ret.orderId })
  if (!order) throw notFound("Order")
  const shipment = await createReturnShipment(order, ret)
  const next = await moveReturn(ret, "pickup_scheduled", actor, `Reverse pickup booked with ${shipment.carrier || "the courier"}`, { shipmentId: shipment._id })
  return { ret: next, shipment }
}

/**
 * Refunds an inspected (or received) return: at most what the customer paid
 * for those items. A refund the gateway settles later leaves the return
 * refund-pending until it does.
 */
export async function refundReturn(ret: ReturnDoc, actor: Admin, input: { amount?: number; note?: string }) {
  if (!["inspected", "received"].includes(ret.status)) throw conflict("Refund a return once its items are received.", "not_received")
  const amount = input.amount ?? ret.refundableAmount
  if (amount <= 0) throw badRequest("Nothing to refund on this return.")
  if (amount > ret.refundableAmount) throw conflict(`At most ${ret.refundableAmount} can be refunded for these items.`, "refund_ceiling_exceeded")
  const order = await db.orders().findOne({ _id: ret.orderId })
  if (!order) throw notFound("Order")
  const refund = await refundOrder(order, { amount, reason: `Return ${ret.code}${input.note ? `: ${input.note}` : ""}`, adminId: actor.id })
  const resolution = { action: "refund" as const, at: new Date(), by: actor.id, refundId: refund._id, amount, ...(input.note ? { note: input.note } : {}) }
  const done = refund.status === "processed"
  const next = await moveReturn(ret, done ? "refunded" : "refund_pending", actor, `Refund ${refund._id} (${refund.status})`, { resolution })
  if (done) await markReturnedIfComplete(ret.orderId)
  return { ret: next, refund }
}

/** Every unit of the order has come back and been settled: the order reads as returned. */
async function markReturnedIfComplete(orderId: string) {
  const order = await db.orders().findOne({ _id: orderId })
  if (!order) return
  const settled = await db.returns().find({ orderId, status: { $in: ["refunded", "exchanged"] } }).toArray()
  const back = new Map<string, number>()
  for (const r of settled) for (const l of r.items) back.set(l.itemId, (back.get(l.itemId) ?? 0) + l.quantity)
  if (order.items.every((i) => (back.get(i._id) ?? 0) >= i.quantity) && order.fulfillmentStatus !== "returned") {
    await db.orders().updateOne({ _id: orderId }, { $set: { fulfillmentStatus: "returned", updatedAt: new Date() } })
  }
}

/** Called when a refund's status changes (created, or settled by the gateway later): a pending return follows it. */
export async function settleReturnRefund(refundId: string) {
  const refund = await db.refunds().findOne({ _id: refundId })
  const ret = await db.returns().findOne({ "resolution.refundId": refundId, status: "refund_pending" })
  if (!refund || !ret) return
  const gateway = { type: "system" as const, id: "razorpay" }
  if (refund.status === "processed") {
    await moveReturn(ret, "refunded", gateway, `Refund ${refund._id} processed`)
    await markReturnedIfComplete(ret.orderId)
  } else if (refund.status === "failed") {
    // Back to be resolved again; the failed refund stays on record.
    await moveReturn(ret, "inspected", gateway, `Refund ${refund._id} failed: ${refund.failureReason ?? "refused"}`, { resolution: null })
  }
}

/**
 * Sends the replacement for an inspected exchange as a new order: the
 * chosen variants, nothing charged (the original order paid for them),
 * stock reserved and allocated to a warehouse like any order.
 */
export async function exchangeReturn(ret: ReturnDoc, actor: Admin, note?: string) {
  if (ret.type !== "exchange") throw conflict("The customer asked for a refund, not an exchange.", "not_exchange")
  if (ret.status !== "inspected") throw conflict("Send the exchange once the returned items are inspected.", "not_inspected")
  const created = await withTransaction(async (session) => {
    const original = await db.orders().findOne({ _id: ret.orderId }, { session })
    if (!original) throw notFound("Order")
    const items: LineItem[] = []
    for (const l of ret.items) {
      const product = await db.products().findOne({ _id: l.productId }, { session })
      const variant = product?.variants.find((v) => v._id === l.exchangeVariantId)
      const was = original.items.find((i) => i._id === l.itemId)!
      if (!product || !variant) throw conflict(`${l.productTitle} (${l.exchangeVariantTitle}) is no longer sold. Refund this return instead.`, "exchange_unavailable")
      const taken = await db.products().updateOne(
        { _id: product._id, variants: { $elemMatch: { _id: variant._id, $or: [{ manageInventory: false }, { allowBackorder: true }, { stock: { $gte: l.quantity } }] } } },
        { $inc: { "variants.$[v].stock": -l.quantity } },
        { arrayFilters: [{ "v._id": variant._id, "v.manageInventory": true, "v.allowBackorder": false }], session }
      )
      if (!taken.matchedCount) throw conflict(`${l.productTitle} (${l.exchangeVariantTitle}) is out of stock now. Refund this return instead, or wait for stock.`, "out_of_stock")
      items.push({ _id: newId("item"), productId: product._id, variantId: variant._id, productTitle: product.title, productHandle: product.handle, variantTitle: variant.title, ...(was.thumbnail ? { thumbnail: was.thumbnail } : {}), quantity: l.quantity, unitPrice: was.unitPrice })
    }
    const counter = await db.counters().findOneAndUpdate({ _id: "order" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after", session })
    const now = new Date()
    const value = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    const order: OrderDoc = {
      _id: newId("order"),
      displayId: 1000 + (counter?.seq ?? 1),
      cartId: `exchange_${ret._id}`,
      regionId: original.regionId,
      currency: original.currency,
      customerId: original.customerId ?? null,
      email: original.email,
      items,
      shippingAddress: original.shippingAddress,
      billingAddress: original.billingAddress,
      shippingOption: { ...original.shippingOption, amount: 0 },
      ...(original.deliveryInstructions ? { deliveryInstructions: original.deliveryInstructions } : {}),
      promoCodes: [],
      // Covered by the original order: the whole value is shown as settled, nothing is due.
      totals: { itemSubtotal: value, discountTotal: value, shippingTotal: 0, taxTotal: 0, total: 0 },
      paymentMethod: original.paymentMethod,
      paymentStatus: "paid",
      paymentDetails: { provider: original.paymentMethod, paidAt: now, transactionId: `EXCHANGE-${ret.code}` },
      fulfillmentStatus: "unfulfilled",
      exchangeOf: { orderId: original._id, displayId: original.displayId, returnId: ret._id },
      status: "pending",
      createdAt: now,
      updatedAt: now,
    }
    await db.orders().insertOne(order, { session })
    await allocate(order, items.map((i) => ({ itemId: i._id, quantity: i.quantity })), { actor, method: "auto", reason: `Exchange for ${ret.code}`, variantAlreadyDecremented: true }, session)
    await recordTransition({ machine: "order", entityId: order._id, orderId: order._id, from: null, to: "pending", actor, reason: `Exchange for #${original.displayId} (${ret.code})` }, session)
    await moveReturn(ret, "exchanged", actor, `Replacement order #${order.displayId}`, { resolution: { action: "exchange", at: now, by: actor.id, exchangeOrderId: order._id, ...(note ? { note } : {}) } }, session)
    return order
  })
  await markReturnedIfComplete(ret.orderId)
  return { ret: (await db.returns().findOne({ _id: ret._id }))!, order: created }
}
