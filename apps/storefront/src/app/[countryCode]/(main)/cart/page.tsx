import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { BagTemplate } from "@modules/bag/template"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false },
}

const ERRORS: Record<string, string> = {
  order_failed: "We couldn't complete your order. Your bag is still here, so you can try checkout again. If you see a charge without an order confirmation, please contact us.",
  payment_failed: "Your payment didn't go through. Please try again or use another payment method.",
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
