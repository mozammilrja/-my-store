import { Router, type Request } from "express"
import { z } from "zod"
import { createReturn, recordSelfShip, REASON_TEXT, returnOptions } from "../../lib/returns/returns.js"
import { cancelReturn } from "../../lib/returns/resolve.js"
import { removeSubscription, saveSubscription, subscriptionSchema, vapidPublicKey } from "../../lib/notify/subscriptions.js"
import { db, RETURN_REASONS, type CustomerDoc, type OrderDoc, type ReturnDoc, type SupportTicketDoc, type LoyaltyAccountDoc, type NotificationDoc, type WishlistDoc } from "../../db/schema.js"
import { assetUrl, toStoreOrder, toStoreProduct, toStoreTrackingEvents } from "../../lib/serialize.js"
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

const orderParam = z.string().regex(/^order_[0-9a-z]{16}$/)
const customerActor = (req: Request) => ({ type: "customer" as const, id: req.actorId! })

async function ownOrder(req: Request, id: string) {
  const order = await db.orders().findOne({ _id: orderParam.parse(id), customerId: req.actorId! })
  if (!order) throw notFound("Order")
  return order
}

async function ownReturn(req: Request) {
  const ret = await db.returns().findOne({ _id: String(req.params.id), customerId: req.actorId! })
  if (!ret) throw notFound("Return")
  return ret
}

/** The first return endpoint: a whole-reason request, collected from the door. Kept for older clients. */
customerRoutes.post("/customers/me/orders/:id/returns", async (req, res) => {
  const body = z
    .object({
      reason: z.string().trim().min(1).max(500),
      items: z.array(z.object({ itemId: z.string(), quantity: z.number().int().min(1) })).optional(),
    })
    .parse(req.body)
  const order = await ownOrder(req, String(req.params.id))
  const items = (body.items ?? order.items.map((i) => ({ itemId: i._id, quantity: i.quantity }))).map((l) => ({ ...l, reason: "other" as const, note: body.reason }))
  await createReturn(order, { type: "return", method: "pickup", items }, customerActor(req))
  res.status(201).json({ order: toStoreOrder((await db.orders().findOne({ _id: order._id }))!) })
})

/** What can be sent back on this order: lines with what's left to return, the refund per unit and sizes to exchange for. */
customerRoutes.get("/customers/me/orders/:id/return-options", async (req, res) => {
  const order = await ownOrder(req, String(req.params.id))
  const options = await returnOptions(order)
  res.json({ ...options, items: options.items.map((i) => ({ ...i, thumbnail: i.thumbnail ? assetUrl(i.thumbnail) : null })) })
})

customerRoutes.post("/customers/me/returns", async (req, res) => {
  const body = z
    .object({
      orderId: orderParam,
      type: z.enum(["return", "exchange"]),
      method: z.enum(["pickup", "self_ship"]),
      items: z
        .array(
          z.object({
            itemId: z.string(),
            quantity: z.number().int().min(1).max(100),
            reason: z.enum(RETURN_REASONS),
            note: z.string().trim().max(500).optional(),
            exchangeVariantId: z.string().optional(),
          })
        )
        .min(1)
        .max(50),
    })
    .parse(req.body)
  const order = await ownOrder(req, body.orderId)
  const ret = await createReturn(order, body, customerActor(req))
  res.status(201).json({ return: await toStoreReturn(ret) })
})

customerRoutes.get("/customers/me/returns", async (req, res) => {
  const returns = await db.returns().find({ customerId: req.actorId! }, { sort: { requestedAt: -1 }, limit: 100 }).toArray()
  res.json({ returns: await Promise.all(returns.map(toStoreReturn)) })
})

customerRoutes.get("/customers/me/returns/:id", async (req, res) => {
  res.json({ return: await toStoreReturn(await ownReturn(req)) })
})

customerRoutes.post("/customers/me/returns/:id/cancel", async (req, res) => {
  const ret = await ownReturn(req)
  const { reason } = z.object({ reason: z.string().trim().max(300).optional() }).parse(req.body ?? {})
  res.json({ return: await toStoreReturn(await cancelReturn(ret, customerActor(req), reason || "Cancelled by the customer")) })
})

/** Self-ship: the courier and AWB the customer sent it with. */
customerRoutes.post("/customers/me/returns/:id/ship", async (req, res) => {
  const ret = await ownReturn(req)
  const body = z.object({ carrier: z.string().trim().min(2).max(80), awb: z.string().trim().regex(/^[A-Za-z0-9-]{4,40}$/, "Enter the AWB as printed on the receipt") }).parse(req.body)
  res.json({ return: await toStoreReturn(await recordSelfShip(ret, body, customerActor(req))) })
})

