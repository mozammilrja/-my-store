import { Container } from "@/components/store/container"
import { ProductCard } from "@/components/store/product-card"
import type { Product } from "@lib/api/types"
import { listCollections, listProducts } from "@lib/data/catalog"

/**
 * Similar products strip — denser grid like Myntra's "Similar Products".
 */
export async function Related({ product, countryCode }: { product: Product; countryCode: string }) {
  const find = (query: Parameters<typeof listProducts>[0]) =>
    listProducts({ ...query, exclude: [product.id], limit: 8 })
      .then((r) => r.products)
      .catch(() => [] as Product[])

  let related: Product[] = []
  let title = "Similar Products"

  if (product.collectionId) {
    related = await find({ country: countryCode, collection: [product.collectionId] })
    if (related.length) {
      const collection = (await listCollections()).find((c) => c.id === product.collectionId)
      title = `More from ${collection?.title ?? "this collection"}`
    }
  }
  if (related.length < 2 && product.categoryIds.length) {
    related = await find({ country: countryCode, category: product.categoryIds })
    title = "Similar Products"
  }
  if (related.length < 2) {
    related = await find({ country: countryCode, sort: "newest" })
    title = "Customers Also Viewed"
  }
  if (related.length === 0) return null

  return (
    <section aria-labelledby="related-title" className="border-t py-12" data-testid="related-products-container">
      <Container className="flex flex-col gap-6">
        <h2 id="related-title" className="text-xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
