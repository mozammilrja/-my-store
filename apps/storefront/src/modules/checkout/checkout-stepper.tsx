import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { CheckoutStep } from "./checkout-data"
import { MIcon } from "./m-icon"

const STEPS: { id: CheckoutStep; label: string }[] = [
  { id: "address", label: "Address" },
  { id: "delivery", label: "Delivery" },
  { id: "review", label: "Review" },
  { id: "payment", label: "Payment" },
]

/**
 * The one checkout progress indicator, used by every step (the compact style
 * of the address and delivery exports): done steps show a check and link
 * back, the current step is a filled circle with a dark label, later steps
 * are pale. Below `sm` only the current step keeps its label so the row fits.
 */
export function CheckoutStepper({ current }: { current: CheckoutStep }) {
  const at = STEPS.findIndex((s) => s.id === current)
  return (
    <nav aria-label="Checkout progress" className="flex items-center justify-center gap-space-sm sm:gap-space-md max-w-full">
      {STEPS.map((s, i) => {
        const done = i < at
        const active = i === at
        const marker = (
          <span
            className={`w-6 h-6 rounded-full font-label-caps text-label-caps flex items-center justify-center shrink-0 ${
              done || active ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {done ? <MIcon name="check" className="text-[14px]" /> : i + 1}
          </span>
        )
        const label = (
          <span
            className={`font-label-caps text-label-caps uppercase tracking-wider whitespace-nowrap ${active ? "font-semibold" : "hidden sm:inline"}`}
          >
            {s.label}
          </span>
        )
        const cls = `flex items-center gap-space-xs ${active ? "text-primary" : done ? "text-on-surface hover:text-primary" : "text-on-surface-variant"}`
        return (
          <div key={s.id} className="contents">
            {i > 0 && <span aria-hidden className={`w-5 sm:w-10 h-px shrink-0 ${i <= at ? "bg-primary" : "bg-outline-variant"}`} />}
            {done ? (
              <LocalizedClientLink href={`/checkout?step=${s.id}`} className={cls} data-testid={`checkout-step-${s.id}`}>
                {marker}
                {label}
              </LocalizedClientLink>
            ) : (
              <div className={cls} aria-current={active ? "step" : undefined} data-testid={`checkout-step-${s.id}`}>
                {marker}
                {label}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
