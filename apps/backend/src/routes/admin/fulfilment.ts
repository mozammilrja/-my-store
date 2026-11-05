import { Router, type Request } from "express"
import { z } from "zod"
import { withTransaction } from "../../db/client.js"
import { db, FULFILMENT_STATUSES, WAREHOUSE_ROLES, type ActorRef, type WarehouseUserDoc } from "../../db/schema.js"
import { hashPassword } from "../../lib/auth.js"
import { badRequest, forbidden, notFound } from "../../lib/errors.js"
import { allocateOutstanding, reassignFulfilment } from "../../lib/fulfilment/workflow.js"
import { newId } from "../../lib/ids.js"
import { runStockOperation, stockOperationSchema } from "../../lib/inventory/operations.js"
import { openingBalance } from "../../lib/inventory/stock.js"
import { email } from "../../lib/validation.js"

/*
 * Admin view of warehouse fulfilment: staff accounts, the fulfilment board,
 * overrides (with an audit trail), stock and its ledger, and every status
 * change an order went through.
 */

export const adminFulfilmentRoutes = Router()

const actorOf = (req: Request): ActorRef => ({ type: "admin", id: req.admin!.id, name: req.admin!.email })
const requireRole = (req: Request, ...roles: string[]) => {
  if (req.admin!.role !== "owner" && !roles.includes(req.admin!.role)) throw forbidden("Your role can't do this")
}
const audit = (req: Request, action: string, targetCollection: string, targetId: string, diff?: unknown) =>
  db.auditLogs().insertOne({ _id: newId("audit"), adminId: req.admin!.id, adminEmail: req.admin!.email, action, targetCollection, targetId, diff, ip: req.ip, createdAt: new Date() })

/* ---------- Warehouse staff ---------- */

const publicUser = ({ passwordHash: _p, ...u }: WarehouseUserDoc) => u

adminFulfilmentRoutes.get("/warehouse-users", async (req, res) => {
  requireRole(req, "store_admin", "inventory_manager")
  const users = await db.warehouseUsers().find({}, { sort: { name: 1 } }).toArray()
  res.json({ users: users.map(publicUser) })
})

const userSchema = z.object({
  email,
  name: z.string().trim().min(2).max(100),
  role: z.enum(WAREHOUSE_ROLES),
  warehouseIds: z.array(z.string()).min(1).max(50),
  password: z.string().min(10, "Use at least 10 characters").max(200),
})

const checkWarehouses = async (ids: string[]) => {
  const found = await db.warehouses().countDocuments({ _id: { $in: ids } })
  if (found !== new Set(ids).size) throw badRequest("Unknown warehouse")
}

adminFulfilmentRoutes.post("/warehouse-users", async (req, res) => {
  requireRole(req, "store_admin")
  const body = userSchema.parse(req.body)
  await checkWarehouses(body.warehouseIds)
  const now = new Date()
  const doc: WarehouseUserDoc = {
    _id: newId("whu"),
    email: body.email,
    name: body.name,
    role: body.role,
    warehouseIds: [...new Set(body.warehouseIds)],
    passwordHash: await hashPassword(body.password),
    status: "active",
    createdAt: now,
    updatedAt: now,
  }
  await db.warehouseUsers().insertOne(doc)
  await audit(req, "warehouse_user.create", "warehouse_users", doc._id, { role: doc.role, warehouseIds: doc.warehouseIds })
  res.status(201).json({ user: publicUser(doc) })
})

adminFulfilmentRoutes.patch("/warehouse-users/:id", async (req, res) => {
  requireRole(req, "store_admin")
  const body = userSchema.omit({ email: true }).partial().extend({ status: z.enum(["active", "suspended"]).optional() }).parse(req.body)
  if (body.warehouseIds) await checkWarehouses(body.warehouseIds)
  const { password, ...rest } = body
  const set = { ...rest, ...(password ? { passwordHash: await hashPassword(password) } : {}), updatedAt: new Date() }
  const user = await db.warehouseUsers().findOneAndUpdate({ _id: req.params.id }, { $set: set }, { returnDocument: "after" })
  if (!user) throw notFound("Warehouse user")
  await audit(req, "warehouse_user.update", "warehouse_users", user._id, { ...rest, passwordChanged: !!password })
  res.json({ user: publicUser(user) })
})

/* ---------- Fulfilments ---------- */

