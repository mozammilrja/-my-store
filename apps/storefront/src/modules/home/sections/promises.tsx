import { Container } from "@/components/store/container"
import { formatMoney } from "@/components/store/money"
import { StorePolicies, formatDayRange } from "@lib/util/store-policies"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/** Service facts for the visitor's region, taken from the region's policy data. */
export function Promises({
  policies,
  currencyCode,
}: {
  policies: StorePolicies | null
  currencyCode: string
}) {
  if (!policies) return null

  const items = [
    {
      title: "Delivery",
      body: `${formatDayRange({
        min: policies.handlingDays.min + policies.transitDays.min,
        max: policies.handlingDays.max + policies.transitDays.max,
      })} business days, from ${formatMoney(policies.shippingRate, currencyCode)}.`,
      href: "/shipping",
    },
    {
      title: "Returns",
      body: `${policies.returnWindowDays} days to change your mind${policies.freeReturns ? ", free of charge" : ""}.`,
      href: "/returns",
    },
    {
      title: "Help",
      body: "Questions about an order or a size? Get in touch.",
      href: "/contact",
    },
  ]

  return (
    <section aria-label="Store services" className="border-y">
      <Container>
        <ul className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {items.map((item) => (
            <li key={item.title}>
              <LocalizedClientLink href={item.href} className="group flex flex-col gap-2 py-8 sm:px-8 sm:first:pl-0">
                <span className="text-xs font-semibold tracking-widest uppercase text-primary">{item.title}</span>
                <span className="text-sm group-hover:underline group-hover:underline-offset-4">{item.body}</span>
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
