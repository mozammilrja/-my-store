import type { ProductDoc, RegionDoc } from "../db/schema.js"

/** Never expose exact stock beyond what a shopper can buy in one go. */
const MAX_VISIBLE_STOCK = 99

export const isInStock = (v: ProductDoc["variants"][number]) => !v.manageInventory || v.allowBackorder || v.stock > 0

/** Product as the shop sees it: prices only in the region's currency, stock as availability. */
export function toStoreProduct(product: ProductDoc, region: RegionDoc) {
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
      inStock: isInStock(v),
      available: !v.manageInventory || v.allowBackorder ? MAX_VISIBLE_STOCK : Math.min(v.stock, MAX_VISIBLE_STOCK),
      images: v.images ?? [],
    }
  })
  const priced = variants.map((v) => v.price).filter((p): p is number => p !== null)

  return {
    id: product._id,
    handle: product.handle,
    title: product.title,
    subtitle: product.subtitle ?? null,
    description: product.description ?? null,
    thumbnail: product.thumbnail ?? product.images[0] ?? null,
    images: product.images,
    categoryIds: product.categoryIds,
    collectionId: product.collectionId ?? null,
    tags: product.tags,
    options: product.options,
    material: product.material ?? null,
    originCountry: product.originCountry ?? null,
    weight: product.weight ?? null,
    currency,
    priceRange: priced.length ? { min: Math.min(...priced), max: Math.max(...priced) } : null,
    onSale: variants.some((v) => v.compareAtPrice !== null),
    variants,
    createdAt: product.createdAt,
  }
}

export type StoreProduct = ReturnType<typeof toStoreProduct>
