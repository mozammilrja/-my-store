import { Router, type Request } from "express"
import { z } from "zod"
import { db, RETURN_REASONS, RETURN_STATUSES, SHIPMENT_STATUSES, type OrderDoc, type RefundDoc } from "../../db/schema.js"
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { trackedVariants } from "../../lib/inventory/stock.js"
import { createReturn, currentReturn, loadReturn, moveReturn, returnOptions } from "../../lib/returns/returns.js"
import { approveReturn, bookReturnPickup, cancelReturn, exchangeReturn, refundReturn, rejectReturn } from "../../lib/returns/resolve.js"
import { refundOrder } from "../../lib/payments/refunds.js"
import {
  assignCourier,
  cancelShipment,
  createReturnShipment,
  createShipment,
  generateLabel,
  ndrAction,
  recordManualShipment,
  schedulePickup,
  configuredCarriers,
  serviceability,
  syncTracking,
  updateManualShipment,
} from "../../lib/shipping/service.js"
import { assetUrl } from "../../lib/serialize.js"
import { getSettings } from "./settings.js"

export const adminLogisticsRoutes = Router()

/** Money and courier bookings are owner actions; staff can view. */
const requireOwner = (req: Request) => {
  if (req.admin!.role !== "owner") throw forbidden("Only an owner can do this")
}

const loadOrder = async (id: string) => {
  const order = await db.orders().findOne({ _id: id })
  if (!order) throw notFound("Order")
  return order
}

/* ---------- Shipments ---------- */

adminLogisticsRoutes.get("/shipping/status", (_req, res) => {
  res.json({ provider: configuredCarriers()[0] ?? "none", carriers: configuredCarriers() })
})

adminLogisticsRoutes.get("/shipments", async (req, res) => {
  const q = z
    .object({
      status: z.enum(SHIPMENT_STATUSES).optional(),
      returns: z.enum(["true", "false"]).optional(),
      ndr: z.enum(["true"]).optional(),
    })
    .parse(req.query)
  const filter = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.returns ? { isReturn: q.returns === "true" } : {}),
    ...(q.ndr ? { status: "delivery_failed" as const } : {}),
  }
  const shipments = await db.shipments().find(filter, { sort: { createdAt: -1 }, limit: 200 }).toArray()
  res.json({ shipments, provider: configuredCarriers()[0] ?? "none", carriers: configuredCarriers() })
})

adminLogisticsRoutes.get("/shipments/:id", async (req, res) => {
  const shipment = await db.shipments().findOne({ _id: req.params.id })
  if (!shipment) throw notFound("Shipment")
  res.json({ shipment })
})

/** Couriers that can deliver this order, with live rates, to choose from before booking. */
adminLogisticsRoutes.get("/orders/:id/couriers", async (req, res) => {
  const order = await loadOrder(req.params.id)
  res.json(await serviceability(order.shippingAddress.postalCode, { cod: order.paymentMethod === "cod", codAmount: order.paymentMethod === "cod" ? order.totals.total : 0 }))
})

/**
 * Books the order with the courier integration, or records a shipment booked
 * elsewhere (`manual`: carrier and AWB as typed; nothing is generated).
 */
adminLogisticsRoutes.post("/orders/:id/shipments", async (req, res) => {
  requireOwner(req)
  const body = z
    .object({
      manual: z.object({ carrier: z.string().trim().min(2).max(80), awb: z.string().trim().min(4).max(40), trackingUrl: z.url().optional() }).optional(),
      /** Which integration to book with (default: SHIPPING_PROVIDER), and its courier or service from the quotes. */
      carrier: z.enum(["shiprocket", "delhivery"]).optional(),
      courierId: z.number().int().positive().optional(),
      parcel: z
        .object({
          weightKg: z.number().positive().max(100).optional(),
          lengthCm: z.number().positive().max(300).optional(),
          breadthCm: z.number().positive().max(300).optional(),
          heightCm: z.number().positive().max(300).optional(),
        })
        .optional(),
    })
    .parse(req.body ?? {})
  const order = await loadOrder(req.params.id)
  const shipment = body.manual ? await recordManualShipment(order, body.manual) : await createShipment(order, { parcel: body.parcel, carrier: body.carrier, courierId: body.courierId })
  res.status(201).json({ shipment })
})

