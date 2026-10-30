"use server"

import { api } from "@lib/api/client"
import { listProducts } from "./catalog"

export type SearchSuggestion = {
  text: string
  type: "query" | "category"
  categoryHandle?: string
}

export type SearchHit = {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  price?: number | null
  currency?: string
}

export type SuggestionResult = {
  query: string
  suggestions: SearchSuggestion[]
  products: SearchHit[]
}

/** Instant search suggestions inspired by Myntra type-ahead */
export async function getSearchSuggestions(
  query: string,
  countryCode: string,
  scope?: string
): Promise<SuggestionResult> {
  const q = query.trim().slice(0, 100)
  if (!q || !/^[a-z]{2}$/i.test(countryCode)) {
    return { query: q, suggestions: [], products: [] }
  }

  try {
    const res = await api<SuggestionResult>("/store/search/suggest", {
      query: { country: countryCode, q, scope, limit: 6 },
      cache: { revalidate: 60, tags: ["catalog"] },
    })
    return res
  } catch {
    // Graceful fallback to listProducts if suggest endpoint is unreachable
    const { products } = await listProducts({ country: countryCode, q, limit: 4 })
    return {
      query: q,
      suggestions: products.map((p) => ({ text: p.title, type: "query" })),
      products: products.map((p) => ({
        id: p.id,
        handle: p.handle,
        title: p.title,
        thumbnail: p.thumbnail,
        price: p.priceRange?.min ?? null,
        currency: p.currency,
      })),
    }
  }
}

/** Instant search for the header dialog: top matches for a query in a country. */
export async function searchProducts(query: string, countryCode: string): Promise<SearchHit[]> {
  const res = await getSearchSuggestions(query, countryCode)
  return res.products
}
