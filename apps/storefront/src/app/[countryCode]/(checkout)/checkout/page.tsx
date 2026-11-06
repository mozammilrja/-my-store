import { retrieveCustomer } from "@lib/data/account"
import { getStorePolicies, listRegions } from "@lib/data/catalog"
import { getPaymentMethods } from "@lib/data/payments"
import { checkServiceability } from "@lib/data/shipping"
import { retrieveCart, setShippingOption } from "@lib/data/shop"
import { formatMoney } from "@lib/money"
import { AddressStep } from "@modules/checkout/address-step"
import { type CheckoutRegion, type CheckoutStep, isMethod } from "@modules/checkout/checkout-data"
import { DeliveryStep } from "@modules/checkout/delivery-step"
import { PaymentStep } from "@modules/checkout/payment-step"
import { ReviewStep } from "@modules/checkout/review-step"
import { CheckoutHeader, StitchPage } from "@modules/stitch/shell"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Secure Checkout | Everwear",
  description: "Secure checkout for Everwear apparel.",
  robots: { index: false },
}

const STEPS: CheckoutStep[] = ["address", "delivery", "review", "payment"]

/**
 * Checkout: address -> delivery -> review -> payment, one Stitch export per
 * step; the order is placed on payment. A step only opens once the bag has
 * what it needs; a later or unknown step redirects to the right one.
 */
export default async function Checkout(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ step?: string; method?: string }>
}) {
  const { countryCode } = await props.params
  const { step, method } = await props.searchParams
  const [initialCart, customer, regions, policies] = await Promise.all([
    retrieveCart().catch(() => null),
    retrieveCustomer().catch(() => null),
    listRegions().catch(() => []),
    getStorePolicies(countryCode).catch(() => null),
  ])

  // Nothing to check out: no bag, or an empty one.
  // Nothing to check out (no bag, an empty one, or the order was just placed):
  // send the shopper to their bag, which says it is empty, instead of a 404.
  if (!initialCart || initialCart.items.length === 0) redirect(`/${countryCode}/cart`)
  let cart = initialCart

  const hasAddress = Boolean(cart.email && cart.shippingAddress)
  const hasDelivery = hasAddress && Boolean(cart.shippingOptionId)
  // The furthest step the bag allows, and the first one still to do.
  const reachable: CheckoutStep = !hasAddress ? "address" : !hasDelivery ? "delivery" : "payment"
  const firstOpen: CheckoutStep = hasDelivery ? "review" : reachable
  // "shipping" was the review step's earlier name; anything else unknown goes
  // to the first step still to do instead of quietly showing another step.
  const named = step === "shipping" ? "review" : step
  const requested: CheckoutStep | null = STEPS.includes(named as CheckoutStep) ? (named as CheckoutStep) : null
  if (step && !requested) redirect(`/${countryCode}/checkout?step=${firstOpen}`)
  const wanted = requested ?? "address"
  const stage = STEPS.indexOf(wanted) <= STEPS.indexOf(reachable) ? wanted : reachable
  if (step && stage !== step) {
    const keep = stage === "payment" && method ? `&method=${encodeURIComponent(method)}` : ""
    redirect(`/${countryCode}/checkout?step=${stage}${keep}`)
  }

  const regionDoc = regions.find((r) => r.id === cart.regionId)
  const region: CheckoutRegion = {
    taxRate: regionDoc?.taxRate ?? 0,
    taxInclusive: regionDoc?.taxInclusive ?? false,
    policies: regionDoc?.policies ?? policies?.current ?? null,
  }
  const countries = regions.flatMap((r) => r.countries).sort((a, b) => a.name.localeCompare(b.name))

  // The delivery step opens with the cheapest option chosen and recorded, so
  // the summary's fee and total are the API's, not a guess.
  if (stage === "delivery" && !cart.shippingOptionId && cart.shippingOptions.length) {
    const cheapest = cart.shippingOptions.reduce((m, o) => (o.amount < m.amount ? o : m))
    // Use the bag the save returns: a second retrieveCart() in this render
    // would get the memoized first response, from before the save.
    const saved = await setShippingOption(cheapest.id)
    if (!saved.error && saved.cart) cart = saved.cart
  }

  let body: React.ReactNode
  if (stage === "address") {
    // The export's promo ticker, built from the region's real delivery options and returns policy.
    const standard = cart.shippingOptions.reduce<(typeof cart.shippingOptions)[number] | null>((m, o) => (!m || o.amount < m.amount ? o : m), null)
    const express = cart.shippingOptions.find((o) => standard && o.id !== standard.id)
    const ticker = [
      "Mid-Season Spring Edit",
      standard && (standard.amount === 0 ? "Complimentary standard delivery" : `Standard delivery ${formatMoney(standard.amount, cart.currency)}`),
      express && `Express ${formatMoney(express.amount, cart.currency)}`,
      region.policies && `${region.policies.returnWindowDays}-day returns`,
    ]
      .filter(Boolean)
      .join(" • ")
    body = <AddressStep cart={cart} customer={customer} countries={countries} region={region} countryCode={countryCode} ticker={ticker} />
  } else if (stage === "delivery") {
    const first = customer?.addresses[0]
    const isDefault = !!first && first.address1 === cart.shippingAddress?.address1 && first.postalCode === cart.shippingAddress?.postalCode
    const reach = cart.shippingAddress ? await checkServiceability(cart.shippingAddress.postalCode) : null
    body = <DeliveryStep cart={cart} region={region} countryCode={countryCode} isDefaultAddress={isDefault} serviceability={reach} />
  } else if (stage === "review") {
    body = <ReviewStep cart={cart} customer={customer} region={region} countryCode={countryCode} />
  } else {
    const methods = await getPaymentMethods()
    const initialMethod = isMethod(method) ? method : methods.methods.cod ? "cod" : "upi"
    body = (
      <PaymentStep
        cart={cart}
        region={region}
        countryCode={countryCode}
        availability={{ online: methods.online, methods: methods.methods }}
        initialMethod={initialMethod}
      />
    )
  }

  return (
    <StitchPage>
      <CheckoutHeader />
      {body}
    </StitchPage>
  )
}
