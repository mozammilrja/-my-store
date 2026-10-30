import { cn } from "@/lib/utils"

import { LogoMark } from "./logo-mark"

/** Everwear editorial wordmark from Stitch: monogram tile beside bold architectural uppercase with a clean letter-spaced subtitle. */
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
    <div className={cn("flex items-center gap-2.5 group select-none text-left", className)}>
      {showMark && (
        <LogoMark className="size-9 sm:size-10 shrink-0 text-foreground transition-transform duration-300 group-hover:-rotate-3" />
      )}
      <div className="flex flex-col">
        <span className="font-headline-lg text-xl sm:text-2xl font-bold tracking-[-0.04em] text-foreground uppercase leading-none">
          EVERWEAR
        </span>
        {showSubtitle && (
          <span className="font-label-caps text-[9px] sm:text-[10px] tracking-[0.14em] text-muted-foreground uppercase mt-1 font-semibold leading-none">
            Everyday Style. Your Way.
          </span>
        )}
      </div>
    </div>
  )
}
