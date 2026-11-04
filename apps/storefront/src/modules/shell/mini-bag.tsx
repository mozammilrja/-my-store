"use client"

import { formatMoney } from "@lib/money"
import { retrieveCart } from "@lib/data/shop"
import { CART_UPDATED_EVENT } from "@lib/util/cart-events"
import type { Cart } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ShoppingBagIcon } from "lucide-react"
import { useEffect, useState } from "react"

const countItems = (cart?: Cart | null) =>
  cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

/**
 * Stitch Bag Navigation Trigger.
 * Matches Stitch Everwear design directly: clicking the bag button navigates
 * to the dedicated Shopping Bag experience (/cart) without opening any sidebar drawer.
 */
export function MiniBag() {
  const [cart, setCart] = useState<Cart | null>(null)

  useEffect(() => {
    const load = () => {
      retrieveCart()
        .then((next) => setCart(next))
        .catch(() => {})
    }
    load()
    window.addEventListener(CART_UPDATED_EVENT, load)
    return () => window.removeEventListener(CART_UPDATED_EVENT, load)
  }, [])

  const count = countItems(cart)

  return (
    <LocalizedClientLink
      href="/cart"
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors group cursor-pointer"
      aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}
      data-testid="nav-cart-link"
    >
      <div className="relative flex items-center">
        <ShoppingBagIcon className="size-[22px] text-on-surface" />
        {count > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 size-[18px] bg-secondary text-on-secondary font-label-caps text-[11px] rounded-full flex items-center justify-center font-bold"
            data-testid="nav-cart-count"
          >
            {count}
          </span>
        )}
      </div>
      <div className="hidden sm:flex flex-col text-left">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase leading-none">
          Bag
        </span>
        <span className="font-label-sm text-label-sm text-on-surface font-semibold leading-tight">
          {cart && count > 0
            ? formatMoney(cart.totals.total, cart.currency)
            : "Empty"}
        </span>
      </div>
    </LocalizedClientLink>
  )
}
