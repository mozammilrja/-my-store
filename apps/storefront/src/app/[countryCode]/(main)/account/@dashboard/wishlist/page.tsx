import { retrieveCustomer } from "@lib/data/account"
import { listProducts } from "@lib/data/catalog"
import { WishlistView } from "@modules/account/wishlist-view"
import { Metadata } from "next"

export const metadata: Metadata = { title: "My Wishlist | Everwear Atelier", robots: { index: false } }

export default async function WishlistPage(props: { params: Promise<{ countryCode: string }> }) {
  const { countryCode } = await props.params
  const customer = await retrieveCustomer()
  if (!customer) return null

  const { products } = await listProducts({ country: countryCode, limit: 20 }).catch(() => ({ products: [] }))

  return (
    <div data-testid="wishlist-page">
      <WishlistView catalogProducts={products} />
    </div>
  )
}
