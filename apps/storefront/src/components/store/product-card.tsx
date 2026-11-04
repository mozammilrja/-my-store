"use client"

import { cn } from "@/lib/utils"
import type { Product } from "@lib/api/types"
import { useProductCardInteractions } from "@lib/hooks/use-product-card-interactions"
import {
  buildProductCardModel,
  type ProductCardModel,
} from "@lib/product/card-model"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { TagIcon } from "lucide-react"
import { useMemo } from "react"
import { ProductImageDots } from "./product-card-dots"
import { ProductCardGallery } from "./product-card-gallery"
import { ProductPrice } from "./product-price"
import { ProductQuickActions } from "./product-quick-actions"
import { ProductRatingBadge } from "./product-rating-badge"
import { ProductWishlistButton } from "./product-wishlist-button"

type ProductCardProps = {
  product: Product
  /** Load the first image eagerly (above-the-fold cards). */
  priority?: boolean
  sizes?: string
  className?: string
  /** h2 directly under a page title (listings), h3 under a section heading. */
  headingLevel?: "h2" | "h3"
}

/**
 * Myntra-style product listing card.
 *
 * At rest: a 3:4 image with a rating chip bottom-left and a promo tag
 * top-left, then brand, title and price.
 *
 * On hover the gallery auto-slides through its images, pagination dots
 * appear, and a panel with a WISHLIST button and a one-line "Sizes:" row
 * covers brand and title inside the same fixed-height box. Picking a size
 * opens the product page with that size selected. The box never changes
 * height, so a grid row never reflows.
 *
 * Every badge is data-driven: no reviews means no chip, no MRP means no
 * strikethrough. All state is per-card, so hovering one card leaves the rest
 * of the grid untouched.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 48vw",
  className,
  headingLevel = "h3",
}: ProductCardProps) {
  const model: ProductCardModel = useMemo(
    () => buildProductCardModel(product),
    [product]
  )
  const Heading = headingLevel

  const {
    active,
    hovered,
    showControls,
    selectedSize,
    setSelectedSize,
    previewIndex,
    selectIndex,
    onCardEnter,
    onCardLeave,
    onCardFocus,
    onCardBlur,
  } = useProductCardInteractions({ imageCount: model.images.length })

  return (
    <article
      className={cn(
        "group/card relative flex h-full cursor-default flex-col bg-surface-container-lowest",
        "transition-shadow duration-200 motion-reduce:transition-none",
        // Lift the hovered card so its shadow sits over its neighbours.
        hovered ? "z-20 shadow-[0_2px_16px_4px_rgba(40,44,63,0.07)]" : "z-0",
        className
      )}
      data-testid="product-wrapper"
      data-hovered={hovered ? "true" : "false"}
      // Pointer events, not mouse events, and only for a real mouse: on a
      // touch device a tap can synthesise mouseenter, which would swap the
      // text block out from under the finger and swallow the tap.
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onCardEnter()
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") onCardLeave()
      }}
      // Tabbing in reveals the same controls, so nothing here is hover-only.
      onFocus={onCardFocus}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          onCardBlur()
      }}
    >
      {/*
        Image + brand/title, with the Myntra hover panel laid over their lower
        part. The panel is absolutely positioned, so showing it moves nothing:
        the card and every card around it keep their exact size.
      */}
      <div className="relative">
        <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low">
          <ProductCardGallery
            images={model.images}
            title={model.title}
            href={model.href}
            sizes={sizes}
            priority={priority}
            active={active}
            warm={showControls}
            onActiveChange={previewIndex}
          />

          {/* Promo markers, top-left. */}
          <div className="pointer-events-none absolute left-2 top-2 z-[5] flex flex-col items-start gap-1">
            {model.sponsored && (
              <span
                className="bg-surface-container-lowest/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground shadow-xs"
                data-testid="product-sponsored-badge"
              >
                AD
              </span>
            )}
            {!model.inStock && (
              <span className="bg-foreground px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
                Sold out
              </span>
            )}
            {model.isNew && model.inStock && (
              <span
                className="flex items-center gap-0.5 text-[#ff527b] drop-shadow-sm"
                data-testid="product-new-badge"
              >
                <TagIcon
                  aria-hidden
                  className="size-4 -rotate-90 fill-current"
                />
                <span className="sr-only">New arrival</span>
              </span>
            )}
          </div>

          {/* Myntra keeps the wishlist in the hover panel; only touch screens,
              which cannot hover, get a heart on the image. */}
          <ProductWishlistButton
            productId={model.id}
            productTitle={model.title}
            className="[@media(hover:hover)]:hidden"
          />

          {/* Rating at rest; the panel (with its dots) covers this spot on hover. */}
          {!showControls && model.rating !== null && model.ratingCount > 0 && (
            <ProductRatingBadge
              rating={model.rating}
              ratingCount={model.ratingCount}
            />
          )}
        </div>

        <div className="flex h-[3.75rem] flex-col overflow-hidden px-2.5 pt-3">
          <span className="cursor-default truncate text-[16px] font-bold leading-5 text-foreground">
            {model.brand}
          </span>
          <Heading
            className="mt-1.5 truncate text-[14px] font-normal leading-[17px]"
            data-testid="product-title"
          >
            <LocalizedClientLink
              href={model.href}
              className="relative z-[2] cursor-pointer text-muted-foreground"
            >
              {model.title}
            </LocalizedClientLink>
          </Heading>
        </div>

        {/*
          Hover panel: dots on white, WISHLIST, then "Sizes: S, M, L". Shown on
          hover, and whenever keyboard focus is inside it (it stays focusable
          while transparent so Tab can reach it).
        */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-[8] flex flex-col gap-2.5 bg-surface-container-lowest px-2.5 pb-1",
            "transition-opacity duration-150 motion-reduce:transition-none",
            hovered
              ? "opacity-100"
              : "pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100"
          )}
          data-testid="product-card-hover-panel"
          data-shown={hovered ? "true" : "false"}
        >
          <div className="flex h-5 items-end justify-center">
            {showControls && (
              <ProductImageDots
                count={model.images.length}
                active={active}
                onSelect={selectIndex}
                onPreview={previewIndex}
                className="static"
              />
            )}
          </div>
          <ProductWishlistButton
            productId={model.id}
            productTitle={model.title}
            appearance="bar"
          />
          <ProductQuickActions
            model={model}
            selectedSize={selectedSize}
            onSelectSize={setSelectedSize}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-2.5 pb-2.5">
        <ProductPrice
          price={model.price}
          compareAtPrice={model.compareAtPrice}
          discountPercent={model.discountPercent}
          currency={model.currency}
          priceVaries={model.priceVaries}
          // One fixed line: if "(xx% OFF)" would wrap it drops out whole
          // instead, so a narrow card is never taller than its neighbours.
          className="mt-auto h-5 overflow-hidden pt-0 leading-5"
        />
      </div>
    </article>
  )
}
