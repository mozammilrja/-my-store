import { cn } from "@/lib/utils"

/** EVERWEAR primary editorial brand wordmark matching the Stitch design system. */
export function Wordmark({
  className,
  showSubtitle = true,
  showMark = false,
}: {
  className?: string
  showSubtitle?: boolean
  showMark?: boolean
}) {
  return (
    <div className={cn("flex flex-col group select-none text-left", className)}>
      <div className="flex items-center gap-2">
        {showMark && (
          <div className="w-2.5 h-2.5 rounded-full bg-secondary shrink-0" />
        )}
        <span className="font-headline-lg text-xl sm:text-2xl font-bold tracking-[-0.04em] text-foreground uppercase leading-none">
          EVERWEAR
        </span>
      </div>
      {showSubtitle && (
        <span className="mt-0.5 font-label-caps text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground leading-tight">
          Everyday Style. Your Way.
        </span>
      )}
    </div>
  )
}
