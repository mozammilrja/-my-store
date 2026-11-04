import { listOrders, retrieveCustomer } from "@lib/data/account"
import { ReturnsView } from "@modules/account/returns-view"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Returns & Refunds | Everwear Atelier", robots: { index: false } }

export default async function ReturnsPage() {
  const customer = await retrieveCustomer().catch(() => null)
  if (!customer) return null

  const orders = await listOrders().catch(() => [])

  return (
    <div data-testid="returns-page">
      <ReturnsView customer={customer} orders={orders} />
    </div>
  )
}
