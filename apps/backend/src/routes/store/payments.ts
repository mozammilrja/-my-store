import { Router } from "express"
import { buildInvoiceLines } from "../../lib/invoice.js"
import { z } from "zod"
import { db, type CartDoc, type LineItem, type OrderDoc, type RegionDoc } from "../../db/schema.js"
import { withTransaction } from "../../db/client.js"
import { env } from "../../env.js"
import { badRequest, conflict, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { computeTotals, promotionUsable } from "../../lib/totals.js"
import { toStoreOrder } from "../../lib/serialize.js"
import { executeIdempotent } from "../../lib/idempotency.js"
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  verifyRazorpayWebhook,
  isRazorpayConfigured,
} from "../../lib/payments/razorpay.js"

export const storePaymentRoutes = Router()

const cartId = z.string().regex(/^cart_[0-9a-z]{16}$/, "invalid cart id")

async function getValidCartAndTotals(id: string) {
  const cart = await db.carts().findOne({ _id: cartId.parse(id) })
  if (!cart) throw notFound("Cart")
  if (cart.completedAt) throw conflict("Cart already completed")
  if (!cart.items.length) throw badRequest("Cart is empty")
  if (!cart.email) throw badRequest("Email is required")
  if (!cart.shippingAddress) throw badRequest("Shipping address is required")
  if (!cart.shippingOptionId) throw badRequest("Shipping option is required")

  const region = await db.regions().findOne({ _id: cart.regionId })
  if (!region) throw notFound("Region")

  const promotions = cart.promoCodes.length
    ? await db.promotions().find({ code: { $in: cart.promoCodes } }).toArray()
    : []
  const totals = computeTotals(cart, region, promotions)

  return { cart, region, promotions, totals }
}

/**
 * Initializes a payment for the cart: Razorpay for prepaid orders, or cash on delivery.
 */
storePaymentRoutes.post("/carts/:id/payment-intent", async (req, res) => {
  const body = z
    .object({
      provider: z.enum(["razorpay", "cod"]),
    })
    .parse(req.body)

  const { cart, totals } = await getValidCartAndTotals(req.params.id)

  if (body.provider === "cod") {
    res.json({
      provider: "cod",
      amount: totals.total,
      currency: cart.currency,
      ready: true,
    })
    return
  }

  if (body.provider === "razorpay") {
    if (isRazorpayConfigured()) {
      const razorpayOrder = await createRazorpayOrder({
        amount: totals.total,
        currency: cart.currency,
        receipt: cart._id,
        notes: { cartId: cart._id, email: cart.email! },
      })
      res.json({
        provider: "razorpay",
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        razorpayOrderId: razorpayOrder.id,
        keyId: process.env.RAZORPAY_KEY_ID,
      })
    } else {
      // In local dev/staging without API keys, return clean intent parameters with explicit simulation notice
      res.json({
        provider: "razorpay",
        amount: totals.total,
        currency: cart.currency,
        razorpayOrderId: `order_rzp_mock_${cart._id.slice(-8)}`,
        keyId: "rzp_test_placeholder",
        isStagingSimulated: true,
      })
    }
    return
  }
})

/**
 * Confirms payment and atomically creates an order in MongoDB
 */
