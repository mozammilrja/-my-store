import { Router } from "express"
import type { Filter } from "mongodb"
import { z } from "zod"
import { withTransaction } from "../../db/client.js"
import { getOperatingRegion } from "../../lib/operating-region.js"
import { db, type OrderDoc } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../../lib/errors.js"
import { assetUrl } from "../../lib/serialize.js"
import { getSettings } from "./settings.js"

const page = z.coerce.number().int().min(1).max(1000).default(1)
const limit = z.coerce.number().int().min(1).max(100).default(25)

export const toAdminOrder = (o: OrderDoc) => ({
  id: o._id,
  displayId: o.displayId,
  email: o.email,
  customerId: o.customerId ?? null,
  currency: o.currency,
  regionId: o.regionId,
  items: o.items.map((i) => ({
    id: i._id,
    productId: i.productId,
    variantId: i.variantId,
    productTitle: i.productTitle,
    productHandle: i.productHandle,
    variantTitle: i.variantTitle,
    thumbnail: i.thumbnail ? assetUrl(i.thumbnail) : null,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    total: i.unitPrice * i.quantity,
  })),
  shippingAddress: o.shippingAddress,
  billingAddress: o.billingAddress,
  shippingOption: { id: o.shippingOption._id, name: o.shippingOption.name, amount: o.shippingOption.amount },
  promoCodes: o.promoCodes,
  totals: o.totals,
  paymentMethod: o.paymentMethod,
  paymentStatus: o.paymentStatus,
  /**
   * What the gateway reported, which the reconciliation screen reads to show a
   * reference and a paid date. It was never sent, so every row read back as
   * "Not recorded" and "Not paid" regardless of its status. The Razorpay
   * signature and intent ids stay on the server: they are credentials for
   * verifying a callback, not facts an operator needs.
   */
  paymentDetails: o.paymentDetails
    ? {
        provider: o.paymentDetails.provider,
        transactionId: o.paymentDetails.transactionId ?? null,
        paidAt: o.paymentDetails.paidAt ?? null,
        failureReason: o.paymentDetails.failureReason ?? null,
        refunds: (o.paymentDetails.refunds ?? []).map((r) => ({
          id: r.id,
          amount: r.amount,
          reason: r.reason,
          createdAt: r.createdAt,
        })),
      }
    : null,
  fulfillmentStatus: o.fulfillmentStatus,
  // The reverse-logistics queue is built from this. It was never sent, so the
  // admin could not tell a requested return from a refunded one.
  returnRequest: o.returnRequest ?? null,
  status: o.status,
  createdAt: o.createdAt,
  updatedAt: o.updatedAt,
})

export const adminOrderRoutes = Router()

/** Day boundaries follow the operating region, not the server's locale. */
const TIMEZONE = "Asia/Kolkata"

adminOrderRoutes.get("/me", (req, res) => {
  res.json({ admin: req.admin })
})

/**
 * Headline numbers for the dashboard: last 30 days, plus what needs attention.
 *
 * Revenue is scoped to the one region the store trades in. It used to be
 * grouped by currency and returned as a list, which made the dashboard a
 * side-by-side comparison of regions the business no longer operates.
 * Historical orders in other currencies stay in the database and in the order
 * lists; they are simply not added to this period's takings.
 */
