"use client"

import type { Address, Cart, Customer } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import {
  type CheckoutRegion,
  deliveryEstimate,
  deliveryEstimateShort,
  fullName,
  itemCount,
  money,
  oneLine,
  returnsLine,
  taxLabel,
  variantLine,
} from "./checkout-data"
import { CheckoutStepper } from "./checkout-stepper"
import { MIcon } from "./m-icon"

const same = (a: Partial<Address> | null | undefined, b: Partial<Address> | null | undefined) =>
  !!a && !!b && a.address1 === b.address1 && a.postalCode === b.postalCode && a.firstName === b.firstName

/** One of the three confirmation cards: icon, kicker, title, Edit link, and a grey detail panel. */
function ConfirmCard({
  icon,
  kicker,
  title,
  edit,
  children,
}: {
  icon: string
  kicker: string
  title: string
  edit: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
            <MIcon name={icon} className="text-[20px]" />
          </div>
          <div className="min-w-0">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant block">{kicker}</span>
            <p className="font-headline-sm text-headline-sm text-on-surface truncate">{title}</p>
          </div>
        </div>
        <LocalizedClientLink
          href={edit}
          className="font-label-caps text-label-caps uppercase px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-primary transition-colors flex items-center gap-1.5 shrink-0"
        >
          <span>Edit</span>
          <MIcon name="edit" className="text-[14px]" />
        </LocalizedClientLink>
      </div>
      {children}
    </div>
  )
}

/**
 * Checkout step 3 (review), from the "Review Your Curated Order" export:
 * confirms the destination, delivery method and items, previews the payment
 * step, and shows the final ledger. Each card links back to the step that
 * set it; nothing is changed here.
 */
