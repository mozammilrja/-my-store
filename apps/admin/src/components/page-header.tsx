import type { ReactNode } from "react"
import { LABEL_CAPS } from "@/lib/typography"
import { cn } from "@/lib/utils"

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
}: {
  /** Micro-label above the title, naming the area this page belongs to. */
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
}) => (
  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
    <div className="flex min-w-0 flex-col gap-0.5">
      {eyebrow ? <span className={cn(LABEL_CAPS, "text-primary")}>{eyebrow}</span> : null}
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="text-muted-foreground text-sm">{description}</p>
      ) : null}
    </div>
    {actions ? (
      <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
    ) : null}
  </div>
)
