import { cn } from "@/lib/utils"
import type { Order } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { CheckIcon } from "lucide-react"
import Image from "next/image"
import type { ProgressStep } from "./progress"

/** Shared look for the order pages' white panels. */
export function Panel({
  title,
  aside,
  className,
  children,
  testId,
}: {
  title?: React.ReactNode
  aside?: React.ReactNode
  className?: string
  children: React.ReactNode
  testId?: string
}) {
  return (
    <section
      className={cn("rounded-xl border border-surface-container-high/60 bg-surface-container-lowest p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)]", className)}
      data-testid={testId}
    >
      {(title || aside) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h2 className="text-[18px] font-semibold text-on-surface">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  )
}

/** Placed → Packed → Shipped → Delivered, across the page. */
export function ProgressBar({ steps }: { steps: ProgressStep[] }) {
  return (
    <ol className="grid grid-cols-2 gap-y-6 sm:grid-cols-4" data-testid="order-progress">
      {steps.map((step, i) => (
        <li key={step.key} className="relative flex flex-col gap-2 pr-4" aria-current={step.state === "current" ? "step" : undefined}>
          <div className="flex items-center">
            <span
              className={cn(
                "z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                step.state === "done" && "border-primary bg-primary text-on-primary",
                step.state === "current" && "border-secondary bg-secondary text-on-secondary",
                step.state === "upcoming" && "border-outline-variant bg-surface-container-lowest text-on-surface-variant"
              )}
            >
              {step.state === "done" ? <CheckIcon aria-hidden className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn("ml-2 hidden h-0.5 flex-1 sm:block", step.state === "done" ? "bg-primary" : "bg-surface-container-high")}
              />
            )}
          </div>
          <span
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wider",
              step.state === "upcoming" ? "text-on-surface-variant" : "text-secondary"
            )}
          >
            Step {String(i + 1).padStart(2, "0")}
          </span>
          <span className="text-[14px] font-medium text-on-surface">{step.label}</span>
          {step.detail && <span className="text-[12px] text-on-surface-variant">{step.detail}</span>}
        </li>
      ))}
    </ol>
  )
}

/** The same steps as a vertical timeline, for the tracking page. */
export function ProgressTimeline({ steps }: { steps: ProgressStep[] }) {
  return (
    <ol className="flex flex-col" data-testid="order-timeline">
      {steps.map((step, i) => (
        <li key={step.key} className="relative flex gap-4 pb-7 last:pb-0" aria-current={step.state === "current" ? "step" : undefined}>
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn("absolute left-[13px] top-8 bottom-0 w-0.5", step.state === "done" ? "bg-primary" : "bg-surface-container-high")}
            />
          )}
          <span
            className={cn(
              "z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
              step.state === "done" && "border-primary bg-primary text-on-primary",
              step.state === "current" && "border-secondary bg-secondary text-on-secondary ring-4 ring-secondary/15",
              step.state === "upcoming" && "border-outline-variant bg-surface-container-lowest text-on-surface-variant"
            )}
          >
            {step.state === "done" ? <CheckIcon aria-hidden className="size-3.5" strokeWidth={3} /> : i + 1}
          </span>
          <div className={cn("flex-1 rounded-lg p-3", step.state === "current" && "border-l-2 border-secondary bg-surface-container-low")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("text-[15px] font-medium", step.state === "upcoming" ? "text-on-surface-variant" : "text-on-surface")}>
                {step.label}
              </span>
              {step.state === "current" && (
                <span className="rounded bg-secondary-fixed px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-secondary-fixed">
                  Current
                </span>
              )}
            </div>
            {step.detail && <p className="mt-1 text-[13px] text-on-surface-variant">{step.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function OrderItems({ order }: { order: Order }) {
  return (
    <ul className="flex flex-col gap-4" data-testid="order-items">
      {order.items.map((item) => (
        <li key={item.id} className="flex gap-4 rounded-lg border border-surface-container-high/60 p-4">
          <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-surface-container">
            {item.thumbnail && <Image src={item.thumbnail} alt="" fill sizes="80px" className="object-cover" />}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <LocalizedClientLink
                  href={`/products/${item.productHandle}`}
                  className="block truncate text-[15px] font-medium text-on-surface hover:underline"
                >
                  {item.productTitle}
                </LocalizedClientLink>
                <p className="mt-1 text-[13px] text-on-surface-variant">
                  {item.variantTitle ? `Size: ${item.variantTitle} · ` : ""}Qty: {item.quantity}
                </p>
              </div>
              <span className="shrink-0 text-[15px] font-semibold tabular-nums text-on-surface">
                {formatMoney(item.total, order.currency)}
              </span>
            </div>
            <p className="text-[12px] text-on-surface-variant">Unit price: {formatMoney(item.unitPrice, order.currency)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Totals exactly as the order records them. */
export function OrderTotals({ order }: { order: Order }) {
  const t = order.totals
  const money = (n: number) => formatMoney(n, order.currency)
  const rows: [string, string, string?][] = [
    [`Items (${order.items.reduce((n, i) => n + i.quantity, 0)})`, money(t.itemSubtotal)],
    ...(t.discountTotal > 0 ? ([["Discount", `− ${money(t.discountTotal)}`, "text-[#03a685]"]] as [string, string, string][]) : []),
    [order.shippingOption.name, t.shippingTotal > 0 ? money(t.shippingTotal) : "Free", t.shippingTotal > 0 ? undefined : "text-[#03a685]"],
    ["Taxes", t.taxTotal > 0 ? money(t.taxTotal) : "Included"],
  ]
  return (
    <div className="flex flex-col gap-2.5 text-[14px]" data-testid="order-totals">
      {rows.map(([label, value, tone]) => (
        <div key={label} className="flex justify-between gap-4 text-on-surface-variant">
          <span>{label}</span>
          <span className={cn("tabular-nums text-on-surface", tone)}>{value}</span>
        </div>
      ))}
      <div className="mt-2 flex items-end justify-between border-t border-surface-container-high pt-3">
        <span className="text-[15px] font-semibold text-on-surface">Total</span>
        <span className="text-[22px] font-semibold tabular-nums text-on-surface" data-testid="order-total">
          {money(t.total)}
        </span>
      </div>
    </div>
  )
}

export function AddressBlock({ address }: { address: Order["shippingAddress"] }) {
  return (
    <address className="not-italic text-[14px] leading-relaxed text-on-surface-variant" data-testid="order-address">
      <span className="block text-[15px] font-medium text-on-surface">
        {address.firstName} {address.lastName}
      </span>
      {address.address1}
      {address.address2 ? `, ${address.address2}` : ""}
      <br />
      {address.city}
      {address.province ? `, ${address.province}` : ""} {address.postalCode}
      <br />
      {address.countryCode.toUpperCase()}
      {address.phone && <span className="mt-1 block text-on-surface">Phone: {address.phone}</span>}
    </address>
  )
}
