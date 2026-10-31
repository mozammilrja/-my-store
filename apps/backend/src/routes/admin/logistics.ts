import { Router } from "express"
import { z } from "zod"
import { db, type OrderDoc, type ShipmentDoc } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { createDelhiveryShipment, trackDelhiveryShipment } from "../../lib/logistics/delhivery.js"
import { createBlueDartShipment, trackBlueDartShipment } from "../../lib/logistics/bluedart.js"
import { createRazorpayRefund } from "../../lib/payments/razorpay.js"
import { createStripeRefund } from "../../lib/payments/stripe.js"
import { assetUrl } from "../../lib/serialize.js"
import { getSettings } from "./settings.js"

export const adminLogisticsRoutes = Router()

/* ---------- Shipments & Logistics ---------- */

adminLogisticsRoutes.get("/shipments", async (req, res) => {
  const shipments = await db.shipments().find({}, { sort: { createdAt: -1 }, limit: 100 }).toArray()
  res.json({ shipments })
})

adminLogisticsRoutes.post("/orders/:id/shipment", async (req, res) => {
  const body = z
    .object({
      carrier: z.enum(["delhivery", "bluedart", "custom"]).default("delhivery"),
    })
    .parse(req.body)

  const order = await db.orders().findOne({ _id: req.params.id })
  if (!order) throw notFound("Order")
  if (order.status === "canceled") throw conflict("Order is canceled")
  if (order.fulfillmentStatus === "delivered") throw conflict("Order already delivered")

  let awb = ""
  let labelUrl = ""

  if (body.carrier === "delhivery") {
    const result = await createDelhiveryShipment(order)
    awb = result.awb
    labelUrl = result.labelUrl ?? `/uploads/labels/${awb}.pdf`
  } else if (body.carrier === "bluedart") {
    const result = await createBlueDartShipment(order)
    awb = result.awb
    labelUrl = result.labelUrl ?? `/uploads/labels/${awb}.pdf`
  } else {
    awb = `CUST-${order.displayId}-${Date.now().toString().slice(-4)}`
    labelUrl = `/uploads/labels/${awb}.pdf`
  }

  const now = new Date()
  const shipmentDoc: ShipmentDoc = {
    _id: newId("ship"),
    orderId: order._id,
    displayId: order.displayId,
    carrier: body.carrier,
    awb,
    status: "manifested",
    trackingEvents: [
      {
        timestamp: now,
        status: "Manifested",
        location: "Bengaluru Central Hub",
        note: `Shipping label generated for ${body.carrier.toUpperCase()}`,
      },
    ],
    pickupDate: new Date(Date.now() + 24 * 3600 * 1000),
    labelUrl,
    isReturn: false,
    customer: {
      name: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      phone: order.shippingAddress.phone,
      city: order.shippingAddress.city,
      postalCode: order.shippingAddress.postalCode,
    },
    itemsCount: order.items.reduce((acc, i) => acc + i.quantity, 0),
    createdAt: now,
    updatedAt: now,
  }

  await db.shipments().insertOne(shipmentDoc)

  await db.orders().updateOne(
    { _id: order._id },
    {
      $set: {
        fulfillmentStatus: "shipped",
        shipment: {
          carrier: body.carrier,
          awb,
          status: "manifested",
          labelUrl,
          pickupScheduledAt: shipmentDoc.pickupDate,
          shippedAt: now,
        },
        updatedAt: now,
      },
    }
  )

  res.status(201).json({ shipment: shipmentDoc })
})

adminLogisticsRoutes.get("/orders/:id/track", async (req, res) => {
  const order = await db.orders().findOne({ _id: req.params.id })
  if (!order) throw notFound("Order")

  if (!order.shipment?.awb) {
    res.json({
      status: "unfulfilled",
      message: "Shipment has not been manifested yet",
      events: [],
    })
    return
  }

  const carrier = order.shipment.carrier
  const awb = order.shipment.awb

  if (carrier === "delhivery") {
    const data = await trackDelhiveryShipment(awb)
    res.json({ carrier, awb, tracking: data })
    return
  }

  if (carrier === "bluedart") {
    const data = await trackBlueDartShipment(awb)
    res.json({ carrier, awb, tracking: data })
    return
  }

  res.json({
    carrier,
    awb,
    status: order.shipment.status,
    events: [
      {
        timestamp: order.shipment.shippedAt ?? order.createdAt,
        status: "Manifested",
        location: "Dispatch Dock 4B",
      },
    ],
  })
})

