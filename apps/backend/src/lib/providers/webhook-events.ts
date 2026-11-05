import { db, type PaymentWebhookEventDoc } from "../../db/schema.js"
import { newId } from "../ids.js"

/** How long a "processing" claim holds before a redelivery may take it over. */
const STALE_MS = 5 * 60_000

/**
 * Claims a provider webhook event for processing, at most once at a time:
 * - "new": first delivery, or a redelivery of one that failed or stalled; process it.
 * - "done": already processed (or ignored); acknowledge and skip.
 * - "busy": another delivery is processing it right now; ask the provider to retry.
 * The unique (provider, eventId) index makes the first claim atomic.
 */
export async function claimWebhookEvent(
  provider: PaymentWebhookEventDoc["provider"],
  eventId: string,
  event: string,
  payload: unknown,
  signature: string,
): Promise<"new" | "done" | "busy"> {
  const now = new Date()
  try {
    await db.paymentWebhookEvents().insertOne({
      _id: newId("pwe"),
      provider,
      eventId,
      event,
      payload,
      signature,
      status: "processing",
      attempts: 1,
      createdAt: now,
    })
    return "new"
  } catch (e) {
    if ((e as { code?: number }).code !== 11000) throw e
  }
  const existing = await db.paymentWebhookEvents().findOne({ provider, eventId })
  if (!existing || existing.status === "processed" || existing.status === "ignored") return "done"
  const retake = await db.paymentWebhookEvents().updateOne(
    {
      provider,
      eventId,
      $or: [{ status: "failed" }, { status: "processing", createdAt: { $lt: new Date(now.getTime() - STALE_MS) } }],
    },
    { $set: { status: "processing", createdAt: now }, $inc: { attempts: 1 } },
  )
  return retake.modifiedCount ? "new" : "busy"
}
