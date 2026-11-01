import { listOrders, retrieveCustomer } from "@lib/data/account"
import { TrackOrdersView } from "@modules/account/track-orders-view"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Track Orders | Everwear Atelier", robots: { index: false } }

export default async function TrackOrdersPage() {
  const customer = await retrieveCustomer().catch(() => null)
  if (!customer) return null

  const orders = await listOrders().catch(() => [])

  return (
    <div data-testid="track-orders-page">
      <TrackOrdersView orders={orders} />
    </div>
  )
}