adminFulfilmentRoutes.get("/fulfilments", async (req, res) => {
  const q = z
    .object({
      warehouseId: z.string().optional(),
      status: z.enum(FULFILMENT_STATUSES).optional(),
      orderId: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(200).default(50),
    })
    .parse(req.query)
  const filter = { ...(q.warehouseId ? { warehouseId: q.warehouseId } : {}), ...(q.status ? { status: q.status } : {}), ...(q.orderId ? { orderId: q.orderId } : {}) }
  const [fulfilments, count, byStatus] = await Promise.all([
    db.fulfilments().find(filter, { sort: { createdAt: -1 }, skip: (q.page - 1) * q.limit, limit: q.limit }).toArray(),
    db.fulfilments().countDocuments(filter),
    db.fulfilments().aggregate<{ _id: string; n: number }>([{ $match: q.warehouseId ? { warehouseId: q.warehouseId } : {} }, { $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
  ])
  res.json({ fulfilments, count, page: q.page, limit: q.limit, byStatus: Object.fromEntries(byStatus.map((b) => [b._id, b.n])) })
})

adminFulfilmentRoutes.get("/fulfilments/:id", async (req, res) => {
  const fulfilment = await db.fulfilments().findOne({ _id: req.params.id })
  if (!fulfilment) throw notFound("Fulfilment")
  const [history, ledger] = await Promise.all([
    db.statusEvents().find({ entityId: fulfilment._id }, { sort: { at: 1 } }).toArray(),
    db.stockLedger().find({ "ref.id": fulfilment._id }, { sort: { createdAt: 1 } }).toArray(),
  ])
  res.json({ fulfilment, history, ledger })
})

/** Override: move an unstarted fulfilment to another warehouse. Audited. */
adminFulfilmentRoutes.post("/fulfilments/:id/reassign", async (req, res) => {
  requireRole(req, "store_admin", "order_manager", "inventory_manager")
  const body = z.object({ warehouseId: z.string(), reason: z.string().trim().min(3).max(300) }).parse(req.body)
  res.json({ fulfilment: await reassignFulfilment(req.params.id, body.warehouseId, actorOf(req), body.reason) })
})

/** Allocates whatever of the order no warehouse holds (every warehouse declined, or stock has arrived since). */
adminFulfilmentRoutes.post("/orders/:id/allocate", async (req, res) => {
  requireRole(req, "store_admin", "order_manager", "inventory_manager")
  const body = z.object({ warehouseId: z.string().optional() }).parse(req.body ?? {})
  const fulfilments = await allocateOutstanding(req.params.id, actorOf(req), body.warehouseId)
  await audit(req, "order.allocate", "orders", req.params.id, { warehouseId: body.warehouseId ?? "auto", fulfilmentIds: fulfilments.map((f) => f._id) })
  res.status(201).json({ fulfilments })
})

/** Every status change of the order, its payment, fulfilments and return, oldest first. */
adminFulfilmentRoutes.get("/orders/:id/history", async (req, res) => {
  const events = await db.statusEvents().find({ orderId: req.params.id }, { sort: { at: 1 } }).toArray()
  res.json({ events })
})

/* ---------- Stock ---------- */

adminFulfilmentRoutes.get("/stock-levels", async (req, res) => {
  const q = z.object({ warehouseId: z.string().optional(), variantId: z.string().optional(), limit: z.coerce.number().int().min(1).max(500).default(200) }).parse(req.query)
  const stock = await db
    .stockLevels()
    .find({ ...(q.warehouseId ? { warehouseId: q.warehouseId } : {}), ...(q.variantId ? { variantId: q.variantId } : {}) }, { sort: { sku: 1 }, limit: q.limit })
    .toArray()
  res.json({ stock })
})

adminFulfilmentRoutes.get("/stock-ledger", async (req, res) => {
  const q = z.object({ warehouseId: z.string().optional(), variantId: z.string().optional(), limit: z.coerce.number().int().min(1).max(500).default(100) }).parse(req.query)
  const entries = await db
    .stockLedger()
    .find({ ...(q.warehouseId ? { warehouseId: q.warehouseId } : {}), ...(q.variantId ? { variantId: q.variantId } : {}) }, { sort: { createdAt: -1 }, limit: q.limit })
    .toArray()
  res.json({ entries })
})

adminFulfilmentRoutes.post("/stock-operations", async (req, res) => {
  requireRole(req, "inventory_manager", "store_admin")
  const op = stockOperationSchema.parse(req.body)
  const result = await runStockOperation(op, actorOf(req))
  await audit(req, `stock.${op.type}`, "stock_levels", op.variantId, op)
  res.status(201).json(result)
})

/**
 * Brings a variant under warehouse management: its current stock becomes the
 * opening balance at one warehouse. From then on its stock changes only
 * through the ledger.
 */
adminFulfilmentRoutes.post("/stock-levels/opening-balance", async (req, res) => {
  requireRole(req, "inventory_manager", "store_admin")
  const body = z.object({ warehouseId: z.string(), variantIds: z.array(z.string()).min(1).max(500) }).parse(req.body)
  const actor = actorOf(req)
  const results = await withTransaction(async (session) => {
    const out: { variantId: string; quantity: number }[] = []
    for (const variantId of body.variantIds) out.push({ variantId, quantity: await openingBalance({ warehouseId: body.warehouseId, variantId, actor }, session) })
    return out
  })
  await audit(req, "stock.opening_balance", "stock_levels", body.warehouseId, results)
  res.status(201).json({ results })
})
