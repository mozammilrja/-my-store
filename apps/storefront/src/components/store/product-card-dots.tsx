"use client"

import { cn } from "@/lib/utils"
import { useRef } from "react"

type ProductImageDotsProps = {
  count: number
  active: number
  onSelect: (index: number) => void
  /** Hovering a dot previews its image without committing to it. */
  onPreview: (index: number) => void
  className?: string
}

/**
 * Image pagination for a listing card.
 *
 * Clicking picks an image and holds it; hovering only previews. Arrow keys
 * walk the dots with a roving tabindex, so the gallery is operable without a
 * mouse. Clicks are stopped from reaching the card's link underneath.
 */
export function ProductImageDots({
  count,
  active,
  onSelect,
  onPreview,
  className,
}: ProductImageDotsProps) {
  const container = useRef<HTMLDivElement>(null)

  if (count < 2) return null

  const focusDot = (index: number) => {
    const next = ((index % count) + count) % count
    onSelect(next)
    container.current
      ?.querySelectorAll<HTMLButtonElement>("[role=tab]")
      [next]?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowLeft: active - 1,
      ArrowRight: active + 1,
      Home: 0,
      End: count - 1,
    }
    const next = keys[event.key]
    if (next === undefined) return
    event.preventDefault()
    event.stopPropagation()
    focusDot(next)
  }

  return (
    <div
      ref={container}
      className={cn(
        "absolute inset-x-0 bottom-2 z-[6] flex items-center justify-center gap-0.5",
        className
      )}
      role="tablist"
      aria-label="Product images"
      onKeyDown={onKeyDown}
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === active}
          aria-label={`Show image ${i + 1} of ${count}`}
          data-testid="product-card-dot"
          tabIndex={i === active ? 0 : -1}
          onMouseEnter={() => onPreview(i)}
          onFocus={() => onPreview(i)}
          onClick={(event) => {
            // Never let a dot navigate to the product page.
            event.preventDefault()
            event.stopPropagation()
            onSelect(i)
          }}
          className={cn(
            "flex size-2.5 cursor-pointer items-center justify-center rounded-full",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          )}
        >
          <span
            className={cn(
              "block size-1.5 rounded-full transition-colors duration-200 motion-reduce:transition-none",
              i === active ? "bg-[#ff3f6c]" : "bg-[#d4d5d9]"
            )}
          />
        </button>
      ))}
    </div>
  )
}
