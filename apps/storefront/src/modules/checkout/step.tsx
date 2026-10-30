import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** A numbered checkout section: open (form), done (summary + Edit) or upcoming. */
export function Step({
  number,
  title,
  state,
  editHref,
  children,
  testId,
}: {
  number: number
  title: string
  state: "open" | "done" | "upcoming"
  editHref?: string
  children?: React.ReactNode
  testId?: string
}) {
  return (
    <section className={cn("border-b pb-8", state === "upcoming" && "opacity-50")} aria-labelledby={`step-${number}`} data-testid={testId}>
      <div className="flex items-center justify-between gap-4 py-6">
        <h2 id={`step-${number}`} className="flex items-center gap-3 font-headline-sm text-2xl font-normal tracking-tight">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-sm font-bold",
              state === "done" ? "bg-foreground text-background" : "border border-foreground"
            )}
            aria-hidden
          >
            {state === "done" ? <CheckIcon className="size-4" /> : number}
          </span>
          {title}
        </h2>
        {state === "done" && editHref && (
          <LocalizedClientLink href={editHref} className="text-sm font-semibold underline underline-offset-4">
            Edit<span className="sr-only"> {title.toLowerCase()}</span>
          </LocalizedClientLink>
        )}
      </div>
      {state !== "upcoming" && children}
    </section>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive-foreground" data-testid="checkout-error">
      {message}
    </p>
  )
}
