"use client"

import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import type { Product, Variant } from "@lib/api/types"
import { addToCart } from "@lib/data/shop"
import { formatMoney } from "@lib/money"
import { notifyCartUpdated } from "@lib/util/cart-events"
import { useWishlist } from "@lib/util/wishlist"
import { CheckIcon, HeartIcon, Loader2Icon, ShoppingBagIcon, TruckIcon } from "lucide-react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

type Options = Record<string, string | undefined>

const matches = (variant: Variant, options: Options) => {
  const keys = new Set([...Object.keys(variant.options), ...Object.keys(options)])
  return [...keys].every((k) => variant.options[k] === options[k])
}

const buyable = (v: Variant) => v.inStock && v.price !== null

/**
 * Myntra-ordered buy column: rating → price → size → Add to Bag | Wishlist →
 * delivery → offers. Posts to /cart/add without JS.
 */
export function PurchasePanel({ product }: { product: Product }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { countryCode } = useParams<{ countryCode: string }>()
  const variants = product.variants

  const vIdFromUrl = searchParams.get("v_id")

  const [options, setOptions] = useState<Options>(() => {
    if (vIdFromUrl) {
      const match = variants.find((v) => v.id === vIdFromUrl)
      if (match) return { ...match.options }
    }
    // `?size=M` from a listing card's size chip: preselect that size, on a
    // variant that can be bought if one exists.
    const sizeFromUrl = searchParams.get("size")
    const sizeTitle = product.options.find((o) => o.title.trim().toLowerCase().includes("size"))?.title
    if (sizeFromUrl && sizeTitle) {
      const forSize = variants.filter((v) => v.options[sizeTitle] === sizeFromUrl)
      const match = forSize.find(buyable) ?? forSize[0]
      if (match) return { ...match.options }
    }
    return { ...(variants.find(buyable) ?? variants[0])?.options }
  })
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const lock = useRef(false)
  const { isSaved, toggle: toggleWishlist } = useWishlist()
  const saved = isSaved(product.id)

  const handleWishlist = async () => {
    try {
      const addedToWishlist = await toggleWishlist(product.id)
      if (addedToWishlist) {
        toast.success(`Saved ${product.title} to your wishlist`)
      } else {
        toast.info(`Removed ${product.title} from wishlist`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "We couldn't update your wishlist.")
    }
  }

  const selected = useMemo(() => variants.find((v) => matches(v, options)), [variants, options])
  const inStock = !!selected && buyable(selected)

  const selectOption = (title: string, value: string) => {
    const nextOptions = { ...options, [title]: value }
    setOptions(nextOptions)
    const nextVariant = variants.find((v) => matches(v, nextOptions))
    const params = new URLSearchParams(searchParams.toString())
    if (nextVariant?.id) {
      params.set("v_id", nextVariant.id)
    } else {
      params.delete("v_id")
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

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
      await addToCart({ variantId: selected.id, quantity: 1, countryCode })
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

  const label = adding
    ? "Adding..."
    : added
      ? "Added to bag"
      : !selected
        ? "Unavailable"
        : inStock
          ? "Add to bag"
          : "Out of stock"

  const discountPercent =
    selected?.compareAtPrice != null && price !== null && selected.compareAtPrice > price
      ? Math.round(((selected.compareAtPrice - price) / selected.compareAtPrice) * 100)
      : null

  return (
    <form
      id="product-form"
      method="post"
      action={`/${countryCode}/cart/add`}
      onSubmit={submit}
      className="flex flex-col gap-5"
      data-testid="product-actions"
    >
      <input type="hidden" name="handle" value={product.handle} />
      <input type="hidden" name="variant_id" value={selected?.id ?? ""} />
      <input type="hidden" name="quantity" value={1} />

      {/* Rating */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 border border-border px-2 py-1 text-xs font-semibold">
          <span>4.3</span>
          <Icon name="star" size={11} fill="currentColor" strokeWidth={0} aria-hidden className="text-success" />
          <span className="text-muted-foreground font-normal">|</span>
          <span className="text-muted-foreground font-medium">1.2k Ratings</span>
        </div>
      </div>

      {/* Price */}
      <div className="flex flex-col gap-1 border-b border-border/60 pb-4" data-testid="product-price">
        <div className="flex flex-wrap items-baseline gap-2 tabular-nums">
          {price !== null ? (
            <>
              <span className="text-2xl font-bold tracking-tight" data-testid="product-price-value">
                {formatMoney(price, currency)}
              </span>
              {onSale && (
                <span className="text-sm text-muted-foreground line-through" data-testid="original-product-price">
                  MRP {formatMoney(selected!.compareAtPrice, currency)}
                </span>
              )}
              {discountPercent && (
                <span className="text-sm font-semibold text-success">({discountPercent}% OFF)</span>
              )}
            </>
          ) : product.priceRange ? (
            <span className="text-2xl font-bold tracking-tight">
              <span className="text-sm font-normal text-muted-foreground">From </span>
              {formatMoney(product.priceRange.min, currency)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Price unavailable in your region</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Inclusive of all taxes</p>
      </div>

      {/* Size / options */}
      {variants.length > 1 &&
        product.options.map((option) => (
          <fieldset key={option.title} className="flex flex-col gap-3" data-testid="product-options">
            <legend className="flex w-full items-center justify-between text-sm font-bold">
              <span>
                Select {option.title}
                {options[option.title] ? (
                  <span className="font-normal text-muted-foreground"> {options[option.title]}</span>
                ) : null}
              </span>
              {option.title.toLowerCase() === "size" && (
                <span className="text-xs font-semibold uppercase tracking-wide text-secondary">SIZE CHART</span>
              )}
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const checked = options[option.title] === value
                const available = valueAvailable(option.title, value)
                return (
                  <label
                    key={value}
                    className={cn(
                      "relative inline-flex size-12 cursor-pointer items-center justify-center border text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface-container-lowest text-foreground hover:border-primary",
                      !available && !checked && "opacity-40 line-through"
                    )}
                  >
                    <input
                      type="radio"
                      name={`options[${option.title}]`}
                      value={value}
                      checked={checked}
                      onChange={() => selectOption(option.title, value)}
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

      <p className="text-xs" aria-live="polite" data-testid="product-availability">
        {!selected ? (
          <span className="text-muted-foreground">This combination isn&apos;t available.</span>
        ) : inStock ? (
          <span className="font-medium text-success">In stock</span>
        ) : (
          <span className="font-medium text-destructive">Out of stock</span>
        )}
      </p>

      {/* CTAs — immediately after size, like Myntra */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="submit"
          size="lg"
          className="h-12 gap-2"
          disabled={!inStock || adding}
          aria-busy={adding}
          data-testid="add-product-button"
        >
          {adding ? (
            <Loader2Icon className="animate-spin" aria-hidden />
          ) : added ? (
            <CheckIcon aria-hidden />
          ) : (
            <ShoppingBagIcon aria-hidden />
          )}
          {label}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleWishlist}
          aria-pressed={saved}
          data-testid="product-wishlist-button"
          className={cn(
            "h-12 gap-2 border-border bg-surface-container-lowest",
            saved && "border-[#913b94]/50 text-[#913b94] hover:bg-[#913b94]/5 hover:text-[#913b94]"
          )}
        >
          <HeartIcon className={cn(saved && "fill-[#913b94] text-[#913b94]")} aria-hidden />
          {saved ? "Wishlisted" : "Wishlist"}
        </Button>
      </div>

      {/* Delivery */}
      <div className="flex flex-col gap-3 border-t border-border/60 pt-5">
        <div className="flex items-center gap-2 text-sm font-bold">
          <TruckIcon className="size-4" aria-hidden />
          Delivery Options
        </div>
        <div className="flex items-stretch border border-border">
          <input
            type="text"
            maxLength={6}
            inputMode="numeric"
            placeholder="Enter pincode"
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-11 flex-1 bg-transparent px-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (pincode.length >= 6) {
                setPincodeChecked(true)
                toast.success(`Delivery available to ${pincode}`)
              } else {
                toast.error("Enter a 6-digit pincode")
              }
            }}
            className="h-11 px-4 text-sm font-bold text-secondary transition-colors hover:bg-muted"
          >
            Check
          </button>
        </div>
        {pincodeChecked && (
          <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            <li>
              <span className="font-semibold text-foreground">Get it by Tomorrow</span> — Order within 4 hrs
            </li>
            <li>Pay on delivery available</li>
            <li>Easy 14 days return &amp; exchange</li>
          </ul>
        )}
      </div>

      {/* Best offers */}
      <div className="flex flex-col gap-2 border-t border-border/60 pt-5">
        <span className="text-sm font-bold">Best Offers</span>
        <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">Bank Offer</span> — 10% Instant Discount on select Credit Cards.
          </li>
          <li>
            <span className="font-semibold text-foreground">Coupon</span> — Extra ₹150 off on prepaid UPI.
          </li>
          <li>
            <span className="font-semibold text-foreground">Everwear Pay</span> — 5% unlimited cashback.
          </li>
        </ul>
      </div>
    </form>
  )
}
