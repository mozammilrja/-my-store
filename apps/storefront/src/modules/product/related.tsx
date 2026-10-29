import { Container } from "@/components/store/container"
import { ProductCard } from "@/components/store/product-card"
import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"

/**
 * Up to four products from the same collection, then the same category.
 * Falls back to the newest products when neither has others.
 */
export async function Related({
  product,
  countryCode,
}: {
  product: HttpTypes.StoreProduct
  countryCode: string
}) {
  const fetch = (query: HttpTypes.StoreProductListParams) =>
    listProducts({ countryCode, queryParams: { limit: 5, ...query } })
      .then((r) => r.response.products.filter((p) => p.id !== product.id))
      .catch(() => [] as HttpTypes.StoreProduct[])

  const categoryIds = (product.categories ?? []).map((c) => c.id)
  let related: HttpTypes.StoreProduct[] = []
  let title = "You may also like"

  if (product.collection_id) {
    related = await fetch({ collection_id: [product.collection_id] })
    if (related.length) title = `More from ${product.collection?.title ?? "this collection"}`
  }
  if (related.length < 2 && categoryIds.length) {
    related = await fetch({ category_id: categoryIds })
  }
  if (related.length < 2) {
    related = await fetch({ order: "-created_at" })
    title = "New in"
  }

  if (related.length === 0) return null

  return (
    <section aria-labelledby="related-title" className="border-t py-20" data-testid="related-products-container">
      <Container className="flex flex-col gap-10">
        <h2 id="related-title" className="font-display-tight text-5xl">
          {title}
        </h2>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
          {related.slice(0, 4).map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
