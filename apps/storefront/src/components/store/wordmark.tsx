import { cn } from "@/lib/utils"

/** Everwear editorial wordmark from Stitch: bold architectural uppercase with clean letter-spaced subtitle. */
export function Wordmark({
  className,
  showSubtitle = true,
}: {
  className?: string
  showSubtitle?: boolean
}) {
  return (
    <div className={cn("flex flex-col group select-none text-left", className)}>
      <span className="font-headline-lg text-xl sm:text-2xl font-bold tracking-[-0.04em] text-foreground uppercase leading-none">
        EVERWEAR
      </span>
      {showSubtitle && (
        <span className="font-label-caps text-[9px] sm:text-[10px] tracking-[0.14em] text-muted-foreground uppercase mt-1 font-semibold leading-none">
          Everyday Style. Your Way.
        </span>
      )}
    </div>
  )
}
