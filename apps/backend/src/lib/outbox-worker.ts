import { db } from "../db/schema.js"
import { notifyCustomer, notifyRider, notifyWarehouse } from "./notify/index.js"

/**
 * Background worker to process transactional outbox events and reservation expiries.
 */
export async function processOutboxEvents(batchSize = 50): Promise<number> {
  const pending = await db
    .outboxEvents()
    .find({ status: "pending" }, { limit: batchSize, sort: { createdAt: 1 } })
    .toArray()

  let processedCount = 0

  for (const event of pending) {
    try {
      await consume(event.topic, event.payload)
      await db.outboxEvents().updateOne({ _id: event._id, status: "pending" }, { $set: { status: "published", publishedAt: new Date() } })
      processedCount++
    } catch (err: any) {
      // After five failed attempts the event stays as "failed" (dead letter) for an admin to look at.
      await db.outboxEvents().updateOne(
        { _id: event._id },
        { $inc: { retryCount: 1 }, $set: { lastError: err?.message ?? "Processing failed", status: event.retryCount + 1 >= 5 ? "failed" : "pending" } }
      )
    }
  }

  return processedCount
}

/** What each committed event sets off: the notifications that follow it. */
async function consume(topic: string, payload: Record<string, any>) {
  if (topic === "order.placed") {
    const order = await db.orders().findOne({ _id: payload.orderId })
    if (order) await notifyCustomer(order, "order_confirmed", `order:${order._id}:confirmed`)
  } else if (topic === "fulfilment.assigned") {
    const f = await db.fulfilments().findOne({ _id: payload.fulfilmentId })
    if (f && f.active) await notifyWarehouse(f.warehouseId, "fulfilment_assigned", `ful:${f._id}:assigned`, { orderId: f.orderId, displayId: f.displayId, fulfilmentCode: f.code, warehouseCode: f.warehouseCode })
  } else if (topic === "delivery.offered") {
    const t = await db.deliveryTasks().findOne({ _id: payload.taskId })
    // Only while the offer is still open to that rider.
    if (t && t.status === "offered" && t.offer && t.offer.riderId === payload.riderId) {
      await notifyRider(payload.riderId, "delivery_offered", `dlv:${t._id}:offer:${t.offer.offeredAt.getTime()}`, { area: `${t.stop.city} ${t.stop.postalCode}`, cashDue: t.cod?.due ?? null })
    }
  }
  // Other topics (shipment.created, refund.processed) have no consumer yet; they are recorded and marked published.
}

/**
 * Sweeps and marks expired inventory reservations as expired
 */
export async function expireStaleReservations(): Promise<number> {
  const now = new Date()
  const result = await db.inventoryReservations().updateMany(
    { status: "active", expiresAt: { $lte: now } },
    { $set: { status: "expired", updatedAt: now } }
  )
  return result.modifiedCount
}
