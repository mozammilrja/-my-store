import { randomBytes } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Router, type Request, type RequestHandler } from "express"
import multer from "multer"
import { z } from "zod"
import { db, FAILED_DELIVERY_REASONS, RIDER_DOCUMENT_TYPES, type DeliveryTaskDoc, type RiderDoc } from "../../db/schema.js"
import { env, adminLoginMaxAttempts } from "../../env.js"
import { clientKey, hashPassword, issueToken, rateLimit, requireAuth, verifyPassword } from "../../lib/auth.js"
import { ApiError, badRequest, conflict, forbidden, unauthorized } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { cashInHand, submitRemittance } from "../../lib/fleet/cod.js"
import { acceptOffer, declineOffer, offerTask, releaseOffer, routeFor } from "../../lib/fleet/dispatch.js"
import { fleetSettings } from "../../lib/fleet/support.js"
import { deliver, failAttempt, pickupScan, reissueOtp, startDelivery } from "../../lib/fleet/tasks.js"
import { email } from "../../lib/validation.js"

/*
 * The delivery partner API, for apps/rider. Riders are their own account
 * type. A pending rider can sign in to complete their profile and documents;
 * only an approved rider can go online and take deliveries. A rider sees
 * only their own deliveries, the address only once they've accepted it, and
 * the customer's phone only while that parcel is out for delivery. The OTP
 * is never sent to the rider.
 */

export const riderRoutes = Router()

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, "").slice(-10))
  .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a 10-digit Indian mobile number")

const vehicle = z.object({
  type: z.enum(["bicycle", "bike", "scooter", "van"]),
  registration: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{1,4}$/, "Enter the registration as on the RC, e.g. KA 01 AB 1234")
    .optional(),
})

