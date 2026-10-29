import { Badge } from "@/components/reui/badge"
import { cn } from "@/lib/utils"
import type { Product } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { QuickAdd, QuickVariant } from "./quick-add"

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

const quickVariants = (product: Product): QuickVariant[] =>
  product.variants.map((v) => ({ id: v.id, inStock: v.inStock && v.price !== null, options: v.options }))

/**
 * Product tile: packshot on a light surface, quick add on hover, colour
 * swatches and price from the backend. "Sale" only when the backend price is
 * below the original; "New" only when the merchant tagged it `new-arrival`.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
  className,
  headingLevel = "h3",
}: ProductCardProps) {
  const Heading = headingLevel
  const range = product.priceRange
  const cheapest = range ? product.variants.find((v) => v.price === range.min) : undefined
  const onSale = !!cheapest?.compareAtPrice
  const isNew = product.tags.includes("new-arrival")
  const image = product.thumbnail ?? product.images[0]
  const second = product.images.find((url) => url !== image)
  const colors = product.options.find((o) => o.title.toLowerCase() === "color")?.values ?? []
  const sizeCount = product.options.find((o) => o.title.toLowerCase() === "size")?.values.length ?? 0
  const href = `/products/${product.handle}`

  return (
    <div className={cn("group/card relative flex flex-col gap-3", className)} data-testid="product-wrapper">
      <div className="relative aspect-[4/5] overflow-hidden bg-surface">
        <LocalizedClientLink href={href} className="absolute inset-0" tabIndex={-1} aria-hidden>
          {image ? (
            <>
              <Image
                src={image}
                alt=""
                fill
                sizes={sizes}
                loading={priority ? "eager" : "lazy"}
                className={cn(
                  "scale-[1.12] object-cover transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-[1.18] motion-reduce:transition-none",
                  second && "group-hover/card:opacity-0"
                )}
              />
              {second && (
                <Image
                  src={second}
                  alt=""
                  fill
                  sizes={sizes}
                  className="scale-[1.12] object-cover opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
                />
              )}
            </>
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</span>
          )}
        </LocalizedClientLink>

        {(onSale || isNew) && (
          <div className="pointer-events-none absolute top-3 left-3 flex gap-1.5">
            {onSale && <Badge variant="destructive">Sale</Badge>}
            {isNew && <Badge variant="invert">New</Badge>}
          </div>
        )}

        <QuickAdd
          title={product.title}
          variants={quickVariants(product)}
          className="absolute inset-x-2 bottom-2 translate-y-[calc(100%+0.5rem)] opacity-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:translate-y-0 group-hover/card:opacity-100 focus-within:translate-y-0 focus-within:opacity-100 max-lg:hidden"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Heading className="text-sm leading-snug font-semibold" data-testid="product-title">
          <LocalizedClientLink href={href} className="after:absolute after:inset-0 after:content-[''] hover:underline hover:underline-offset-4 lg:after:hidden">
            {product.title}
          </LocalizedClientLink>
        </Heading>
        {range && cheapest ? (
          <p className="flex items-baseline gap-2 text-sm tabular-nums" data-testid="price">
            <span className={cn("font-bold", onSale && "text-destructive-foreground")}>
              {range.max > range.min && <span className="font-normal text-muted-foreground">From </span>}
              {formatMoney(range.min, product.currency)}
            </span>
            {onSale && cheapest.compareAtPrice !== null && (
              <span className="text-xs text-muted-foreground line-through" data-testid="original-price">
                {formatMoney(cheapest.compareAtPrice, product.currency)}
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Price unavailable</p>
        )}
        {(colors.length > 0 || sizeCount > 1) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {colors.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="sr-only">Colours: {colors.join(", ")}</span>
                {colors.slice(0, 5).map((c) => (
                  <span
                    key={c}
                    aria-hidden
                    className="size-3 rounded-full border border-black/15"
                    style={{ backgroundColor: SWATCHES[c.toLowerCase()] ?? "#d4d4d4" }}
                  />
                ))}
              </span>
            )}
            {sizeCount > 1 && <span>{sizeCount} sizes</span>}
          </div>
        )}
      </div>
    </div>
  )
}
