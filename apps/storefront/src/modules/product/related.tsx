import { Container } from "@/components/store/container"
import { ProductCard } from "@/components/store/product-card"
import type { Product } from "@lib/api/types"
import { listCollections, listProducts } from "@lib/data/catalog"

/**
 * Up to four products from the same collection, then the same category,
 * falling back to the newest products.
 */
export async function Related({ product, countryCode }: { product: Product; countryCode: string }) {
  const find = (query: Parameters<typeof listProducts>[0]) =>
    listProducts({ ...query, exclude: [product.id], limit: 4 })
      .then((r) => r.products)
      .catch(() => [] as Product[])

  let related: Product[] = []
  let title = "You may also like"

  if (product.collectionId) {
    related = await find({ country: countryCode, collection: [product.collectionId] })
    if (related.length) {
      const collection = (await listCollections()).find((c) => c.id === product.collectionId)
      title = `More from ${collection?.title ?? "this collection"}`
    }
  }
  if (related.length < 2 && product.categoryIds.length) {
    related = await find({ country: countryCode, category: product.categoryIds })
  }
  if (related.length < 2) {
    related = await find({ country: countryCode, sort: "newest" })
    title = "New in"
  }
  if (related.length === 0) return null

  return (
    <section aria-labelledby="related-title" className="border-t py-20" data-testid="related-products-container">
      <Container className="flex flex-col gap-10">
        <h2 id="related-title" className="font-display-tight text-5xl">
          {title}
        </h2>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
          {related.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
