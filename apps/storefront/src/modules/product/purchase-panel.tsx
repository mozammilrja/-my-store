"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Product, Variant } from "@lib/api/types"
import { addToCart } from "@lib/data/shop"
import { formatMoney } from "@lib/money"
import { notifyCartUpdated } from "@lib/util/cart-events"
import { CheckIcon, Loader2Icon, MinusIcon, PlusIcon } from "lucide-react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

const MAX_PER_ORDER = 10

type Options = Record<string, string | undefined>

const matches = (variant: Variant, options: Options) => {
  const keys = new Set([...Object.keys(variant.options), ...Object.keys(options)])
  return [...keys].every((k) => variant.options[k] === options[k])
}

const buyable = (v: Variant) => v.inStock && v.price !== null

/**
 * Variant options, price, availability, quantity and add to bag. Also works
 * without JavaScript: the form posts to /cart/add.
 */
export function PurchasePanel({ product }: { product: Product }) {
  const router = useRouter()
  const pathname = usePathname()
  const { countryCode } = useParams<{ countryCode: string }>()
  const variants = product.variants

  const [options, setOptions] = useState<Options>(() => ({ ...(variants.find(buyable) ?? variants[0])?.options }))
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const lock = useRef(false)
  const [urlApplied, setUrlApplied] = useState(false)

  const selected = useMemo(() => variants.find((v) => matches(v, options)), [variants, options])
  const inStock = !!selected && buyable(selected)
  const max = selected ? Math.max(1, Math.min(MAX_PER_ORDER, selected.available)) : 1

  // Apply ?v_id= after hydration (the page is statically rendered).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("v_id")
    const variant = variants.find((v) => v.id === id)
    if (variant) setOptions({ ...variant.options })
    setUrlApplied(true)
  }, [variants])

  // Keep ?v_id= in sync so a chosen variant can be shared.
  useEffect(() => {
    if (!urlApplied) return
    const params = new URLSearchParams(window.location.search)
    const value = selected?.id ?? null
    if (params.get("v_id") === value) return
    if (value) params.set("v_id", value)
    else params.delete("v_id")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [selected, urlApplied, pathname, router])

  useEffect(() => setQuantity((q) => Math.min(q, max)), [max])

  const valueAvailable = (title: string, value: string) =>
    variants.some((v) => matches(v, { ...options, [title]: value }) && buyable(v))

  const price = selected?.price ?? null
  const onSale = selected?.compareAtPrice != null
  const currency = product.currency

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected || !inStock || lock.current) return
    lock.current = true
    setAdding(true)
    try {
      await addToCart({ variantId: selected.id, quantity, countryCode })
      notifyCartUpdated()
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
      toast.success(`${product.title} added to your bag`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "We couldn't add this to your bag. Please try again.")
    } finally {
      lock.current = false
      setAdding(false)
    }
  }

  const label = adding ? "Adding" : added ? "Added" : !selected ? "Unavailable" : inStock ? "Add to bag" : "Out of stock"

  return (
    <>
      <form id="product-form" method="post" action={`/${countryCode}/cart/add`} onSubmit={submit} className="flex flex-col gap-8" data-testid="product-actions">
        <input type="hidden" name="handle" value={product.handle} />
        <input type="hidden" name="variant_id" value={selected?.id ?? ""} />
        <input type="hidden" name="quantity" value={quantity} />

        <div className="flex items-baseline gap-3 tabular-nums" data-testid="product-price">
          {price !== null ? (
            <>
              <span className={cn("text-3xl font-bold", onSale && "text-destructive-foreground")} data-testid="product-price-value">
                {formatMoney(price, currency)}
              </span>
              {onSale && (
                <span className="text-sm text-muted-foreground line-through" data-testid="original-product-price">
                  {formatMoney(selected!.compareAtPrice, currency)}
                </span>
              )}
            </>
          ) : product.priceRange ? (
            <span className="text-3xl font-bold">
              <span className="text-base font-normal text-muted-foreground">From </span>
              {formatMoney(product.priceRange.min, currency)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Price unavailable in your region</span>
          )}
        </div>

        {variants.length > 1 &&
          product.options.map((option) => (
            <fieldset key={option.title} className="flex flex-col gap-3" data-testid="product-options">
              <legend className="mb-3 flex w-full justify-between text-sm">
                <span className="font-medium">{option.title}</span>
                <span className="text-muted-foreground">{options[option.title] ?? "Select"}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => {
                  const checked = options[option.title] === value
                  const available = valueAvailable(option.title, value)
                  return (
                    <label
                      key={value}
                      className={cn(
                        "relative inline-flex h-11 min-w-12 cursor-pointer items-center justify-center rounded-md border px-4 font-label-sm text-xs font-medium transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
                        checked ? "border-primary bg-primary text-primary-foreground font-semibold shadow-2xs" : "border-border bg-surface-container-lowest hover:border-primary/50 text-foreground",
                        !available && !checked && "text-muted-foreground line-through decoration-1 opacity-60"
                      )}
                    >
                      <input
                        type="radio"
                        name={`options[${option.title}]`}
                        value={value}
                        checked={checked}
                        onChange={() => setOptions((prev) => ({ ...prev, [option.title]: value }))}
                        disabled={adding}
                        className="sr-only"
                        data-testid="option-button"
                      />
                      {value}
                      {!available && <span className="sr-only"> (out of stock)</span>}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}

        <p className="text-xs font-label-sm flex items-center gap-1.5" aria-live="polite" data-testid="product-availability">
          {!selected ? (
            <span className="text-muted-foreground">This combination isn&apos;t available.</span>
          ) : inStock ? (
            <span className="text-emerald-800 flex items-center gap-1.5 font-semibold">
              <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
              In stock · Ready for express dispatch
            </span>
          ) : (
            <span className="text-destructive font-semibold">Out of stock</span>
          )}
        </p>

        <div className="flex gap-3">
          <div className="flex h-12 items-center border border-border rounded-lg bg-surface-container-low/40" role="group" aria-label="Quantity">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1 || adding} className="flex h-full w-11 items-center justify-center disabled:opacity-40 hover:bg-surface-container-low transition-colors" aria-label="Decrease quantity">
              <MinusIcon className="size-4" aria-hidden />
            </button>
            <output className="w-8 text-center font-label-sm text-sm tabular-nums font-bold" aria-live="polite" data-testid="product-quantity">
              {quantity}
            </output>
            <button type="button" onClick={() => setQuantity((q) => Math.min(max, q + 1))} disabled={quantity >= max || adding || !inStock} className="flex h-full w-11 items-center justify-center disabled:opacity-40 hover:bg-surface-container-low transition-colors" aria-label="Increase quantity">
              <PlusIcon className="size-4" aria-hidden />
            </button>
          </div>
          <Button type="submit" size="lg" className="h-12 flex-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-label-md tracking-wider uppercase font-semibold shadow-xs" disabled={!inStock || adding} aria-busy={adding} data-testid="add-product-button">
            {adding ? <Loader2Icon className="animate-spin" aria-hidden /> : added ? <CheckIcon aria-hidden /> : null}
            {label}
          </Button>
        </div>
      </form>

      {/* Small screens: keep the buy button in reach while reading details. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border/80 bg-surface-container-lowest/95 p-3 backdrop-blur shadow-lg lg:hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs text-muted-foreground">
            {product.title}
            {selected?.title ? ` · ${selected.title}` : ""}
          </span>
          {price !== null && <span className="text-sm font-bold tabular-nums text-foreground">{formatMoney(price, currency)}</span>}
        </div>
        <Button type="submit" form="product-form" size="lg" className="rounded-lg bg-primary text-primary-foreground font-label-md uppercase tracking-wider font-semibold shadow-xs" disabled={!inStock || adding} aria-busy={adding}>
          {adding ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
          {adding ? "Adding" : !selected ? "Unavailable" : inStock ? "Add to bag" : "Sold out"}
        </Button>
      </div>
    </>
  )
}
