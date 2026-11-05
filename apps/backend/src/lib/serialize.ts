import type { ProductDoc, RegionDoc, OrderDoc, ShipmentDoc } from "../db/schema.js"
import { env } from "../env.js"

export const assetUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) return path
  if (path.startsWith("/images/")) return path
  return `${env.API_PUBLIC_URL}${path}`
}

/** Never expose exact stock beyond what a shopper can buy in one go. */
const MAX_VISIBLE_STOCK = 99

/** A product carrying this tag is a paid placement and renders an AD badge. */
export const SPONSORED_TAG = "sponsored"

export const isInStock = (v: ProductDoc["variants"][number]) => !v.manageInventory || v.allowBackorder || v.stock > 0

/** Whole-percent saving of a price against its compare-at, or null when it is not a saving. */
export const discountPercent = (price: number | null, compareAt: number | null) =>
  price !== null && compareAt !== null && compareAt > price
    ? Math.round(((compareAt - price) / compareAt) * 100)
    : null

/** Product as the shop sees it: prices only in the region's currency, stock as availability. */
export function toStoreProduct(
  product: ProductDoc,
  region: RegionDoc,
  reviewStats?: { rating: number | null; ratingCount: number }
) {
  const currency = region.currency
  const variants = product.variants.map((v) => {
    const price = v.prices[currency]
    const compareAt = v.compareAtPrices?.[currency]
    return {
      id: v._id,
      title: v.title,
      sku: v.sku ?? null,
      options: v.options,
      price: price ?? null,
      compareAtPrice: compareAt && price !== undefined && compareAt > price ? compareAt : null,
      discountPercent: discountPercent(
        price ?? null,
        compareAt && price !== undefined && compareAt > price ? compareAt : null
      ),
      inStock: isInStock(v),
      available: !v.manageInventory || v.allowBackorder ? MAX_VISIBLE_STOCK : Math.min(v.stock, MAX_VISIBLE_STOCK),
      images: (v.images ?? []).map(assetUrl),
    }
  })
  const priced = variants.map((v) => v.price).filter((p): p is number => p !== null)

  // The card quotes the cheapest variant, so its MRP and saving are the headline figures.
  const cheapest = priced.length
    ? variants.reduce<(typeof variants)[number] | null>(
        (best, v) => (v.price !== null && (best === null || v.price < best.price!) ? v : best),
        null
      )
    : null
  const comparable = variants
    .map((v) => v.compareAtPrice)
    .filter((p): p is number => p !== null)

  const brand =
    product.brand ??
    product.tags?.find((t) => t.startsWith("brand:"))?.replace("brand:", "") ??
    "Everwear"

  return {
    id: product._id,
    handle: product.handle,
    title: product.title,
    subtitle: product.subtitle ?? null,
    brand,
    rating: reviewStats?.rating ?? null,
    ratingCount: reviewStats?.ratingCount ?? 0,
    description: product.description ?? null,
    thumbnail: product.thumbnail ?? product.images[0] ? assetUrl((product.thumbnail ?? product.images[0])!) : null,
    images: product.images.map(assetUrl),
    categoryIds: product.categoryIds,
    collectionId: product.collectionId ?? null,
    tags: product.tags,
    options: product.options,
    material: product.material ?? null,
    originCountry: product.originCountry ?? null,
    weight: product.weight ?? null,
    currency,
    priceRange: priced.length ? { min: Math.min(...priced), max: Math.max(...priced) } : null,
    compareAtPriceRange: comparable.length
      ? { min: Math.min(...comparable), max: Math.max(...comparable) }
      : null,
    /** MRP of the cheapest variant, so price, MRP and saving on a card always agree. */
    compareAtPrice: cheapest?.compareAtPrice ?? null,
    discountPercent: cheapest ? discountPercent(cheapest.price, cheapest.compareAtPrice) : null,
    onSale: variants.some((v) => v.compareAtPrice !== null),
    sponsored: product.tags.includes(SPONSORED_TAG),
    inStock: variants.some((v) => v.inStock),
    variants,
    createdAt: product.createdAt,
  }
}

export type StoreProduct = ReturnType<typeof toStoreProduct>

/** Doorstep preferences can change only before the parcel leaves. */
export const canEditDeliveryPreferences = (o: Pick<OrderDoc, "status" | "fulfillmentStatus" | "shipment">) =>
  o.status !== "canceled" && o.fulfillmentStatus === "unfulfilled" && !o.shipment

/**
 * The carrier scans recorded on a shipment, oldest first (the order they
 * happened in, so a timeline reads top to bottom). Only what the shipment
 * itself recorded is returned.
 */
export const toStoreTrackingEvents = (s: Pick<ShipmentDoc, "trackingEvents">) =>
  [...(s.trackingEvents ?? [])]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((e) => ({
      timestamp: new Date(e.timestamp).toISOString(),
      status: e.status,
      location: e.location,
      note: e.note,
    }))

/**
 * Order as the storefront shopper sees it: sanitized IDs, computed line totals, resolved asset URLs.
 *
 * Pass `tracking` (the order's outbound shipment, or null when none was
 * found) to include `shipment.events`; callers that did not look the shipment
 * up leave it out, and then `events` is absent rather than an empty list.
 */
export function toStoreOrder(o: OrderDoc, tracking?: ShipmentDoc | null) {
  return {
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
    buyerGstin: o.buyerGstin ?? null,
    deliveryInstructions: o.deliveryInstructions ?? null,
    promoCodes: o.promoCodes,
    totals: o.totals,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    fulfillmentStatus: o.fulfillmentStatus,
    shipment: o.shipment
      ? {
          carrier: o.shipment.carrier,
          awb: o.shipment.awb,
          status: o.shipment.status,
          labelUrl: o.shipment.labelUrl,
          trackingUrl: o.shipment.trackingUrl,
          pickupScheduledAt: o.shipment.pickupScheduledAt?.toISOString(),
          estimatedDelivery: o.shipment.estimatedDelivery?.toISOString(),
          shippedAt: o.shipment.shippedAt?.toISOString(),
          deliveredAt: o.shipment.deliveredAt?.toISOString(),
          ...(tracking === undefined ? {} : { events: tracking ? toStoreTrackingEvents(tracking) : [] }),
        }
      : undefined,
    /** Doorstep slot and options the shopper picked; absent until they choose. */
    deliveryPreferences: o.deliveryPreferences
      ? {
          slot: o.deliveryPreferences.slot,
          options: o.deliveryPreferences.options,
          updatedAt: o.deliveryPreferences.updatedAt.toISOString(),
        }
      : undefined,
    /** Whether the doorstep preferences can still be changed (not yet shipped, delivered or canceled). */
    preferencesEditable: canEditDeliveryPreferences(o),
    /** When the payment was captured (online, or COD once collected); absent while it is still due. */
    paidAt: o.paymentDetails?.paidAt?.toISOString(),
    /** The payment gateway's own reference for the payment, when there is one (never set for COD). */
    paymentReference: o.paymentDetails?.razorpayPaymentId,
    returnRequest: o.returnRequest
      ? {
          status: o.returnRequest.status,
          reason: o.returnRequest.reason,
          items: o.returnRequest.items,
          returnAwb: o.returnRequest.returnAwb,
          carrier: o.returnRequest.carrier,
          requestedAt: o.returnRequest.requestedAt?.toISOString(),
        }
      : undefined,
    status: o.status,
    createdAt: o.createdAt,
  }
}

export type StoreOrder = ReturnType<typeof toStoreOrder>
