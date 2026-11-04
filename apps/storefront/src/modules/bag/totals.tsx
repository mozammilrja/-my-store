import { formatMoney } from "@lib/money"
import type { Totals as TotalsData } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export function Totals({
  totals,
  currency,
  shippingChosen,
  promoCodes = [],
  checkoutStep = "address",
}: {
  totals: TotalsData
  currency: string
  shippingChosen: boolean
  promoCodes?: string[]
  checkoutStep?: string
}) {
  const isFreeDelivery = totals.shippingTotal === 0 && shippingChosen

  return (
    <div className="flex flex-col gap-space-lg" data-testid="cart-totals">
      {/* Order Summary Box */}
      <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-surface-container-high/60 flex flex-col gap-space-md">
        <span className="font-headline-sm text-headline-sm text-primary font-medium pb-space-xs border-b border-surface-container-highest">
          Order Summary
        </span>

        <div className="flex flex-col gap-2.5 text-[14px]">
          {/* Bag Subtotal */}
          <div className="flex justify-between text-on-surface-variant">
            <span>Bag Total</span>
            <span
              className="text-on-surface font-medium tabular-nums"
              data-testid="cart-subtotal"
              data-value={totals.itemSubtotal}
            >
              {formatMoney(totals.itemSubtotal, currency)}
            </span>
          </div>

          {/* Discount Total */}
          {totals.discountTotal > 0 && (
            <div className="flex justify-between text-secondary">
              <span>Atelier Privilege Discount</span>
              <span
                className="font-semibold tabular-nums"
                data-testid="cart-discount"
                data-value={totals.discountTotal}
              >
                &minus;{formatMoney(totals.discountTotal, currency)}
              </span>
            </div>
          )}

          {/* Promo Code line if applied */}
          {promoCodes.length > 0 && (
            <div className="flex justify-between text-on-surface-variant">
              <span>Applied Promo ({promoCodes.join(", ")})</span>
              <span className="text-secondary font-medium">Applied</span>
            </div>
          )}

          {/* Delivery / Shipping Charges */}
          <div className="flex justify-between text-on-surface-variant">
            <span>Delivery (Standard Logistics)</span>
            <span
              className={`tabular-nums ${
                isFreeDelivery
                  ? "font-semibold text-secondary"
                  : shippingChosen
                    ? "font-medium text-on-surface"
                    : "text-on-surface-variant"
              }`}
              data-testid="cart-shipping"
              data-value={totals.shippingTotal}
            >
              {isFreeDelivery
                ? "Free"
                : shippingChosen
                ? formatMoney(totals.shippingTotal, currency)
                : "Calculated at checkout"}
            </span>
          </div>

          {/* Taxes */}
          <div className="flex justify-between text-on-surface-variant">
            <span>Estimated Taxes</span>
            <span
              className="text-on-surface font-medium tabular-nums"
              data-testid="cart-taxes"
              data-value={totals.taxTotal}
            >
              {totals.taxTotal > 0 ? formatMoney(totals.taxTotal, currency) : "Inclusive"}
            </span>
          </div>
        </div>

        {/* Divider & Total Amount to Pay */}
        <div className="pt-space-md border-t border-surface-container-highest flex items-end justify-between gap-4">
          <div>
            <span className="block text-[16px] font-semibold text-primary">Total Amount</span>
            <span className="mt-0.5 block text-[12px] text-on-surface-variant">
              Inclusive of all applicable taxes
            </span>
          </div>
          <div className="text-right">
            <span
              className="text-[24px] font-semibold leading-none text-primary tabular-nums"
              data-testid="cart-total"
              data-value={totals.total}
            >
              {formatMoney(totals.total, currency)}
            </span>
          </div>
        </div>

        {/* Primary Checkout CTA */}
        <LocalizedClientLink
          href={`/checkout?step=${checkoutStep}`}
          className="w-full h-14 bg-primary text-on-primary font-label-md text-label-md uppercase tracking-widest rounded-lg hover:bg-inverse-surface transition-all flex items-center justify-center gap-space-sm mt-space-sm shadow-md cursor-pointer font-semibold"
          data-testid="checkout-button"
        >
          <span>Proceed to Secure Checkout</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </LocalizedClientLink>

        {/* Secure Reassurance footer */}
        <div className="flex flex-col items-center justify-center gap-space-xs pt-space-xs text-center">
          <div className="flex items-center gap-space-md text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            <span className="material-symbols-outlined text-[18px]">sync_alt</span>
            <span className="material-symbols-outlined text-[18px]">support_agent</span>
          </div>
          <p className="font-body-sm text-xs text-on-surface-variant">
            14-day hassle-free returns &amp; easy door-step exchanges.
          </p>
        </div>
      </div>

      {/* 3-Column Trust Badges Strip */}
      <div className="grid grid-cols-3 gap-space-sm text-center p-space-md bg-surface-container-low rounded-xl border border-surface-container-high/60">
        <div className="flex flex-col items-center gap-space-xs">
          <span className="material-symbols-outlined text-[20px] text-primary">local_shipping</span>
          <span className="font-label-sm text-label-sm text-on-surface font-semibold">Express Dispatch</span>
        </div>
        <div className="flex flex-col items-center gap-space-xs border-x border-outline-variant/30">
          <span className="material-symbols-outlined text-[20px] text-primary">verified</span>
          <span className="font-label-sm text-label-sm text-on-surface font-semibold">100% Genuine</span>
        </div>
        <div className="flex flex-col items-center gap-space-xs">
          <span className="material-symbols-outlined text-[20px] text-primary">workspace_premium</span>
          <span className="font-label-sm text-label-sm text-on-surface font-semibold">Atelier Curated</span>
        </div>
      </div>
    </div>
  )
}
