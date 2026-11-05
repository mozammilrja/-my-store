import { Router } from "express"
import { z } from "zod"
import { db, type CustomerDoc, type OrderDoc, type SupportTicketDoc, type LoyaltyAccountDoc, type NotificationDoc, type WishlistDoc } from "../../db/schema.js"
import { assetUrl, toStoreOrder, toStoreProduct } from "../../lib/serialize.js"
import { clientKey, hashPassword, issueToken, rateLimit, requireAuth, verifyPassword } from "../../lib/auth.js"
import { ApiError, badRequest, conflict, notFound, unauthorized } from "../../lib/errors.js"
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
        deliveredAt: o.shipment.deliveredAt?.toISOString(),
        trackingUrl: o.shipment.trackingUrl,
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

/**
 * Makes a saved address the default: it moves to the front of the list, which
 * is the address checkout and the account pages treat as the primary one.
 */
customerRoutes.post("/customers/me/addresses/:addressId/default", async (req, res) => {
  const id = req.actorId!
  const customer = await me(id)
  const chosen = customer.addresses.find((a) => a._id === req.params.addressId)
  if (!chosen) throw notFound("Address")
  const addresses = [chosen, ...customer.addresses.filter((a) => a._id !== chosen._id)]
  await db.customers().updateOne({ _id: id }, { $set: { addresses, updatedAt: new Date() } })
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
  if (order.status === "canceled") throw badRequest("A canceled order can't be returned.", "not_returnable")
  if (order.fulfillmentStatus !== "delivered") throw badRequest("Returns open once the order has been delivered.", "not_returnable")
  // A rejected request may be filed again; any other one is still in progress or done.
  if (order.returnRequest && order.returnRequest.status !== "rejected") {
    throw conflict("A return has already been requested for this order.", "return_exists")
  }
  const region = await db.regions().findOne({ _id: order.regionId })
  const windowDays = region?.policies?.returnWindowDays
  const deliveredAt = order.shipment?.deliveredAt
  if (windowDays !== undefined && deliveredAt && now.getTime() - deliveredAt.getTime() > windowDays * 86_400_000) {
    throw badRequest(`The ${windowDays}-day return window for this order has closed.`, "return_window_closed")
  }

  // Each requested line must be on the order, at most once, within what was bought.
  const lines = new Map(order.items.map((i) => [i._id, i.quantity]))
  const items = body.items ?? order.items.map((i) => ({ itemId: i._id, quantity: i.quantity }))
  if (!items.length) throw badRequest("Choose at least one item to return.")
  const seen = new Set<string>()
  for (const item of items) {
    const bought = lines.get(item.itemId)
    if (bought === undefined || seen.has(item.itemId)) throw badRequest("That item isn't on this order.")
    if (item.quantity > bought) throw badRequest("You can't return more than you bought.")
    seen.add(item.itemId)
  }

  const returnRequest = {
    status: "requested" as const,
    reason: body.reason,
    items,
    requestedAt: now,
    updatedAt: now,
  }

  await db.orders().updateOne({ _id: orderId }, { $set: { returnRequest, updatedAt: now } })
  const updated = await db.orders().findOne({ _id: orderId })
  res.status(201).json({ order: toStoreOrder(updated!) })
})

/* ---------- Wishlist ---------- */

customerRoutes.get("/customers/me/wishlist", async (req, res) => {
  const customerId = req.actorId!
  const wishlist = await db.wishlists().findOne({ customerId })
  const productIds = wishlist?.productIds ?? []
  if (!productIds.length) {
    res.json({ productIds: [], items: [] })
    return
  }
  const products = await db.products().find({ _id: { $in: productIds }, status: "published" }).toArray()
  const defaultRegion = await db.regions().findOne({ currency: "inr" }) ?? (await db.regions().findOne({}))
  const items = defaultRegion ? products.map((p) => toStoreProduct(p, defaultRegion)) : []
  res.json({ productIds, items })
})

customerRoutes.post("/customers/me/wishlist", async (req, res) => {
  const customerId = req.actorId!
  const body = z.object({ productId: z.string().min(1) }).parse(req.body)
  const product = await db.products().findOne({ _id: body.productId, status: "published" })
  if (!product) throw notFound("Product")

  const now = new Date()
  await db.wishlists().updateOne(
    { customerId },
    {
      $addToSet: { productIds: body.productId },
      $setOnInsert: { _id: newId("wish"), customerId, createdAt: now },
      $set: { updatedAt: now },
    },
    { upsert: true }
  )
  const updated = await db.wishlists().findOne({ customerId })
  res.json({ productIds: updated?.productIds ?? [] })
})

