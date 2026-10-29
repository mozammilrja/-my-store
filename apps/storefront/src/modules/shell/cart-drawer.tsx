"use client"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { formatMoney } from "@/components/store/money"
import { deleteLineItem, retrieveCart } from "@lib/data/cart"
import { CART_UPDATED_EVENT, notifyCartUpdated } from "@lib/util/cart-events"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Loader2Icon, ShoppingBagIcon } from "lucide-react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

const countItems = (cart?: HttpTypes.StoreCart | null) =>
  cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0

/**
 * Cart indicator and slide-over bag. Statically rendered pages can't read the
 * cart cookie, so the cart is loaded in the browser and refreshed whenever a
 * mutation dispatches the cart-updated event.
 */
export function CartDrawer() {
  const [cart, setCart] = useState<HttpTypes.StoreCart | null>(null)
  const [open, setOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const knownCount = useRef<number | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const load = () =>
      retrieveCart()
        .then((next) => {
          const count = countItems(next)
          // Open the bag when something was added, except on the first load
          // and on the cart and checkout pages themselves.
          if (
            knownCount.current !== null &&
            count > knownCount.current &&
            !/\/(cart|checkout)/.test(window.location.pathname)
          ) {
            setOpen(true)
          }
          knownCount.current = count
          setCart(next)
        })
        .catch(() => {})

    load()
    window.addEventListener(CART_UPDATED_EVENT, load)
    return () => window.removeEventListener(CART_UPDATED_EVENT, load)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  const count = countItems(cart)
  const items = [...(cart?.items ?? [])].sort((a, b) =>
    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  )

  const remove = async (lineId: string) => {
    setRemoving(lineId)
    try {
      await deleteLineItem(lineId)
      notifyCartUpdated()
    } catch {
      toast.error("Couldn't remove that item. Please try again.")
    } finally {
      setRemoving(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}
          data-testid="nav-cart-link"
        >
          <ShoppingBagIcon aria-hidden />
          <span className="hidden sm:inline">Bag</span>
          <span className="tabular-nums" data-testid="nav-cart-count">
            ({count})
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md" data-testid="nav-cart-dropdown">
        <SheetHeader className="border-b">
          <SheetTitle className="font-display text-2xl font-medium normal-case tracking-tight">
            Your bag
          </SheetTitle>
          <SheetDescription>
            {count === 0 ? "Nothing here yet." : `${count} ${count === 1 ? "item" : "items"}`}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Your bag is empty. Start with the full collection.
            </p>
            <Button asChild>
              <LocalizedClientLink href="/store">Shop all</LocalizedClientLink>
            </Button>
          </div>
        ) : (
          <ul className="flex-1 divide-y overflow-y-auto px-4">
            {items.map((item) => (
              <li key={item.id} className="flex gap-4 py-4" data-testid="cart-item">
                <LocalizedClientLink
                  href={`/products/${item.product_handle}`}
                  className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden bg-muted"
                >
                  {item.thumbnail && (
                    <Image src={item.thumbnail} alt="" fill sizes="80px" className="object-cover" />
                  )}
                </LocalizedClientLink>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <LocalizedClientLink
                      href={`/products/${item.product_handle}`}
                      className="truncate text-sm font-medium hover:underline"
                      data-testid="product-link"
                    >
                      {item.product_title ?? item.title}
                    </LocalizedClientLink>
                    <span className="text-sm tabular-nums">
                      {formatMoney(item.total, cart!.currency_code)}
                    </span>
                  </div>
                  {item.variant_title && (
                    <span className="text-xs text-muted-foreground">{item.variant_title}</span>
                  )}
                  <span className="text-xs text-muted-foreground" data-testid="cart-item-quantity">
                    Qty {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    disabled={removing === item.id}
                    className="mt-auto inline-flex w-fit items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
                    data-testid="cart-item-remove-button"
                  >
                    {removing === item.id && <Loader2Icon className="size-3 animate-spin" aria-hidden />}
                    Remove<span className="sr-only"> {item.product_title}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && cart && (
          <SheetFooter className="border-t">
            <div className="flex items-baseline justify-between text-sm">
              <span>
                Subtotal <span className="text-muted-foreground">(excl. shipping)</span>
              </span>
              <span className="text-base font-semibold tabular-nums" data-testid="cart-subtotal">
                {formatMoney(cart.item_subtotal ?? cart.subtotal, cart.currency_code)}
              </span>
            </div>
            <Button asChild size="lg" className="w-full">
              <LocalizedClientLink href="/checkout?step=address">Checkout</LocalizedClientLink>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <LocalizedClientLink href="/cart" data-testid="go-to-cart-button">
                View bag
              </LocalizedClientLink>
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
