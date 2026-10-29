"use client"

import { Button } from "@/components/ui/button"
import { formatMoney } from "@/components/store/money"
import { cn } from "@/lib/utils"
import { addToCart } from "@lib/data/cart"
import { notifyCartUpdated } from "@lib/util/cart-events"
import { isVariantInStock } from "@lib/util/inventory"
import { HttpTypes } from "@medusajs/types"
import { CheckIcon, Loader2Icon, MinusIcon, PlusIcon } from "lucide-react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

const MAX_PER_ORDER = 10

type Options = Record<string, string | undefined>

const keymap = (options: HttpTypes.StoreProductVariant["options"]): Options =>
  (options ?? []).reduce<Options>((acc, o) => {
    if (o.option_id) acc[o.option_id] = o.value
    return acc
  }, {})

const matches = (variant: HttpTypes.StoreProductVariant, options: Options) => {
  const own = keymap(variant.options)
  const keys = new Set([...Object.keys(own), ...Object.keys(options)])
  return [...keys].every((k) => own[k] === options[k])
}

const maxQuantity = (variant?: HttpTypes.StoreProductVariant) => {
  if (!variant) return 1
  if (!variant.manage_inventory || variant.allow_backorder) return MAX_PER_ORDER
  return Math.max(1, Math.min(MAX_PER_ORDER, variant.inventory_quantity ?? 0))
}

/**
 * Variant options, price, availability, quantity and add to cart. Also works
 * without JavaScript: the form posts to /cart/add.
 */