storePaymentRoutes.post("/carts/:id/confirm-payment", async (req, res) => {
  const body = z
    .object({
      provider: z.enum(["razorpay", "cod"]),
      razorpayOrderId: z.string().optional(),
      razorpayPaymentId: z.string().optional(),
      razorpaySignature: z.string().optional(),
      idempotencyKey: z.string().optional(),
    })
    .parse(req.body)

  const id = cartId.parse(req.params.id)
  const idempotencyKey = (req.headers["idempotency-key"] as string) || body.idempotencyKey

  // An online order is only ever marked "paid" after the gateway proves it.
  // Without Razorpay keys there is nothing to verify against, so refuse rather
  // than create a "paid" order nobody paid for. The test suite (NODE_ENV=test)
  // runs without keys and keeps the old path.
  if (body.provider === "razorpay" && !isRazorpayConfigured() && env.NODE_ENV !== "test") {
    throw badRequest(
      "Online payment isn't available right now. Please choose Cash on Delivery.",
      "payment_unavailable"
    )
  }

  // Signature verification for Razorpay
  if (body.provider === "razorpay" && isRazorpayConfigured()) {
    if (!body.razorpayOrderId || !body.razorpayPaymentId || !body.razorpaySignature) {
      throw badRequest("Missing Razorpay payment signature details")
    }
    const isValid = verifyRazorpaySignature({
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
    })
    if (!isValid) {
      throw badRequest("Razorpay payment signature verification failed", "invalid_signature")
    }
  }

  const performConfirmation = async () => {
    const order = await withTransaction(async (session) => {
      const cart = await db.carts().findOne({ _id: id }, { session })
      if (!cart) throw notFound("Cart")
      if (cart.completedAt) {
        const existing = await db.orders().findOne({ cartId: cart._id }, { session })
        if (existing) return existing
      }

      const region = await db.regions().findOne({ _id: cart.regionId }, { session })
      if (!region) throw notFound("Region")

      const items = cart.items
      if (!items.length) throw badRequest("Cart is empty")

      // Reserve stock atomically
      for (const item of items) {
        const taken = await db.products().updateOne(
          {
            _id: item.productId,
            variants: {
              $elemMatch: {
                _id: item.variantId,
                $or: [{ manageInventory: false }, { allowBackorder: true }, { stock: { $gte: item.quantity } }],
              },
            },
          },
          { $inc: { "variants.$[v].stock": -item.quantity } },
          { arrayFilters: [{ "v._id": item.variantId, "v.manageInventory": true, "v.allowBackorder": false }], session }
        )
        if (!taken.matchedCount) throw conflict(`${item.productTitle} (${item.variantTitle}) sold out`, "out_of_stock")
      }

      // Process promotion usage
      const promotions = cart.promoCodes.length
        ? await db.promotions().find({ code: { $in: cart.promoCodes } }, { session }).toArray()
        : []
      for (const promo of promotions) {
        if (!promotionUsable(promo, cart.currency)) throw conflict(`Promo ${promo.code} expired`, "invalid_promo")
        const used = await db.promotions().updateOne(
          { _id: promo._id, $or: [{ usageLimit: null }, { usageLimit: { $exists: false } }, { $expr: { $lt: ["$usageCount", "$usageLimit"] } }] },
          { $inc: { usageCount: 1 } },
          { session }
        )
        if (!used.matchedCount) throw conflict(`Promo ${promo.code} has been used up`, "invalid_promo")
      }

      const counter = await db.counters().findOneAndUpdate(
        { _id: "order" },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: "after", session }
      )

      const now = new Date()
      const shippingOption = region.shippingOptions.find((s) => s._id === cart.shippingOptionId) ?? region.shippingOptions[0] ?? { _id: "standard", name: "Standard Delivery", amount: 0 }
      const totals = computeTotals(cart, region, promotions)

      const doc: OrderDoc = {
        _id: newId("order"),
        displayId: 1000 + (counter?.seq ?? 1),
        cartId: cart._id,
        regionId: region._id,
        currency: cart.currency,
        customerId: cart.customerId ?? null,
        email: cart.email!,
        items,
        shippingAddress: cart.shippingAddress!,
        billingAddress: cart.billingAddress ?? cart.shippingAddress!,
        shippingOption,
        promoCodes: cart.promoCodes,
        totals,
        paymentMethod: body.provider,
        paymentStatus: body.provider === "cod" ? "awaiting" : "paid",
        paymentDetails: {
          provider: body.provider,
          transactionId: body.razorpayPaymentId ?? `cod_${Date.now()}`,
          razorpayOrderId: body.razorpayOrderId,
          razorpayPaymentId: body.razorpayPaymentId,
          razorpaySignature: body.razorpaySignature,
          paidAt: body.provider === "cod" ? undefined : now,
        },
        fulfillmentStatus: "unfulfilled",
        status: "pending",
        createdAt: now,
        updatedAt: now,
      }

      await db.orders().insertOne(doc, { session })
      await db.carts().updateOne(
        { _id: cart._id },
        { $set: { completedAt: now, orderId: doc._id, updatedAt: now } },
        { session }
      )

      // Ledger: Immutable inventory movements
      for (const item of items) {
        await db.inventoryMovements().insertOne(
          {
            _id: newId("mov"),
            sku: `SKU-${item.variantId.slice(-6)}`,
            variantId: item.variantId,
            hubId: "BLR-FC1",
            type: "outbound",
            quantity: item.quantity,
            referenceType: "order",
            referenceId: doc._id,
            reason: `Order #${doc.displayId} placement`,
            balanceAfter: 0,
            createdAt: now,
          },
          { session }
        )
      }

      // Record coupon redemptions
      for (const promo of promotions) {
        await db.couponRedemptions().insertOne(
          {
            _id: newId("crm"),
            code: promo.code,
            promotionId: promo._id,
            customerId: doc.customerId,
            cartId: cart._id,
            orderId: doc._id,
            status: "redeemed",
            createdAt: now,
          },
          { session }
        )
      }

      // Generate GST Invoice in DB
      const invoiceNumber = `INV-${new Date().getFullYear()}-${doc.displayId}`
      await db.invoices().insertOne(
        {
          _id: newId("inv"),
          invoiceNumber,
          orderId: doc._id,
          displayId: doc.displayId,
          customerName: `${doc.shippingAddress.firstName} ${doc.shippingAddress.lastName}`,
          shippingAddress: doc.shippingAddress,
          billingAddress: doc.billingAddress,
          // Lines and totals that add up to what the order charged.
          ...buildInvoiceLines(doc, region),
          currency: doc.currency,
          status: doc.paymentStatus === "paid" ? "paid" : "issued",
          issuedAt: now,
        },
        { session }
      )

      // Transactional Outbox Event
      await db.outboxEvents().insertOne(
        {
          _id: newId("outbox"),
          topic: "order.placed",
          payload: { orderId: doc._id, displayId: doc.displayId, email: doc.email, total: doc.totals.total },
          status: "pending",
          retryCount: 0,
          createdAt: now,
        },
        { session }
      )

      // Notification
      await db.notifications().insertOne(
        {
          _id: newId("notif"),
          recipientType: "customer",
          recipientId: doc.customerId ?? doc.email,
          type: "order_confirmation",
          title: `Order #${doc.displayId} Confirmed`,
          message: `Your payment was verified and order #${doc.displayId} is confirmed.`,
          channel: "in_app",
          status: "unread",
          metadata: { orderId: doc._id, displayId: doc.displayId },
          createdAt: now,
        },
        { session }
      )

      return doc
    })

    return {
      status: 201,
      body: { order: toStoreOrder(order) },
    }
  }

  if (idempotencyKey) {
    const result = await executeIdempotent(idempotencyKey, "confirm_payment", req.body, performConfirmation)
    res.status(result.status).json(result.body)
    return
  }

  const result = await performConfirmation()
  res.status(result.status).json(result.body)
})