/* ---------- Returns & Reverse Logistics ---------- */

adminLogisticsRoutes.post("/orders/:id/return-request", async (req, res) => {
  const body = z
    .object({
      reason: z.string().min(1).max(500),
      action: z.enum(["approve", "schedule_pickup", "received", "refund", "reject"]),
    })
    .parse(req.body)

  const order = await db.orders().findOne({ _id: req.params.id })
  if (!order) throw notFound("Order")

  const now = new Date()

  if (body.action === "approve") {
    const returnAwb = `RET-DLV-${order.displayId}-${Date.now().toString().slice(-4)}`
    await db.orders().updateOne(
      { _id: order._id },
      {
        $set: {
          returnRequest: {
            status: "approved",
            reason: body.reason,
            items: order.items.map((i) => ({ itemId: i._id, quantity: i.quantity })),
            returnAwb,
            carrier: "delhivery",
            requestedAt: order.returnRequest?.requestedAt ?? now,
            updatedAt: now,
          },
          updatedAt: now,
        },
      }
    )
    res.json({ success: true, returnAwb, status: "approved" })
    return
  }

  if (body.action === "refund") {
    if (order.paymentStatus === "refunded") {
      const existingCn = await db.creditNotes().findOne({ orderId: order._id })
      res.json({ success: true, status: "refunded", creditNoteNumber: existingCn?.creditNoteNumber })
      return
    }

    let gatewayRefundId: string | undefined = undefined
    try {
      if (order.paymentDetails?.razorpayPaymentId) {
        const rzpRefund = await createRazorpayRefund({
          paymentId: order.paymentDetails.razorpayPaymentId,
          amount: order.totals.total,
        })
        gatewayRefundId = rzpRefund.id
      } else if (order.paymentDetails?.paymentIntentId) {
        const stripeRefund = await createStripeRefund({
          paymentIntentId: order.paymentDetails.paymentIntentId,
          amount: order.totals.total,
        })
        gatewayRefundId = stripeRefund.id
      }
    } catch (err: any) {
      console.warn("Gateway refund warning (proceeding with store ledger refund):", err?.message)
    }

    await db.orders().updateOne(
      { _id: order._id },
      {
        $set: {
          paymentStatus: "refunded",
          fulfillmentStatus: "returned",
          status: "completed",
          ...(gatewayRefundId ? { "paymentDetails.refundId": gatewayRefundId } : {}),
          "returnRequest.status": "refunded",
          "returnRequest.updatedAt": now,
          updatedAt: now,
        },
      }
    )

    // Automatically issue Credit Note
    const creditNoteNumber = `CN-${now.getFullYear()}-${order.displayId}`
    await db.creditNotes().insertOne({
      _id: newId("cn"),
      creditNoteNumber,
      invoiceNumber: `INV-${now.getFullYear()}-${order.displayId}`,
      orderId: order._id,
      customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      refundAmount: order.totals.total,
      reason: body.reason || "Return inspection passed & approved",
      status: "settled",
      createdAt: now,
    })

    res.json({ success: true, status: "refunded", creditNoteNumber, refundId: gatewayRefundId })
    return
  }

  res.json({ success: true, status: body.action })
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
      reason: z.string().optional(),
    })
    .parse(req.body)

  await db.products().updateOne(
    { _id: body.productId, "variants._id": body.variantId },
    { $inc: { "variants.$.stock": body.adjustment }, $set: { updatedAt: new Date() } }
  )

  res.json({ success: true, adjustment: body.adjustment })
})
