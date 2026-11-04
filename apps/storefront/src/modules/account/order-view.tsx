"use client"

import type { Order } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import { InvoiceDialog } from "@modules/account/invoice-dialog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useState } from "react"

const LABELS: Record<string, string> = {
  awaiting: "Pay on delivery",
  paid: "Settled Prepaid",
  refunded: "Refunded to Source",
  unfulfilled: "Being prepared",
  shipped: "In Transit",
  delivered: "Delivered",
  returned: "Return Processed",
  pending: "Open",
  completed: "Completed",
  canceled: "Cancelled",
}

export const statusLabel = (s: string) => LABELS[s] ?? s

export function OrderView({ order }: { order: Order }) {
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const a = order.shippingAddress
  const isShipped = order.fulfillmentStatus === "shipped"
  const isDelivered = order.fulfillmentStatus === "delivered"
  const isReturned = order.fulfillmentStatus === "returned" || !!order.returnRequest
  const formattedDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="flex flex-col gap-space-lg w-full" data-testid="order-details-view">
      {/* 1. Header Card with Ref & Status */}
      <section className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-xs border border-surface-container-high/60 flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-widest">
              Atelier Consignment Record
            </span>
            <span className="text-on-surface-variant text-xs">&bull;</span>
            <span className="font-body-sm text-xs text-on-surface-variant">Placed {formattedDate}</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-semibold tracking-tight" data-testid="order-id">
            Order #EVR-{order.displayId}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setInvoiceOpen(true)}
            className="h-10 px-4 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm uppercase flex items-center gap-1.5 transition-colors border border-surface-container-high cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Download Invoice</span>
          </button>
          <LocalizedClientLink
            href={`/account/track-orders?id=${order.id}`}
            className="h-10 px-5 rounded-lg bg-primary text-on-primary hover:bg-inverse-surface font-label-sm text-label-sm uppercase font-semibold flex items-center gap-2 transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            <span>Track Order</span>
          </LocalizedClientLink>
        </div>
      </section>

      {/* 2. Key Status Tiles */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high/60">
          <span className="font-label-caps text-xs text-on-surface-variant uppercase block">Fulfillment</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isShipped ? "bg-secondary animate-pulse" : isDelivered ? "bg-emerald-600" : "bg-primary"}`} />
            <span className="font-label-md font-semibold text-on-surface capitalize" data-testid="order-status">
              {statusLabel(order.status === "canceled" ? "canceled" : order.fulfillmentStatus)}
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high/60">
          <span className="font-label-caps text-xs text-on-surface-variant uppercase block">Payment Status</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
            <span className="font-label-md font-semibold text-on-surface capitalize" data-testid="payment-status">
              {statusLabel(order.paymentStatus)}
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high/60">
          <span className="font-label-caps text-xs text-on-surface-variant uppercase block">Payment Mode</span>
          <p className="mt-1 font-label-md font-semibold text-on-surface" data-testid="payment-method">
            {order.paymentMethod === "razorpay"
              ? "Razorpay UPI"
              : order.paymentMethod === "stripe"
              ? "Credit/Debit Card"
              : "Cash on Delivery"}
          </p>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high/60">
          <span className="font-label-caps text-xs text-on-surface-variant uppercase block">Total Settlement</span>
          <p className="mt-1 font-label-md font-bold text-primary tabular-nums">
            {formatMoney(order.totals.total, order.currency)}
          </p>
        </div>
      </section>

      {/* 3. Live Consignment Tracking Bar */}
      <section className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-xs border border-surface-container-high/60 flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">near_me</span>
            </div>
            <div>
              <h3 className="font-label-md font-bold text-on-surface uppercase">Live Consignment Tracking</h3>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Partner: <strong className="text-on-surface font-semibold uppercase">{order.shipment?.carrier ?? "Blue Dart Priority Air"}</strong> &bull; AWB: <span className="font-mono">{order.shipment?.awb ?? `BLR-${order.displayId}891`}</span>
              </p>
            </div>
          </div>

          <LocalizedClientLink
            href={`/account/returns?orderId=${order.id}`}
            className="h-9 px-4 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm uppercase flex items-center gap-1.5 transition-colors border border-surface-container-high"
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
            <span>Initiate Return or Exchange</span>
          </LocalizedClientLink>
        </div>

        {/* Progress Tracker Bar */}
        <div className="bg-surface-container-low p-space-md rounded-xl border border-surface-container-high space-y-3">
          <div className="flex flex-wrap items-center justify-between text-on-surface-variant font-label-caps text-xs uppercase font-semibold gap-2">
            <span className="text-secondary font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">check_circle</span> Order Confirmed
            </span>
            <span className={`flex items-center gap-1 ${isShipped || isDelivered ? "text-secondary font-bold" : "text-outline"}`}>
              <span className="material-symbols-outlined text-[14px]">{isShipped || isDelivered ? "check_circle" : "radio_button_unchecked"}</span>
              Dispatched Hub
            </span>
            <span className={`flex items-center gap-1 ${isShipped ? "text-primary font-bold" : isDelivered ? "text-secondary font-bold" : "text-outline"}`}>
              <span className="material-symbols-outlined text-[14px]">{isDelivered ? "check_circle" : isShipped ? "local_shipping" : "radio_button_unchecked"}</span>
              In Transit
            </span>
            <span className={`flex items-center gap-1 ${isDelivered ? "text-secondary font-bold" : "text-outline"}`}>
              <span className="material-symbols-outlined text-[14px]">{isDelivered ? "check_circle" : "radio_button_unchecked"}</span>
              {isDelivered ? "Delivered" : "Out For Delivery"}
            </span>
          </div>
          <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden flex">
            <div
              className="bg-secondary h-full rounded-full transition-all duration-700"
              style={{
                width: isDelivered ? "100%" : isShipped ? "70%" : isReturned ? "50%" : "25%",
              }}
            />
          </div>
        </div>
      </section>

      {/* 4. Ordered Items List */}
      <section className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-xs border border-surface-container-high/60 space-y-space-md">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container">
          <h2 className="font-headline-sm font-semibold text-on-surface">Curated Garments ({order.items.length})</h2>
          <span className="font-label-caps text-xs text-on-surface-variant uppercase">Inspected &amp; Packed</span>
        </div>

        <div className="divide-y divide-surface-container" data-testid="order-items">
          {order.items.map((item) => (
            <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
              <div className="flex items-start gap-space-md">
                <div className="w-20 h-28 rounded-lg bg-surface-container-low overflow-hidden shrink-0 relative shadow-2xs">
                  {item.thumbnail ? (
                    <Image src={item.thumbnail} alt={item.productTitle} fill sizes="80px" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-outline">
                      <span className="material-symbols-outlined text-[24px]">image</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="font-label-caps text-label-caps text-secondary font-bold uppercase">
                    Everwear Atelier
                  </span>
                  <LocalizedClientLink
                    href={`/products/${item.productHandle}`}
                    className="font-headline-sm text-base font-semibold text-on-surface hover:underline block"
                  >
                    {item.productTitle}
                  </LocalizedClientLink>
                  <p className="font-body-sm text-xs text-on-surface-variant">{item.variantTitle}</p>
                  <p className="font-body-sm text-xs text-on-surface-variant">
                    Qty: {item.quantity} &times; {formatMoney(item.unitPrice, order.currency)}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                <span className="font-headline-sm text-headline-sm font-bold text-primary tabular-nums">
                  {formatMoney(item.total, order.currency)}
                </span>
                <LocalizedClientLink
                  href={`/products/${item.productHandle}`}
                  className="font-label-sm text-xs uppercase font-semibold text-secondary hover:underline"
                >
                  View Product
                </LocalizedClientLink>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Addresses & Settlement Summary */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        {/* Shipping Address */}
        <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-xs border border-surface-container-high/60 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-surface-container">
            <span className="material-symbols-outlined text-primary text-[20px]">pin_drop</span>
            <h3 className="font-label-md font-bold uppercase text-on-surface">Shipping Address</h3>
          </div>
          <div className="space-y-1 text-sm font-body-md text-on-surface" data-testid="shipping-address">
            <p className="font-semibold text-on-surface">{a.firstName} {a.lastName}</p>
            <p className="text-on-surface-variant">{a.address1}</p>
            {a.address2 && <p className="text-on-surface-variant">{a.address2}</p>}
            <p className="text-on-surface-variant">{a.city}, {a.province ? `${a.province} ` : ""}{a.postalCode}</p>
            <p className="text-on-surface-variant uppercase">{a.countryCode}</p>
            {a.phone && (
              <p className="pt-2 text-xs flex items-center gap-1.5 text-on-surface font-medium">
                <span className="material-symbols-outlined text-[15px] text-outline">call</span>
                {a.phone}
              </p>
            )}
          </div>
        </div>

        {/* Totals Breakdown */}
        <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-xs border border-surface-container-high/60 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-surface-container">
            <span className="material-symbols-outlined text-primary text-[20px]">receipt</span>
            <h3 className="font-label-md font-bold uppercase text-on-surface">Financial Ledger</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-on-surface-variant font-body-sm">
              <span>Item Subtotal:</span>
              <span className="tabular-nums font-medium text-on-surface">
                {formatMoney(order.totals.itemSubtotal, order.currency)}
              </span>
            </div>
            {order.totals.discountTotal > 0 && (
              <div className="flex justify-between text-secondary font-body-sm">
                <span>Atelier Advantage / Discount:</span>
                <span className="tabular-nums font-medium">
                  -{formatMoney(order.totals.discountTotal, order.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-on-surface-variant font-body-sm">
              <span>Shipping & Delivery:</span>
              <span className="tabular-nums font-medium text-on-surface">
                {order.totals.shippingTotal === 0 ? "Complimentary" : formatMoney(order.totals.shippingTotal, order.currency)}
              </span>
            </div>
            <div className="flex justify-between text-on-surface-variant font-body-sm">
              <span>Taxes (GST Inclusive):</span>
              <span className="tabular-nums font-medium text-on-surface">
                {formatMoney(order.totals.taxTotal, order.currency)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-primary pt-2 border-t border-surface-container">
              <span>Total Paid:</span>
              <span className="tabular-nums font-headline-sm">{formatMoney(order.totals.total, order.currency)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Invoice Modal */}
      <InvoiceDialog
        order={order}
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
      />
    </div>
  )
}
