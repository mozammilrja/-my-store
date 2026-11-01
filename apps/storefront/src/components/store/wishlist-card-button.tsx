"use client"

import { useWishlist } from "@lib/util/wishlist"
import { HeartIcon } from "lucide-react"
import { toast } from "sonner"

export function WishlistCardButton({
  productId,
  productTitle,
}: {
  productId: string
  productTitle: string
}) {
  const { isSaved, toggle } = useWishlist()
  const saved = isSaved(productId)

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const added = toggle(productId)
    if (added) {
      toast.success(`Saved ${productTitle} to your wishlist`)
    } else {
      toast.info(`Removed ${productTitle} from wishlist`)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      className="absolute top-2.5 right-2.5 size-7 sm:size-8 rounded-full bg-surface-container-lowest/90 backdrop-blur-xs hover:bg-surface-container-lowest text-muted-foreground hover:text-foreground flex items-center justify-center transition-all shadow-xs z-10 cursor-pointer"
    >
      <HeartIcon
        className={`size-3.5 transition-colors ${
          saved ? "fill-[#913b94] text-[#913b94]" : "text-muted-foreground hover:text-foreground"
        }`}
      />
    </button>
  )
}