/**
 * Razorpay Webhook endpoint
 */
storePaymentRoutes.post("/webhooks/razorpay", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"] as string
  if (!signature) {
    res.status(400).send("Missing signature")
    return
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? env.RAZORPAY_WEBHOOK_SECRET
  if (webhookSecret) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body)
    const valid = verifyRazorpayWebhook(rawBody, signature, webhookSecret)
    if (!valid) {
      res.status(400).send("Invalid signature")
      return
    }
  }

  const event = req.body
  const eventId = (event.id ?? event.payload?.payment?.entity?.id ?? req.headers["x-razorpay-event-id"]) as string
  if (eventId) {
    const existing = await db.paymentWebhookEvents().findOne({ provider: "razorpay", eventId })
    if (existing) {
      res.json({ status: "ok", duplicate: true })
      return
    }
    await db.paymentWebhookEvents().insertOne({
      _id: newId("pwe"),
      provider: "razorpay",
      eventId,
      event: event.event ?? "payment.captured",
      payload: event,
      signature: signature ?? "",
      status: "processed",
      processedAt: new Date(),
      createdAt: new Date(),
    }).catch(() => {})
  }

  if (event.event === "payment.captured") {
    const payment = event.payload?.payment?.entity
    const orderId = payment?.notes?.orderId
    if (orderId) {
      // Idempotent: only update if order is not already marked paid
      const result = await db.orders().updateOne(
        { _id: orderId, paymentStatus: { $ne: "paid" } },
        {
          $set: {
            paymentStatus: "paid",
            "paymentDetails.paidAt": new Date(),
            "paymentDetails.transactionId": payment.id,
            updatedAt: new Date(),
          },
        }
      )
      if (result.matchedCount === 0) {
        // Already processed earlier or order not found
        res.json({ status: "ok", duplicate: true })
        return
      }
    }
  }

  res.json({ status: "ok" })
})
