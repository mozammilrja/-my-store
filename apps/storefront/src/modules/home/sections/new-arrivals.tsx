import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import { ProductCard } from "@/components/store/product-card"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/** Newest products: one feature tile beside a grid of four, then a row of three. */
export function NewArrivals({ products }: { products: HttpTypes.StoreProduct[] }) {
  if (products.length === 0) {
    return (
      <section className="py-20">
        <Container className="flex flex-col items-start gap-4">
          <h2 className="font-display text-4xl tracking-tight">New in</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            The catalog is empty. Add products in the Medusa admin, or run the
            demo seed script, and they will appear here.
          </p>
        </Container>
      </section>
    )
  }

  const [feature, ...rest] = products

  return (
    <section aria-labelledby="new-arrivals-title" className="bg-card py-20 lg:py-28">
      <Container className="flex flex-col gap-10">
        <div className="flex items-end justify-between gap-6">
          <h2 id="new-arrivals-title" className="font-display text-4xl tracking-tight sm:text-5xl">
            New in
          </h2>
          <Button asChild variant="link" className="px-0">
            <LocalizedClientLink href="/store?sortBy=created_at">View all new arrivals</LocalizedClientLink>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
          <ProductCard
            product={feature}
            className="col-span-2 lg:row-span-2"
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
          {rest.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </section>
  )
}
