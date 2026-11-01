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

  // There is nothing to check out, so there is no checkout page. The flow below
  // reads the real cart and the real customer: an empty bag gets a 404 rather
  // than sample items and a sample shopper, which would show a signed-out
  // visitor someone else's name and address and put a live Place Order button
  // under a cart the server does not have.
  if (!cart || cart.items.length === 0) notFound()

  const countries = regions
    .flatMap((r) => r.countries)
    .sort((a, b) => a.name.localeCompare(b.name))

  return <SecureCheckoutFlow cart={cart} customer={customer} countries={countries} />
}
