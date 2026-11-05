import type { ShipmentStatus } from "../../db/schema.js"

/*
 * Courier statuses onto internal ones. Shiprocket reports a numeric
 * shipment_status_id and a label; the id is used when known, the label as a
 * fallback. Anything unrecognised maps to null and leaves the status as it was:
 * a status is never guessed.
 */

/** Shiprocket shipment_status_id values (Shiprocket API docs, "Shipment Status" codes). */
const SHIPROCKET_IDS: Record<number, ShipmentStatus> = {
  6: "in_transit", // Shipped
  7: "delivered",
  8: "cancelled",
  9: "rto_initiated",
  10: "rto_delivered",
  12: "delivery_failed", // Lost
  13: "pickup_scheduled", // Pickup Error (still awaiting pickup)
  14: "rto_initiated", // RTO Acknowledged
  15: "pickup_scheduled", // Pickup Rescheduled
  16: "cancelled", // Cancellation Requested
  17: "out_for_delivery",
  18: "in_transit",
  19: "pickup_scheduled", // Out For Pickup
  20: "pickup_scheduled", // Pickup Exception
  21: "delivery_failed", // Undelivered
  22: "in_transit", // Delayed
  38: "in_transit", // Reached at Destination Hub
  40: "rto_in_transit", // RTO NDR
  41: "rto_in_transit", // RTO Out For Delivery
  42: "picked_up",
  45: "cancelled", // Cancelled before Dispatched
  46: "rto_in_transit",
  48: "in_transit", // Reached Warehouse
  50: "in_transit", // In Flight
  51: "picked_up", // Handover to Courier
  52: "shipment_created", // Shipment Booked
}

const LABELS: [RegExp, ShipmentStatus][] = [
  [/rto[\s_-]*delivered/, "rto_delivered"],
  [/rto[\s_-]*(in[\s_-]*transit|ofd|out for delivery)/, "rto_in_transit"],
  [/\brto\b|return to origin/, "rto_initiated"],
  [/cancel/, "cancelled"],
  [/undelivered|delivery failed|failed attempt|lost|ndr/, "delivery_failed"],
  [/out for delivery|\bofd\b/, "out_for_delivery"],
  [/^delivered$|\bdelivered\b/, "delivered"],
  [/picked[\s_-]*up|pickup done|shipment picked/, "picked_up"],
  [/pickup|out for pickup/, "pickup_scheduled"],
  [/in[\s_-]*transit|shipped|reached|hub|dispatched|connected|delayed/, "in_transit"],
  [/manifest|label|awb assigned|booked/, "shipment_created"],
  [/^new$|ready to ship/, "ready_to_ship"],
]

export function mapShiprocketStatus(id: number | string | null | undefined, label?: string | null): ShipmentStatus | null {
  const n = typeof id === "string" ? Number(id) : id
  if (typeof n === "number" && Number.isFinite(n) && SHIPROCKET_IDS[n]) return SHIPROCKET_IDS[n]
  const text = (label ?? "").trim().toLowerCase()
  if (!text) return null
  for (const [re, status] of LABELS) if (re.test(text)) return status
  return null
}

/** Order of progress, so a late or out-of-order scan never moves a parcel backwards. */
const RANK: Record<ShipmentStatus, number> = {
  pending: 0,
  ready_to_ship: 1,
  shipment_created: 2,
  pickup_scheduled: 3,
  picked_up: 4,
  in_transit: 5,
  out_for_delivery: 6,
  delivery_failed: 6,
  delivered: 9,
  rto_initiated: 7,
  rto_in_transit: 8,
  rto_delivered: 9,
  cancelled: 10,
}

/** Whether moving from `from` to `to` is progress (or a legitimate branch like a failed attempt then a retry). */
export function shouldAdvance(from: ShipmentStatus, to: ShipmentStatus) {
  if (from === to) return false
  if (from === "delivered" || from === "rto_delivered" || from === "cancelled") return false
  // After a failed attempt the courier may go out for delivery again.
  if (from === "delivery_failed" && (to === "out_for_delivery" || to === "in_transit")) return true
  return RANK[to] >= RANK[from]
}

/** The order's fulfillment status that follows from its outbound shipment. */
export function fulfillmentFor(status: ShipmentStatus): "unfulfilled" | "shipped" | "delivered" | "returned" | null {
  if (status === "delivered") return "delivered"
  if (status === "rto_delivered") return "returned"
  if (["picked_up", "in_transit", "out_for_delivery", "delivery_failed", "rto_initiated", "rto_in_transit"].includes(status)) return "shipped"
  return null
}