customerRoutes.delete("/customers/me/wishlist/:productId", async (req, res) => {
  const customerId = req.actorId!
  await db.wishlists().updateOne(
    { customerId },
    {
      $pull: { productIds: req.params.productId },
      $set: { updatedAt: new Date() },
    }
  )
  const updated = await db.wishlists().findOne({ customerId })
  res.json({ productIds: updated?.productIds ?? [] })
})

/* ---------- Loyalty & Privilege Club ---------- */

customerRoutes.get("/customers/me/loyalty", async (req, res) => {
  const customerId = req.actorId!
  let loyalty = await db.loyaltyAccounts().findOne({ customerId })
  if (!loyalty) {
    const now = new Date()
    loyalty = {
      _id: newId("loyalty"),
      customerId,
      tier: "silver",
      pointsBalance: 250,
      lifetimePoints: 250,
      transactions: [
        {
          _id: newId("ltx"),
          type: "earn",
          points: 250,
          reason: "Welcome to Everwear Privilege Club",
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    }
    await db.loyaltyAccounts().insertOne(loyalty)
  }
  res.json({ loyalty })
})

/* ---------- Support Tickets & Concierge ---------- */

customerRoutes.get("/customers/me/tickets", async (req, res) => {
  const customerId = req.actorId!
  const tickets = await db.supportTickets().find({ customerId }, { sort: { updatedAt: -1 }, limit: 50 }).toArray()
  res.json({ tickets })
})

customerRoutes.post("/customers/me/tickets", async (req, res) => {
  const customerId = req.actorId!
  const customer = await me(customerId)
  const body = z
    .object({
      subject: z.string().trim().min(3).max(200),
      category: z.enum(["order", "refund", "shipping", "general", "exchange"]).default("general"),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      orderId: z.string().optional(),
      message: z.string().trim().min(3).max(2000),
      attachments: z.array(z.string()).optional(),
    })
    .parse(req.body)

  const counter = await db.counters().findOneAndUpdate(
    { _id: "ticket" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  )

  const now = new Date()
  const ticketDoc: SupportTicketDoc = {
    _id: newId("tkt"),
    ticketNumber: `TKT-${now.getFullYear()}-${String(1000 + (counter?.seq ?? 1))}`,
    customerId,
    orderId: body.orderId ?? null,
    subject: body.subject,
    category: body.category,
    priority: body.priority,
    status: "open",
    messages: [
      {
        _id: newId("msg"),
        sender: "customer",
        senderName: `${customer.firstName ?? "Everwear"} ${customer.lastName ?? "Customer"}`.trim(),
        message: body.message,
        attachments: body.attachments,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }

  await db.supportTickets().insertOne(ticketDoc)
  res.status(201).json({ ticket: ticketDoc })
})

customerRoutes.get("/customers/me/tickets/:ticketId", async (req, res) => {
  const ticket = await db.supportTickets().findOne({ _id: req.params.ticketId, customerId: req.actorId! })
  if (!ticket) throw notFound("Support Ticket")
  res.json({ ticket })
})

customerRoutes.post("/customers/me/tickets/:ticketId/messages", async (req, res) => {
  const customerId = req.actorId!
  const customer = await me(customerId)
  const ticket = await db.supportTickets().findOne({ _id: req.params.ticketId, customerId })
  if (!ticket) throw notFound("Support Ticket")

  const body = z
    .object({
      message: z.string().trim().min(1).max(2000),
      attachments: z.array(z.string()).optional(),
    })
    .parse(req.body)

  const now = new Date()
  const newMsg = {
    _id: newId("msg"),
    sender: "customer" as const,
    senderName: `${customer.firstName ?? "Everwear"} ${customer.lastName ?? "Customer"}`.trim(),
    message: body.message,
    attachments: body.attachments,
    createdAt: now,
  }

  await db.supportTickets().updateOne(
    { _id: ticket._id },
    {
      $push: { messages: newMsg },
      $set: { status: ticket.status === "closed" ? "in_progress" : ticket.status, updatedAt: now },
    }
  )

  const updated = await db.supportTickets().findOne({ _id: ticket._id })
  res.status(201).json({ ticket: updated })
})

/* ---------- Notifications ---------- */

customerRoutes.get("/customers/me/notifications", async (req, res) => {
  const customerId = req.actorId!
  const notifications = await db
    .notifications()
    .find({ recipientId: customerId }, { sort: { createdAt: -1 }, limit: 50 })
    .toArray()
  res.json({ notifications })
})

customerRoutes.post("/customers/me/notifications/:id/read", async (req, res) => {
  await db.notifications().updateOne(
    { _id: req.params.id, recipientId: req.actorId! },
    { $set: { status: "read" } }
  )
  res.json({ success: true })
})
