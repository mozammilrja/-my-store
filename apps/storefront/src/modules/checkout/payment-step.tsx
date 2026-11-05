"use client"

import type { Cart } from "@lib/api/types"
import { placeOrder } from "@lib/data/shop"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { type ReactNode, useState, useTransition } from "react"
import { toast } from "sonner"
import {
  type CheckoutRegion,
  type PaymentMethodId,
  deliveryEstimateShort,
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

export type MethodAvailability = { online: boolean; methods: { upi: boolean; card: boolean; netbanking: boolean; cod: boolean } }

const TABS: { id: PaymentMethodId; label: string; hint: string; icon: string; badge?: string }[] = [
  { id: "upi", label: "Instant UPI", hint: "GPay, PhonePe, QR", icon: "qr_code_2", badge: "Fast" },
  { id: "card", label: "Cards", hint: "Visa, MC, RuPay, Amex", icon: "credit_card" },
  { id: "netbanking", label: "Net Banking", hint: "All Indian Banks", icon: "account_balance" },
  { id: "cod", label: "Pay on Delivery", hint: "Cash or UPI at doorstep", icon: "payments" },
  { id: "emi", label: "EMI & PayLater", hint: "Simpl, Cardless EMI", icon: "calendar_month" },
]

const payButton =
  "w-full h-12 bg-primary hover:bg-primary-container text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
const mutedButton =
  "w-full h-12 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-caps text-label-caps uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 disabled:opacity-60"

/** Checkout step 4 (payment; the order is placed here), ported from checkout_payment_mode_modern_trending. */
export function PaymentStep({
  cart,
  region,
  countryCode,
  availability,
  initialMethod,
}: {
  cart: Cart
  region: CheckoutRegion
  countryCode: string
  availability: MethodAvailability
  initialMethod: PaymentMethodId
}) {
  const router = useRouter()
  const [active, setActive] = useState<PaymentMethodId>(initialMethod)
  const [pending, startTransition] = useTransition()
  const [generalError, setGeneralError] = useState<string | null>(null)
  const ship = cart.shippingAddress
  const option = cart.shippingOptions.find((o) => o.id === cart.shippingOptionId) ?? null
  const total = money(cart, cart.totals.total)

  const available = (id: PaymentMethodId) => (id === "emi" ? false : availability.methods[id])


  const fail = (message: string) => {
    setGeneralError(message)
    toast.error(message)
  }

  const placeCod = () => {
    setGeneralError(null)
    const form = new FormData()
    form.append("countryCode", countryCode)
    form.append("paymentMethod", "cod")
    startTransition(async () => {
      try {
        const result = await placeOrder({ error: null }, form)
        if (result?.error) fail(result.error)
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e)
        if (!m.includes("NEXT_REDIRECT")) fail(m)
      }
    })
  }

  /**
   * Online methods go to the provider handoff page, which opens Razorpay's
   * window. When the store has no gateway configured, the API is asked anyway
   * and its refusal lands the shopper on the recovery page with the reason.
   */
  const payOnline = (method: "upi" | "card" | "netbanking") => {
    setGeneralError(null)
    if (available(method)) {
      router.push(`/${countryCode}/checkout/authenticate?method=${method}`)
      return
    }
    const form = new FormData()
    form.append("countryCode", countryCode)
    form.append("paymentMethod", "razorpay")
    startTransition(async () => {
      try {
        const result = await placeOrder({ error: null }, form)
        if (result?.error) {
          router.push(`/${countryCode}/checkout/payment-failed?method=${method}&reason=${encodeURIComponent(result.error)}`)
        }
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e)
        if (!m.includes("NEXT_REDIRECT")) fail(m)
      }
    })
  }

  const unavailableNote = (what: string) => (
    <div className="p-4 bg-surface-container-low rounded flex items-start gap-3" data-testid="payment-unavailable-note">
      <MIcon name="block" className="text-[20px] text-on-surface mt-0.5" />
      <div className="font-body-sm text-body-sm text-on-surface-variant space-y-1">
        <p className="text-on-surface font-medium">{what} isn&apos;t available on this store right now.</p>
        <p className="text-xs text-outline">
          Online payments are switched off, so no money can be taken this way. Pay on Delivery is available for this order.
        </p>
      </div>
    </div>
  )

  const switchToCod = availability.methods.cod && (
    <button type="button" className={mutedButton} onClick={() => setActive("cod")} data-testid="switch-to-cod">
      <span>Use Pay on Delivery instead</span>
      <MIcon name="payments" className="text-[18px]" />
    </button>
  )

  const providerNote = (text: string) => (
    <div className="p-4 bg-surface-container-low rounded flex items-start gap-3">
      <MIcon name="lock" className="text-[20px] text-on-surface mt-0.5" />
      <p className="font-body-sm text-body-sm text-on-surface-variant">{text}</p>
    </div>
  )

  const onlinePane = (
    method: "upi" | "card" | "netbanking",
    head: ReactNode,
    availableBody: ReactNode,
    buttonLabel: string,
    buttonIcon: string,
    caption?: string
  ) => {
    const ok = available(method)
    return (
      <div className="flex flex-col gap-5" data-testid="payment-method-online">
        {head}
        {ok ? availableBody : unavailableNote(TABS.find((t) => t.id === method)!.label)}
        <div className="pt-2 flex flex-col gap-3">
          <button
            className={ok ? payButton : mutedButton}
            type="button"
            onClick={() => payOnline(method)}
            disabled={pending}
            data-testid="submit-order-button"
          >
            <span>{ok ? buttonLabel : `${TABS.find((t) => t.id === method)!.label} unavailable · see other ways to pay`}</span>
            <MIcon name={ok ? buttonIcon : "arrow_forward"} className="text-[18px]" />
          </button>
          {ok && caption && <p className="text-center font-label-sm text-label-sm text-on-surface-variant">{caption}</p>}
          {!ok && switchToCod}
        </div>
      </div>
    )
  }

  const panes: Record<PaymentMethodId, ReactNode> = {
    upi: onlinePane(
      "upi",
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Unified Payments Interface (UPI)</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Pay seamlessly with zero payment surcharge</p>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded font-label-caps text-label-caps text-on-surface uppercase tracking-wider self-start">
          <MIcon name="bolt" className="text-[14px] text-emerald-600" /> Instant Confirmation
        </span>
      </div>,
      <>
        <div>
          <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant block mb-3">Popular UPI Applications</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["Google Pay", "PhonePe", "Paytm", "BHIM / any UPI app"].map((app) => (
              <div key={app} className="bg-surface-container-low p-3 rounded flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center">
                  <MIcon name="qr_code_2" className="text-[20px] text-primary" />
                </div>
                <span className="font-label-sm text-label-sm text-on-surface font-medium">{app}</span>
              </div>
            ))}
          </div>
        </div>
        {providerNote("You choose your UPI app, enter your UPI ID or scan a QR code in Razorpay's secure window. Everwear never sees your UPI PIN.")}
      </>,
      `Pay ${total} via UPI`,
      "arrow_forward",
      "Razorpay's secure window opens to complete the payment"
    ),
    card: onlinePane(
      "card",
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Credit / Debit Card</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">RBI Compliant Tokenization Guaranteed</p>
        </div>
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          {["VISA", "MC", "RUPAY", "AMEX"].map((n) => (
            <span key={n} className="font-label-caps text-[10px] bg-surface-container px-1.5 py-0.5 rounded font-bold">
              {n}
            </span>
          ))}
        </div>
      </div>,
      providerNote(
        "Card number, expiry and CVV are entered in Razorpay's PCI-DSS certified window, and your bank may ask you to verify the payment there. Everwear never sees or stores your card details."
      ),
      `Pay ${total}`,
      "lock"
    ),
    netbanking: onlinePane(
      "netbanking",
      <div>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Net Banking</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Direct redirection to your accredited banking portal</p>
      </div>,
      providerNote("Pick your bank in Razorpay's secure window and sign in on your bank's own page. Everwear never sees your banking credentials."),
      "Proceed to Secure Gateway",
      "open_in_new"
    ),
    cod: (
      <div className="flex flex-col gap-5" data-testid="payment-method-cod">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Pay on Delivery</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Settle with physical currency or instant QR scan upon courier handover</p>
        </div>
        <div className="p-4 bg-surface-container-low rounded flex items-start gap-3">
          <MIcon name="info" className="text-[20px] text-on-surface mt-0.5" />
          <div className="font-body-sm text-body-sm text-on-surface-variant space-y-1">
            <p>You can pay via cash or by scanning the courier&apos;s UPI QR code directly on consignment delivery.</p>
            <p className="text-xs text-outline">To curtail logistics wastage, please ensure you are available at the destination.</p>
          </div>
        </div>
        <div className="p-4 rounded bg-surface-container flex flex-col gap-3">
          <span className="font-label-caps text-label-caps uppercase text-on-surface">Amount Due at Delivery</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Keep <strong className="text-on-surface">{total}</strong> ready for the courier. Your order is confirmed as soon as you place it.
          </p>
        </div>
        {availability.methods.cod ? (
          <button className={`${payButton} mt-2`} type="button" onClick={placeCod} disabled={pending} data-testid="submit-order-button">
            <span>{pending ? "Placing order…" : `Place Order (${total})`}</span>
            <MIcon name="check_circle" className="text-[18px]" />
          </button>
        ) : (
          unavailableNote("Pay on Delivery")
        )}
      </div>
    ),
    emi: (
      <div className="flex flex-col gap-5" data-testid="payment-method-emi">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">EMI &amp; Pay Later Services</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Split payments into frictionless monthly installments</p>
        </div>
        <div className="space-y-3">
          {[
            { name: "Simpl 1-Click PayLater", note: "Pay later through Simpl" },
            { name: "Credit Card No-Cost EMI", note: "Monthly instalments on eligible credit cards" },
          ].map((p) => (
            <div key={p.name} className="p-4 bg-surface-container-low rounded flex items-center justify-between gap-3 opacity-70">
              <div>
                <span className="font-body-md text-body-md font-medium text-on-surface block">{p.name}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">{p.note}</span>
              </div>
              <span className="font-label-caps text-label-caps text-on-surface-variant bg-surface-container px-2 py-0.5 rounded shrink-0">Not offered</span>
            </div>
          ))}
        </div>
        {unavailableNote("EMI & PayLater")}
        {switchToCod}
      </div>
    ),
  }

  return (
    <main className="w-full pt-20 bg-background min-h-screen">
      <div className="flex flex-col w-full">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-margin py-8 lg:py-12">
          {/* Checkout progress */}
          <div className="w-full flex justify-center mb-10 lg:mb-14">
            <CheckoutStepper current="payment" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-8 items-start">
            {/* Left Column */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6 min-w-0" data-testid="payment-step">

              {generalError && (
                <div className="flex items-center gap-3 p-4 bg-error-container text-on-error-container rounded font-body-sm text-body-sm" role="alert" data-testid="checkout-error">
                  <MIcon name="error" className="text-[20px]" />
                  <span>{generalError}</span>
                </div>
              )}

              {/* Compact Dispatch & Delivery Recap Bar */}
              <div className="bg-surface-container-lowest p-5 sm:p-6 rounded shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4" data-testid="deliver-to-summary">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                    <MIcon name="local_shipping" className="text-[20px] text-on-surface" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-body-md text-body-md font-medium text-on-surface">{fullName(ship)}</p>
                      {ship?.postalCode && (
                        <span className="font-label-sm text-label-sm bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant font-medium">{ship.postalCode}</span>
                      )}
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{oneLine({ ...ship, postalCode: undefined })}</p>
                    {option && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 font-label-sm text-label-sm text-on-surface-variant">
                        <span className="flex items-center gap-1 text-on-surface font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" aria-hidden />
                          {option.name}
                        </span>
                        <span aria-hidden>•</span>
                        <span>{deliveryEstimateShort(option, cart.shippingOptions, region.policies)}</span>
                        <span aria-hidden>•</span>
                        {cart.totals.shippingTotal === 0 ? (
                          <span className="text-emerald-700 font-semibold uppercase">Free</span>
                        ) : (
                          <span className="text-on-surface font-semibold">{money(cart, cart.totals.shippingTotal)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <LocalizedClientLink
                  href="/checkout?step=review"
                  className="self-start sm:self-center font-label-caps text-label-caps uppercase tracking-wider text-on-surface hover:text-primary underline underline-offset-4 decoration-outline-variant transition-colors whitespace-nowrap"
                >
                  Change
                </LocalizedClientLink>
              </div>

              {/* Primary Payment Settlement Engine */}
              <div className="bg-surface-container-lowest rounded shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <MIcon name="verified_user" className="text-[22px] text-on-surface" />
                    <h2 className="font-headline-sm text-headline-sm uppercase tracking-wide text-on-surface">Select Payment Method</h2>
                  </div>
                  <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
                    <MIcon name="lock" className="text-[16px] text-emerald-600" />
                    <span>100% End-to-End Encrypted</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row">
                  <div
                    role="tablist"
                    aria-label="Payment methods"
                    aria-orientation="vertical"
                    className="w-full md:w-64 bg-surface-container-lowest shrink-0 flex md:flex-col overflow-x-auto md:overflow-visible"
                  >
                    {TABS.map((t) => {
                      const selected = active === t.id
                      const ok = available(t.id)
                      return (
                        <button
                          key={t.id}
                          id={`tab-${t.id}`}
                          role="tab"
                          aria-selected={selected}
                          aria-controls={`pane-${t.id}`}
                          className={`payment-tab group w-auto md:w-full shrink-0 text-left p-4.5 sm:p-5 flex items-center justify-between gap-3 transition-all relative ${
                            selected ? "bg-surface-container-low text-primary" : "hover:bg-surface-container-low text-on-surface-variant"
                          }`}
                          onClick={() => setActive(t.id)}
                          type="button"
                          data-testid={`payment-tab-${t.id}`}
                        >
                          <div className={`flex items-center gap-3 ${ok ? "" : "opacity-60"}`}>
                            <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-on-surface group-hover:scale-105 transition-transform shrink-0">
                              <MIcon name={t.icon} className="text-[20px]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-body-md text-body-md font-medium text-on-surface whitespace-nowrap">{t.label}</span>
                                {t.badge && ok && (
                                  <span className="font-label-caps text-[9px] bg-primary text-on-primary px-1.5 py-0.5 rounded uppercase font-semibold">{t.badge}</span>
                                )}
                              </div>
                              <span className="font-body-sm text-body-sm text-on-surface-variant text-xs whitespace-nowrap">{ok ? t.hint : "Unavailable right now"}</span>
                            </div>
                          </div>
                          <div className={`hidden md:block w-1.5 h-6 rounded-full shrink-0 ${selected ? "bg-primary" : "bg-transparent"}`} />
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex-1 p-6 md:p-8 bg-surface-container-lowest min-w-0" role="tabpanel" id={`pane-${active}`} aria-labelledby={`tab-${active}`}>
                    {panes[active]}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <aside className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 min-w-0" aria-label="Order summary">
              <div className="bg-surface-container-lowest p-6 rounded shadow-sm flex flex-col gap-6 lg:sticky lg:top-24">
                <div className="flex items-center justify-between pb-4">
                  <h2 className="font-headline-sm text-headline-sm uppercase tracking-wide text-on-surface">Order Summary</h2>
                  <span className="font-label-caps text-label-caps px-2.5 py-0.5 bg-surface-container rounded text-on-surface uppercase font-semibold">{itemCountLabel(cart)}</span>
                </div>

                <ul className="flex flex-col gap-4" data-testid="items-table">
                  {cart.items.map((item) => (
                    <li key={item.id} className="flex gap-4 items-start pb-1" data-testid="product-row">
                      <div className="w-20 h-26 rounded bg-surface-container overflow-hidden shrink-0 relative">
                        {item.thumbnail && <Image src={item.thumbnail} alt={item.productTitle} fill sizes="80px" className="object-cover object-top" />}
                      </div>
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <h4 className="font-body-md text-body-md font-medium text-on-surface mt-0.5 line-clamp-1" data-testid="product-title">{item.productTitle}</h4>
                          <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant mt-1">
                            {variantLine(item) && (
                              <>
                                <span>Size: {variantLine(item)}</span>
                                <span aria-hidden>•</span>
                              </>
                            )}
                            <span>Qty: {item.quantity}</span>
                          </div>
                        </div>
                        <div className="font-headline-sm text-headline-sm text-on-surface font-medium mt-3">{money(cart, item.total)}</div>
                      </div>
                    </li>
                  ))}
                </ul>

                <PromoField applied={cart.promoCodes} variant="payment" />

                <div className="space-y-3 pt-2 font-body-sm text-body-sm">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Bag Total</span>
                    <span className="text-on-surface font-medium">{money(cart, cart.totals.itemSubtotal)}</span>
                  </div>
                  {cart.totals.discountTotal > 0 && (
                    <div className="flex justify-between text-on-surface-variant">
                      <span>Coupon Discount</span>
                      <span className="text-emerald-700 font-medium">- {money(cart, cart.totals.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-on-surface-variant gap-3">
                    <span>{option?.name ?? "Delivery"}</span>
                    {cart.totals.shippingTotal === 0 ? (
                      <span className="text-emerald-700 font-semibold uppercase">Free</span>
                    ) : (
                      <span className="text-on-surface">{money(cart, cart.totals.shippingTotal)}</span>
                    )}
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      {taxLabel(region)}
                      <span className="material-symbols-outlined text-[14px] text-outline" title={`Indian GST at ${region.taxRate}%`} aria-hidden>
                        info
                      </span>
                    </span>
                    <span className="text-on-surface">{money(cart, cart.totals.taxTotal)}</span>
                  </div>
                  <div className="pt-4 mt-2">
                    <div className="flex justify-between items-baseline gap-3">
                      <div>
                        <span className="font-headline-sm text-headline-sm font-semibold text-on-surface block">Total Amount</span>
                        <span className="font-body-sm text-xs text-outline">Inclusive of all taxes</span>
                      </div>
                      <div className="font-headline-xl text-headline-xl font-bold text-on-surface tracking-tight max-sm:text-[2rem]" data-testid="checkout-total">
                        {total}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3 font-label-sm text-label-sm text-on-surface-variant">
                  <div className="flex items-center gap-2.5">
                    <MIcon name="format_image_left" className="text-[18px] text-on-surface" />
                    <span>256-Bit SSL Bank Grade Encryption</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MIcon name="assignment_return" className="text-[18px] text-on-surface" />
                    <span>{returnsLine(region.policies)}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MIcon name="verified" className="text-[18px] text-on-surface" />
                    <span>PCI-DSS Level 1 Authenticated Gateway</span>
                  </div>
                </div>
                <p className="font-body-sm text-[11px] text-outline leading-relaxed text-center" data-testid="order-terms">
                  By placing this order, you agree to Everwear&apos;s{" "}
                  <LocalizedClientLink href="/terms" className="underline hover:text-primary">
                    Terms of Service
                  </LocalizedClientLink>{" "}
                  and{" "}
                  <LocalizedClientLink href="/privacy" className="underline hover:text-primary">
                    Privacy Policy
                  </LocalizedClientLink>
                  .
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}
