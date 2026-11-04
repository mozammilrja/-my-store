import { listingHref, parseListing } from "@modules/catalog/params"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.EVERWEAR_API_URL ?? (process.env.NODE_ENV === "production" ? "http://backend:9100" : "http://localhost:9100")
const DEFAULT_REGION = (process.env.NEXT_PUBLIC_DEFAULT_REGION || "dk").toLowerCase()
const REFRESH_MS = 60 * 60 * 1000

/** Country codes the store ships to, refreshed hourly; the last good list survives outages. */
const cache = { codes: new Set<string>(), updatedAt: 0 }

async function countryCodes() {
  if (cache.codes.size && Date.now() - cache.updatedAt < REFRESH_MS) return cache.codes
  try {
    const res = await fetch(`${API_URL}/store/regions`, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error(`API returned ${res.status}`)
    const { regions } = (await res.json()) as { regions: { countries: { code: string }[] }[] }
    cache.codes = new Set(regions.flatMap((r) => r.countries.map((c) => c.code.toLowerCase())))
    cache.updatedAt = Date.now()
  } catch (error) {
    // Keep routing with what we had (or the default) so pages can show their own errors.
    console.error("proxy.ts: could not load regions:", error)
  }
  return cache.codes
}

/**
 * `/{cc}/search?q=shirt` answers on the filterable listing, Myntra-style:
 * `/{cc}/store?rawQuery=shirt`. Done here, before anything renders, so the
 * search page never flashes and no late client-side redirect races the user's
 * next click. A blank query falls through to the search page's empty state.
 */
function searchRedirect(request: NextRequest, country: string) {
  const { pathname, searchParams, origin } = request.nextUrl
  if (pathname.replace(/\/$/, "").toLowerCase() !== `/${country}/search`) return null
  const q = searchParams.get("q")?.trim().slice(0, 100)
  if (!q) return null
  const scope = searchParams.get("category")
  const target = listingHref("/store", parseListing({}), {
    q,
    categories: scope && /^[a-z0-9-]{1,100}$/.test(scope) ? [scope] : [],
  })
  return NextResponse.redirect(`${origin}/${country}${target}`, 307)
}

/**
 * Region routing: every storefront URL starts with a country code.
 * Not IP-based, so crawlers and AI agents get a stable result.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search, origin } = request.nextUrl
  if (pathname.includes(".")) return NextResponse.next()

  const codes = await countryCodes()
  const first = pathname.split("/")[1]?.toLowerCase()
  if (first && codes.has(first)) return searchRedirect(request, first) ?? NextResponse.next()

  const country = codes.has(DEFAULT_REGION) ? DEFAULT_REGION : (codes.values().next().value ?? DEFAULT_REGION)
  // Serve the default country at "/" directly so the root URL has content.
  if (pathname === "/") return NextResponse.rewrite(new URL(`/${country}`, request.url))
  return NextResponse.redirect(`${origin}/${country}${pathname}${search}`, 307)
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)"],
}
