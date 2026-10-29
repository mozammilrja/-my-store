import { Container } from "@/components/store/container"
import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
}

export default async function Checkout(props: {
  searchParams: Promise<{ redirect_status?: string }>
}) {
  const { redirect_status } = await props.searchParams
  const cart = await retrieveCart().catch(() => null)

  if (!cart || !cart.items?.length) {
    notFound()
  }

  const customer = await retrieveCustomer().catch(() => null)

  return (
    <Container className="grid gap-12 py-10 lg:grid-cols-12 lg:py-14">
      <div className="flex flex-col gap-8 lg:col-span-7">
        <h1 className="font-display-tight text-6xl">Checkout</h1>
        {redirect_status === "failed" && (
          <p role="alert" className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive-foreground" data-testid="payment-failed-message">
            Your payment wasn&apos;t authorised. Please try again or choose another payment method.
          </p>
        )}
        <PaymentWrapper cart={cart}>
          <CheckoutForm cart={cart} customer={customer} />
        </PaymentWrapper>
      </div>
      <div className="lg:col-span-5">
        <CheckoutSummary cart={cart} />
      </div>
    </Container>
  )
}
