import { createReadStream } from "node:fs"
import { access } from "node:fs/promises"
import { join, normalize } from "node:path"
import { Router, type Request } from "express"
import { z } from "zod"
import { db, DELIVERY_STATUSES, type ActorRef, type DeliveryZoneDoc } from "../../db/schema.js"
import { env } from "../../env.js"
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js"
import { reconcileRemittance } from "../../lib/fleet/cod.js"
import { assignTask, offerTask, unassignTask } from "../../lib/fleet/dispatch.js"
import { FLEET_DEFAULTS, fleetSettings } from "../../lib/fleet/support.js"
import { startRto } from "../../lib/fleet/tasks.js"
import { newId } from "../../lib/ids.js"
import { publicRider } from "../rider/index.js"

/*
 * Admin side of our own delivery fleet: zones, rider onboarding and
 * verification, the delivery board with manual assignment, cash
 * reconciliation, proof-of-delivery photos and the fleet settings.
 */

export const adminFleetRoutes = Router()

const actorOf = (req: Request) => ({ type: "admin" as const, id: req.admin!.id, name: req.admin!.email }) satisfies ActorRef
const requireRole = (req: Request, ...roles: string[]) => {
  if (req.admin!.role !== "owner" && !roles.includes(req.admin!.role)) throw forbidden("Your role can't do this")
}
const audit = (req: Request, action: string, targetCollection: string, targetId: string, diff?: unknown) =>
  db.auditLogs().insertOne({ _id: newId("audit"), adminId: req.admin!.id, adminEmail: req.admin!.email, action, targetCollection, targetId, diff, ip: req.ip, createdAt: new Date() })

/* ---------- Settings ---------- */

adminFleetRoutes.get("/fleet/settings", async (_req, res) => {
  res.json({ settings: await fleetSettings(), defaults: FLEET_DEFAULTS })
})

adminFleetRoutes.patch("/fleet/settings", async (req, res) => {
  requireRole(req)
  const body = z
    .object({
      payoutPerDelivery: z.number().int().min(0).max(1_000_000),
      payoutPerFailedAttempt: z.number().int().min(0).max(1_000_000),
      offerTimeoutMinutes: z.number().int().min(1).max(240),
      maxAttempts: z.number().int().min(1).max(10),
      maxActiveTasks: z.number().int().min(1).max(200),
    })
    .partial()
    .parse(req.body)
  const set = Object.fromEntries(Object.entries(body).map(([k, v]) => [`fleet.${k}`, v]))
  await db.settings().updateOne({ _id: "store" }, { $set: { ...set, updatedAt: new Date() } }, { upsert: true })
  await audit(req, "fleet.settings", "settings", "store", body)
  res.json({ settings: await fleetSettings() })
})

/* ---------- Zones ---------- */

const zoneSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,20}$/),
  name: z.string().trim().min(2).max(100),
  warehouseId: z.string(),
  pincodes: z.array(z.string().trim().regex(/^\d{6}$/, "Six-digit PIN codes")).min(1).max(500),
  codAllowed: z.boolean().default(true),
  active: z.boolean().default(true),
})

adminFleetRoutes.get("/delivery-zones", async (_req, res) => {
  res.json({ zones: await db.deliveryZones().find({}, { sort: { code: 1 } }).toArray() })
})

adminFleetRoutes.post("/delivery-zones", async (req, res) => {
  requireRole(req, "store_admin", "order_manager")
  const body = zoneSchema.parse(req.body)
  if (!(await db.warehouses().countDocuments({ _id: body.warehouseId }))) throw badRequest("Unknown warehouse")
  const now = new Date()
  const zone: DeliveryZoneDoc = { _id: newId("zone"), ...body, pincodes: [...new Set(body.pincodes)], createdAt: now, updatedAt: now }
  await db.deliveryZones().insertOne(zone)
  await audit(req, "zone.create", "delivery_zones", zone._id, body)
  res.status(201).json({ zone })
})

adminFleetRoutes.patch("/delivery-zones/:id", async (req, res) => {
  requireRole(req, "store_admin", "order_manager")
  const body = zoneSchema.omit({ code: true, warehouseId: true }).partial().parse(req.body)
  const zone = await db.deliveryZones().findOneAndUpdate({ _id: req.params.id }, { $set: { ...body, ...(body.pincodes ? { pincodes: [...new Set(body.pincodes)] } : {}), updatedAt: new Date() } }, { returnDocument: "after" })
  if (!zone) throw notFound("Zone")
  await audit(req, "zone.update", "delivery_zones", zone._id, body)
  res.json({ zone })
})

/* ---------- Riders ---------- */

