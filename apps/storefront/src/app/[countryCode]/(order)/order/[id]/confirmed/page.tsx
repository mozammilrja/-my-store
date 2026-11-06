import type { Product } from "@lib/api/types"
import { retrieveOrder } from "@lib/data/account"
import { getProduct, getRegion, getStorePolicies } from "@lib/data/catalog"
import OrderConfirmedTemplate from "@modules/order/confirmed/template"
import { OrderHeader, StitchPage } from "@modules/stitch/shell"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Your Order | Everwear",
  robots: { index: false },
}

/**
 * Order confirmation, from the Stitch export
 * storefront_order_confirmed_consignment_tracking. Readable by the signed-in
 * customer who owns the order or by the guest whose order-access cookie was
 * set when it was placed; anyone else gets a 404.
 */
export default async function OrderConfirmed(props: { params: Promise<{ countryCode: string; id: string }> }) {
  const { countryCode, id } = await props.params
  const order = await retrieveOrder(id)
  if (!order) notFound()

  const handles = [...new Set(order.items.map((i) => i.productHandle).filter(Boolean))]
  const [entries, { current: policies }, region] = await Promise.all([
    Promise.all(handles.map(async (h) => [h, await getProduct(h, countryCode).catch(() => null)] as const)),
    getStorePolicies(countryCode).catch(() => ({ current: null })),
    getRegion(order.shippingAddress.countryCode || countryCode).catch(() => null),
  ])
  const products: Record<string, Product | null> = Object.fromEntries(entries)

  return (
    <StitchPage>
      <OrderHeader />
      <main className="w-full bg-surface min-h-[calc(100vh-20rem)]">
        <OrderConfirmedTemplate order={order} products={products} policies={policies} region={region} />
      </main>
    </StitchPage>
  )
}
