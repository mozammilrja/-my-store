"use client"

import { Badge } from "@/components/reui/badge"
import { formatMoney } from "@/components/store/money"
import { cn } from "@/lib/utils"
import { indexedCurrency, priceAttribute } from "@lib/search-client"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { Hit } from "instantsearch.js"
import Image from "next/image"

export type ProductHit = Hit<{
  title: string | null
  handle: string | null
  thumbnail: string | null
  labels?: string[]
  [key: string]: unknown
}>

const amount = (value: unknown) => (typeof value === "number" ? value : null)

/** Product tile for search-index results; prices come from the index fields for the region currency. */
export function HitCard({ hit, currencyCode, priority }: { hit: ProductHit; currencyCode: string; priority?: boolean }) {
  const currency = indexedCurrency(currencyCode)
  const min = amount(hit[priceAttribute("min_price", currencyCode)])
  const max = amount(hit[priceAttribute("max_price", currencyCode)])
  const original = amount(hit[priceAttribute("original_price", currencyCode)])
  const onSale = hit[priceAttribute("on_sale", currencyCode)] === true
  const isNew = hit.labels?.includes("new-arrival")

  return (
    <LocalizedClientLink href={`/products/${hit.handle}`} className="group flex flex-col gap-3" data-testid="product-wrapper">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {hit.thumbnail && (
          <Image
            src={hit.thumbnail}
            alt={hit.title ?? ""}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 22vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        )}
        {(onSale || isNew) && (
          <div className="absolute top-3 left-3 flex gap-1.5">
            {onSale && <Badge variant="destructive">Sale</Badge>}
            {isNew && <Badge variant="invert">New</Badge>}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium tracking-tight group-hover:underline group-hover:underline-offset-4" data-testid="product-title">
          {hit.title}
        </h3>
        {min !== null && (
          <p className="flex items-baseline gap-2 text-sm tabular-nums" data-testid="product-price">
            <span className={cn(onSale && "text-destructive-foreground")} data-testid="price">
              {max !== null && max > min && <span className="text-muted-foreground">From </span>}
              {formatMoney(min, currency)}
            </span>
            {onSale && original !== null && original > min && (
              <span className="text-xs text-muted-foreground line-through" data-testid="original-price">
                {formatMoney(original, currency)}
              </span>
            )}
          </p>
        )}
      </div>
    </LocalizedClientLink>
  )
}
