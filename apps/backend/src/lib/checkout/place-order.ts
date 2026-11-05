import type { ClientSession } from "mongodb"
import { withTransaction } from "../../db/client.js"
import { db, type CartDoc, type LineItem, type OrderDoc, type ProductDoc } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { newId } from "../ids.js"
import { invoiceParts } from "../invoice.js"
import { computeTotals, promotionUsable } from "../totals.js"
import { allocate } from "../fulfilment/allocate.js"
import { recordTransition, SYSTEM } from "../state/machines.js"

const findVariant = (product: ProductDoc | null, variantId: string) => product?.variants.find((v) => v._id === variantId)

/**
 * Re-reads every line from the catalog: current price in the cart currency,
 * titles and images. Lines whose product or price no longer exists are dropped.
 */
export async function refreshItems(items: LineItem[], currency: string, session?: ClientSession) {
  if (!items.length) return { items, removed: [] as string[] }
  const products = await db
    .products()
    .find({ _id: { $in: [...new Set(items.map((i) => i.productId))] }, status: "published" }, { session })
    .toArray()
  const byId = new Map(products.map((p) => [p._id, p]))
  const removed: string[] = []
  const fresh: LineItem[] = []
  for (const item of items) {
    const product = byId.get(item.productId) ?? null
    const variant = findVariant(product, item.variantId)
    const price = variant?.prices[currency]
    if (!product || !variant || price === undefined) {
      removed.push(item.productTitle)
      continue
    }
    fresh.push({
      ...item,
      productTitle: product.title,
      productHandle: product.handle,
      variantTitle: variant.title,
      ...(variant.images?.[0] ?? product.thumbnail ? { thumbnail: (variant.images?.[0] ?? product.thumbnail)! } : {}),
      unitPrice: price,
    })
  }
  return { items: fresh, removed }
}

/**
 * What the cart costs right now, from the catalog (never from the browser):
 * current prices, usable promotions, the chosen delivery option and tax.
 * Throws a shopper-readable error when the cart can't be checked out.
 */
export async function priceCart(cart: CartDoc, session?: ClientSession) {
  const region = await db.regions().findOne({ _id: cart.regionId }, { session })
  if (!region) throw notFound("Region")
  const { items, removed } = await refreshItems(cart.items, cart.currency, session)
  if (removed.length) throw conflict(`Some items are no longer available: ${removed.join(", ")}`, "items_unavailable")
  if (!items.length) throw badRequest("Your bag is empty", "empty_cart")
  if (!cart.email) throw badRequest("An email address is required", "missing_email")
  if (!cart.shippingAddress) throw badRequest("A delivery address is required", "missing_address")
  if (!region.countries.some((r) => r.code === cart.shippingAddress!.countryCode)) {
    throw badRequest("We don't deliver to that country from this region", "unsupported_country")
  }
  const shippingOption = region.shippingOptions.find((s) => s._id === cart.shippingOptionId)
  if (!shippingOption) throw badRequest("Choose a delivery option", "missing_shipping")
  const promotions = cart.promoCodes.length ? await db.promotions().find({ code: { $in: cart.promoCodes } }, { session }).toArray() : []
  for (const promo of promotions) {
    if (!promotionUsable(promo, cart.currency)) throw conflict(`The code ${promo.code} can no longer be used`, "invalid_promotion")
  }
  const totals = computeTotals({ ...cart, items }, region, promotions)
  return { region, items, promotions, shippingOption, totals, email: cart.email, shippingAddress: cart.shippingAddress }
}

/** How the order is paid. Online payments arrive here only after Razorpay confirmed them server-side. */
export type OrderPayment =
  | { method: "cod" }
  | {
      method: "razorpay"
      attemptId: string
      razorpayOrderId: string
      razorpayPaymentId: string
      /** What Razorpay says was captured, in paise. Must equal the cart total. */
      amount: number
      paidAt: Date
    }

