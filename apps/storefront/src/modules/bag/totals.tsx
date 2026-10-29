import { formatMoney } from "@/components/store/money"
import { HttpTypes } from "@medusajs/types"

/** Cart or order totals exactly as the backend calculated them. */
export function Totals({
  totals,
  showShipping = true,
}: {
  totals: Pick<
    HttpTypes.StoreCart,
    "currency_code" | "total" | "item_subtotal" | "shipping_subtotal" | "discount_total" | "tax_total"
  > & { shipping_methods?: unknown[] | null }
  showShipping?: boolean
}) {
  const c = totals.currency_code
  const shippingKnown = (totals.shipping_methods?.length ?? 0) > 0

  return (
    <dl className="flex flex-col gap-2.5 text-sm" data-testid="cart-totals">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="tabular-nums" data-testid="cart-subtotal" data-value={totals.item_subtotal ?? 0}>
          {formatMoney(totals.item_subtotal, c)}
        </dd>
      </div>
      {!!totals.discount_total && (
        <div className="flex justify-between text-success-foreground">
          <dt>Discount</dt>
          <dd className="tabular-nums" data-testid="cart-discount" data-value={totals.discount_total}>
            &minus;{formatMoney(totals.discount_total, c)}
          </dd>
        </div>
      )}
      {showShipping && (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd className="tabular-nums" data-testid="cart-shipping" data-value={totals.shipping_subtotal ?? 0}>
            {shippingKnown ? formatMoney(totals.shipping_subtotal, c) : "Calculated at checkout"}
          </dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Taxes</dt>
        <dd className="tabular-nums" data-testid="cart-taxes" data-value={totals.tax_total ?? 0}>
          {formatMoney(totals.tax_total, c)}
        </dd>
      </div>
      <div className="mt-2 flex items-baseline justify-between border-t pt-4">
        <dt className="font-medium">Total</dt>
        <dd className="text-xl font-semibold tabular-nums" data-testid="cart-total" data-value={totals.total ?? 0}>
          {formatMoney(totals.total, c)}
        </dd>
      </div>
    </dl>
  )
}
