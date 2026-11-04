import type { Order } from "@lib/api/types"

export type ProgressStep = { key: string; label: string; detail?: string; state: "done" | "current" | "upcoming" }

const fmt = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : undefined

/**
 * Where an order is, from its real status fields only: placed → packed →
 * shipped → delivered. Nothing is guessed: a step is "done" only when the
 * order or its shipment says so.
 */
export function orderProgress(order: Order): ProgressStep[] {
  if (order.status === "canceled") {
    return [
      { key: "placed", label: "Order placed", detail: fmt(order.createdAt), state: "done" },
      { key: "canceled", label: "Canceled", state: "current" },
    ]
  }
  const shipped = order.fulfillmentStatus === "shipped" || order.fulfillmentStatus === "delivered" || !!order.shipment
  const delivered = order.fulfillmentStatus === "delivered"
  const steps: { key: string; label: string; detail?: string; done: boolean }[] = [
    { key: "placed", label: "Order placed", detail: fmt(order.createdAt), done: true },
    {
      key: "packed",
      label: "Packed",
      detail: order.shipment?.pickupScheduledAt ? `Pickup ${fmt(order.shipment.pickupScheduledAt)}` : undefined,
      done: shipped,
    },
    {
      key: "shipped",
      label: "Shipped",
      detail: order.shipment ? `${order.shipment.carrier} · AWB ${order.shipment.awb}` : undefined,
      done: shipped && order.fulfillmentStatus !== "unfulfilled",
    },
    {
      key: "delivered",
      label: "Delivered",
      detail: !delivered && order.shipment?.estimatedDelivery ? `Expected ${fmt(order.shipment.estimatedDelivery)}` : undefined,
      done: delivered,
    },
  ]
  const firstOpen = steps.findIndex((s) => !s.done)
  return steps.map((s, i) => ({
    key: s.key,
    label: s.label,
    detail: s.detail,
    state: s.done ? "done" : i === firstOpen ? "current" : "upcoming",
  }))
}

export const paymentLabel = (order: Order) =>
  order.paymentMethod === "cod"
    ? order.paymentStatus === "paid"
      ? "Paid on delivery"
      : "Cash on delivery: pay when it arrives"
    : order.paymentStatus === "paid"
      ? "Paid online"
      : order.paymentStatus === "refunded"
        ? "Refunded"
        : "Online payment pending"
