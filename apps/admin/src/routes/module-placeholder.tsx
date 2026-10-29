import { ArrowRight, type LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/reui/badge"
import { Frame, FramePanel } from "@/components/reui/frame"
import { Button } from "@/components/ui/button"
import { LABEL_CAPS } from "@/lib/typography"
import { cn } from "@/lib/utils"

export type ModulePlan = {
  eyebrow: string
  title: string
  description: string
  /** What this module will do once its endpoints exist. */
  capabilities: string[]
  /** Where to go in the meantime, if anything today comes close. */
  nearest?: { to: string; label: string }
  icon: LucideIcon
}

/**
 * A module the design calls for that the API cannot answer yet. It states that
 * plainly rather than showing controls that would do nothing: the nav keeps the
 * shape of the design, and nothing here pretends to work.
 */
export const ModulePlaceholder = ({ plan }: { plan: ModulePlan }) => (
  <>
    <PageHeader
      eyebrow={plan.eyebrow}
      title={plan.title}
      description={plan.description}
      actions={
        <Badge variant="warning-light" radius="full" className={cn(LABEL_CAPS, "px-2")}>
          Not built yet
        </Badge>
      }
    />
    <Frame>
      <FramePanel>
        <div className="flex flex-col items-center gap-5 py-10 text-center">
          <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
            <plan.icon className="size-6" aria-hidden="true" />
          </div>
          <div className="flex max-w-md flex-col gap-2">
            <p className="text-sm font-medium">
              This screen has no data behind it yet
            </p>
            <p className="text-muted-foreground text-sm">
              The Everwear API exposes no endpoints for {plan.title.toLowerCase()}, so
              there is nothing real to show. Building it means a data model, routes and
              tests in the API before the screen can do its job.
            </p>
          </div>

          <div className="flex w-full max-w-md flex-col gap-2 text-left">
            <span className={cn(LABEL_CAPS, "text-muted-foreground")}>
              What it will do
            </span>
            <ul className="flex flex-col gap-1.5">
              {plan.capabilities.map((capability) => (
                <li key={capability} className="text-muted-foreground flex gap-2 text-sm">
                  <span aria-hidden="true" className="bg-border mt-2 size-1 shrink-0 rounded-full" />
                  {capability}
                </li>
              ))}
            </ul>
          </div>

          {plan.nearest ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={plan.nearest.to}>
                {plan.nearest.label}
                <ArrowRight />
              </Link>
            </Button>
          ) : null}
        </div>
      </FramePanel>
    </Frame>
  </>
)
