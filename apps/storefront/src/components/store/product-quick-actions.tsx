"use client"

import { cn } from "@/lib/utils"
import type { ProductCardModel } from "@lib/product/card-model"
import { useParams, useRouter } from "next/navigation"
import { Fragment } from "react"

type ProductQuickActionsProps = {
  model: ProductCardModel
  selectedSize: string | null
  onSelectSize: (label: string) => void
  className?: string
}

/**
 * The "Sizes: S, M, L" line in a card's hover panel, written as plain text
 * the way Myntra does it rather than as boxed chips.
 *
 * Only sizes that can be bought are listed. Each one is still a button:
 * clicking it opens the product page with that size already selected
 * (`?size=`, plus `v_id` when the size maps to exactly one variant). The line
 * never wraps; on a narrow card it ends in an ellipsis.
 */
export function ProductQuickActions({
  model,
  selectedSize,
  onSelectSize,
  className,
}: ProductQuickActionsProps) {
  const params = useParams()
  const router = useRouter()
  const countryCode = (params?.countryCode as string | undefined) ?? "in"

  const available = model.sizes.filter((s) => s.inStock)

  const open = (label: string) => {
    const size = available.find((s) => s.label === label)
    if (!size) return
    onSelectSize(label)
    const query = new URLSearchParams({ size: label })
    if (!size.needsMoreChoice && size.variantId)
      query.set("v_id", size.variantId)
    router.push(`/${countryCode}${model.href}?${query.toString()}`)
  }

  if (!available.length) {
    return (
      <div
        className={cn(
          "cursor-default truncate text-[14px] text-muted-foreground",
          className
        )}
        data-testid="product-card-sizes"
      >
        {model.sizes.length
          ? "Out of stock"
          : model.inStock
          ? "One size"
          : "Out of stock"}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "min-w-0 cursor-default truncate whitespace-nowrap text-[14px] text-muted-foreground",
        className
      )}
      data-testid="product-card-sizes"
    >
      <span id={`sz-${model.id}`}>Sizes: </span>
      <span role="group" aria-labelledby={`sz-${model.id}`}>
        {available.map((size, i) => (
          <Fragment key={size.label}>
            {i > 0 && ", "}
            <button
              type="button"
              data-testid="product-card-size"
              data-available="true"
              aria-pressed={selectedSize === size.label}
              title={`Choose size ${size.label}`}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                open(size.label)
              }}
              className={cn(
                "inline cursor-pointer p-0 text-muted-foreground",
                "hover:text-foreground hover:underline focus-visible:underline focus-visible:outline-none",
                selectedSize === size.label && "font-semibold text-foreground"
              )}
            >
              {size.label}
            </button>
          </Fragment>
        ))}
      </span>
    </div>
  )
}
