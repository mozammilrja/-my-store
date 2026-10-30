import { Button } from "@/components/ui/button"
import { listOrders, retrieveCustomer } from "@lib/data/account"
import { formatMoney } from "@lib/money"
import { statusLabel } from "@modules/account/order-view"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = { title: "Your account", robots: { index: false } }

export default async function AccountOverview() {
  const customer = await retrieveCustomer()
  if (!customer) notFound()
  const orders = (await listOrders()).slice(0, 5)

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display-hero text-4xl sm:text-5xl font-light tracking-tight" data-testid="welcome-message">
        Hi {customer.firstName || "there"}
      </h1>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200/80 bg-card p-5 shadow-xs">
          <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Orders</dt>
          <dd className="mt-2 font-headline-lg text-3xl font-light tabular-nums">{orders.length}</dd>
        </div>
        <div className="rounded-xl border border-stone-200/80 bg-card p-5 shadow-xs">
          <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Saved addresses</dt>
          <dd className="mt-2 font-headline-lg text-3xl font-light tabular-nums">{customer.addresses.length}</dd>
        </div>
      </dl>
      <section className="flex flex-col gap-4">
        <h2 className="font-headline-sm text-2xl font-normal tracking-tight">Recent orders</h2>
        {orders.length === 0 ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm text-muted-foreground">No orders yet.</p>
            <Button asChild>
              <LocalizedClientLink href="/store">Start shopping</LocalizedClientLink>
            </Button>
          </div>
        ) : (
          <ul className="divide-y border-y">
            {orders.map((o) => (
              <li key={o.id}>
                <LocalizedClientLink href={`/account/orders/details/${o.id}`} className="flex items-center justify-between gap-4 py-4 text-sm hover:bg-surface">
                  <span className="font-semibold">#{o.displayId}</span>
                  <span className="text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("en-GB")}</span>
                  <span>{statusLabel(o.status === "canceled" ? "canceled" : o.fulfillmentStatus)}</span>
                  <span className="tabular-nums">{formatMoney(o.total, o.currency)}</span>
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
