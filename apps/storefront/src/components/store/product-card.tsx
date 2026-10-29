import { Badge } from "@/components/reui/badge"
import { cn } from "@/lib/utils"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

type ProductCardProps = {
  product: HttpTypes.StoreProduct
  /** Load the image eagerly (above-the-fold cards). */
  priority?: boolean
  sizes?: string
  className?: string
  /** h2 directly under a page title (listings), h3 under a section heading. */
  headingLevel?: "h2" | "h3"
}

/**
 * Product tile: 4:5 image, name, price from the backend. "Sale" appears only
 * when the backend price is below the original price; "New" only when the
 * merchant tagged the product `new-arrival`.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
  className,
  headingLevel = "h3",
}: ProductCardProps) {
  const Heading = headingLevel
  const { cheapestPrice } = getProductPrice({ product })
  const amounts = new Set(
    (product.variants ?? [])
      .map((v) => v.calculated_price?.calculated_amount)
      .filter((a): a is number => typeof a === "number")
  )
  const onSale =
    !!cheapestPrice &&
    cheapestPrice.calculated_price_number < cheapestPrice.original_price_number
  const isNew = product.tags?.some((t) => t.value === "new-arrival")
  const image = product.thumbnail ?? product.images?.[0]?.url

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className={cn("group flex flex-col gap-3", className)}
      data-testid="product-wrapper"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            sizes={sizes}
            loading={priority ? "eager" : "lazy"}
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
        {(onSale || isNew) && (
          <div className="absolute top-3 left-3 flex gap-1.5">
            {onSale && <Badge variant="destructive">Sale</Badge>}
            {isNew && <Badge variant="invert">New</Badge>}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <Heading className="text-sm font-medium tracking-tight group-hover:underline group-hover:underline-offset-4" data-testid="product-title">
          {product.title}
        </Heading>
        {cheapestPrice ? (
          <p className="flex items-baseline gap-2 text-sm tabular-nums" data-testid="price">
            <span className={cn(onSale && "text-destructive-foreground")}>
              {amounts.size > 1 && <span className="text-muted-foreground">From </span>}
              {cheapestPrice.calculated_price}
            </span>
            {onSale && (
              <span className="text-xs text-muted-foreground line-through" data-testid="original-price">
                {cheapestPrice.original_price}
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Price unavailable</p>
        )}
      </div>
    </LocalizedClientLink>
  )
}
