import { retrieveCustomer } from "@lib/data/account"
import { PaymentsView } from "@modules/account/payments-view"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Payment Methods | Everwear Atelier", robots: { index: false } }

export default async function PaymentsPage() {
  const customer = await retrieveCustomer().catch(() => null)
  if (!customer) return null

  return (
    <div data-testid="payments-page">
      <PaymentsView />
    </div>
  )
}
