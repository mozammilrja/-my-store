import "server-only"
import { api } from "../api/client"

/** What couriers say about delivering to a pincode. `configured: false` when the store has no courier integration. */
export type Serviceability =
  | { configured: false }
  | { configured: true; serviceable: boolean; codAvailable: boolean; fastestDays: number | null; slowestDays: number | null }

export async function checkServiceability(pincode: string, cod = false): Promise<Serviceability | null> {
  if (!/^\d{6}$/.test(pincode)) return null
  try {
    return await api<Serviceability>("/store/shipping/serviceability", { query: { pincode, cod: String(cod) }, cache: { revalidate: 600, tags: ["serviceability"] } })
  } catch {
    // The courier API being down must not block checkout; the region's options still apply.
    return null
  }
}
