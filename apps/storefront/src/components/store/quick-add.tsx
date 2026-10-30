"use client"

import { cn } from "@/lib/utils"
import { addToCart } from "@lib/data/shop"
import { notifyCartUpdated } from "@lib/util/cart-events"
import { Loader2Icon, PlusIcon } from "lucide-react"
import { useParams } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

export type QuickVariant = {
  id: string
  /** Option title to value, e.g. { Size: "M", Color: "Black" }. */
  options: Record<string, string>
  inStock: boolean
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL"]

/**
 * Add to bag from a product tile. With a Size option the shopper picks a size
 * and gets the first in-stock variant in it; otherwise the first in-stock
 * variant is added. Prices and stock are re-checked by the backend.
 */
export function QuickAdd({
  title,
  variants,
  className,
}: {
  title: string
  variants: QuickVariant[]
  className?: string
}) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const [pending, setPending] = useState<string | null>(null)
  const lock = useRef(false)

  const sizes = [...new Set(variants.map((v) => v.options.Size).filter(Boolean))].sort(
    (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)
  )
  const pick = (size?: string) => variants.find((v) => v.inStock && (!size || v.options.Size === size))

  const add = async (key: string, size?: string) => {
    const variant = pick(size)
    if (!variant || lock.current) return
    lock.current = true
    setPending(key)
    try {
      await addToCart({ variantId: variant.id, quantity: 1, countryCode })
      notifyCartUpdated()
      toast.success(`${title}${size ? `, size ${size}` : ""} added to your bag`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "We couldn't add this to your bag. Please try again.")
    } finally {
      lock.current = false
      setPending(null)
    }
  }

  if (!variants.some((v) => v.inStock)) return null

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border border-border/60 bg-surface-container-lowest/95 p-2.5 backdrop-blur-xs shadow-md",
        className
      )}
      data-testid="quick-add"
    >
      {sizes.length > 0 ? (
        <>
          <span className="font-label-caps text-[10px] font-bold tracking-[0.12em] text-foreground uppercase">
            Quick Add Size
          </span>
          <div className="flex flex-wrap gap-1" role="group" aria-label={`Add ${title} to bag, choose a size`}>
            {sizes.map((size) => {
              const available = !!pick(size)
              return (
                <button
                  key={size}
                  type="button"
                  disabled={!available || !!pending}
                  onClick={() => add(size, size)}
                  aria-label={`Add size ${size} to bag`}
                  className="flex h-8 min-w-8 items-center justify-center rounded border border-border bg-surface-container-lowest px-2 font-label-sm text-xs font-semibold text-foreground transition-all hover:border-foreground hover:bg-foreground hover:text-white disabled:cursor-not-allowed disabled:text-muted-foreground disabled:line-through shadow-2xs"
                >
                  {pending === size ? <Loader2Icon className="size-3 animate-spin" aria-hidden /> : size}
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <button
          type="button"
          disabled={!!pending}
          onClick={() => add("one")}
          className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-label-md tracking-[0.1em] text-primary-foreground uppercase font-bold transition-opacity hover:opacity-90 disabled:opacity-60 shadow-2xs cursor-pointer"
        >
          {pending ? <Loader2Icon className="size-3 animate-spin" aria-hidden /> : <PlusIcon className="size-3" aria-hidden />}
          Add to Bag
        </button>
      )}
    </div>
  )
}
