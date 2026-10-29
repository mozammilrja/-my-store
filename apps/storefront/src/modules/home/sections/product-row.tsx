import { Container } from "@/components/store/container"
import { ProductCard } from "@/components/store/product-card"
import type { Product } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRightIcon } from "lucide-react"

/** A titled grid of products with a "view all" link. */
export function ProductRow({
  id,
  title,
  eyebrow,
  products,
  href,
  linkLabel,
}: {
  id: string
  title: string
  eyebrow?: string
  products: Product[]
  href: string
  linkLabel: string
}) {
  // Whole rows only: 4 per row on desktop (2 on mobile divides evenly too).
  const shown = products.length >= 4 ? products.slice(0, products.length - (products.length % 4)) : products
  if (shown.length === 0) return null

  return (
    <section aria-labelledby={id} className="py-14 lg:py-20">
      <Container className="flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex flex-col gap-2">
            {eyebrow && <span className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">{eyebrow}</span>}
            <h2 id={id} className="font-display-tight text-5xl sm:text-6xl">
              {title}
            </h2>
          </div>
          <LocalizedClientLink
            href={href}
            className="group inline-flex shrink-0 items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase"
          >
            {linkLabel}
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </LocalizedClientLink>
        </div>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
          {shown.map((product, i) => (
            <li key={product.id}>
              <ProductCard product={product} priority={i < 4} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
