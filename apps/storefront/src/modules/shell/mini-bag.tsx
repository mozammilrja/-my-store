"use client"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatMoney } from "@lib/money"
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
 * Cart indicator and mini bag. Opens as a dropdown anchored under the header
 * bag button rather than a slide-over, so the shopper keeps their place on the
 * page. Statically rendered pages can't read the cart cookie, so the cart is
 * loaded in the browser and refreshed whenever a mutation dispatches the
 * cart-updated event.
 */
export function MiniBag() {
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

  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setOpen(false)
  }

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
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
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[380px] max-w-[calc(100vw-2rem)] p-0 gap-0"
        aria-label="Shopping bag"
        data-testid="nav-cart-dropdown"
      >
        <div className="flex items-baseline justify-between gap-3 px-5 py-3.5 border-b border-border/60 bg-surface-container-low/50">
          <h2 className="font-headline-sm text-base font-medium tracking-tight text-foreground">
            My Bag
          </h2>
          <span className="font-label-caps text-[11px] uppercase tracking-wider text-muted-foreground">
            {count === 0 ? "Empty" : `${count} ${count === 1 ? "item" : "items"}`}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <div className="size-14 rounded-full bg-surface-container flex items-center justify-center text-muted-foreground">
              <ShoppingBagIcon className="size-7" />
            </div>
            <p className="font-body-sm text-xs text-muted-foreground max-w-[15rem]">
              Your bag is empty. Explore our tailored garments and daily essentials.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-1 bg-primary text-primary-foreground hover:bg-primary/90 font-label-md"
            >
              <LocalizedClientLink href="/store" onClick={() => setOpen(false)}>
                Shop Collections
              </LocalizedClientLink>
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60 overflow-y-auto max-h-[min(60vh,26rem)] px-5">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 py-3.5" data-testid="cart-item">
                <LocalizedClientLink
                  href={`/products/${item.productHandle}`}
                  onClick={() => setOpen(false)}
                  className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded bg-surface-container-low border border-border/40"
                >
                  {item.thumbnail && (
                    <Image src={item.thumbnail} alt="" fill sizes="56px" className="object-cover" />
                  )}
                </LocalizedClientLink>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <LocalizedClientLink
                      href={`/products/${item.productHandle}`}
                      onClick={() => setOpen(false)}
                      className="truncate font-headline-sm text-[13px] font-medium hover:underline text-foreground"
                      data-testid="product-link"
                    >
                      {item.productTitle}
                    </LocalizedClientLink>
                    <span className="text-[13px] font-bold text-foreground tabular-nums shrink-0">
                      {formatMoney(item.total, cart!.currency)}
                    </span>
                  </div>
                  {item.variantTitle && (
                    <span className="font-label-caps text-[11px] text-muted-foreground uppercase truncate">
                      {item.variantTitle}
                    </span>
                  )}
                  <span
                    className="font-body-sm text-[11px] text-muted-foreground"
                    data-testid="cart-item-quantity"
                  >
                    Qty: {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    disabled={removing === item.id}
                    className="mt-0.5 inline-flex w-fit items-center gap-1 font-label-caps text-[11px] text-muted-foreground underline-offset-4 hover:text-destructive transition-colors disabled:opacity-50 cursor-pointer"
                    data-testid="cart-item-remove-button"
                  >
                    {removing === item.id && (
                      <Loader2Icon className="size-3 animate-spin" aria-hidden />
                    )}
                    Remove<span className="sr-only"> {item.productTitle}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && cart && (
          <div className="flex flex-col gap-2.5 px-5 py-4 border-t border-border/60 bg-surface-container-low/30">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-body-sm text-xs text-muted-foreground">
                Subtotal <span className="text-[11px]">(excl. delivery)</span>
              </span>
              <span
                className="text-base font-bold tabular-nums text-foreground"
                data-testid="cart-subtotal"
              >
                {formatMoney(cart.totals.itemSubtotal, cart.currency)}
              </span>
            </div>
            <Button
              asChild
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-label-md"
            >
              <LocalizedClientLink href="/checkout?step=address" onClick={() => setOpen(false)}>
                Proceed to Checkout
              </LocalizedClientLink>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full font-label-md border-border/70"
            >
              <LocalizedClientLink
                href="/cart"
                data-testid="go-to-cart-button"
                onClick={() => setOpen(false)}
              >
                View Complete Bag
              </LocalizedClientLink>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
