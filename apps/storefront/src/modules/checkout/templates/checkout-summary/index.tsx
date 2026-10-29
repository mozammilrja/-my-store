import { formatMoney } from "@/components/store/money"
import { HttpTypes } from "@medusajs/types"
import { PromoCode } from "@modules/bag/promo-code"
import { Totals } from "@modules/bag/totals"
import Image from "next/image"

/** Order summary beside the checkout steps: items, promotion codes and backend totals. */
const CheckoutSummary = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const items = [...(cart.items ?? [])].sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1))

  return (
    <aside aria-label="Order summary" className="flex flex-col gap-6 border bg-card p-6 lg:sticky lg:top-8">
      <h2 className="font-display-tight text-3xl">Order summary</h2>
      <ul className="flex max-h-80 flex-col gap-4 overflow-y-auto" data-testid="items-table">
        {items.map((item) => (
          <li key={item.id} className="grid grid-cols-[4rem_1fr_auto] gap-3 text-sm" data-testid="product-row">
            <div className="relative aspect-[4/5] overflow-hidden bg-muted">
              {item.thumbnail && <Image src={item.thumbnail} alt="" fill sizes="64px" className="object-cover" />}
              <span className="absolute top-0 right-0 bg-foreground px-1.5 text-[11px] text-background tabular-nums">
                {item.quantity}
              </span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium" data-testid="product-title">{item.product_title ?? item.title}</span>
              {item.variant_title && <span className="text-muted-foreground">{item.variant_title}</span>}
            </div>
            <span className="tabular-nums">{formatMoney(item.total, cart.currency_code)}</span>
          </li>
        ))}
      </ul>
      <PromoCode cart={cart} />
      <Totals totals={cart} />
    </aside>
  )
}

export default CheckoutSummary
