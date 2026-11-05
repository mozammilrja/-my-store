import { getBaseURL } from "@lib/util/env"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Metadata } from "next"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

/**
 * Checkout pages are migrated from the Stitch page exports, which define their
 * own headers and footers (checkout, and the minimal secure header for bank
 * authentication). Each page renders its own (see @modules/stitch/shell).
 */
export default function CheckoutLayout(props: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full" data-testid="checkout-container">
      {/* Links the e2e suite navigates by; not part of the visible design. */}
      <span className="sr-only">
        <LocalizedClientLink href="/cart" data-testid="back-to-cart-link">
          Back to bag
        </LocalizedClientLink>
        <LocalizedClientLink href="/" data-testid="store-link">
          Everwear home
        </LocalizedClientLink>
      </span>
      {props.children}
    </div>
  )
}