riderRoutes.post("/auth/register", async (req, res) => {
  if (!rateLimit(`rider-register:${clientKey(req, "register")}`, 10, 60 * 60 * 1000)) throw new ApiError(429, "rate_limited", "Too many sign-ups from here. Try again later.")
  const body = z.object({ email, phone, name: z.string().trim().min(2).max(100), password: z.string().min(10, "Use at least 10 characters").max(200), vehicle }).parse(req.body)
  if (await db.riders().findOne({ $or: [{ email: body.email }, { phone: body.phone }] })) throw conflict("An account with that email or phone already exists.", "duplicate")
  const now = new Date()
  const rider: RiderDoc = {
    _id: newId("rdr"),
    email: body.email,
    phone: body.phone,
    name: body.name,
    passwordHash: await hashPassword(body.password),
    status: "pending",
    vehicle: body.vehicle,
    documents: [],
    warehouseId: null,
    zoneIds: [],
    shifts: [],
    online: false,
    lastLocation: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.riders().insertOne(rider)
  res.status(201).json({ token: issueToken("rider", rider._id), rider: publicRider(rider) })
})

riderRoutes.post("/auth/login", async (req, res) => {
  const body = z.object({ email, password: z.string().min(1).max(200) }).parse(req.body)
  if (!rateLimit(`rider-login:${clientKey(req, body.email)}`, adminLoginMaxAttempts, 15 * 60 * 1000)) throw new ApiError(429, "rate_limited", "Too many attempts. Try again later.")
  const rider = await db.riders().findOne({ email: body.email })
  if (!(await verifyPassword(body.password, rider?.passwordHash)) || !rider || rider.status === "rejected") throw unauthorized("Email or password is incorrect")
  res.json({ token: issueToken("rider", rider._id) })
})

const loadRider: RequestHandler = async (req, _res, next) => {
  const rider = await db.riders().findOne({ _id: req.actorId! })
  if (!rider || rider.status === "rejected") throw unauthorized()
  req.rider = rider
  next()
}
riderRoutes.use(requireAuth("rider"), loadRider)

const approved = (req: Request) => {
  if (req.rider!.status !== "approved") throw forbidden(req.rider!.status === "suspended" ? "Your account is suspended. Contact your hub." : "Your account is waiting for approval.")
  return req.rider!
}

const mask = (n: string) => (n.length <= 4 ? "••••" : `${"•".repeat(Math.min(8, n.length - 4))}${n.slice(-4)}`)
export const publicRider = ({ passwordHash: _p, documents, ...r }: RiderDoc) => ({ ...r, documents: documents.map((d) => ({ ...d, number: mask(d.number) })) })

/** What a rider may see of a delivery, by stage. */
function riderView(t: DeliveryTaskDoc, riderId: string) {
  const mine = t.riderId === riderId
  const base = {
    _id: t._id,
    code: t.code,
    displayId: t.displayId,
    status: t.status,
    sequence: t.sequence ?? null,
    area: { city: t.stop.city, postalCode: t.stop.postalCode },
    cod: t.cod ? { due: t.cod.due, currency: t.cod.currency, collected: t.cod.collected ?? null } : null,
    attempts: t.attempts.map((a) => ({ at: a.at, reason: a.reason, note: a.note ?? null, rescheduledFor: a.rescheduledFor ?? null })),
    offer: t.offer && t.offer.riderId === riderId ? { expiresAt: t.offer.expiresAt } : null,
    otpIssued: !!t.otp,
    delivered: t.pod ? { at: t.pod.at, receiverName: t.pod.receiverName } : null,
    earnings: t.earnings.filter((e) => e.riderId === riderId).reduce((n, e) => n + e.amount, 0),
    updatedAt: t.updatedAt,
  }
  if (!mine) return base
  const live = !["delivered", "returned", "cancelled"].includes(t.status)
  return {
    ...base,
    stop: live
      ? {
          name: t.stop.name,
          address1: t.stop.address1,
          address2: t.stop.address2 ?? null,
          city: t.stop.city,
          postalCode: t.stop.postalCode,
          instructions: t.stop.instructions ?? null,
          lat: t.stop.lat ?? null,
          lng: t.stop.lng ?? null,
          phone: t.status === "out_for_delivery" ? t.stop.phone : null,
        }
      : null,
  }
}

/* ---------- Profile ---------- */

riderRoutes.get("/me", async (req, res) => {
  const r = req.rider!
  const [zones, warehouse, settings] = await Promise.all([
    db.deliveryZones().find({ _id: { $in: r.zoneIds } }, { projection: { code: 1, name: 1, pincodes: 1 } }).toArray(),
    r.warehouseId ? db.warehouses().findOne({ _id: r.warehouseId }, { projection: { code: 1, name: 1, address: 1, city: 1, pincode: 1, lat: 1, lng: 1 } }) : null,
    fleetSettings(),
  ])
  res.json({ rider: publicRider(r), zones, warehouse, payout: { perDelivery: settings.payoutPerDelivery, perFailedAttempt: settings.payoutPerFailedAttempt }, failedReasons: FAILED_DELIVERY_REASONS })
})

const shift = z.object({ day: z.number().int().min(0).max(6), start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).refine((s) => s.start !== s.end, "A shift needs a start and an end")

riderRoutes.patch("/me", async (req, res) => {
  const body = z.object({ name: z.string().trim().min(2).max(100).optional(), vehicle: vehicle.optional(), shifts: z.array(shift).max(21).optional() }).parse(req.body)
  const r = await db.riders().findOneAndUpdate({ _id: req.rider!._id }, { $set: { ...body, updatedAt: new Date() } }, { returnDocument: "after" })
  res.json({ rider: publicRider(r!) })
})

/** Adds or replaces a document by type. A changed document is verified again by the hub. */
riderRoutes.put("/me/documents/:type", async (req, res) => {
  const type = z.enum(RIDER_DOCUMENT_TYPES).parse(req.params.type)
  const { number } = z.object({ number: z.string().trim().toUpperCase().regex(/^[A-Z0-9 -]{4,30}$/, "Enter the number as printed on the document") }).parse(req.body)
  const docs = [...req.rider!.documents.filter((d) => d.type !== type), { type, number, verified: false }]
  const r = await db.riders().findOneAndUpdate({ _id: req.rider!._id }, { $set: { documents: docs, updatedAt: new Date() } }, { returnDocument: "after" })
  res.json({ rider: publicRider(r!) })
})

/** Online/offline. Going offline stops location sharing and hands back any open offers. */
riderRoutes.post("/me/availability", async (req, res) => {
  const { online } = z.object({ online: z.boolean() }).parse(req.body)
  const rider = online ? approved(req) : req.rider!
  if (online && !rider.zoneIds.length) throw conflict("You haven't been given a delivery zone yet. Ask your hub.", "no_zone")
  const now = new Date()
  const r = await db
    .riders()
    .findOneAndUpdate({ _id: rider._id }, { $set: { online, updatedAt: now, ...(online ? (rider.online ? {} : { onlineSince: now }) : { lastLocation: null }) } }, { returnDocument: "after" })
  if (!online) {
    for (const t of await db.deliveryTasks().find({ status: "offered", "offer.riderId": rider._id }).toArray()) {
      await releaseOffer(t, rider._id, { type: "rider", id: rider._id, name: rider.name }, "Rider went offline").catch(() => {})
    }
  } else {
    // Waiting parcels may now have someone to go to.
    for (const t of await db.deliveryTasks().find({ status: "unassigned", zoneId: { $in: rider.zoneIds } }, { sort: { createdAt: 1 }, limit: 50 }).toArray()) await offerTask(t._id).catch(() => null)
  }
  res.json({ rider: publicRider(r!) })
})

/**
 * Position, sent by the app only while the rider is online with a parcel out
 * for delivery; refused otherwise. Only the latest position is kept.
 */
riderRoutes.post("/me/location", async (req, res) => {
  const rider = approved(req)
  const body = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracy: z.number().min(0).max(10_000).optional() }).parse(req.body)
  if (!rider.online) throw conflict("Location is shared only while you're online.", "offline")
  if (!(await db.deliveryTasks().countDocuments({ riderId: rider._id, status: "out_for_delivery" }))) throw conflict("Location is shared only while you're out for delivery.", "not_delivering")
  await db.riders().updateOne({ _id: rider._id }, { $set: { lastLocation: { ...body, at: new Date() } } })
  res.json({ ok: true })
})

