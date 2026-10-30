import { Router } from "express"
import { z } from "zod"
import { db, type CartDoc, type LineItem, type OrderDoc, type RegionDoc } from "../../db/schema.js"
import { withTransaction } from "../../db/client.js"
import { env } from "../../env.js"
import { badRequest, conflict, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { computeTotals, promotionUsable } from "../../lib/totals.js"
import { toStoreOrder } from "../../lib/serialize.js"
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  verifyRazorpayWebhook,
  isRazorpayConfigured,
} from "../../lib/payments/razorpay.js"
import {
  createStripePaymentIntent,
  verifyStripeWebhook,
  isStripeConfigured,
} from "../../lib/payments/stripe.js"

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
 * Initializes a payment intent on the appropriate payment gateway:
 * - Razorpay for INR / India
 * - Stripe for EUR / GBP / Europe
 */
storePaymentRoutes.post("/carts/:id/payment-intent", async (req, res) => {
  const body = z
    .object({
      provider: z.enum(["razorpay", "stripe", "cod"]),
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

  if (body.provider === "stripe") {
    if (isStripeConfigured()) {
      const intent = await createStripePaymentIntent({
        amount: totals.total,
        currency: cart.currency,
        metadata: { cartId: cart._id, email: cart.email! },
      })
      res.json({
        provider: "stripe",
        amount: intent.amount,
        currency: intent.currency,
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
      })
    } else {
      res.json({
        provider: "stripe",
        amount: totals.total,
        currency: cart.currency,
        clientSecret: `pi_test_secret_${cart._id.slice(-8)}`,
        paymentIntentId: `pi_mock_${cart._id.slice(-8)}`,
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
      provider: z.enum(["razorpay", "stripe", "cod"]),
      razorpayOrderId: z.string().optional(),
      razorpayPaymentId: z.string().optional(),
      razorpaySignature: z.string().optional(),
      paymentIntentId: z.string().optional(),
    })
    .parse(req.body)

  const id = cartId.parse(req.params.id)

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
      await db.promotions().updateOne({ _id: promo._id }, { $inc: { usageCount: 1 } }, { session })
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
        transactionId: body.razorpayPaymentId ?? body.paymentIntentId ?? `cod_${Date.now()}`,
        razorpayOrderId: body.razorpayOrderId,
        razorpayPaymentId: body.razorpayPaymentId,
        razorpaySignature: body.razorpaySignature,
        paymentIntentId: body.paymentIntentId,
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
        items: doc.items.map((i) => ({
          name: i.productTitle,
          sku: `SKU-${i.variantId.slice(-6)}`,
          hsn: "6204",
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxableValue: Math.round((i.unitPrice * i.quantity) / 1.12),
          gstRate: 12,
          cgst: Math.round((i.unitPrice * i.quantity * 0.06) / 1.12),
          sgst: Math.round((i.unitPrice * i.quantity * 0.06) / 1.12),
          igst: 0,
        })),
        subtotal: doc.totals.itemSubtotal,
        cgstTotal: Math.round((doc.totals.taxTotal || 0) / 2),
        sgstTotal: Math.round((doc.totals.taxTotal || 0) / 2),
        igstTotal: 0,
        grandTotal: doc.totals.total,
        currency: doc.currency,
        status: doc.paymentStatus === "paid" ? "paid" : "issued",
        issuedAt: now,
      },
      { session }
    )

    return doc
  })

  res.status(201).json({ order: toStoreOrder(order) })
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

/**
 * Stripe Webhook endpoint
 */
storePaymentRoutes.post("/webhooks/stripe", async (req, res) => {
  const signature = req.headers["stripe-signature"] as string
  if (!signature) {
    res.status(400).send("Missing signature")
    return
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? env.STRIPE_WEBHOOK_SECRET
  if (webhookSecret) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body)
    const valid = verifyStripeWebhook(rawBody, signature, 300, webhookSecret)
    if (!valid) {
      res.status(400).send("Invalid signature")
      return
    }
  }

  const event = req.body
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data?.object
    const cartId = intent?.metadata?.cartId
    if (cartId) {
      // Idempotent: only update if order is not already marked paid
      const result = await db.orders().updateOne(
        { cartId, paymentStatus: { $ne: "paid" } },
        {
          $set: {
            paymentStatus: "paid",
            "paymentDetails.paidAt": new Date(),
            "paymentDetails.paymentIntentId": intent.id,
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
