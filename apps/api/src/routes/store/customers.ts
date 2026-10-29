import { Hono } from "hono"
import { z } from "zod"
import { db, type CustomerDoc, type OrderDoc } from "../../db/schema.js"
import { hashPassword, issueToken, rateLimit, requireAuth, verifyPassword } from "../../lib/auth.js"
import { ApiError, conflict, notFound, unauthorized } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { address, email, password } from "../../lib/validation.js"

const LOGIN_LIMIT = { max: 10, windowMs: 15 * 60 * 1000 }

export const toCustomer = (c: CustomerDoc) => ({
  id: c._id,
  email: c.email,
  firstName: c.firstName ?? null,
  lastName: c.lastName ?? null,
  phone: c.phone ?? null,
  addresses: c.addresses.map(({ _id, ...a }) => ({ id: _id, ...a })),
  createdAt: c.createdAt,
})

export const toOrderSummary = (o: OrderDoc) => ({
  id: o._id,
  displayId: o.displayId,
  createdAt: o.createdAt,
  currency: o.currency,
  total: o.totals.total,
  itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
  status: o.status,
  paymentStatus: o.paymentStatus,
  fulfillmentStatus: o.fulfillmentStatus,
  thumbnails: o.items.slice(0, 4).map((i) => i.thumbnail ?? null),
})

const clientKey = (c: { req: { header: (n: string) => string | undefined } }, id: string) =>
  `${c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"}:${id}`

export const customerRoutes = new Hono()

customerRoutes.post("/auth/register", async (c) => {
  const body = z
    .object({ email, password, firstName: z.string().trim().max(100).optional(), lastName: z.string().trim().max(100).optional(), phone: z.string().trim().max(40).optional() })
    .parse(await c.req.json())
  if (!rateLimit(`register:${clientKey(c, body.email)}`, LOGIN_LIMIT.max, LOGIN_LIMIT.windowMs)) {
    throw new ApiError(429, "rate_limited", "Too many attempts. Try again later.")
  }
  const existing = await db.customers().findOne({ email: body.email })
  if (existing?.passwordHash) throw conflict("An account with this email already exists", "email_taken")

  const now = new Date()
  const passwordHash = await hashPassword(body.password)
  const profile = {
    ...(body.firstName ? { firstName: body.firstName } : {}),
    ...(body.lastName ? { lastName: body.lastName } : {}),
    ...(body.phone ? { phone: body.phone } : {}),
  }
  let id: string
  if (existing) {
    // A guest who checked out before now claims their email.
    await db.customers().updateOne({ _id: existing._id }, { $set: { passwordHash, ...profile, updatedAt: now } })
    id = existing._id
  } else {
    id = newId("cus")
    await db.customers().insertOne({ _id: id, email: body.email, passwordHash, ...profile, addresses: [], createdAt: now, updatedAt: now })
  }
  return c.json({ token: await issueToken("customer", id) }, 201)
})

customerRoutes.post("/auth/login", async (c) => {
  const body = z.object({ email, password: z.string().min(1).max(200) }).parse(await c.req.json())
  if (!rateLimit(`login:${clientKey(c, body.email)}`, LOGIN_LIMIT.max, LOGIN_LIMIT.windowMs)) {
    throw new ApiError(429, "rate_limited", "Too many attempts. Try again later.")
  }
  const customer = await db.customers().findOne({ email: body.email })
  // Same message for unknown email and wrong password.
  if (!(await verifyPassword(body.password, customer?.passwordHash)) || !customer) {
    throw unauthorized("Email or password is incorrect")
  }
  return c.json({ token: await issueToken("customer", customer._id) })
})

customerRoutes.use("/customers/me", requireAuth("customer"))
customerRoutes.use("/customers/me/*", requireAuth("customer"))

const me = async (id: string) => {
  const customer = await db.customers().findOne({ _id: id })
  if (!customer) throw unauthorized()
  return customer
}

customerRoutes.get("/customers/me", async (c) => c.json({ customer: toCustomer(await me(c.get("actorId")!)) }))

customerRoutes.patch("/customers/me", async (c) => {
  const body = z
    .object({ firstName: z.string().trim().max(100).optional(), lastName: z.string().trim().max(100).optional(), phone: z.string().trim().max(40).optional() })
    .strict()
    .parse(await c.req.json())
  const id = c.get("actorId")!
  await db.customers().updateOne({ _id: id }, { $set: { ...body, updatedAt: new Date() } })
  return c.json({ customer: toCustomer(await me(id)) })
})

customerRoutes.post("/customers/me/addresses", async (c) => {
  const body = address.parse(await c.req.json())
  const id = c.get("actorId")!
  await db.customers().updateOne({ _id: id }, { $push: { addresses: { _id: newId("addr"), ...body } }, $set: { updatedAt: new Date() } })
  return c.json({ customer: toCustomer(await me(id)) }, 201)
})

customerRoutes.patch("/customers/me/addresses/:addressId", async (c) => {
  const body = address.parse(await c.req.json())
  const id = c.get("actorId")!
  const addressId = c.req.param("addressId")
  const result = await db
    .customers()
    .updateOne({ _id: id, "addresses._id": addressId }, { $set: { "addresses.$": { _id: addressId, ...body }, updatedAt: new Date() } })
  if (!result.matchedCount) throw notFound("Address")
  return c.json({ customer: toCustomer(await me(id)) })
})

customerRoutes.delete("/customers/me/addresses/:addressId", async (c) => {
  const id = c.get("actorId")!
  await db.customers().updateOne({ _id: id }, { $pull: { addresses: { _id: c.req.param("addressId") } }, $set: { updatedAt: new Date() } })
  return c.json({ customer: toCustomer(await me(id)) })
})

customerRoutes.get("/customers/me/orders", async (c) => {
  const orders = await db.orders().find({ customerId: c.get("actorId")! }, { sort: { createdAt: -1 }, limit: 100 }).toArray()
  return c.json({ orders: orders.map(toOrderSummary) })
})