/** A return as its customer sees it: status history, the parcel's journey, refund or replacement. */
async function toStoreReturn(r: ReturnDoc) {
  const [order, events, shipment, refund, exchange] = await Promise.all([
    db.orders().findOne({ _id: r.orderId }, { projection: { items: 1, currency: 1 } }),
    db.statusEvents().find({ entityId: r._id, machine: "return" }, { sort: { at: 1 } }).toArray(),
    r.shipmentId ? db.shipments().findOne({ _id: r.shipmentId }) : null,
    r.resolution?.refundId ? db.refunds().findOne({ _id: r.resolution.refundId }) : null,
    r.resolution?.exchangeOrderId ? db.orders().findOne({ _id: r.resolution.exchangeOrderId }) : null,
  ])
  return {
    id: r._id,
    code: r.code,
    orderId: r.orderId,
    displayId: r.displayId,
    type: r.type,
    status: r.status,
    method: r.method,
    items: r.items.map((l) => {
      const thumb = order?.items.find((i) => i._id === l.itemId)?.thumbnail
      return {
        itemId: l.itemId,
        productTitle: l.productTitle,
        variantTitle: l.variantTitle,
        quantity: l.quantity,
        reason: REASON_TEXT[l.reason],
        note: l.note ?? null,
        exchangeFor: l.exchangeVariantTitle ?? null,
        thumbnail: thumb ? assetUrl(thumb) : null,
      }
    }),
    refundableAmount: r.refundableAmount,
    currency: r.currency,
    requestedAt: r.requestedAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    timeline: events.map((e) => ({ status: e.to, at: e.at.toISOString() })),
    pickup: shipment ? { carrier: shipment.carrier, awb: shipment.awb, status: shipment.status, trackingUrl: shipment.trackingUrl ?? null, events: toStoreTrackingEvents(shipment) } : null,
    selfShip: r.selfShip ? { carrier: r.selfShip.carrier, awb: r.selfShip.awb, at: r.selfShip.at.toISOString() } : null,
    refund: refund ? { amount: refund.amount, status: refund.status, at: refund.updatedAt.toISOString() } : null,
    exchangeOrder: exchange ? { id: exchange._id, displayId: exchange.displayId, fulfillmentStatus: exchange.fulfillmentStatus, awb: exchange.shipment?.awb || null } : null,
    rejectionReason: r.rejectionReason ?? null,
    canCancel: ["requested", "approved", "pickup_scheduled"].includes(r.status),
    canAddShipping: r.method === "self_ship" && r.status === "approved",
  }
}

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

/** The public VAPID key the storefront subscribes with (null when web push isn't set up). */
customerRoutes.get("/push/key", (_req, res) => {
  res.json({ publicKey: vapidPublicKey() })
})

customerRoutes.post("/customers/me/push-subscriptions", async (req, res) => {
  await saveSubscription("customer", req.actorId!, subscriptionSchema.parse(req.body), req.get("user-agent"))
  res.status(201).json({ subscribed: true })
})

customerRoutes.delete("/customers/me/push-subscriptions", async (req, res) => {
  await removeSubscription("customer", req.actorId!, z.object({ endpoint: z.string().optional(), token: z.string().optional() }).parse(req.body ?? {}))
  res.json({ subscribed: false })
})

const DEFAULT_PREFS = { email: true, sms: true, whatsapp: false, push: true }

customerRoutes.get("/customers/me/notification-preferences", async (req, res) => {
  const c = await db.customers().findOne({ _id: req.actorId! }, { projection: { notificationPrefs: 1 } })
  const devices = await db.pushSubscriptions().countDocuments({ ownerType: "customer", ownerId: req.actorId! })
  res.json({ preferences: { ...DEFAULT_PREFS, ...(c?.notificationPrefs ?? {}) }, pushDevices: devices })
})

/** Order and delivery updates only (no marketing). WhatsApp is off until the customer opts in here. */
customerRoutes.patch("/customers/me/notification-preferences", async (req, res) => {
  const body = z.object({ email: z.boolean(), sms: z.boolean(), whatsapp: z.boolean(), push: z.boolean() }).partial().parse(req.body)
  const c = await db.customers().findOne({ _id: req.actorId! }, { projection: { notificationPrefs: 1 } })
  const next = { ...DEFAULT_PREFS, ...(c?.notificationPrefs ?? {}), ...body }
  if (body.whatsapp && !c?.notificationPrefs?.whatsapp) next.whatsappOptInAt = new Date()
  await db.customers().updateOne({ _id: req.actorId! }, { $set: { notificationPrefs: next, updatedAt: new Date() } })
  const { whatsappOptInAt: _w, ...preferences } = next
  res.json({ preferences })
})

customerRoutes.get("/customers/me/notifications", async (req, res) => {
  const customerId = req.actorId!
  const notifications = await db
    .notifications()
    .find({ recipientId: customerId }, { sort: { createdAt: -1 }, limit: 50 })
    .toArray()
  res.json({ notifications })
})

customerRoutes.post("/customers/me/notifications/read-all", async (req, res) => {
  const r = await db.notifications().updateMany({ recipientId: req.actorId!, status: "unread" }, { $set: { status: "read" } })
  res.json({ updated: r.modifiedCount })
})

customerRoutes.post("/customers/me/notifications/:id/read", async (req, res) => {
  await db.notifications().updateOne(
    { _id: req.params.id, recipientId: req.actorId! },
    { $set: { status: "read" } }
  )
  res.json({ success: true })
})
