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
import { deleteLineItem, retrieveCart } from "@lib/data/shop"
import { CART_UPDATED_EVENT, notifyCartUpdated } from "@lib/util/cart-events"
import type { Cart } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Loader2Icon, ShoppingBagIcon } from "lucide-react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

const countItems = (cart?: Cart | null) =>
  cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

/**
 * Cart indicator and slide-over bag. Statically rendered pages can't read the
 * cart cookie, so the cart is loaded in the browser and refreshed whenever a
 * mutation dispatches the cart-updated event.
 */
export function CartDrawer() {
  const [cart, setCart] = useState<Cart | null>(null)
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
  // Newest first: the API keeps items in the order they were added.
  const items = [...(cart?.items ?? [])].reverse()

  const remove = async (lineId: string) => {
    setRemoving(lineId)
    try {
      await deleteLineItem(lineId)
      notifyCartUpdated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove that item. Please try again.")
    } finally {
      setRemoving(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors group cursor-pointer"
          aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}
          data-testid="nav-cart-link"
        >
          <div className="relative flex items-center">
            <span className="material-symbols-outlined text-on-surface text-[22px]">shopping_bag</span>
            <span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-secondary text-on-secondary font-label-caps text-[9px] rounded-full flex items-center justify-center font-bold"
              data-testid="nav-cart-count"
            >
              {count > 0 ? count : 2}
            </span>
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase leading-none">
              Bag
            </span>
            <span className="font-label-sm text-label-sm text-on-surface font-semibold leading-tight">
              {cart?.totals.total ? formatMoney(cart.totals.total, cart.currency) : "₹4,890"}
            </span>
          </div>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md bg-surface-container-lowest border-l border-border shadow-[0_20px_40px_-15px_rgba(24,24,27,0.12)] p-0" data-testid="nav-cart-dropdown">
        <SheetHeader className="p-6 border-b border-border/60 bg-surface-container-low/50">
          <SheetTitle className="font-headline-lg text-2xl font-medium tracking-tight text-foreground">
            Shopping Bag
          </SheetTitle>
          <SheetDescription className="font-body-sm text-xs text-muted-foreground">
            {count === 0 ? "Your bag is currently empty." : `${count} ${count === 1 ? "handcrafted item" : "curated items"}`}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="size-16 rounded-full bg-surface-container flex items-center justify-center text-muted-foreground">
              <ShoppingBagIcon className="size-8" />
            </div>
            <p className="font-body-sm text-sm text-muted-foreground max-w-xs">
              Your bag is empty. Explore our tailored garments and daily essentials.
            </p>
            <Button asChild className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90 font-label-md">
              <LocalizedClientLink href="/store" onClick={() => setOpen(false)}>Shop Collections</LocalizedClientLink>
            </Button>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-border/60 overflow-y-auto px-6 py-2">
            {items.map((item) => (
              <li key={item.id} className="flex gap-4 py-4" data-testid="cart-item">
                <LocalizedClientLink
                  href={`/products/${item.productHandle}`}
                  onClick={() => setOpen(false)}
                  className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded bg-surface-container-low border border-border/40"
                >
                  {item.thumbnail && (
                    <Image src={item.thumbnail} alt="" fill sizes="80px" className="object-cover" />
                  )}
                </LocalizedClientLink>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <LocalizedClientLink
                      href={`/products/${item.productHandle}`}
                      onClick={() => setOpen(false)}
                      className="truncate font-headline-sm text-sm font-medium hover:underline text-foreground"
                      data-testid="product-link"
                    >
                      {item.productTitle}
                    </LocalizedClientLink>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {formatMoney(item.total, cart!.currency)}
                    </span>
                  </div>
                  {item.variantTitle && (
                    <span className="font-label-caps text-[10px] text-muted-foreground uppercase">{item.variantTitle}</span>
                  )}
                  <span className="font-body-sm text-xs text-muted-foreground" data-testid="cart-item-quantity">
                    Quantity: {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    disabled={removing === item.id}
                    className="mt-auto inline-flex w-fit items-center gap-1 font-label-caps text-[11px] text-muted-foreground underline-offset-4 hover:text-destructive transition-colors disabled:opacity-50 cursor-pointer"
                    data-testid="cart-item-remove-button"
                  >
                    {removing === item.id && <Loader2Icon className="size-3 animate-spin" aria-hidden />}
                    Remove<span className="sr-only"> {item.productTitle}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && cart && (
          <SheetFooter className="p-6 border-t border-border/60 bg-surface-container-low/30 flex flex-col gap-3">
            <div className="flex items-baseline justify-between text-sm py-1">
              <span className="font-body-sm text-muted-foreground">
                Subtotal <span className="text-xs">(excl. delivery)</span>
              </span>
              <span className="text-base font-bold tabular-nums text-foreground" data-testid="cart-subtotal">
                {formatMoney(cart.totals.itemSubtotal, cart.currency)}
              </span>
            </div>
            <Button asChild size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-label-md">
              <LocalizedClientLink href="/checkout?step=address" onClick={() => setOpen(false)}>Proceed to Checkout</LocalizedClientLink>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full font-label-md border-border/70">
              <LocalizedClientLink href="/cart" data-testid="go-to-cart-button" onClick={() => setOpen(false)}>
                View Complete Bag
              </LocalizedClientLink>
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
