import { Router } from "express"
import { z } from "zod"
import { db } from "../../db/schema.js"
import { badRequest } from "../../lib/errors.js"
import { getOperatingRegion } from "../../lib/operating-region.js"

export const adminAnalyticsRoutes = Router()

/** Day boundaries follow the operating region, not the server's locale. */
const TIMEZONE = "Asia/Kolkata"

/**
 * Analytics over a date range, computed in the database.
 *
 * Every figure here is an aggregation over real orders, products, customers
 * and the operational collections. Nothing is estimated and nothing is
 * returned that the records cannot support: where a number would have to be
 * guessed, the field is absent and the admin says the metric is unavailable.
 *
 * Money is in minor units of the operating region's currency, and only orders
 * placed in that currency are counted, so totals are never a mix of currencies.
 *
 * Definitions, which the admin repeats to the operator:
 *   grossSales   sum of item subtotals, before discount, tax and shipping
 *   discounts    sum of discount totals
 *   tax          sum of tax totals
 *   shipping     sum of shipping totals
 *   refunds      order totals of orders whose payment ended up refunded
 *   netSales     grossSales - discounts - refunds
 *   orders       orders placed, excluding cancelled
 *   units        item quantities across those orders
 *   aov          order total divided by order count
 * Cancelled orders are excluded from every revenue figure and counted on their
 * own, so they are never double counted against refunds.
 */

const dateRange = z
  .object({
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    compare: z.enum(["previous", "none"]).default("none"),
  })
  .strict()

const DAY_MS = 24 * 60 * 60 * 1000

