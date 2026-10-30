import { Container } from "@/components/store/container"
import { ProductCard } from "@/components/store/product-card"
import type { Product } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRightIcon } from "lucide-react"

/** A titled grid of products styled with Stitch editorial precision. */
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
    <section aria-labelledby={id} className="py-12 sm:py-16">
      <Container className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-2 border-b border-border/40">
          <div className="flex flex-col gap-1.5">
            {eyebrow && (
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-secondary" />
                <span className="font-label-caps text-[10px] sm:text-[11px] font-bold tracking-[0.14em] text-secondary uppercase">
                  {eyebrow}
                </span>
              </div>
            )}
            <h2 id={id} className="font-headline-xl text-2xl sm:text-4xl lg:text-5xl font-light tracking-tight text-foreground">
              {title}
            </h2>
          </div>
          <LocalizedClientLink
            href={href}
            className="group inline-flex shrink-0 items-center gap-1.5 font-label-sm text-xs uppercase tracking-wider font-bold text-foreground hover:text-secondary transition-colors"
          >
            {linkLabel}
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
          </LocalizedClientLink>
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
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
