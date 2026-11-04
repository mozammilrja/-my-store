"use client"

import { cn } from "@/lib/utils"
import type { ProductCardSize } from "@lib/product/card-model"
import { useRef } from "react"

type ProductSizeSelectorProps = {
  sizes: ProductCardSize[]
  selected: string | null
  onSelect: (label: string) => void
  /** Label of the option axis, e.g. "Size", used for the group name. */
  optionTitle: string
  disabled?: boolean
  className?: string
}

/**
 * The size row a card reveals on hover.
 *
 * Values and their availability come from the product's real variants, so a
 * size that is out of stock is disabled rather than hidden, and carries a
 * not-allowed cursor. Arrow keys move between sizes with a roving tabindex
 * and skip nothing, so a keyboard user can reach a sold-out size and hear
 * that it is unavailable.
 */
export function ProductSizeSelector({
  sizes,
  selected,
  onSelect,
  optionTitle,
  disabled = false,
  className,
}: ProductSizeSelectorProps) {
  const container = useRef<HTMLDivElement>(null)

  if (!sizes.length) return null

  const move = (from: number, step: number) => {
    const next = (((from + step) % sizes.length) + sizes.length) % sizes.length
    container.current
      ?.querySelectorAll<HTMLButtonElement>("[data-size-chip]")
      [next]?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
    const step = steps[event.key]
    if (step === undefined) return
    event.preventDefault()
    event.stopPropagation()
    move(index, step)
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span
        className="cursor-default text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
        id={`sizes-label-${optionTitle}`}
      >
        {optionTitle}
      </span>
      <div
        ref={container}
        role="group"
        aria-labelledby={`sizes-label-${optionTitle}`}
        className="flex flex-wrap items-center gap-1"
        data-testid="product-card-sizes"
      >
        {sizes.map((size, i) => {
          const unavailable = !size.inStock
          const isSelected = selected === size.label
          return (
            <button
              key={size.label}
              type="button"
              data-size-chip
              data-testid="product-card-size"
              data-available={size.inStock ? "true" : "false"}
              aria-pressed={isSelected}
              aria-disabled={unavailable || disabled}
              disabled={unavailable || disabled}
              tabIndex={i === 0 ? 0 : -1}
              title={unavailable ? `${size.label} is out of stock` : undefined}
              onKeyDown={(event) => onKeyDown(event, i)}
              onClick={(event) => {
                // Picking a size must never open the product page.
                event.preventDefault()
                event.stopPropagation()
                if (unavailable || disabled) return
                onSelect(size.label)
              }}
              className={cn(
                "min-w-7 border px-1.5 py-0.5 text-[11px] font-semibold uppercase leading-tight",
                "transition-colors duration-150 motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                unavailable || disabled
                  ? "cursor-not-allowed border-border/60 text-muted-foreground/45 line-through"
                  : isSelected
                  ? "cursor-pointer border-foreground bg-foreground text-background"
                  : "cursor-pointer border-border bg-surface-container-lowest text-foreground hover:border-foreground"
              )}
            >
              {size.label}
              {unavailable && <span className="sr-only"> (out of stock)</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
