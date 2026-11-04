"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useRef } from "react"

type ProductCardGalleryProps = {
  images: string[]
  title: string
  href: string
  sizes: string
  priority?: boolean
  /** Image on show. Owned by the card so the dots and the hover agree. */
  active: number
  /** The card is hovered or focused: load every slide so autoplay never shows a blank. */
  warm?: boolean
  /** Swipe on touch screens. */
  onActiveChange: (index: number) => void
}

/**
 * The image area of a listing card.
 *
 * Presentation only: the index lives in the card, so autoplay, hovering a dot and clicking a dot all drive the same state. Every slide is
 * mounted on one sliding track, and every slide is fetched once the card is
 * hovered, so autoplay never lands on an image that has not loaded.
 */
export function ProductCardGallery({
  images,
  title,
  href,
  sizes,
  priority = false,
  active,
  warm = false,
  onActiveChange,
}: ProductCardGalleryProps) {
  const touchStartX = useRef<number | null>(null)
  const didSwipe = useRef(false)

  if (!images.length) {
    return (
      <div className="flex h-full cursor-default items-center justify-center text-xs text-muted-foreground">
        No image
      </div>
    )
  }

  const current = Math.min(Math.max(active, 0), images.length - 1)

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
    didSwipe.current = false
  }

  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current == null || images.length < 2) return
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current
    const delta = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 28) return
    // A swipe must not also follow the link under it.
    didSwipe.current = true
    const next = delta < 0 ? current + 1 : current - 1
    onActiveChange(((next % images.length) + images.length) % images.length)
  }

  return (
    <div
      className="absolute inset-0 z-[1]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      data-testid="product-card-gallery"
    >
      <LocalizedClientLink
        href={href}
        className="absolute inset-0 block cursor-pointer"
        tabIndex={-1}
        aria-hidden="true"
        onClick={(event) => {
          if (didSwipe.current) {
            event.preventDefault()
            didSwipe.current = false
          }
        }}
      >
        {/* A horizontal track that slides, the way Myntra's card carousel does. */}
        <div
          className="flex h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {images.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="relative h-full w-full shrink-0"
            >
              <Image
                src={src}
                alt=""
                fill
                sizes={sizes}
                quality={75}
                loading={(priority && i === 0) || warm ? "eager" : "lazy"}
                className="object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </LocalizedClientLink>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {title}, image {current + 1} of {images.length}
      </span>
    </div>
  )
}
