import { Router, type Request } from "express"
import { buildInvoiceLines, dispatchWarehouse } from "../../lib/invoice.js"
import type { ClientSession } from "mongodb"
import { z } from "zod"
import { withTransaction } from "../../db/client.js"
import { db, type CartDoc, type LineItem, type OrderDoc, type ProductDoc, type RegionDoc } from "../../db/schema.js"
import { optionalAuth, requireAuth } from "../../lib/auth.js"
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { regionForCountry } from "../../lib/regions.js"
import { assetUrl, canEditDeliveryPreferences, isInStock, toStoreOrder } from "../../lib/serialize.js"
import { computeTotals, promotionUsable } from "../../lib/totals.js"
import { address, buyerGstin, email } from "../../lib/validation.js"
import { executeIdempotent } from "../../lib/idempotency.js"

/** Most units of one variant a single cart line may hold. */
export const MAX_LINE_QUANTITY = 10

const cartId = z.string().regex(/^cart_[0-9a-z]{16}$/, "invalid cart id")
const quantity = z.coerce.number().int().min(1).max(MAX_LINE_QUANTITY)

const loadCart = async (id: string, session?: ClientSession) => {
  const cart = await db.carts().findOne({ _id: cartId.parse(id) }, { session })
  if (!cart) throw notFound("Cart")
  return cart
}

const loadRegion = async (id: string, session?: ClientSession) => {
  const region = await db.regions().findOne({ _id: id }, { session })
  if (!region) throw notFound("Region")
  return region
}

const findVariant = (product: ProductDoc | null, variantId: string) => product?.variants.find((v) => v._id === variantId)

/**
 * Re-reads every line from the catalog: current price in the cart currency,
 * titles and images. Lines whose product or price no longer exists are dropped.
 */
