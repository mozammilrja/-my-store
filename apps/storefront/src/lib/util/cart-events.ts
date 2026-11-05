export const CART_UPDATED_EVENT = "everwear:cart-updated"

/** What client UI needs to know about the bag. */
export type BagSnapshot = { count: number; variantIds: string[] }

let inFlight: Promise<BagSnapshot | null> | null = null

/**
 * Reads the bag from /api/bag. Concurrent callers (the header and a product
 * panel mounting together) share one request.
 */
export const fetchBag = (): Promise<BagSnapshot | null> => {
  inFlight ??= fetch("/api/bag", { cache: "no-store", credentials: "same-origin" })
    .then((r) => (r.ok ? (r.json() as Promise<BagSnapshot>) : null))
    .catch(() => null)
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

/**
 * Tells client bag UI that the bag changed. Pass the new bag when the change
 * already returned it, so listeners update without another request.
 */
export const notifyCartUpdated = (bag?: BagSnapshot | null) => {
  window.dispatchEvent(new CustomEvent<BagSnapshot | null>(CART_UPDATED_EVENT, { detail: bag ?? null }))
}

/** Subscribes to bag changes; the callback gets the new bag, fetching it if the event carried none. */
export const onCartUpdated = (cb: (bag: BagSnapshot) => void) => {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<BagSnapshot | null>).detail
    if (detail) cb(detail)
    else void fetchBag().then((b) => b && cb(b))
  }
  window.addEventListener(CART_UPDATED_EVENT, handler)
  return () => window.removeEventListener(CART_UPDATED_EVENT, handler)
}
