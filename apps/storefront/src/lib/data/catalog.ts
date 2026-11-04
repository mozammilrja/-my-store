import "server-only"
import { cache } from "react"
import { api, ApiError } from "../api/client"
import type { Category, Collection, Facets, Product, ProductList, Region, RegionPolicies } from "../api/types"

/** Catalog data changes rarely; a short cache keeps pages fast. */
const CATALOG = { revalidate: 60, tags: ["catalog"] }

export const listRegions = cache(async () => (await api<{ regions: Region[] }>("/store/regions", { cache: CATALOG })).regions)

/** The region that ships to a country code, or null. */
export const getRegion = cache(async (countryCode: string) => {
  const code = countryCode.toLowerCase()
  return (await listRegions()).find((r) => r.countries.some((c) => c.code === code)) ?? null
})

export const listCountryCodes = (regions: Region[]) => regions.flatMap((r) => r.countries.map((c) => c.code))

export const listCategories = cache(async () => (await api<{ categories: Category[] }>("/store/categories", { cache: CATALOG })).categories)

export const listCollections = cache(async () => (await api<{ collections: Collection[] }>("/store/collections", { cache: CATALOG })).collections)

const orNull = async <T>(p: Promise<T>) => {
  try {
    return await p
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null
    throw e
  }
}

export const getCategory = cache(async (handle: string) =>
  orNull(api<{ category: Category }>(`/store/categories/${encodeURIComponent(handle)}`, { cache: CATALOG }).then((r) => r.category))
)

export const getCollection = cache(async (handle: string) =>
  orNull(api<{ collection: Collection }>(`/store/collections/${encodeURIComponent(handle)}`, { cache: CATALOG }).then((r) => r.collection))
)

export type ProductSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "title"
  | "rating"
  | "popularity"
  | "discount"

export type ProductQuery = {
  country: string
  q?: string
  category?: string[]
  collection?: string[]
  tag?: string[]
  brand?: string[]
  option?: string[]
  size?: string[]
  color?: string[]
  id?: string[]
  exclude?: string[]
  /** Inclusive price bounds in the region currency, minor units. */
  minPrice?: number
  maxPrice?: number
  minDiscount?: number
  minRating?: number
  inStock?: boolean
  onSale?: boolean
  sort?: ProductSort
  page?: number
  limit?: number
}

export const listProducts = cache(async (query: ProductQuery) =>
  api<ProductList>("/store/products", {
    query: {
      ...query,
      onSale: query.onSale ? "true" : undefined,
      inStock: query.inStock ? "true" : undefined,
    },
    cache: CATALOG,
  })
)

/** Product detail skips the catalog TTL so admin image updates show up immediately. */
export const getProduct = cache(async (handle: string, country: string) =>
  orNull(
    api<{ product: Product }>(`/store/products/${encodeURIComponent(handle)}`, {
      query: { country },
      cache: "no-store",
    }).then((r) => r.product)
  )
)

export const getFacets = cache(
  async (query: { country: string; q?: string; category?: string[]; collection?: string[] }) =>
  api<Facets>("/store/facets", { query, cache: CATALOG })
)

/** Region policies for a country (delivery times, returns), or null. */
export const getStorePolicies = cache(async (countryCode: string) => {
  const regions = await listRegions()
  const code = countryCode.toLowerCase()
  const current = regions.find((r) => r.countries.some((c) => c.code === code))
  const policies: RegionPolicies | null =
    current?.policies ??
    (code === "in"
      ? {
          returnWindowDays: 14,
          freeReturns: true,
          shippingRate: 0,
          handlingDays: { min: 1, max: 2 },
          transitDays: { min: 2, max: 4 },
        }
      : null)
  return {
    current: policies,
    currency: current?.currency ?? "inr",
    regions: regions.flatMap((r) => (r.policies ? [{ id: r.id, name: r.name, currency: r.currency, policies: r.policies }] : [])),
  }
})
