import type { Cart } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import { PromoCode } from "@modules/bag/promo-code"
import { Totals } from "@modules/bag/totals"
import Image from "next/image"

/** Order summary beside the checkout steps: items, promotion codes and API totals. */
export function CheckoutSummary({ cart }: { cart: Cart }) {
  return (
    <aside aria-label="Order summary" className="flex flex-col gap-6 rounded-xl border border-stone-200/80 bg-card p-6 lg:sticky lg:top-8">
      <h2 className="font-headline-sm text-2xl font-normal tracking-tight">Order summary</h2>
      <ul className="flex max-h-80 flex-col gap-4 overflow-y-auto" data-testid="items-table">
        {[...cart.items].reverse().map((item) => (
          <li key={item.id} className="grid grid-cols-[4rem_1fr_auto] gap-3 text-sm" data-testid="product-row">
            <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-surface">
              {item.thumbnail && <Image src={item.thumbnail} alt="" fill sizes="64px" className="object-cover" />}
              <span className="absolute top-0 right-0 bg-foreground px-1.5 text-[11px] text-background tabular-nums">{item.quantity}</span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium" data-testid="product-title">{item.productTitle}</span>
              <span className="text-muted-foreground">{item.variantTitle}</span>
            </div>
            <span className="tabular-nums">{formatMoney(item.total, cart.currency)}</span>
          </li>
        ))}
      </ul>
      <PromoCode cart={cart} />
      <Totals totals={cart.totals} currency={cart.currency} shippingChosen={!!cart.shippingOptionId} />
    </aside>
  )
}
