import { Badge } from "@/components/reui/badge"
import { formatStatus } from "@/lib/format"

type Tone = "success" | "warning" | "destructive" | "info" | "neutral"

/** Every status the API can report, on orders (payment, fulfillment, state) and products. */
const TONES: Record<string, Tone> = {
  // payment
  paid: "success",
  awaiting: "warning",
  refunded: "destructive",
  // fulfillment
  delivered: "success",
  shipped: "info",
  unfulfilled: "warning",
  returned: "destructive",
  // order state
  completed: "success",
  pending: "warning",
  canceled: "destructive",
  // product state
  published: "success",
  draft: "neutral",
}

const VARIANTS = {
  success: "success-light",
  warning: "warning-light",
  destructive: "destructive-light",
  info: "info-light",
  neutral: "outline",
} as const

export const StatusBadge = ({ status }: { status?: string | null }) => {
  const tone = TONES[status ?? ""] ?? "neutral"

  return <Badge variant={VARIANTS[tone]}>{formatStatus(status)}</Badge>
}
