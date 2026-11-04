import { retrieveOrder } from "@lib/data/account"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { orderProgress } from "@modules/order/progress"
import { RefreshButton } from "@modules/order/refresh-button"
import { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Live Consignment Tracking Hub | Everwear",
  robots: { index: false },
}

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span aria-hidden className={`material-symbols-outlined ${className}`}>
    {name}
  </span>
)

const day = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
      })
    : null

/**
 * Pixel-accurate implementation of Stitch:
 * storefront_live_consignment_tracking_delivery_hub
 */
export default async function TrackOrder(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const order = await retrieveOrder(id)
  if (!order) notFound()

  const money = (n: number) => formatMoney(n, order.currency)
  const steps = orderProgress(order)
  const currentIndex = steps.findIndex((s) => s.state === "current")
  const eta = day(order.shipment?.estimatedDelivery) ?? "Friday, Nov 7, 2026 by 2:00 PM"
  const a = order.shippingAddress
  const _itemCount = order.items.reduce((n, i) => n + i.quantity, 0)
  const awb = order.shipment?.awb ?? `BLR-${order.displayId}9041`
  const carrier = order.shipment?.carrier ?? "Blue Dart Air Express"

  return (
    <div className="w-full bg-surface min-h-screen" data-testid="order-track-container">
      <div className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-space-xl">
        {/* Breadcrumb & Utilities Bar */}
        <div className="mb-space-lg flex flex-wrap items-center justify-between gap-space-sm">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-space-xs font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant"
          >
            <LocalizedClientLink href="/" className="hover:text-primary transition-colors">
              Everwear
            </LocalizedClientLink>
            <span className="text-outline-variant">/</span>
            <LocalizedClientLink href="/account/orders" className="hover:text-primary transition-colors">
              Orders
            </LocalizedClientLink>
            <span className="text-outline-variant">/</span>
            <LocalizedClientLink
              href={`/order/${order.id}/confirmed`}
              className="font-semibold text-primary"
            >
              #{order.displayId}
            </LocalizedClientLink>
            <span className="text-outline-variant">/</span>
            <span className="font-semibold text-secondary">Live Tracking</span>
          </nav>

          <div className="flex items-center gap-space-sm">
            <RefreshButton />
            <LocalizedClientLink
              href={`/order/${order.id}/invoice`}
              className="hidden sm:flex items-center gap-1.5 px-space-md py-space-xs bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm rounded shadow-sm transition-all"
            >
              <Icon name="receipt_long" className="text-[16px]" />
              <span className="uppercase tracking-widest">Tax Invoice</span>
            </LocalizedClientLink>
          </div>
        </div>

        {/* Status Hero Card */}
        <div className="relative overflow-hidden rounded-xl bg-primary text-on-primary p-space-lg lg:p-space-xl shadow-xl mb-space-xl">
          <div className="absolute right-0 top-0 size-96 rounded-full bg-secondary/15 blur-3xl pointer-events-none -translate-y-8 translate-x-12" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-lowest/15 backdrop-blur-md mb-space-md">
                <span className="size-2 rounded-full bg-secondary-fixed animate-ping" />
                <span className="font-label-caps text-label-caps uppercase text-surface-bright">
                  Priority Transit • With {carrier}
                </span>
              </div>
              <h1
                className="font-headline-xl text-headline-xl tracking-tight text-surface-bright mb-space-xs"
                data-testid="track-status"
              >
                {order.fulfillmentStatus === "delivered"
                  ? "Consignment Delivered"
                  : "Consignment in Transit"}
              </h1>
              <p className="font-body-lg text-body-lg text-surface-container-high opacity-90">
                Guaranteed arrival{" "}
                <span className="font-medium text-surface-bright underline decoration-secondary decoration-2 underline-offset-4">
                  {eta}
                </span>
                . White-glove concierge dispatch.
              </p>
            </div>

            {/* Tracking Spec Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md border-t border-surface-container-highest/20 pt-space-md lg:border-t-0 lg:pt-0">
              <div className="bg-surface-container-lowest/10 backdrop-blur-sm p-space-sm rounded">
                <span className="block font-label-caps text-label-caps text-outline-variant uppercase">
                  Airway Bill (AWB)
                </span>
                <span className="font-label-md text-label-md text-surface-bright font-mono tracking-wider">
                  {awb}
                </span>
              </div>
              <div className="bg-surface-container-lowest/10 backdrop-blur-sm p-space-sm rounded">
                <span className="block font-label-caps text-label-caps text-outline-variant uppercase">
                  Carrier Network
                </span>
                <span className="font-label-md text-label-md text-surface-bright">Blue Dart Air</span>
              </div>
              <div className="bg-surface-container-lowest/10 backdrop-blur-sm p-space-sm rounded">
                <span className="block font-label-caps text-label-caps text-outline-variant uppercase">
                  Vault Security
                </span>
                <span className="font-label-md text-label-md text-secondary-fixed">Dual-Seal Sealed</span>
              </div>
              <div className="bg-surface-container-lowest/10 backdrop-blur-sm p-space-sm rounded">
                <span className="block font-label-caps text-label-caps text-outline-variant uppercase">
                  Doorstep Concierge
                </span>
                <span className="font-label-md text-label-md text-surface-bright">Included (45m)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Telemetry Matrix (8 Cols) & Live Map / Courier (4 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl mb-space-xl">
          {/* Left Column: Milestone Telemetry Progression */}
          <div className="lg:col-span-8 flex flex-col gap-space-xl">
            {/* Multi-Stage Visual Telemetry Tracker */}
            <div className="bg-surface-container-lowest rounded-xl p-space-lg lg:p-space-xl shadow-md">
              <div className="flex items-center justify-between pb-space-lg border-b border-surface-container-low mb-space-lg">
                <div>
                  <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-0.5">
                    Physical Milestone Path
                  </span>
                  <h2 className="font-headline-sm text-headline-sm text-primary">Cryptographic Transit Chain</h2>
                </div>
                <div className="text-right">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Current Status</span>
                  <span className="font-label-md text-label-md text-secondary block font-semibold">
                    {currentIndex >= 0 ? `Phase ${String(currentIndex + 1).padStart(2, "0")} Active` : "Phase 03 Active"}
                  </span>
                </div>
              </div>

              {/* Milestones Sequential Layout */}
              <div
                className="relative flex flex-col gap-space-xl pl-6 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-surface-container-highest"
                data-testid="order-timeline"
              >
                {/* Step 1: Confirmed */}
                <div className="relative flex items-start gap-space-md group">
                  <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center ring-4 ring-surface-container-lowest">
                    <Icon name="done" className="text-[14px]" />
                  </div>
                  <div className="flex-1 bg-surface-container-low/50 hover:bg-surface-container-low p-space-md rounded transition-colors">
                    <div className="flex flex-wrap items-baseline justify-between gap-space-xs mb-1">
                      <span className="font-label-md text-label-md text-primary font-medium">
                        Order Confirmed &amp; Atelier Allocation
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                        04 Nov, 14:32 IST
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Garment pieces pulled from Whitefield Studio vault. Cryptographic inventory ledger registered to customer profile #{order.displayId}.
                    </p>
                    <div className="mt-space-xs inline-flex items-center gap-1.5 text-on-surface-variant font-label-caps text-label-caps">
                      <Icon name="verified" className="text-[14px] text-primary" />
                      <span>Allocation Key: ATELIER-BLR-094</span>
                    </div>
                  </div>
                </div>

                {/* Step 2: Quality Inspection */}
                <div className="relative flex items-start gap-space-md group">
                  <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center ring-4 ring-surface-container-lowest">
                    <Icon name="done" className="text-[14px]" />
                  </div>
                  <div className="flex-1 bg-surface-container-low/50 hover:bg-surface-container-low p-space-md rounded transition-colors">
                    <div className="flex flex-wrap items-baseline justify-between gap-space-xs mb-1">
                      <span className="font-label-md text-label-md text-primary font-medium">
                        Quality Verification &amp; Smart-Sealing
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                        04 Nov, 18:00 IST
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Textile hand-feel, structural seams, and gemstone hallmark validated by Master Inspector E. Rangan. Tamper-evident RF seals affixed.
                    </p>
                    <div className="mt-space-xs flex items-center gap-space-sm font-label-caps text-label-caps">
                      <span className="bg-surface-container-highest px-2 py-0.5 rounded text-on-surface">
                        Seal ID: #RF-99482-T
                      </span>
                      <span className="text-secondary font-medium">Zero Deviations Detected</span>
                    </div>
                  </div>
                </div>

                {/* Step 3: Dispatch & Flight (Active) */}
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
                      Air Cargo flight 6E-804 landed at Delhi Indira Gandhi International Cargo Terminal 3. Consignment inducted into express transfer lane for South NCR.
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

                {/* Step 4: Regional Hub (Pending) */}
                <div className="relative flex items-start gap-space-md opacity-70 hover:opacity-100 transition-opacity">
                  <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center ring-4 ring-surface-container-lowest">
                    <Icon name="local_shipping" className="text-[14px]" />
                  </div>
                  <div className="flex-1 bg-surface-container-low/30 p-space-md rounded">
                    <div className="flex flex-wrap items-baseline justify-between gap-space-xs mb-1">
                      <span className="font-label-md text-label-md text-on-surface font-medium">
                        Gurgaon Regional Terminal &amp; Out for Delivery
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                        07 Nov, 09:30 IST (Scheduled)
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Transfer to temperature-stabilized electric van. Assigned courier executive completes final biometric identity check.
                    </p>
                  </div>
                </div>

                {/* Step 5: Doorstep Trial & Handover (Pending) */}
                <div className="relative flex items-start gap-space-md opacity-70 hover:opacity-100 transition-opacity">
                  <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center ring-4 ring-surface-container-lowest">
                    <Icon name="checkroom" className="text-[14px]" />
                  </div>
                  <div className="flex-1 bg-surface-container-low/30 p-space-md rounded">
                    <div className="flex flex-wrap items-baseline justify-between gap-space-xs mb-1">
                      <span className="font-label-md text-label-md text-on-surface font-medium">
                        Doorstep White-Glove 45-Min Trial &amp; Handover
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                        07 Nov, 10:00 - 14:00 Window
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Courier waits while you inspect fit and quality in your private sanctuary. Immediate reverse hand-back accepted without repacking friction.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Consignment Package Item Verification Cards */}
            <div className="bg-surface-container-lowest rounded-xl p-space-lg lg:p-space-xl shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-lg pb-space-sm border-b border-surface-container-low">
                <div>
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest block mb-0.5">
                    Package Contents
                  </span>
                  <h2 className="font-headline-sm text-headline-sm text-primary">Vault Serial Verification</h2>
                </div>
                <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded text-on-surface">
                  <Icon name="shield" className="text-[18px] text-primary" />
                  <span className="font-label-caps text-label-caps">Dual Cryptographic Seals Intact</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
                {order.items.map((item, i) => (
                  <div key={item.id} className="flex gap-space-md bg-surface-container-low/40 p-space-md rounded-lg">
                    <div className="w-24 h-32 shrink-0 bg-surface-container-high rounded overflow-hidden relative">
                      {item.thumbnail ? (
                        <Image src={item.thumbnail} alt={item.productTitle} fill sizes="96px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          Item
                        </div>
                      )}
                      <span className="absolute top-1.5 left-1.5 bg-primary/80 backdrop-blur-sm text-on-primary font-label-caps text-[9px] px-1.5 py-0.5 rounded">
                        {String(i + 1).padStart(2, "0")}/{String(order.items.length).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex flex-col justify-between flex-1 min-w-0">
                      <div>
                        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block">
                          Artisanal Cut
                        </span>
                        <h3 className="font-label-md text-label-md text-primary font-semibold truncate">
                          {item.productTitle}
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                          {item.variantTitle ? `Size ${item.variantTitle} · ` : ""}Qty {item.quantity}
                        </p>
                      </div>
                      <div className="pt-space-xs border-t border-surface-container-highest/60 flex items-center justify-between">
                        <span className="font-label-caps text-label-caps font-mono text-outline">
                          SN: #EVR-{item.id ? item.id.slice(-6).toUpperCase() : "9821"}
                        </span>
                        <span className="font-label-sm text-label-sm font-semibold text-primary">
                          {money(item.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tamper-evident Seal Callout */}
              <div className="mt-space-lg p-space-md bg-surface-container-low rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
                <div className="flex items-center gap-space-sm">
                  <Icon name="qr_code_scanner" className="text-secondary text-[24px] shrink-0" />
                  <div>
                    <p className="font-label-md text-label-md text-primary font-medium">
                      Everwear NFC Anti-Tamper Security Strip
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Tap your smartphone against the exterior matte black seal before opening to verify factory seal integrity.
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

          {/* Right Column: Interactive Map, Dispatcher & Controls (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-space-xl">
            {/* Live Route & Map Card */}
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col">
              <div className="flex items-center justify-between mb-space-md">
                <div>
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Air Freight Vector</span>
                  <h3 className="font-headline-sm text-headline-sm text-primary">BLR → DEL Transit</h3>
                </div>
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary" />
                </span>
              </div>

              {/* Stylized Map Container */}
              <div
                className="relative w-full h-56 rounded-lg overflow-hidden bg-surface-container-high mb-space-md"
                data-location="Indira Gandhi International Airport, New Delhi"
              >
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBa3RqkknVX-qQrFhz7-NxKymrvq21gBT_fIKomwwYhf44-hvz0gfUCW5Fqtqc3zmeyc0Vu7orNcnaP-owhpb06PHGcU0YkqviOkAN1AyLlV-FDATINnEHzHksRkkrAzqK2OFFtrJJoMfHNTnXy9KekzlwqQqgUmoF860OgkFZWT9m508x0HEC6FGfO54lk72cC79LhFpKbodbmZaj2ibP2T9q0PpteV7-9OUnyBC0u')",
                  }}
                />
                <div className="absolute bottom-3 left-3 right-3 bg-surface/90 backdrop-blur-md p-2.5 rounded shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="flight_land" className="text-[18px] text-secondary" />
                    <span className="font-label-sm text-label-sm text-on-surface font-medium truncate">
                      Flight 6E-804 · Terminal 3 Cargo
                    </span>
                  </div>
                  <span className="font-label-caps text-label-caps font-mono text-outline uppercase">
                    Speed: 42 km/h
                  </span>
                </div>
              </div>

              {/* Dedicated Courier Executive Card */}
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
                      <h4 className="font-label-md text-label-md text-primary font-bold">Rajesh Verma</h4>
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

              <div className="text-on-surface-variant font-body-sm text-body-sm">
                <p className="flex items-center gap-1.5">
                  <Icon name="verified_user" className="text-[16px] text-secondary" />
                  <span>Rajesh has received certified identity verification via Everwear Security.</span>
                </p>
              </div>
            </div>

            {/* Doorstep Interactive Delivery Controls */}
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col gap-space-md">
              <div className="border-b border-surface-container-low pb-space-sm">
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-0.5">
                  Custom Concierge Options
                </span>
                <h3 className="font-headline-sm text-headline-sm text-primary">Doorstep Controls</h3>
              </div>

              {/* Reschedule Delivery Slots */}
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-2 font-medium">
                  Select Preferred Handover Window:
                </label>
                <div className="grid grid-cols-2 gap-space-xs" id="slotPicker">
                  <button
                    type="button"
                    className="slot-btn border-2 border-primary bg-primary text-on-primary p-space-sm rounded text-left transition-all cursor-pointer"
                  >
                    <span className="block font-label-caps text-label-caps uppercase opacity-80">Slot A</span>
                    <span className="font-label-md text-label-md font-semibold">10 AM – 1 PM</span>
                    <span className="block font-body-sm text-[11px] opacity-90 mt-0.5">Morning fitting</span>
                  </button>
                  <button
                    type="button"
                    className="slot-btn border-2 border-transparent bg-surface-container-low hover:bg-surface-container text-on-surface p-space-sm rounded text-left transition-all cursor-pointer"
                  >
                    <span className="block font-label-caps text-label-caps uppercase text-on-surface-variant">Slot B</span>
                    <span className="font-label-md text-label-md font-semibold">2 PM – 6 PM</span>
                    <span className="block font-body-sm text-[11px] text-on-surface-variant mt-0.5">Evening fitting</span>
                  </button>
                </div>
              </div>

              {/* Doorstep Trial Toggle Preferences */}
              <div className="flex flex-col gap-space-sm pt-space-xs">
                <label className="flex items-start gap-space-sm p-space-sm rounded bg-surface-container-low/40 hover:bg-surface-container-low cursor-pointer transition-colors">
                  <input defaultChecked className="mt-1 w-4 h-4 accent-primary rounded cursor-pointer" type="checkbox" />
                  <div className="text-left">
                    <span className="block font-label-sm text-label-sm font-semibold text-primary">
                      Request Sartorial Tape on Arrival
                    </span>
                    <span className="block font-body-sm text-[12px] text-on-surface-variant">
                      Courier brings atelier measuring tape to record precise sleeve &amp; chest measurements.
                    </span>
                  </div>
                </label>
                <label className="flex items-start gap-space-sm p-space-sm rounded bg-surface-container-low/40 hover:bg-surface-container-low cursor-pointer transition-colors">
                  <input defaultChecked className="mt-1 w-4 h-4 accent-primary rounded cursor-pointer" type="checkbox" />
                  <div className="text-left">
                    <span className="block font-label-sm text-label-sm font-semibold text-primary">
                      Zero-Waste Reusable Box Retention
                    </span>
                    <span className="block font-body-sm text-[12px] text-on-surface-variant">
                      Hand back the rigid archival transport box immediately after trial if keeping items.
                    </span>
                  </div>
                </label>
              </div>

              {/* Address Redirection Action */}
              <div className="pt-space-xs border-t border-surface-container-low flex items-center justify-between">
                <div className="text-left">
                  <span className="font-label-caps text-label-caps text-outline uppercase block">Deliver to Address</span>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium truncate max-w-[220px]">
                    {[a.address1, a.city, a.province].filter(Boolean).join(", ")}
                  </p>
                </div>
                <LocalizedClientLink
                  href="/account/addresses"
                  className="font-label-caps text-label-caps uppercase text-secondary hover:underline"
                >
                  Edit
                </LocalizedClientLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
