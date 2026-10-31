import { cn } from "@/lib/utils"
import type { Product } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HeartIcon, StarIcon } from "lucide-react"
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

const quickVariants = (product: Product): QuickVariant[] =>
  product.variants.map((v) => ({ id: v.id, inStock: v.inStock && v.price !== null, options: v.options }))

/**
 * Stitch Editorial Product Card:
 * Architectural precision, 3:4 portrait crop, subtle hover zoom,
 * status badge, Wishlist quick button, Quick Add bar, and Atelier meta block.
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

  const discountPercent =
    onSale && cheapest && cheapest.compareAtPrice
      ? Math.round(((cheapest.compareAtPrice - cheapest.price!) / cheapest.compareAtPrice) * 100)
      : null

  return (
    <article
      className={cn(
        "group/card relative flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 border border-border/50",
        className
      )}
      data-testid="product-wrapper"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low">
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
                  "object-cover transition-transform duration-500 ease-out group-hover/card:scale-105 motion-reduce:transition-none",
                  second && "group-hover/card:opacity-0"
                )}
              />
              {second && (
                <Image
                  src={second}
                  alt=""
                  fill
                  sizes={sizes}
                  className="object-cover opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
                />
              )}
            </>
          ) : (
            <span className="flex h-full items-center justify-center font-label-caps text-xs text-muted-foreground">
              No image
            </span>
          )}
        </LocalizedClientLink>

        {/* Status Badges from Stitch Design System */}
        {(onSale || isNew) && (
          <div className="pointer-events-none absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
            {onSale && (
              <span className="bg-secondary-container text-on-secondary-fixed px-2 py-0.5 rounded font-label-caps text-[11px] uppercase font-bold tracking-tight shadow-xs">
                {discountPercent ? `-${discountPercent}%` : "Sale"}
              </span>
            )}
            {isNew && (
              <span className="bg-success/10 text-success px-2 py-0.5 rounded font-label-caps text-[11px] uppercase font-bold tracking-tight shadow-xs">
                New
              </span>
            )}
          </div>
        )}

        {/* Wishlist Quick Action Heart Button */}
        <button
          type="button"
          aria-label="Add to wishlist"
          className="absolute top-2.5 right-2.5 size-7 sm:size-8 rounded-full bg-surface-container-lowest/80 backdrop-blur-xs hover:bg-surface-container-lowest text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shadow-xs z-10 cursor-pointer"
        >
          <HeartIcon className="size-3.5" />
        </button>

        {/* Quick Add Action Bar */}
        <QuickAdd
          title={product.title}
          variants={quickVariants(product)}
          className="absolute inset-x-2 bottom-2 translate-y-[calc(100%+0.5rem)] opacity-0 transition-all duration-300 ease-out group-hover/card:translate-y-0 group-hover/card:opacity-100 focus-within:translate-y-0 focus-within:opacity-100 max-lg:hidden z-20"
        />
      </div>

      {/* Product Meta Block */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="font-label-caps text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">
            Everwear Atelier
          </span>
          <Heading className="font-headline-sm text-sm sm:text-base font-medium leading-snug line-clamp-2 text-foreground" data-testid="product-title">
            <LocalizedClientLink
              href={href}
              className="after:absolute after:inset-0 after:content-[''] hover:underline hover:underline-offset-2 lg:after:hidden"
            >
              {product.title}
            </LocalizedClientLink>
          </Heading>

          {/* Rating */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="flex items-center text-brand-champagne text-[12px]">
              <StarIcon className="size-3 fill-brand-champagne text-brand-champagne" />
              <span className="font-label-sm text-xs font-bold ml-1 text-foreground">4.9</span>
            </div>
            {sizeCount > 1 && (
              <span className="text-[11px] text-muted-foreground font-body-sm">
                · {sizeCount} sizes
              </span>
            )}
          </div>
        </div>

        {/* Pricing row with compareAt line-through */}
        <div className="flex items-baseline justify-between pt-1 border-t border-border/40">
          {range && cheapest ? (
            <p className="flex items-baseline gap-2 text-sm tabular-nums" data-testid="price">
              <span className={cn("font-bold text-foreground", onSale && "text-secondary font-bold")}>
                {range.max > range.min && <span className="font-normal text-muted-foreground text-xs">From </span>}
                {formatMoney(range.min, product.currency)}
              </span>
              {onSale && cheapest.compareAtPrice !== null && (
                <span className="text-xs text-muted-foreground line-through font-normal" data-testid="original-price">
                  {formatMoney(cheapest.compareAtPrice, product.currency)}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Price unavailable</p>
          )}

          {/* Color swatches */}
          {colors.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="sr-only">Colours: {colors.join(", ")}</span>
              {colors.slice(0, 4).map((c) => (
                <span
                  key={c}
                  aria-hidden
                  className="size-2.5 rounded-full border border-black/15 shadow-2xs"
                  style={{ backgroundColor: SWATCHES[c.toLowerCase()] ?? "#d4d4d4" }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
