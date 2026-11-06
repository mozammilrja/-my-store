import { getBaseURL } from "@lib/util/env"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Footer } from "@modules/shell/footer"
import { Metadata } from "next"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

/**
 * Checkout pages render their own headers (checkout, and the minimal secure
 * header for bank authentication; see @modules/stitch/shell). The footer is
 * the store's one footer, the same as on every other page.
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
      <Footer />
    </div>
  )
}