/** Totals for one window of orders. */
async function windowTotals(currency: string, from: Date, to: Date) {
  const inWindow = { currency, createdAt: { $gte: from, $lte: to } }
  const live = { ...inWindow, status: { $ne: "canceled" as const } }

  const [totals, unitRows, cancelled, refunded, customerRows] = await Promise.all([
    db
      .orders()
      .aggregate<{
        _id: null
        grossSales: number
        discounts: number
        tax: number
        shipping: number
        total: number
        orders: number
      }>([
        { $match: live },
        {
          $group: {
            _id: null,
            grossSales: { $sum: "$totals.itemSubtotal" },
            discounts: { $sum: "$totals.discountTotal" },
            tax: { $sum: "$totals.taxTotal" },
            shipping: { $sum: "$totals.shippingTotal" },
            total: { $sum: "$totals.total" },
            orders: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    db
      .orders()
      .aggregate<{ _id: null; units: number }>([
        { $match: live },
        { $unwind: "$items" },
        { $group: { _id: null, units: { $sum: "$items.quantity" } } },
      ])
      .toArray(),
    db.orders().countDocuments({ ...inWindow, status: "canceled" }),
    db
      .orders()
      .aggregate<{ _id: null; amount: number; count: number }>([
        { $match: { ...live, paymentStatus: "refunded" } },
        { $group: { _id: null, amount: { $sum: "$totals.total" }, count: { $sum: 1 } } },
      ])
      .toArray(),
    // A customer counts as returning when they placed an order before this
    // window opened. Guest orders carry no customerId and are counted apart.
    db
      .orders()
      .aggregate<{ _id: string | null; firstOrder: Date }>([
        { $match: { currency, status: { $ne: "canceled" as const }, customerId: { $ne: null } } },
        { $group: { _id: "$customerId", firstOrder: { $min: "$createdAt" } } },
      ])
      .toArray(),
  ])

  const t = totals[0]
  const grossSales = t?.grossSales ?? 0
  const discounts = t?.discounts ?? 0
  const refunds = refunded[0]?.amount ?? 0
  const orders = t?.orders ?? 0

  const customersInWindow = new Set<string>()
  let newCustomers = 0
  for (const row of customerRows) {
    if (!row._id) continue
    if (row.firstOrder >= from && row.firstOrder <= to) {
      newCustomers += 1
      customersInWindow.add(row._id)
    }
  }
  const orderingCustomers = await db
    .orders()
    .distinct("customerId", { ...live, customerId: { $ne: null } })
  const activeCustomers = orderingCustomers.filter(Boolean).length

  return {
    grossSales,
    discounts,
    tax: t?.tax ?? 0,
    shipping: t?.shipping ?? 0,
    refunds,
    refundedOrders: refunded[0]?.count ?? 0,
    netSales: grossSales - discounts - refunds,
    total: t?.total ?? 0,
    orders,
    cancelledOrders: cancelled,
    units: unitRows[0]?.units ?? 0,
    aov: orders > 0 ? Math.round((t?.total ?? 0) / orders) : null,
    activeCustomers,
    newCustomers,
    returningCustomers: Math.max(0, activeCustomers - newCustomers),
  }
}

adminAnalyticsRoutes.get("/analytics", async (req, res) => {
  const query = dateRange.parse(req.query)
  const region = await getOperatingRegion()

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 29 * DAY_MS)
  if (from > to) throw badRequest("The start of the range is after its end", "invalid_range")

  const currency = region.currency
  const inWindow = { currency, createdAt: { $gte: from, $lte: to } }
  const live = { ...inWindow, status: { $ne: "canceled" as const } }

  const [
    current,
    previous,
    daily,
    byStatus,
    byPayment,
    byMethod,
    topProducts,
    byCategory,
    returnsByReason,
    shipmentsByStatus,
    promotionUse,
    invoiceTotals,
    lowStock,
    supplierSpend,
  ] = await Promise.all([
    windowTotals(currency, from, to),
    query.compare === "previous"
      ? windowTotals(
          currency,
          new Date(from.getTime() - (to.getTime() - from.getTime()) - DAY_MS),
          new Date(from.getTime() - 1)
        )
      : Promise.resolve(null),

    db
      .orders()
      .aggregate<{ _id: string; revenue: number; orders: number; units: number }>([
        { $match: live },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TIMEZONE } },
            revenue: { $sum: "$totals.total" },
            orders: { $sum: 1 },
            units: { $sum: { $sum: "$items.quantity" } },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),

    db
      .orders()
      .aggregate<{ _id: string; count: number }>([
        { $match: inWindow },
        { $group: { _id: "$fulfillmentStatus", count: { $sum: 1 } } },
      ])
      .toArray(),

    db
      .orders()
      .aggregate<{ _id: string; count: number; amount: number }>([
        { $match: inWindow },
        { $group: { _id: "$paymentStatus", count: { $sum: 1 }, amount: { $sum: "$totals.total" } } },
      ])
      .toArray(),

    db
      .orders()
      .aggregate<{ _id: string; count: number; amount: number }>([
        { $match: live },
        { $group: { _id: "$paymentMethod", count: { $sum: 1 }, amount: { $sum: "$totals.total" } } },
      ])
      .toArray(),

    db
      .orders()
      .aggregate<{ _id: string; title: string; units: number; revenue: number; orders: number }>([
        { $match: live },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            title: { $first: "$items.productTitle" },
            units: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
            orders: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 20 },
      ])
      .toArray(),

    // Category performance joins each sold line back to its product's categories.
    db
      .orders()
      .aggregate<{ _id: string; units: number; revenue: number }>([
        { $match: live },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$product.categoryIds", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$product.categoryIds",
            units: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 15 },
      ])
      .toArray(),

    db
      .orders()
      .aggregate<{ _id: string; count: number }>([
        { $match: { ...inWindow, returnRequest: { $exists: true } } },
        { $group: { _id: "$returnRequest.reason", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),

    db
      .shipments()
      .aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray(),

    db
      .promotions()
      .aggregate<{ _id: string; code: string; usageCount: number; usageLimit: number | null; active: boolean }>([
        { $project: { code: 1, usageCount: 1, usageLimit: 1, active: 1 } },
        { $sort: { usageCount: -1 } },
        { $limit: 15 },
      ])
      .toArray(),

    db
      .invoices()
      .aggregate<{ _id: string; count: number; taxable: number; cgst: number; sgst: number; igst: number; grand: number }>([
        { $match: { issuedAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            taxable: { $sum: "$subtotal" },
            cgst: { $sum: "$cgstTotal" },
            sgst: { $sum: "$sgstTotal" },
            igst: { $sum: "$igstTotal" },
            grand: { $sum: "$grandTotal" },
          },
        },
      ])
      .toArray(),

    db
      .products()
      .aggregate<{ _id: null; count: number }>([
        { $unwind: "$variants" },
        {
          $match: {
            "variants.manageInventory": true,
            "variants.allowBackorder": false,
            "variants.stock": { $lte: 5 },
          },
        },
        { $group: { _id: null, count: { $sum: 1 } } },
      ])
      .toArray(),

    db
      .purchaseOrders()
      .aggregate<{ _id: string; count: number; amount: number }>([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$totalAmount" } } },
      ])
      .toArray(),
  ])

  // Category ids become names only where the category still exists.
  const categoryIds = byCategory.map((c) => c._id).filter(Boolean)
  const categories = categoryIds.length
    ? await db.categories().find({ _id: { $in: categoryIds } }).toArray()
    : []
  const categoryName = new Map(categories.map((c) => [c._id, c.name]))

  const returnRate =
    current.orders > 0 ? Number(((current.refundedOrders / current.orders) * 100).toFixed(2)) : null

  res.json({
    range: { from: from.toISOString(), to: to.toISOString(), timezone: TIMEZONE },
    region: { id: region._id, name: region.name, currency },
    currency,
    totals: { ...current, returnRate },
    previous,
    daily: daily.map((d) => ({ day: d._id, revenue: d.revenue, orders: d.orders, units: d.units })),
    orderStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
    paymentStatus: byPayment.map((s) => ({ status: s._id, count: s.count, amount: s.amount })),
    paymentMethods: byMethod.map((s) => ({ method: s._id, count: s.count, amount: s.amount })),
    topProducts: topProducts.map((p) => ({
      productId: p._id,
      title: p.title,
      units: p.units,
      revenue: p.revenue,
      orders: p.orders,
    })),
    categories: byCategory
      .filter((c) => c._id)
      .map((c) => ({
        categoryId: c._id,
        name: categoryName.get(c._id) ?? "Uncategorised",
        units: c.units,
        revenue: c.revenue,
      })),
    returnReasons: returnsByReason.map((r) => ({ reason: r._id ?? "Not given", count: r.count })),
    shipments: shipmentsByStatus.map((s) => ({ status: s._id, count: s.count })),
    promotions: promotionUse.map((p) => ({
      code: p.code,
      usageCount: p.usageCount ?? 0,
      usageLimit: p.usageLimit ?? null,
      active: p.active,
    })),
    invoices: invoiceTotals.map((i) => ({
      status: i._id,
      count: i.count,
      taxable: i.taxable,
      cgst: i.cgst,
      sgst: i.sgst,
      igst: i.igst,
      grandTotal: i.grand,
    })),
    lowStockVariants: lowStock[0]?.count ?? 0,
    purchaseOrders: supplierSpend.map((s) => ({ status: s._id, count: s.count, amount: s.amount })),
  })
})
