import { Container } from "@/components/store/container"
import { Wordmark } from "@/components/store/wordmark"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowLeftIcon, LockIcon } from "lucide-react"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen w-full">
      <header className="border-b bg-background">
        <Container className="grid h-16 grid-cols-3 items-center">
          <LocalizedClientLink
            href="/cart"
            className="inline-flex items-center gap-2 text-sm hover:text-primary"
            data-testid="back-to-cart-link"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            <span className="max-sm:sr-only">Back to bag</span>
          </LocalizedClientLink>
          <LocalizedClientLink href="/" className="justify-self-center" aria-label="Everwear home" data-testid="store-link">
            <Wordmark className="text-xl" />
          </LocalizedClientLink>
          <span className="inline-flex items-center gap-1.5 justify-self-end text-xs text-muted-foreground">
            <LockIcon className="size-3.5" aria-hidden />
            <span className="max-sm:sr-only">Checkout</span>
          </span>
        </Container>
      </header>
      <div className="relative" data-testid="checkout-container">
        {children}
      </div>
    </div>
  )
}
