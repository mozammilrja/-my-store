import type { Product } from "@lib/api/types"
import { retrieveOrder } from "@lib/data/account"
import { getProduct, getStorePolicies, listCategories } from "@lib/data/catalog"
import { formatMoney } from "@lib/money"
import { resolveGstState } from "@lib/util/gst-state"
import { cityInText, destinationPoint } from "@lib/util/india-cities"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { RefreshButton } from "@modules/order/refresh-button"
import { DoorstepControls } from "@modules/order/track/doorstep-controls"
import { OwnFleetCard } from "@modules/order/track/own-fleet-card"
import { RouteMapLazy } from "@modules/order/track/route-map-lazy"
import { buildTracking, carrierName, longDay, scanTime, shipmentStatusLabel, type TrackNode } from "@modules/order/track/tracking"
import { MIcon, StitchPage, TrackingHeader } from "@modules/stitch/shell"
import { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Track your order | Everwear",
  robots: { index: false },
}

const pad = (n: number) => String(n).padStart(2, "0")

/** One milestone in the export's card styles: done, active or upcoming. */
function Milestone({ n }: { n: TrackNode }) {
  const chips = n.chips.length > 0 && (
    <div className="mt-space-xs flex flex-wrap items-center gap-space-sm font-label-caps text-label-caps">
      {n.chips.map((c) =>
        c.tone === "box" ? (
          <span key={c.text} className="bg-surface-container-highest px-2 py-0.5 rounded text-on-surface">{c.text}</span>
        ) : c.tone === "accent" ? (
          <span key={c.text} className="text-secondary font-medium">{c.text}</span>
        ) : (
          <span key={c.text} className="inline-flex items-center gap-1.5 text-on-surface-variant">
            {c.icon && <MIcon name={c.icon} className="text-[14px] text-primary" />}
            <span>{c.text}</span>
          </span>
        )
      )}
    </div>
  )
  if (n.state === "current")
    return (
      <li className="relative flex items-start gap-space-md" aria-current="step">
        <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center ring-4 ring-secondary-fixed-dim/40 animate-pulse">
          <MIcon name={n.icon} className="text-[14px]" />
        </div>
        <div className="flex-1 min-w-0 bg-surface-container-lowest p-space-md rounded shadow-md border-l-4 border-secondary">
          <div className="flex flex-wrap items-baseline justify-between gap-space-xs mb-1">
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="font-label-md text-label-md text-primary font-bold">{n.title}</span>
              {n.activeLabel && <span className="bg-secondary/10 text-secondary font-label-caps text-label-caps px-2 py-0.5 rounded uppercase">{n.activeLabel}</span>}
            </div>
            <span className="font-label-sm text-label-sm text-secondary font-mono font-medium">{n.time}</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface">{n.body}</p>
          {chips}
          {n.strip && (
            <div className="mt-space-sm p-space-sm bg-surface-container-low rounded flex flex-col gap-1.5">
              <div className="flex justify-between gap-space-sm font-label-caps text-label-caps text-on-surface-variant">
                <span>{n.strip.left}</span>
                <span className="text-secondary font-semibold text-center">{n.strip.mid}</span>
                <span className="text-right">{n.strip.right}</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full" style={{ width: `${n.strip.pct}%` }} />
              </div>
            </div>
          )}
        </div>
      </li>
    )
  if (n.state === "done")
    return (
      <li className="relative flex items-start gap-space-md group">
        <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center ring-4 ring-surface-container-lowest">
          <MIcon name="done" className="text-[14px]" />
        </div>
        <div className="flex-1 min-w-0 bg-surface-container-low/50 hover:bg-surface-container-low p-space-md rounded transition-colors">
          <div className="flex flex-wrap items-baseline justify-between gap-space-xs mb-1">
            <span className="font-label-md text-label-md text-primary font-medium">{n.title}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">{n.time}</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{n.body}</p>
          {chips}
        </div>
      </li>
    )
  return (
    <li className="relative flex items-start gap-space-md opacity-60 hover:opacity-100 transition-opacity">
      <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center ring-4 ring-surface-container-lowest">
        <MIcon name={n.icon} className="text-[14px]" />
      </div>
      <div className="flex-1 min-w-0 bg-surface-container-low/30 p-space-md rounded">
        <div className="flex flex-wrap items-baseline justify-between gap-space-xs mb-1">
          <span className="font-label-md text-label-md text-on-surface font-medium">{n.title}</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">{n.time}</span>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{n.body}</p>
        {chips}
      </div>
    </li>
  )
}

