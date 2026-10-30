import type { Order } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import { Totals } from "@modules/bag/totals"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

const LABELS: Record<string, string> = {
  awaiting: "Pay on delivery",
  paid: "Paid",
  refunded: "Refunded",
  unfulfilled: "Being prepared",
  shipped: "Shipped",
  delivered: "Delivered",
  returned: "Returned",
  pending: "Open",
  completed: "Completed",
  canceled: "Canceled",
}

export const statusLabel = (s: string) => LABELS[s] ?? s

/** One order's items, addresses, delivery, payment and totals. */
export function OrderView({ order }: { order: Order }) {
  const a = order.shippingAddress
  return (
    <div className="flex flex-col gap-10">
      <dl className="grid gap-4 border-y py-6 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Order</dt>
          <dd className="font-semibold" data-testid="order-id">#{order.displayId}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Placed</dt>
          <dd data-testid="order-date">{new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd data-testid="order-status">{statusLabel(order.status === "canceled" ? "canceled" : order.fulfillmentStatus)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Payment</dt>
          <dd data-testid="payment-status">{statusLabel(order.paymentStatus)}</dd>
        </div>
      </dl>

      <ul className="divide-y border-b" data-testid="order-items">
        {order.items.map((item) => (
          <li key={item.id} className="grid grid-cols-[5rem_1fr_auto] gap-4 py-4 text-sm">
            <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-surface">
              {item.thumbnail && <Image src={item.thumbnail} alt="" fill sizes="80px" className="object-cover" />}
            </div>
            <div className="flex flex-col gap-1">
              <LocalizedClientLink href={`/products/${item.productHandle}`} className="font-medium hover:underline">
                {item.productTitle}
              </LocalizedClientLink>
              <span className="text-muted-foreground">{item.variantTitle}</span>
              <span className="text-muted-foreground">
                {item.quantity} × {formatMoney(item.unitPrice, order.currency)}
              </span>
            </div>
            <span className="tabular-nums">{formatMoney(item.total, order.currency)}</span>
          </li>
        ))}
      </ul>

      <div className="grid gap-10 sm:grid-cols-2">
        <div className="grid gap-6 text-sm sm:grid-cols-2 sm:col-span-1">
          <div>
            <h3 className="mb-2 font-semibold">Delivery address</h3>
            <p className="text-muted-foreground" data-testid="shipping-address">
              {a.firstName} {a.lastName}
              <br />
              {a.address1}
              {a.address2 ? `, ${a.address2}` : ""}
              <br />
              {a.postalCode} {a.city}
              <br />
              {a.countryCode.toUpperCase()}
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Delivery</h3>
            <p className="text-muted-foreground">{order.shippingOption.name}</p>
            <h3 className="mt-4 mb-2 font-semibold">Payment</h3>
            <p className="text-muted-foreground" data-testid="payment-method">Cash on delivery</p>
          </div>
        </div>
        <Totals totals={order.totals} currency={order.currency} shippingChosen />
      </div>
    </div>
  )
}
