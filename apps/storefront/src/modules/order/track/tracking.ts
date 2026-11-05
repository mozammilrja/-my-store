import type { Order, TrackingEvent } from "@lib/api/types"
import { paymentLabel } from "@modules/order/progress"

/*
 * What the tracking page shows, worked out from the order alone. Every value
 * comes from the order or its shipment record (GET /store/orders/:id returns
 * the shipment's carrier scans, oldest first, as `shipment.events`). Nothing
 * is estimated or invented: no scans means the timeline says so.
 *
 * The timeline always has the export's five milestones; each real carrier
 * scan is attached to the milestone it belongs to.
 */

export type Chip = { text: string; icon?: string; tone?: "plain" | "box" | "accent" }

export type TrackNode = {
  key: string
  title: string
  /** Pre-formatted time, or a short note such as "Pending" / "Expected 7 Nov". */
  time: string
  body: string
  chips: Chip[]
  state: "done" | "current" | "upcoming"
  /** Icon for the active / upcoming circle. */
  icon: string
  /** Label of the "active" chip (real status). */
  activeLabel?: string
  /** The export's progress strip, on the active milestone. */
  strip?: { left: string; mid: string; right: string; pct: number }
}

const IST = "Asia/Kolkata"

/** "04 Nov, 14:32 IST" */
export const scanTime = (iso: string) =>
  `${new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST }).replace(" at ", ", ")} IST`

/** "14:32" */
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST })

/** "Friday, 7 Nov" */
export const longDay = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: IST })

const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: IST })

/** Courier name as the courier integration reported it ("Delhivery Surface"), or a neutral word before one is assigned. */
export const carrierName = (c: string | null | undefined) => (c && c.trim() ? c : "the courier")

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
export const shipmentStatusLabel = (s: string) => SHIPMENT_STATUS[s] ?? s.replace(/_/g, " ")

export type Phase = "canceled" | "preparing" | "awaiting_pickup" | "in_transit" | "out_for_delivery" | "attempt_failed" | "delivered" | "rto" | "returned"

function phaseOf(order: Order): Phase {
  if (order.status === "canceled") return "canceled"
  if (order.fulfillmentStatus === "returned") return "returned"
  if (order.fulfillmentStatus === "delivered" || order.shipment?.status === "delivered") return "delivered"
  const s = order.shipment?.status
  if (!order.shipment) return order.fulfillmentStatus === "shipped" ? "in_transit" : "preparing"
  if (s === "out_for_delivery") return "out_for_delivery"
  if (s === "delivery_failed") return "attempt_failed"
  if (s === "rto_initiated" || s === "rto_in_transit" || s === "rto_delivered") return "rto"
  if (s === "pending" || s === "ready_to_ship" || s === "shipment_created" || s === "pickup_scheduled") return "awaiting_pickup"
  return "in_transit"
}

const HEADING: Record<Phase, string> = {
  canceled: "Order Canceled",
  preparing: "Preparing your order",
  awaiting_pickup: "Awaiting Courier Pickup",
  in_transit: "Consignment in Transit",
  out_for_delivery: "Out for Delivery",
  attempt_failed: "Delivery Attempt Failed",
  delivered: "Consignment Delivered",
  rto: "Returning to Origin",
  returned: "Consignment Returned",
}

const BADGE: Record<Phase, string> = {
  canceled: "Canceled",
  preparing: "Awaiting Dispatch",
  awaiting_pickup: "Booked · Awaiting Pickup",
  in_transit: "En Route",
  out_for_delivery: "Out for Delivery",
  attempt_failed: "Attempt Failed",
  delivered: "Delivered",
  rto: "Returning to Origin",
  returned: "Returned",
}

/** Which of the five milestones a carrier scan belongs to (1-based: 2 packed, 3 hub, 4 out for delivery, 5 handover). */
function milestoneOf(e: TrackingEvent): 2 | 3 | 4 | 5 {
  const s = `${e.status} ${e.note}`.toLowerCase()
  if (/out for delivery|out_for_delivery|ofd/.test(s)) return 4
  if (/\bdelivered\b/.test(s) && !/undelivered|not delivered/.test(s)) return 5
  if (/manifest|label|packed|booked/.test(s)) return 2
  return 3
}

/** Index (0-4) of the active milestone; 5 = all done. */
const ACTIVE: Record<Phase, number> = {
  canceled: 1,
  preparing: 1,
  awaiting_pickup: 2,
  in_transit: 2,
  rto: 2,
  out_for_delivery: 3,
  attempt_failed: 3,
  delivered: 5,
  returned: 5,
}

function last<T>(xs: T[]): T | undefined {
  return xs.length ? xs[xs.length - 1] : undefined
}

const SLOT_WINDOW: Record<string, string> = { morning: "10 AM – 1 PM", evening: "2 PM – 6 PM" }

