import "server-only"
import { retrieveCart } from "@lib/data/shop"

/** Items in the visitor's bag, for the header badge's first paint. 0 on any failure. */
export async function bagCount(): Promise<number> {
  const cart = await retrieveCart().catch(() => null)
  return cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0
}
