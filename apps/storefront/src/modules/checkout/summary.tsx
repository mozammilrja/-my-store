import type { Cart } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import { PromoCode } from "@modules/bag/promo-code"
import { Totals } from "@modules/bag/totals"
import Image from "next/image"

/**
 * Stitch-designed Checkout Order Summary.
 * Matches storefront_secure_checkout_payment_gateway from stitch (5).
 */
export function CheckoutSummary({ cart }: { cart: Cart }) {
  const items = [...cart.items].reverse()
  const count = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <aside
      aria-label="Order summary"
      className="bg-surface-container-lowest shadow-[0_1px_4px_rgba(0,0,0,0.02)] rounded-xl p-space-lg flex flex-col gap-space-lg border border-surface-container-high/60 lg:sticky lg:top-28"
    >
      {/* Summary Header */}
      <div className="flex items-center justify-between pb-space-md border-b border-surface-container-high">
        <h3 className="font-headline-sm text-headline-sm text-primary font-semibold">
          Order Summary
        </h3>
        <span className="font-label-caps text-label-caps bg-secondary/10 text-secondary px-space-sm py-1 rounded-full font-bold">
          {count} {count === 1 ? "Item" : "Items"}
        </span>
      </div>

      {/* Items List */}
      <ul
        className="flex max-h-80 flex-col gap-space-md divide-y divide-surface-container-high/50 overflow-y-auto"
        data-testid="items-table"
      >
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-space-md pt-space-sm first:pt-0"
            data-testid="product-row"
          >
            <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-lg bg-surface-container-low border border-surface-container-high/60">
              {item.thumbnail ? (
                <Image
                  src={item.thumbnail}
                  alt={item.productTitle}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-on-surface-variant">
                  Piece
                </div>
              )}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold truncate">
                Everwear Atelier
              </span>
              <h4
                className="font-body-md text-sm text-on-surface font-medium truncate"
                data-testid="product-title"
              >
                {item.productTitle}
              </h4>
              <div className="flex items-center justify-between mt-1 text-xs text-on-surface-variant">
                <span>
                  {item.variantTitle ? `Variant: ${item.variantTitle} | ` : ""}Qty: {item.quantity}
                </span>
                <span className="font-label-md text-sm font-semibold text-on-surface tabular-nums">
                  {formatMoney(item.total, cart.currency)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Promo Code input */}
      <PromoCode cart={cart} />

      {/* Breakdown and totals */}
      <Totals
        totals={cart.totals}
        currency={cart.currency}
        shippingChosen={!!cart.shippingOptionId}
        promoCodes={cart.promoCodes}
      />

      {/* Reassurance strip from Stitch */}
      <div className="flex flex-col gap-space-sm pt-space-xs text-on-surface-variant border-t border-surface-container-high/60">
        <div className="flex items-center gap-space-sm font-body-sm text-xs">
          <span className="material-symbols-outlined text-[18px] text-secondary">
            verified_user
          </span>
          <span>256-bit Bank-Grade SSL Secure Encryption</span>
        </div>
        <div className="flex items-center gap-space-sm font-body-sm text-xs">
          <span className="material-symbols-outlined text-[18px] text-secondary">
            sync
          </span>
          <span>14-day hassle-free returns &amp; doorstep pickup</span>
        </div>
        <div className="flex items-center gap-space-sm font-body-sm text-xs">
          <span className="material-symbols-outlined text-[18px] text-secondary">
            workspace_premium
          </span>
          <span>100% Genuine Certified Atelier Curations</span>
        </div>
      </div>
    </aside>
  )
}
