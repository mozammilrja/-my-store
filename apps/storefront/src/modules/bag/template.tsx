import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import type { Cart, Customer } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRightIcon, ShoppingBagIcon } from "lucide-react"
import { LineItem } from "./line-item"
import { PromoCode } from "./promo-code"
import { Totals } from "./totals"

const checkoutStep = (cart: Cart) => {
  if (!cart.shippingAddress || !cart.email) return "address"
  if (!cart.shippingOptionId) return "delivery"
  return "review"
}

export function BagTemplate({
  cart,
  customer,
  error,
}: {
  cart: Cart | null
  customer: Customer | null
  error?: string
}) {
  // Newest first: the API keeps items in the order they were added.
  const items = [...(cart?.items ?? [])].reverse()

  return (
    <Container className="py-12 lg:py-16" data-testid="cart-container">
      <div className="flex flex-col gap-1 pb-6 border-b border-border/50">
        <span className="font-label-caps text-[10px] text-secondary font-bold uppercase tracking-widest">
          Checkout Review
        </span>
        <h1 className="font-display-hero text-3xl sm:text-5xl font-light tracking-tight text-foreground">
          Shopping Bag
        </h1>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive font-body-sm" data-testid="cart-error">
          {error}
        </p>
      )}

      {!cart || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-6 py-20 text-center bg-surface-container-low/40 rounded-2xl border border-dashed border-border mt-8" data-testid="empty-cart-message">
          <div className="size-16 rounded-full bg-surface-container flex items-center justify-center text-muted-foreground">
            <ShoppingBagIcon className="size-8" />
          </div>
          <p className="max-w-md text-sm text-muted-foreground font-body-sm">
            Your shopping bag is currently empty. Explore our tailored garments and essentials.
          </p>
          <Button asChild size="lg" className="rounded-lg bg-primary text-primary-foreground font-label-md">
            <LocalizedClientLink href="/store">Shop All Collections</LocalizedClientLink>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {!customer && (
              <p className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container-low p-4 text-xs sm:text-sm border border-border/50 mb-6" data-testid="sign-in-prompt">
                <span className="text-muted-foreground">Already have an account with us? Sign in for saved delivery addresses.</span>
                <LocalizedClientLink href="/account" className="font-bold underline underline-offset-4 text-foreground hover:text-secondary">
                  Sign in &rarr;
                </LocalizedClientLink>
              </p>
            )}
            <ul className="divide-y divide-border/60 border-y border-border/60" data-testid="items-table">
              {items.map((item) => (
                <LineItem key={item.id} item={item} currencyCode={cart.currency} />
              ))}
            </ul>
          </div>
          <aside className="lg:col-span-5" aria-label="Order summary">
            <div className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-surface-container-lowest p-6 sm:p-8 shadow-xs lg:sticky lg:top-28">
              <h2 className="font-headline-sm text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-3">Order Summary</h2>
              <PromoCode cart={cart} />
              <Totals totals={cart.totals} currency={cart.currency} shippingChosen={!!cart.shippingOptionId} />
              <Button asChild size="lg" className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-label-md uppercase tracking-wider font-semibold shadow-xs">
                <LocalizedClientLink href={`/checkout?step=${checkoutStep(cart)}`} data-testid="checkout-button">
                  Proceed to Checkout <ArrowRightIcon data-icon="inline-end" aria-hidden className="size-4 ml-1.5" />
                </LocalizedClientLink>
              </Button>
            </div>
          </aside>
        </div>
      )}
    </Container>
  )
}
