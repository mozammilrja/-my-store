import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

/**
 * One header shortcut (Concierge, Wishlist, Bag): icon over a label, Myntra
 * style. Every item uses the same icon box, size and label, so they line up,
 * and the count badge is pinned to the icon's corner instead of the label.
 */
export function HeaderAction({
  href,
  icon: IconComponent,
  label,
  ariaLabel,
  count,
  className,
  testId,
  countTestId,
}: {
  href: string
  icon: LucideIcon
  label: string
  ariaLabel?: string
  count?: number
  className?: string
  testId?: string
  countTestId?: string
}): ReactNode {
  return (
    <LocalizedClientLink
      href={href}
      aria-label={ariaLabel ?? label}
      data-testid={testId}
      className={
        "flex min-w-14 flex-col items-center gap-1 px-1 py-1 text-on-surface-variant transition-colors hover:text-on-surface " +
        (className ?? "")
      }
    >
      <span className="relative flex size-6 items-center justify-center">
        <IconComponent aria-hidden className="size-5" strokeWidth={1.75} />
        {count !== undefined && count > 0 && (
          <span
            className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold leading-none text-on-secondary"
            data-testid={countTestId}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      <span className="hidden text-[11px] font-bold uppercase leading-none tracking-wide lg:block">
        {label}
      </span>
    </LocalizedClientLink>
  )
}