adminFleetRoutes.get("/riders", async (req, res) => {
  const q = z.object({ status: z.enum(["pending", "approved", "suspended", "rejected"]).optional(), online: z.enum(["true", "false"]).optional() }).parse(req.query)
  const riders = await db.riders().find({ ...(q.status ? { status: q.status } : {}), ...(q.online ? { online: q.online === "true" } : {}) }, { sort: { createdAt: -1 }, limit: 500 }).toArray()
  const load = await db.deliveryTasks().aggregate<{ _id: string; n: number }>([{ $match: { riderId: { $in: riders.map((r) => r._id) }, status: { $in: ["assigned", "picked_up", "out_for_delivery", "attempt_failed"] } } }, { $group: { _id: "$riderId", n: { $sum: 1 } } }]).toArray()
  res.json({ riders: riders.map((r) => ({ ...publicRider(r), activeTasks: load.find((l) => l._id === r._id)?.n ?? 0 })) })
})

adminFleetRoutes.get("/riders/:id", async (req, res) => {
  const rider = await db.riders().findOne({ _id: req.params.id })
  if (!rider) throw notFound("Rider")
  const since = new Date(Date.now() - 30 * 86_400_000)
  const [stats] = await db
    .deliveryTasks()
    .aggregate<{ delivered: number; failed: number; rto: number }>([
      { $match: { "earnings.riderId": rider._id, updatedAt: { $gte: since } } },
      { $group: { _id: null, delivered: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "delivered"] }, { $eq: ["$riderId", rider._id] }] }, 1, 0] } }, failed: { $sum: { $size: { $filter: { input: "$attempts", cond: { $eq: ["$$this.riderId", rider._id] } } } } }, rto: { $sum: { $cond: [{ $in: ["$status", ["rto", "returned"]] }, 1, 0] } } } },
    ])
    .toArray()
  const cash = await db.deliveryTasks().aggregate<{ n: number }>([{ $match: { riderId: rider._id, "cod.collected": { $exists: true }, "cod.remittanceId": null } }, { $group: { _id: null, n: { $sum: "$cod.collected" } } }]).toArray()
  // The full document numbers are for verification; only admins see them.
  const { passwordHash: _p, ...full } = rider
  res.json({ rider: full, last30Days: stats ?? { delivered: 0, failed: 0, rto: 0 }, cashInHand: cash[0]?.n ?? 0 })
})

adminFleetRoutes.post("/riders/:id/status", async (req, res) => {
  requireRole(req, "store_admin", "order_manager")
  const body = z.object({ status: z.enum(["approved", "suspended", "rejected"]), reason: z.string().trim().min(3).max(300) }).parse(req.body)
  const rider = await db.riders().findOne({ _id: req.params.id })
  if (!rider) throw notFound("Rider")
  if (body.status === "approved") {
    const missing = ["driving_licence", "aadhaar"].filter((t) => !rider.documents.some((d) => d.type === t && d.verified))
    if (rider.vehicle.type !== "bicycle" && missing.length) throw conflict(`Verify the rider's ${missing.join(" and ").replace(/_/g, " ")} first.`, "documents_unverified")
    if (!rider.warehouseId || !rider.zoneIds.length) throw conflict("Give the rider a hub and at least one zone first.", "no_zone")
  }
  const now = new Date()
  const r = await db.riders().findOneAndUpdate(
    { _id: rider._id },
    { $set: { status: body.status, statusReason: body.reason, updatedAt: now, ...(body.status === "approved" ? { approvedAt: now, approvedBy: req.admin!.id } : { online: false, lastLocation: null }) } },
    { returnDocument: "after" }
  )
  await audit(req, `rider.${body.status}`, "riders", rider._id, { reason: body.reason })
  res.json({ rider: publicRider(r!) })
})

adminFleetRoutes.post("/riders/:id/documents/:type/verify", async (req, res) => {
  requireRole(req, "store_admin", "order_manager")
  const r = await db.riders().findOneAndUpdate(
    { _id: req.params.id, "documents.type": req.params.type },
    { $set: { "documents.$.verified": true, "documents.$.verifiedAt": new Date(), "documents.$.verifiedBy": req.admin!.id, updatedAt: new Date() } },
    { returnDocument: "after" }
  )
  if (!r) throw notFound("Document")
  await audit(req, "rider.document_verify", "riders", r._id, { type: req.params.type })
  res.json({ rider: publicRider(r) })
})

adminFleetRoutes.patch("/riders/:id/assignment", async (req, res) => {
  requireRole(req, "store_admin", "order_manager")
  const body = z.object({ warehouseId: z.string(), zoneIds: z.array(z.string()).max(20) }).parse(req.body)
  const zones = await db.deliveryZones().find({ _id: { $in: body.zoneIds } }).toArray()
  if (zones.length !== new Set(body.zoneIds).size || zones.some((z) => z.warehouseId !== body.warehouseId)) throw badRequest("Pick zones served by the rider's hub")
  const r = await db.riders().findOneAndUpdate({ _id: req.params.id }, { $set: { warehouseId: body.warehouseId, zoneIds: [...new Set(body.zoneIds)], updatedAt: new Date() } }, { returnDocument: "after" })
  if (!r) throw notFound("Rider")
  await audit(req, "rider.assignment", "riders", r._id, body)
  res.json({ rider: publicRider(r) })
})

/* ---------- Delivery board ---------- */