export function buildTracking(order: Order, ctx: { originCode: string | null; originName: string | null; destination: string }) {
  const phase = phaseOf(order)
  const s = order.shipment
  const a = order.shippingAddress
  const destination = [a.city, a.postalCode].filter(Boolean).join(" ")
  const events = s?.events ?? []
  const byMilestone = (m: number) => events.filter((e) => milestoneOf(e) === m)
  const active = ACTIVE[phase]
  const state = (i: number): TrackNode["state"] => (i < active ? "done" : i === active ? "current" : "upcoming")
  const carrier = s ? carrierName(s.carrier) : null
  const origin = ctx.originName ?? "our warehouse"
  const slot = order.deliveryPreferences?.slot ? SLOT_WINDOW[order.deliveryPreferences.slot] : null

  // 1. Order confirmed and allocated.
  const n1: TrackNode = {
    key: "confirmed",
    title: "Order Confirmed & Atelier Allocation",
    time: scanTime(order.createdAt),
    body: `Order #${order.displayId} confirmed. ${paymentLabel(order)}.${ctx.originName ? ` Fulfilled from ${ctx.originName}.` : ""}`,
    chips: [{ icon: "verified", text: `Order Ref: #${order.displayId}`, tone: "plain" }],
    state: state(0),
    icon: "done",
  }

  // 2. Packed and handed over to the carrier (manifest / label scans).
  const packed = last(byMilestone(2))
  const n2: TrackNode = {
    key: "packed",
    title: phase === "canceled" ? "Order Canceled" : "Quality Verification & Packing",
    time: packed ? scanTime(packed.timestamp) : s?.shippedAt ? scanTime(s.shippedAt) : phase === "canceled" ? "Canceled" : "Pending",
    body:
      phase === "canceled"
        ? "This order was canceled and will not be shipped."
        : s
          ? packed?.note || `Packed at ${origin} and labelled for ${carrier}.`
          : `Your pieces are being checked and packed at ${origin}. The airway bill is issued when the courier is booked.`,
    chips: s
      ? [...(s.awb ? [{ text: `AWB: ${s.awb}`, tone: "box" as const }] : []), { text: `${carrier} · ${shipmentStatusLabel(s.status)}`, tone: "accent" as const }]
      : [],
    state: state(1),
    icon: phase === "canceled" ? "block" : "inventory_2",
    activeLabel: phase === "canceled" ? "Canceled" : "Packing",
  }

  // 3. Hub dispatch and transit scans.
  const transit = byMilestone(3)
  const firstScan = events[0]
  const latest = last(transit) ?? (phase === "awaiting_pickup" ? undefined : last(events))
  const n3: TrackNode = {
    key: "hub",
    title: `${ctx.originCode ?? "Warehouse"} Hub Dispatch`,
    time: latest ? scanTime(latest.timestamp) : s?.pickupScheduledAt ? `${scanTime(s.pickupScheduledAt)} (Pickup)` : "Pending",
    body: latest
      ? [latest.note || latest.status, latest.location ? `Scanned at ${latest.location}.` : ""].filter(Boolean).join(" ")
      : s
        ? `Waiting for ${carrier} to collect the parcel from ${origin}.`
        : `Collected by the courier from ${origin} and moved through its hubs.`,
    chips: transit.length > 1 ? [{ icon: "pin_drop", text: `${transit.length} carrier scans`, tone: "plain" }] : [],
    state: state(2),
    icon: phase === "rto" ? "undo" : "flight_takeoff",
    activeLabel: phase === "awaiting_pickup" ? "Awaiting Pickup" : phase === "rto" ? "Returning to Origin" : "In Transit",
    strip:
      s && active === 2
        ? {
            left: firstScan ? `${firstScan.status} (${clock(firstScan.timestamp)})` : `Booked (${s.shippedAt ? clock(s.shippedAt) : "—"})`,
            mid: latest ? `${latest.location || latest.status} (${clock(latest.timestamp)})` : "Awaiting pickup",
            right: s.estimatedDelivery ? `${ctx.destination} (Est. ${shortDay(s.estimatedDelivery)})` : ctx.destination,
            pct: phase === "awaiting_pickup" ? 8 : 50,
          }
        : undefined,
  }

  // 4. Destination city and out for delivery.
  const ofd = last(byMilestone(4))
  const n4: TrackNode = {
    key: "ofd",
    title: `${ctx.destination} Regional Terminal & Out for Delivery`,
    time: ofd ? scanTime(ofd.timestamp) : s?.estimatedDelivery ? `${shortDay(s.estimatedDelivery)} (Expected)` : "Pending",
    body: ofd ? [ofd.note || ofd.status, ofd.location ? `At ${ofd.location}.` : ""].filter(Boolean).join(" ") : `Reaches the courier's delivery centre for ${destination} and goes out with a delivery executive.`,
    chips: [],
    state: state(3),
    icon: "local_shipping",
    activeLabel: phase === "attempt_failed" ? "Delivery Attempt Failed" : "Out for Delivery",
  }

  // 5. Handover at the door.
  const handed = last(byMilestone(5))
  const n5: TrackNode = {
    key: "handover",
    title: "Doorstep Handover",
    time: s?.deliveredAt ? scanTime(s.deliveredAt) : handed ? scanTime(handed.timestamp) : slot ? `${slot} Window` : "Pending",
    body:
      phase === "delivered"
        ? `Delivered to ${destination}.`
        : `Handed over at ${destination}${slot ? ` in the ${slot} window you chose` : ""}. ${order.paymentMethod === "cod" && order.paymentStatus !== "paid" ? "Pay the courier on delivery." : ""}`.trim(),
    chips: [],
    state: state(4),
    icon: "checkroom",
  }

  const nodes = [n1, n2, n3, n4, n5]
  const lastScan = last(events)

  return {
    phase,
    heading: HEADING[phase],
    badge: BADGE[phase],
    moving: phase === "in_transit" || phase === "out_for_delivery",
    nodes,
    phaseLabel: phase === "canceled" ? "Canceled" : active >= 5 ? "Complete" : `Phase ${String(active + 1).padStart(2, "0")} Active`,
    lastScan,
    destination,
  }
}
