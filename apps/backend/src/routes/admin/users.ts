import { Router } from "express"
import { z } from "zod"
import { db, type AdminUserDoc } from "../../db/schema.js"
import { hashPassword } from "../../lib/auth.js"
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { email } from "../../lib/validation.js"

export const adminUserRoutes = Router()

const toAdminUser = (u: AdminUserDoc) => ({
  id: u._id,
  email: u.email,
  name: u.name ?? null,
  role: u.role,
  createdAt: u.createdAt,
})

/** Only an owner may change who can sign in, or what they may do. */
const requireOwner = (role: "owner" | "staff") => {
  if (role !== "owner") throw forbidden("Only an owner can manage users")
}

/** Refuses to leave the store with no owner, whatever the request says. */
const assertAnotherOwnerExists = async (exceptId: string) => {
  const owners = await db.adminUsers().countDocuments({ role: "owner", _id: { $ne: exceptId } })
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
      role: z.enum(["owner", "staff"]).default("staff"),
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
  res.status(201).json({ user: toAdminUser(doc) })
})

adminUserRoutes.patch("/users/:id", async (req, res) => {
  requireOwner(req.admin!.role)

  const body = z
    .object({
      name: z.string().trim().min(1).max(100).optional(),
      role: z.enum(["owner", "staff"]).optional(),
      password: z.string().min(12).max(200).optional(),
    })
    .strict()
    .parse(req.body)

  const target = await db.adminUsers().findOne({ _id: req.params.id })
  if (!target) throw notFound("Admin")

  if (body.role === "staff" && target.role === "owner") await assertAnotherOwnerExists(target._id)

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
  res.json({ user: toAdminUser(result!) })
})

adminUserRoutes.delete("/users/:id", async (req, res) => {
  requireOwner(req.admin!.role)

  // Signing yourself out of your own dashboard is never what was meant.
  if (req.params.id === req.admin!.id) throw conflict("You cannot delete your own account", "self")

  const target = await db.adminUsers().findOne({ _id: req.params.id })
  if (!target) throw notFound("Admin")
  if (target.role === "owner") await assertAnotherOwnerExists(target._id)

  await db.adminUsers().deleteOne({ _id: target._id })
  res.json({ deleted: true })
})
