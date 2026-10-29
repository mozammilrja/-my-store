import { listCategories, listCollections, listProducts } from "@lib/data/catalog"
import type { Product } from "@lib/api/types"

export type Showcase = {
  id: string
  title: string
  href: string
  count: number
  image: string | null
}

/** Everything the home page needs, fetched in parallel. */
export async function getHomeData(countryCode: string) {
  const [recent, categories, collections] = await Promise.all([
    // One request covers new arrivals and the merchant's "bestseller" tags.
    listProducts({ country: countryCode, sort: "newest", limit: 60 }).then((r) => r.products),
    listCategories().catch(() => []),
    listCollections().catch(() => []),
  ])

  // First product image per category/collection, from the same request.
  const firstImage = (match: (p: Product) => boolean) => recent.find((p) => match(p) && p.thumbnail)?.thumbnail ?? null

  const categoryShowcase: Showcase[] = categories
    .filter((c) => !c.parentId && (c.productCount ?? 0) > 0)
    .map((c) => ({
      id: c.id,
      title: c.name,
      href: `/categories/${c.handle}`,
      count: c.productCount ?? 0,
      image: firstImage((p) => p.categoryIds.includes(c.id)),
    }))
  const collectionShowcase: Showcase[] = collections
    .filter((c) => (c.productCount ?? 0) > 0)
    .map((c) => ({
      id: c.id,
      title: c.title,
      href: `/collections/${c.handle}`,
      count: c.productCount ?? 0,
      image: firstImage((p) => p.collectionId === c.id),
    }))

  const latest = recent.slice(0, 8)
  const tagged = recent.filter((p) => p.tags.includes("bestseller"))
  // Without merchant tags, fall back to products after the first row.
  const bestsellers = (tagged.length >= 4 ? tagged : recent.slice(8)).slice(0, 8)

  return {
    latest,
    bestsellers,
    bestsellersTagged: tagged.length >= 4,
    categories: categoryShowcase,
    collections: collectionShowcase,
  }
}
