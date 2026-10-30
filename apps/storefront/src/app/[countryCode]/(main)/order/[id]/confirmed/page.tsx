import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import { retrieveOrder } from "@lib/data/account"
import { OrderView } from "@modules/account/order-view"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { CheckCircle2Icon } from "lucide-react"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } }

export default async function OrderConfirmed(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const order = await retrieveOrder(id)
  if (!order) notFound()

  return (
    <Container className="flex max-w-4xl flex-col gap-10 py-14" data-testid="order-complete-container">
      <div className="flex flex-col gap-4">
        <CheckCircle2Icon className="size-10 text-success" aria-hidden />
        <h1 className="font-display-hero text-4xl sm:text-5xl font-light tracking-tight">Thank you!</h1>
        <p className="max-w-xl text-muted-foreground">
          Your order <span className="font-semibold text-foreground">#{order.displayId}</span> is placed. You&apos;ll pay in
          cash when it&apos;s delivered. We&apos;ll use <span className="font-semibold text-foreground" data-testid="order-email">{order.email}</span> if we
          need to reach you about it.
        </p>
      </div>
      <OrderView order={order} />
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <LocalizedClientLink href="/store">Continue shopping</LocalizedClientLink>
        </Button>
        <Button asChild size="lg" variant="outline">
          <LocalizedClientLink href="/account/orders">Your orders</LocalizedClientLink>
        </Button>
      </div>
    </Container>
  )
}
