import { Router, type Request, type RequestHandler } from "express"
import { z } from "zod"
import { db, FULFILMENT_STATUSES, type ActorRef, type FulfilmentDoc, type WarehouseRole } from "../../db/schema.js"
import { clientKey, issueToken, rateLimit, requireAuth, verifyPassword } from "../../lib/auth.js"
import { ApiError, forbidden, notFound, unauthorized } from "../../lib/errors.js"
import {
  acceptFulfilment,
  closeManifest,
  completePicking,
  createManifest,
  generateFulfilmentLabel,
  loadFulfilment,
  pack,
  qualityCheck,
  rejectFulfilment,
  scanHandover,
  scanPick,
  startPicking,
  verifyLabel,
} from "../../lib/fulfilment/workflow.js"
import { runStockOperation, stockOperationSchema } from "../../lib/inventory/operations.js"
import { email } from "../../lib/validation.js"
import { removeSubscription, saveSubscription, subscriptionSchema, vapidPublicKey } from "../../lib/notify/subscriptions.js"
import { inspectReturn } from "../../lib/returns/inspect.js"
import { currentReturn, REASON_TEXT } from "../../lib/returns/returns.js"
import { skuOf } from "../../lib/inventory/stock.js"
import { zoneFor } from "../../lib/fleet/tasks.js"
import { findRto, receiveRto } from "../../lib/fleet/rto.js"
import { receiveInbound } from "../../lib/marketplace/inbound.js"
import { adminLoginMaxAttempts } from "../../env.js"

/*
 * The warehouse floor API, for apps/warehouse. Staff accounts are separate
 * from admin accounts and see only the warehouses they are assigned to: any
 * record from another warehouse answers 404, as if it didn't exist. Nothing
 * here returns the customer's name, phone, email or street address.
 */

export const warehouseRoutes = Router()

type Permission = "view" | "accept" | "pick" | "qc" | "pack" | "label" | "dispatch" | "stock"

const PERMISSIONS: Record<WarehouseRole, Permission[]> = {
  picker: ["view", "pick"],
  packer: ["view", "qc", "pack", "label"],
  inspector: ["view", "qc"],
  dispatcher: ["view", "accept", "label", "dispatch"],
  supervisor: ["view", "accept", "pick", "qc", "pack", "label", "dispatch", "stock"],
}

warehouseRoutes.post("/auth/login", async (req, res) => {
  const body = z.object({ email, password: z.string().min(1).max(200) }).parse(req.body)
  if (!rateLimit(`warehouse-login:${clientKey(req, body.email)}`, adminLoginMaxAttempts, 15 * 60 * 1000)) {
    throw new ApiError(429, "rate_limited", "Too many attempts. Try again later.")
  }
  const user = await db.warehouseUsers().findOne({ email: body.email })
  if (!(await verifyPassword(body.password, user?.passwordHash)) || !user || user.status !== "active") {
    throw unauthorized("Email or password is incorrect")
  }
  res.json({ token: issueToken("warehouse", user._id) })
})

/** Loads the signed-in staff member; a suspended account loses access on its next request. */
const loadUser: RequestHandler = async (req, _res, next) => {
  const user = await db.warehouseUsers().findOne({ _id: req.actorId!, status: "active" }, { projection: { passwordHash: 0 } })
  if (!user) throw unauthorized()
  req.warehouseUser = { id: user._id, email: user.email, name: user.name, role: user.role, warehouseIds: user.warehouseIds }
  next()
}

warehouseRoutes.use(requireAuth("warehouse"), loadUser)

const can = (req: Request, p: Permission) => {
  if (!PERMISSIONS[req.warehouseUser!.role].includes(p)) throw forbidden("Your role can't do this")
}
const actorOf = (req: Request): ActorRef => ({ type: "warehouse", id: req.warehouseUser!.id, name: req.warehouseUser!.name })
const inScope = (req: Request, warehouseId: string) => {
  if (!req.warehouseUser!.warehouseIds.includes(warehouseId)) throw notFound("Warehouse")
}
/** A fulfilment the signed-in user may touch, else 404. */
const scoped = async (req: Request, p: Permission): Promise<FulfilmentDoc> => {
  can(req, p)
  const f = await loadFulfilment(String(req.params.id)).catch(() => null)
  if (!f || !req.warehouseUser!.warehouseIds.includes(f.warehouseId)) throw notFound("Fulfilment")
  return f
}

