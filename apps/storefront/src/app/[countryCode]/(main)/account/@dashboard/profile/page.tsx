import { listOrders, retrieveCustomer } from "@lib/data/account"
import { ProfileForm } from "@modules/account/profile-form"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Personal Information | Everwear Atelier", robots: { index: false } }

export default async function ProfilePage() {
  const [customer, orders] = await Promise.all([
    retrieveCustomer(),
    listOrders().catch(() => []),
  ])
  if (!customer) return null

  return <ProfileForm customer={customer} ordersCount={orders.length} />
}
