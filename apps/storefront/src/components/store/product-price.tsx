import { cn } from "@/lib/utils"
import { formatMoney } from "@lib/money"

/** Myntra-style card price: "₹2,790", not "₹2,790.00". Paise are kept when present. */
const cardMoney = (amount: number, currency: string) =>
  formatMoney(amount, currency).replace(/[.,]00(?=\D*$)/, "")

type ProductPriceProps = {
  price: number | null
  compareAtPrice: number | null
  discountPercent: number | null
  currency: string
  /** Variants differ in price, so the quoted figure is a starting point. */
  priceVaries?: boolean
  className?: string
}

/**
 * Price, MRP and saving, in the order a shopper reads them:
 * "Rs. 354  Rs. 999  (65% OFF)". The saving is only shown when the MRP is
 * genuinely higher, which the API guarantees by nulling it otherwise.
 */
export function ProductPrice({
  price,
  compareAtPrice,
  discountPercent,
  currency,
  priceVaries = false,
  className,
}: ProductPriceProps) {
  if (price === null) {
    return (
      <div
        className={cn(
          "cursor-default text-[13px] text-muted-foreground",
          className
        )}
      >
        Price unavailable
      </div>
    )
  }

  const discounted = compareAtPrice !== null && compareAtPrice > price

  return (
    <div
      className={cn(
        "flex cursor-default flex-wrap items-baseline gap-x-1.5 gap-y-0.5 tabular-nums",
        className
      )}
      data-testid="price"
    >
      <span className="text-[14px] font-bold text-foreground">
        {priceVaries ? <span className="sr-only">From </span> : null}
        {cardMoney(price, currency)}
      </span>

      {discounted && (
        <>
          <span
            className="text-[12px] text-muted-foreground line-through"
            data-testid="original-price"
          >
            {cardMoney(compareAtPrice, currency)}
          </span>
          {discountPercent !== null && (
            <span
              className="text-[12px] font-semibold text-[#ff905a]"
              data-testid="discount-percent"
            >
              ({discountPercent}% OFF)
            </span>
          )}
        </>
      )}
    </div>
  )
}