adminLogisticsRoutes.post("/shipments/:id/assign-courier", async (req, res) => {
  requireOwner(req)
  const { courierId } = z.object({ courierId: z.number().int().positive().optional() }).parse(req.body ?? {})
  res.json({ shipment: await assignCourier(req.params.id, courierId) })
})

adminLogisticsRoutes.post("/shipments/:id/label", async (req, res) => {
  requireOwner(req)
  res.json({ shipment: await generateLabel(req.params.id) })
})

adminLogisticsRoutes.post("/shipments/:id/pickup", async (req, res) => {
  requireOwner(req)
  res.json({ shipment: await schedulePickup(req.params.id) })
})

adminLogisticsRoutes.post("/shipments/:id/sync", async (req, res) => {
  res.json({ shipment: await syncTracking(req.params.id) })
})

adminLogisticsRoutes.post("/shipments/:id/cancel", async (req, res) => {
  requireOwner(req)
  res.json({ shipment: await cancelShipment(req.params.id) })
})

adminLogisticsRoutes.post("/shipments/:id/ndr", async (req, res) => {
  requireOwner(req)
  const body = z.object({ action: z.enum(["reattempt", "return"]), comment: z.string().trim().min(3).max(300) }).parse(req.body)
  res.json({ shipment: await ndrAction(req.params.id, body.action, body.comment) })
})

/** Status of a hand-recorded shipment, as its courier reported it. */
adminLogisticsRoutes.post("/shipments/:id/status", async (req, res) => {
  requireOwner(req)
  const body = z.object({ status: z.enum(SHIPMENT_STATUSES), note: z.string().trim().min(3).max(300) }).parse(req.body)
  res.json({ shipment: await updateManualShipment(req.params.id, body.status, body.note) })
})

/* ---------- Returns, refunds & reverse logistics ---------- */

/**
 * The order page's return actions, kept for the existing admin screen. They
 * act on the order's open (else latest) return; `refund` with no return to
 * settle is a plain refund (goodwill, partial), as before.
 */
adminLogisticsRoutes.post("/orders/:id/return-request", async (req, res) => {
  requireOwner(req)
  const body = z
    .object({
      reason: z.string().trim().min(1).max(500),
      action: z.enum(["approve", "schedule_pickup", "received", "refund", "reject", "exchange"]),
      amount: z.number().int().positive().optional(),
    })
    .parse(req.body)
  const order = await loadOrder(req.params.id)
  const actor = { type: "admin" as const, id: req.admin!.id, name: req.admin!.email }
  const ret = await currentReturn(order._id)
  const need = () => {
    if (!ret) throw conflict("There is no return request on this order.", "no_return_request")
    return ret
  }

  if (body.action === "approve") {
    const r = need()
    if (!["requested", "rejected"].includes(r.status)) throw conflict("There is no open return request to approve.", "no_return_request")
    res.json({ success: true, status: (await approveReturn(r, actor, body.reason)).status })
    return
  }
  if (body.action === "schedule_pickup") {
    const { shipment } = await bookReturnPickup(need(), actor)
    res.json({ success: true, status: "pickup_scheduled", shipment })
    return
  }
  if (body.action === "received") {
    res.json({ success: true, status: (await moveReturn(need(), "received", actor, body.reason)).status })
    return
  }
  if (body.action === "reject") {
    res.json({ success: true, status: (await rejectReturn(need(), actor, body.reason)).status })
    return
  }
  if (body.action === "exchange") {
    const out = await exchangeReturn(need(), actor, body.reason)
    res.json({ success: true, status: out.ret.status, exchangeOrderId: out.order._id, exchangeDisplayId: out.order.displayId })
    return
  }

  // refund: a received or inspected return is refunded for its items; anything else is a plain refund.
  const settles = ret && ["received", "inspected"].includes(ret.status)
  const refund = settles ? (await refundReturn(ret, actor, { amount: body.amount, note: body.reason })).refund : await refundOrder(order, { amount: body.amount, reason: body.reason, adminId: req.admin!.id })
  const creditNoteNumber = await issueCreditNote(order, refund, body.reason)
  res.json({ success: true, status: refund.status, refund, creditNoteNumber })
})

