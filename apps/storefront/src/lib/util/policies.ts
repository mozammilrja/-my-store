import type { RegionPolicies } from "@lib/api/types"

export const formatDayRange = ({ min, max }: { min: number; max: number }) => (min === max ? `${min}` : `${min}-${max}`)

export const deliveryDays = (p: RegionPolicies) =>
  formatDayRange({ min: p.handlingDays.min + p.transitDays.min, max: p.handlingDays.max + p.transitDays.max })

const ZERO_DECIMAL = new Set(["jpy", "krw", "vnd", "clp", "isk", "huf"])
const major = (amount: number, currency: string) => amount / (ZERO_DECIMAL.has(currency) ? 1 : 100)

const businessDays = (range: { min: number; max: number }) => ({
  "@type": "QuantitativeValue",
  minValue: range.min,
  maxValue: range.max,
  unitCode: "DAY",
})

/** schema.org shipping details built only from the region's configured policy. */
export const buildShippingDetails = (p: RegionPolicies, countryCode: string, currency: string) => ({
  "@type": "OfferShippingDetails",
  shippingRate: { "@type": "MonetaryAmount", value: major(p.shippingRate, currency), currency: currency.toUpperCase() },
  shippingDestination: { "@type": "DefinedRegion", addressCountry: countryCode.toUpperCase() },
  deliveryTime: { "@type": "ShippingDeliveryTime", handlingTime: businessDays(p.handlingDays), transitTime: businessDays(p.transitDays) },
})

export const buildReturnPolicy = (p: RegionPolicies, countryCode: string) => ({
  "@type": "MerchantReturnPolicy",
  applicableCountry: countryCode.toUpperCase(),
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: p.returnWindowDays,
  returnFees: p.freeReturns ? "https://schema.org/FreeReturn" : "https://schema.org/ReturnFeesCustomerResponsibility",
})
