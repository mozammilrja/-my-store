import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"

export type Showcase = {
  id: string
  title: string
  href: string
  count: number
  image: string | null
}

const firstImage = (p?: HttpTypes.StoreProduct) =>
  p?.thumbnail ?? p?.images?.[0]?.url ?? null

/** Everything the home page needs, fetched in parallel. */
export async function getHomeData(countryCode: string) {
  const [recent, categories, { collections }] = await Promise.all([
    // One request covers new arrivals and the merchant's "bestseller" tags.
    listProducts({
      countryCode,
      queryParams: { limit: 60, order: "-created_at" },
    }).then((r) => r.response.products),
    listCategories({ fields: "id,name,handle,parent_category_id" }).catch(() => []),
    listCollections({ fields: "id,handle,title" }).catch(() => ({ collections: [], count: 0 })),
  ])

  const preview = (query: HttpTypes.StoreProductListParams) =>
    listProducts({ countryCode, queryParams: { ...query, limit: 1 } })
      .then((r) => ({ count: r.response.count, image: firstImage(r.response.products[0]) }))
      .catch(() => ({ count: 0, image: null }))

  const [categoryShowcase, collectionShowcase] = await Promise.all([
    Promise.all(
      categories
        .filter((c) => !c.parent_category_id)
        .map(async (c) => ({
          id: c.id,
          title: c.name,
          href: `/categories/${c.handle}`,
          ...(await preview({ category_id: [c.id] })),
        }))
    ),
    Promise.all(
      collections.map(async (c) => ({
        id: c.id,
        title: c.title,
        href: `/collections/${c.handle}`,
        ...(await preview({ collection_id: [c.id] })),
      }))
    ),
  ])

  const latest = recent.slice(0, 8)
  const tagged = recent.filter((p) => p.tags?.some((t) => t.value === "bestseller"))
  // Without merchant tags, fall back to the newest products after the first row.
  const bestsellers = (tagged.length >= 4 ? tagged : recent.slice(8)).slice(0, 8)

  return {
    latest,
    bestsellers,
    bestsellersTagged: tagged.length >= 4,
    categories: categoryShowcase.filter((c) => c.count > 0) as Showcase[],
    collections: collectionShowcase.filter((c) => c.count > 0) as Showcase[],
  }
}
