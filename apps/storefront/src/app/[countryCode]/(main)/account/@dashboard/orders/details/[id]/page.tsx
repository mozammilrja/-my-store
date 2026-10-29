import { retrieveOrder } from "@lib/data/account"
import { OrderView } from "@modules/account/order-view"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowLeftIcon } from "lucide-react"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = { title: "Order details", robots: { index: false } }

export default async function OrderDetailsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const order = await retrieveOrder(id)
  if (!order) notFound()
  return (
    <div className="flex flex-col gap-8" data-testid="order-details-container">
      <LocalizedClientLink href="/account/orders" className="inline-flex w-fit items-center gap-2 text-sm hover:underline">
        <ArrowLeftIcon className="size-4" aria-hidden /> All orders
      </LocalizedClientLink>
      <h1 className="font-display-tight text-6xl">Order #{order.displayId}</h1>
      <OrderView order={order} />
    </div>
  )
}
