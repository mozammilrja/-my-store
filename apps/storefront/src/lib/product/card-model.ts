import type { Product, Variant } from "@lib/api/types"

/**
 * Everything a listing card renders, derived from one API product.
 *
 * Built on the server so the card component stays presentational and the
 * numbers on a card can never disagree with the numbers on its product page.
 */
export type ProductCardSize = {
  /** The option value as the catalog spells it, e.g. "M". */
  label: string
  /** The variant to add, or null when this size needs another choice first. */
  variantId: string | null
  inStock: boolean
  /** Units the shopper may buy in one go, capped by the API at 99. */
  available: number
  /** True when the size spans several variants (a colour axis, say). */
  needsMoreChoice: boolean
}

export type ProductCardModel = {
  id: string
  handle: string
  href: string
  title: string
  brand: string
  /** Deduplicated gallery, thumbnail first. */
  images: string[]
  currency: string
  price: number | null
  /** MRP of the quoted variant, null when it is not discounted. */
  compareAtPrice: number | null
  discountPercent: number | null
  priceVaries: boolean
  rating: number | null
  ratingCount: number
  sponsored: boolean
  isNew: boolean
  inStock: boolean
  sizes: ProductCardSize[]
  /** Option title the sizes came from, e.g. "Size". Null when there is none. */
  sizeOptionTitle: string | null
  colors: string[]
  /** True when a size must be picked before anything can go in the bag. */
  requiresSizeChoice: boolean
}

/** Fallback order for size values the catalog did not declare in order. */
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"]

const SIZE_TITLES = new Set(["size", "sizes", "shoe size", "uk size", "eu size"])

const gallery = (product: Product) => {
  const seen = new Set<string>()
  const list: string[] = []
  for (const url of [product.thumbnail, ...product.images]) {
    if (!url || seen.has(url)) continue
    seen.add(url)
    list.push(url)
  }
  return list
}

const sizeRank = (value: string) => {
  const at = SIZE_ORDER.indexOf(value.toUpperCase())
  if (at !== -1) return at
  const numeric = Number.parseFloat(value)
  // Numeric sizes (shoes, waists) sort after lettered ones, in order.
  return Number.isFinite(numeric) ? SIZE_ORDER.length + numeric : SIZE_ORDER.length + 1000
}

/** The variant a card quotes: cheapest, preferring one that can actually be bought. */
const quoted = (variants: Variant[]) => {
  const priced = variants.filter((v) => v.price !== null)
  if (!priced.length) return null
  const buyable = priced.filter((v) => v.inStock)
  const pool = buyable.length ? buyable : priced
  return pool.reduce((best, v) => (v.price! < best.price! ? v : best), pool[0]!)
}

export function buildProductCardModel(product: Product): ProductCardModel {
  const sizeOption =
    product.options.find((o) => SIZE_TITLES.has(o.title.trim().toLowerCase())) ?? null

  const sizes: ProductCardSize[] = sizeOption
    ? [...sizeOption.values]
        .sort((a, b) => sizeRank(a) - sizeRank(b))
        .map((label) => {
          const forSize = product.variants.filter((v) => v.options[sizeOption.title] === label)
          const sellable = forSize.filter((v) => v.inStock)
          // One variant for this size means it can go straight in the bag.
          const only = forSize.length === 1 ? forSize[0]! : null
          return {
            label,
            variantId: only?.id ?? null,
            inStock: sellable.length > 0,
            available: forSize.reduce((max, v) => Math.max(max, v.available), 0),
            needsMoreChoice: forSize.length > 1,
          }
        })
        .filter((s) => s.available > 0 || s.variantId !== null || s.needsMoreChoice)
    : []

  const headline = quoted(product.variants)
  const range = product.priceRange

  return {
    id: product.id,
    handle: product.handle,
    href: `/products/${product.handle}`,
    title: product.title,
    // The API always resolves a brand, but the type allows null.
    brand: product.brand?.trim() || "Everwear",
    images: gallery(product),
    currency: product.currency,
    price: headline?.price ?? range?.min ?? null,
    compareAtPrice: product.compareAtPrice ?? headline?.compareAtPrice ?? null,
    discountPercent: product.discountPercent ?? headline?.discountPercent ?? null,
    priceVaries: !!range && range.max > range.min,
    rating: product.rating ?? null,
    ratingCount: product.ratingCount ?? 0,
    sponsored: product.sponsored === true,
    isNew: product.tags.includes("new-arrival"),
    inStock: product.inStock ?? product.variants.some((v) => v.inStock),
    sizes,
    sizeOptionTitle: sizeOption?.title ?? null,
    colors: product.options.find((o) => o.title.toLowerCase() === "color")?.values ?? [],
    requiresSizeChoice: product.variants.length > 1,
  }
}
