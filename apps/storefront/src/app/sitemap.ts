import { listCategories, listCollections, listProducts, listRegions } from "@lib/data/catalog"
import { getDefaultCountryCode, getSiteOrigin, listCountryCodes } from "@lib/util/site"
import type { MetadataRoute } from "next"

const STATIC_PATHS = ["", "/store", "/shipping", "/returns", "/terms", "/privacy", "/contact"]
const PAGE_SIZE = 100

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [origin, regions, categories, collections] = await Promise.all([getSiteOrigin(), listRegions(), listCategories(), listCollections()])
  const country = getDefaultCountryCode(regions)
  if (!country) return []

  // Product handles are the same in every region; list them once.
  const products: { handle: string }[] = []
  for (let page = 1; ; page++) {
    const result = await listProducts({ country, page, limit: PAGE_SIZE, sort: "newest" })
    products.push(...result.products)
    if (page >= result.pages) break
  }

  return listCountryCodes(regions).flatMap((code) => {
    const base = `${origin}/${code}`
    return [
      ...STATIC_PATHS.map((path) => ({ url: `${base}${path}` })),
      ...products.map((p) => ({ url: `${base}/products/${p.handle}` })),
      ...categories.map((c) => ({ url: `${base}/categories/${c.handle}` })),
      ...collections.map((c) => ({ url: `${base}/collections/${c.handle}` })),
    ]
  })
}
