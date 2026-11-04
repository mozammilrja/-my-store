"use client"

import { useCallback, useEffect, useState } from "react"

type Options = {
  /** Number of images in the card's gallery. */
  imageCount: number
}

/** First slide comes quickly so the hover feels responsive, then a steady pace. */
const FIRST_ADVANCE_MS = 700
const ADVANCE_MS = 1500

/**
 * Hover, autoplay and selection state for one listing card.
 *
 * Myntra-style: while the pointer is over the card the gallery slides through
 * its images on a timer, and leaving the card returns it to the first image.
 * Clicking a dot "locks" that image: autoplay stops and the card returns to
 * it instead of the first. Every card owns its own instance, so hovering one
 * card re-renders only that card.
 */
export function useProductCardInteractions({ imageCount }: Options) {
  const [active, setActive] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  /** Index the shopper committed to with a dot, or null while untouched. */
  const [locked, setLocked] = useState<number | null>(null)

  useEffect(() => {
    if (!hovered || imageCount < 2 || locked !== null) return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return

    let timer: ReturnType<typeof setTimeout>
    const tick = (delay: number) => {
      timer = setTimeout(() => {
        setActive((current) => (current + 1) % imageCount)
        tick(ADVANCE_MS)
      }, delay)
    }
    tick(FIRST_ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [hovered, imageCount, locked])

  /** Hovering a dot, or a touch swipe: show that image without locking it. */
  const previewIndex = useCallback(
    (index: number) => {
      if (imageCount < 1) return
      setActive(Math.min(Math.max(index, 0), imageCount - 1))
    },
    [imageCount]
  )

  /** A dot was clicked: hold this image and stop autoplay. */
  const selectIndex = useCallback(
    (index: number) => {
      if (imageCount < 1) return
      const next = Math.min(Math.max(index, 0), imageCount - 1)
      setLocked(next)
      setActive(next)
    },
    [imageCount]
  )

  const onCardEnter = useCallback(() => setHovered(true), [])

  const onCardLeave = useCallback(() => {
    setHovered(false)
    setActive(locked ?? 0)
  }, [locked])

  const onCardFocus = useCallback(() => setFocused(true), [])
  const onCardBlur = useCallback(() => setFocused(false), [])

  return {
    active,
    hovered,
    focused,
    /** Dots show for either input, so nothing is hover-only. */
    showControls: hovered || focused,
    selectedSize,
    setSelectedSize,
    previewIndex,
    selectIndex,
    onCardEnter,
    onCardLeave,
    onCardFocus,
    onCardBlur,
  }
}
