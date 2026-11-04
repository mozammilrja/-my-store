import { listOrders, retrieveCustomer } from "@lib/data/account"
import { listProducts } from "@lib/data/catalog"
import { OrdersListView } from "@modules/account/orders-list-view"
import { Metadata } from "next"

export const metadata: Metadata = { title: "My Orders | Everwear Atelier", robots: { index: false } }

export default async function OrdersPage(props: { params: Promise<{ countryCode: string }> }) {
  const { countryCode } = await props.params
  const customer = await retrieveCustomer()
  if (!customer) return null

  const [orders, productList] = await Promise.all([
    listOrders().catch(() => []),
    listProducts({ country: countryCode, limit: 12 }).catch(() => ({ products: [] })),
  ])

  return (
    <div data-testid="orders-page-container">
      <OrdersListView customer={customer} orders={orders} catalogProducts={productList.products} />
    </div>
  )
}
