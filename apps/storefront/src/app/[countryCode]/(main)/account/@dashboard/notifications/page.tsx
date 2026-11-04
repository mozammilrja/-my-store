import { retrieveCustomer } from "@lib/data/account"
import { NotificationsView } from "@modules/account/notifications-view"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Notifications | Everwear Atelier", robots: { index: false } }

export default async function NotificationsPage() {
  const customer = await retrieveCustomer().catch(() => null)
  if (!customer) return null

  return (
    <div data-testid="notifications-page">
      <NotificationsView />
    </div>
  )
}