export function ReviewStep({
  cart,
  customer,
  region,
  countryCode,
}: {
  cart: Cart
  customer: Customer | null
  region: CheckoutRegion
  countryCode: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const ship = cart.shippingAddress
  const option = cart.shippingOptions.find((o) => o.id === cart.shippingOptionId) ?? null
  const isDefault = same(customer?.addresses[0], ship)
  const n = itemCount(cart)
  const promo = cart.promoCodes[0] ?? null

  const continueToPayment = () =>
    startTransition(() => {
      router.push(`/${countryCode}/checkout?step=payment`)
      window.scrollTo({ top: 0 })
    })

  return (
    <main className="w-full pt-20 bg-background min-h-screen">
      <div className="flex flex-col w-full">
        {/* Stage bar, with the same stepper as every other step */}
        <section className="w-full bg-surface-container-lowest shadow-sm">
          <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-6">
            <div className="flex flex-col items-stretch gap-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" aria-hidden />
                <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface">Order Manifest &amp; Review</span>
              </div>
              <CheckoutStepper current="review" />
              <div className="hidden lg:flex justify-end">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low">
                  <MIcon name="verified_user" className="text-[16px] text-on-surface" />
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface">Encrypted 256-bit</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-8 md:py-12 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: confirmations and items */}
            <div className="lg:col-span-7 flex flex-col gap-8 min-w-0" data-testid="review-step">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-surface-container-high">
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface">Curated Manifest</span>
                  <span className="text-xs text-on-surface-variant" aria-hidden>
                    •
                  </span>
                  <span className="font-label-caps text-label-caps uppercase tracking-widest text-primary font-semibold">Ready for Dispatch</span>
                </div>
                <h1 className="font-headline-xl text-headline-xl max-md:text-[2rem] text-on-surface tracking-tight">Review Your Curated Order</h1>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                  Verify your delivery destination, delivery method and items before proceeding to payment.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <ConfirmCard icon="location_on" kicker="Delivery Destination" title={ship?.city ? `Delivering to ${ship.city}` : "Delivery address"} edit="/checkout?step=address">
                  <div className="bg-surface-container-low p-4 rounded-lg space-y-1.5" data-testid="selected-address-card">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-body-md text-body-md font-semibold text-on-surface">
                        {fullName(ship)}
                        {ship?.company ? `, ${ship.company}` : ""}
                      </span>
                      {isDefault && (
                        <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded">
                          Default Address
                        </span>
                      )}
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{oneLine(ship)}</p>
                    <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-on-surface-variant font-body-sm text-body-sm">
                      {ship?.phone && (
                        <span className="flex items-center gap-1.5">
                          <MIcon name="call" className="text-[16px]" />
                          {ship.phone}
                        </span>
                      )}
                      {cart.email && (
                        <span className="flex items-center gap-1.5 text-on-surface min-w-0">
                          <MIcon name="notifications_active" className="text-[16px]" />
                          <span className="truncate">Order updates to {cart.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </ConfirmCard>

                <ConfirmCard icon="local_shipping" kicker="Selected Delivery" title={option?.name ?? "Delivery method"} edit="/checkout?step=delivery">
                  <div className="bg-surface-container-low p-4 rounded-lg space-y-2" data-testid="review-delivery-option">
                    {option ? (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" aria-hidden />
                            <span className="font-body-md text-body-md font-medium text-on-surface">
                              {deliveryEstimateShort(option, cart.shippingOptions, region.policies)}
                            </span>
                          </div>
                          <span className="font-label-caps text-label-caps uppercase tracking-wider px-2 py-0.5 rounded bg-primary text-on-primary">
                            {option.amount === 0 ? "Free" : money(cart, option.amount)}
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">{deliveryEstimate(option, cart.shippingOptions, region.policies)}</p>
                      </>
                    ) : (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Choose a delivery method before paying.</p>
                    )}
                  </div>
                </ConfirmCard>

              </div>

              {/* Items */}
              <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-sm space-y-6">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-surface-container-high">
                  <div>
                    <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant block">Manifest Content</span>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface">Selected Garments &amp; Artifacts</h2>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-surface-container-low font-label-caps text-label-caps uppercase text-on-surface font-semibold shrink-0">
                    {n} {n === 1 ? "Curated Piece" : "Curated Pieces"}
                  </span>
                </div>
                <ul className="space-y-6" data-testid="items-table">
                  {cart.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col sm:flex-row gap-5 items-start p-4 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors"
                      data-testid="product-row"
                    >
                      <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-lg overflow-hidden shrink-0 bg-surface-container relative">
                        {item.thumbnail && <Image src={item.thumbnail} alt={item.productTitle} fill sizes="112px" className="object-cover" />}
                      </div>
                      <div className="flex-1 flex flex-col justify-between h-full w-full min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="font-headline-sm text-headline-sm text-on-surface font-medium" data-testid="product-title">
                              {item.productTitle}
                            </h3>
                            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold shrink-0 tabular-nums">{money(cart, item.total)}</span>
                          </div>
                          <dl className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 font-body-sm text-body-sm">
                            {variantLine(item) && (
                              <div>
                                <dt className="font-label-caps text-label-caps uppercase text-on-surface-variant">Size</dt>
                                <dd className="text-on-surface">{variantLine(item)}</dd>
                              </div>
                            )}
                            <div>
                              <dt className="font-label-caps text-label-caps uppercase text-on-surface-variant">Quantity</dt>
                              <dd className="text-on-surface">
                                {item.quantity} {item.quantity === 1 ? "Unit" : "Units"}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-label-caps text-label-caps uppercase text-on-surface-variant">Unit Price</dt>
                              <dd className="text-on-surface tabular-nums">{money(cart, item.unitPrice)}</dd>
                            </div>
                          </dl>
                        </div>
                        <div className="mt-4 pt-3 flex flex-wrap items-center gap-3 border-t border-surface-container">
                          <span className="inline-flex items-center gap-1 font-label-caps text-label-caps uppercase text-on-surface">
                            <MIcon name="autorenew" className="text-[14px]" />
                            {returnsLine(region.policies)}
                          </span>
                          <span className="text-xs text-on-surface-variant" aria-hidden>
                            •
                          </span>
                          <span className="inline-flex items-center gap-1 font-label-caps text-label-caps uppercase text-on-surface">
                            <MIcon name="shield" className="text-[14px]" />
                            Tamper-evident seal
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Packaging & instructions */}
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <MIcon name="inventory_2" className="text-primary text-[20px]" />
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Atelier Packaging &amp; Instructions</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-surface-container-low space-y-1">
                    <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant block">Sustainable Presentation</span>
                    <p className="font-body-sm text-body-sm text-on-surface font-medium">Zero Plastic Casing</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Packed in reusable unbleached organic cotton slips.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-container-low space-y-1">
                    <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant block">Courier Note</span>
                    {cart.deliveryInstructions ? (
                      <p className="font-body-sm text-body-sm text-on-surface font-medium break-words">{cart.deliveryInstructions}</p>
                    ) : (
                      <>
                        <p className="font-body-sm text-body-sm text-on-surface font-medium">No delivery instructions</p>
                        <LocalizedClientLink href="/checkout?step=delivery" className="font-body-sm text-body-sm text-on-surface-variant underline underline-offset-2 hover:text-primary">
                          Add a note for the courier
                        </LocalizedClientLink>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: ledger */}
            <aside className="lg:col-span-5 lg:sticky lg:top-28 space-y-6 min-w-0" aria-label="Order summary">
              <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-sm space-y-6">
                <div>
                  <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant block">Final Breakdown</span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">Financial Ledger</h2>
                </div>
                <div className="space-y-3.5 font-body-md text-body-md">
                  <div className="flex items-center justify-between gap-3 text-on-surface">
                    <span className="text-on-surface-variant">
                      Curated Pieces Subtotal ({n} {n === 1 ? "item" : "items"})
                    </span>
                    <span className="font-medium tabular-nums">{money(cart, cart.totals.itemSubtotal)}</span>
                  </div>
                  {cart.totals.discountTotal > 0 && (
                    <div className="flex items-center justify-between gap-3 text-on-surface">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-on-surface-variant">Coupon Discount</span>
                        {promo && (
                          <span className="px-1.5 py-0.5 rounded bg-surface-container-high font-label-caps text-label-caps uppercase text-primary font-bold">{promo}</span>
                        )}
                      </div>
                      <span className="font-medium text-primary tabular-nums">-{money(cart, cart.totals.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 text-on-surface">
                    <span className="text-on-surface-variant">{option?.name ?? "Delivery"}</span>
                    {cart.totals.shippingTotal === 0 ? (
                      <span className="font-label-caps text-label-caps uppercase text-primary font-semibold">Complimentary</span>
                    ) : (
                      <span className="font-medium tabular-nums">{money(cart, cart.totals.shippingTotal)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 text-on-surface">
                    <span className="text-on-surface-variant">{taxLabel(region)}</span>
                    <span className="font-medium tabular-nums">{money(cart, cart.totals.taxTotal)}</span>
                  </div>
                  <div className="pt-4 border-t border-surface-container-high flex items-baseline justify-between gap-3">
                    <div>
                      <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Total Payable Settlement</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">All taxes included</p>
                    </div>
                    <span className="font-headline-xl text-headline-xl max-md:text-[2rem] font-bold text-on-surface tracking-tight tabular-nums" data-testid="checkout-total">
                      {money(cart, cart.totals.total)}
                    </span>
                  </div>
                </div>

                {promo && cart.totals.discountTotal > 0 && (
                  <div className="p-3.5 rounded-lg bg-surface-container-low flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <MIcon name="sell" className="text-[18px] text-primary" />
                      <div>
                        <p className="font-label-caps text-label-caps uppercase text-on-surface font-semibold">{promo} Voucher Active</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Saving {money(cart, cart.totals.discountTotal)} on this order</p>
                      </div>
                    </div>
                    <MIcon name="check_circle" className="text-[18px] text-primary" />
                  </div>
                )}

                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={continueToPayment}
                    disabled={pending || !option}
                    className="w-full py-4 px-6 rounded-lg bg-primary hover:bg-on-surface-variant text-on-primary font-label-md text-label-md uppercase tracking-wider font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-60"
                    data-testid="checkout-continue-button"
                  >
                    <span>Continue to Payment ({money(cart, cart.totals.total)})</span>
                    <MIcon name="arrow_forward" className="text-[18px]" />
                  </button>
                  <p className="font-body-sm text-body-sm text-on-surface-variant text-center leading-relaxed">
                    You will choose your payment mode and authorize payment in the next step. 100% encrypted &amp; secure.
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm space-y-4">
                <div className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">Institutional Assurance</div>
                <ul className="space-y-3">
                  {[
                    { icon: "lock", title: "256-Bit Bank-Grade SSL Secure Checkout", note: "Card and UPI details go straight to the payment gateway." },
                    { icon: "verified", title: "Every piece hand-inspected", note: "Checked and sealed before dispatch." },
                    { icon: "sync_alt", title: returnsLine(region.policies), note: "Request a return from your order page." },
                    { icon: "fingerprint", title: "Cryptographic Tamper-Proof Seals", note: "Inspected by Everwear Quality Lab." },
                  ].map((x) => (
                    <li key={x.icon} className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0 text-primary">
                        <MIcon name={x.icon} className="text-[16px]" />
                      </span>
                      <span>
                        <span className="block font-body-sm text-body-sm font-semibold text-on-surface">{x.title}</span>
                        <span className="block font-body-sm text-body-sm text-on-surface-variant">{x.note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <MIcon name="support_agent" className="text-on-surface text-[20px]" />
                  <div>
                    <p className="font-label-md text-label-md text-on-surface font-medium">Need Immediate Assistance?</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Our concierge team can help</p>
                  </div>
                </div>
                <LocalizedClientLink
                  href="/concierge"
                  className="px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high font-label-caps text-label-caps uppercase text-on-surface font-semibold transition-colors shrink-0"
                >
                  Connect
                </LocalizedClientLink>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}
