import type { OwnFleetDelivery } from "@lib/api/types"
import { MIcon } from "@modules/stitch/shell"

const REASONS: Record<string, string> = {
  customer_unavailable: "you weren't available",
  customer_refused: "the parcel was refused",
  address_not_found: "our rider couldn't find the address",
  customer_rescheduled: "you asked for another time",
  cash_not_ready: "the cash wasn't ready",
  premises_closed: "the premises were closed",
  unsafe_location: "it wasn't safe to deliver",
  other: "of a problem at the door",
}

const time = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

/**
 * For parcels delivered by Everwear's own riders: the OTP to share at the
 * door, who is bringing it, where they are while it's out for delivery, and
 * any failed attempt. Courier parcels never show this card.
 */
export function OwnFleetCard({ delivery, money }: { delivery: OwnFleetDelivery; money: (n: number) => string }) {
  const last = delivery.attempts.at(-1)
  const showAttempt = last && (delivery.status === "attempt_failed" || delivery.status === "out_for_delivery" || delivery.status === "rto")
  if (!delivery.otp && !delivery.rider && !showAttempt) return null
  return (
    <section aria-label="Your delivery" className="mb-space-xl rounded-xl border border-surface-container-high bg-surface-container-lowest p-space-lg" data-testid="own-fleet-card">
      <div className="flex flex-col gap-space-lg md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-space-md">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary/10 text-secondary">
            <MIcon name="local_shipping" className="text-[20px]" />
          </span>
          <div>
            <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Everwear Fleet · {delivery.awb}</p>
            <p className="font-body-lg text-body-lg text-primary">
              {delivery.status === "out_for_delivery"
                ? `${delivery.rider?.firstName ?? "Your rider"} is on the way with your order.`
                : delivery.rider
                  ? `${delivery.rider.firstName} will deliver your order.`
                  : "Your order is with our delivery team."}
            </p>
            {delivery.cashDue ? <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Please keep {money(delivery.cashDue)} ready in cash.</p> : null}
            {showAttempt ? (
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                We tried to deliver on {time(last.at)}, but {REASONS[last.reason] ?? REASONS.other}.
                {delivery.status === "rto" ? " The parcel is on its way back to us; we'll be in touch about a refund." : last.rescheduledFor ? ` We'll try again around ${time(last.rescheduledFor)}.` : " We'll try again."}
              </p>
            ) : null}
            {delivery.location ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${delivery.location.lat},${delivery.location.lng}`}
                target="_blank"
                rel="noreferrer"
                className="mt-space-sm inline-flex items-center gap-1.5 font-label-sm text-label-sm text-secondary underline underline-offset-4"
              >
                <MIcon name="map" className="text-[16px]" /> See where {delivery.rider?.firstName ?? "your rider"} is (updated {time(delivery.location.at)})
              </a>
            ) : null}
          </div>
        </div>
        {delivery.otp ? (
          <div className="rounded-lg border border-secondary/30 bg-secondary/5 px-space-lg py-space-md text-center">
            <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Delivery OTP</p>
            <p className="font-mono text-3xl font-semibold tracking-[0.3em] text-primary" data-testid="delivery-otp">
              {delivery.otp}
            </p>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Share it only when you have the parcel.</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
