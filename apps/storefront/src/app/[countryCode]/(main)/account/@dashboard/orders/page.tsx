import { listOrders, retrieveCustomer } from "@lib/data/account"
import { formatMoney } from "@lib/money"
import { statusLabel } from "@modules/account/order-view"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = { title: "Orders", robots: { index: false } }

export default async function OrdersPage() {
  const customer = await retrieveCustomer()
  if (!customer) notFound()
  const orders = await listOrders()
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display-hero text-4xl sm:text-5xl font-light tracking-tight">Orders</h1>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="no-orders">You haven&apos;t placed any orders yet.</p>
      ) : (
        <ul className="divide-y border-y" data-testid="orders-list">
          {orders.map((o) => (
            <li key={o.id}>
              <LocalizedClientLink href={`/account/orders/details/${o.id}`} className="grid grid-cols-2 gap-2 py-4 text-sm hover:bg-surface sm:grid-cols-4">
                <span className="font-semibold">#{o.displayId}</span>
                <span className="text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("en-GB")}</span>
                <span>
                  {o.itemCount} {o.itemCount === 1 ? "item" : "items"} · {statusLabel(o.status === "canceled" ? "canceled" : o.fulfillmentStatus)}
                </span>
                <span className="tabular-nums sm:text-right">{formatMoney(o.total, o.currency)}</span>
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