warehouseRoutes.get("/me", async (req, res) => {
  const warehouses = await db
    .warehouses()
    .find({ _id: { $in: req.warehouseUser!.warehouseIds } }, { projection: { code: 1, name: 1, city: 1, pincode: 1, status: 1 } })
    .toArray()
  res.json({ user: req.warehouseUser, permissions: PERMISSIONS[req.warehouseUser!.role], warehouses })
})

/** Floor dashboard: live fulfilments by status, open manifests, stock needing attention, at one warehouse. */
warehouseRoutes.get("/summary", async (req, res) => {
  can(req, "view")
  const { warehouseId } = z.object({ warehouseId: z.string() }).parse(req.query)
  inScope(req, warehouseId)
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const [byStatus, openManifests, dispatchedToday, damaged, oldest] = await Promise.all([
    db.fulfilments().aggregate<{ _id: string; n: number }>([{ $match: { warehouseId, active: true } }, { $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
    db.manifests().countDocuments({ warehouseId, status: "open" }),
    db.fulfilments().countDocuments({ warehouseId, status: "dispatched", dispatchedAt: { $gte: startOfDay } }),
    db.stockLevels().aggregate<{ n: number }>([{ $match: { warehouseId, damaged: { $gt: 0 } } }, { $group: { _id: null, n: { $sum: "$damaged" } } }]).toArray(),
    db.fulfilments().findOne({ warehouseId, status: { $in: ["assigned", "picking_pending"] }, active: true }, { sort: { createdAt: 1 }, projection: { createdAt: 1 } }),
  ])
  res.json({
    byStatus: Object.fromEntries(byStatus.filter((b) => b._id !== "dispatched").map((b) => [b._id, b.n])),
    openManifests,
    dispatchedToday,
    damagedUnits: damaged[0]?.n ?? 0,
    oldestWaitingSince: oldest?.createdAt ?? null,
  })
})

/** Active warehouses stock can be sent to (names and codes only). */
warehouseRoutes.get("/destinations", async (req, res) => {
  can(req, "stock")
  const warehouses = await db.warehouses().find({ status: "active" }, { projection: { code: 1, name: 1, city: 1 }, sort: { code: 1 } }).toArray()
  res.json({ warehouses })
})

/** Catalogue lookup by scanned SKU, for receiving an item this warehouse has never held. */
warehouseRoutes.get("/catalog/lookup", async (req, res) => {
  can(req, "view")
  const { sku } = z.object({ sku: z.string().trim().min(1).max(80) }).parse(req.query)
  const code = sku.toUpperCase()
  const escape = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  // Variants without a SKU are labelled SKU-<last six of the id> (skuOf).
  const fallback = /^SKU-([0-9a-z]{6})$/i.exec(code)?.[1]?.toLowerCase()
  const products = await db
    .products()
    .find(
      { $or: [{ "variants.sku": { $regex: `^${escape(code)}$`, $options: "i" } }, ...(fallback ? [{ "variants._id": { $regex: `${fallback}$` } }] : [])] },
      { projection: { title: 1, variants: 1 } }
    )
    .limit(20)
    .toArray()
  const matches = products.flatMap((p) =>
    p.variants.filter((v) => skuOf(v).toUpperCase() === code).map((v) => ({ productId: p._id, productTitle: p.title, variantId: v._id, variantTitle: v.title, options: v.options, sku: skuOf(v) }))
  )
  if (!matches.length) throw notFound("Item")
  res.json({ items: matches })
})

/** The queue: fulfilments at the user's warehouses, oldest first (first in, first out). */
warehouseRoutes.get("/fulfilments", async (req, res) => {
  can(req, "view")
  const q = z
    .object({ warehouseId: z.string().optional(), status: z.union([z.enum(FULFILMENT_STATUSES), z.array(z.enum(FULFILMENT_STATUSES))]).optional(), limit: z.coerce.number().int().min(1).max(200).default(50) })
    .parse(req.query)
  if (q.warehouseId) inScope(req, q.warehouseId)
  const statuses = q.status ? [q.status].flat() : undefined
  const fulfilments = await db
    .fulfilments()
    .find({ warehouseId: q.warehouseId ?? { $in: req.warehouseUser!.warehouseIds }, ...(statuses ? { status: { $in: statuses } } : { active: true }) }, { sort: { createdAt: 1 }, limit: q.limit })
    .toArray()
  res.json({ fulfilments })
})

warehouseRoutes.get("/fulfilments/:id", async (req, res) => {
  const f = await scoped(req, "view")
  const [history, shipment, zone] = await Promise.all([
    db.statusEvents().find({ entityId: f._id }, { sort: { at: 1 } }).toArray(),
    f.shipmentId ? db.shipments().findOne({ _id: f.shipmentId }, { projection: { awb: 1, carrier: 1, labelUrl: 1, status: 1, provider: 1 } }) : null,
    zoneFor(f.warehouseId, f.destination.postalCode),
  ])
  // Whether our own riders can take it: the destination is in one of this warehouse's zones (and cash can be collected there, for COD).
  const ownFleet = zone ? { zone: zone.name, codAllowed: zone.codAllowed } : null
  res.json({ fulfilment: f, history, label: shipment, ownFleet })
})

/**
 * Our own shipping label for an own-fleet parcel. It carries the delivery
 * address, as any courier's label does, so it's available only once the
 * parcel is booked and until it leaves the building.
 */
warehouseRoutes.get("/fulfilments/:id/own-label", async (req, res) => {
  const f = await scoped(req, "label")
  if (!["label_generated", "ready_to_dispatch", "manifested", "handed_over"].includes(f.status)) throw notFound("Label")
  const task = f.shipmentId ? await db.deliveryTasks().findOne({ shipmentId: f.shipmentId }) : null
  if (!task) throw notFound("Label")
  res.json({
    label: {
      awb: task.code,
      orderNumber: f.displayId,
      warehouse: f.warehouseCode,
      to: { name: task.stop.name, address1: task.stop.address1, address2: task.stop.address2 ?? null, city: task.stop.city, postalCode: task.stop.postalCode },
      cod: task.cod ? { amount: task.cod.due, currency: task.cod.currency } : null,
      weightKg: f.package?.weightKg ?? null,
    },
  })
})

/** Finds a fulfilment from its scanned pick slip. */
warehouseRoutes.get("/scan/fulfilment/:code", async (req, res) => {
  can(req, "view")
  const f = await db.fulfilments().findOne({ code: String(req.params.code).trim().toUpperCase(), warehouseId: { $in: req.warehouseUser!.warehouseIds } })
  if (!f) throw notFound("Fulfilment")
  res.json({ fulfilment: f })
})

warehouseRoutes.post("/fulfilments/:id/accept", async (req, res) => {
  const f = await scoped(req, "accept")
  res.json({ fulfilment: await acceptFulfilment(f._id, actorOf(req)) })
})

warehouseRoutes.post("/fulfilments/:id/reject", async (req, res) => {
  const f = await scoped(req, "accept")
  const { reason } = z.object({ reason: z.string().trim().min(3).max(300) }).parse(req.body)
  const result = await rejectFulfilment(f._id, actorOf(req), reason)
  // The re-allocated fulfilments belong to other warehouses: report only whether it moved.
  res.json({ fulfilment: result.rejected, reallocated: result.reallocated.length > 0 })
})

warehouseRoutes.post("/fulfilments/:id/picking/start", async (req, res) => {
  const f = await scoped(req, "pick")
  res.json({ fulfilment: await startPicking(f._id, actorOf(req)) })
})

warehouseRoutes.post("/fulfilments/:id/picking/scan", async (req, res) => {
  const f = await scoped(req, "pick")
  const body = z.object({ barcode: z.string().trim().min(1).max(80), quantity: z.number().int().positive().max(100).default(1) }).parse(req.body)
  res.json({ fulfilment: await scanPick(f._id, body.barcode, body.quantity, actorOf(req)) })
})

warehouseRoutes.post("/fulfilments/:id/picking/complete", async (req, res) => {
  const f = await scoped(req, "pick")
  res.json({ fulfilment: await completePicking(f._id, actorOf(req)) })
})

warehouseRoutes.post("/fulfilments/:id/qc", async (req, res) => {
  const f = await scoped(req, "qc")
  const body = z
    .object({
      result: z.enum(["passed", "failed"]),
      notes: z.string().trim().max(500).optional(),
      failures: z.array(z.object({ itemId: z.string(), quantity: z.number().int().positive(), reason: z.string().trim().min(3).max(200) })).max(50).optional(),
    })
    .parse(req.body)
  res.json({ fulfilment: await qualityCheck(f._id, body, actorOf(req)) })
})

warehouseRoutes.post("/fulfilments/:id/pack", async (req, res) => {
  const f = await scoped(req, "pack")
  const body = z
    .object({
      orderCode: z.string().trim().min(1).max(40),
      scans: z.array(z.string().trim().min(1).max(80)).min(1).max(500),
      weightKg: z.number().positive().max(100),
      lengthCm: z.number().positive().max(300),
      breadthCm: z.number().positive().max(300),
      heightCm: z.number().positive().max(300),
    })
    .parse(req.body)
  res.json({ fulfilment: await pack(f._id, body, actorOf(req)) })
})

warehouseRoutes.post("/fulfilments/:id/label", async (req, res) => {
  const f = await scoped(req, "label")
  const body = z
    .object({
      packageCode: z.string().trim().min(1).max(40),
      carrier: z.enum(["shiprocket", "delhivery"]).optional(),
      courierId: z.number().int().positive().optional(),
      ownFleet: z.boolean().optional(),
      manual: z.object({ carrier: z.string().trim().min(2).max(80), awb: z.string().trim().min(4).max(40), trackingUrl: z.url().optional() }).optional(),
    })
    .parse(req.body)
  const fulfilment = await generateFulfilmentLabel(f._id, body, actorOf(req))
  const shipment = fulfilment.shipmentId ? await db.shipments().findOne({ _id: fulfilment.shipmentId }, { projection: { awb: 1, carrier: 1, labelUrl: 1, status: 1 } }) : null
  res.json({ fulfilment, label: shipment })
})

warehouseRoutes.post("/fulfilments/:id/label/verify", async (req, res) => {
  const f = await scoped(req, "label")
  const { awb } = z.object({ awb: z.string().trim().min(1).max(40) }).parse(req.body)
  res.json({ fulfilment: await verifyLabel(f._id, awb, actorOf(req)) })
})

/* ---------- Manifests and courier handover ---------- */

warehouseRoutes.get("/manifests", async (req, res) => {
  can(req, "view")
  const q = z.object({ status: z.enum(["open", "closed"]).optional() }).parse(req.query)
  const manifests = await db
    .manifests()
    .find({ warehouseId: { $in: req.warehouseUser!.warehouseIds }, ...(q.status ? { status: q.status } : {}) }, { sort: { createdAt: -1 }, limit: 100 })
    .toArray()
  res.json({ manifests })
})

warehouseRoutes.post("/manifests", async (req, res) => {
  can(req, "dispatch")
  const body = z.object({ warehouseId: z.string(), carrier: z.string().trim().min(1).max(80) }).parse(req.body)
  inScope(req, body.warehouseId)
  res.status(201).json({ manifest: await createManifest(body.warehouseId, body.carrier, actorOf(req)) })
})

const scopedManifest = async (req: Request) => {
  can(req, "dispatch")
  const m = await db.manifests().findOne({ _id: String(req.params.id) })
  if (!m || !req.warehouseUser!.warehouseIds.includes(m.warehouseId)) throw notFound("Manifest")
  return m
}

warehouseRoutes.post("/manifests/:id/scan", async (req, res) => {
  const m = await scopedManifest(req)
  const { awb } = z.object({ awb: z.string().trim().min(1).max(40) }).parse(req.body)
  res.json({ manifest: await scanHandover(m._id, awb, actorOf(req)) })
})

warehouseRoutes.post("/manifests/:id/close", async (req, res) => {
  const m = await scopedManifest(req)
  const { courierExecutive } = z.object({ courierExecutive: z.string().trim().min(2).max(100) }).parse(req.body)
  res.json({ manifest: await closeManifest(m._id, courierExecutive, actorOf(req)) })
})

/* ---------- Stock ---------- */

/** SKU lookup: where an item is and how many, at the user's warehouses. */
warehouseRoutes.get("/stock", async (req, res) => {
  can(req, "view")
  const q = z.object({ warehouseId: z.string().optional(), sku: z.string().trim().max(80).optional(), limit: z.coerce.number().int().min(1).max(500).default(100) }).parse(req.query)
  if (q.warehouseId) inScope(req, q.warehouseId)
  const escaped = q.sku?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const stock = await db
    .stockLevels()
    .find({ warehouseId: q.warehouseId ?? { $in: req.warehouseUser!.warehouseIds }, ...(escaped ? { sku: { $regex: `^${escaped}`, $options: "i" } } : {}) }, { sort: { sku: 1 }, limit: q.limit })
    .toArray()
  // Titles for the screen; product names only, no prices.
  const products = await db.products().find({ _id: { $in: [...new Set(stock.map((s) => s.productId))] } }, { projection: { title: 1, "variants._id": 1, "variants.title": 1 } }).toArray()
  const titleOf = (s: (typeof stock)[number]) => {
    const p = products.find((x) => x._id === s.productId)
    return { productTitle: p?.title ?? "", variantTitle: p?.variants.find((v) => v._id === s.variantId)?.title ?? "" }
  }
  res.json({ stock: stock.map((s) => ({ ...s, ...titleOf(s) })) })
})

warehouseRoutes.post("/stock/operations", async (req, res) => {
  can(req, "stock")
  const op = stockOperationSchema.parse(req.body)
  inScope(req, op.warehouseId)
  res.status(201).json(await runStockOperation(op, actorOf(req)))
})

/** Shelves a variant in a rack/bin, shown on pick lists. */
warehouseRoutes.patch("/stock/:id/bin", async (req, res) => {
  can(req, "stock")
  const { binCode } = z.object({ binCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{1,20}$/, "Use letters, digits and dashes").nullable() }).parse(req.body)
  const level = await db.stockLevels().findOne({ _id: String(req.params.id) })
  if (!level) throw notFound("Stock level")
  inScope(req, level.warehouseId)
  await db.stockLevels().updateOne({ _id: level._id }, { $set: { binCode, updatedAt: new Date() } })
  res.json({ stock: { ...level, binCode } })
})

warehouseRoutes.get("/stock/ledger", async (req, res) => {
  can(req, "view")
  const q = z.object({ warehouseId: z.string(), variantId: z.string().optional(), limit: z.coerce.number().int().min(1).max(500).default(100) }).parse(req.query)
  inScope(req, q.warehouseId)
  const entries = await db.stockLedger().find({ warehouseId: q.warehouseId, ...(q.variantId ? { variantId: q.variantId } : {}) }, { sort: { createdAt: -1 }, limit: q.limit }).toArray()
  res.json({ entries })
})

/* ---------- Undelivered parcels (RTO) ---------- */

/** A parcel coming back undelivered, by its outbound AWB. Item details only. */
warehouseRoutes.get("/rto/:awb", async (req, res) => {
  can(req, "qc")
  const found = await findRto(String(req.params.awb))
  if (!found || !req.warehouseUser!.warehouseIds.includes(found.fulfilment.warehouseId)) throw notFound("Returning parcel")
  const { shipment, fulfilment: f } = found
  res.json({
    rto: {
      awb: shipment.awb,
      carrier: shipment.carrier,
      displayId: f.displayId,
      warehouseId: f.warehouseId,
      received: !!shipment.rtoReceivedAt,
      lines: f.lines.map((l) => ({ itemId: l.itemId, sku: l.sku, productTitle: l.productTitle, variantTitle: l.variantTitle, quantity: l.quantity })),
    },
  })
})

warehouseRoutes.post("/rto/:awb/receive", async (req, res) => {
  can(req, "qc")
  const body = z
    .object({ warehouseId: z.string(), grades: z.array(z.object({ itemId: z.string(), sellable: z.number().int().min(0), damaged: z.number().int().min(0) })).min(1).max(100) })
    .parse(req.body)
  inScope(req, body.warehouseId)
  res.json(await receiveRto(String(req.params.awb), body.warehouseId, body.grades, actorOf(req)))
})

/* ---------- Returns ---------- */

/** A returned parcel at the dock, found by its reverse AWB or the order number. Item details only. */
/**
 * A returned parcel at the dock, by its reverse-pickup AWB, the customer's
 * own courier AWB, the return code (RET-1042-1) or the order number. Item
 * details only.
 */
warehouseRoutes.get("/returns/lookup", async (req, res) => {
  can(req, "qc")
  const q = z
    .object({ awb: z.string().trim().min(1).max(40).optional(), orderNumber: z.coerce.number().int().positive().optional() })
    .refine((x) => x.awb || x.orderNumber, "Scan the AWB or enter the order number")
    .parse(req.query)
  const code = q.awb?.toUpperCase()
  const shipment = code ? await db.shipments().findOne({ awb: code, isReturn: true }) : null
  const ret =
    (shipment?.returnId ? await db.returns().findOne({ _id: shipment.returnId }) : null) ??
    (code ? await db.returns().findOne({ $or: [{ "selfShip.awb": code }, { code }] }) : null) ??
    (shipment ? await currentReturn(shipment.orderId) : null) ??
    (q.orderNumber ? await db.orders().findOne({ displayId: q.orderNumber }, { projection: { _id: 1 } }).then((o) => (o ? currentReturn(o._id) : null)) : null)
  if (!ret) throw notFound("Return")
  res.json({
    return: {
      returnId: ret._id,
      code: ret.code,
      type: ret.type,
      orderId: ret.orderId,
      displayId: ret.displayId,
      status: ret.status,
      reason: ret.items.map((l) => (l.note ? `${REASON_TEXT[l.reason]}: ${l.note}` : REASON_TEXT[l.reason])).join("; "),
      awb: shipment?.awb ?? ret.selfShip?.awb ?? null,
      items: ret.items.map((l) => ({ itemId: l.itemId, quantity: l.quantity, productTitle: l.productTitle, variantTitle: l.variantTitle, variantId: l.variantId, reason: REASON_TEXT[l.reason] })),
    },
  })
})

/** `:id` is the return (ret_...); an order id (order_...) means that order's open return. */
warehouseRoutes.post("/returns/:id/inspect", async (req, res) => {
  can(req, "qc")
  const body = z
    .object({
      warehouseId: z.string(),
      lines: z.array(z.object({ itemId: z.string(), quantity: z.number().int().positive(), condition: z.enum(["sellable", "damaged"]), notes: z.string().trim().max(300).optional() })).min(1).max(100),
    })
    .parse(req.body)
  inScope(req, body.warehouseId)
  const id = String(req.params.id)
  const ret = id.startsWith("order_") ? await currentReturn(id) : await db.returns().findOne({ _id: id })
  if (!ret) throw notFound("Return")
  const done = await inspectReturn(ret._id, body.warehouseId, body.lines, actorOf(req))
  res.json({ status: done.status, inspection: done.inspection })
})

/* ---------- Stock from marketplace sellers ---------- */

/** An advance shipping notice from a seller, by its scanned or typed code. */
warehouseRoutes.get("/inbound/:code", async (req, res) => {
  can(req, "stock")
  const asn = await db.inboundShipments().findOne({ code: String(req.params.code).toUpperCase(), warehouseId: { $in: req.warehouseUser!.warehouseIds } })
  if (!asn) throw notFound("Inbound shipment")
  const seller = await db.sellers().findOne({ _id: asn.sellerId }, { projection: { displayName: 1, code: 1 } })
  res.json({ shipment: asn, seller })
})

warehouseRoutes.post("/inbound/:code/receive", async (req, res) => {
  can(req, "stock")
  const body = z.object({ counts: z.array(z.object({ variantId: z.string(), quantity: z.number().int().positive().max(100_000) })).max(200), close: z.boolean().default(false) }).parse(req.body)
  res.json({ shipment: await receiveInbound(String(req.params.code), req.warehouseUser!.warehouseIds, body.counts, actorOf(req), body.close) })
})

/* ---------- Push notifications on this device ---------- */

warehouseRoutes.get("/push/key", (_req, res) => {
  res.json({ publicKey: vapidPublicKey() })
})

warehouseRoutes.post("/push-subscriptions", async (req, res) => {
  await saveSubscription("warehouse", req.warehouseUser!.id, subscriptionSchema.parse(req.body), req.get("user-agent"))
  res.status(201).json({ subscribed: true })
})

warehouseRoutes.delete("/push-subscriptions", async (req, res) => {
  await removeSubscription("warehouse", req.warehouseUser!.id, z.object({ endpoint: z.string().optional(), token: z.string().optional() }).parse(req.body ?? {}))
  res.json({ subscribed: false })
})

declare global {
  namespace Express {
    interface Request {
      warehouseUser?: { id: string; email: string; name: string; role: WarehouseRole; warehouseIds: string[] }
    }
  }
}
