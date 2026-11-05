import type { Order, Product, Region, RegionPolicies } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { paymentLabel } from "@modules/order/progress"
import { MIcon } from "@modules/stitch/shell"
import Image from "next/image"
import InvoiceLinkLabel from "./invoice-link-label"
import {
  confirmationState,
  confirmationSteps,
  longDate,
  placedAt,
  policyWindow,
  shipmentStatusLabel,
  type Step,
} from "./state"

const country = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
}

/**
 * Stitch export storefront_order_confirmed_consignment_tracking, ported
 * markup-for-markup. Every value comes from the order (and, for brand,
 * material and delivery policy, the catalog); see the page for what the
 * export's sample content was replaced with.
 */
export default function OrderConfirmedTemplate({
  order,
  products,
  policies,
  region,
}: {
  order: Order
  products: Record<string, Product | null>
  policies: RegionPolicies | null
  region: Region | null
}) {
  const money = (n: number) => formatMoney(n, order.currency)
  const state = confirmationState(order)
  const steps = confirmationSteps(order)
  const t = order.totals
  const a = order.shippingAddress
  const s = order.shipment
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0)
  const name = a.firstName?.trim()
  const ref = `#EVR-${order.displayId}`
  const deliveryWindow = policyWindow(order, policies)
  const delivered = order.fulfillmentStatus === "delivered"
  const shippingFree = t.shippingTotal === 0

  const pill = {
    paid: "Order Confirmed & Atelier Reserved",
    cod: "Order Confirmed & Atelier Reserved",
    pending: "Payment Pending",
    canceled: "Order Canceled",
  }[state]
  const pillTone =
    state === "canceled"
      ? "bg-error-container text-on-error-container"
      : state === "pending"
        ? "bg-surface-container text-on-surface"
        : "bg-secondary-fixed text-on-secondary-fixed"
  const heading =
    state === "canceled" ? "Order canceled" : state === "pending" ? "Payment pending" : `Thank you${name ? `, ${name}` : ""}!`

  const etaHeading = delivered
    ? "Delivered"
    : state === "canceled"
      ? "This order will not be dispatched"
      : s?.estimatedDelivery
        ? `Estimated Delivery: ${longDate(s.estimatedDelivery)}`
        : deliveryWindow
          ? `Estimated Delivery: ${deliveryWindow}`
          : "Delivery date confirmed at dispatch"
  const transitDetail = s
    ? `${s.carrier} #${s.awb} · ${shipmentStatusLabel(s.status)}`
    : state === "canceled"
      ? "Not dispatched"
      : "Courier assigned at dispatch"
  // GST: added on top (taxTotal) or, for tax-inclusive regions, the share already inside the price.
  const rate = region?.taxRate ?? null
  const inclusive = t.taxTotal === 0 && !!region?.taxInclusive
  const gst = t.taxTotal > 0 ? t.taxTotal : inclusive && rate ? Math.round(((t.total) * rate) / (100 + rate)) : 0

  const settlement = {
    paid: "Fully Settled",
    cod: order.paymentStatus === "paid" ? "Paid on Delivery" : "Due on Delivery",
    pending: "Payment Pending",
    canceled: order.paymentStatus === "refunded" ? "Refunded" : order.paymentStatus === "paid" ? "Paid" : "Canceled",
  }[state]
  const settlementMode =
    order.paymentMethod === "cod"
      ? order.paymentStatus === "paid"
        ? "Paid on delivery"
        : "Cash on delivery"
      : order.paymentStatus === "paid"
        ? "Online (Razorpay)"
        : order.paymentStatus === "refunded"
          ? "Refunded"
          : order.paymentStatus === "partially_refunded"
            ? "Partly refunded"
            : "Online, not received"
  const method =
    order.paymentMethod === "cod"
      ? { icon: "payments", text: "Cash on Delivery" }
      : order.paymentStatus === "paid"
        ? { icon: "check_circle", text: "Paid Online via Razorpay" }
        : order.paymentStatus === "refunded"
          ? { icon: "currency_exchange", text: "Refunded via Razorpay" }
          : order.paymentStatus === "partially_refunded"
            ? { icon: "currency_exchange", text: "Partly refunded via Razorpay" }
            : { icon: "schedule", text: "Online Payment Not Received" }

  return (
    <div className="flex flex-col w-full">
      <div className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin pb-space-xl">
        {/* Top Micro Breadcrumb / Route Indicator */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-space-xs text-on-surface-variant pt-space-md pb-space-lg font-label-caps text-label-caps uppercase tracking-widest"
        >
          <LocalizedClientLink href="/" className="hover:text-on-surface transition-colors cursor-pointer">
            Everwear Boutique
          </LocalizedClientLink>
          <span className="text-outline-variant">/</span>
          <LocalizedClientLink href="/account/orders" className="hover:text-on-surface transition-colors cursor-pointer">
            Orders
          </LocalizedClientLink>
          <span className="text-outline-variant">/</span>
          <span className="text-secondary font-semibold">Confirmation {ref}</span>
        </nav>

        {/* 1. Hero Confirmation Card */}
        <div
          className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg md:p-space-xl shadow-sm mb-space-lg"
          data-testid="order-complete-container"
        >
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
            <div className="space-y-space-sm max-w-2xl">
              {/* Status Pill Badge */}
              <div
                className={`inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full font-label-caps text-label-caps uppercase tracking-wider ${pillTone}`}
                data-testid="order-state"
              >
                <span
                  className={`w-2 h-2 rounded-full ${state === "canceled" ? "bg-error" : state === "pending" ? "bg-outline" : "bg-secondary animate-ping"}`}
                />
                <span>{pill}</span>
              </div>
              <h1 className="font-display-hero text-headline-xl md:text-display-hero tracking-tight text-primary">{heading}</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                {state === "canceled" ? (
                  <>
                    Order <span className="font-medium text-on-surface">{ref}</span> has been canceled and will not be dispatched.
                    {order.paymentStatus === "refunded" ? " Your payment has been refunded." : ""} It was registered to{" "}
                  </>
                ) : state === "pending" ? (
                  <>
                    We haven&apos;t received the online payment for order{" "}
                    <span className="font-medium text-on-surface">{ref}</span> yet, so it is not confirmed and nothing will be
                    dispatched until it is. The order is registered to{" "}
                  </>
                ) : (
                  <>
                    Consignment <span className="font-medium text-on-surface">{ref}</span> has been safely queued at Everwear
                    Studios. Your tax invoice and consignment tracking updates are linked to{" "}
                  </>
                )}
                <span className="font-medium text-on-surface break-words" data-testid="order-email">
                  {order.email}
                </span>
                .
              </p>
              <div className="flex items-center gap-space-md pt-space-xs font-label-sm text-label-sm text-on-surface-variant">
                <div className="flex items-center gap-1.5">
                  <MIcon name="verified_user" className="text-[18px] text-secondary" />
                  <span data-testid="payment-method">{paymentLabel(order)}</span>
                </div>
                <span className="text-outline-variant">•</span>
                <div className="flex items-center gap-1.5">
                  <MIcon name="schedule" className="text-[18px] text-primary" />
                  <span>{placedAt(order.createdAt)}</span>
                </div>
              </div>
            </div>
            {/* Quick Actions & CTA Group */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-space-sm flex-shrink-0 min-w-[240px]">
              <LocalizedClientLink
                className="flex items-center justify-center gap-space-xs h-11 px-space-lg bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider rounded-lg shadow-sm hover:bg-primary-container transition-all"
                href={`/order/${order.id}/track`}
                data-testid="order-track-link"
              >
                <MIcon name="radar" className="text-[20px] text-secondary-fixed" />
                <span>Live Tracking</span>
              </LocalizedClientLink>
              <LocalizedClientLink
                className="flex items-center justify-center gap-space-xs h-11 px-space-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-md text-label-md uppercase tracking-wider rounded-lg transition-colors"
                href={`/order/${order.id}/invoice`}
                data-testid="order-invoice-link"
              >
                <InvoiceLinkLabel />
              </LocalizedClientLink>
              <LocalizedClientLink
                className="flex items-center justify-center gap-space-xs h-11 px-space-md text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm transition-colors"
                href="/contact"
              >
                <MIcon name="support_agent" className="text-[18px]" />
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
              <div className="flex flex-wrap items-center gap-space-xs">
                <span className="font-label-caps text-label-caps uppercase text-secondary font-semibold tracking-wider">Priority Transit</span>
                <span className="text-outline-variant">•</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant" data-testid="order-shipment">
                  {transitDetail}
                </span>
              </div>
              <h2 className="font-headline-sm text-headline-sm text-primary">{etaHeading}</h2>
            </div>
            <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-lg self-start md:self-auto">
              <MIcon name="door_front" className="text-secondary text-[20px]" />
              <span className="font-label-sm text-label-sm text-on-surface">
                {order.shippingOption.name}
                {shippingFree ? " · Complimentary" : ""}
              </span>
            </div>
          </div>
          {/* Stepper Graphic Bar */}
          <div className="pt-space-lg">
            <ol className="grid grid-cols-1 md:grid-cols-5 gap-space-md relative" data-testid="order-progress">
              {steps.map((step, i) => (
                <StepCell key={step.key} step={step} index={i} last={i === steps.length - 1} />
              ))}
            </ol>
          </div>
        </div>

        {/* 3. Primary Two-Column Luxury Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* Left Column (8 cols): Line Items, Address, Services */}
          <div className="lg:col-span-8 space-y-space-lg min-w-0">
            {/* Curated Garments Card */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg md:p-space-xl shadow-sm">
              <div className="flex items-center justify-between pb-space-md border-b border-surface-container">
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline-sm text-headline-sm text-primary">Curated Garments &amp; Artifacts</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold">
                    {itemCount}
                  </span>
                </div>
                <span className="font-label-caps text-label-caps uppercase text-secondary font-semibold tracking-wider text-right">
                  Atelier Inspected
                </span>
              </div>
              <ul className="space-y-space-lg pt-space-lg" data-testid="order-items">
                {order.items.map((item) => {
                  const product = products[item.productHandle]
                  const variant = product?.variants.find((v) => v.title === item.variantTitle)
                  const opts = variant ? Object.entries(variant.options).map(([k, v]) => `${k}: ${v}`) : item.variantTitle ? [`Size: ${item.variantTitle}`] : []
                  // Fabric chip: the product's material, else the fabric line of its subtitle.
                  const fabric = product?.material || product?.subtitle?.split("/")[0]?.trim() || null
                  const meta = [...opts, `Qty: ${item.quantity}`, ...(variant?.sku ? [`SKU: ${variant.sku}`] : [])].join(" • ")
                  return (
                    <li
                      key={item.id}
                      className="flex flex-col sm:flex-row gap-space-md p-space-md rounded-lg bg-surface-container-low/50 hover:bg-surface-container-low transition-colors"
                    >
                      <div className="relative w-full sm:w-28 h-36 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container">
                        {item.thumbnail && (
                          <Image className="object-cover" src={item.thumbnail} alt={item.productTitle} fill sizes="(min-width: 640px) 112px, 100vw" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-space-sm mb-1">
                            <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary font-semibold">
                              {product?.brand || "Everwear Atelier"}
                            </span>
                            <span className="font-headline-sm text-headline-sm text-primary font-medium tabular-nums">{money(item.total)}</span>
                          </div>
                          <h3 className="font-body-lg text-body-lg text-primary font-medium">{item.productTitle}</h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                            {meta}
                          </p>
                          {fabric && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-caps text-label-caps mt-2">
                              <MIcon name="verified" className="text-[14px] text-secondary" />
                              <span>{fabric}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-space-sm mt-space-sm border-t border-surface-container/60">
                          <span className="font-body-sm text-body-sm text-on-surface-variant">Unit Price: {money(item.unitPrice)}</span>
                          <LocalizedClientLink
                            className="font-label-sm text-label-sm text-primary hover:text-secondary font-medium uppercase tracking-wider flex items-center gap-1"
                            href={`/products/${item.productHandle}`}
                          >
                            <span>View Product Dossier</span>
                            <MIcon name="arrow_outward" className="text-[16px]" />
                          </LocalizedClientLink>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Delivery & Shipping Information Card */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg md:p-space-xl shadow-sm">
              <div className="flex items-center justify-between gap-space-sm pb-space-md border-b border-surface-container mb-space-md">
                <h2 className="font-headline-sm text-headline-sm text-primary flex items-center gap-space-xs">
                  <MIcon name="local_shipping" className="text-[22px] text-secondary" />
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
                    {[a.city, [a.province, a.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ")}, {country(a.countryCode)}
                  </p>
                  {a.phone && (
                    <div className="flex items-center gap-2 pt-1 font-body-sm text-body-sm text-on-surface">
                      <MIcon name="call" className="text-[18px] text-secondary" />
                      <span>{a.phone} (Recipient)</span>
                    </div>
                  )}
                </div>
                {/* Dispatch Method & Delivery Privileges */}
                <div className="space-y-space-xs bg-surface-container-low p-space-md rounded-lg">
                  <span className="font-label-caps text-label-caps uppercase text-secondary tracking-wider font-semibold">Doorstep Delivery Privilege</span>
                  <p className="font-label-md text-label-md text-primary font-medium">
                    {order.shippingOption.name} · {shippingFree ? "Complimentary" : money(t.shippingTotal)}
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    {s
                      ? `Handed to ${s.carrier} under AWB ${s.awb}. Follow every scan on the live tracking page.`
                      : policies
                        ? `Dispatched within ${policies.handlingDays.min}–${policies.handlingDays.max} days of your order, then ${policies.transitDays.min}–${policies.transitDays.max} days in transit. The courier and AWB number appear here once it ships.`
                        : "The courier and AWB number appear here once it ships."}
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-on-surface font-label-sm text-label-sm font-semibold">
                    <MIcon name="schedule" className="text-[16px] text-secondary" />
                    <span>
                      {delivered
                        ? "Delivered"
                        : state === "canceled"
                          ? "Not dispatched"
                          : s?.estimatedDelivery
                            ? `Slot Window: ${longDate(s.estimatedDelivery)}`
                            : deliveryWindow
                              ? `Estimated Window: ${deliveryWindow}`
                              : "Date confirmed at dispatch"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Post-Purchase Services */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg md:p-space-xl shadow-sm">
              <div className="flex items-center justify-between pb-space-md border-b border-surface-container mb-space-md">
                <h2 className="font-headline-sm text-headline-sm text-primary flex items-center gap-space-xs">
                  <MIcon name="workspace_premium" className="text-[22px] text-secondary" />
                  <span>Post-Purchase Concierge &amp; Care</span>
                </h2>
                <span className="font-label-caps text-label-caps uppercase text-secondary font-semibold">Active Privilege</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col justify-between space-y-space-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-label-md text-label-md font-semibold">
                      <MIcon name="content_cut" className="text-secondary text-[20px]" />
                      <span>Bespoke Alteration</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Book a fitting with an Everwear stylist, virtually, at home or at a flagship studio.
                    </p>
                  </div>
                  <LocalizedClientLink
                    className="w-full h-10 px-space-md bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-sm text-label-sm uppercase tracking-wider rounded-lg transition-colors font-medium flex items-center justify-center"
                    href="/concierge"
                  >
                    Reserve Tailor Fitting
                  </LocalizedClientLink>
                </div>
                <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col justify-between space-y-space-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-label-md text-label-md font-semibold">
                      <MIcon name="chat" className="text-secondary text-[20px]" />
                      <span>Direct WhatsApp Stylist</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Styling advice, fabric care or exchange help: quote {ref}.
                    </p>
                  </div>
                  <LocalizedClientLink
                    className="w-full h-10 px-space-md bg-primary hover:bg-primary-container text-on-primary font-label-sm text-label-sm uppercase tracking-wider rounded-lg transition-colors font-medium flex items-center justify-center gap-1.5"
                    href="/contact"
                  >
                    <MIcon name="support" className="text-[18px]" />
                    <span>Chat with a Stylist</span>
                  </LocalizedClientLink>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols Sticky): Financial Ledger, Settlement & Actions */}
          <div className="lg:col-span-4 space-y-space-lg lg:sticky lg:top-44 min-w-0">
            {/* Financial Ledger Card */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm" data-testid="order-totals">
              <div className="flex items-center justify-between pb-space-md border-b border-surface-container">
                <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-2">
                  <MIcon name="receipt_long" className="text-secondary text-[20px]" />
                  <span>Financial Ledger</span>
                </h3>
                <span className="font-label-caps text-label-caps uppercase text-secondary font-semibold">Audited</span>
              </div>
              <div className="space-y-space-sm py-space-md border-b border-surface-container font-body-sm text-body-sm">
                <div className="flex justify-between items-center gap-space-sm text-on-surface-variant">
                  <span>
                    Garment Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
                  </span>
                  <span className="font-medium text-on-surface tabular-nums">{money(t.itemSubtotal)}</span>
                </div>
                <div className="flex justify-between items-center gap-space-sm text-on-surface-variant">
                  <span>{order.shippingOption.name}</span>
                  {shippingFree ? (
                    <span className="text-secondary font-semibold uppercase font-label-caps text-label-caps">Complimentary</span>
                  ) : (
                    <span className="font-medium text-on-surface tabular-nums">{money(t.shippingTotal)}</span>
                  )}
                </div>
                <div className="flex justify-between items-center gap-space-sm text-on-surface-variant">
                  <span>
                    Taxes (GST{rate ? ` ${rate}%` : ""}
                    {inclusive ? " Inclusive" : ""})
                  </span>
                  <span className="font-medium text-on-surface tabular-nums">{gst > 0 ? money(gst) : "Included"}</span>
                </div>
                <div className="flex justify-between items-center gap-space-sm text-on-surface-variant">
                  <span>{order.promoCodes.length ? `Privilege Code (${order.promoCodes.join(", ")})` : "Atelier Privilege"}</span>
                  <span className="text-secondary font-medium tabular-nums">- {money(t.discountTotal)}</span>
                </div>
              </div>
              {/* Total Settlement */}
              <div className="py-space-md flex items-baseline justify-between gap-space-sm border-b border-surface-container">
                <div>
                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-semibold tracking-wider">
                    Total Settlement
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">All taxes &amp; duties covered</p>
                </div>
                <div className="text-right">
                  <span className="font-headline-lg text-headline-lg font-semibold text-primary tabular-nums" data-testid="order-total">
                    {money(t.total)}
                  </span>
                  <span className="block font-label-caps text-label-caps text-secondary font-semibold uppercase">{settlement}</span>
                </div>
              </div>
              {/* Settlement Mechanism Details */}
              <div className="pt-space-md space-y-space-xs">
                <div className="flex items-center gap-space-xs text-on-surface font-label-md text-label-md font-medium">
                  <MIcon name={method.icon} className="text-[20px] text-secondary" />
                  <span>{method.text}</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Order ID: <span className="font-mono text-xs text-on-surface break-all">#{order.id}</span>
                  <br />
                  Settlement Mode: {settlementMode}
                </p>
              </div>
            </div>

            {/* Atelier Assurance Guarantee Grid (titles are the design's; copy states only what is true) */}
            <div className="rounded-xl bg-surface-container-low p-space-md space-y-space-sm">
              <div className="flex items-start gap-space-xs">
                <MIcon name="verified" className="text-secondary text-[20px] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-label-md text-label-md font-semibold text-primary">100% Genuine Atelier Curations</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Sold and shipped by Everwear with a GST tax invoice.</p>
                </div>
              </div>
              <div className="flex items-start gap-space-xs pt-space-xs border-t border-surface-container">
                <MIcon name="lock" className="text-secondary text-[20px] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-label-md text-label-md font-semibold text-primary">Tamper-Proof Smart Sealed</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Check the seal on delivery; report issues to care.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-space-xs pt-space-xs border-t border-surface-container">
                <MIcon name="published_with_changes" className="text-secondary text-[20px] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-label-md text-label-md font-semibold text-primary">
                    {policies ? `${policies.returnWindowDays}-Day ` : ""}Doorstep Exchange
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {policies
                      ? `Returns within ${policies.returnWindowDays} days of delivery, ${policies.freeReturns ? "return shipping free." : "return shipping paid by you."}`
                      : "See our return policy for how exchanges work."}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation CTAs */}
            <div className="space-y-space-sm pt-space-xs">
              <LocalizedClientLink
                className="w-full h-12 flex items-center justify-center gap-space-xs bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md uppercase tracking-wider rounded-lg transition-colors shadow-sm"
                href="/store"
                data-testid="continue-shopping"
              >
                <span>Continue Exploring Collections</span>
                <MIcon name="arrow_forward" className="text-[18px]" />
              </LocalizedClientLink>
              <LocalizedClientLink
                className="w-full h-12 flex items-center justify-center gap-space-xs bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md uppercase tracking-wider rounded-lg transition-colors"
                href="/account/orders"
              >
                <span>View All Past Orders</span>
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** One cell of the design's stepper; the visual state comes from real order state. */
function StepCell({ step, index, last }: { step: Step; index: number; last: boolean }) {
  const dot = {
    done: "bg-primary text-on-primary",
    current: "bg-secondary text-on-secondary",
    canceled: "bg-error text-on-error",
    upcoming: "bg-surface-container-high text-on-surface-variant",
  }[step.state]
  const active = step.state !== "upcoming"
  return (
    <li className="flex flex-col space-y-2 relative" aria-current={step.state === "current" ? "step" : undefined}>
      <div className="flex items-center gap-space-xs">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-label-caps text-label-caps ${dot}`}>
          {step.state === "done" ? (
            <MIcon name="check" className="text-[16px]" />
          ) : step.state === "current" ? (
            <MIcon name="sync" className="text-[16px] animate-spin" />
          ) : step.state === "canceled" ? (
            <MIcon name="close" className="text-[16px]" />
          ) : (
            index + 1
          )}
        </div>
        {!last && <div className={`h-1 flex-1 rounded-full hidden md:block ${step.state === "done" ? "bg-primary" : "bg-surface-container"}`} />}
      </div>
      <div>
        <span
          className={`font-label-caps text-label-caps font-semibold uppercase ${step.state === "done" ? "text-secondary" : "text-on-surface-variant"}`}
        >
          Step {String(index + 1).padStart(2, "0")}
        </span>
        <p className={`font-label-md text-label-md font-medium ${active ? "text-primary" : "text-on-surface-variant"}`}>{step.label}</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{step.detail}</p>
      </div>
    </li>
  )
}