async function refreshItems(items: LineItem[], currency: string, session?: ClientSession) {
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

async function serializeCart(cart: CartDoc, region: RegionDoc, removed: string[] = []) {
  // Units each line could be raised to right now, so the bag can say "Only 2
  // left" or "Sold out" instead of failing when the shopper changes quantity.
  const stock = new Map<string, number>()
  if (!cart.completedAt && cart.items.length) {
    const products = await db
      .products()
      .find({ _id: { $in: [...new Set(cart.items.map((i) => i.productId))] } }, { projection: { variants: 1 } })
      .toArray()
    for (const p of products) for (const v of p.variants) stock.set(v._id, allowedUnits(v))
  }
  const promotions = cart.promoCodes.length ? await db.promotions().find({ code: { $in: cart.promoCodes } }).toArray() : []
  const totals = computeTotals(cart, region, promotions)
  return {
    id: cart._id,
    regionId: cart.regionId,
    currency: cart.currency,
    countryCodes: region.countries.map((c) => c.code),
    email: cart.email ?? null,
    customerId: cart.customerId ?? null,
    items: cart.items.map((i) => ({
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
      available: stock.get(i.variantId) ?? null,
    })),
    shippingAddress: cart.shippingAddress ?? null,
    billingAddress: cart.billingAddress ?? null,
    shippingOptionId: cart.shippingOptionId ?? null,
    buyerGstin: cart.buyerGstin ?? null,
    deliveryInstructions: cart.deliveryInstructions ?? null,
    shippingOptions: region.shippingOptions.map((s) => ({ id: s._id, name: s.name, amount: s.amount })),
    promoCodes: cart.promoCodes,
    totals,
    completed: !!cart.completedAt,
    orderId: cart.orderId ?? null,
    removedItems: removed,
    updatedAt: cart.updatedAt,
  }
}

/** Loads a cart, refreshes its prices, saves any change and returns the shop view. */
async function freshCart(id: string) {
  const cart = await loadCart(id)
  const region = await loadRegion(cart.regionId)
  if (cart.completedAt) return serializeCart(cart, region)
  const { items, removed } = await refreshItems(cart.items, cart.currency)
  if (removed.length || items.some((i, n) => i.unitPrice !== cart.items[n]?.unitPrice)) {
    await db.carts().updateOne({ _id: cart._id }, { $set: { items, updatedAt: new Date() } })
  }
  return serializeCart({ ...cart, items }, region, removed)
}

const openCart = async (id: string) => {
  const cart = await loadCart(id)
  if (cart.completedAt) throw conflict("This cart has already been checked out", "cart_completed")
  return cart
}

/** Total units of a variant the cart may hold, given stock. */
const allowedUnits = (variant: ProductDoc["variants"][number]) =>
  !variant.manageInventory || variant.allowBackorder ? MAX_LINE_QUANTITY : Math.min(MAX_LINE_QUANTITY, variant.stock)

export const cartRoutes = Router()
cartRoutes.use(optionalAuth("customer"))

/**
 * A bag that belongs to an account is only visible to that account. Without
 * this, anyone holding the cart id (a signed-out browser that kept the
 * cookie, or a shared device) would see the customer's bag, email and
 * addresses. Answers "not found" rather than "forbidden" so ids can't be probed.
 * Guest bags (no customerId) work as before.
 */
cartRoutes.use("/carts/:id", async (req, _res, next) => {
  const parsed = cartId.safeParse(req.params.id)
  if (!parsed.success) return next()
  const cart = await db.carts().findOne({ _id: parsed.data }, { projection: { customerId: 1 } })
  if (cart?.customerId && cart.customerId !== req.actorId) throw notFound("Cart")
  next()
})

cartRoutes.post("/carts", async (req, res) => {
  const body = z.object({ country: z.string().regex(/^[a-zA-Z]{2}$/) }).parse(req.body)
  const region = await regionForCountry(body.country)
  const now = new Date()
  const customerId = req.actorId
  const customer = customerId ? await db.customers().findOne({ _id: customerId }) : null
  const cart: CartDoc = {
    _id: newId("cart"),
    regionId: region._id,
    currency: region.currency,
    customerId: customer?._id ?? null,
    ...(customer ? { email: customer.email } : {}),
    items: [],
    promoCodes: [],
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.carts().insertOne(cart)
  res.status(201).json({ cart: await serializeCart(cart, region) })
})

/**
 * The signed-in customer's most recent open bag with something in it, for the
 * storefront to restore on sign-in (Myntra-style: the bag follows the
 * account, not the browser). `country` keeps it to the shopper's region,
 * since prices and currency are per region. Null when there is none.
 */
cartRoutes.get("/customers/me/cart", requireAuth("customer"), async (req, res) => {
  const query = z.object({ country: z.string().regex(/^[a-zA-Z]{2}$/).optional() }).parse(req.query)
  const region = query.country ? await regionForCountry(query.country) : null
  const cart = await db.carts().findOne(
    {
      customerId: req.actorId!,
      completedAt: null,
      "items.0": { $exists: true },
      ...(region ? { regionId: region._id } : {}),
    },
    { sort: { updatedAt: -1 }, projection: { _id: 1 } }
  )
  res.json({ cartId: cart?._id ?? null })
})

cartRoutes.get("/carts/:id", async (req, res) => {
  res.json({ cart: await freshCart(req.params.id) })
})

cartRoutes.post("/carts/:id/items", async (req, res) => {
  const body = z.object({ variantId: z.string().min(1).max(100), quantity }).parse(req.body)
  const cart = await openCart(req.params.id)
  const product = await db.products().findOne({ "variants._id": body.variantId, status: "published" })
  const variant = findVariant(product, body.variantId)
  if (!product || !variant) throw notFound("Product variant")
  if (variant.prices[cart.currency] === undefined) throw badRequest("This product isn't sold in your region", "not_sold_in_region")
  if (!isInStock(variant)) throw conflict("This item is out of stock", "out_of_stock")

  const existing = cart.items.find((i) => i.variantId === body.variantId)
  const next = (existing?.quantity ?? 0) + body.quantity
  if (next > allowedUnits(variant)) {
    throw conflict(`Only ${allowedUnits(variant)} of this item can be added`, "insufficient_stock")
  }
  const items = existing
    ? cart.items.map((i) => (i._id === existing._id ? { ...i, quantity: next } : i))
    : [
        ...cart.items,
        {
          _id: newId("item"),
          productId: product._id,
          variantId: variant._id,
          productTitle: product.title,
          productHandle: product.handle,
          variantTitle: variant.title,
          ...(product.thumbnail ? { thumbnail: product.thumbnail } : {}),
          quantity: body.quantity,
          unitPrice: variant.prices[cart.currency]!,
        },
      ]
  // Only write if nobody completed the cart in between.
  const result = await db.carts().updateOne({ _id: cart._id, completedAt: null }, { $set: { items, updatedAt: new Date() } })
  if (!result.matchedCount) throw conflict("This cart has already been checked out", "cart_completed")
  res.json({ cart: await freshCart(cart._id) })
})

cartRoutes.patch("/carts/:id/items/:itemId", async (req, res) => {
  const body = z.object({ quantity }).parse(req.body)
  const cart = await openCart(req.params.id)
  const item = cart.items.find((i) => i._id === req.params.itemId)
  if (!item) throw notFound("Cart item")
  const product = await db.products().findOne({ "variants._id": item.variantId })
  const variant = findVariant(product, item.variantId)
  if (!variant) throw notFound("Product variant")
  if (body.quantity > allowedUnits(variant)) {
    throw conflict(`Only ${allowedUnits(variant)} of this item are available`, "insufficient_stock")
  }
  await db.carts().updateOne(
    { _id: cart._id, completedAt: null, "items._id": item._id },
    { $set: { "items.$.quantity": body.quantity, updatedAt: new Date() } }
  )
  res.json({ cart: await freshCart(cart._id) })
})

cartRoutes.delete("/carts/:id/items/:itemId", async (req, res) => {
  const cart = await openCart(req.params.id)
  await db.carts().updateOne({ _id: cart._id, completedAt: null }, { $pull: { items: { _id: req.params.itemId } }, $set: { updatedAt: new Date() } })
  res.json({ cart: await freshCart(cart._id) })
})

cartRoutes.patch("/carts/:id", async (req, res) => {
  const body = z
    .object({
      email: email.optional(),
      shippingAddress: address.optional(),
      billingAddress: address.optional(),
      /** The business buyer's GSTIN for the tax invoice; null removes it. */
      buyerGstin: buyerGstin.nullable().optional(),
      /** A note for the courier; an empty string removes it. */
      deliveryInstructions: z.string().trim().max(300).optional(),
      /** Move the cart to another country's region (prices and shipping change). */
      country: z.string().regex(/^[a-zA-Z]{2}$/).optional(),
    })
    .strict()
    .parse(req.body)
  const cart = await openCart(req.params.id)
  const set: Partial<CartDoc> = { updatedAt: new Date() }
  let resetShipping = false

  const region = await loadRegion(cart.regionId)
  const country = body.country ?? body.shippingAddress?.countryCode
  if (country && !region.countries.some((r) => r.code === country.toLowerCase())) {
    // A new country can mean a new region: other currency, prices and delivery options.
    const next = await regionForCountry(country)
    set.regionId = next._id
    set.currency = next.currency
    set.items = (await refreshItems(cart.items, next.currency)).items
    resetShipping = true
  }
  if (body.email) set.email = body.email
  if (body.shippingAddress) set.shippingAddress = body.shippingAddress
  if (body.billingAddress) set.billingAddress = body.billingAddress
  if (body.buyerGstin) set.buyerGstin = body.buyerGstin

  const unset: Record<string, ""> = {}
  if (resetShipping) unset.shippingOptionId = ""
  if (body.buyerGstin === null) unset.buyerGstin = ""
  if (body.deliveryInstructions) set.deliveryInstructions = body.deliveryInstructions
  else if (body.deliveryInstructions === "") unset.deliveryInstructions = ""
  await db
    .carts()
    .updateOne({ _id: cart._id, completedAt: null }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) })
  res.json({ cart: await freshCart(cart._id) })
})

