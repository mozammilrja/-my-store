import { formatMoney } from "@lib/money"
import type { Totals as TotalsData } from "@lib/api/types"

/** Cart or order totals exactly as the API calculated them. */
export function Totals({
  totals,
  currency,
  shippingChosen,
}: {
  totals: TotalsData
  currency: string
  /** False before a delivery option is picked: shipping shows as "at checkout". */
  shippingChosen: boolean
}) {
  return (
    <dl className="flex flex-col gap-2.5 text-sm" data-testid="cart-totals">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="tabular-nums" data-testid="cart-subtotal" data-value={totals.itemSubtotal}>
          {formatMoney(totals.itemSubtotal, currency)}
        </dd>
      </div>
      {totals.discountTotal > 0 && (
        <div className="flex justify-between text-success-foreground">
          <dt>Discount</dt>
          <dd className="tabular-nums" data-testid="cart-discount" data-value={totals.discountTotal}>
            &minus;{formatMoney(totals.discountTotal, currency)}
          </dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Shipping</dt>
        <dd className="tabular-nums" data-testid="cart-shipping" data-value={totals.shippingTotal}>
          {shippingChosen ? formatMoney(totals.shippingTotal, currency) : "Calculated at checkout"}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Taxes</dt>
        <dd className="tabular-nums" data-testid="cart-taxes" data-value={totals.taxTotal}>
          {formatMoney(totals.taxTotal, currency)}
        </dd>
      </div>
      <div className="mt-2 flex items-baseline justify-between border-t pt-4">
        <dt className="font-medium">Total</dt>
        <dd className="text-xl font-semibold tabular-nums" data-testid="cart-total" data-value={totals.total}>
          {formatMoney(totals.total, currency)}
        </dd>
      </div>
    </dl>
  )
}
