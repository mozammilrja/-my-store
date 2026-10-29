import type { Product, Region } from "@lib/api/types"
import { buildReturnPolicy, buildShippingDetails } from "./policies"
import { STORE_NAME } from "./site"

const ZERO_DECIMAL = new Set(["jpy", "krw", "vnd", "clp", "isk", "huf"])

/** Serializes JSON-LD safely for a <script> tag (no closing-tag injection). */
export const toJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c")

/** schema.org Product with one Offer per priced variant, from catalog data only. */
export function buildProductStructuredData({
  product,
  region,
  countryCode,
  productUrl,
}: {
  product: Product
  region: Region
  countryCode: string
  productUrl: string
}) {
  const divisor = ZERO_DECIMAL.has(region.currency) ? 1 : 100
  const offers = product.variants
    .filter((v) => v.price !== null)
    .map((v) => ({
      "@type": "Offer",
      sku: v.sku ?? v.id,
      url: `${productUrl}?v_id=${v.id}`,
      price: (v.price! / divisor).toFixed(divisor === 1 ? 0 : 2),
      priceCurrency: region.currency.toUpperCase(),
      availability: v.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      ...(region.policies
        ? {
            shippingDetails: buildShippingDetails(region.policies, countryCode, region.currency),
            hasMerchantReturnPolicy: buildReturnPolicy(region.policies, countryCode),
          }
        : {}),
    }))

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    ...(product.description ? { description: product.description } : {}),
    url: productUrl,
    image: product.images.length ? product.images : product.thumbnail ? [product.thumbnail] : undefined,
    brand: { "@type": "Brand", name: STORE_NAME },
    ...(product.material ? { material: product.material } : {}),
    offers,
  }
}