/** Attaches the signed-in customer to a guest cart (after login or sign-up). */
// The extra middleware hides the path from Express's param typing, so it is named here.
cartRoutes.post("/carts/:id/customer", requireAuth("customer"), async (req: Request<{ id: string }>, res) => {
  const cart = await openCart(req.params.id)
  const customerId = req.actorId!
  if (cart.customerId && cart.customerId !== customerId) throw forbidden("This cart belongs to another customer")
  const customer = await db.customers().findOne({ _id: customerId })
  if (!customer) throw notFound("Customer")
  await db.carts().updateOne({ _id: cart._id, completedAt: null }, { $set: { customerId, email: customer.email, updatedAt: new Date() } })
  res.json({ cart: await freshCart(cart._id) })
})

cartRoutes.post("/carts/:id/shipping", async (req, res) => {
  const body = z.object({ optionId: z.string().min(1).max(100) }).parse(req.body)
  const cart = await openCart(req.params.id)
  const region = await loadRegion(cart.regionId)
  if (!region.shippingOptions.some((s) => s._id === body.optionId)) throw badRequest("That delivery option isn't available here")
  await db.carts().updateOne({ _id: cart._id, completedAt: null }, { $set: { shippingOptionId: body.optionId, updatedAt: new Date() } })
  res.json({ cart: await freshCart(cart._id) })
})

