"use client"

import { fetchBag, onCartUpdated } from "@lib/util/cart-events"
import { useWishlist } from "@lib/util/wishlist"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useEffect, useState } from "react"
import { AccountMenu } from "./account-menu"

/**
 * The header's icon row, identical on every route (main site header and the
 * Stitch checkout / order headers): concierge, wishlist with its count, bag
 * with its live item count, and the black account square with the account
 * menu. Styled after the Stitch tracking header.
 */
export function HeaderIcons({
  showConcierge = true,
  initialBag = 0,
}: {
  showConcierge?: boolean
  /** Bag item count rendered on the server, so the badge is right on first paint. */
  initialBag?: number
}) {
  const { count: wishlist } = useWishlist()
  const [bag, setBag] = useState(initialBag)
  // The server rendered the count; after that it changes only when this tab
  // changes the bag (the event carries the new bag) or another tab might
  // have (re-read when this tab is shown again). Reads go through /api/bag,
  // never a server action, so they can't hold up a click.
  useEffect(() => {
    let alive = true
    const apply = (b: { count: number } | null) => alive && b && setBag(b.count)
    const onVisible = () => document.visibilityState === "visible" && void fetchBag().then(apply)
    const off = onCartUpdated(apply)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      alive = false
      off()
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  const icon =
    "relative flex items-center p-2 rounded text-on-surface-variant hover:text-on-surface transition-colors"
  const badge =
    "absolute top-1 right-1 min-w-4 h-4 px-0.5 rounded-full bg-primary text-on-primary text-[10px] font-semibold leading-none flex items-center justify-center"

  return (
    <div className="flex items-center gap-space-xs sm:gap-space-sm">
      {showConcierge && (
        <LocalizedClientLink href="/concierge" title="Concierge" aria-label="Concierge" className={`hidden sm:flex ${icon}`}>
          <span aria-hidden className="material-symbols-outlined text-[22px]">support_agent</span>
        </LocalizedClientLink>
      )}
      <LocalizedClientLink
        href="/account/wishlist"
        title="Wishlist"
        aria-label={`Wishlist, ${wishlist} ${wishlist === 1 ? "item" : "items"}`}
        className={icon}
        data-testid="nav-wishlist-link"
      >
        <span aria-hidden className="material-symbols-outlined text-[22px]">favorite</span>
        {wishlist > 0 && <span className={badge}>{wishlist > 99 ? "99+" : wishlist}</span>}
      </LocalizedClientLink>
      <LocalizedClientLink
        href="/cart"
        title="Shopping Bag"
        aria-label={`Bag, ${bag} ${bag === 1 ? "item" : "items"}`}
        className={icon}
        data-testid="nav-cart-link"
      >
        <span aria-hidden className="material-symbols-outlined text-[22px]">shopping_bag</span>
        {bag > 0 && (
          <span className={badge} data-testid="nav-cart-count">
            {bag > 99 ? "99+" : bag}
          </span>
        )}
      </LocalizedClientLink>
      <div className="ml-space-xs">
        <AccountMenu />
      </div>
    </div>
  )
}
