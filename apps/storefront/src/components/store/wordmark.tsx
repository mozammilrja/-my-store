import { cn } from "@/lib/utils"

/** The Everwear wordmark: display serif name beside a solid cobalt square. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-2 font-display text-2xl leading-none font-medium tracking-tight",
        className
      )}
    >
      <span aria-hidden className="inline-block size-2.5 translate-y-[-0.05em] bg-primary" />
      Everwear
    </span>
  )
}
