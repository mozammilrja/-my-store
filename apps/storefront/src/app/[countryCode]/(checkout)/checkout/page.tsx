import { Container } from "@/components/store/container"
import { retrieveCustomer } from "@lib/data/account"
import { listRegions } from "@lib/data/catalog"
import { retrieveCart } from "@lib/data/shop"
import { formatMoney } from "@lib/money"
import { AddressStep } from "@modules/checkout/address-step"
import { DeliveryStep } from "@modules/checkout/delivery-step"
import { ReviewStep } from "@modules/checkout/review-step"
import { Step } from "@modules/checkout/step"
import { CheckoutSummary } from "@modules/checkout/summary"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
}

type StepName = "address" | "delivery" | "review"

export default async function Checkout(props: { searchParams: Promise<{ step?: string }> }) {
  const { step: requested } = await props.searchParams
  const [cart, customer, regions] = await Promise.all([
    retrieveCart().catch(() => null),
    retrieveCustomer().catch(() => null),
    listRegions(),
  ])
  if (!cart || cart.items.length === 0) notFound()

  const hasAddress = !!cart.email && !!cart.shippingAddress
  const hasDelivery = hasAddress && !!cart.shippingOptionId
  // Never skip ahead past an unfinished step, whatever the URL says.
  const furthest: StepName = !hasAddress ? "address" : !hasDelivery ? "delivery" : "review"
  const order: StepName[] = ["address", "delivery", "review"]
  const step: StepName = order.includes(requested as StepName) && order.indexOf(requested as StepName) <= order.indexOf(furthest) ? (requested as StepName) : furthest
  const stateOf = (s: StepName) => (s === step ? "open" : order.indexOf(s) < order.indexOf(step) ? "done" : "upcoming")

  const countries = regions.flatMap((r) => r.countries).sort((a, b) => a.name.localeCompare(b.name))
  const saved = customer?.addresses[0]
  const shipping = cart.shippingAddress ?? (saved ? { ...saved } : { countryCode: cart.countryCodes[0] })
  const chosen = cart.shippingOptions.find((o) => o.id === cart.shippingOptionId)
  const addr = cart.shippingAddress

  return (
    <Container className="grid gap-12 py-10 lg:grid-cols-12 lg:py-14">
      <div className="flex flex-col lg:col-span-7">
        <h1 className="font-display-tight text-6xl">Checkout</h1>

        <Step number={1} title="Delivery address" state={stateOf("address")} editHref="/checkout?step=address" testId="address-step">
          {step === "address" ? (
            <AddressStep email={cart.email ?? customer?.email ?? ""} shipping={shipping} billing={cart.billingAddress} countries={countries} />
          ) : (
            addr && (
              <div className="grid gap-4 text-sm sm:grid-cols-2" data-testid="shipping-address-summary">
                <p>
                  {addr.firstName} {addr.lastName}
                  <br />
                  {addr.address1}
                  {addr.address2 ? `, ${addr.address2}` : ""}
                  <br />
                  {addr.postalCode} {addr.city}, {addr.countryCode.toUpperCase()}
                </p>
                <p className="text-muted-foreground" data-testid="shipping-contact-summary">{cart.email}</p>
              </div>
            )
          )}
        </Step>

        <Step number={2} title="Delivery" state={stateOf("delivery")} editHref="/checkout?step=delivery" testId="delivery-step">
          {step === "delivery" ? (
            <DeliveryStep options={cart.shippingOptions} selected={cart.shippingOptionId} currency={cart.currency} />
          ) : (
            chosen && (
              <p className="text-sm">
                {chosen.name} · {formatMoney(chosen.amount, cart.currency)}
              </p>
            )
          )}
        </Step>

        <Step number={3} title="Review and pay" state={stateOf("review")} testId="review-step">
          {step === "review" && <ReviewStep total={formatMoney(cart.totals.total, cart.currency)} />}
        </Step>
      </div>
      <div className="lg:col-span-5">
        <CheckoutSummary cart={cart} />
      </div>
    </Container>
  )
}