adminOrderRoutes.get("/dashboard", async (_req, res) => {
  const { lowStockThreshold: LOW_STOCK } = await getSettings()
  const region = await getOperatingRegion()
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const live = { status: { $ne: "canceled" as const }, currency: region.currency }
  const [byCurrency, daily, toShip, toCollect, recent, lowStock, customers] = await Promise.all([
    db
      .orders()
      .aggregate<{ _id: null; revenue: number; orders: number }>([
        { $match: { ...live, createdAt: { $gte: since } } },
        { $group: { _id: null, revenue: { $sum: "$totals.total" }, orders: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .orders()
      .aggregate<{ _id: string; revenue: number; orders: number }>([
        { $match: { ...live, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TIMEZONE } },
            revenue: { $sum: "$totals.total" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    db.orders().countDocuments({ ...live, fulfillmentStatus: "unfulfilled" }),
    db.orders().countDocuments({ ...live, paymentStatus: "awaiting" }),
    db.orders().find({ currency: region.currency }, { sort: { createdAt: -1 }, limit: 8 }).toArray(),
    db
      .products()
      .aggregate<{ productId: string; title: string; handle: string; variantId: string; variantTitle: string; stock: number }>([
        { $unwind: "$variants" },
        { $match: { "variants.manageInventory": true, "variants.allowBackorder": false, "variants.stock": { $lte: LOW_STOCK } } },
        { $sort: { "variants.stock": 1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            productId: "$_id",
            title: 1,
            handle: 1,
            variantId: "$variants._id",
            variantTitle: "$variants.title",
            stock: "$variants.stock",
          },
        },
      ])
      .toArray(),
    db.customers().countDocuments({ passwordHash: { $exists: true } }),
  ])

  res.json({
    periodDays: 30,
    region: { id: region._id, name: region.name, currency: region.currency },
    currency: region.currency,
    revenue: { total: byCurrency[0]?.revenue ?? 0, orders: byCurrency[0]?.orders ?? 0 },
    daily: daily.map((d) => ({ day: d._id, total: d.revenue, orders: d.orders })),
    attention: { toShip, toCollect, lowStock: lowStock.length },
    lowStock,
    recentOrders: recent.map(toAdminOrder),
    customers,
    lowStockThreshold: LOW_STOCK,
  })
})

adminOrderRoutes.get("/orders", async (req, res) => {
  const q = z
    .object({
      q: z.string().trim().max(100).optional(),
      status: z.enum(["pending", "completed", "canceled"]).optional(),
      payment: z.enum(["awaiting", "paid", "refunded"]).optional(),
      fulfillment: z.enum(["unfulfilled", "shipped", "delivered", "returned"]).optional(),
      /** Inclusive placed-at bounds, so a client can ask for one period instead of paging to it. */
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      page,
      limit,
    })
    .parse(req.query)
  if (q.from && q.to && q.from > q.to) throw badRequest("`from` is after `to`")
  const filter: Filter<OrderDoc> = {}
  if (q.status) filter.status = q.status
  if (q.payment) filter.paymentStatus = q.payment
  if (q.fulfillment) filter.fulfillmentStatus = q.fulfillment
  if (q.from || q.to) {
    filter.createdAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) }
  }
  if (q.q) {
    const number = Number(q.q.replace(/^#/, ""))
    const escaped = q.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    filter.$or = [
      ...(Number.isInteger(number) ? [{ displayId: number }] : []),
      { email: { $regex: escaped, $options: "i" } },
      { "shippingAddress.lastName": { $regex: escaped, $options: "i" } },
    ]
  }
  const [orders, count] = await Promise.all([
    db.orders().find(filter, { sort: { createdAt: -1 }, skip: (q.page - 1) * q.limit, limit: q.limit }).toArray(),
    db.orders().countDocuments(filter),
  ])
  res.json({ orders: orders.map(toAdminOrder), count, page: q.page, pages: Math.max(1, Math.ceil(count / q.limit)) })
})

adminOrderRoutes.get("/orders/:id", async (req, res) => {
  const order = await db.orders().findOne({ _id: req.params.id })
  if (!order) throw notFound("Order")
  res.json({ order: toAdminOrder(order) })
})

/** Allowed next states. Anything else is refused so the record stays coherent. */
const FULFILLMENT_NEXT: Record<OrderDoc["fulfillmentStatus"], OrderDoc["fulfillmentStatus"][]> = {
  unfulfilled: ["shipped"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  returned: [],
}
const PAYMENT_NEXT: Record<OrderDoc["paymentStatus"], OrderDoc["paymentStatus"][]> = {
  awaiting: ["paid"],
  paid: ["refunded"],
  refunded: [],
}

adminOrderRoutes.post("/orders/:id/status", async (req, res) => {
  const body = z
    .object({
      fulfillmentStatus: z.enum(["shipped", "delivered", "returned"]).optional(),
      paymentStatus: z.enum(["paid", "refunded"]).optional(),
    })
    .refine((b) => b.fulfillmentStatus || b.paymentStatus, "Nothing to change")
    .parse(req.body)
  const order = await db.orders().findOne({ _id: req.params.id })
  if (!order) throw notFound("Order")
  if (order.status === "canceled") throw conflict("This order is canceled", "order_canceled")
  if (body.fulfillmentStatus && !FULFILLMENT_NEXT[order.fulfillmentStatus].includes(body.fulfillmentStatus)) {
    throw badRequest(`Can't go from ${order.fulfillmentStatus} to ${body.fulfillmentStatus}`, "invalid_transition")
  }
  if (body.paymentStatus && !PAYMENT_NEXT[order.paymentStatus].includes(body.paymentStatus)) {
    throw badRequest(`Can't go from ${order.paymentStatus} to ${body.paymentStatus}`, "invalid_transition")
  }
  const next = {
    fulfillmentStatus: body.fulfillmentStatus ?? order.fulfillmentStatus,
    paymentStatus: body.paymentStatus ?? order.paymentStatus,
  }
  const status: OrderDoc["status"] = next.fulfillmentStatus === "delivered" && next.paymentStatus === "paid" ? "completed" : order.status
  // Conditional on the state we read, so two admins can't apply conflicting changes.
  const result = await db.orders().updateOne(
    { _id: order._id, fulfillmentStatus: order.fulfillmentStatus, paymentStatus: order.paymentStatus },
    { $set: { ...next, status, updatedAt: new Date() } }
  )
  if (!result.matchedCount) throw conflict("The order changed meanwhile. Reload and try again.", "stale")
  res.json({ order: toAdminOrder((await db.orders().findOne({ _id: order._id }))!) })
})

/** Cancels an order and puts its items back in stock, in one transaction. */
adminOrderRoutes.post("/orders/:id/cancel", async (req, res) => {
  const id = req.params.id
  const order = await withTransaction(async (session) => {
    const o = await db.orders().findOne({ _id: id }, { session })
    if (!o) throw notFound("Order")
    if (o.status === "canceled") throw conflict("Already canceled", "order_canceled")
    if (o.fulfillmentStatus !== "unfulfilled") throw conflict("Shipped orders can't be canceled; mark them returned instead", "already_shipped")
    if (o.paymentStatus === "paid") throw conflict("Refund the payment before canceling", "paid")
    for (const item of o.items) {
      await db.products().updateOne(
        { _id: item.productId },
        { $inc: { "variants.$[v].stock": item.quantity } },
        { arrayFilters: [{ "v._id": item.variantId, "v.manageInventory": true }], session }
      )
    }
    await db.orders().updateOne({ _id: o._id }, { $set: { status: "canceled", updatedAt: new Date() } }, { session })
    return (await db.orders().findOne({ _id: o._id }, { session }))!
  })
  res.json({ order: toAdminOrder(order) })
})
