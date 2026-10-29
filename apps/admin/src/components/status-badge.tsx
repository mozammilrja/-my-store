import { Badge } from "@/components/reui/badge"
import { formatStatus } from "@/lib/format"

type Tone = "success" | "warning" | "destructive" | "info" | "neutral"

const TONES: Record<string, Tone> = {
  captured: "success",
  authorized: "success",
  completed: "success",
  fulfilled: "success",
  delivered: "success",
  shipped: "info",
  published: "success",
  partially_fulfilled: "info",
  partially_shipped: "info",
  partially_captured: "info",
  partially_refunded: "warning",
  not_paid: "warning",
  awaiting: "warning",
  requires_action: "warning",
  not_fulfilled: "warning",
  pending: "warning",
  draft: "neutral",
  proposed: "info",
  refunded: "destructive",
  canceled: "destructive",
  rejected: "destructive",
  archived: "neutral",
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
