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
        "flex flex-col gap-2 bg-background/95 p-3 backdrop-blur",
        className
      )}
      data-testid="quick-add"
    >
      {sizes.length > 0 ? (
        <>
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase">Quick add</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Add ${title} to bag, choose a size`}>
            {sizes.map((size) => {
              const available = !!pick(size)
              return (
                <button
                  key={size}
                  type="button"
                  disabled={!available || !!pending}
                  onClick={() => add(size, size)}
                  aria-label={`Add size ${size} to bag`}
                  className="flex h-9 min-w-10 items-center justify-center border border-border bg-background px-2 text-xs font-semibold transition-colors hover:border-foreground hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:text-muted-foreground disabled:line-through"
                >
                  {pending === size ? <Loader2Icon className="size-3.5 animate-spin" aria-hidden /> : size}
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
          className="flex h-10 items-center justify-center gap-2 bg-foreground text-xs font-bold tracking-[0.12em] text-background uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? <Loader2Icon className="size-3.5 animate-spin" aria-hidden /> : <PlusIcon className="size-3.5" aria-hidden />}
          Add to bag
        </button>
      )}
    </div>
  )
}
