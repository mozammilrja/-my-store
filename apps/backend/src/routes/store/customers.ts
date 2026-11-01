import { Router } from "express"
import { z } from "zod"
import { db, type CustomerDoc, type OrderDoc } from "../../db/schema.js"
import { assetUrl, toStoreOrder } from "../../lib/serialize.js"
import { clientKey, hashPassword, issueToken, rateLimit, requireAuth, verifyPassword } from "../../lib/auth.js"
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
  paymentMethod: o.paymentMethod,
  paymentStatus: o.paymentStatus,
  fulfillmentStatus: o.fulfillmentStatus,
  shipment: o.shipment
    ? {
        carrier: o.shipment.carrier,
        awb: o.shipment.awb,
        status: o.shipment.status,
        labelUrl: o.shipment.labelUrl,
        pickupScheduledAt: o.shipment.pickupScheduledAt?.toISOString(),
        estimatedDelivery: o.shipment.estimatedDelivery?.toISOString(),
      }
    : undefined,
  returnRequest: o.returnRequest
    ? {
        status: o.returnRequest.status,
        reason: o.returnRequest.reason,
        items: o.returnRequest.items,
        returnAwb: o.returnRequest.returnAwb,
        carrier: o.returnRequest.carrier,
        requestedAt: o.returnRequest.requestedAt?.toISOString(),
      }
    : undefined,
  items: o.items.map((i) => ({
    id: i._id,
    productTitle: i.productTitle,
    productHandle: i.productHandle,
    variantTitle: i.variantTitle,
    thumbnail: i.thumbnail ? assetUrl(i.thumbnail) : null,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    total: i.unitPrice * i.quantity,
  })),
  thumbnails: o.items.slice(0, 4).map((i) => (i.thumbnail ? assetUrl(i.thumbnail) : null)),
})

export const customerRoutes = Router()

customerRoutes.post("/auth/register", async (req, res) => {
  const body = z
    .object({ email, password, firstName: z.string().trim().max(100).optional(), lastName: z.string().trim().max(100).optional(), phone: z.string().trim().max(40).optional() })
    .parse(req.body)
  if (!rateLimit(`register:${clientKey(req, body.email)}`, LOGIN_LIMIT.max, LOGIN_LIMIT.windowMs)) {
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
  res.status(201).json({ token: issueToken("customer", id) })
})

customerRoutes.post("/auth/login", async (req, res) => {
  const body = z.object({ email, password: z.string().min(1).max(200) }).parse(req.body)
  if (!rateLimit(`login:${clientKey(req, body.email)}`, LOGIN_LIMIT.max, LOGIN_LIMIT.windowMs)) {
    throw new ApiError(429, "rate_limited", "Too many attempts. Try again later.")
  }
  const customer = await db.customers().findOne({ email: body.email })
  // Same message for unknown email and wrong password.
  if (!(await verifyPassword(body.password, customer?.passwordHash)) || !customer) {
    throw unauthorized("Email or password is incorrect")
  }
  res.json({ token: issueToken("customer", customer._id) })
})

customerRoutes.use("/customers/me", requireAuth("customer"))

const me = async (id: string) => {
  const customer = await db.customers().findOne({ _id: id })
  if (!customer) throw unauthorized()
  return customer
}

customerRoutes.get("/customers/me", async (req, res) => {
  res.json({ customer: toCustomer(await me(req.actorId!)) })
})

customerRoutes.patch("/customers/me", async (req, res) => {
  const body = z
    .object({ firstName: z.string().trim().max(100).optional(), lastName: z.string().trim().max(100).optional(), phone: z.string().trim().max(40).optional() })
    .strict()
    .parse(req.body)
  const id = req.actorId!
  await db.customers().updateOne({ _id: id }, { $set: { ...body, updatedAt: new Date() } })
  res.json({ customer: toCustomer(await me(id)) })
})

customerRoutes.post("/customers/me/addresses", async (req, res) => {
  const body = address.parse(req.body)
  const id = req.actorId!
  await db.customers().updateOne({ _id: id }, { $push: { addresses: { _id: newId("addr"), ...body } }, $set: { updatedAt: new Date() } })
  res.status(201).json({ customer: toCustomer(await me(id)) })
})

customerRoutes.patch("/customers/me/addresses/:addressId", async (req, res) => {
  const body = address.parse(req.body)
  const id = req.actorId!
  const addressId = req.params.addressId
  const result = await db
    .customers()
    .updateOne({ _id: id, "addresses._id": addressId }, { $set: { "addresses.$": { _id: addressId, ...body }, updatedAt: new Date() } })
  if (!result.matchedCount) throw notFound("Address")
  res.json({ customer: toCustomer(await me(id)) })
})

customerRoutes.delete("/customers/me/addresses/:addressId", async (req, res) => {
  const id = req.actorId!
  await db.customers().updateOne({ _id: id }, { $pull: { addresses: { _id: req.params.addressId } }, $set: { updatedAt: new Date() } })
  res.json({ customer: toCustomer(await me(id)) })
})

customerRoutes.get("/customers/me/orders", async (req, res) => {
  const orders = await db.orders().find({ customerId: req.actorId! }, { sort: { createdAt: -1 }, limit: 100 }).toArray()
  res.json({ orders: orders.map(toOrderSummary) })
})

customerRoutes.post("/customers/me/orders/:id/returns", async (req, res) => {
  const orderId = z.string().regex(/^order_[0-9a-z]{16}$/).parse(req.params.id)
  const body = z
    .object({
      reason: z.string().trim().min(1).max(500),
      items: z.array(z.object({ itemId: z.string(), quantity: z.number().int().min(1) })).optional(),
    })
    .parse(req.body)

  const order = await db.orders().findOne({ _id: orderId, customerId: req.actorId! })
  if (!order) throw notFound("Order")

  const now = new Date()
  const returnRequest = {
    status: "requested" as const,
    reason: body.reason,
    items: body.items ?? order.items.map((i) => ({ itemId: i._id, quantity: i.quantity })),
    requestedAt: now,
    updatedAt: now,
  }

  await db.orders().updateOne({ _id: orderId }, { $set: { returnRequest, updatedAt: now } })
  const updated = await db.orders().findOne({ _id: orderId })
  res.status(201).json({ order: toStoreOrder(updated!) })
})
