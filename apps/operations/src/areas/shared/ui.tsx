import { clsx, type ClassValue } from "clsx"
import { Inbox, Loader2 } from "lucide-react"
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { extendTailwindMerge } from "tailwind-merge"

/*
 * The admin's type scale (tailwind.config.js fontSize) as a size group, so
 * merging `text-body` with a colour like `text-muted` keeps both: plain
 * tailwind-merge reads an unknown `text-*` as a colour and drops one.
 */
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "title", "kpi", "kpi-sm", "heading", "subheading", "body-lg", "body", "num", "label-lg", "meta", "label", "micro", "caption", "icon-sm", "icon", "icon-md", "icon-lg", "icon-xl", "icon-2xl", "figure"] }],
    },
  },
})
export const cn = (...v: ClassValue[]) => merge(clsx(v))

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "md" | "lg"; busy?: boolean }

export function Button({ variant = "primary", size = "md", busy, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        // The admin's button (components/ui/button.jsx): same radius, fills and focus ring.
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest disabled:cursor-not-allowed disabled:opacity-50",
        // Phones get a 44px touch target; from sm up the original 40px.
        size === "lg" ? "h-12 px-5 text-base" : "h-11 px-4 text-sm sm:h-10",
        variant === "primary" && "bg-primary-container text-on-accent shadow-xs hover:bg-primary-container-hover",
        variant === "secondary" && "border border-subtle bg-surface-container-lowest text-primary shadow-xs hover:border-strong hover:bg-surface-subtle",
        variant === "danger" && "bg-status-danger-solid text-on-accent shadow-xs hover:bg-status-danger-solid/90",
        variant === "ghost" && "text-muted hover:bg-surface-subtle hover:text-primary",
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
    // The admin's SectionCard: card surface, header row with a rule under it.
    <section className={cn("min-w-0 overflow-hidden rounded-xl border border-subtle bg-surface-container-lowest text-primary shadow-xs", className)}>
      {title || action ? (
        <header className="flex items-center justify-between gap-space-md border-b border-subtle p-space-md">
          <h2 className="text-subheading text-primary">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className="p-space-md">{children}</div>
    </section>
  )
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-label-lg text-primary">
      {children}
    </label>
  )
}

// 16px text below sm: iOS Safari zooms the page into any field with smaller text.
// The admin's field (components/ui/input.jsx), 16px below sm.
const control = "w-full rounded-lg border border-strong bg-surface-container-lowest px-3 text-base text-primary shadow-xs transition-colors placeholder:text-faint hover:border-emphasis focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:text-body"

export const Input = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) => <input {...rest} className={cn(control, "h-11 sm:h-10", className)} />
export const Textarea = ({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...rest} className={cn(control, "min-h-20 py-2", className)} />
export const Select = ({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...rest} className={cn(control, "h-11 sm:h-10", className)}>
    {children}
  </select>
)

export const Spinner = ({ label = "Loading" }: { label?: string }) => (
  <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3 p-10 text-center">
    <span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
    <span className="text-meta text-muted">{label}</span>
  </div>
)

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    // The admin's EmptyState (components/shared/FeedbackAndOverlays.jsx).
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-strong bg-surface-subtle/60 p-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl border border-subtle bg-surface-container-lowest text-faint">
        <Inbox className="size-5" aria-hidden />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-body font-semibold text-primary">{title}</p>
        {children ? <div className="text-meta leading-relaxed text-muted">{children}</div> : null}
      </div>
    </div>
  )
}

export function Notice({ tone = "bad", children }: { tone?: "bad" | "ok" | "warn" | "info"; children: ReactNode }) {
  const t = {
    bad: "border-status-danger/25 bg-status-danger-bg text-danger",
    ok: "border-status-success/25 bg-status-success-bg text-success",
    warn: "border-status-warning/25 bg-status-warning-bg text-warning",
    info: "border-status-info/25 bg-status-info-bg text-info",
  }[tone]
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-body", t)}>
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
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-xl border border-subtle bg-surface-container-lowest p-0 text-primary shadow-xl backdrop:bg-scrim/50"
    >
      <div className="border-b border-subtle p-space-md text-subheading text-primary">{title}</div>
      <div className="p-space-md">{open ? children : null}</div>
    </dialog>
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
