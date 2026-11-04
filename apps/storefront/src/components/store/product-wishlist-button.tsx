"use client"

import { cn } from "@/lib/utils"
import { useProductWishlist } from "@lib/util/wishlist"
import { HeartIcon } from "lucide-react"
import { toast } from "sonner"

type ProductWishlistButtonProps = {
  productId: string
  productTitle: string
  /** `icon` is the corner heart; `bar` is the full-width button on hover. */
  appearance?: "icon" | "bar"
  className?: string
}

/**
 * Saves a product, against the account when signed in and against
 * localStorage otherwise. The shared store updates first and rolls back if
 * the write is refused, so the heart never lies about what was stored.
 */
export function ProductWishlistButton({
  productId,
  productTitle,
  appearance = "icon",
  className,
}: ProductWishlistButtonProps) {
  const { isSaved, isPending, toggle } = useProductWishlist()
  const saved = isSaved(productId)
  const pending = isPending(productId)

  const onClick = async (event: React.MouseEvent) => {
    // The whole image is a link; saving must not follow it.
    event.preventDefault()
    event.stopPropagation()
    if (pending) return
    try {
      const added = await toggle(productId)
      if (added) toast.success(`Saved ${productTitle} to your wishlist`)
      else toast.info(`Removed ${productTitle} from wishlist`)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "We couldn't update your wishlist."
      )
    }
  }

  const label = saved
    ? `Remove ${productTitle} from wishlist`
    : `Save ${productTitle} to wishlist`

  if (appearance === "bar") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={label}
        aria-busy={pending}
        data-testid="product-card-wishlist-bar"
        className={cn(
          "flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-[#d4d5d9] bg-surface-container-lowest",
          "py-1.5 text-[12px] font-bold uppercase tracking-wide text-foreground",
          "transition-colors duration-150 hover:border-[#282c3f] motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          pending ? "cursor-wait opacity-70" : "cursor-pointer",
          className
        )}
      >
        <HeartIcon
          aria-hidden
          className={cn("size-4", saved && "fill-[#ff3f6c] text-[#ff3f6c]")}
        />
        {saved ? "Wishlisted" : "Wishlist"}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      aria-busy={pending}
      data-testid="product-card-wishlist"
      className={cn(
        "absolute right-2 top-2 z-[7] flex size-7 items-center justify-center rounded-full sm:size-8",
        "bg-surface-container-lowest/90 shadow-xs backdrop-blur-xs",
        "transition-colors duration-150 hover:bg-surface-container-lowest motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        pending ? "cursor-wait" : "cursor-pointer",
        className
      )}
    >
      <HeartIcon
        aria-hidden
        className={cn(
          "size-3.5 transition-colors motion-reduce:transition-none",
          saved ? "fill-[#ff3f6c] text-[#ff3f6c]" : "text-muted-foreground"
        )}
      />
    </button>
  )
}
