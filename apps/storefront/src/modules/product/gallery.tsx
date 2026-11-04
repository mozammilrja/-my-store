"use client"

import type { Product } from "@lib/api/types"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useMemo } from "react"

const imagesFor = (product: Product, variantId?: string | null) => {
  const variant = variantId ? product.variants.find((v) => v.id === variantId) : undefined
  return variant?.images.length ? variant.images : product.images
}

/**
 * Myntra-style gallery: a 2-column image grid that scrolls with the page.
 * The buy column stays sticky beside it on desktop.
 */
export function Gallery({ product }: { product: Product }) {
  const searchParams = useSearchParams()
  const variantId = searchParams.get("v_id")

  const images = useMemo(() => {
    const list = imagesFor(product, variantId)
    return list.length ? list : product.thumbnail ? [product.thumbnail] : []
  }, [product, variantId])

  if (!images.length) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center bg-muted text-sm text-muted-foreground">
        No image available
      </div>
    )
  }

  return (
    <ul
      className="grid grid-cols-2 gap-1 sm:gap-2"
      aria-label="Product images"
      data-testid="product-gallery"
    >
      {images.map((image, index) => (
        <li
          key={`${image}-${index}`}
          className="relative aspect-[3/4] overflow-hidden bg-surface-container-low"
        >
          <Image
            src={image}
            alt={`${product.title}, view ${index + 1} of ${images.length}`}
            fill
            preload={index < 2}
            loading={index < 2 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "auto"}
            sizes="(min-width: 1024px) 28vw, 50vw"
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02]"
          />
        </li>
      ))}
    </ul>
  )
}
