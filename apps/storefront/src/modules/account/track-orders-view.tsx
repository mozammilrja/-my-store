"use client"

import type { OrderSummary } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span aria-hidden className={`material-symbols-outlined ${className}`}>
    {name}
  </span>
)

export function TrackOrdersView({ orders }: { orders: OrderSummary[] }) {
  const searchParams = useSearchParams()
  const initialOrderId = searchParams.get("id") ?? orders[0]?.id ?? ""
  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrderId)

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? orders[0] ?? null

  if (!selectedOrder) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl p-12 text-center flex flex-col items-center border border-dashed border-outline-variant">
        <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-outline mb-3">
          <Icon name="local_shipping" className="text-[28px]" />
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

  const _isShipped = selectedOrder.fulfillmentStatus === "shipped"
  const isDelivered = selectedOrder.fulfillmentStatus === "delivered"
  const carrier = selectedOrder.shipment?.carrier ?? "Blue Dart Air Express"
  const awb = selectedOrder.shipment?.awb ?? `BLR-${selectedOrder.displayId}9041`
  const firstItem = selectedOrder.items?.[0]
  const thumbnail =
    firstItem?.thumbnail ??
    selectedOrder.thumbnails[0] ??
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBnmUM0jsJmC1903YDOqVvYjdQgVvGJEABfak8_Lr53ZiSs9NqZBF-oLbHlCyTYf61WkynVasKhLATSJZCNpVKlhdTDDofc3pk3fvkDN5zQUVhIlkd3XBAvFJb_IiqFR1rNBcoFsDs3tYSAgSxm6Br1JwKYdqG6yLSoMERdnj9cbbn4lDY1z-ncZZqg3QkCVkxnTZzBRmHGOyrSv-x-FaKvz8wHqcK0j36Zt6m0CmHz"

  return (
    <div className="flex flex-col gap-space-lg w-full" data-testid="track-orders-view">
      {/* 1. Header & Order Dropdown Selector */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-md border-b border-surface-container-high">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-widest">
              Live Logistics • Atelier Express
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
                    #EVR-{o.displayId} • {formatMoney(o.total, o.currency)}
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

      {/* 2. Status Hero Card */}
      <div className="relative overflow-hidden rounded-xl bg-primary text-on-primary p-space-lg lg:p-space-xl shadow-xl">
        <div className="absolute right-0 top-0 size-96 rounded-full bg-secondary/15 blur-3xl pointer-events-none -translate-y-8 translate-x-12" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-lowest/15 backdrop-blur-md mb-space-md">
              <span className="size-2 rounded-full bg-secondary-fixed animate-ping" />
              <span className="font-label-caps text-label-caps uppercase text-surface-bright">
                {isDelivered ? "Delivered to Sanctuary" : `Priority Air Hub • With ${carrier}`}
              </span>
            </div>
            <h2 className="font-headline-xl text-headline-xl tracking-tight text-surface-bright mb-space-xs">
              Consignment #EVR-{selectedOrder.displayId}
            </h2>
            <p className="font-body-lg text-body-lg text-surface-container-high opacity-90">
              Blue Dart Air Express priority corridor. White-glove concierge dispatch.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md border-t border-surface-container-highest/20 pt-space-md lg:border-t-0 lg:pt-0">
            <div className="bg-surface-container-lowest/10 backdrop-blur-sm p-space-sm rounded">
              <span className="block font-label-caps text-label-caps text-outline-variant uppercase">Airway Bill</span>
              <span className="font-label-md text-label-md text-surface-bright font-mono">{awb}</span>
            </div>
            <div className="bg-surface-container-lowest/10 backdrop-blur-sm p-space-sm rounded">
              <span className="block font-label-caps text-label-caps text-outline-variant uppercase">Carrier</span>
              <span className="font-label-md text-label-md text-surface-bright">Blue Dart Air</span>
            </div>
            <div className="bg-surface-container-lowest/10 backdrop-blur-sm p-space-sm rounded">
              <span className="block font-label-caps text-label-caps text-outline-variant uppercase">Security</span>
              <span className="font-label-md text-label-md text-secondary-fixed">Dual-Seal Sealed</span>
            </div>
            <div className="bg-surface-container-lowest/10 backdrop-blur-sm p-space-sm rounded">
              <span className="block font-label-caps text-label-caps text-outline-variant uppercase">Concierge</span>
              <span className="font-label-md text-label-md text-surface-bright">Included (45m)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
        {/* Left Column (8 cols): Cryptographic Transit Chain + Package Verification */}
        <div className="lg:col-span-8 flex flex-col gap-space-xl">
          {/* Milestone Transit Chain */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg lg:p-space-xl shadow-md border border-surface-container-high/60">
            <div className="flex items-center justify-between pb-space-lg border-b border-surface-container-low mb-space-lg">
              <div>
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-0.5">
                  Physical Milestone Path
                </span>
                <h3 className="font-headline-sm text-headline-sm text-primary">Cryptographic Transit Chain</h3>
              </div>
              <div className="text-right">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Current Status</span>
                <span className="font-label-md text-label-md text-secondary block font-semibold">
                  {isDelivered ? "Fulfillment Complete" : "Phase 03 Active"}
                </span>
              </div>
            </div>

            <div className="relative flex flex-col gap-space-xl pl-6 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-surface-container-highest">
              {/* Step 1: Confirmed */}
              <div className="relative flex items-start gap-space-md">
                <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center ring-4 ring-surface-container-lowest">
                  <Icon name="done" className="text-[14px]" />
                </div>
                <div className="flex-1 bg-surface-container-low/50 p-space-md rounded">
                  <div className="flex flex-wrap items-baseline justify-between gap-space-xs mb-1">
                    <span className="font-label-md text-label-md text-primary font-medium">
                      Order Confirmed &amp; Atelier Allocation
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                      04 Nov, 14:32 IST
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Garment pieces pulled from Whitefield Studio vault. Cryptographic inventory ledger registered.
                  </p>
                </div>
              </div>

              {/* Step 2: Quality Inspection */}
              <div className="relative flex items-start gap-space-md">
                <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center ring-4 ring-surface-container-lowest">
                  <Icon name="done" className="text-[14px]" />
                </div>
                <div className="flex-1 bg-surface-container-low/50 p-space-md rounded">
                  <div className="flex flex-wrap items-baseline justify-between gap-space-xs mb-1">
                    <span className="font-label-md text-label-md text-primary font-medium">
                      Quality Verification &amp; Smart-Sealing
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                      04 Nov, 18:00 IST
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Textile hand-feel, structural seams, and hallmark validated by Master Inspector. RF seals affixed.
                  </p>
                  <div className="mt-space-xs flex items-center gap-space-sm font-label-caps text-label-caps">
                    <span className="bg-surface-container-highest px-2 py-0.5 rounded text-on-surface">Seal ID: #RF-99482-T</span>
                    <span className="text-secondary font-medium">Zero Deviations Detected</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Dispatch & Flight */}
              <div className="relative flex items-start gap-space-md">
                <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center ring-4 ring-secondary-fixed-dim/40 animate-pulse">
                  <Icon name="flight_takeoff" className="text-[14px]" />
                </div>
                <div className="flex-1 bg-surface-container-lowest p-space-md rounded shadow-md border-l-4 border-secondary">
                  <div className="flex flex-wrap items-baseline justify-between gap-space-xs mb-1">
                    <div className="flex items-center gap-space-xs">
                      <span className="font-label-md text-label-md text-primary font-bold">
                        BLR Priority Air Hub Dispatch
                      </span>
                      <span className="bg-secondary/10 text-secondary font-label-caps text-label-caps px-2 py-0.5 rounded uppercase">
                        Active Telemetry
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-secondary font-mono font-medium">
                      05 Nov, 08:30 IST
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface">
                    Air Cargo flight 6E-804 landed at Delhi Indira Gandhi International Cargo Terminal 3. Inducted into express transfer lane.
                  </p>
                  <div className="mt-space-sm p-space-sm bg-surface-container-low rounded flex flex-col gap-1.5">
                    <div className="flex justify-between font-label-caps text-label-caps text-on-surface-variant">
                      <span>BLR Departure (06:15)</span>
                      <span className="text-secondary font-semibold">T3 DEL Touchdown (08:42)</span>
                      <span>Gurgaon Sorting (Est. 12:00)</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: "72%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Out for Delivery */}
              <div className={`relative flex items-start gap-space-md ${isDelivered ? "" : "opacity-70"}`}>
                <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center ring-4 ring-surface-container-lowest">
                  <Icon name="local_shipping" className="text-[14px]" />
                </div>
                <div className="flex-1 bg-surface-container-low/30 p-space-md rounded">
                  <div className="flex flex-wrap items-baseline justify-between gap-space-xs mb-1">
                    <span className="font-label-md text-label-md text-on-surface font-medium">
                      Regional Terminal &amp; Out for Delivery
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">07 Nov, 09:30 IST</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Transfer to electric van. Assigned courier executive completes final biometric identity check.
                  </p>
                </div>
              </div>

              {/* Step 5: Doorstep Trial */}
              <div className={`relative flex items-start gap-space-md ${isDelivered ? "" : "opacity-70"}`}>
                <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center ring-4 ring-surface-container-lowest">
                  <Icon name="checkroom" className="text-[14px]" />
                </div>
                <div className="flex-1 bg-surface-container-low/30 p-space-md rounded">
                  <div className="flex flex-wrap items-baseline justify-between gap-space-xs mb-1">
                    <span className="font-label-md text-label-md text-on-surface font-medium">
                      Doorstep White-Glove 45-Min Trial &amp; Handover
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                      Window: 10:00 - 14:00
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Courier waits while you inspect fit and quality in your private sanctuary.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Package Item Verification Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg lg:p-space-xl shadow-md border border-surface-container-high/60">
            <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-lg pb-space-sm border-b border-surface-container-low">
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest block mb-0.5">
                  Package Contents
                </span>
                <h3 className="font-headline-sm text-headline-sm text-primary">Vault Serial Verification</h3>
              </div>
              <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded text-on-surface">
                <Icon name="shield" className="text-[18px] text-primary" />
                <span className="font-label-caps text-label-caps">Dual Cryptographic Seals Intact</span>
              </div>
            </div>

            <div className="flex gap-space-md bg-surface-container-low/40 p-space-md rounded-lg">
              <div className="w-24 h-32 shrink-0 bg-surface-container-high rounded overflow-hidden relative">
                <Image src={thumbnail} alt="Item thumbnail" fill sizes="96px" className="object-cover" />
                <span className="absolute top-1.5 left-1.5 bg-primary/80 backdrop-blur-sm text-on-primary font-label-caps text-[9px] px-1.5 py-0.5 rounded">
                  01/01
                </span>
              </div>
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block">
                    Artisanal Piece
                  </span>
                  <h4 className="font-label-md text-label-md text-primary font-semibold truncate">
                    {firstItem?.productTitle ?? "Atelier Curated Piece"}
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    {firstItem?.variantTitle ? `Size ${firstItem.variantTitle} · ` : ""}Qty {firstItem?.quantity ?? 1}
                  </p>
                </div>
                <div className="pt-space-xs border-t border-surface-container-highest/60 flex items-center justify-between">
                  <span className="font-label-caps text-label-caps font-mono text-outline">
                    SN: #EVR-{selectedOrder.displayId}
                  </span>
                  <span className="font-label-sm text-label-sm font-semibold text-primary">
                    {formatMoney(selectedOrder.total, selectedOrder.currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-space-lg p-space-md bg-surface-container-low rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-sm">
                <Icon name="qr_code_scanner" className="text-secondary text-[24px] shrink-0" />
                <div>
                  <p className="font-label-md text-label-md text-primary font-medium">
                    Everwear NFC Anti-Tamper Security Strip
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Tap smartphone against the exterior matte black seal before opening to verify seal integrity.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => alert("Cryptographic Seal Verified: Authenticity Confirmed by Everwear Vault.")}
                className="shrink-0 text-primary hover:text-secondary font-label-caps text-label-caps uppercase underline underline-offset-4 cursor-pointer"
              >
                Validate Key
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Route Map & Dedicated Courier Card */}
        <div className="lg:col-span-4 flex flex-col gap-space-xl">
          {/* Air Freight Vector Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md border border-surface-container-high/60 flex flex-col">
            <div className="flex items-center justify-between mb-space-md">
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Air Freight Vector</span>
                <h4 className="font-headline-sm text-headline-sm text-primary">BLR → DEL Transit</h4>
              </div>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary" />
              </span>
            </div>

            <div className="relative w-full h-52 rounded-lg overflow-hidden bg-surface-container-high mb-space-md">
              <div
                className="w-full h-full bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBa3RqkknVX-qQrFhz7-NxKymrvq21gBT_fIKomwwYhf44-hvz0gfUCW5Fqtqc3zmeyc0Vu7orNcnaP-owhpb06PHGcU0YkqviOkAN1AyLlV-FDATINnEHzHksRkkrAzqK2OFFtrJJoMfHNTnXy9KekzlwqQqgUmoF860OgkFZWT9m508x0HEC6FGfO54lk72cC79LhFpKbodbmZaj2ibP2T9q0PpteV7-9OUnyBC0u')",
                }}
              />
              <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-surface/90 backdrop-blur-md p-2 rounded shadow-sm flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Icon name="flight_land" className="text-[16px] text-secondary" />
                  <span className="font-medium text-on-surface truncate">Flight 6E-804 · T3 Cargo</span>
                </div>
                <span className="font-mono text-outline uppercase text-[10px]">42 km/h</span>
              </div>
            </div>

            {/* Courier Card */}
            <div className="bg-surface-container-low p-space-md rounded-lg mb-space-md">
              <div className="flex items-start justify-between gap-space-sm mb-space-sm">
                <div className="flex items-center gap-space-sm">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-high relative">
                    <Image
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9nfA27kyvjBidFB0aKoQyWR7ujEY2VBG8AB-i4ZPnlFnRRumYHaRc0oNc6pCak9t4crQuKynWvQQjvHao1R_V_RCv5QLj-VyK-xH0VsadFd8WSYW9gCzEIn8B9vFhzmjvg-Dg_lQ2Tsc7wWMALmKSY6W7NTfPmQ8GONMt_HQovrQX8sWn7KBax2zQb67H0PV3JGW_WNCJPi54Z81-kb4GWSPdyZpkE8M-1hhOvGkJ"
                      alt="Courier Specialist"
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h5 className="font-label-md text-label-md text-primary font-bold">Rajesh Verma</h5>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Blue Dart Priority Elite · 4.98 ★</p>
                    <span className="font-label-caps text-label-caps text-secondary font-mono">Verified ID #BD-8821</span>
                  </div>
                </div>
                <span className="bg-surface-container-lowest text-primary px-2 py-0.5 rounded font-label-caps text-[10px]">
                  WHITE-GLOVE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-space-xs">
                <a
                  href="tel:+919876543210"
                  className="flex items-center justify-center gap-1.5 bg-primary text-on-primary hover:bg-primary-container px-space-sm py-2 rounded text-label-sm font-label-sm transition-colors text-center"
                >
                  <Icon name="call" className="text-[16px]" />
                  <span>Call Courier</span>
                </a>
                <a
                  href="sms:+919876543210"
                  className="flex items-center justify-center gap-1.5 bg-surface-container-lowest hover:bg-surface-container-high text-primary px-space-sm py-2 rounded text-label-sm font-label-sm transition-colors text-center"
                >
                  <Icon name="chat" className="text-[16px]" />
                  <span>Send Note</span>
                </a>
              </div>
            </div>

            <LocalizedClientLink
              href={`/account/orders/details/${selectedOrder.id}`}
              className="text-xs uppercase font-semibold text-secondary hover:underline flex items-center justify-center gap-1 pt-2"
            >
              <span>View Complete Order Dossier</span>
              <Icon name="arrow_forward" className="text-[14px]" />
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    </div>
  )
}
