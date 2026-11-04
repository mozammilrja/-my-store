"use client"

import { Icon } from "@/components/ui/icon"
import { useWishlist } from "@lib/util/wishlist"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export function WishlistButton() {
  const { count } = useWishlist()

  return (
    <LocalizedClientLink
      href="/account/wishlist"
      aria-label="Wishlist"
      className="relative flex flex-col items-center px-2 py-1 text-on-surface-variant hover:text-on-surface transition-colors"
    >
      <Icon name="favorite" size={22} />
      {count > 0 && (
        <span className="absolute top-0 right-1 size-[18px] bg-secondary text-on-secondary font-label-caps text-[10px] rounded-full flex items-center justify-center font-bold">
          {count}
        </span>
      )}
      <span className="hidden lg:inline font-label-caps text-label-caps uppercase mt-1">
        Wishlist
      </span>
    </LocalizedClientLink>
  )
}
