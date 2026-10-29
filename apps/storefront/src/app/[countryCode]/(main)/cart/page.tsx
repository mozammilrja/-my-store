import { retrieveCustomer } from "@lib/data/account"
import { retrieveCart } from "@lib/data/shop"
import { BagTemplate } from "@modules/bag/template"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false },
}

const ERRORS: Record<string, string> = {
  order_failed: "We couldn't complete your order. Your bag is still here, so you can try checkout again.",
  add_failed: "We couldn't add that item to your bag. It may be out of stock.",
}

export default async function CartPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await props.searchParams
  const [cart, customer] = await Promise.all([
    retrieveCart().catch(() => null),
    retrieveCustomer().catch(() => null),
  ])

  return <BagTemplate cart={cart} customer={customer} error={error ? ERRORS[error] : undefined} />
}
