import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import type { Cart, Customer } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRightIcon } from "lucide-react"
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
      <h1 className="font-display-tight text-6xl sm:text-7xl">Your bag</h1>

      {error && (
        <p role="alert" className="mt-6 border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive-foreground" data-testid="cart-error">
          {error}
        </p>
      )}

      {!cart || items.length === 0 ? (
        <div className="flex flex-col items-start gap-6 py-16" data-testid="empty-cart-message">
          <p className="max-w-md text-muted-foreground">
            Your bag is empty. Everything you add will be saved here while you shop.
          </p>
          <Button asChild size="lg">
            <LocalizedClientLink href="/store">Shop all</LocalizedClientLink>
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {!customer && (
              <p className="flex flex-wrap items-center justify-between gap-3 border-y py-4 text-sm" data-testid="sign-in-prompt">
                <span className="text-muted-foreground">Have an account? Sign in to check out faster.</span>
                <LocalizedClientLink href="/account" className="font-medium underline underline-offset-4 hover:text-primary">
                  Sign in
                </LocalizedClientLink>
              </p>
            )}
            <ul className="divide-y border-b" data-testid="items-table">
              {items.map((item) => (
                <LineItem key={item.id} item={item} currencyCode={cart.currency} />
              ))}
            </ul>
          </div>
          <aside className="lg:col-span-5" aria-label="Order summary">
            <div className="flex flex-col gap-6 border bg-card p-6 lg:sticky lg:top-28">
              <h2 className="font-display-tight text-3xl">Summary</h2>
              <PromoCode cart={cart} />
              <Totals totals={cart.totals} currency={cart.currency} shippingChosen={!!cart.shippingOptionId} />
              <Button asChild size="lg" className="w-full">
                <LocalizedClientLink href={`/checkout?step=${checkoutStep(cart)}`} data-testid="checkout-button">
                  Checkout <ArrowRightIcon data-icon="inline-end" aria-hidden />
                </LocalizedClientLink>
              </Button>
            </div>
          </aside>
        </div>
      )}
    </Container>
  )
}
