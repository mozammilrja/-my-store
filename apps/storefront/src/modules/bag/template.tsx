"use client"

import { Button } from "@/components/ui/button"
import { formatMoney } from "@lib/money"
import { clearCart } from "@lib/data/shop"
import { notifyCartUpdated } from "@lib/util/cart-events"
import type { Cart, Customer } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { LineItem } from "./line-item"
import { PromoCode } from "./promo-code"
import { Totals } from "./totals"

/** Free standard delivery from ₹1,999, in paise. */
const FREE_SHIPPING_THRESHOLD = 199900

const checkoutStep = (cart: Cart) => {
  if (!cart.shippingAddress || !cart.email) return "address"
  if (!cart.shippingOptionId) return "delivery"
  return "review"
}

export function BagTemplate({
  cart,
  customer,
  error,
}: {
  cart: Cart | null
  customer: Customer | null
  error?: string
}) {
  const [giftPackaging, setGiftPackaging] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Newest first: the API keeps items in the order they were added.
  const items = [...(cart?.items ?? [])].reverse()
  const count = items.reduce((n, item) => n + item.quantity, 0)
  const currency = cart?.currency ?? "inr"

  const threshold = FREE_SHIPPING_THRESHOLD
  const subtotal = cart?.totals.itemSubtotal ?? 0
  const isFreeUnlocked = subtotal >= threshold
  const remaining = Math.max(0, threshold - subtotal)
  const progressPercent = Math.min(100, Math.round((subtotal / threshold) * 100))

  const handleClearBag = () => {
    if (confirm("Are you sure you want to remove all items from your shopping bag?")) {
      startTransition(async () => {
        try {
          await clearCart()
          notifyCartUpdated()
          toast.success("Shopping bag cleared")
        } catch {
          toast.error("Could not clear bag. Please try again.")
        }
      })
    }
  }

  const handleToggleGiftPackaging = () => {
    setGiftPackaging(!giftPackaging)
    toast.success(!giftPackaging ? "Signature gift packaging added" : "Gift packaging removed")
  }

  return (
    <div className="w-full bg-surface min-h-[calc(100vh-20rem)]" data-testid="cart-container">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-xl w-full">
        {/* 1. Breadcrumb & Page Header */}
        <div className="flex flex-col gap-space-sm mb-space-xl">
          <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            <LocalizedClientLink href="/" className="hover:text-on-surface transition-colors">
              Home
            </LocalizedClientLink>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface font-semibold">Shopping Bag</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
            <div>
              <h1 className="font-headline-xl md:text-headline-xl text-headline-xl-mobile text-primary font-light">
                Your Bag
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
                {count > 0
                  ? `${count} ${count === 1 ? "curated piece" : "curated pieces"} ready for dispatch. Guaranteed authentic craftsmanship.`
                  : "0 pieces currently held. Explore our latest arrivals and seasonal curations."}
              </p>
            </div>

            <div className="flex items-center gap-space-sm">
              <span className="inline-flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md border border-surface-container-high/60">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                Secure 256-bit SSL Checkout
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-space-lg p-space-md bg-error-container/40 border border-error/30 rounded-xl text-error font-body-sm text-xs flex items-center gap-2"
            data-testid="cart-error"
          >
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Sign in prompt for guest shoppers */}
        {!customer && count > 0 && (
          <div
            className="mb-space-lg p-3.5 bg-surface-container-low rounded-xl border border-surface-container-high flex items-center justify-between gap-3 text-body-sm text-xs"
            data-testid="sign-in-prompt"
          >
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">account_circle</span>
              <span>Sign in to automatically apply your Atelier Privilege points and saved delivery addresses.</span>
            </div>
            <LocalizedClientLink
              href="/account"
              className="font-label-sm font-semibold text-primary underline underline-offset-4 shrink-0 uppercase"
            >
              Sign In
            </LocalizedClientLink>
          </div>
        )}

        {/* 2. Free Delivery Progress Banner */}
        {count > 0 && (
          <div className="w-full bg-surface-container-lowest p-space-lg rounded-xl mb-space-xl shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-surface-container-high/60">
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between text-body-sm font-body-sm flex-wrap gap-2">
                <span className="font-medium text-on-surface flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-secondary text-[18px]">local_shipping</span>
                  {isFreeUnlocked ? (
                    <span>
                      You have unlocked <strong className="text-primary font-semibold">Complimentary Express Shipping &amp; 14-day Home Pick-up</strong>!
                    </span>
                  ) : (
                    <span>
                      Add <strong className="text-primary font-semibold">{formatMoney(remaining, currency)}</strong> more to unlock Complimentary Express Shipping &amp; 14-day Home Pick-up.
                    </span>
                  )}
                </span>
                <span className="text-on-surface-variant font-label-sm font-semibold">
                  {progressPercent}% Unlocked
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. Empty Bag Experience or 12-Column Grid */}
        {!cart || items.length === 0 ? (
          <div
            className="my-space-xl p-space-xl bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 max-w-xl mx-auto flex flex-col items-center text-center gap-space-md"
            data-testid="empty-cart-message"
          >
            <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[36px]">shopping_bag</span>
            </div>
            <h2 className="font-headline-xl text-headline-xl text-primary font-light">
              Your Bag is Empty
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
              Explore our curated wardrobe capsule pieces, hand-tailored luxury garments, and seasonal essentials.
            </p>
            <Button
              asChild
              className="mt-space-sm h-12 px-8 bg-primary text-on-primary hover:bg-inverse-surface rounded-lg font-label-md uppercase tracking-wider font-semibold shadow-xs"
            >
              <LocalizedClientLink href="/store">Browse the collections</LocalizedClientLink>
            </Button>

            <div className="pt-space-md border-t border-surface-container-high w-full mt-space-sm flex items-center justify-center gap-space-md text-xs font-label-caps uppercase text-on-surface-variant flex-wrap">
              <LocalizedClientLink href="/categories/men" className="hover:text-primary transition-colors">
                Men&apos;s Edit
              </LocalizedClientLink>
              <span>&bull;</span>
              <LocalizedClientLink href="/categories/women" className="hover:text-primary transition-colors">
                Women&apos;s Edit
              </LocalizedClientLink>
              <span>&bull;</span>
              <LocalizedClientLink href="/store?sort=newest" className="hover:text-primary transition-colors">
                New Arrivals
              </LocalizedClientLink>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
            {/* Left Column: Items List (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-space-lg">
              {/* Bag Items Header Bar */}
              <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-highest">
                <span className="font-label-caps text-label-caps tracking-wider uppercase text-on-surface-variant font-bold">
                  Bag Items ({count})
                </span>
                <button
                  type="button"
                  onClick={handleClearBag}
                  disabled={isPending}
                  className="font-label-sm text-label-sm text-on-surface-variant hover:text-error transition-colors flex items-center gap-space-xs cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                  <span>Clear Bag</span>
                </button>
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-space-md" data-testid="items-table">
                {items.map((item) => (
                  <LineItem key={item.id} item={item} currencyCode={currency} />
                ))}
              </div>

              {/* Signature Gift Option Card */}
              <div className="p-space-lg bg-surface-container-low rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border border-surface-container-high/60">
                <div className="flex items-center gap-space-md">
                  <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shrink-0 shadow-2xs">
                    <span className="material-symbols-outlined text-[20px]">card_giftcard</span>
                  </div>
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface font-semibold">
                      Add Signature Gift Packaging?
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Includes embossed matte black box, silk ribbon, and personalized card note.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleGiftPackaging}
                  className={`px-space-md py-2 text-xs font-label-md rounded-lg transition-colors shrink-0 cursor-pointer font-semibold ${
                    giftPackaging
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-surface-container-high"
                  }`}
                >
                  {giftPackaging ? "Added ✓ (+₹199)" : "Add (+₹199)"}
                </button>
              </div>
            </div>

            {/* Right Column: Order Summary & Checkout (5 cols sticky) */}
            <div className="lg:col-span-5 flex flex-col gap-space-lg sticky top-36">
              <PromoCode cart={cart} />
              <Totals
                totals={cart.totals}
                currency={currency}
                shippingChosen={!!cart.shippingOptionId}
                promoCodes={cart.promoCodes}
                checkoutStep={checkoutStep(cart)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