/* ---------- Deliveries ---------- */

riderRoutes.get("/tasks", async (req, res) => {
  const rider = approved(req)
  const [route, offers] = await Promise.all([routeFor(rider._id), db.deliveryTasks().find({ status: "offered", "offer.riderId": rider._id }, { sort: { createdAt: 1 } }).toArray()])
  res.json({ offers: offers.map((t) => riderView(t, rider._id)), route: route.map((t) => riderView(t, rider._id)) })
})

riderRoutes.get("/tasks/:id", async (req, res) => {
  const rider = approved(req)
  const t = await db.deliveryTasks().findOne({ _id: String(req.params.id), $or: [{ riderId: rider._id }, { "offer.riderId": rider._id }] })
  if (!t) throw new ApiError(404, "not_found", "Delivery not found")
  res.json({ task: riderView(t, rider._id) })
})

riderRoutes.post("/tasks/:id/accept", async (req, res) => {
  const rider = approved(req)
  res.json({ task: riderView(await acceptOffer(String(req.params.id), rider), rider._id) })
})

riderRoutes.post("/tasks/:id/decline", async (req, res) => {
  const rider = approved(req)
  const { reason } = z.object({ reason: z.string().trim().max(200).optional() }).parse(req.body ?? {})
  await declineOffer(String(req.params.id), rider, reason)
  res.json({ declined: true })
})

riderRoutes.post("/pickup", async (req, res) => {
  const rider = approved(req)
  const { awb } = z.object({ awb: z.string().trim().min(4).max(40) }).parse(req.body)
  res.json({ task: riderView(await pickupScan(rider, awb), rider._id) })
})

riderRoutes.post("/tasks/start", async (req, res) => {
  const rider = approved(req)
  const { taskIds } = z.object({ taskIds: z.array(z.string()).min(1).max(100) }).parse(req.body)
  const tasks = await startDelivery(rider, taskIds)
  res.json({ tasks: tasks.map((t) => riderView(t, rider._id)) })
})

riderRoutes.post("/tasks/:id/otp", async (req, res) => {
  const rider = approved(req)
  res.json(await reissueOtp(rider, String(req.params.id)))
})

/** Proof-of-delivery photo: JPEG, PNG or WebP up to 5 MB, stored privately. */
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10 } })
const imageKind = (b: Buffer) =>
  b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? "jpg" : b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? "png" : b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" ? "webp" : null

