"use client"

import { formatMoney } from "@lib/money"
import { cn } from "@/lib/utils"
import { deleteLineItem, updateLineItem } from "@lib/data/shop"
import { notifyCartUpdated } from "@lib/util/cart-events"
import type { CartItem } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Loader2Icon, MinusIcon, PlusIcon } from "lucide-react"
import Image from "next/image"
import { useRef, useState } from "react"
import { toast } from "sonner"

const MAX_PER_LINE = 10


/** One bag line with quantity controls. Totals always come back from the server. */
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

  const setQuantity = (quantity: number) =>
    run("update", () => updateLineItem({ lineId: item.id, quantity }))

  return (
    <li className={cn("grid grid-cols-[6rem_1fr] gap-4 py-6 sm:grid-cols-[8rem_1fr]", pending && "opacity-70")} data-testid="product-row">
      <LocalizedClientLink href={`/products/${item.productHandle}`} className="relative aspect-[4/5] overflow-hidden bg-muted">
        {item.thumbnail && <Image src={item.thumbnail} alt="" fill sizes="128px" className="object-cover" />}
      </LocalizedClientLink>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <LocalizedClientLink
              href={`/products/${item.productHandle}`}
              className="font-medium hover:underline hover:underline-offset-4"
              data-testid="product-title"
            >
              {item.productTitle}
            </LocalizedClientLink>
            {item.variantTitle && (
              <span className="text-sm text-muted-foreground" data-testid="product-variant">{item.variantTitle}</span>
            )}
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatMoney(item.unitPrice, currencyCode)} each
            </span>
          </div>
          <span className="tabular-nums" data-testid="product-price">{formatMoney(item.total, currencyCode)}</span>
        </div>

        {editable ? (
          <div className="mt-auto flex items-center justify-between gap-4">
            <div className="flex h-10 items-center border" role="group" aria-label={`Quantity for ${item.productTitle}`}>
              <button
                type="button"
                onClick={() => setQuantity(item.quantity - 1)}
                disabled={item.quantity <= 1 || !!pending}
                className="flex h-full w-10 items-center justify-center disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                <MinusIcon className="size-3.5" aria-hidden />
              </button>
              <span className="w-8 text-center text-sm tabular-nums" data-testid="product-quantity">
                {pending === "update" ? <Loader2Icon className="mx-auto size-3.5 animate-spin" aria-label="Updating" /> : item.quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(item.quantity + 1)}
                disabled={item.quantity >= MAX_PER_LINE || !!pending}
                className="flex h-full w-10 items-center justify-center disabled:opacity-40"
                aria-label="Increase quantity"
              >
                <PlusIcon className="size-3.5" aria-hidden />
              </button>
            </div>
            <button
              type="button"
              onClick={() => run("remove", () => deleteLineItem(item.id))}
              disabled={!!pending}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
              data-testid="product-delete-button"
            >
              {pending === "remove" ? "Removing" : "Remove"}
              <span className="sr-only"> {item.productTitle}</span>
            </button>
          </div>
        ) : (
          <span className="mt-auto text-sm text-muted-foreground">Qty {item.quantity}</span>
        )}
      </div>
    </li>
  )
}
