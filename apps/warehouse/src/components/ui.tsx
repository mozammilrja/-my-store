import { clsx, type ClassValue } from "clsx"
import { Loader2 } from "lucide-react"
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { twMerge } from "tailwind-merge"
import { code128Widths } from "@/lib/code128"
import type { FulfilmentStatus } from "@/lib/types"

export const cn = (...v: ClassValue[]) => twMerge(clsx(v))

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "md" | "lg"; busy?: boolean }

export function Button({ variant = "primary", size = "md", busy, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "lg" ? "h-12 px-5 text-base" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-accent text-on-accent hover:bg-accent-hover",
        variant === "secondary" && "border border-line bg-panel text-ink hover:bg-panel-muted",
        variant === "danger" && "bg-bad text-white hover:opacity-90 dark:text-canvas",
        variant === "ghost" && "text-ink-2 hover:bg-panel-muted",
        className
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-panel border border-line bg-panel", className)}>
      {title || action ? (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-2">
      {children}
    </label>
  )
}

const control = "w-full rounded-control border border-line bg-panel px-3 text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"

export const Input = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) => <input {...rest} className={cn(control, "h-10", className)} />
export const Textarea = ({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...rest} className={cn(control, "min-h-20 py-2", className)} />
export const Select = ({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...rest} className={cn(control, "h-10", className)}>
    {children}
  </select>
)

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

const TONE: Record<FulfilmentStatus, string> = {
  assigned: "bg-info-bg text-info",
  picking_pending: "bg-warn-bg text-warn",
  picking: "bg-warn-bg text-warn",
  picked: "bg-warn-bg text-warn",
  qc_passed: "bg-accent-soft text-accent",
  packed: "bg-accent-soft text-accent",
  label_generated: "bg-accent-soft text-accent",
  ready_to_dispatch: "bg-ok-bg text-ok",
  manifested: "bg-ok-bg text-ok",
  handed_over: "bg-ok-bg text-ok",
  dispatched: "bg-panel-strong text-ink-2",
  rejected: "bg-bad-bg text-bad",
  cancelled: "bg-bad-bg text-bad",
}

export const StatusBadge = ({ status }: { status: FulfilmentStatus }) => (
  <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap", TONE[status])}>{STATUS_LABEL[status]}</span>
)

export const Spinner = ({ label = "Loading" }: { label?: string }) => (
  <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-ink-3">
    <Loader2 className="size-4 animate-spin" aria-hidden /> {label}
  </div>
)

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-panel border border-dashed border-line px-6 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="mt-1 text-sm text-ink-3">{children}</div> : null}
    </div>
  )
}

export function Notice({ tone = "bad", children }: { tone?: "bad" | "ok" | "warn" | "info"; children: ReactNode }) {
  const t = { bad: "bg-bad-bg text-bad", ok: "bg-ok-bg text-ok", warn: "bg-warn-bg text-warn", info: "bg-info-bg text-info" }[tone]
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={cn("rounded-control px-3 py-2 text-sm", t)}>
      {children}
    </div>
  )
}

/** A native modal dialog: focus trap, Escape and backdrop come from the browser. */
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-panel border border-line bg-panel p-0 text-ink shadow-xl backdrop:bg-black/50"
    >
      <div className="border-b border-line px-4 py-3 font-semibold">{title}</div>
      <div className="p-4">{open ? children : null}</div>
    </dialog>
  )
}

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
      <figcaption className="mt-1 font-mono text-sm tracking-wider">{value}</figcaption>
    </figure>
  )
}

export const formatTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "")

export const sinceMinutes = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))

export const humanAge = (iso: string) => {
  const m = sinceMinutes(iso)
  if (m < 60) return `${m} min`
  if (m < 48 * 60) return `${Math.floor(m / 60)} h ${m % 60} min`
  return `${Math.floor(m / 1440)} d`
}
