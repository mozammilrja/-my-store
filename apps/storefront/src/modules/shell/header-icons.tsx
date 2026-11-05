"use client"

import { retrieveCart } from "@lib/data/shop"
import { CART_UPDATED_EVENT } from "@lib/util/cart-events"
import { useWishlist } from "@lib/util/wishlist"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { usePathname } from "next/navigation"
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
  const pathname = usePathname()

  // Re-read the bag on every navigation, when the tab regains focus, and
  // whenever anything changes it, so one failed request can't leave the
  // badge stale for the rest of the visit.
  useEffect(() => {
    let alive = true
    const load = () => {
      retrieveCart()
        .then((cart) => alive && setBag(cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0))
        .catch(() => {})
    }
    load()
    const onVisible = () => document.visibilityState === "visible" && load()
    window.addEventListener(CART_UPDATED_EVENT, load)
    window.addEventListener("focus", load)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      alive = false
      window.removeEventListener(CART_UPDATED_EVENT, load)
      window.removeEventListener("focus", load)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [pathname])

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
