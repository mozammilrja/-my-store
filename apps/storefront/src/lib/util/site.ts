import "server-only"
import { headers } from "next/headers"

export const STORE_NAME = "AVELIQ"

export const DEFAULT_COUNTRY_CODE = (
  process.env.NEXT_PUBLIC_DEFAULT_REGION || "dk"
).toLowerCase()

const configuredUrl = () => process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "")

const originFromHeaders = (get: (name: string) => string | null) => {
  const host = (get("x-forwarded-host") ?? get("host"))?.split(",")[0].trim()
  if (!host) {
    return undefined
  }
  const proto = get("x-forwarded-proto")?.split(",")[0].trim() || "https"
  return `${proto}://${host}`
}

export const getRequestOrigin = (request: Request): string =>
  configuredUrl() ||
  originFromHeaders((name) => request.headers.get(name)) ||
  new URL(request.url).origin

/** Origin for absolute URLs in server components (canonical, JSON-LD, OpenGraph). */
export const getSiteOrigin = async (): Promise<string> => {
  const configured = configuredUrl()
  if (configured) {
    return configured
  }
  const requestHeaders = await headers()
  const fallback = process.env.NODE_ENV === "production" ? "https://everwear.com" : "http://localhost:8001"
  return originFromHeaders((name) => requestHeaders.get(name)) || fallback
}

export const listCountryCodes = (regions: { countries: { code: string }[] }[]): string[] =>
  regions.flatMap((region) => region.countries.map((country) => country.code.toLowerCase()))

export const getDefaultCountryCode = (regions: { countries: { code: string }[] }[]) => {
  const codes = listCountryCodes(regions)
  return codes.includes(DEFAULT_COUNTRY_CODE) ? DEFAULT_COUNTRY_CODE : codes[0]
}
