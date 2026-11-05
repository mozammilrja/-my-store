"use client"

import { ensureOk } from "@lib/util/cart-action"
import { formatMoney } from "@lib/money"
import { cn } from "@/lib/utils"
import { deleteLineItem, updateLineItem } from "@lib/data/shop"
import { notifyCartUpdated } from "@lib/util/cart-events"
import { useWishlist } from "@lib/util/wishlist"
import type { CartItem } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useRef, useState } from "react"
import { toast } from "sonner"

const MAX_PER_LINE = 10

export function LineItem({
  item,
  currencyCode,
  editable = true,
}: {
  item: CartItem
  currencyCode: string
  editable?: boolean
}) {
  const [pending, setPending] = useState<"update" | "remove" | null>(null)
  const busy = useRef(false)
  const wishlist = useWishlist()

  const run = async (kind: "update" | "remove", fn: () => Promise<unknown>) => {
    if (busy.current) return
    busy.current = true
    setPending(kind)
    try {
      await fn()
      notifyCartUpdated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.")
    } finally {
      busy.current = false
      setPending(null)
    }
  }

  // What the shop can supply right now (null when the API didn't say).
  const available = item.available ?? null
  const soldOut = available === 0
  const overStock = available !== null && item.quantity > available
  const maxQuantity = Math.min(MAX_PER_LINE, available ?? MAX_PER_LINE)

  const setQuantity = (quantity: number) =>
    run("update", async () => ensureOk(await updateLineItem({ lineId: item.id, quantity })))

  const handleSaveToWishlist = async () => {
    try {
      if (!wishlist.isSaved(item.productId)) {
        await wishlist.toggle(item.productId)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "We couldn't save this to your wishlist.")
      return
    }
    run("remove", async () => ensureOk(await deleteLineItem(item.id)))
    toast.success("Moved to your wishlist")
  }

  // Parse color & size from variantTitle (e.g. "M / Black" or "Black / M" or "M")
  const parts = (item.variantTitle ?? "").split("/").map((s) => s.trim())
  const size = parts.find((p) => /^(xs|s|m|l|xl|xxl|\d{2})$/i.test(p)) ?? (parts.length === 1 ? parts[0] : "")
  const color = parts.find((p) => p !== size) ?? (parts.length > 1 ? parts[1] : "")

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row gap-space-md p-space-md bg-surface-container-lowest rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.02)] relative group border border-surface-container-high/60 transition-opacity",
        pending && "opacity-60"
      )}
      data-testid="product-row"
    >
      {/* Product Image Thumbnail */}
      <div className="w-full sm:w-36 h-48 bg-surface-container-low rounded-lg overflow-hidden shrink-0 relative">
        <LocalizedClientLink
          href={`/products/${item.productHandle}`}
          className="block w-full h-full relative"
          tabIndex={-1}
        >
          {item.thumbnail ? (
            <Image
              src={item.thumbnail}
              alt={item.productTitle}
              fill
              sizes="(min-width: 640px) 144px, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant font-body-sm text-xs p-2 text-center">
              No photograph
            </div>
          )}
        </LocalizedClientLink>
        <span className="absolute top-2 left-2 px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed font-label-caps text-[10px] uppercase rounded font-bold shadow-2xs">
          Atelier Curated
        </span>
      </div>

      {/* Details & Actions */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-space-sm">
            <div className="min-w-0 flex-1 pr-2">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant block truncate font-bold">
                Everwear Atelier Contemporary
              </span>
              <h3 className="font-headline-sm text-headline-sm text-primary mt-0.5 font-medium truncate">
                <LocalizedClientLink
                  href={`/products/${item.productHandle}`}
                  className="hover:underline underline-offset-4"
                  data-testid="product-title"
                >
                  {item.productTitle}
                </LocalizedClientLink>
              </h3>
            </div>
            {editable && (
              <button
                type="button"
                onClick={() => run("remove", async () => ensureOk(await deleteLineItem(item.id)))}
                disabled={!!pending}
                aria-label="Remove item"
                className="text-on-surface-variant hover:text-error transition-colors p-1 cursor-pointer disabled:opacity-40"
                data-testid="product-delete-button"
                title="Remove item"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* Variants specs */}
          <div className="flex items-center gap-space-md mt-space-sm text-body-sm text-on-surface-variant flex-wrap" data-testid="product-variant">
            {color && (
              <span>
                Color: <strong className="text-on-surface font-semibold capitalize">{color}</strong>
              </span>
            )}
            {size && (
              <span>
                Size: <strong className="text-on-surface font-semibold uppercase">{size}</strong>
              </span>
            )}
            {!color && !size && item.variantTitle && (
              <span>
                Variant: <strong className="text-on-surface font-semibold">{item.variantTitle}</strong>
              </span>
            )}
          </div>

          {editable && (soldOut || overStock) && (
            <p
              role="status"
              className="mt-space-sm inline-flex rounded-md bg-error-container px-2.5 py-1 text-[13px] font-medium text-on-error-container"
              data-testid="line-stock-notice"
            >
              {soldOut
                ? "This size is out of stock. Remove it to check out."
                : `Only ${available} left. Lower the quantity to check out.`}
            </p>
          )}
          {editable && !soldOut && !overStock && available !== null && available <= 3 && (
            <p className="mt-space-sm text-[13px] font-medium text-[#ff905a]" data-testid="line-stock-notice">
              Only {available} left
            </p>
          )}
        </div>

        {/* Bottom bar: Stepper, Wishlist, Price */}
        <div className="flex items-end justify-between mt-space-md pt-space-sm border-t border-surface-container-high/80 flex-wrap gap-2">
          {editable ? (
            <div className="flex items-center gap-space-sm flex-wrap">
              {/* Micro-stepper Quantity Controls */}
              <div
                className="flex items-center border border-outline-variant/60 rounded-lg overflow-hidden bg-surface-container-lowest shadow-2xs"
                role="group"
                aria-label={`Quantity for ${item.productTitle}`}
              >
                <button
                  type="button"
                  onClick={() => setQuantity(overStock ? Math.max(available!, 1) : item.quantity - 1)}
                  disabled={item.quantity <= 1 || soldOut || !!pending}
                  className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <span className="material-symbols-outlined text-[16px]">remove</span>
                </button>
                <span
                  className="w-8 text-center font-label-md text-label-md text-on-surface tabular-nums font-semibold"
                  data-testid="product-quantity"
                >
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(item.quantity + 1)}
                  disabled={item.quantity >= maxQuantity || !!pending}
                  className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </button>
              </div>

              {/* Save to Wishlist Action */}
              <button
                type="button"
                onClick={handleSaveToWishlist}
                disabled={!!pending}
                className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors underline underline-offset-4 cursor-pointer disabled:opacity-50"
              >
                Save to Wishlist
              </button>
            </div>
          ) : (
            <span className="font-body-sm text-body-sm text-on-surface-variant">Qty: {item.quantity}</span>
          )}

          <div className="text-right">
            <span
              className="font-headline-sm text-headline-sm text-primary font-semibold tabular-nums block"
              data-testid="product-price"
            >
              {formatMoney(item.total, currencyCode)}
            </span>
            {item.quantity > 1 && (
              <span className="block font-body-sm text-[11px] text-on-surface-variant tabular-nums">
                {formatMoney(item.unitPrice, currencyCode)} each
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
