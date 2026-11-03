"use client"

import { cn } from "@/lib/utils"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useCallback, useRef, useState } from "react"

type ProductCardGalleryProps = {
  images: string[]
  title: string
  href: string
  sizes: string
  priority?: boolean
}

/**
 * Myntra-style listing gallery:
 * - Desktop: horizontal hover zones switch images
 * - Mobile: swipe
 * - Dots: clickable, sync with active image, do not navigate
 * - Mouse leave resets to primary image
 * - State is local to each card instance
 */
export function ProductCardGallery({
  images,
  title,
  href,
  sizes,
  priority = false,
}: ProductCardGalleryProps) {
  const slides = images.length ? images : []
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const didSwipe = useRef(false)
  const active = slides.length ? Math.min(index, slides.length - 1) : 0

  const goTo = useCallback(
    (next: number) => {
      if (!slides.length) return
      setIndex(((next % slides.length) + slides.length) % slides.length)
    },
    [slides.length]
  )

  const onMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (slides.length < 2) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width - 0.001)
    setIndex(Math.floor((x / rect.width) * slides.length))
  }

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
    didSwipe.current = false
  }

  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current == null || slides.length < 2) return
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current
    const delta = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 28) return
    didSwipe.current = true
    goTo(delta < 0 ? active + 1 : active - 1)
  }

  if (!slides.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        No image
      </div>
    )
  }

  return (
    <div
      className="absolute inset-0 z-[1]"
      onMouseMove={onMouseMove}
      onMouseLeave={() => setIndex(0)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      data-testid="product-card-gallery"
    >
      <LocalizedClientLink
        href={href}
        className="absolute inset-0 block"
        tabIndex={-1}
        aria-label={title}
        onClick={(event) => {
          if (didSwipe.current) {
            event.preventDefault()
            didSwipe.current = false
          }
        }}
      >
        {slides.map((src, i) => (
          <Image
            key={`${src}-${i}`}
            src={src}
            alt={i === active ? title : ""}
            fill
            sizes={sizes}
            loading={priority && i === 0 ? "eager" : "lazy"}
            className={cn(
              "object-cover transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              i === active ? "opacity-100" : "opacity-0"
            )}
            draggable={false}
          />
        ))}
      </LocalizedClientLink>

      {slides.length > 1 && (
        <div
          className="absolute inset-x-0 bottom-2 z-[3] flex items-center justify-center gap-1.5"
          role="tablist"
          aria-label="Product images"
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show image ${i + 1} of ${slides.length}`}
              data-testid="product-card-dot"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setIndex(i)
              }}
              className={cn(
                "relative z-[4] flex size-4 items-center justify-center rounded-full",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              )}
            >
              <span
                className={cn(
                  "block size-1.5 rounded-full transition-colors duration-200 motion-reduce:transition-none",
                  i === active ? "bg-secondary" : "bg-background/90 ring-1 ring-foreground/20"
                )}
              />
            </button>
          ))}
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        Image {active + 1} of {slides.length}
      </span>
    </div>
  )
}
