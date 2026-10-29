"use server"

import { listProducts } from "./catalog"

export type SearchHit = { id: string; handle: string; title: string; thumbnail: string | null }

/** Instant search for the header dialog: top matches for a query in a country. */
export async function searchProducts(query: string, countryCode: string): Promise<SearchHit[]> {
  const q = query.trim().slice(0, 100)
  if (!q || !/^[a-z]{2}$/i.test(countryCode)) return []
  const { products } = await listProducts({ country: countryCode, q, limit: 8 })
  return products.map((p) => ({ id: p.id, handle: p.handle, title: p.title, thumbnail: p.thumbnail }))
}
