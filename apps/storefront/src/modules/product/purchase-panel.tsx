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

  const [pincode, setPincode] = useState("560001")
  const [pincodeChecked, setPincodeChecked] = useState(true)

  const buyNow = async () => {
    if (!selected || !inStock || lock.current) return
    lock.current = true
    setAdding(true)
    try {
      await addToCart({ variantId: selected.id, quantity, countryCode })
      notifyCartUpdated()
      router.push(`/${countryCode}/checkout`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to proceed to checkout")
    } finally {
      lock.current = false
      setAdding(false)
    }
  }

  const label = adding ? "Adding" : added ? "Added" : !selected ? "Unavailable" : inStock ? "Add to bag" : "Out of stock"

  const discountPercent =
    selected?.compareAtPrice != null && price !== null && selected.compareAtPrice > price
      ? Math.round(((selected.compareAtPrice - price) / selected.compareAtPrice) * 100)
      : null

  return (
    <>
      <form id="product-form" method="post" action={`/${countryCode}/cart/add`} onSubmit={submit} className="flex flex-col gap-6" data-testid="product-actions">
        <input type="hidden" name="handle" value={product.handle} />
        <input type="hidden" name="variant_id" value={selected?.id ?? ""} />
        <input type="hidden" name="quantity" value={quantity} />

        {/* 1. Rating & Reviews Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1 bg-emerald-700 text-white font-bold text-xs px-2 py-0.5 rounded shadow-2xs">
            <span>4.3</span>
            <span className="text-[10px]">★</span>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            1,246 Ratings &amp; 89 Reviews
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary bg-secondary/10 border border-secondary/20 px-2 py-0.5 rounded">
            <span>Everwear Assured</span>
          </span>
        </div>

        {/* 2. Price and Discount Display */}
        <div className="flex flex-col gap-1" data-testid="product-price">
          {discountPercent && (
            <span className="font-label-caps text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Top Discount of the Season · Special Price
            </span>
          )}
          <div className="flex items-baseline gap-3 tabular-nums">
            {price !== null ? (
              <>
                <span className={cn("text-3xl font-bold", onSale && "text-foreground")} data-testid="product-price-value">
                  {formatMoney(price, currency)}
                </span>
                {onSale && (
                  <span className="text-sm text-muted-foreground line-through" data-testid="original-product-price">
                    {formatMoney(selected!.compareAtPrice, currency)}
                  </span>
                )}
                {discountPercent && (
                  <span className="text-sm font-bold text-emerald-700">
                    {discountPercent}% off
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
        </div>

        {/* 3. Available Bank Offers Card */}
        <div className="p-3.5 bg-surface-container-low/60 border border-border/80 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Available Bank Offers</span>
            <span className="text-[11px] font-semibold text-secondary hover:underline cursor-pointer">
              3 Offers Apply
            </span>
          </div>
          <ul className="text-xs text-muted-foreground flex flex-col gap-1.5">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-700 font-bold">•</span>
              <span>
                <strong className="text-foreground">Bank Offer:</strong> 10% Instant Discount on select Credit Cards.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-700 font-bold">•</span>
              <span>
                <strong className="text-foreground">Special Price:</strong> Get extra ₹150 off on prepaid UPI transactions.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-700 font-bold">•</span>
              <span>
                <strong className="text-foreground">Cashback:</strong> 5% unlimited cashback with Everwear Pay.
              </span>
            </li>
          </ul>
        </div>

        {/* 4. Variant Options (Color, Size) */}
        {variants.length > 1 &&
          product.options.map((option) => (
            <fieldset key={option.title} className="flex flex-col gap-2.5" data-testid="product-options">
              <legend className="flex w-full justify-between text-xs font-label-caps uppercase tracking-wider font-bold">
                <span className="text-foreground">{option.title}</span>
                <span className="text-muted-foreground font-normal normal-case">{options[option.title] ?? "Select"}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => {
                  const checked = options[option.title] === value
                  const available = valueAvailable(option.title, value)
                  return (
                    <label
                      key={value}
                      className={cn(
                        "relative inline-flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-lg border px-3.5 font-label-sm text-xs font-medium transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
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

        {/* 5. Delivery Options & Pincode Checker */}
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-label-caps">
            Delivery &amp; Services
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={6}
              placeholder="Enter Pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="h-10 px-3 flex-1 text-xs bg-surface-container-lowest border border-border rounded-lg focus:outline-none focus:border-primary font-body-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (pincode.length >= 6) {
                  setPincodeChecked(true)
                  toast.success(`Delivery available to pincode ${pincode}`)
                } else {
                  toast.error("Please enter a 6-digit pincode")
                }
              }}
              className="h-10 px-4 text-xs font-bold rounded-lg border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              Check
            </button>
          </div>
          {pincodeChecked && (
            <div className="flex flex-col gap-1 text-xs text-foreground bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
              <span className="font-semibold text-emerald-800">
                Delivery by 5 Nov, Thursday · Free Delivery
              </span>
              <span className="text-[11px] text-muted-foreground">
                Express dispatch from Everwear central hub. Cash on delivery available.
              </span>
            </div>
          )}
        </div>

        {/* 6. Service Trust Badges (14-day returns, COD, Assured) */}
        <div className="grid grid-cols-3 gap-2 border-y border-border/60 py-3 text-center">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold text-foreground">14-Day Returns</span>
            <span className="text-[10px] text-muted-foreground">Doorstep exchange</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold text-foreground">Cash on Delivery</span>
            <span className="text-[10px] text-muted-foreground">Available at checkout</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold text-foreground">Everwear Assured</span>
            <span className="text-[10px] text-muted-foreground">100% Quality checked</span>
          </div>
        </div>

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

        {/* 7. Dual Action Buttons: Add to Bag + Buy Now */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex h-12 items-center border border-border rounded-lg bg-surface-container-low/40 shrink-0" role="group" aria-label="Quantity">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1 || adding} className="flex h-full w-10 items-center justify-center disabled:opacity-40 hover:bg-surface-container-low transition-colors" aria-label="Decrease quantity">
              <MinusIcon className="size-4" aria-hidden />
            </button>
            <output className="w-8 text-center font-label-sm text-sm tabular-nums font-bold" aria-live="polite" data-testid="product-quantity">
              {quantity}
            </output>
            <button type="button" onClick={() => setQuantity((q) => Math.min(max, q + 1))} disabled={quantity >= max || adding || !inStock} className="flex h-full w-10 items-center justify-center disabled:opacity-40 hover:bg-surface-container-low transition-colors" aria-label="Increase quantity">
              <PlusIcon className="size-4" aria-hidden />
            </button>
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-12 flex-1 rounded-lg border-2 border-primary bg-surface-container-lowest text-primary hover:bg-surface-container-low font-label-md tracking-wider uppercase font-bold shadow-xs transition-colors"
            disabled={!inStock || adding}
            aria-busy={adding}
            data-testid="add-product-button"
          >
            {adding ? <Loader2Icon className="animate-spin" aria-hidden /> : added ? <CheckIcon aria-hidden /> : null}
            {label}
          </Button>

          <Button
            type="button"
            onClick={buyNow}
            size="lg"
            className="h-12 flex-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-label-md tracking-wider uppercase font-bold shadow-xs transition-colors"
            disabled={!inStock || adding}
          >
            {adding ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
            Buy Now
          </Button>
        </div>
      </form>

      {/* Small screens: sticky bottom bar with dual buttons */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border/80 bg-surface-container-lowest/95 p-3 backdrop-blur shadow-lg lg:hidden">
        <Button
          type="submit"
          form="product-form"
          size="lg"
          className="flex-1 h-11 rounded-lg border border-primary bg-surface-container-lowest text-primary font-label-md uppercase tracking-wider font-bold text-xs"
          disabled={!inStock || adding}
        >
          {adding ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
          Add to Bag
        </Button>
        <Button
          type="button"
          onClick={buyNow}
          size="lg"
          className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground font-label-md uppercase tracking-wider font-bold text-xs shadow-xs"
          disabled={!inStock || adding}
        >
          Buy Now
        </Button>
      </div>
    </>
  )
}