/**
 * Order tracking, ported from the Stitch export
 * storefront_live_consignment_tracking_delivery_hub. Section headings, labels
 * and captions are the export's; every data value is the order's own
 * (status, shipment and carrier scans, warehouse, items, delivery
 * preferences). The route map uses the dispatch warehouse's location and the
 * destination city's centre only; the street address is never geocoded.
 */
export default async function TrackOrder(props: { params: Promise<{ countryCode: string; id: string }> }) {
  const { countryCode, id } = await props.params
  const [order, { current: policy }, categories] = await Promise.all([
    retrieveOrder(id),
    getStorePolicies(countryCode),
    listCategories().catch(() => []),
  ])
  if (!order) notFound()

  const handles = [...new Set(order.items.map((i) => i.productHandle).filter(Boolean))]
  const products: Record<string, Product | null> = Object.fromEntries(
    await Promise.all(handles.map(async (h) => [h, await getProduct(h, countryCode).catch(() => null)] as const))
  )
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))

  const s = order.shipment
  const a = order.shippingAddress
  const wh = order.dispatchFrom ?? null
  const dest = destinationPoint(a)
  const destName = dest ? (dest.approximate ? (resolveGstState(a)?.name ?? dest.name) : a.city) : a.city
  const t = buildTracking(order, { originCode: wh?.code ?? null, originName: wh?.name ?? null, destination: destName })
  const money = (n: number) => formatMoney(n, order.currency)
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0)
  const delivered = t.phase === "delivered"

  // Route map: warehouse location → destination city centre; the marker follows the real status.
  const originPoint = wh && typeof wh.lat === "number" && typeof wh.lng === "number" ? { label: wh.code, lat: wh.lat, lng: wh.lng } : null
  const destPoint = dest ? { label: destName, lat: dest.lat, lng: dest.lng } : null
  // The map centres on where the parcel is now, at city level: the warehouse
  // before pickup, the city of the latest scan in transit (else the
  // destination), the destination once it is out for delivery.
  const scanCity = cityInText(t.lastScan?.location)
  const focus =
    t.phase === "preparing" || t.phase === "awaiting_pickup" || t.phase === "canceled"
      ? (originPoint ?? destPoint)
      : t.phase === "in_transit" || t.phase === "rto"
        ? (scanCity ? { label: scanCity.name, lat: scanCity.lat, lng: scanCity.lng } : (destPoint ?? originPoint))
        : (destPoint ?? originPoint)
  const stripRight = s?.estimatedDelivery && !delivered
    ? { k: "ETA:", v: new Date(s.estimatedDelivery).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) }
    : { k: "Status:", v: s ? shipmentStatusLabel(s.status) : t.phase === "canceled" ? "Canceled" : "Packing" }

  // Short values so every tile holds one line, as in the export; the full
  // wording is the tile's tooltip. Unknown-yet values read "Pending", muted.
  const shortMethod = order.shippingOption.name.replace(/\s*\(.*?\)\s*/g, "").replace(/\s*delivery$/i, "").trim() || order.shippingOption.name
  const payment =
    order.paymentMethod === "cod" && (order.paymentStatus === "paid" || order.paymentStatus === "awaiting")
      ? order.paymentStatus === "paid"
        ? { short: "Paid (COD)", full: "Paid on delivery" }
        : { short: "COD", full: "Cash on delivery: pay when it arrives" }
      : order.paymentStatus === "paid"
        ? { short: "Paid", full: "Paid online" }
        : order.paymentStatus === "refunded"
          ? { short: "Refunded", full: "Refunded" }
          : order.paymentStatus === "partially_refunded"
            ? { short: "Part refund", full: "Partly refunded" }
            : { short: "Pending", full: "Payment pending" }
  const stats: { label: string; value: string; full: string; mono?: boolean; accent?: boolean; muted?: boolean }[] = [
    s?.awb
      ? { label: "Airway Bill (AWB)", value: s.awb, full: `Airway bill ${s.awb}`, mono: true }
      : { label: "Airway Bill (AWB)", value: "Pending", full: "Assigned when the parcel is dispatched", muted: true },
    s
      ? { label: "Carrier Network", value: carrierName(s.carrier), full: carrierName(s.carrier) }
      : { label: "Carrier Network", value: "Pending", full: "Assigned when the parcel is dispatched", muted: true },
    { label: "Shipping Method", value: shortMethod, full: order.shippingOption.name, accent: true },
    { label: "Payment", value: payment.short, full: payment.full },
  ]
  const underline = "text-on-surface font-medium underline decoration-outline decoration-2 underline-offset-4"

  return (
    <StitchPage className="min-h-screen flex flex-col">
      <TrackingHeader />
      <main className="w-full pt-20 bg-surface flex-grow" data-testid="order-track-container">
        <div className="flex flex-col w-full">
          <div className="max-w-[1440px] w-full mx-auto px-margin-mobile lg:px-margin py-space-xl">
            {/* Breadcrumb & Top Utility Nav */}
            <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-lg">
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-space-xs font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                <LocalizedClientLink href="/" className="hover:text-primary transition-colors">Boutique</LocalizedClientLink>
                <span className="text-outline-variant">/</span>
                <LocalizedClientLink href="/account/orders" className="hover:text-primary transition-colors">Orders</LocalizedClientLink>
                <span className="text-outline-variant">/</span>
                <LocalizedClientLink href={`/order/${order.id}/confirmed`} className="text-primary font-semibold hover:text-secondary transition-colors">
                  #{order.displayId}
                </LocalizedClientLink>
                <span className="text-outline-variant">/</span>
                <span className="text-secondary font-semibold">Live Telemetry</span>
              </nav>
              <div className="flex items-center gap-space-sm">
                <RefreshButton />
                <LocalizedClientLink
                  href={`/order/${order.id}/invoice`}
                  className="hidden sm:flex items-center gap-1.5 bg-surface-container-low hover:bg-surface-container px-space-md py-space-xs rounded text-on-surface font-label-sm text-label-sm transition-all shadow-sm"
                  data-testid="track-invoice-link"
                >
                  <MIcon name="receipt_long" className="text-[16px]" />
                  <span className="uppercase tracking-widest">Tax Invoice</span>
                </LocalizedClientLink>
              </div>
            </div>

            {order.delivery ? <OwnFleetCard delivery={order.delivery} money={money} /> : null}

            {/* Hero Status Bar */}
            <div className="relative overflow-hidden bg-surface-container-low text-on-surface rounded-xl p-space-lg lg:p-space-xl mb-space-xl border border-surface-container-high">
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-space-xs bg-surface-container-lowest border border-surface-container-high px-space-md py-1 rounded-full mb-space-md">
                    <span className={`w-2 h-2 rounded-full bg-primary ${t.moving ? "animate-pulse" : ""}`} />
                    <span className="font-label-caps text-label-caps text-on-surface uppercase" data-testid="track-badge">{t.badge}</span>
                  </div>
                  <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight mb-space-xs" data-testid="track-status">
                    {t.heading}
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant">
                    {t.phase === "preparing" && (
                      <>
                        Packing order #{order.displayId} for <span className={underline}>{t.destination}</span>. Courier details follow at dispatch.
                      </>
                    )}
                    {t.phase === "canceled" && <>Order #{order.displayId} was canceled and will not be shipped.</>}
                    {delivered && (
                      <>
                        Delivered
                        {s?.deliveredAt && (
                          <>
                            {" "}on <span className={underline}>{longDay(s.deliveredAt)}</span>
                          </>
                        )}{" "}
                        to {t.destination}.
                      </>
                    )}
                    {!["preparing", "canceled", "delivered"].includes(t.phase) &&
                      (s?.estimatedDelivery ? (
                        <>
                          Expected arrival <span className={underline}>{longDay(s.estimatedDelivery)}</span> at {t.destination}.
                        </>
                      ) : (
                        <>
                          With {s ? carrierName(s.carrier) : "the courier"} for <span className={underline}>{t.destination}</span>. Delivery date not shared yet.
                        </>
                      ))}
                  </p>
                </div>
                {/* Telemetry Key Stats Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md pt-space-md lg:pt-0 border-t lg:border-t-0 border-surface-container-high" data-testid="track-stats">
                  {stats.map((x) => (
                    <div key={x.label} title={x.full} className="bg-surface-container-lowest border border-surface-container-high p-space-sm rounded lg:w-[130px] flex flex-col justify-between gap-1.5 min-h-[72px]">
                      <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase leading-tight">{x.label}</span>
                      <span className={`block font-label-md text-label-md leading-5 truncate ${x.muted ? "text-on-surface-variant" : x.accent ? "text-primary font-semibold" : "text-on-surface"} ${x.mono ? "tracking-wider font-mono text-label-sm" : ""}`}>
                        {x.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Grid: Milestones (8 Cols) & Map / Courier (4 Cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl mb-space-xl">
              {/* Left Column */}
              <div className="lg:col-span-8 flex flex-col gap-space-xl min-w-0">
                {/* Multi-Stage Visual Telemetry Tracker */}
                <div className="bg-surface-container-lowest rounded-xl p-space-lg lg:p-space-xl shadow-md">
                  <div className="flex items-center justify-between gap-space-sm pb-space-lg border-b border-surface-container-low mb-space-lg">
                    <div>
                      <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-0.5">Physical Milestone Path</span>
                      <h2 className="font-headline-sm text-headline-sm text-primary">Cryptographic Transit Chain</h2>
                    </div>
                    <div className="text-right">
                      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Current Status</span>
                      <span className="font-label-md text-label-md text-secondary block font-semibold">{t.phaseLabel}</span>
                    </div>
                  </div>
                  <ol
                    className="relative flex flex-col gap-space-xl pl-6 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-surface-container-highest"
                    data-testid="order-timeline"
                  >
                    {t.nodes.map((n) => (
                      <Milestone key={n.key} n={n} />
                    ))}
                  </ol>
                </div>

                {/* Consignment Package Item Verification Cards */}
                <div className="bg-surface-container-lowest rounded-xl p-space-lg lg:p-space-xl shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-lg pb-space-sm border-b border-surface-container-low">
                    <div>
                      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest block mb-0.5">Package Contents</span>
                      <h2 className="font-headline-sm text-headline-sm text-primary">Vault Serial Verification</h2>
                    </div>
                    <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded text-on-surface">
                      <MIcon name="inventory_2" className="text-[18px] text-primary" />
                      <span className="font-label-caps text-label-caps">
                        {itemCount} {itemCount === 1 ? "Piece" : "Pieces"} · {money(order.totals.total)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg" data-testid="track-items">
                    {order.items.map((item, i) => {
                      const product = products[item.productHandle]
                      const variant = product?.variants.find((v) => v.title === item.variantTitle)
                      const eyebrow = product?.brand || (product?.categoryIds.map((c) => categoryName.get(c)).find(Boolean) ?? "Everwear")
                      return (
                        <div key={item.id} className="flex gap-space-md bg-surface-container-low/40 p-space-md rounded-lg">
                          <div className="w-24 h-32 flex-shrink-0 bg-surface-container-high rounded overflow-hidden relative">
                            {item.thumbnail ? (
                              <Image src={item.thumbnail} alt={item.productTitle} fill sizes="96px" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                                <MIcon name="checkroom" className="text-[28px]" />
                              </div>
                            )}
                            <span className="absolute top-1.5 left-1.5 bg-primary/80 backdrop-blur-sm text-on-primary font-label-caps text-[9px] px-1.5 py-0.5 rounded">
                              {pad(i + 1)}/{pad(order.items.length)}
                            </span>
                          </div>
                          <div className="flex flex-col justify-between flex-1 min-w-0">
                            <div>
                              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block">{eyebrow}</span>
                              <h3 className="font-label-md text-label-md text-primary font-semibold truncate">
                                <LocalizedClientLink href={`/products/${item.productHandle}`} className="hover:text-secondary transition-colors">
                                  {item.productTitle}
                                </LocalizedClientLink>
                              </h3>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                                {[item.variantTitle && `Size ${item.variantTitle}`, `Qty ${item.quantity}`].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                            <div className="pt-space-xs border-t border-surface-container-highest/60 flex items-center justify-between gap-space-xs">
                              <span className="font-label-caps text-label-caps font-mono text-outline truncate">SKU: {variant?.sku ?? "—"}</span>
                              <span className="font-label-sm text-label-sm font-semibold text-primary whitespace-nowrap">{money(item.total)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* Parcel check strip (the export's security-strip layout) */}
                  <div className="mt-space-lg p-space-md bg-surface-container-low rounded flex items-center justify-between gap-space-md">
                    <div className="flex items-center gap-space-sm min-w-0">
                      <MIcon name="qr_code_scanner" className="text-secondary text-[24px]" />
                      <div>
                        <p className="font-label-md text-label-md text-primary">Check Your Parcel on Arrival</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          If the outer packaging looks damaged or opened, note it with the courier before accepting and tell us, quoting order #{order.displayId}.
                        </p>
                      </div>
                    </div>
                    <LocalizedClientLink href="/contact" className="flex-shrink-0 text-primary hover:text-secondary font-label-caps text-label-caps uppercase underline underline-offset-4">
                      Report Issue
                    </LocalizedClientLink>
                  </div>
                </div>
              </div>

              {/* Right Column: Map, Courier & Controls (4 Cols) */}
              <div className="lg:col-span-4 flex flex-col gap-space-xl min-w-0">
                {/* Live Route & Map Card */}
                <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col" data-testid="track-route">
                  <div className="flex items-center justify-between gap-space-sm mb-space-md">
                    <div className="min-w-0">
                      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Air Freight Vector</span>
                      <h3 className="font-headline-sm text-headline-sm text-primary">
                        {wh?.code ?? "Warehouse"} → {destName} Transit
                      </h3>
                    </div>
                    <span className="flex h-3 w-3 relative flex-shrink-0" aria-hidden>
                      {t.moving && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />}
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary" />
                    </span>
                  </div>
                  <div className="relative isolate w-full h-56 rounded-lg overflow-hidden bg-surface-container-high mb-space-md print:hidden" data-testid="track-map">
                    {focus ? (
                      <RouteMapLazy focus={focus} origin={originPoint} destination={destPoint} />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-on-surface-variant">
                        <MIcon name="map" className="text-[40px]" />
                      </div>
                    )}
                    {focus && (
                      <a
                        href="https://www.openstreetmap.org/copyright"
                        target="_blank"
                        rel="noreferrer"
                        className="absolute z-[1000] right-3 bottom-[60px] rounded-sm bg-surface/80 px-1 text-[9px] leading-[14px] text-on-surface-variant hover:text-on-surface"
                      >
                        © OpenStreetMap contributors
                      </a>
                    )}
                    {/* Map Overlay telemetry strip: latest real carrier scan */}
                    <div className="absolute z-[1000] bottom-3 left-3 right-3 bg-surface/90 backdrop-blur-md p-2.5 rounded shadow-sm flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MIcon name="local_shipping" className="text-[18px] text-secondary" />
                        <span className="font-label-sm text-label-sm text-on-surface font-medium truncate">
                          {t.lastScan
                            ? `${t.lastScan.location || "Carrier scan"} · ${t.lastScan.status}`
                            : destPoint
                              ? `No carrier scans yet · ${wh?.code ?? "Warehouse"}`
                              : "Destination shown at dispatch"}
                        </span>
                      </div>
                      <span className="font-label-caps text-label-caps font-mono text-outline uppercase text-right whitespace-nowrap">
                        {stripRight.k}
                        <br />
                        {stripRight.v}
                      </span>
                    </div>
                  </div>
                  {/* Courier Card */}
                  <div className="bg-surface-container-low p-space-md rounded-lg mb-space-md">
                    <div className="flex items-start justify-between gap-space-sm mb-space-sm">
                      <div className="flex items-center gap-space-sm min-w-0">
                        <div className="w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-surface-container-high relative flex items-center justify-center text-primary font-label-md text-label-md font-bold uppercase">
                          {s ? (
                            carrierName(s.carrier)
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 2)
                          ) : (
                            <MIcon name="local_shipping" className="text-[22px]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-label-md text-label-md text-primary font-bold">{s ? carrierName(s.carrier) : "Courier assigned at dispatch"}</h4>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">{s ? `AWB ${s.awb}` : "Airway bill issued at dispatch"}</p>
                          <span className="font-label-caps text-label-caps text-secondary font-mono">{s ? shipmentStatusLabel(s.status) : "Awaiting dispatch"}</span>
                        </div>
                      </div>
                      <span className="bg-surface-container-lowest text-primary px-2 py-0.5 rounded font-label-caps text-[10px] uppercase text-right">{order.shippingOption.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-space-xs">
                      <LocalizedClientLink
                        href="/concierge"
                        className="flex items-center justify-center gap-1.5 bg-primary text-on-primary hover:bg-primary-container px-space-sm py-2 rounded text-label-sm font-label-sm transition-colors text-center"
                      >
                        <MIcon name="support_agent" className="text-[16px]" />
                        <span>Get Help</span>
                      </LocalizedClientLink>
                      <LocalizedClientLink
                        href={`/order/${order.id}/confirmed`}
                        className="flex items-center justify-center gap-1.5 bg-surface-container-lowest hover:bg-surface-container-high text-primary px-space-sm py-2 rounded text-label-sm font-label-sm transition-colors text-center"
                      >
                        <MIcon name="receipt" className="text-[16px]" />
                        <span>Order Summary</span>
                      </LocalizedClientLink>
                    </div>
                  </div>
                  <div className="text-on-surface-variant font-body-sm text-body-sm">
                    <p className="flex items-center gap-1.5">
                      <MIcon name={s?.pickupScheduledAt && !delivered ? "event" : "verified_user"} className="text-[16px] text-secondary" />
                      <span>
                        {s?.pickupScheduledAt && !delivered
                          ? `Courier pickup scheduled for ${scanTime(s.pickupScheduledAt)}.`
                          : s
                            ? `Delivery executive details are held by ${carrierName(s.carrier)}; quote the AWB above.`
                            : "The courier and delivery executive are assigned when your parcel is dispatched."}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Doorstep Interactive Delivery Controls */}
                <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col gap-space-md" data-testid="track-delivery-prefs">
                  <div className="border-b border-surface-container-low pb-space-sm">
                    <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-0.5">Custom Concierge Options</span>
                    <h3 className="font-headline-sm text-headline-sm text-primary">Doorstep Controls</h3>
                  </div>
                  <DoorstepControls orderId={order.id} initial={order.deliveryPreferences} editable={order.preferencesEditable ?? false} />
                  <div className="pt-space-xs border-t border-surface-container-low flex items-center justify-between gap-space-sm">
                    <div className="text-left min-w-0">
                      <span className="font-label-caps text-label-caps text-outline uppercase block">Deliver to Address</span>
                      <p className="font-body-sm text-body-sm text-on-surface font-medium truncate max-w-[190px]">
                        {[a.address1, a.city].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <LocalizedClientLink href="/contact" className="flex-shrink-0 text-primary hover:text-secondary font-label-caps text-label-caps uppercase underline underline-offset-4">
                      Edit Address
                    </LocalizedClientLink>
                  </div>
                </div>

                {/* 24/7 Concierge */}
                <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-md">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-10 h-10 flex-shrink-0 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                      <MIcon name="support_agent" className="text-[20px]" />
                    </div>
                    <div>
                      <h4 className="font-label-md text-label-md text-primary font-bold">Everwear Private Concierge</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Direct line for telemetry anomalies</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-space-xs">
                    <LocalizedClientLink
                      href="/concierge"
                      className="flex items-center justify-center gap-space-xs bg-surface-container-lowest hover:bg-surface-container-highest text-primary font-label-md text-label-md px-space-md py-space-sm rounded transition-all shadow-sm"
                    >
                      <MIcon name="chat" className="text-[20px] text-emerald-600" />
                      <span>Chat with Concierge</span>
                    </LocalizedClientLink>
                    <LocalizedClientLink
                      href="/contact"
                      className="flex items-center justify-center gap-space-xs bg-surface-container-lowest hover:bg-surface-container-highest text-primary font-label-md text-label-md px-space-md py-space-sm rounded transition-all shadow-sm"
                    >
                      <MIcon name="call" className="text-[20px]" />
                      <span>Contact Client Care</span>
                    </LocalizedClientLink>
                  </div>
                </div>
              </div>
            </div>

            {/* Editorial Assurance Banner: the real return policy */}
            <div className="bg-surface-container-low rounded-xl p-space-lg lg:p-space-xl flex flex-col md:flex-row items-center justify-between gap-space-lg">
              <div className="flex items-center gap-space-md">
                <MIcon name="verified" className="text-[36px] text-primary" />
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-primary">Everwear White-Glove Guarantee</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                    {policy
                      ? `Not the right fit? Return any piece within ${policy.returnWindowDays} days of delivery. ${policy.freeReturns ? "Return shipping is free." : "Return shipping is paid by the customer."} Start a return from your account or contact client care with your order number.`
                      : "Not the right fit? Start a return from your account or contact client care with your order number."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-space-sm flex-shrink-0">
                <LocalizedClientLink href="/returns" className="bg-primary text-on-primary hover:bg-primary-container px-space-lg py-space-sm rounded font-label-md text-label-md transition-colors">
                  View Protocol Guide
                </LocalizedClientLink>
              </div>
            </div>
          </div>
        </div>
      </main>
    </StitchPage>
  )
}