riderRoutes.post("/tasks/:id/deliver", upload.single("photo"), async (req, res) => {
  const rider = approved(req)
  const num = (v: unknown) => (v === undefined || v === "" ? undefined : Number(v))
  const body = z
    .object({
      otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the customer"),
      receiverName: z.string().trim().min(2).max(100),
      codCollected: z.number().int().min(0).optional(),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    })
    .parse({ ...req.body, codCollected: num(req.body?.codCollected), lat: num(req.body?.lat), lng: num(req.body?.lng) })
  let photo: string | undefined
  if (req.file) {
    const kind = imageKind(req.file.buffer)
    if (!kind) throw badRequest("The photo must be a JPEG, PNG or WebP image.")
    const dir = join(env.PRIVATE_UPLOADS_DIR, "pod")
    await mkdir(dir, { recursive: true })
    photo = `pod/${String(req.params.id)}-${randomBytes(6).toString("hex")}.${kind}`
    await writeFile(join(env.PRIVATE_UPLOADS_DIR, photo), new Uint8Array(req.file.buffer))
  }
  const t = await deliver(rider, String(req.params.id), { ...body, ...(photo ? { photo } : {}) })
  res.json({ task: riderView(t, rider._id) })
})

riderRoutes.post("/tasks/:id/fail", async (req, res) => {
  const rider = approved(req)
  const body = z
    .object({
      reason: z.enum(FAILED_DELIVERY_REASONS),
      note: z.string().trim().max(300).optional(),
      rescheduledFor: z.coerce.date().optional(),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    })
    .parse(req.body)
  if (body.rescheduledFor && body.rescheduledFor.getTime() < Date.now() - 60_000) throw badRequest("Pick a time in the future")
  res.json({ task: riderView(await failAttempt(rider, String(req.params.id), body), rider._id) })
})

/* ---------- History, earnings, cash ---------- */

const period = (req: Request) => {
  const q = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }).parse(req.query)
  const to = q.to ?? new Date()
  const from = q.from ?? new Date(to.getTime() - 7 * 86_400_000)
  if (from > to) throw badRequest("The start must be before the end")
  return { from, to }
}

riderRoutes.get("/history", async (req, res) => {
  const rider = approved(req)
  const { from, to } = period(req)
  const tasks = await db
    .deliveryTasks()
    .find({ "earnings.riderId": rider._id, updatedAt: { $gte: from, $lte: to } }, { sort: { updatedAt: -1 }, limit: 200 })
    .toArray()
  // Finished deliveries carry no address (riderView drops it once a task is closed).
  res.json({ tasks: tasks.map((t) => riderView(t, rider._id)) })
})

riderRoutes.get("/earnings", async (req, res) => {
  const rider = approved(req)
  const { from, to } = period(req)
  const [row] = await db
    .deliveryTasks()
    .aggregate<{ deliveries: number; failed: number; amount: number }>([
      { $match: { "earnings.riderId": rider._id } },
      { $unwind: "$earnings" },
      { $match: { "earnings.riderId": rider._id, "earnings.at": { $gte: from, $lte: to } } },
      {
        $group: {
          _id: null,
          deliveries: { $sum: { $cond: [{ $eq: ["$earnings.kind", "delivery"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$earnings.kind", "failed_attempt"] }, 1, 0] } },
          amount: { $sum: "$earnings.amount" },
        },
      },
    ])
    .toArray()
  res.json({ from, to, deliveries: row?.deliveries ?? 0, failedAttempts: row?.failed ?? 0, amount: row?.amount ?? 0, currency: "inr" })
})

riderRoutes.get("/cash", async (req, res) => {
  const rider = approved(req)
  const [inHand, remittances] = await Promise.all([cashInHand(rider._id), db.codRemittances().find({ riderId: rider._id }, { sort: { submittedAt: -1 }, limit: 20 }).toArray()])
  res.json({ inHand: inHand.amount, parcels: inHand.tasks.map((t) => ({ code: t.code, displayId: t.displayId, amount: t.cod?.collected ?? 0, at: t.cod?.collectedAt ?? null })), remittances })
})

riderRoutes.post("/cash/remit", async (req, res) => {
  const rider = approved(req)
  const { declared } = z.object({ declared: z.number().int().min(0) }).parse(req.body)
  res.status(201).json({ remittance: await submitRemittance(rider, declared) })
})

declare global {
  namespace Express {
    interface Request {
      rider?: RiderDoc
    }
  }
}
