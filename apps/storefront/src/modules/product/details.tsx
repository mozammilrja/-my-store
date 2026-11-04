import { formatMoney } from "@lib/money"
import type { Product, RegionPolicies } from "@lib/api/types"
import { formatDayRange } from "@lib/util/policies"

/** Open product details block (Myntra-style), not buried in an accordion. */
export function Details({
  product,
  policies,
  currencyCode,
}: {
  product: Product
  policies: RegionPolicies | null
  currencyCode: string
}) {
  const facts = [
    ["Material", product.material],
    ["Country of origin", product.originCountry?.toUpperCase()],
    ["Weight", product.weight ? `${product.weight} g` : null],
  ].filter((f): f is [string, string] => Boolean(f[1]))

  if (!product.description && facts.length === 0 && !policies) return null

  return (
    <section
      aria-labelledby="product-info-heading"
      className="flex flex-col gap-4 border-t border-border/60 pt-5"
      data-testid="product-tabs"
    >
      <h2 id="product-info-heading" className="text-sm font-bold">
        Product Details
      </h2>

      {product.description && (
        <p className="whitespace-pre-line text-sm text-muted-foreground" data-testid="product-description">
          {product.description}
        </p>
      )}

      {facts.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {policies && (
        <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <li>
            Delivered in{" "}
            {formatDayRange({
              min: policies.handlingDays.min + policies.transitDays.min,
              max: policies.handlingDays.max + policies.transitDays.max,
            })}{" "}
            business days. Shipping from {formatMoney(policies.shippingRate, currencyCode)}.
          </li>
          <li>
            Return within {policies.returnWindowDays} days
            {policies.freeReturns ? ", free of charge" : ""}.
          </li>
        </ul>
      )}
    </section>
  )
}
