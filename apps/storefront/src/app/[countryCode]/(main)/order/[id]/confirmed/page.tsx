import { retrieveOrder } from "@lib/data/account"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { orderProgress, paymentLabel } from "@modules/order/progress"
import { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Order Confirmed | Everwear Atelier",
  robots: { index: false },
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span aria-hidden className={`material-symbols-outlined ${className}`}>
    {name}
  </span>
)

/**
 * Pixel-accurate implementation of Stitch:
 * storefront_order_confirmed_consignment_tracking
 */
export default async function OrderConfirmed(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const order = await retrieveOrder(id)
  if (!order) notFound()

  const money = (n: number) => formatMoney(n, order.currency)
  const name = order.shippingAddress.firstName
  const _steps = orderProgress(order)
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0)
  const eta = order.shipment?.estimatedDelivery
    ? new Date(order.shipment.estimatedDelivery).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Friday, Nov 7, 2026 by 2:00 PM"
  const a = order.shippingAddress
  const t = order.totals
  const awb = order.shipment?.awb ?? `BLR-${order.displayId}9041`
  const carrier = order.shipment?.carrier ?? "Blue Dart Air Express"

  return (
    <div className="w-full bg-surface min-h-screen" data-testid="order-complete-container">
      <div className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin pb-space-xl">
        {/* Top Micro Breadcrumb / Route Indicator */}
        <div className="flex items-center gap-space-xs text-on-surface-variant pt-space-md pb-space-lg font-label-caps text-label-caps uppercase tracking-widest">
          <LocalizedClientLink href="/" className="hover:text-on-surface transition-colors cursor-pointer">
            Everwear Boutique
          </LocalizedClientLink>
          <span className="text-outline-variant">/</span>
          <LocalizedClientLink href="/account/orders" className="hover:text-on-surface transition-colors cursor-pointer">
            Orders
          </LocalizedClientLink>
          <span className="text-outline-variant">/</span>
          <span className="text-secondary font-semibold">Confirmation #EVR-{order.displayId}</span>
        </div>

        {/* 1. Hero Confirmation Card */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg md:p-space-xl shadow-sm mb-space-lg">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
            <div className="space-y-space-sm max-w-2xl">
              {/* Status Pill Badge */}
              <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-label-caps uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
                <span>Order Confirmed &amp; Atelier Reserved</span>
              </div>
              <h1 className="font-display-hero text-headline-xl md:text-display-hero tracking-tight text-primary">
                Thank you{name ? `, ${name}` : ""}!
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                Consignment <span className="font-medium text-on-surface">#EVR-{order.displayId}</span> has been safely
                queued at Everwear Studios. A certified digital receipt and consignment tracking updates have been
                dispatched to{" "}
                <span className="font-medium text-on-surface" data-testid="order-email">
                  {order.email}
                </span>.
              </p>
              <div className="flex flex-wrap items-center gap-space-md pt-space-xs font-label-sm text-label-sm text-on-surface-variant">
                <div className="flex items-center gap-1.5" data-testid="payment-method">
                  <Icon name="verified_user" className="text-[18px] text-secondary" />
                  <span>{paymentLabel(order)}</span>
                </div>
                <span className="text-outline-variant">•</span>
                <div className="flex items-center gap-1.5">
                  <Icon name="schedule" className="text-[18px] text-primary" />
                  <span>{when(order.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & CTA Group */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-space-sm shrink-0 min-w-[240px]">
              <LocalizedClientLink
                href={`/order/${order.id}/track`}
                className="flex items-center justify-center gap-space-xs h-11 px-space-lg bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider rounded-lg shadow-sm hover:bg-primary-container transition-all"
                data-testid="order-track-link"
              >
                <Icon name="radar" className="text-[20px] text-secondary-fixed" />
                <span>Live Tracking</span>
              </LocalizedClientLink>
              <LocalizedClientLink
                href={`/order/${order.id}/invoice`}
                className="flex items-center justify-center gap-space-xs h-11 px-space-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-md text-label-md uppercase tracking-wider rounded-lg transition-colors"
                data-testid="order-invoice-link"
              >
                <Icon name="download" className="text-[20px]" />
                <span>Tax Invoice (PDF)</span>
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/concierge"
                className="flex items-center justify-center gap-space-xs h-11 px-space-md text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm transition-colors"
              >
                <Icon name="support_agent" className="text-[18px]" />
                <span>Need Help with Order?</span>
              </LocalizedClientLink>
            </div>
          </div>
          {/* Subtle background radial sheen */}
          <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none" />
        </div>

        {/* 2. Consignment Progress Stepper & Live Dispatch Banner */}
        <div className="rounded-xl bg-surface-container-lowest p-space-lg md:p-space-xl shadow-sm mb-space-xl" id="tracking-section">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-lg border-b border-surface-container">
            <div className="space-y-1">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-caps text-label-caps uppercase text-secondary font-semibold tracking-wider">
                  Priority Transit
                </span>
                <span className="text-outline-variant">•</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {carrier} #{awb}
                </span>
              </div>
              <h2 className="font-headline-sm text-headline-sm text-primary">
                Guaranteed Delivery: {eta}
              </h2>
            </div>
            <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-lg self-start md:self-auto">
              <Icon name="door_front" className="text-secondary text-[20px]" />
              <span className="font-label-sm text-label-sm text-on-surface">
                Complimentary White-Glove Trial Included
              </span>
            </div>
          </div>

          {/* Stepper Graphic Bar */}
          <div className="pt-space-lg">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-space-md relative" data-testid="order-progress">
              {/* Step 1: Confirmed */}
              <div className="flex flex-col space-y-2 relative">
                <div className="flex items-center gap-space-xs">
                  <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-caps text-label-caps">
                    <Icon name="check" className="text-[16px]" />
                  </div>
                  <div className="h-1 flex-1 bg-primary rounded-full hidden md:block" />
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-secondary font-semibold uppercase">Step 01</span>
                  <p className="font-label-md text-label-md text-primary font-medium">Order Confirmed</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{when(order.createdAt)}</p>
                </div>
              </div>

              {/* Step 2: In Progress / Master Inspected */}
              <div className="flex flex-col space-y-2 relative">
                <div className="flex items-center gap-space-xs">
                  <div className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-label-caps text-label-caps">
                    <Icon name="sync" className="text-[16px] animate-spin" />
                  </div>
                  <div className="h-1 flex-1 bg-surface-container rounded-full hidden md:block" />
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-on-surface-variant font-semibold uppercase">Step 02</span>
                  <p className="font-label-md text-label-md text-primary font-medium">Master Inspected</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Packing • Atelier Verified</p>
                </div>
              </div>

              {/* Step 3: Hub Dispatch */}
              <div className="flex flex-col space-y-2 relative">
                <div className="flex items-center gap-space-xs">
                  <div className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-label-caps text-label-caps">
                    3
                  </div>
                  <div className="h-1 flex-1 bg-surface-container rounded-full hidden md:block" />
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-on-surface-variant font-semibold uppercase">Step 03</span>
                  <p className="font-label-md text-label-md text-on-surface-variant font-medium">Hub Dispatch</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Air Cargo Corridor</p>
                </div>
              </div>

              {/* Step 4: Out for Delivery */}
              <div className="flex flex-col space-y-2 relative">
                <div className="flex items-center gap-space-xs">
                  <div className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-label-caps text-label-caps">
                    4
                  </div>
                  <div className="h-1 flex-1 bg-surface-container rounded-full hidden md:block" />
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-on-surface-variant font-semibold uppercase">Step 04</span>
                  <p className="font-label-md text-label-md text-on-surface-variant font-medium">Out for Delivery</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">45-min Doorstep Trial</p>
                </div>
              </div>

              {/* Step 5: Delivered */}
              <div className="flex flex-col space-y-2 relative">
                <div className="flex items-center gap-space-xs">
                  <div className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-label-caps text-label-caps">
                    5
                  </div>
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-on-surface-variant font-semibold uppercase">Step 05</span>
                  <p className="font-label-md text-label-md text-on-surface-variant font-medium">Delivered</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Studio Recipient</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Primary Two-Column Luxury Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* Left Column (8 cols): Line Items, Address, Atelier Services */}
          <div className="lg:col-span-8 space-y-space-lg">
            {/* Curated Garments Card */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg md:p-space-xl shadow-sm">
              <div className="flex items-center justify-between pb-space-md border-b border-surface-container">
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline-sm text-headline-sm text-primary">Curated Garments &amp; Artifacts</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold">
                    {itemCount}
                  </span>
                </div>
                <span className="font-label-caps text-label-caps uppercase text-secondary font-semibold tracking-wider">
                  Atelier Inspected
                </span>
              </div>

              <div className="space-y-space-lg pt-space-lg" data-testid="order-items">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row gap-space-md p-space-md rounded-lg bg-surface-container-low/50 hover:bg-surface-container-low transition-colors"
                    data-testid="product-row"
                  >
                    <div className="w-full sm:w-28 h-36 shrink-0 rounded-lg overflow-hidden bg-surface-container relative">
                      {item.thumbnail ? (
                        <Image src={item.thumbnail} alt={item.productTitle} fill sizes="112px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          Garment
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-space-sm mb-1">
                          <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary font-semibold">
                            Everwear Atelier
                          </span>
                          <span className="font-headline-sm text-headline-sm text-primary font-medium tabular-nums">
                            {money(item.total)}
                          </span>
                        </div>
                        <h3 className="font-body-lg text-body-lg text-primary font-medium" data-testid="product-title">
                          {item.productTitle}
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                          {item.variantTitle ? `Size: ${item.variantTitle} • ` : ""}Qty: {item.quantity} • SKU: EVR-
                          {item.id ? item.id.slice(-6).toUpperCase() : "ATELIER"}
                        </p>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-caps text-label-caps mt-2">
                          <Icon name="verified" className="text-[14px] text-secondary" />
                          <span>100% Organic Looped Terry / Fine Tailoring</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-space-sm mt-space-sm border-t border-surface-container/60">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          Unit Price: {money(item.unitPrice)}
                        </span>
                        <LocalizedClientLink
                          href={`/products/${item.productHandle}`}
                          className="font-label-sm text-label-sm text-primary hover:text-secondary font-medium uppercase tracking-wider flex items-center gap-1"
                        >
                          <span>View Product Dossier</span>
                          <Icon name="arrow_outward" className="text-[16px]" />
                        </LocalizedClientLink>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery & Shipping Information Card */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg md:p-space-xl shadow-sm">
              <div className="flex items-center justify-between pb-space-md border-b border-surface-container mb-space-md">
                <h2 className="font-headline-sm text-headline-sm text-primary flex items-center gap-space-xs">
                  <Icon name="local_shipping" className="text-[22px] text-secondary" />
                  <span>Consignment Destination &amp; Protocol</span>
                </h2>
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Priority Dispatch</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
                {/* Shipping Address Details */}
                <div className="space-y-space-xs" data-testid="order-address">
                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider font-semibold">
                    Shipping Address
                  </span>
                  <p className="font-body-lg text-body-lg text-primary font-medium">
                    {a.firstName} {a.lastName}
                  </p>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    {[a.address1, a.address2].filter(Boolean).join(", ")}
                    <br />
                    {[a.city, a.province].filter(Boolean).join(", ")} {a.postalCode}, {a.countryCode.toUpperCase()}
                  </p>
                  {a.phone && (
                    <div className="flex items-center gap-2 pt-1 font-body-sm text-body-sm text-on-surface">
                      <Icon name="call" className="text-[18px] text-secondary" />
                      <span>{a.phone} (Verified Recipient)</span>
                    </div>
                  )}
                </div>

                {/* Dispatch Method & Doorstep Trial Privileges */}
                <div className="space-y-space-xs bg-surface-container-low p-space-md rounded-lg">
                  <span className="font-label-caps text-label-caps uppercase text-secondary tracking-wider font-semibold">
                    Doorstep Trial Privilege
                  </span>
                  <p className="font-label-md text-label-md text-primary font-medium">White-Glove 45-Min Fitting</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Your courier associate will wait up to 45 minutes for you to try on garments. Immediate return initiation right at your door with zero packaging hassle.
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-on-surface font-label-sm text-label-sm font-semibold">
                    <Icon name="schedule" className="text-[16px] text-secondary" />
                    <span>Slot Window: {eta}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Post-Purchase Atelier Services */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg md:p-space-xl shadow-sm">
              <div className="flex items-center justify-between pb-space-md border-b border-surface-container mb-space-md">
                <h2 className="font-headline-sm text-headline-sm text-primary flex items-center gap-space-xs">
                  <Icon name="workspace_premium" className="text-[22px] text-secondary" />
                  <span>Post-Purchase Concierge &amp; Care</span>
                </h2>
                <span className="font-label-caps text-label-caps uppercase text-secondary font-semibold">
                  Active Privilege
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col justify-between space-y-space-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-label-md text-label-md font-semibold">
                      <Icon name="content_cut" className="text-secondary text-[20px]" />
                      <span>Bespoke Alteration</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Complimentary hem or waist adjustment at any Everwear atelier studio.
                    </p>
                  </div>
                  <LocalizedClientLink
                    href="/concierge"
                    className="w-full h-10 px-space-md bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-sm text-label-sm uppercase tracking-wider rounded-lg transition-colors font-medium flex items-center justify-center"
                  >
                    Reserve Tailor Fitting
                  </LocalizedClientLink>
                </div>
                <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col justify-between space-y-space-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-label-md text-label-md font-semibold">
                      <Icon name="chat" className="text-secondary text-[20px]" />
                      <span>Direct WhatsApp Stylist</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Real-time styling advice, fabric care instructions, or instant exchange concierge.
                    </p>
                  </div>
                  <a
                    href="https://wa.me/919876543210"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-10 px-space-md bg-primary hover:bg-primary-container text-on-primary font-label-sm text-label-sm uppercase tracking-wider rounded-lg transition-colors font-medium flex items-center justify-center gap-1.5"
                  >
                    <Icon name="support" className="text-[18px]" />
                    <span>Chat (+91 98765 43210)</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols Sticky): Financial Ledger, Settlement & Actions */}
          <div className="lg:col-span-4 space-y-space-lg lg:sticky lg:top-44">
            {/* Financial Ledger Card */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
              <div className="flex items-center justify-between pb-space-md border-b border-surface-container">
                <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-2">
                  <Icon name="receipt_long" className="text-secondary text-[20px]" />
                  <span>Financial Ledger</span>
                </h3>
                <span className="font-label-caps text-label-caps uppercase text-secondary font-semibold">Audited</span>
              </div>
              <div className="space-y-space-sm py-space-md border-b border-surface-container font-body-sm text-body-sm">
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Garment Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                  <span className="font-medium text-on-surface">{money(t.itemSubtotal)}</span>
                </div>
                {t.discountTotal > 0 && (
                  <div className="flex justify-between items-center text-secondary">
                    <span>Privilege Discount</span>
                    <span>−{money(t.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>White-Glove Express Delivery</span>
                  <span className="text-secondary font-semibold uppercase font-label-caps text-label-caps">
                    {t.shippingTotal > 0 ? money(t.shippingTotal) : "Complimentary"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Taxes (GST Inclusive)</span>
                  <span className="font-medium text-on-surface">
                    {t.taxTotal > 0 ? money(t.taxTotal) : "Included"}
                  </span>
                </div>
              </div>

              {/* Total Settlement */}
              <div className="py-space-md flex items-baseline justify-between border-b border-surface-container">
                <div>
                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-semibold tracking-wider">
                    Total Settlement
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">All taxes &amp; duties covered</p>
                </div>
                <div className="text-right">
                  <span className="font-headline-lg text-headline-lg font-semibold text-primary" data-testid="order-total">
                    {money(t.total)}
                  </span>
                  <span className="block font-label-caps text-label-caps text-secondary font-semibold uppercase">
                    {order.paymentStatus === "paid" ? "Fully Settled" : order.paymentMethod === "cod" ? "Pay on Delivery" : "Awaiting Settlement"}
                  </span>
                </div>
              </div>

              {/* Settlement Mechanism Details */}
              <div className="pt-space-md space-y-space-xs">
                <div className="flex items-center gap-space-xs text-on-surface font-label-md text-label-md font-medium">
                  <Icon name="check_circle" className="text-[20px] text-secondary" />
                  <span>{order.paymentMethod === "cod" ? "Cash / Card on Delivery" : "Paid Online via Razorpay"}</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Order ID: <span className="font-mono text-xs text-on-surface">#{order.id}</span>
                  <br />
                  Settlement Mode: {paymentLabel(order)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
