import { Router, type Request } from "express"
import { z } from "zod"
import { db, NOTIFICATION_EVENTS } from "../../db/schema.js"
import { forbidden, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { channelStatus, retryDelivery } from "../../lib/notify/index.js"
import { CHANNELS } from "../../lib/notify/templates.js"

/*
 * Outbound notifications for admins: which channels can send, every
 * message with its outcome, dead letters to retry, provider templates per
 * event, and background events that failed.
 */

export const adminNotificationRoutes = Router()

const ownerOnly = (req: Request) => {
  if (req.admin!.role !== "owner") throw forbidden("Only an owner can do this")
}

adminNotificationRoutes.get("/notifications/status", async (_req, res) => {
  const [byStatus, failedOutbox] = await Promise.all([
    db.notificationDeliveries().aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
    db.outboxEvents().countDocuments({ status: "failed" }),
  ])
  res.json({ channels: channelStatus(), events: CHANNELS, deliveries: Object.fromEntries(byStatus.map((b) => [b._id, b.n])), failedOutbox })
})

adminNotificationRoutes.get("/notifications/deliveries", async (req, res) => {
  const q = z
    .object({
      status: z.enum(["queued", "sending", "sent", "skipped", "dead"]).optional(),
      channel: z.enum(["email", "sms", "whatsapp", "push"]).optional(),
      event: z.enum(NOTIFICATION_EVENTS).optional(),
      orderId: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(500).default(100),
    })
    .parse(req.query)
  const deliveries = await db
    .notificationDeliveries()
    .find({ ...(q.status ? { status: q.status } : {}), ...(q.channel ? { channel: q.channel } : {}), ...(q.event ? { event: q.event } : {}), ...(q.orderId ? { orderId: q.orderId } : {}) }, { sort: { createdAt: -1 }, limit: q.limit, projection: { "content.html": 0 } })
    .toArray()
  res.json({ deliveries })
})

adminNotificationRoutes.post("/notifications/deliveries/:id/retry", async (req, res) => {
  ownerOnly(req)
  if (!(await retryDelivery(req.params.id))) throw notFound("Failed message")
  await db.auditLogs().insertOne({ _id: newId("audit"), adminId: req.admin!.id, adminEmail: req.admin!.email, action: "notification.retry", targetCollection: "notification_deliveries", targetId: req.params.id, createdAt: new Date() })
  res.json({ queued: true })
})

adminNotificationRoutes.get("/notifications/templates", async (_req, res) => {
  const s = await db.settings().findOne({ _id: "store" }, { projection: { notificationTemplates: 1 } })
  res.json({ templates: s?.notificationTemplates ?? {}, events: NOTIFICATION_EVENTS })
})

/** Provider templates for one event: the DLT-registered MSG91 flow and approved WhatsApp templates. */
adminNotificationRoutes.put("/notifications/templates/:event", async (req, res) => {
  ownerOnly(req)
  const event = z.enum(NOTIFICATION_EVENTS).parse(req.params.event)
  const body = z
    .object({
      msg91FlowId: z.string().trim().regex(/^[A-Za-z0-9]{8,40}$/).optional(),
      whatsapp: z.object({ name: z.string().trim().regex(/^[a-z0-9_]{1,512}$/, "Template names are lowercase letters, digits and underscores"), language: z.string().trim().regex(/^[a-z]{2,3}(_[A-Z]{2})?$/) }).optional(),
      gupshupTemplateId: z.string().trim().min(8).max(64).optional(),
    })
    .parse(req.body)
  await db.settings().updateOne({ _id: "store" }, { $set: { [`notificationTemplates.${event}`]: body, updatedAt: new Date() } }, { upsert: true })
  await db.auditLogs().insertOne({ _id: newId("audit"), adminId: req.admin!.id, adminEmail: req.admin!.email, action: "notification.templates", targetCollection: "settings", targetId: event, diff: body, createdAt: new Date() })
  res.json({ event, templates: body })
})

adminNotificationRoutes.get("/outbox", async (req, res) => {
  const { status } = z.object({ status: z.enum(["pending", "published", "failed"]).default("failed") }).parse(req.query)
  res.json({ events: await db.outboxEvents().find({ status }, { sort: { createdAt: -1 }, limit: 200 }).toArray() })
})

adminNotificationRoutes.post("/outbox/:id/retry", async (req, res) => {
  ownerOnly(req)
  const r = await db.outboxEvents().updateOne({ _id: req.params.id, status: "failed" }, { $set: { status: "pending", retryCount: 0 }, $unset: { lastError: "" } })
  if (!r.modifiedCount) throw notFound("Failed event")
  res.json({ queued: true })
})