/**
 * Turns a cart into an order in one transaction: stock, coupon usage, the
 * order, invoice, ledger, outbox and notification all commit together or not
 * at all. Placing a cart twice returns the first order (`created: false`),
 * so a retried request, a webhook and the checkout callback can't make two.
 */
export async function placeOrder(cartId: string, payment: OrderPayment, actorId?: string | null): Promise<{ order: OrderDoc; created: boolean }> {
  return withTransaction(async (session) => {
    const cart = await db.carts().findOne({ _id: cartId }, { session })
    if (!cart) throw notFound("Cart")
    if (cart.completedAt) {
      const existing = await db.orders().findOne({ cartId: cart._id }, { session })
      if (existing) return { order: existing, created: false }
    }

    const { region, items, promotions, shippingOption, totals, email, shippingAddress } = await priceCart(cart, session)
    if (payment.method === "razorpay" && payment.amount !== totals.total) {
      throw conflict("The amount paid doesn't match your bag's total.", "amount_mismatch")
    }

    for (const item of items) {
      const taken = await db.products().updateOne(
        {
          _id: item.productId,
          variants: {
            $elemMatch: { _id: item.variantId, $or: [{ manageInventory: false }, { allowBackorder: true }, { stock: { $gte: item.quantity } }] },
          },
        },
        { $inc: { "variants.$[v].stock": -item.quantity } },
        { arrayFilters: [{ "v._id": item.variantId, "v.manageInventory": true, "v.allowBackorder": false }], session }
      )
      if (!taken.matchedCount) throw conflict(`${item.productTitle} (${item.variantTitle}) just sold out`, "out_of_stock")
    }

    for (const promo of promotions) {
      const used = await db.promotions().updateOne(
        { _id: promo._id, $or: [{ usageLimit: null }, { usageLimit: { $exists: false } }, { $expr: { $lt: ["$usageCount", "$usageLimit"] } }] },
        { $inc: { usageCount: 1 } },
        { session }
      )
      if (!used.matchedCount) throw conflict(`The code ${promo.code} has been used up`, "invalid_promotion")
    }

    const counter = await db.counters().findOneAndUpdate({ _id: "order" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after", session })
    const now = new Date()
    const online = payment.method === "razorpay"
    const doc: OrderDoc = {
      _id: newId("order"),
      displayId: 1000 + (counter?.seq ?? 1),
      cartId: cart._id,
      regionId: region._id,
      currency: cart.currency,
      customerId: cart.customerId ?? actorId ?? null,
      email,
      items,
      shippingAddress,
      billingAddress: cart.billingAddress ?? shippingAddress,
      shippingOption,
      ...(cart.buyerGstin ? { buyerGstin: cart.buyerGstin } : {}),
      ...(cart.deliveryInstructions ? { deliveryInstructions: cart.deliveryInstructions } : {}),
      promoCodes: cart.promoCodes,
      totals,
      paymentMethod: payment.method,
      paymentStatus: online ? "paid" : "awaiting",
      ...(online
        ? {
            paymentDetails: {
              provider: "razorpay" as const,
              transactionId: payment.razorpayPaymentId,
              razorpayOrderId: payment.razorpayOrderId,
              razorpayPaymentId: payment.razorpayPaymentId,
              paidAt: payment.paidAt,
            },
          }
        : {}),
      fulfillmentStatus: "unfulfilled",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    }
    await db.orders().insertOne(doc, { session })
    const closed = await db
      .carts()
      .updateOne({ _id: cart._id, completedAt: null }, { $set: { completedAt: now, orderId: doc._id, items, updatedAt: now } }, { session })
    if (!closed.matchedCount) throw conflict("This cart has already been checked out", "cart_completed")

    if (online) {
      const marked = await db
        .paymentAttempts()
        .updateOne(
          { _id: payment.attemptId, status: { $in: ["created", "failed", "expired"] } },
          { $set: { status: "paid", orderId: doc._id, paymentId: payment.razorpayPaymentId, updatedAt: now } },
          { session }
        )
      if (!marked.matchedCount) throw conflict("This payment was already used for an order.", "attempt_used")
    }

    // Warehouse-managed lines are reserved at the best warehouse now; an
    // order nobody can deliver fails here and the whole placement rolls back.
    const actor = doc.customerId ? { type: "customer" as const, id: doc.customerId } : SYSTEM
    await allocate(doc, items.map((i) => ({ itemId: i._id, quantity: i.quantity })), { actor, method: "auto", reason: "Order placed", variantAlreadyDecremented: true }, session)
    await recordTransition({ machine: "order", entityId: doc._id, orderId: doc._id, from: null, to: "pending", actor }, session)
    await recordTransition({ machine: "payment", entityId: doc._id, orderId: doc._id, from: null, to: doc.paymentStatus, actor, reason: online ? `Razorpay ${payment.razorpayPaymentId}` : "Cash on delivery" }, session)
    for (const promo of promotions) {
      await db.couponRedemptions().insertOne(
        { _id: newId("crm"), code: promo.code, promotionId: promo._id, customerId: doc.customerId, cartId: cart._id, orderId: doc._id, status: "redeemed", createdAt: now },
        { session }
      )
    }
    // One invoice per issuer: each marketplace seller for their items, the store for its own and delivery.
    for (const part of await invoiceParts(doc, region)) {
      const seller = part.sellerId ? await db.sellers().findOne({ _id: part.sellerId }, { session }) : null
      const { sellerId, ...lines } = part
      await db.invoices().insertOne(
        {
          _id: newId("inv"),
          invoiceNumber: seller ? `${seller.code}/INV-${now.getFullYear()}-${doc.displayId}` : `INV-${now.getFullYear()}-${doc.displayId}`,
          orderId: doc._id,
          displayId: doc.displayId,
          customerName: `${doc.shippingAddress.firstName} ${doc.shippingAddress.lastName}`,
          ...(doc.buyerGstin ? { customerGstin: doc.buyerGstin.gstin, customerLegalName: doc.buyerGstin.legalName } : {}),
          shippingAddress: doc.shippingAddress,
          billingAddress: doc.billingAddress,
          ...lines,
          currency: doc.currency,
          status: online ? "paid" : "issued",
          ...(seller && sellerId
            ? {
                sellerId,
                issuer: {
                  legalName: seller.legalName ?? seller.displayName,
                  gstin: seller.gstin ?? null,
                  address: seller.registeredAddress ? `${seller.registeredAddress.line1}, ${seller.registeredAddress.city} ${seller.registeredAddress.postalCode}` : "",
                  state: seller.registeredAddress?.state ?? "",
                },
              }
            : {}),
          issuedAt: now,
        },
        { session }
      )
    }
    await db.outboxEvents().insertOne(
      {
        _id: newId("outbox"),
        topic: "order.placed",
        payload: { orderId: doc._id, displayId: doc.displayId, email: doc.email, total: doc.totals.total, paymentMethod: payment.method },
        status: "pending",
        retryCount: 0,
        createdAt: now,
      },
      { session }
    )
    await db.notifications().insertOne(
      {
        _id: newId("notif"),
        recipientType: "customer",
        recipientId: doc.customerId ?? doc.email,
        type: "order_confirmation",
        title: online ? `Order #${doc.displayId} confirmed` : `Order #${doc.displayId} placed (COD)`,
        message: online
          ? `Your payment was verified and order #${doc.displayId} is confirmed.`
          : `Your Cash on Delivery order #${doc.displayId} has been confirmed.`,
        channel: "in_app",
        status: "unread",
        metadata: { orderId: doc._id, displayId: doc.displayId },
        createdAt: now,
      },
      { session }
    )
    return { order: doc, created: true }
  })
}
