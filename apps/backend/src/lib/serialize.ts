import type { ProductDoc, RegionDoc, OrderDoc } from "../db/schema.js"
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

/** Order as the storefront shopper sees it: sanitized IDs, computed line totals, resolved asset URLs. */
export function toStoreOrder(o: OrderDoc) {
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
          pickupScheduledAt: o.shipment.pickupScheduledAt?.toISOString(),
          estimatedDelivery: o.shipment.estimatedDelivery?.toISOString(),
        }
      : undefined,
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
