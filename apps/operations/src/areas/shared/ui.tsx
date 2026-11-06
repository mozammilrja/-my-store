import { clsx, type ClassValue } from "clsx"
import { Loader2 } from "lucide-react"
import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { Alert, Button as AdminButton, EmptyState, Input as AdminInput, LoadingState, SectionCard, Select as AdminSelect, Textarea as AdminTextarea } from "@/components/ui"
import { Dialog as AdminDialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

/*
 * The workspaces' UI kit is the admin's: every component here renders the
 * admin component from src/components/ui (and components/shared), so
 * Warehouse, Delivery and Seller Hub are drawn by the same library as the
 * admin. These wrappers only keep the props the workspace screens were
 * written against (variant names, `busy`, `onClose`, `tone`).
 */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "md" | "lg"; busy?: boolean }
const BUTTON_VARIANT = { primary: "default", secondary: "outline", danger: "destructive", ghost: "ghost" } as const

export function Button({ variant = "primary", size = "md", busy, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <AdminButton
      {...rest}
      type={type}
      variant={BUTTON_VARIANT[variant]}
      size={size === "lg" ? "lg" : "default"}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={className}
    >
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </AdminButton>
  )
}

/** The admin's SectionCard. An empty state inside it drops its own frame. */
export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <SectionCard title={title} action={action} className={className} contentClassName="[&>.area-empty]:border-0 [&>.area-empty]:bg-transparent [&>.area-empty]:p-6">
      {children}
    </SectionCard>
  )
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-label-lg text-primary">
      {children}
    </label>
  )
}

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => <AdminInput {...props} />
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => <AdminTextarea {...props} />
/** The admin's Select: the native API (option children, event-shaped onChange) in the admin's popover. */
export const Select = ({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => <AdminSelect {...props}>{children}</AdminSelect>

export const Spinner = ({ label = "Loading" }: { label?: string }) => <LoadingState message={label} />

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <EmptyState icon="inbox" title={title} description={children} className="area-empty" />
}

/** The admin's Alert. Only a problem is announced as an alert; the other tones are status. */
export function Notice({ tone = "bad", children }: { tone?: "bad" | "ok" | "warn" | "info"; children: ReactNode }) {
  const variant = { bad: "destructive", ok: "success", warn: "warning", info: "info" }[tone]
  return (
    <Alert variant={variant} role={tone === "bad" ? "alert" : "status"}>
      {children}
    </Alert>
  )
}

/** The admin's Dialog: focus moves in, Escape and the backdrop close it. */
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const id = useId()
  return (
    <AdminDialog open={open} onOpenChange={(next: boolean) => (next ? null : onClose())} labelledBy={id}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle id={id}>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="pb-space-lg">{children}</DialogBody>
      </DialogContent>
    </AdminDialog>
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

/**
 * A page's title, as the admin's PageHeader draws it: the workspace as a
 * small kicker, then the title. Description and actions sit beside it in the
 * page's own markup.
 */
export function PageTitle({ kicker, mono, children }: { kicker: string; mono?: boolean; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-caption uppercase tracking-wider text-faint">{kicker}</span>
      <h1 className={cn("text-title font-semibold tracking-tight text-primary", mono && "font-mono")}>{children}</h1>
    </div>
  )
}

/** The admin's PageContainer rhythm for a page's top level. */
export const PAGE = "flex w-full min-w-0 flex-col gap-space-lg pb-8"
