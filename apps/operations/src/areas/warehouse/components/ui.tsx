import type { ReactNode } from "react"
import { Badge } from "@/components/ui"
import { cn } from "@/areas/shared/ui"
import { code128Widths } from "@/areas/warehouse/lib/code128"
import type { FulfilmentStatus } from "@/areas/warehouse/lib/types"

/* The shared kit (buttons, fields, dialogs) plus the floor's status badge and barcode. */
export * from "@/areas/shared/ui"

export const STATUS_LABEL: Record<FulfilmentStatus, string> = {
  assigned: "Incoming",
  picking_pending: "To pick",
  picking: "Picking",
  picked: "To inspect",
  qc_passed: "To pack",
  packed: "To label",
  label_generated: "Label to check",
  ready_to_dispatch: "Ready to dispatch",
  manifested: "On manifest",
  handed_over: "Handed over",
  dispatched: "Dispatched",
  rejected: "Declined",
  cancelled: "Cancelled",
}

/** The admin's Badge variants for each floor stage. */
const TONE: Record<FulfilmentStatus, "info" | "warning" | "vip" | "success" | "secondary" | "destructive"> = {
  assigned: "info",
  picking_pending: "warning",
  picking: "warning",
  picked: "warning",
  qc_passed: "vip",
  packed: "vip",
  label_generated: "vip",
  ready_to_dispatch: "success",
  manifested: "success",
  handed_over: "success",
  dispatched: "secondary",
  rejected: "destructive",
  cancelled: "destructive",
}

export const StatusBadge = ({ status }: { status: FulfilmentStatus }) => (
  <Badge variant={TONE[status]} className="whitespace-nowrap">
    {STATUS_LABEL[status]}
  </Badge>
)

/** Code 128 barcode as crisp SVG bars, with the human-readable text below. */
export function Barcode({ value, height = 56, module = 2, className }: { value: string; height?: number; module?: number; className?: string }) {
  const widths = code128Widths(value)
  const quiet = 10
  const total = widths.reduce((a, b) => a + b, 0) + quiet * 2
  let x = quiet
  const bars: ReactNode[] = []
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y={0} width={w} height={height / module} />)
    x += w
  })
  return (
    <figure className={cn("inline-flex flex-col items-center", className)}>
      <svg role="img" aria-label={`Barcode ${value}`} width={total * module} height={height} viewBox={`0 0 ${total} ${height / module}`} shapeRendering="crispEdges" className="bg-white fill-black">
        {bars}
      </svg>
      <figcaption className="mt-1 font-mono text-body tracking-wider">{value}</figcaption>
    </figure>
  )
}
