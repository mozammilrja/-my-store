import { cn } from "@/lib/utils"
import type { Product } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ProductCardGallery } from "./product-card-gallery"
import { WishlistCardButton } from "./wishlist-card-button"

/** Swatch fills for colour option values the catalog uses. */
const SWATCHES: Record<string, string> = {
  black: "#111111",
  white: "#ffffff",
  grey: "#9ca3af",
  gray: "#9ca3af",
  navy: "#1e2a4a",
  blue: "#2440d6",
  green: "#3f6b47",
  red: "#c8291d",
  beige: "#d8c8a8",
  brown: "#7a5236",
  sand: "#e7e5e4",
  mocha: "#785b4f",
  ivory: "#fbf9f8",
}

type ProductCardProps = {
  product: Product
  /** Load the image eagerly (above-the-fold cards). */
  priority?: boolean
  sizes?: string
  className?: string
  /** h2 directly under a page title (listings), h3 under a section heading. */
  headingLevel?: "h2" | "h3"
}

const galleryImages = (product: Product) => {
  const seen = new Set<string>()
  const list: string[] = []
  for (const url of [product.thumbnail, ...product.images].filter(Boolean) as string[]) {
    if (seen.has(url)) continue
    seen.add(url)
    list.push(url)
  }
  return list
}

/**
 * Myntra-inspired product listing card:
 * portrait image carousel, wishlist, brand, title, price + MRP + discount.
 * Quick Size / quick-add is intentionally omitted.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw",
  className,
  headingLevel = "h3",
}: ProductCardProps) {
  const Heading = headingLevel
  const range = product.priceRange
  const cheapest = range ? product.variants.find((v) => v.price === range.min) : undefined
  const onSale = !!cheapest?.compareAtPrice && cheapest.compareAtPrice > (cheapest.price ?? 0)
  const isNew = product.tags.includes("new-arrival")
  const images = galleryImages(product)
  const colors = product.options.find((o) => o.title.toLowerCase() === "color")?.values ?? []
  const href = `/products/${product.handle}`

  const discountPercent =
    onSale && cheapest?.compareAtPrice && cheapest.price != null
      ? Math.round(((cheapest.compareAtPrice - cheapest.price) / cheapest.compareAtPrice) * 100)
      : null

  return (
    <article
      className={cn(
        "group/card relative flex h-full flex-col bg-surface-container-lowest",
        className
      )}
      data-testid="product-wrapper"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low">
        <ProductCardGallery
          images={images}
          title={product.title}
          href={href}
          sizes={sizes}
          priority={priority}
        />

        {(onSale || isNew) && (
          <div className="pointer-events-none absolute top-2 left-2 z-10 flex flex-col gap-1">
            {onSale && discountPercent != null && (
              <span className="bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground">
                {discountPercent}% OFF
              </span>
            )}
            {isNew && !onSale && (
              <span className="bg-foreground px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
                New
              </span>
            )}
          </div>
        )}

        <WishlistCardButton productId={product.id} productTitle={product.title} />
      </div>

      <div className="flex flex-1 flex-col gap-1 px-1 pt-2.5 pb-1">
        <span className="text-[12px] font-bold uppercase tracking-wide text-foreground">Everwear</span>

        <Heading
          className="line-clamp-1 text-[13px] font-normal leading-snug text-muted-foreground"
          data-testid="product-title"
        >
          <LocalizedClientLink href={href} className="relative z-[2] hover:text-foreground">
            {product.title}
          </LocalizedClientLink>
        </Heading>

        <div className="mt-auto flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 pt-1 tabular-nums" data-testid="price">
          {range && cheapest?.price != null ? (
            <>
              <span className="text-[14px] font-bold text-foreground">
                {formatMoney(range.min, product.currency)}
              </span>
              {onSale && cheapest.compareAtPrice != null && (
                <>
                  <span
                    className="text-[12px] text-muted-foreground line-through"
                    data-testid="original-price"
                  >
                    {formatMoney(cheapest.compareAtPrice, product.currency)}
                  </span>
                  {discountPercent != null && (
                    <span className="text-[12px] font-semibold text-orange-600 dark:text-orange-400">
                      ({discountPercent}% OFF)
                    </span>
                  )}
                </>
              )}
            </>
          ) : (
            <span className="text-[13px] text-muted-foreground">Price unavailable</span>
          )}
        </div>

        {colors.length > 0 && (
          <div className="flex items-center gap-1 pt-1">
            <span className="sr-only">Colours: {colors.join(", ")}</span>
            {colors.slice(0, 4).map((c) => (
              <span
                key={c}
                aria-hidden
                className="size-2 rounded-full border border-black/15"
                style={{ backgroundColor: SWATCHES[c.toLowerCase()] ?? "#d4d4d4" }}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
