import { Router, type Request } from "express"
import { z } from "zod"
import { db, type AdminUserDoc, type AdminUserRole } from "../../db/schema.js"
import { audit } from "../../lib/audit.js"
import { hashPassword } from "../../lib/auth.js"
import { revokeSessionsFor } from "../../lib/ops-session.js"
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { email } from "../../lib/validation.js"

export const adminUserRoutes = Router()

const toAdminUser = (u: AdminUserDoc) => ({
  id: u._id,
  email: u.email,
  name: u.name ?? null,
  role: u.role,
  status: u.status ?? "active",
  createdAt: u.createdAt,
})

const auditAdmin = (req: Request, action: string, targetId: string, diff?: unknown) =>
  audit({ realm: "admin", actorId: req.admin!.id, actorEmail: req.admin!.email, action, targetCollection: "admin_users", targetId, diff, ip: req.ip })

/** Only an owner may change who can sign in, or what they may do. */
const requireOwner = (role: AdminUserRole) => {
  if (role !== "owner") throw forbidden("Only an owner can manage users")
}

const adminRoleEnum = z.enum([
  "owner",
  "staff",
  "store_admin",
  "catalog_manager",
  "inventory_manager",
  "order_manager",
  "finance_manager",
  "customer_support",
])

/** Refuses to leave the store with no owner who can sign in, whatever the request says. */
const assertAnotherOwnerExists = async (exceptId: string) => {
  const owners = await db.adminUsers().countDocuments({ role: "owner", status: { $ne: "suspended" }, _id: { $ne: exceptId } })
  if (!owners) throw conflict("The last owner cannot be removed or demoted", "last_owner")
}

adminUserRoutes.get("/users", async (_req, res) => {
  const users = await db.adminUsers().find({}, { sort: { createdAt: 1 } }).toArray()
  res.json({ users: users.map(toAdminUser) })
})

adminUserRoutes.post("/users", async (req, res) => {
  requireOwner(req.admin!.role)

  const body = z
    .object({
      email,
      password: z.string().min(12).max(200),
      name: z.string().trim().min(1).max(100).optional(),
      role: adminRoleEnum.default("staff"),
    })
    .parse(req.body)

  if (await db.adminUsers().findOne({ email: body.email })) {
    throw conflict("An admin with that email already exists", "email_taken")
  }

  const now = new Date()
  const doc: AdminUserDoc = {
    _id: newId("admin"),
    email: body.email,
    passwordHash: await hashPassword(body.password),
    ...(body.name ? { name: body.name } : {}),
    role: body.role,
    createdAt: now,
    updatedAt: now,
  }
  await db.adminUsers().insertOne(doc)
  await auditAdmin(req, "admin_user.create", doc._id, { email: doc.email, role: doc.role })
  res.status(201).json({ user: toAdminUser(doc) })
})

adminUserRoutes.patch("/users/:id", async (req, res) => {
  requireOwner(req.admin!.role)

  const body = z
    .object({
      name: z.string().trim().min(1).max(100).optional(),
      role: adminRoleEnum.optional(),
      password: z.string().min(12).max(200).optional(),
      /** Suspending signs the admin out everywhere at once; reactivating lets them sign in again. */
      status: z.enum(["active", "suspended"]).optional(),
    })
    .strict()
    .parse(req.body)

  const target = await db.adminUsers().findOne({ _id: req.params.id })
  if (!target) throw notFound("Admin")

  if (body.status === "suspended" && target._id === req.admin!.id) throw conflict("You cannot suspend your own account", "self")
  // Demoting or suspending an owner must leave another owner who can sign in.
  if (target.role === "owner" && ((body.role && body.role !== "owner") || body.status === "suspended")) await assertAnotherOwnerExists(target._id)

  const { password, ...rest } = body
  if (!password && !Object.keys(rest).length) throw badRequest("Nothing to change")

  const result = await db.adminUsers().findOneAndUpdate(
    { _id: target._id },
    {
      $set: {
        ...rest,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  )
  // A new password or a suspension ends every sign-in that account has open.
  if (password || body.status === "suspended") await revokeSessionsFor([{ realm: "admin", id: target._id }], body.status === "suspended" ? "suspended" : "password_set_by_owner")
  await auditAdmin(req, body.status === "suspended" ? "admin_user.suspend" : body.status === "active" && target.status === "suspended" ? "admin_user.reactivate" : "admin_user.update", target._id, { ...rest, passwordChanged: !!password })
  res.json({ user: toAdminUser(result!) })
})

/**
 * Signs an operational account out everywhere: portal sessions and bearer
 * tokens. Owners may do it for anyone; store admins for floor staff, riders
 * and sellers.
 */
adminUserRoutes.post("/accounts/:realm/:id/revoke-sessions", async (req, res) => {
  const realm = z.enum(["admin", "warehouse", "rider", "seller"]).parse(req.params.realm)
  const allowed = req.admin!.role === "owner" || (realm !== "admin" && req.admin!.role === "store_admin")
  if (!allowed) throw forbidden("Only an owner, or a store admin for non-admin accounts, can sign an account out")
  const exists =
    realm === "admin"
      ? await db.adminUsers().countDocuments({ _id: req.params.id })
      : realm === "warehouse"
        ? await db.warehouseUsers().countDocuments({ _id: req.params.id })
        : realm === "rider"
          ? await db.riders().countDocuments({ _id: req.params.id })
          : await db.sellers().countDocuments({ _id: req.params.id })
  if (!exists) throw notFound("Account")
  const revoked = await revokeSessionsFor([{ realm, id: req.params.id }], "revoked_by_admin")
  await audit({ realm: "admin", actorId: req.admin!.id, actorEmail: req.admin!.email, action: "account.sessions_revoked", targetCollection: realm === "admin" ? "admin_users" : realm === "warehouse" ? "warehouse_users" : realm === "rider" ? "riders" : "sellers", targetId: req.params.id, diff: { sessions: revoked }, ip: req.ip })
  res.json({ revoked })
})

/** The audit trail, newest first, for owners and store admins. */
adminUserRoutes.get("/audit-logs", async (req, res) => {
  if (!["owner", "store_admin"].includes(req.admin!.role)) throw forbidden("Only an owner or store admin can read the audit log")
  const q = z
    .object({ action: z.string().max(80).optional(), actor: z.string().max(254).optional(), before: z.iso.datetime({ offset: true }).optional(), limit: z.coerce.number().int().min(1).max(200).default(50) })
    .parse(req.query)
  const filter = {
    ...(q.action ? { action: q.action.endsWith(".") ? { $regex: `^${q.action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` } : q.action } : {}),
    ...(q.actor ? { adminEmail: q.actor.toLowerCase() } : {}),
    ...(q.before ? { createdAt: { $lt: new Date(q.before) } } : {}),
  }
  const entries = await db.auditLogs().find(filter, { sort: { createdAt: -1 }, limit: q.limit }).toArray()
  res.json({ entries })
})

adminUserRoutes.delete("/users/:id", async (req, res) => {
  requireOwner(req.admin!.role)

  // Signing yourself out of your own dashboard is never what was meant.
  if (req.params.id === req.admin!.id) throw conflict("You cannot delete your own account", "self")

  const target = await db.adminUsers().findOne({ _id: req.params.id })
  if (!target) throw notFound("Admin")
  if (target.role === "owner") await assertAnotherOwnerExists(target._id)

  await db.adminUsers().deleteOne({ _id: target._id })
  await revokeSessionsFor([{ realm: "admin", id: target._id }], "deleted")
  await auditAdmin(req, "admin_user.delete", target._id, { email: target.email, role: target.role })
  res.json({ deleted: true })
})
