import { sdk } from "@lib/config"
import { activateCart, hasOtherActiveCart } from "@lib/util/server-cart"
import { getRequestOrigin } from "@lib/util/site"
import { NextResponse } from "next/server"

const NO_STORE = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" }

type Params = { params: Promise<{ countryCode: string; cartId: string }> }

const isOpen = async (cartId: string) => {
  try {
    const { cart } = await sdk.store.cart.retrieve(cartId, { fields: "id,completed_at,metadata" })
    return !cart.completed_at && cart.metadata?.ucp_canceled !== true
  } catch {
    return false
  }
}

const expired = () =>
  new NextResponse("This cart link has expired", { status: 410, headers: NO_STORE })

/**
 * UCP checkout `continue_url`: hands an agent-built cart to the buyer.
 * If the visitor already has a different bag with items, ask before
 * replacing it instead of switching silently.
 */
export async function GET(request: Request, { params }: Params) {
  const { countryCode, cartId } = await params
  if (!(await isOpen(cartId))) return expired()

  const origin = getRequestOrigin(request)
  if (await hasOtherActiveCart(cartId)) {
    return NextResponse.redirect(
      `${origin}/${countryCode}/cart/resume/${encodeURIComponent(cartId)}/confirm`,
      { status: 303, headers: NO_STORE }
    )
  }

  await activateCart(cartId)
  return NextResponse.redirect(`${origin}/${countryCode}/checkout`, { status: 303, headers: NO_STORE })
}

/** The shopper confirmed on the /confirm page that this cart should replace their bag. */
export async function POST(request: Request, { params }: Params) {
  const { countryCode, cartId } = await params
  const origin = getRequestOrigin(request)

  // Only accept the form from this site.
  const from = request.headers.get("origin")
  if (from && from !== origin) {
    return new NextResponse("Forbidden", { status: 403, headers: NO_STORE })
  }
  if (!(await isOpen(cartId))) return expired()

  await activateCart(cartId)
  return NextResponse.redirect(`${origin}/${countryCode}/checkout`, { status: 303, headers: NO_STORE })
}
