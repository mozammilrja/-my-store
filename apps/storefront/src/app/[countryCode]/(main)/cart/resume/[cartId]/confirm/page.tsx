import { Button } from "@/components/ui/button"
import { StatusPage } from "@/components/store/status-page"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Switch bag?",
  robots: { index: false },
}

/** Asked when a shared checkout link would replace a bag that already has items. */
export default async function ConfirmResume({
  params,
}: {
  params: Promise<{ countryCode: string; cartId: string }>
}) {
  const { countryCode, cartId } = await params

  return (
    <StatusPage
      code="Checkout link"
      title="You already have items in your bag."
      actions={
        <>
          <form method="post" action={`/${countryCode}/cart/resume/${encodeURIComponent(cartId)}`}>
            <Button type="submit" size="lg" data-testid="confirm-switch-cart">
              Continue with the new cart
            </Button>
          </form>
          <Button asChild size="lg" variant="outline">
            <LocalizedClientLink href="/cart">Keep my bag</LocalizedClientLink>
          </Button>
        </>
      }
    >
      <p>
        This link opens a different cart. If you continue, it replaces your
        current bag for checkout. Your current bag stays as it is if you keep it.
      </p>
    </StatusPage>
  )
}
