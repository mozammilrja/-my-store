import { retrieveCustomer } from "@lib/data/account"
import { getWishlistProducts } from "@lib/data/wishlist"
import { WishlistView } from "@modules/account/wishlist-view"
import { Metadata } from "next"

export const metadata: Metadata = { title: "My Wishlist | Everwear Atelier", robots: { index: false } }

export default async function WishlistPage(props: { params: Promise<{ countryCode: string }> }) {
  await props.params
  const customer = await retrieveCustomer()
  if (!customer) return null

  const products = await getWishlistProducts()

  return (
    <div data-testid="wishlist-page">
      <WishlistView catalogProducts={products} />
    </div>
  )
}
