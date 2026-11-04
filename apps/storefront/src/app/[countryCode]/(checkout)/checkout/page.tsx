import { retrieveCustomer } from "@lib/data/account"
import { listRegions } from "@lib/data/catalog"
import { retrieveCart } from "@lib/data/shop"
import { SecureCheckoutFlow } from "@modules/checkout/secure-checkout-flow"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Secure Checkout & Payment | Everwear",
  description: "256-bit SSL encrypted secure checkout for Everwear apparel.",
  robots: { index: false },
}

export default async function Checkout(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ step?: string }>
}) {
  await props.params
  await props.searchParams
  const [cart, customer, regions] = await Promise.all([
    retrieveCart().catch(() => null),
    retrieveCustomer().catch(() => null),
    listRegions().catch(() => []),
  ])

  // Nothing to check out: no bag, or an empty one.
  if (!cart || cart.items.length === 0) {
    notFound()
  }

  const countries = regions
    .flatMap((r) => r.countries)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <SecureCheckoutFlow
      cart={cart}
      customer={customer}
      countries={countries}
    />
  )
}