/** A credit note against the order's invoice for money returned. */
async function issueCreditNote(order: OrderDoc, refund: RefundDoc, reason: string) {
  const now = new Date()
  const creditNoteNumber = `CN-${now.getFullYear()}-${order.displayId}-${refund._id.slice(-4)}`
  await db.creditNotes().insertOne({
    _id: newId("cn"),
    creditNoteNumber,
    invoiceNumber: `INV-${order.createdAt.getFullYear()}-${order.displayId}`,
    orderId: order._id,
    customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
    refundAmount: refund.amount,
    reason,
    status: refund.status === "processed" ? "settled" : "issued",
    createdAt: now,
  })
  return creditNoteNumber
}

/* ---------- Returns (the returns screen) ---------- */

adminLogisticsRoutes.get("/returns", async (req, res) => {
  const q = z.object({ status: z.enum(RETURN_STATUSES).optional(), type: z.enum(["return", "exchange"]).optional(), q: z.string().trim().max(40).optional(), limit: z.coerce.number().int().min(1).max(500).default(100) }).parse(req.query)
  const num = q.q ? Number(q.q.replace(/^#|^RET-/i, "").split("-")[0]) : NaN
  const filter = { ...(q.status ? { status: q.status } : {}), ...(q.type ? { type: q.type } : {}), ...(q.q ? { $or: [{ code: q.q.toUpperCase() }, ...(Number.isFinite(num) ? [{ displayId: num }] : [])] } : {}) }
  const [returns, byStatus] = await Promise.all([
    db.returns().find(filter, { sort: { requestedAt: -1 }, limit: q.limit }).toArray(),
    db.returns().aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
  ])
  res.json({ returns, byStatus: Object.fromEntries(byStatus.map((b) => [b._id, b.n])) })
})

/** Support files a return for a customer (on the phone, at the counter): find the order by its number and see what it can send back. */
adminLogisticsRoutes.get("/return-options", async (req, res) => {
  const { orderNumber } = z.object({ orderNumber: z.coerce.number().int().positive() }).parse(req.query)
  const order = await db.orders().findOne({ displayId: orderNumber })
  if (!order) throw notFound("Order")
  const options = await returnOptions(order)
  res.json({ order: { id: order._id, displayId: order.displayId, customer: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`.trim(), email: order.email, paymentMethod: order.paymentMethod }, ...options })
})

adminLogisticsRoutes.post("/orders/:id/returns", async (req, res) => {
  requireOwner(req)
  const body = z
    .object({
      type: z.enum(["return", "exchange"]),
      method: z.enum(["pickup", "self_ship"]),
      items: z.array(z.object({ itemId: z.string(), quantity: z.number().int().min(1).max(100), reason: z.enum(RETURN_REASONS), note: z.string().trim().max(500).optional(), exchangeVariantId: z.string().optional() })).min(1).max(50),
    })
    .parse(req.body)
  const order = await loadOrder(req.params.id)
  const actor = { type: "admin" as const, id: req.admin!.id, name: req.admin!.email }
  const ret = await createReturn(order, body, actor)
  await db.auditLogs().insertOne({ _id: newId("audit"), adminId: actor.id, adminEmail: actor.name, action: "return.create", targetCollection: "returns", targetId: ret._id, diff: body, createdAt: new Date() })
  res.status(201).json({ return: ret })
})

adminLogisticsRoutes.get("/returns/:id", async (req, res) => {
  const ret = await loadReturn(req.params.id)
  const [history, shipment, refund, exchangeOrder] = await Promise.all([
    db.statusEvents().find({ entityId: ret._id }, { sort: { at: 1 } }).toArray(),
    ret.shipmentId ? db.shipments().findOne({ _id: ret.shipmentId }) : null,
    ret.resolution?.refundId ? db.refunds().findOne({ _id: ret.resolution.refundId }) : null,
    ret.resolution?.exchangeOrderId ? db.orders().findOne({ _id: ret.resolution.exchangeOrderId }, { projection: { displayId: 1, fulfillmentStatus: 1, status: 1 } }) : null,
  ])
  res.json({ return: ret, history, shipment, refund, exchangeOrder })
})

adminLogisticsRoutes.post("/returns/:id/:action", async (req, res) => {
  requireOwner(req)
  const action = z.enum(["approve", "reject", "pickup", "receive", "refund", "exchange", "cancel"]).parse(req.params.action)
  const body = z.object({ note: z.string().trim().min(3).max(300).optional(), amount: z.number().int().positive().optional() }).parse(req.body ?? {})
  const actor = { type: "admin" as const, id: req.admin!.id, name: req.admin!.email }
  const ret = await loadReturn(req.params.id)
  const order = await loadOrder(ret.orderId)
  const needNote = () => {
    if (!body.note) throw badRequest("Say why.")
    return body.note
  }
  let out: Record<string, unknown>
  if (action === "approve") out = { return: await approveReturn(ret, actor, body.note) }
  else if (action === "reject") out = { return: await rejectReturn(ret, actor, needNote()) }
  else if (action === "cancel") out = { return: await cancelReturn(ret, actor, needNote()) }
  else if (action === "pickup") out = await bookReturnPickup(ret, actor).then((r) => ({ return: r.ret, shipment: r.shipment }))
  else if (action === "receive") out = { return: await moveReturn(ret, "received", actor, body.note ?? "Received at the warehouse") }
  else if (action === "exchange") out = await exchangeReturn(ret, actor, body.note).then((r) => ({ return: r.ret, exchangeOrder: { id: r.order._id, displayId: r.order.displayId } }))
  else {
    const r = await refundReturn(ret, actor, { amount: body.amount, note: body.note })
    out = { return: r.ret, refund: r.refund, creditNoteNumber: await issueCreditNote(order, r.refund, `Return ${ret.code}`) }
  }
  await db.auditLogs().insertOne({ _id: newId("audit"), adminId: actor.id, adminEmail: actor.name, action: `return.${action}`, targetCollection: "returns", targetId: ret._id, diff: body, createdAt: new Date() })
  res.json(out)
})

/* ---------- Invoices & Credit Notes (GST & Finance) ---------- */

adminLogisticsRoutes.get("/invoices", async (req, res) => {
  const invoices = await db.invoices().find({}, { sort: { issuedAt: -1 }, limit: 100 }).toArray()
  res.json({ invoices })
})

adminLogisticsRoutes.get("/credit-notes", async (req, res) => {
  const creditNotes = await db.creditNotes().find({}, { sort: { createdAt: -1 }, limit: 100 }).toArray()
  res.json({ creditNotes })
})

/* ---------- Procurement & Suppliers ---------- */

adminLogisticsRoutes.get("/suppliers", async (req, res) => {
  const suppliers = await db.suppliers().find({}, { sort: { name: 1 } }).toArray()
  res.json({ suppliers })
})

adminLogisticsRoutes.post("/suppliers", async (req, res) => {
  const body = z
    .object({
      name: z.string().min(2),
      contactPerson: z.string().min(2),
      email: z.string().email(),
      phone: z.string(),
      categories: z.array(z.string()).default([]),
    })
    .parse(req.body)

  const doc = {
    _id: newId("sup"),
    ...body,
    rating: 4.8,
    status: "active" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  await db.suppliers().insertOne(doc)
  res.status(201).json({ supplier: doc })
})

adminLogisticsRoutes.get("/purchase-orders", async (req, res) => {
  const pos = await db.purchaseOrders().find({}, { sort: { createdAt: -1 } }).toArray()
  res.json({ purchaseOrders: pos })
})

adminLogisticsRoutes.post("/purchase-orders", async (req, res) => {
  const body = z
    .object({
      supplierId: z.string(),
      supplierName: z.string(),
      hubId: z.string(),
      items: z.array(
        z.object({
          sku: z.string(),
          name: z.string(),
          quantity: z.number().int().positive(),
          unitCost: z.number().positive(),
          received: z.number().default(0),
        })
      ),
      expectedDate: z.coerce.date().optional(),
    })
    .parse(req.body)

  const totalAmount = body.items.reduce((acc, i) => acc + i.quantity * i.unitCost, 0)
  const poNumber = `PO-${Date.now().toString().slice(-6)}`
  const doc = {
    _id: newId("po"),
    poNumber,
    ...body,
    status: "submitted" as const,
    totalAmount,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  await db.purchaseOrders().insertOne(doc)
  res.status(201).json({ purchaseOrder: doc })
})

/* ---------- Inventory & Warehouse Telemetry ---------- */

/**
 * Stock on hand per variant.
 *
 * It used to also return `allocated: Math.floor(Math.random() * 5)` with a
 * fixed reorder point and hub, so the figure changed on every refresh and the
 * other two described a warehouse model the data does not have. Only what a
 * variant really carries is returned.
 *
 * The product's categories, thumbnail and option values come along with it:
 * the ledger has to group, filter and identify a variant on screen, and those
 * are the only fields it can do that with that are real. The low stock
 * threshold rides along so the ledger marks the same variants the dashboard
 * does instead of hard-coding a number of its own.
 */
adminLogisticsRoutes.get("/inventory", async (req, res) => {
  const [products, { lowStockThreshold }] = await Promise.all([
    db.products().find({ status: "published" }).toArray(),
    getSettings(),
  ])

  const categoryIds = [...new Set(products.flatMap((p) => p.categoryIds))]
  const categoryDocs = categoryIds.length
    ? await db.categories().find({ _id: { $in: categoryIds } }).toArray()
    : []
  const categoryName = new Map(categoryDocs.map((c) => [c._id, c.name]))

  const inventoryItems = products.flatMap((p) => {
    const categories = p.categoryIds
      .map((id) => categoryName.get(id))
      .filter((name): name is string => Boolean(name))
    const productImage = p.thumbnail ?? p.images[0]
    return p.variants.map((v) => {
      const image = v.images?.[0] ?? productImage
      return {
        id: v._id,
        productId: p._id,
        productTitle: p.title,
        productHandle: p.handle,
        variantTitle: v.title,
        options: v.options,
        sku: v.sku ?? `SKU-${v._id.slice(-6)}`,
        stock: v.stock,
        manageInventory: v.manageInventory,
        allowBackorder: v.allowBackorder,
        categories,
        thumbnail: image ? assetUrl(image) : null,
        updatedAt: p.updatedAt,
      }
    })
  })

  res.json({ inventory: inventoryItems, lowStockThreshold })
})

adminLogisticsRoutes.post("/inventory/adjust", async (req, res) => {
  const body = z
    .object({
      productId: z.string(),
      variantId: z.string(),
      adjustment: z.number().int(),
      hubId: z.string().default("BLR-FC1"),
      reason: z.string().optional(),
    })
    .parse(req.body)

  const product = await db.products().findOne({ _id: body.productId, "variants._id": body.variantId })
  if (!product) throw notFound("Product or variant")
  const variant = product.variants.find((v) => v._id === body.variantId)
  if (!variant) throw notFound("Variant")
  if ((await trackedVariants([variant._id])).size) {
    throw conflict("This variant's stock is managed by warehouses. Adjust it at a warehouse so the ledger records it.", "warehouse_managed")
  }

  const newStock = Math.max(0, variant.stock + body.adjustment)

  await db.products().updateOne(
    { _id: body.productId, "variants._id": body.variantId },
    { $set: { "variants.$.stock": newStock, updatedAt: new Date() } }
  )

  // Record immutable movement in ledger
  await db.inventoryMovements().insertOne({
    _id: newId("mov"),
    sku: variant.sku ?? `SKU-${variant._id.slice(-6)}`,
    variantId: variant._id,
    hubId: body.hubId,
    type: "adjustment",
    quantity: body.adjustment,
    referenceType: "manual",
    referenceId: newId("adj"),
    reason: body.reason ?? "Manual inventory adjustment",
    balanceAfter: newStock,
    createdAt: new Date(),
  })

  res.json({ success: true, adjustment: body.adjustment, stock: newStock })
})

adminLogisticsRoutes.get("/inventory/movements", async (_req, res) => {
  const movements = await db.inventoryMovements().find({}, { sort: { createdAt: -1 }, limit: 100 }).toArray()
  res.json({ movements })
})
