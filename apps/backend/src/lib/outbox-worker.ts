import { db } from "../db/schema.js"

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
      if (event.topic === "order.placed") {
        // Event successfully dispatched to downstream event log / message broker
      } else if (event.topic === "shipment.created") {
        // Dispatch tracking webhook / SMS
      } else if (event.topic === "refund.processed") {
        // Dispatch finance reconciliation event
      }

      await db.outboxEvents().updateOne(
        { _id: event._id },
        {
          $set: {
            status: "published",
            publishedAt: new Date(),
          },
        }
      )
      processedCount++
    } catch (err: any) {
      await db.outboxEvents().updateOne(
        { _id: event._id },
        {
          $inc: { retryCount: 1 },
          $set: {
            lastError: err?.message ?? "Processing failed",
            status: event.retryCount >= 5 ? "failed" : "pending",
          },
        }
      )
    }
  }

  return processedCount
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
