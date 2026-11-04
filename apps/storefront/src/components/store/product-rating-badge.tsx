import { cn } from "@/lib/utils"
import { StarIcon } from "lucide-react"

type ProductRatingBadgeProps = {
  rating: number
  ratingCount: number
  className?: string
}

/** 2300 -> "2.3k", the way a listing abbreviates review volume. */
export const compactCount = (n: number) => {
  if (n < 1000) return String(n)
  const k = n / 1000
  return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`
}

/**
 * The rating chip that sits on the bottom-left of a product image.
 * Only rendered when the product actually has approved reviews.
 */
export function ProductRatingBadge({
  rating,
  ratingCount,
  className,
}: ProductRatingBadgeProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-2 left-2 z-[5] flex cursor-default items-center gap-1",
        "bg-surface-container-lowest/95 px-1.5 py-0.5 shadow-xs backdrop-blur-xs",
        className
      )}
      data-testid="product-rating-badge"
    >
      <span className="text-[11px] font-bold leading-none text-foreground tabular-nums">
        {rating.toFixed(1)}
      </span>
      <StarIcon
        aria-hidden
        className="size-2.5 fill-[#14958f] text-[#14958f]"
      />
      <span aria-hidden className="text-[11px] leading-none text-border">
        |
      </span>
      <span className="text-[11px] font-medium leading-none text-muted-foreground tabular-nums">
        {compactCount(ratingCount)}
      </span>
      <span className="sr-only">
        Rated {rating.toFixed(1)} out of 5 from {ratingCount} review
        {ratingCount === 1 ? "" : "s"}
      </span>
    </div>
  )
}
