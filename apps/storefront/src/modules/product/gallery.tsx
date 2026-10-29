"use client"

import { cn } from "@/lib/utils"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

const imagesFor = (product: HttpTypes.StoreProduct, variantId?: string | null) => {
  const all = product.images ?? []
  const variant = variantId ? product.variants?.find((v) => v.id === variantId) : undefined
  if (!variant?.images?.length) return all
  const ids = new Set(variant.images.map((i) => i.id))
  const filtered = all.filter((i) => ids.has(i.id))
  return filtered.length ? filtered : all
}

/**
 * Product images, 4:5. Shows the images of the variant chosen with `?v_id=`;
 * the page is static, so the variant filter applies after hydration.
 */
export function Gallery({ product }: { product: HttpTypes.StoreProduct }) {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const variantId = mounted ? searchParams.get("v_id") : null

  const images = useMemo(() => {
    const list = imagesFor(product, variantId)
    if (list.length) return list
    return product.thumbnail ? [{ id: "thumbnail", url: product.thumbnail }] : []
  }, [product, variantId])

  const [active, setActive] = useState(0)
  useEffect(() => setActive(0), [variantId])
  const current = images[Math.min(active, images.length - 1)]

  if (!current) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-muted text-sm text-muted-foreground">
        No image available
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4" data-testid="product-gallery">
      <div className="relative aspect-[4/5] flex-1 overflow-hidden bg-muted">
        <Image
          src={current.url}
          alt={`${product.title}${images.length > 1 ? `, image ${active + 1} of ${images.length}` : ""}`}
          fill
          preload
          loading="eager"
          fetchPriority="high"
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto lg:w-20 lg:flex-col lg:overflow-visible" aria-label="Product images">
          {images.map((image, index) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1}`}
                aria-current={index === active ? "true" : undefined}
                className={cn(
                  "relative block aspect-[4/5] w-16 overflow-hidden bg-muted outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring lg:w-20",
                  index === active ? "ring-1 ring-foreground" : "opacity-70 hover:opacity-100"
                )}
              >
                <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
