import { Router, type Request } from "express"
import type { ClientSession } from "mongodb"
import { z } from "zod"
import { withTransaction } from "../../db/client.js"
import { db, type CartDoc, type LineItem, type OrderDoc, type ProductDoc, type RegionDoc } from "../../db/schema.js"
import { optionalAuth, requireAuth } from "../../lib/auth.js"
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { regionForCountry } from "../../lib/regions.js"
import { assetUrl, isInStock } from "../../lib/serialize.js"
import { computeTotals, promotionUsable } from "../../lib/totals.js"
import { address, email } from "../../lib/validation.js"

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
    })),
    shippingAddress: cart.shippingAddress ?? null,
    billingAddress: cart.billingAddress ?? null,
    shippingOptionId: cart.shippingOptionId ?? null,
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

  await db
    .carts()
    .updateOne({ _id: cart._id, completedAt: null }, { $set: set, ...(resetShipping ? { $unset: { shippingOptionId: "" } } : {}) })
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
    return doc
  })

  res.status(201).json({ order: toStoreOrder(order) })
})

export const toStoreOrder = (o: OrderDoc) => ({
  id: o._id,
  displayId: o.displayId,
  email: o.email,
  currency: o.currency,
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
  shippingAddress: o.shippingAddress,
  billingAddress: o.billingAddress,
  shippingOption: { id: o.shippingOption._id, name: o.shippingOption.name, amount: o.shippingOption.amount },
  promoCodes: o.promoCodes,
  totals: o.totals,
  paymentMethod: o.paymentMethod,
  paymentStatus: o.paymentStatus,
  fulfillmentStatus: o.fulfillmentStatus,
  status: o.status,
  createdAt: o.createdAt,
})

/**
 * An order is visible to its customer (token) or to whoever holds the cart it
 * was placed from (the `x-cart-id` header the shop keeps in an httpOnly cookie).
 */
cartRoutes.get("/orders/:id", async (req, res) => {
  const order = await db.orders().findOne({ _id: z.string().regex(/^order_[0-9a-z]{16}$/).parse(req.params.id) })
  if (!order) throw notFound("Order")
  const actorId = req.actorId
  const ownsByAccount = !!actorId && order.customerId === actorId
  const ownsByCart = req.get("x-cart-id") === order.cartId
  if (!ownsByAccount && !ownsByCart) throw forbidden("You can't view this order")
  res.json({ order: toStoreOrder(order) })
})