cartRoutes.post("/carts/:id/promotions", async (req, res) => {
  const body = z
    .object({ codes: z.array(z.string().trim().toUpperCase().min(1).max(64)).max(5) })
    .parse(req.body)
  const cart = await openCart(req.params.id)
  const codes = [...new Set(body.codes)]
  const found = await db.promotions().find({ code: { $in: codes } }).toArray()
  const invalid = codes.filter((code) => {
    const promo = found.find((p) => p.code === code)
    return !promo || !promotionUsable(promo, cart.currency)
  })
  if (invalid.length) throw badRequest(`The code ${invalid.join(", ")} isn't valid`, "invalid_promotion")
  await db.carts().updateOne({ _id: cart._id, completedAt: null }, { $set: { promoCodes: codes, updatedAt: new Date() } })
  res.json({ cart: await freshCart(cart._id) })
})

/**
 * Places a cash-on-delivery order. Everything happens in one transaction:
 * re-price, check and take stock, count promotion usage, number the order,
 * close the cart. If anything fails, nothing is written.
 */
cartRoutes.post("/carts/:id/complete", async (req, res) => {
  const id = cartId.parse(req.params.id)
  const actorId = req.actorId
  const idempotencyKey = (req.headers["idempotency-key"] as string) || (req.body as any)?.idempotencyKey

  const placeCodOrder = async () => {
    const order = await withTransaction(async (session) => {
      const cart = await loadCart(id, session)
      if (cart.completedAt) {
        // Completing twice returns the same order instead of charging twice.
        const existing = await db.orders().findOne({ cartId: cart._id }, { session })
        if (existing) return existing
      }
      const region = await loadRegion(cart.regionId, session)
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
        if (!taken.matchedCount) throw conflict(`${item.productTitle} (${item.variantTitle}) just sold out`, "out_of_stock")
      }

      const promotions = cart.promoCodes.length ? await db.promotions().find({ code: { $in: cart.promoCodes } }, { session }).toArray() : []
      for (const promo of promotions) {
        if (!promotionUsable(promo, cart.currency)) throw conflict(`The code ${promo.code} can no longer be used`, "invalid_promotion")
        const used = await db.promotions().updateOne(
          { _id: promo._id, $or: [{ usageLimit: null }, { usageLimit: { $exists: false } }, { $expr: { $lt: ["$usageCount", "$usageLimit"] } }] },
          { $inc: { usageCount: 1 } },
          { session }
        )
        if (!used.matchedCount) throw conflict(`The code ${promo.code} has been used up`, "invalid_promotion")
      }

      const counter = await db.counters().findOneAndUpdate(
        { _id: "order" },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: "after", session }
      )
      const now = new Date()
      const customerId = cart.customerId ?? actorId ?? null
      const doc: OrderDoc = {
        _id: newId("order"),
        displayId: 1000 + (counter?.seq ?? 1),
        cartId: cart._id,
        regionId: region._id,
        currency: cart.currency,
        customerId,
        email: cart.email,
        items,
        shippingAddress: cart.shippingAddress,
        billingAddress: cart.billingAddress ?? cart.shippingAddress,
        shippingOption,
        ...(cart.buyerGstin ? { buyerGstin: cart.buyerGstin } : {}),
        ...(cart.deliveryInstructions ? { deliveryInstructions: cart.deliveryInstructions } : {}),
        promoCodes: cart.promoCodes,
        totals: computeTotals({ ...cart, items }, region, promotions),
        paymentMethod: "cod",
        paymentStatus: "awaiting",
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
            reason: `Order #${doc.displayId} placement (COD)`,
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

      // Generate initial Invoice
      const invoiceNumber = `INV-${new Date().getFullYear()}-${doc.displayId}`
      await db.invoices().insertOne(
        {
          _id: newId("inv"),
          invoiceNumber,
          orderId: doc._id,
          displayId: doc.displayId,
          customerName: `${doc.shippingAddress.firstName} ${doc.shippingAddress.lastName}`,
          ...(doc.buyerGstin ? { customerGstin: doc.buyerGstin.gstin, customerLegalName: doc.buyerGstin.legalName } : {}),
          shippingAddress: doc.shippingAddress,
          billingAddress: doc.billingAddress,
          // Lines and totals that add up to what the order charged.
          ...buildInvoiceLines(doc, region),
          currency: doc.currency,
          status: "issued",
          issuedAt: now,
        },
        { session }
      )

      // Transactional Outbox Event
      await db.outboxEvents().insertOne(
        {
          _id: newId("outbox"),
          topic: "order.placed",
          payload: { orderId: doc._id, displayId: doc.displayId, email: doc.email, total: doc.totals.total, paymentMethod: "cod" },
          status: "pending",
          retryCount: 0,
          createdAt: now,
        },
        { session }
      )

      // In-app Notification
      await db.notifications().insertOne(
        {
          _id: newId("notif"),
          recipientType: "customer",
          recipientId: doc.customerId ?? doc.email,
          type: "order_confirmation",
          title: `Order #${doc.displayId} Placed (COD)`,
          message: `Your Cash on Delivery order #${doc.displayId} has been confirmed.`,
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
    const result = await executeIdempotent(idempotencyKey, "cart_checkout", { cartId: id, actorId }, placeCodOrder)
    res.status(result.status).json(result.body)
    return
  }

  const result = await placeCodOrder()
  res.status(result.status).json(result.body)
})

export { toStoreOrder }

/**
 * An order is visible to its customer (token) or to whoever holds the cart it
 * was placed from (the `x-cart-id` header the shop keeps in an httpOnly cookie).
 */
/**
 * The GST tax invoice raised when an order was placed. Same access rule as
 * the order: the account that placed it, or the browser that just did.
 */
cartRoutes.get("/orders/:id/invoice", async (req, res) => {
  const order = await db.orders().findOne({ _id: z.string().regex(/^order_[0-9a-z]{16}$/).parse(req.params.id) })
  if (!order) throw notFound("Order")
  const ownsByAccount = !!req.actorId && order.customerId === req.actorId
  const ownsByCart = req.get("x-cart-id") === order.cartId
  if (!ownsByAccount && !ownsByCart) throw forbidden("You can't view this invoice")
  const invoice = await db.invoices().findOne({ orderId: order._id })
  if (!invoice) throw notFound("Invoice")
  const { _id, issuedAt, ...rest } = invoice
  const dispatchFrom = await dispatchWarehouse(order._id)
  res.json({ invoice: { id: _id, ...rest, issuedAt: issuedAt.toISOString(), dispatchFrom } })
})

cartRoutes.get("/orders/:id", async (req, res) => {
  const order = await db.orders().findOne({ _id: z.string().regex(/^order_[0-9a-z]{16}$/).parse(req.params.id) })
  if (!order) throw notFound("Order")
  const actorId = req.actorId
  const ownsByAccount = !!actorId && order.customerId === actorId
  const ownsByCart = req.get("x-cart-id") === order.cartId
  if (!ownsByAccount && !ownsByCart) throw forbidden("You can't view this order")
  // The outbound shipment's carrier scans, for the tracking page.
  const tracking = order.shipment?.awb
    ? await db.shipments().findOne({ orderId: order._id, awb: order.shipment.awb, isReturn: false })
    : null
  // Where it ships from (same rule as the invoice), for the tracking route card.
  const dispatchFrom = await dispatchWarehouse(order._id)
  res.json({ order: { ...toStoreOrder(order, tracking), dispatchFrom } })
})

const deliveryPreferencesBody = z
  .object({
    slot: z.enum(["morning", "evening"]).nullable(),
    options: z.object({ measuringTape: z.boolean().optional(), reusableBox: z.boolean().optional() }).strict().default({}),
  })
  .strict()

/**
 * The shopper's doorstep slot and options. Same access rule as reading the
 * order; refused once the order has shipped, been delivered or canceled.
 */
cartRoutes.patch("/orders/:id/delivery-preferences", async (req, res) => {
  const id = z.string().regex(/^order_[0-9a-z]{16}$/).parse(req.params.id)
  const body = deliveryPreferencesBody.parse(req.body)
  const order = await db.orders().findOne({ _id: id })
  if (!order) throw notFound("Order")
  const ownsByAccount = !!req.actorId && order.customerId === req.actorId
  const ownsByCart = req.get("x-cart-id") === order.cartId
  if (!ownsByAccount && !ownsByCart) throw forbidden("You can't change this order")
  if (!canEditDeliveryPreferences(order)) throw conflict("Delivery preferences can't be changed once an order has shipped or been canceled", "order_not_editable")
  const now = new Date()
  const deliveryPreferences = {
    slot: body.slot,
    options: {
      measuringTape: body.options.measuringTape ?? order.deliveryPreferences?.options.measuringTape ?? false,
      reusableBox: body.options.reusableBox ?? order.deliveryPreferences?.options.reusableBox ?? false,
    },
    updatedAt: now,
  }
  // Conditional on the order still being editable, so a shipment racing this write wins.
  const updated = await db.orders().findOneAndUpdate(
    { _id: id, status: { $ne: "canceled" }, fulfillmentStatus: "unfulfilled", shipment: { $exists: false } },
    { $set: { deliveryPreferences, updatedAt: now } },
    { returnDocument: "after" }
  )
  if (!updated) throw conflict("Delivery preferences can't be changed once an order has shipped or been canceled", "order_not_editable")
  res.json({ order: toStoreOrder(updated) })
})
