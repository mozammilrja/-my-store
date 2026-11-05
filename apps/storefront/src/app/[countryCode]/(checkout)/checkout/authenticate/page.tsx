import { getPaymentMethods } from "@lib/data/payments"
import { retrieveCart } from "@lib/data/shop"
import { formatMoney } from "@lib/money"
import { getSeller } from "@lib/data/seller"
import { AuthenticateView } from "@modules/checkout/authenticate-view"
import { fullName } from "@modules/checkout/checkout-data"
import { SecureHeader, StitchPage } from "@modules/stitch/shell"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Payment Verification | Everwear",
  robots: { index: false },
}

/**
 * The interstitial while an online payment (UPI, card, net banking) is with
 * Razorpay; ported from storefront_checkout_3d_secure_otp_banking_authentication.
 * Reached from the payment step's online "Pay" button. It never collects OTPs,
 * PINs or passwords: the bank's own window does.
 */
export default async function Authenticate(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ method?: string }>
}) {
  const seller = await getSeller()
  const { countryCode } = await props.params
  const { method: raw } = await props.searchParams
  const method = raw === "card" || raw === "netbanking" ? raw : "upi"

  const cart = await retrieveCart().catch(() => null)
  if (!cart || cart.items.length === 0) redirect(`/${countryCode}/cart`)
  if (!cart.email || !cart.shippingAddress || !cart.shippingOptionId) redirect(`/${countryCode}/checkout`)

  const methods = await getPaymentMethods()
  const available = methods.online && methods.methods[method]

  return (
    <StitchPage className="min-h-screen">
      <SecureHeader />
      <main className="w-full bg-background">
        <div className="flex flex-col w-full">
          <AuthenticateView
            available={available}
            method={method}
            amount={formatMoney(cart.totals.total, cart.currency)}
            merchant={seller.legalName ?? "Everwear"}
            countryCode={countryCode}
            prefill={{ name: fullName(cart.shippingAddress), email: cart.email, contact: cart.shippingAddress.phone ?? "" }}
          />
        </div>
      </main>
    </StitchPage>
  )
}
