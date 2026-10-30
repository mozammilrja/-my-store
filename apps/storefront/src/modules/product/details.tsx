import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { formatMoney } from "@lib/money"
import type { Product, RegionPolicies } from "@lib/api/types"
import { formatDayRange } from "@lib/util/policies"

/** Description, product facts and region policies. Facts the backend doesn't hold are omitted. */
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

  return (
    <section aria-labelledby="product-info-heading">
      <h2 id="product-info-heading" className="sr-only">
        Product information
      </h2>
      <Accordion
        type="multiple"
        defaultValue={["description"]}
        className="border-t"
        data-testid="product-tabs"
      >
        {product.description && (
          <AccordionItem value="description">
            <AccordionTrigger>Description</AccordionTrigger>
            <AccordionContent className="h-auto">
              <p
                className="whitespace-pre-line text-muted-foreground"
                data-testid="product-description"
              >
                {product.description}
              </p>
            </AccordionContent>
          </AccordionItem>
        )}
        {facts.length > 0 && (
          <AccordionItem value="details">
            <AccordionTrigger>Details</AccordionTrigger>
            <AccordionContent className="h-auto">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                {facts.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </AccordionContent>
          </AccordionItem>
        )}
        {policies && (
          <AccordionItem value="shipping">
            <AccordionTrigger>Delivery and returns</AccordionTrigger>
            <AccordionContent className="h-auto">
              <ul className="flex flex-col gap-2 text-muted-foreground">
                <li>
                  Delivered in{" "}
                  {formatDayRange({
                    min: policies.handlingDays.min + policies.transitDays.min,
                    max: policies.handlingDays.max + policies.transitDays.max,
                  })}{" "}
                  business days. Shipping from{" "}
                  {formatMoney(policies.shippingRate, currencyCode)}.
                </li>
                <li>
                  Return within {policies.returnWindowDays} days
                  {policies.freeReturns ? ", free of charge" : ""}.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </section>
  )
}
