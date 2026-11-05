import { listOrders, listReturns, retrieveCustomer } from "@lib/data/account"
import { getStorePolicies } from "@lib/data/catalog"
import { ReturnsView } from "@modules/account/returns-view"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Returns & Refunds | Everwear Atelier", robots: { index: false } }

export default async function ReturnsPage(props: { params: Promise<{ countryCode: string }> }) {
  const { countryCode } = await props.params
  const customer = await retrieveCustomer().catch(() => null)
  if (!customer) return null

  const [orders, returns, policies] = await Promise.all([
    listOrders().catch(() => []),
    listReturns().catch(() => []),
    getStorePolicies(countryCode).catch(() => null),
  ])

  return (
    <div data-testid="returns-page">
      <ReturnsView customer={customer} orders={orders} returns={returns} returnWindowDays={policies?.current?.returnWindowDays ?? null} />
    </div>
  )
}
