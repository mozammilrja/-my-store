import { retrieveCart } from "@lib/data/shop"
import { NextResponse } from "next/server"

/**
 * The visitor's bag in brief, for client UI (header badge, "Go to bag" on a
 * product). A GET route rather than a server action: server actions run one
 * at a time and navigations queue behind them, so reading the bag through
 * one held up the next click.
 */
export async function GET() {
  const cart = await retrieveCart().catch(() => null)
  return NextResponse.json(
    {
      count: cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0,
      variantIds: cart?.items.map((i) => i.variantId) ?? [],
    },
    { headers: { "cache-control": "private, no-store" } }
  )
}
