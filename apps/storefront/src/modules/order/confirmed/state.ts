import type { Order, RegionPolicies } from "@lib/api/types"
import { orderProgress } from "@modules/order/progress"

/** What the confirmation page may honestly claim about an order. */
export type ConfirmationState = "paid" | "cod" | "pending" | "canceled"

export function confirmationState(order: Order): ConfirmationState {
  if (order.status === "canceled") return "canceled"
  if (order.paymentMethod === "cod") return "cod"
  return order.paymentStatus === "paid" ? "paid" : "pending"
}

const IST = "Asia/Kolkata"

/** "04 Nov 2026, 14:32 IST", as the design writes times. */
export const placedAt = (iso: string) =>
  `${new Date(iso).toLocaleString("en-GB", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} IST`

/** "04 Nov, 14:32 IST" for stepper details. */
export const shortAt = (iso: string) =>
  `${new Date(iso).toLocaleString("en-GB", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} IST`

/** "Friday, Nov 7, 2026" */
export const longDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-US", { timeZone: IST, weekday: "long", month: "short", day: "numeric", year: "numeric" })

const shortDate = (d: Date) => d.toLocaleDateString("en-US", { timeZone: IST, month: "short", day: "numeric" })

const addDays = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * 86_400_000)

/**
 * The delivery window the store's own region policy gives for this order
 * (handling + transit days from the time it was placed), or null when the
 * region publishes no policy. It is an estimate and is always labelled so.
 */
export function policyWindow(order: Order, policies: RegionPolicies | null) {
  if (!policies) return null
  const from = addDays(order.createdAt, policies.handlingDays.min + policies.transitDays.min)
  const to = addDays(order.createdAt, policies.handlingDays.max + policies.transitDays.max)
  const year = to.toLocaleDateString("en-US", { timeZone: IST, year: "numeric" })
  return `${shortDate(from)} – ${shortDate(to)}, ${year}`
}

const SHIPMENT_STATUS: Record<string, string> = {
  pending: "Booking with courier",
  ready_to_ship: "Ready to ship",
  shipment_created: "Shipment created",
  pickup_scheduled: "Pickup scheduled",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  delivery_failed: "Delivery attempt failed",
  rto_initiated: "Returning to origin",
  rto_in_transit: "Returning to origin",
  rto_delivered: "Returned to origin",
  cancelled: "Shipment cancelled",
}
export const shipmentStatusLabel = (status: string) => SHIPMENT_STATUS[status] ?? status.replace(/_/g, " ")

export type Step = { key: string; label: string; detail: string; state: "done" | "current" | "upcoming" | "canceled" }

/**
 * The design's five-step stepper (confirmed → packed → shipped → out for
 * delivery → delivered), driven only by the order's real status fields via
 * orderProgress(); "out for delivery" is read from the courier's shipment
 * status. A canceled order shows where it stopped.
 */
export function confirmationSteps(order: Order): Step[] {
  const state = confirmationState(order)
  if (state === "canceled") {
    return [
      { key: "placed", label: "Order Placed", detail: shortAt(order.createdAt), state: "done" },
      { key: "canceled", label: "Order Canceled", detail: "Nothing will be dispatched", state: "canceled" },
    ]
  }
  const base = Object.fromEntries(orderProgress(order).map((s) => [s.key, s]))
  const s = order.shipment
  const delivered = base.delivered?.state === "done"
  const done = {
    placed: true,
    packed: base.packed?.state === "done",
    shipped: base.shipped?.state === "done",
    out: delivered || s?.status === "out_for_delivery" || s?.status === "delivered",
    delivered,
  }
  const pending = state === "pending"
  const rows: { key: keyof typeof done; label: string; detail: string }[] = [
    {
      key: "placed",
      label: pending ? "Order Placed" : "Order Confirmed",
      detail: pending ? "Awaiting payment" : shortAt(order.createdAt),
    },
    {
      key: "packed",
      label: "Master Inspected",
      detail: s?.pickupScheduledAt
        ? `Pickup ${shortAt(s.pickupScheduledAt)}`
        : done.packed
          ? "Ready for pickup"
          : pending
            ? "After payment"
            : "Being prepared",
    },
    {
      key: "shipped",
      label: "Hub Dispatch",
      detail: s ? `${s.carrier} · ${s.awb}` : "Courier assigned at dispatch",
    },
    {
      key: "out",
      label: "Out for Delivery",
      detail: !delivered && s?.estimatedDelivery ? `Expected ${shortDate(new Date(s.estimatedDelivery))}` : done.out ? "With courier" : "Pending",
    },
    {
      key: "delivered",
      label: "Delivered",
      detail: delivered ? "Delivered" : `To ${order.shippingAddress.city}`,
    },
  ]
  // Nothing is in progress until an online payment has actually arrived.
  const firstOpen = pending ? -1 : rows.findIndex((r) => !done[r.key])
  return rows.map((r, i) => ({
    key: r.key,
    label: r.label,
    detail: r.detail,
    state: done[r.key] ? "done" : i === firstOpen ? "current" : "upcoming",
  }))
}
