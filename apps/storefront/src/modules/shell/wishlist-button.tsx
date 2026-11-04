"use client"

import { useWishlist } from "@lib/util/wishlist"
import { HeartIcon } from "lucide-react"
import { HeaderAction } from "./header-action"

export function WishlistButton() {
  const { count } = useWishlist()
  return <HeaderAction href="/account/wishlist" icon={HeartIcon} label="Wishlist" count={count} />
}
