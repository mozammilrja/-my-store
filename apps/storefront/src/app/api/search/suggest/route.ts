import { getSearchSuggestions } from "@lib/data/search"
import { NextRequest, NextResponse } from "next/server"

/**
 * Type-ahead suggestions. A GET (not a server action) so keystrokes can be
 * cancelled and never hold up the navigation that submitting the search starts.
 * Catalog data only, so it may be cached briefly.
 */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const result = await getSearchSuggestions(p.get("q") ?? "", p.get("country") ?? "", p.get("scope") ?? undefined)
  return NextResponse.json(result, { headers: { "cache-control": "public, max-age=30, s-maxage=60" } })
}
