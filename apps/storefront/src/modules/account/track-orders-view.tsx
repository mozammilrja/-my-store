"use client"

import type { OrderSummary } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { carrierName, shipmentStatusLabel } from "@modules/order/track/tracking"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { StoreSelect } from "@/components/store/store-select"

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span aria-hidden className={`material-symbols-outlined ${className}`}>
    {name}
  </span>
)

const day = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : null

/** Five milestones, driven only by the order's real fulfillment and courier status. */
const STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "booked", label: "Booked with courier" },
  { key: "transit", label: "In transit" },
  { key: "ofd", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
] as const

function reached(o: OrderSummary): number {
  const s = o.shipment?.status
  if (o.fulfillmentStatus === "delivered" || s === "delivered") return 4
  if (s === "out_for_delivery" || s === "delivery_failed") return 3
  if (s === "picked_up" || s === "in_transit" || o.fulfillmentStatus === "shipped") return 2
  if (o.shipment) return 1
  return 0
}

/**
 * Account > Track Orders: where each order's parcel is, from the courier's own
 * status. The full scan-by-scan timeline lives on the order's tracking page.
 */
export function TrackOrdersView({ orders }: { orders: OrderSummary[] }) {
  const searchParams = useSearchParams()
  const [selectedOrderId, setSelectedOrderId] = useState<string>(searchParams.get("id") ?? orders[0]?.id ?? "")
  const order = orders.find((o) => o.id === selectedOrderId) ?? orders[0] ?? null

  if (!order) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl p-12 text-center flex flex-col items-center border border-dashed border-outline-variant" data-testid="track-orders-view">
        <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-3">
          <Icon name="local_shipping" className="text-[28px]" />
        </div>
        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">No orders to track yet</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mt-1 mb-4">Once you place an order, its delivery status appears here.</p>
        <LocalizedClientLink href="/store" className="h-10 px-6 bg-primary text-on-primary rounded font-label-sm text-label-sm uppercase font-semibold flex items-center gap-2">
          Browse Collections
        </LocalizedClientLink>
      </div>
    )
  }

  const s = order.shipment
  const at = reached(order)
  const canceled = order.status === "canceled"
  const failed = s?.status === "delivery_failed"
  const rto = s?.status === "rto_initiated" || s?.status === "rto_in_transit" || s?.status === "rto_delivered"
  const headline = canceled
    ? "Order canceled"
    : s
      ? shipmentStatusLabel(s.status)
      : order.fulfillmentStatus === "delivered"
        ? "Delivered"
        : "Preparing your order"
  const when = s?.deliveredAt
    ? `Delivered ${day(s.deliveredAt)}`
    : s?.estimatedDelivery
      ? `Expected by ${day(s.estimatedDelivery)}`
      : s
        ? "The courier shares a delivery date once the parcel is picked up"
        : "We'll book a courier once your order is packed"
  const item = order.items?.[0]
  const thumbnail = item?.thumbnail ?? order.thumbnails[0] ?? null

  return (
    <div className="flex flex-col gap-space-lg w-full" data-testid="track-orders-view">
      {/* Header & order selector */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-md border-b border-surface-container-high">
        <div>
          <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-widest block mb-1.5">Live Logistics</span>
          <h1 className="font-headline-xl text-headline-xl text-on-surface uppercase font-medium">Track Consignment</h1>
        </div>
        {orders.length > 1 && (
          <div className="flex items-center gap-space-sm">
            <label htmlFor="track-order" className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              Tracking order
            </label>
            <StoreSelect
              id="track-order"
              className="min-w-56 rounded-lg bg-surface-container-low"
              value={order.id}
              onValueChange={setSelectedOrderId}
              options={orders.map((o) => ({ value: o.id, label: `#${o.displayId} • ${formatMoney(o.total, o.currency)}` }))}
            />
          </div>
        )}
      </section>

      {/* Status card */}
      <div className="rounded-xl bg-surface-container-low text-on-surface p-space-lg lg:p-space-xl border border-surface-container-high">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-lowest border border-surface-container-high mb-space-md">
              <span className={`size-2 rounded-full ${failed || canceled ? "bg-error" : "bg-primary"}`} />
              <span className="font-label-caps text-label-caps uppercase text-on-surface" data-testid="track-status-badge">
                {headline}
              </span>
            </div>
            <h2 className="font-headline-xl text-headline-xl max-md:text-[2rem] tracking-tight text-primary mb-space-xs">Order #{order.displayId}</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              {canceled ? "This order was canceled and won't be shipped." : failed ? "The courier couldn't deliver and will contact you to try again." : rto ? "The parcel is on its way back to us. We'll contact you about a refund or a new delivery." : when}
            </p>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-space-md">
            <div className="bg-surface-container-lowest p-space-sm rounded border border-surface-container-high min-w-32">
              <dt className="font-label-caps text-label-caps text-on-surface-variant uppercase">Courier</dt>
              <dd className="font-label-md text-label-md text-on-surface">{s ? carrierName(s.carrier) : "Not booked yet"}</dd>
            </div>
            <div className="bg-surface-container-lowest p-space-sm rounded border border-surface-container-high min-w-32">
              <dt className="font-label-caps text-label-caps text-on-surface-variant uppercase">Airway Bill</dt>
              <dd className="font-label-md text-label-md text-on-surface font-mono">{s?.awb || "Issued at booking"}</dd>
            </div>
            <div className="bg-surface-container-lowest p-space-sm rounded border border-surface-container-high min-w-32">
              <dt className="font-label-caps text-label-caps text-on-surface-variant uppercase">Payment</dt>
              <dd className="font-label-md text-label-md text-on-surface">
                {order.paymentStatus === "paid"
                  ? "Paid"
                  : order.paymentStatus === "refunded"
                    ? "Refunded"
                    : order.paymentStatus === "partially_refunded"
                      ? "Partly refunded"
                      : order.paymentMethod === "cod"
                        ? "Pay on delivery"
                        : "Awaiting payment"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Milestones */}
      {!canceled && (
        <ol className="grid grid-cols-5 gap-2" aria-label="Delivery progress">
          {STEPS.map((step, i) => {
            const done = i <= at
            return (
              <li key={step.key} className="flex flex-col gap-2">
                <span className={`h-1.5 rounded-full ${done ? (failed && i === 3 ? "bg-error" : "bg-primary") : "bg-surface-container-high"}`} />
                <span className={`font-label-sm text-label-sm ${done ? "text-on-surface font-semibold" : "text-on-surface-variant"}`}>
                  {failed && i === 3 ? "Attempt failed" : step.label}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {/* Items and actions */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container-high/60 flex flex-col sm:flex-row sm:items-center gap-space-lg">
        <div className="flex items-center gap-space-md flex-1 min-w-0">
          <div className="w-20 h-24 rounded bg-surface-container-low overflow-hidden relative shrink-0">
            {thumbnail && <Image src={thumbnail} alt={item?.productTitle ?? ""} fill sizes="80px" className="object-cover" />}
          </div>
          <div className="min-w-0">
            <p className="font-body-md text-body-md text-on-surface font-medium truncate">{item?.productTitle ?? `Order #${order.displayId}`}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {order.itemCount} {order.itemCount === 1 ? "item" : "items"} · {formatMoney(order.total, order.currency)}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-space-sm">
          <LocalizedClientLink
            href={`/order/${order.id}/track`}
            className="h-11 px-5 inline-flex items-center justify-center gap-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm uppercase font-semibold"
          >
            <Icon name="timeline" className="text-[18px]" />
            Full tracking timeline
          </LocalizedClientLink>
          {s?.trackingUrl && (
            <a
              href={s.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-5 inline-flex items-center justify-center gap-2 bg-surface-container-low text-on-surface rounded-lg font-label-sm text-label-sm uppercase font-semibold hover:bg-surface-container"
            >
              <Icon name="open_in_new" className="text-[18px]" />
              Courier tracking page
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
