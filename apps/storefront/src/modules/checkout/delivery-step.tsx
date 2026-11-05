"use client"

import type { Cart, ShippingOption } from "@lib/api/types"
import type { Serviceability } from "@lib/data/shipping"
import { deleteLineItem, setDeliveryInstructions, setShippingOption } from "@lib/data/shop"
import { notifyCartUpdated } from "@lib/util/cart-events"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  type CheckoutRegion,
  deliveryEstimate,
  fullName,
  itemCountLabel,
  money,
  oneLine,
  returnsLine,
  taxLabel,
  variantLine,
} from "./checkout-data"
import { CheckoutStepper } from "./checkout-stepper"
import { MIcon } from "./m-icon"
import { PromoField } from "./promo-field"

const cheapest = (options: ShippingOption[]) => Math.min(...options.map((o) => o.amount))

/** Checkout step 2, ported from checkout_delivery_options_modern_trending. */
export function DeliveryStep({
  cart,
  region,
  countryCode,
  isDefaultAddress,
  serviceability = null,
}: {
  cart: Cart
  region: CheckoutRegion
  countryCode: string
  /** The bag's address is the account's default one. */
  isDefaultAddress: boolean
  /** What the courier integration says about the delivery pincode; null when unknown. */
  serviceability?: Serviceability | null
}) {
  const unserviceable = serviceability?.configured === true && !serviceability.serviceable
  const deliveryDays =
    serviceability?.configured && serviceability.serviceable && serviceability.fastestDays != null
      ? serviceability.fastestDays === serviceability.slowestDays || serviceability.slowestDays == null
        ? `${serviceability.fastestDays}`
        : `${serviceability.fastestDays}–${serviceability.slowestDays}`
      : null
  const router = useRouter()
  const options = cart.shippingOptions
  const [selectedId, setSelectedId] = useState(cart.shippingOptionId ?? options[0]?.id ?? "")
  const [notes, setNotes] = useState(cart.deliveryInstructions ?? "")
  const [pending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const ship = cart.shippingAddress

  const fail = (message: string) => {
    setGeneralError(message)
    toast.error(message)
  }

  // Each choice is saved straight away so the summary shows the API's totals.
  const choose = async (id: string) => {
    setSelectedId(id)
    setSaving(true)
    const result = await setShippingOption(id)
    setSaving(false)
    if (result.error) return fail(result.error)
    router.refresh()
  }

  const removeItem = (lineId: string) => {
    startTransition(async () => {
      const result = await deleteLineItem(lineId)
      if (result.error) return fail(result.error)
      notifyCartUpdated()
      // deleteLineItem re-renders this page in its own response.
      if (cart.items.length <= 1) router.push(`/${countryCode}/cart`)
    })
  }

  const continueToReview = () => {
    setGeneralError(null)
    if (unserviceable) return fail("Couriers don't deliver to this pincode yet. Please choose another address.")
    if (!selectedId) return fail("Please choose a delivery method.")
    startTransition(async () => {
      const shipping = await setShippingOption(selectedId)
      if (shipping.error) return fail(shipping.error)
      if (notes.trim() !== (cart.deliveryInstructions ?? "")) {
        const saved = await setDeliveryInstructions(notes)
        if (saved.error) return fail(saved.error)
      }
      router.push(`/${countryCode}/checkout?step=review`)
      window.scrollTo({ top: 0 })
    })
  }

  const selected = options.find((o) => o.id === cart.shippingOptionId) ?? null

  return (
    <main className="w-full pt-20 bg-background min-h-screen">
      <div className="flex flex-col w-full">
        {/* Checkout Workflow Progress */}
        <div className="w-full bg-surface-container-lowest">
          <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-6">
            <div className="flex flex-col items-stretch gap-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div className="flex items-center gap-3">
                <LocalizedClientLink
                  className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors font-label-sm text-label-sm uppercase tracking-wider"
                  href="/cart"
                >
                  <MIcon name="arrow_back" className="text-[18px]" />
                  <span>Back to Bag</span>
                </LocalizedClientLink>
                <span className="w-1 h-1 rounded-full bg-outline-variant" aria-hidden />
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Bag of {itemCountLabel(cart)}</span>
              </div>
              <CheckoutStepper current="delivery" />
              <div className="hidden lg:block" aria-hidden />
            </div>
          </div>
        </div>

        {/* Main Checkout Container */}
        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-8 md:py-12 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            {/* LEFT COLUMN: Step Content */}
            <section className="lg:col-span-7 flex flex-col gap-6 min-w-0" data-testid="delivery-step">
              {generalError && (
                <div className="flex items-center gap-3 p-4 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm" role="alert" data-testid="checkout-error">
                  <MIcon name="error" className="text-[20px]" />
                  <span>{generalError}</span>
                </div>
              )}

              {unserviceable && (
                <div className="flex items-center gap-3 p-4 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm" role="alert" data-testid="delivery-unserviceable">
                  <MIcon name="location_off" className="text-[20px]" />
                  <span>
                    Our couriers don&apos;t deliver to {ship?.postalCode} yet. Please{" "}
                    <LocalizedClientLink href="/checkout?step=address" className="underline font-medium">
                      choose another address
                    </LocalizedClientLink>
                    .
                  </span>
                </div>
              )}

              {/* Address Summary Bar */}
              <div className="bg-surface-container-lowest p-5 md:p-6 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4" data-testid="delivery-address-summary">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface flex-shrink-0 mt-0.5">
                    <MIcon name="location_on" className="text-[20px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Delivery Address</span>
                      {isDefaultAddress && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container-high font-label-caps text-label-caps text-on-surface">Default</span>
                      )}
                    </div>
                    <h3 className="font-body-md text-body-md font-medium text-on-surface mt-0.5">
                      {fullName(ship)} {ship?.phone && <span className="text-on-surface-variant font-normal">| {ship.phone}</span>}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 line-clamp-1">{oneLine(ship)}</p>
                    {deliveryDays && (
                      <p className="font-label-sm text-label-sm text-on-surface mt-1 flex items-center gap-1" data-testid="delivery-serviceable">
                        <MIcon name="local_shipping" className="text-[16px] text-primary" />
                        Couriers deliver to {ship?.postalCode} in {deliveryDays} days
                      </p>
                    )}
                  </div>
                </div>
                <LocalizedClientLink
                  href="/checkout?step=address"
                  className="self-start sm:self-center px-3.5 py-1.5 rounded bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm tracking-wide uppercase transition-colors whitespace-nowrap"
                >
                  Change
                </LocalizedClientLink>
              </div>

              {/* Delivery Speed Card Block */}
              <div className="bg-surface-container-lowest p-6 md:p-8 rounded-lg shadow-sm">
                <div className="mb-6">
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">Step 02 / 04</span>
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">Choose Delivery Speed</h1>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Select how quickly you wish your curated pieces to arrive.
                  </p>
                </div>

                <div className="flex flex-col gap-3.5" role="radiogroup" aria-label="Delivery speed" data-testid="delivery-options-container">
                  {options.map((option) => {
                    const isSelected = option.id === selectedId
                    const free = option.amount === 0
                    const standard = option.amount === cheapest(options)
                    return (
                      <label
                        key={option.id}
                        className={`group relative flex flex-col p-4 md:p-5 rounded-lg cursor-pointer transition-all duration-200 ${
                          isSelected ? "bg-surface-container-low shadow-sm" : "bg-surface-container-lowest hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <input
                              checked={isSelected}
                              onChange={() => choose(option.id)}
                              className="mt-1 w-4 h-4 text-primary bg-surface-container-lowest focus:ring-0 focus:outline-none accent-primary cursor-pointer shrink-0"
                              name="delivery_method"
                              type="radio"
                              value={option.id}
                              data-testid="delivery-option-radio"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-body-md text-body-md font-medium text-on-surface">{option.name}</span>
                                {free ? (
                                  <span className="font-label-caps text-label-caps bg-surface-container px-2 py-0.5 rounded text-on-surface-variant uppercase">Complimentary</span>
                                ) : !standard ? (
                                  <span className="font-label-caps text-label-caps bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded uppercase font-semibold">Fast Track</span>
                                ) : null}
                              </div>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{deliveryEstimate(option, options, region.policies)}</p>
                              <div className="flex items-center gap-4 mt-2.5 font-label-sm text-label-sm text-on-surface-variant flex-wrap">
                                <span className="inline-flex items-center gap-1">
                                  <MIcon name={standard ? "eco" : "bolt"} className="text-[16px] text-primary" />
                                  {standard ? "Recyclable archival box" : "Prioritised courier handover"}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <MIcon name="pin_drop" className="text-[16px] text-primary" />
                                  Online order tracking
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {free ? (
                              <span className="font-label-sm text-label-sm font-semibold uppercase text-primary tracking-wider">FREE</span>
                            ) : (
                              <span className="font-body-md text-body-md font-medium text-on-surface">{money(cart, option.amount)}</span>
                            )}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>

                {/* Delivery Instructions / Notes Field */}
                <div className="mt-8 pt-6 bg-surface-container-low/50 p-4 rounded-lg">
                  <label className="flex items-center gap-2 font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-medium mb-2" htmlFor="delivery-notes">
                    <MIcon name="note_alt" className="text-[18px] text-on-surface-variant" />
                    <span>Delivery Instructions (Optional)</span>
                  </label>
                  <input
                    className="w-full h-11 px-3.5 bg-surface-container-lowest rounded text-on-surface font-body-sm text-body-sm placeholder:text-outline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors shadow-sm"
                    id="delivery-notes"
                    placeholder="e.g. Leave with building concierge, ring bell twice"
                    type="text"
                    maxLength={300}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    data-testid="delivery-notes-input"
                  />
                </div>

                {/* Carbon & Ethics Assurance */}
                <div className="mt-6 flex items-center justify-between gap-4 p-4 rounded bg-surface-container-lowest text-on-surface-variant">
                  <div className="flex items-center gap-2.5">
                    <MIcon name="inventory_2" className="text-primary text-[20px]" />
                    <span className="font-body-sm text-body-sm">Zero plastic packaging. Sealed in organic undyed unbleached cotton envelope.</span>
                  </div>
                  <MIcon name="verified" className="text-on-surface-variant text-[18px]" />
                </div>
              </div>
            </section>

            {/* RIGHT COLUMN: Order Summary & Checkout Trigger */}
            <aside className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-28 min-w-0" aria-label="Order summary">
              <div className="bg-surface-container-lowest p-6 md:p-7 rounded-lg shadow-sm">
                <div className="flex items-center justify-between pb-4">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Order Summary</h2>
                  <span className="font-label-caps text-label-caps uppercase bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant">{itemCountLabel(cart)}</span>
                </div>

                <ul data-testid="items-table">
                  {cart.items.map((item) => (
                    <li key={item.id} className="py-4 flex gap-4" data-testid="product-row">
                      <div className="w-20 h-24 rounded bg-surface-container-low overflow-hidden flex-shrink-0 relative">
                        {item.thumbnail && <Image src={item.thumbnail} alt={item.productTitle} fill sizes="80px" className="object-cover" />}
                      </div>
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <h4 className="font-body-md text-body-md font-medium text-on-surface leading-snug" data-testid="product-title">{item.productTitle}</h4>
                          <div className="flex items-center gap-3 mt-1 font-label-sm text-label-sm text-on-surface-variant flex-wrap">
                            {variantLine(item) && (
                              <>
                                <span>
                                  Size: <strong className="text-on-surface font-medium">{variantLine(item)}</strong>
                                </span>
                                <span className="w-1 h-1 rounded-full bg-outline-variant" aria-hidden />
                              </>
                            )}
                            <span>
                              Qty: <strong className="text-on-surface font-medium">{item.quantity}</strong>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-body-md text-body-md font-medium text-on-surface">{money(cart, item.total)}</span>
                          <button
                            className="text-on-surface-variant hover:text-error transition-colors font-label-sm text-label-sm min-h-6"
                            type="button"
                            disabled={pending}
                            onClick={() => removeItem(item.id)}
                            aria-label={`Remove ${item.productTitle} from bag`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <PromoField applied={cart.promoCodes} variant="delivery" />

                <div className="pt-5 flex flex-col gap-2.5 font-body-sm text-body-sm">
                  <div className="flex justify-between items-center text-on-surface-variant">
                    <span>Bag Total</span>
                    <span className="text-on-surface font-medium">{money(cart, cart.totals.itemSubtotal)}</span>
                  </div>
                  {cart.totals.discountTotal > 0 && (
                    <div className="flex justify-between items-center text-secondary">
                      <span className="inline-flex items-center gap-1">
                        <span>Coupon Discount</span>
                        <MIcon name="stars" className="text-[14px]" />
                      </span>
                      <span className="font-medium">-{money(cart, cart.totals.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-on-surface-variant">
                    <span>Estimated Delivery Fee</span>
                    {saving ? (
                      <span className="text-on-surface-variant">Updating…</span>
                    ) : !selected ? (
                      <span className="text-on-surface-variant">Choose an option</span>
                    ) : cart.totals.shippingTotal === 0 ? (
                      <span className="text-primary font-medium tracking-wide">FREE</span>
                    ) : (
                      <span className="text-on-surface font-medium">{money(cart, cart.totals.shippingTotal)}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-on-surface-variant">
                    <span>{taxLabel(region)}</span>
                    <span className="text-on-surface font-medium">{money(cart, cart.totals.taxTotal)}</span>
                  </div>
                </div>

                <div className="pt-5 mt-4 flex items-baseline justify-between gap-3">
                  <div>
                    <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant block">Total Payable</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">All taxes &amp; duties calculated</span>
                  </div>
                  <div className="text-right">
                    <span className="font-headline-lg text-headline-lg font-semibold text-on-surface tracking-tight" data-testid="checkout-total">
                      {money(cart, cart.totals.total)}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    className="w-full h-12 bg-primary hover:bg-primary-container text-on-primary rounded font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:opacity-60"
                    type="button"
                    onClick={continueToReview}
                    disabled={pending || saving || unserviceable}
                    data-testid="checkout-continue-button"
                  >
                    <span>{pending ? "Saving…" : "Continue to Review"}</span>
                    <MIcon name="arrow_forward" className="text-[18px]" />
                  </button>
                </div>

                <div className="mt-5 pt-4 flex flex-col gap-2 text-on-surface-variant font-label-sm text-label-sm">
                  <div className="flex items-center gap-2">
                    <MIcon name="verified_user" className="text-[18px] text-primary" />
                    <span>{returnsLine(region.policies)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MIcon name="lock" className="text-[18px] text-primary" />
                    <span>256-bit encrypted bank-grade PCI DSS gateway</span>
                  </div>
                  <LocalizedClientLink href="/concierge" className="flex items-center gap-2 hover:text-primary min-h-6">
                    <MIcon name="support_agent" className="text-[18px] text-primary" />
                    <span>Direct access to dedicated Atelier Concierge</span>
                  </LocalizedClientLink>
                </div>
              </div>

              <div className="bg-surface-container p-4 rounded-lg flex items-center gap-3">
                <MIcon name="workspace_premium" className="text-secondary text-[24px]" />
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                  Every Everwear piece is inspected by hand, sealed with a serial seal, and authenticated prior to dispatch.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}
