"use client"

import { retrieveCart } from "@lib/data/shop"
import { CART_UPDATED_EVENT } from "@lib/util/cart-events"
import type { Cart } from "@lib/api/types"
import { HeaderAction } from "./header-action"
import { ShoppingBagIcon } from "lucide-react"
import { useEffect, useState } from "react"

const countItems = (cart?: Cart | null) =>
  cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

/**
 * Header bag link: icon, item count and a "Bag" label. Clicking opens the
 * shopping bag page (/cart).
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
    <HeaderAction
      href="/cart"
      icon={ShoppingBagIcon}
      label="Bag"
      ariaLabel={`Bag, ${count} ${count === 1 ? "item" : "items"}`}
      count={count}
      testId="nav-cart-link"
      countTestId="nav-cart-count"
    />
  )
}