export function PurchasePanel({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { countryCode } = useParams<{ countryCode: string }>()
  const variants = useMemo(() => product.variants ?? [], [product.variants])

  const [options, setOptions] = useState<Options>(() =>
    keymap((variants.find(isVariantInStock) ?? variants[0])?.options ?? [])
  )
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const lock = useRef(false)
  const [urlApplied, setUrlApplied] = useState(false)

  const selected = useMemo(
    () => variants.find((v) => matches(v, options)),
    [variants, options]
  )
  const inStock = isVariantInStock(selected)
  const max = maxQuantity(selected)

  // Apply ?v_id= after hydration (the page is statically rendered).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("v_id")
    const variant = variants.find((v) => v.id === id)
    if (variant) setOptions(keymap(variant.options))
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

  const valueAvailable = (optionId: string, value: string) =>
    variants.some(
      (v) =>
        matches(v, { ...options, [optionId]: value }) && isVariantInStock(v)
    )

  const price = selected?.calculated_price
  const cheapest = useMemo(
    () =>
      variants
        .map((v) => v.calculated_price?.calculated_amount)
        .filter((a): a is number => typeof a === "number")
        .sort((a, b) => a - b)[0],
    [variants]
  )
  const currency =
    price?.currency_code ?? variants[0]?.calculated_price?.currency_code ?? ""
  const onSale =
    !!price?.calculated_amount &&
    !!price.original_amount &&
    price.calculated_amount < price.original_amount

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected?.id || !inStock || lock.current) return
    lock.current = true
    setAdding(true)
    try {
      await addToCart({ variantId: selected.id, quantity, countryCode })
      notifyCartUpdated()
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
      toast.success(`${product.title} added to your bag`)
    } catch {
      toast.error("We couldn't add this to your bag. Please try again.")
    } finally {
      lock.current = false
      setAdding(false)
    }
  }

  const multiVariant = variants.length > 1

  return (
    <>
      <form
        id="product-form"
        method="post"
        action={`/${countryCode}/cart/add`}
        onSubmit={submit}
        className="flex flex-col gap-8"
        data-testid="product-actions"
      >
        <input type="hidden" name="product_id" value={product.id} />
        <input type="hidden" name="variant_id" value={selected?.id ?? ""} />
        <input type="hidden" name="quantity" value={quantity} />

        <div
          className="flex items-baseline gap-3 tabular-nums"
          data-testid="product-price"
        >
          {price?.calculated_amount != null ? (
            <>
              <span
                className={cn(
                  "text-3xl font-bold",
                  onSale && "text-destructive-foreground"
                )}
                data-testid="product-price-value"
              >
                {formatMoney(price.calculated_amount, currency)}
              </span>
              {onSale && (
                <span
                  className="text-sm text-muted-foreground line-through"
                  data-testid="original-product-price"
                >
                  {formatMoney(price.original_amount, currency)}
                </span>
              )}
            </>
          ) : cheapest != null ? (
            <span className="text-2xl">
              <span className="text-base text-muted-foreground">From </span>
              {formatMoney(cheapest, currency)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              Price unavailable in your region
            </span>
          )}
        </div>

        {multiVariant &&
          (product.options ?? []).map((option) => (
            <fieldset
              key={option.id}
              className="flex flex-col gap-3"
              data-testid="product-options"
            >
              <legend className="mb-3 flex w-full justify-between text-sm">
                <span className="font-medium">{option.title}</span>
                <span className="text-muted-foreground">
                  {options[option.id] ?? "Select"}
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {(option.values ?? []).map((v) => {
                  const checked = options[option.id] === v.value
                  const available = valueAvailable(option.id, v.value)
                  return (
                    <label
                      key={v.id}
                      className={cn(
                        "relative inline-flex h-11 min-w-12 cursor-pointer items-center justify-center border px-4 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
                        checked
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground",
                        !available &&
                          !checked &&
                          "text-muted-foreground line-through decoration-1"
                      )}
                    >
                      <input
                        type="radio"
                        name={`options[${option.id}]`}
                        value={v.value}
                        checked={checked}
                        onChange={() =>
                          setOptions((prev) => ({
                            ...prev,
                            [option.id]: v.value,
                          }))
                        }
                        disabled={adding}
                        className="sr-only"
                        data-testid="option-button"
                      />
                      {v.value}
                      {!available && (
                        <span className="sr-only"> (out of stock)</span>
                      )}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}

        <p
          className="text-sm"
          aria-live="polite"
          data-testid="product-availability"
        >
          {!selected ? (
            <span className="text-muted-foreground">
              This combination isn&apos;t available.
            </span>
          ) : inStock ? (
            <span className="text-success-foreground">In stock</span>
          ) : (
            <span className="text-destructive-foreground">Out of stock</span>
          )}
        </p>

        <div className="flex gap-3">
          <div
            className="flex h-12 items-center border"
            role="group"
            aria-label="Quantity"
          >
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || adding}
              className="flex h-full w-11 items-center justify-center disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <MinusIcon className="size-4" aria-hidden />
            </button>
            <output
              className="w-8 text-center text-sm tabular-nums"
              aria-live="polite"
              data-testid="product-quantity"
            >
              {quantity}
            </output>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(max, q + 1))}
              disabled={quantity >= max || adding || !inStock}
              className="flex h-full w-11 items-center justify-center disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <PlusIcon className="size-4" aria-hidden />
            </button>
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-12 flex-1"
            disabled={!selected || !inStock || adding}
            aria-busy={adding}
            data-testid="add-product-button"
          >
            {adding ? (
              <Loader2Icon className="animate-spin" aria-hidden />
            ) : added ? (
              <CheckIcon aria-hidden />
            ) : null}
            {adding
              ? "Adding"
              : added
              ? "Added"
              : !selected
              ? "Unavailable"
              : inStock
              ? "Add to bag"
              : "Out of stock"}
          </Button>
        </div>
      </form>

      {/* Small screens: keep the buy button in reach while reading details. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs text-muted-foreground">
            {product.title}
            {selected?.title ? ` · ${selected.title}` : ""}
          </span>
          {price?.calculated_amount != null && (
            <span className="text-sm font-bold tabular-nums">
              {formatMoney(price.calculated_amount, currency)}
            </span>
          )}
        </div>
        <Button
          type="submit"
          form="product-form"
          size="lg"
          disabled={!selected || !inStock || adding}
          aria-busy={adding}
        >
          {adding ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
          {adding
            ? "Adding"
            : !selected
            ? "Unavailable"
            : inStock
            ? "Add to bag"
            : "Sold out"}
        </Button>
      </div>
    </>
  )
}
