import { getWishlist } from "@lib/data/wishlist"
import { NextResponse } from "next/server"

/** The signed-in shopper's saved product ids (or guest). A GET so page-load reads never queue behind server actions. */
export async function GET() {
  return NextResponse.json(await getWishlist(), { headers: { "cache-control": "private, no-store" } })
}
