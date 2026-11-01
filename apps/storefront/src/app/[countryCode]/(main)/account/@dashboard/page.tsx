import { listOrders, retrieveCustomer } from "@lib/data/account"
import { listProducts } from "@lib/data/catalog"
import { OverviewView } from "@modules/account/overview-view"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Account Overview | Everwear Atelier", robots: { index: false } }

export default async function AccountOverview(props: { params: Promise<{ countryCode: string }> }) {
  const { countryCode } = await props.params
  const customer = await retrieveCustomer()
  if (!customer) return null

  const [orders, productList] = await Promise.all([
    listOrders().catch(() => []),
    listProducts({ country: countryCode, limit: 8 }).catch(() => ({ products: [] })),
  ])

  return (
    <div data-testid="account-overview">
      <OverviewView customer={customer} orders={orders} catalogProducts={productList.products} />
    </div>
  )
}