adminFleetRoutes.get("/delivery-tasks", async (req, res) => {
  const q = z.object({ status: z.enum(DELIVERY_STATUSES).optional(), riderId: z.string().optional(), zoneId: z.string().optional(), limit: z.coerce.number().int().min(1).max(500).default(100) }).parse(req.query)
  const filter = { ...(q.status ? { status: q.status } : {}), ...(q.riderId ? { riderId: q.riderId } : {}), ...(q.zoneId ? { zoneId: q.zoneId } : {}) }
  const [tasks, byStatus] = await Promise.all([
    db.deliveryTasks().find(filter, { sort: { createdAt: -1 }, limit: q.limit, projection: { otp: 0 } }).toArray(),
    db.deliveryTasks().aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
  ])
  res.json({ tasks, byStatus: Object.fromEntries(byStatus.map((b) => [b._id, b.n])) })
})

adminFleetRoutes.get("/delivery-tasks/:id", async (req, res) => {
  const task = await db.deliveryTasks().findOne({ _id: req.params.id }, { projection: { otp: 0 } })
  if (!task) throw notFound("Delivery")
  const history = await db.statusEvents().find({ entityId: task._id }, { sort: { at: 1 } }).toArray()
  res.json({ task, history })
})

adminFleetRoutes.post("/delivery-tasks/:id/assign", async (req, res) => {
  requireRole(req, "store_admin", "order_manager")
  const body = z.object({ riderId: z.string(), reason: z.string().trim().min(3).max(300) }).parse(req.body)
  const task = await assignTask(req.params.id, body.riderId, actorOf(req), body.reason)
  await audit(req, "delivery.assign", "delivery_tasks", task._id, body)
  res.json({ task: { ...task, otp: undefined } })
})

adminFleetRoutes.post("/delivery-tasks/:id/unassign", async (req, res) => {
  requireRole(req, "store_admin", "order_manager")
  const { reason } = z.object({ reason: z.string().trim().min(3).max(300) }).parse(req.body)
  const task = await unassignTask(req.params.id, actorOf(req), reason)
  await audit(req, "delivery.unassign", "delivery_tasks", task._id, { reason })
  res.json({ task: { ...task, otp: undefined } })
})

/** Runs automatic dispatch for one waiting task now. */
adminFleetRoutes.post("/delivery-tasks/:id/offer", async (req, res) => {
  requireRole(req, "store_admin", "order_manager")
  const rider = await offerTask(req.params.id, actorOf(req))
  res.json({ offeredTo: rider ? { id: rider._id, name: rider.name } : null })
})

adminFleetRoutes.post("/delivery-tasks/:id/rto", async (req, res) => {
  requireRole(req, "store_admin", "order_manager")
  const { reason } = z.object({ reason: z.string().trim().min(3).max(300) }).parse(req.body)
  const task = await startRto(req.params.id, actorOf(req), reason)
  await audit(req, "delivery.rto", "delivery_tasks", task._id, { reason })
  res.json({ task: { ...task, otp: undefined } })
})

/** The proof-of-delivery photo, streamed from private storage to signed-in admins only. */
adminFleetRoutes.get("/delivery-tasks/:id/pod-photo", async (req, res) => {
  const task = await db.deliveryTasks().findOne({ _id: req.params.id }, { projection: { pod: 1 } })
  const rel = task?.pod?.photo
  if (!rel || !/^pod\/[a-z0-9_-]+\.(jpg|png|webp)$/i.test(rel)) throw notFound("Photo")
  const path = normalize(join(env.PRIVATE_UPLOADS_DIR, rel))
  await access(path).catch(() => {
    throw notFound("Photo")
  })
  res.setHeader("Content-Type", rel.endsWith(".png") ? "image/png" : rel.endsWith(".webp") ? "image/webp" : "image/jpeg")
  res.setHeader("Cache-Control", "private, no-store")
  createReadStream(path).pipe(res)
})

/* ---------- Cash on delivery ---------- */

adminFleetRoutes.get("/cod-remittances", async (req, res) => {
  const q = z.object({ status: z.enum(["submitted", "reconciled", "mismatch"]).optional() }).parse(req.query)
  const remittances = await db.codRemittances().find(q.status ? { status: q.status } : {}, { sort: { submittedAt: -1 }, limit: 200 }).toArray()
  const outstanding = await db.deliveryTasks().aggregate<{ _id: string; n: number; parcels: number }>([{ $match: { "cod.collected": { $exists: true }, "cod.remittanceId": null, status: "delivered" } }, { $group: { _id: "$riderId", n: { $sum: "$cod.collected" }, parcels: { $sum: 1 } } }]).toArray()
  res.json({ remittances, cashWithRiders: outstanding.map((o) => ({ riderId: o._id, amount: o.n, parcels: o.parcels })) })
})

adminFleetRoutes.post("/cod-remittances/:id/reconcile", async (req, res) => {
  requireRole(req, "finance_manager")
  const body = z.object({ counted: z.number().int().min(0), note: z.string().trim().max(300).optional() }).parse(req.body)
  const r = await reconcileRemittance(req.params.id, body.counted, actorOf(req), body.note)
  await audit(req, `cod.${r.status}`, "cod_remittances", r._id, body)
  res.json({ remittance: r })
})
