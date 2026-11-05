import { Router, type Request } from "express"
import { z } from "zod"
import { db, SHIPMENT_STATUSES } from "../../db/schema.js"
import { conflict, forbidden, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { trackedVariants } from "../../lib/inventory/stock.js"
import { moveReturn } from "../../lib/returns/inspect.js"
import { canTransition } from "../../lib/state/machines.js"
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
  serviceability,
  shippingConfigured,
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
  res.json({ provider: shippingConfigured() ? "shiprocket" : "none" })
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
  res.json({ shipments, provider: shippingConfigured() ? "shiprocket" : "none" })
})

adminLogisticsRoutes.get("/shipments/:id", async (req, res) => {
  const shipment = await db.shipments().findOne({ _id: req.params.id })
  if (!shipment) throw notFound("Shipment")
  res.json({ shipment })
})

/** Couriers that can deliver this order, with live rates, to choose from before booking. */
adminLogisticsRoutes.get("/orders/:id/couriers", async (req, res) => {
  const order = await loadOrder(req.params.id)
  res.json(await serviceability(order.shippingAddress.postalCode, { cod: order.paymentMethod === "cod" }))
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
  const shipment = body.manual ? await recordManualShipment(order, body.manual) : await createShipment(order, { parcel: body.parcel })
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

adminLogisticsRoutes.post("/orders/:id/return-request", async (req, res) => {
  requireOwner(req)
  const body = z
    .object({
      reason: z.string().trim().min(1).max(500),
      action: z.enum(["approve", "schedule_pickup", "received", "refund", "reject"]),
      amount: z.number().int().positive().optional(),
    })
    .parse(req.body)
  const order = await loadOrder(req.params.id)
  const now = new Date()
  const actor = { type: "admin" as const, id: req.admin!.id, name: req.admin!.email }

  if (body.action === "approve") {
    await moveReturn(order, "approved", actor, body.reason)
    res.json({ success: true, status: "approved" })
    return
  }

  if (body.action === "schedule_pickup") {
    // A real reverse pickup with the courier; its AWB and tracking come from the courier.
    const shipment = await createReturnShipment(order)
    res.json({ success: true, status: "approved", shipment })
    return
  }

  if (body.action === "received") {
    await moveReturn(order, "received", actor, body.reason)
    res.json({ success: true, status: "received" })
    return
  }

  if (body.action === "reject") {
    await moveReturn(order, "rejected", actor, body.reason)
    res.json({ success: true, status: "rejected" })
    return
  }

  // refund: money goes back through Razorpay (or is recorded as a cash refund for COD) first;
  // the credit note follows once the refund was accepted. A refund can be issued at any
  // point (goodwill, partial); the return itself closes as refunded only once the goods
  // were received. Stock comes back at the warehouse inspection, never here.
  const refund = await refundOrder(order, { amount: body.amount, reason: body.reason, adminId: req.admin!.id })
  if (order.returnRequest && canTransition("return", order.returnRequest.status, "refunded")) {
    await moveReturn(order, "refunded", actor, body.reason, { fulfillmentStatus: "returned" })
  }
  const creditNoteNumber = `CN-${now.getFullYear()}-${order.displayId}-${refund._id.slice(-4)}`
  await db.creditNotes().insertOne({
    _id: newId("cn"),
    creditNoteNumber,
    invoiceNumber: `INV-${order.createdAt.getFullYear()}-${order.displayId}`,
    orderId: order._id,
    customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
    refundAmount: refund.amount,
    reason: body.reason,
    status: refund.status === "processed" ? "settled" : "issued",
    createdAt: now,
  })
  res.json({ success: true, status: refund.status, refund, creditNoteNumber })
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
