import { cn } from "@/lib/utils"

/** The Everwear wordmark: heavy condensed caps with a volt slash. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-display-tight text-[1.65rem] leading-none", className)}>
      Everwear
      <span aria-hidden className="inline-block h-[0.7em] w-[0.32em] -skew-x-12 bg-accent" />
    </span>
  )
}
