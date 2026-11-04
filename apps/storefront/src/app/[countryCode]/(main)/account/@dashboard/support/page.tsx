import { retrieveCustomer } from "@lib/data/account"
import { SupportView } from "@modules/account/support-view"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Help & Support | Everwear Atelier", robots: { index: false } }

export default async function SupportPage() {
  const customer = await retrieveCustomer().catch(() => null)
  if (!customer) return null

  return (
    <div data-testid="support-page">
      <SupportView />
    </div>
  )
}
