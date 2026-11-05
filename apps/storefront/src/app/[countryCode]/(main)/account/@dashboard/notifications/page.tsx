import { getNotificationPreferences, listNotifications, retrieveCustomer } from "@lib/data/account"
import { NotificationsView } from "@modules/account/notifications-view"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Notifications | Everwear Atelier", robots: { index: false } }

export default async function NotificationsPage() {
  const customer = await retrieveCustomer().catch(() => null)
  if (!customer) return null
  const [notifications, prefs] = await Promise.all([
    listNotifications().catch(() => []),
    getNotificationPreferences().catch(() => ({ preferences: { email: true, sms: true, whatsapp: false, push: true }, pushDevices: 0 })),
  ])

  return (
    <div data-testid="notifications-page">
      <NotificationsView notifications={notifications} preferences={prefs.preferences} hasPhone={!!customer.phone || customer.addresses.some((a) => !!a.phone)} />
    </div>
  )
}
