"use client"

import type { OrderSummary } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

export function TrackOrdersView({ orders }: { orders: OrderSummary[] }) {
  const searchParams = useSearchParams()
  const initialOrderId = searchParams.get("id") ?? orders[0]?.id ?? ""
  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrderId)

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? orders[0] ?? null

  if (!selectedOrder) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl p-12 text-center flex flex-col items-center border border-dashed border-outline-variant">
        <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-outline mb-3">
          <span className="material-symbols-outlined text-[28px]">local_shipping</span>
        </div>
        <h2 className="font-headline-sm font-semibold text-on-surface">No active dispatches to track</h2>
        <p className="font-body-sm text-on-surface-variant max-w-sm mt-1 mb-4">
          Once you place an order, live consignment tracking with Blue Dart priority dispatches will be displayed here.
        </p>
        <LocalizedClientLink
          href="/store"
          className="h-10 px-6 bg-primary text-on-primary rounded font-label-sm uppercase font-semibold flex items-center gap-2"
        >
          Browse Collections
        </LocalizedClientLink>
      </div>
    )
  }

  const isShipped = selectedOrder.fulfillmentStatus === "shipped"
  const isDelivered = selectedOrder.fulfillmentStatus === "delivered"
  const orderDateStr = new Date(selectedOrder.createdAt).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  const carrier = selectedOrder.shipment?.carrier ?? "Blue Dart Express"
  const awb = selectedOrder.shipment?.awb ?? `BLR-${selectedOrder.displayId}9041`
  const firstItem = selectedOrder.items?.[0]
  const thumbnail =
    firstItem?.thumbnail ??
    selectedOrder.thumbnails[0] ??
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCH5B4tpOlHOFPEeuOnpcEZx-cXi__62VB8A_gfHsNZgJTPaAKXMf2OF0ZQTaDWNlNOebzSMyBYuHWthq7Sn_Qn0cxGCXVABrolR4iizmYH_fryHN-wecvR7C0i4d9fO0MzB_N7XOOGrP1UPhVw3g8r8Sonp4wSMm7NwYvpFJQkqYcokCZFK7SA7jrV7gjHE2JFZnKt8QhJro4T4mY9OwGe5_IO61mS-PSyjtyunj6L"

  return (
    <div className="flex flex-col gap-space-lg w-full" data-testid="track-orders-view">
      {/* 1. Header & Order Dropdown Selector */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-md border-b border-surface-container-high">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-widest">
              Live Logistics &bull; Atelier Express
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface uppercase tracking-tight font-medium">
            Track Consignment
          </h1>
        </div>

        {orders.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-on-surface-variant text-xs uppercase font-medium">Tracking Order:</span>
            <div className="relative">
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="h-10 pl-3 pr-8 bg-surface-container-low text-on-surface font-label-sm rounded-lg appearance-none cursor-pointer border border-surface-container-high uppercase"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #EVR-{o.displayId} &bull; {formatMoney(o.total, o.currency)}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[16px]">
                expand_more
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 2. Primary Shipment Badge Card */}
      <section className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-xs border border-surface-container-high/60 flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-start gap-space-md">
          <div className="w-20 h-28 rounded-lg bg-surface-container-low overflow-hidden shrink-0 relative shadow-2xs">
            <Image src={thumbnail} alt="Item thumbnail" fill sizes="80px" className="object-cover" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-label-caps text-secondary font-bold uppercase">
                Consignment #EVR-{selectedOrder.displayId}
              </span>
              <span className="text-on-surface-variant text-xs">&bull;</span>
              <span className="font-body-sm text-xs text-on-surface-variant">Placed {orderDateStr}</span>
            </div>
            <h3 className="font-headline-sm font-semibold text-on-surface">
              {firstItem?.productTitle ?? "Atelier Wardrobe Garments"}
            </h3>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Courier Partner: <strong className="text-on-surface font-medium capitalize">{carrier}</strong> &bull; AWB:{" "}
              <span className="font-mono font-medium text-primary">{awb}</span>
            </p>
            <div className="pt-2">
              <span className="font-headline-sm text-primary font-bold">
                {formatMoney(selectedOrder.total, selectedOrder.currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:items-end gap-2 shrink-0">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low">
            <span className={`w-2.5 h-2.5 rounded-full ${isShipped ? "bg-secondary animate-pulse" : isDelivered ? "bg-emerald-600" : "bg-primary"}`} />
            <span className="font-label-sm font-semibold text-on-surface">
              {isDelivered ? "Delivered to Consignee" : isShipped ? "In Transit &bull; Priority Air" : "Being Prepared"}
            </span>
          </div>
          <LocalizedClientLink
            href={`/account/orders/details/${selectedOrder.id}`}
            className="text-xs uppercase font-semibold text-secondary hover:underline flex items-center gap-1"
          >
            <span>View Complete Order Details</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </LocalizedClientLink>
        </div>
      </section>

      {/* 3. Detailed Step-by-Step Live Tracking Timeline */}
      <section className="bg-surface-container-lowest p-space-lg lg:p-space-xl rounded-2xl shadow-xs border border-surface-container-high/60 space-y-space-lg">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container">
          <h3 className="font-label-md font-bold text-on-surface uppercase">Live Tracking Milestones</h3>
          <span className="font-label-caps text-xs text-secondary font-bold uppercase">
            {isDelivered ? "Fulfillment Completed" : "Estimated Delivery: Scheduled via Air Courier"}
          </span>
        </div>

        <div className="relative pl-6 sm:pl-8 border-l-2 border-surface-container-high ml-4 space-y-8">
          {/* Milestone 1: Delivered */}
          <div className="relative">
            <div
              className={`absolute -left-[31px] sm:-left-[39px] top-0 w-8 h-8 rounded-full flex items-center justify-center shadow-xs ${
                isDelivered ? "bg-emerald-600 text-white" : "bg-surface-container text-outline"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isDelivered ? "check" : "home"}
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h4 className={`font-label-md font-semibold ${isDelivered ? "text-on-surface" : "text-outline"}`}>
                  Out for Delivery &amp; Final Handover
                </h4>
                {isDelivered && (
                  <span className="font-label-caps text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold uppercase">
                    Completed
                  </span>
                )}
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                Consignee doorstep delivery with OTP verification and tamper-evident seal inspection.
              </p>
            </div>
          </div>

          {/* Milestone 2: Out for Delivery / Hub */}
          <div className="relative">
            <div
              className={`absolute -left-[31px] sm:-left-[39px] top-0 w-8 h-8 rounded-full flex items-center justify-center shadow-xs ${
                isShipped ? "bg-secondary text-on-secondary animate-pulse" : isDelivered ? "bg-secondary text-on-secondary" : "bg-surface-container text-outline"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h4 className="font-label-md font-semibold text-on-surface">
                  In Transit &bull; Dispatched from Regional Gateway Hub
                </h4>
                {isShipped && (
                  <span className="font-label-caps text-[10px] text-secondary-fixed font-bold bg-secondary px-2 py-0.5 rounded uppercase">
                    Active Step
                  </span>
                )}
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                Consignment scanned through Blue Dart automated sorting hub in Bengaluru South.
              </p>
            </div>
          </div>

          {/* Milestone 3: Inspected & Packed */}
          <div className="relative">
            <div className="absolute -left-[31px] sm:-left-[39px] top-0 w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[18px]">check</span>
            </div>
            <div>
              <h4 className="font-label-md font-semibold text-on-surface">
                Inspected &amp; Hand-Packed by Atelier Specialists
              </h4>
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                Acid-free tissue paper wrapping, cedar sachet inclusion, and signature Everwear presentation box sealed.
              </p>
            </div>
          </div>

          {/* Milestone 4: Order Confirmed */}
          <div className="relative">
            <div className="absolute -left-[31px] sm:-left-[39px] top-0 w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[18px]">check</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h4 className="font-label-md font-semibold text-on-surface">Order Received &amp; Payment Confirmed</h4>
                <span className="font-body-sm text-xs text-on-surface-variant">{orderDateStr}</span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                Settlement verified via bank gateway. Atelier garment allocation reserved.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Support Concierge Notice */}
      <aside className="p-gutter bg-surface-container-low rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-space-md border border-surface-container-high">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface">
            <span className="material-symbols-outlined text-[20px]">support_agent</span>
          </div>
          <div>
            <h4 className="font-label-md font-semibold text-on-surface">Need Delivery Re-Routing or Instruction Updates?</h4>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Contact Blue Dart dispatch desk or atelier concierge for priority delivery instructions.
            </p>
          </div>
        </div>
        <LocalizedClientLink
          href="/account/support"
          className="h-10 px-5 bg-primary text-on-primary rounded font-label-sm uppercase font-semibold flex items-center gap-1.5 shrink-0"
        >
          <span>Contact Concierge</span>
        </LocalizedClientLink>
      </aside>
    </div>
  )
}
