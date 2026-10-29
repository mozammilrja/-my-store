import { Container } from "@/components/store/container"
import { formatMoney } from "@/components/store/money"
import { StorePolicies, formatDayRange } from "@lib/util/store-policies"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { MessageCircleIcon, RotateCcwIcon, TruckIcon } from "lucide-react"

/** Service facts for the visitor's region, from the region's policy data. */
export function Promises({ policies, currencyCode }: { policies: StorePolicies | null; currencyCode: string }) {
  if (!policies) return null

  const items = [
    {
      icon: TruckIcon,
      title: "Delivery",
      body: `${formatDayRange({
        min: policies.handlingDays.min + policies.transitDays.min,
        max: policies.handlingDays.max + policies.transitDays.max,
      })} business days, from ${formatMoney(policies.shippingRate, currencyCode)}`,
      href: "/shipping",
    },
    {
      icon: RotateCcwIcon,
      title: `${policies.returnWindowDays}-day returns`,
      body: policies.freeReturns ? "Change your mind for free" : "Plenty of time to change your mind",
      href: "/returns",
    },
    { icon: MessageCircleIcon, title: "Here to help", body: "Questions about sizing or an order", href: "/contact" },
  ]

  return (
    <section aria-label="Store services" className="border-y bg-surface">
      <Container>
        <ul className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {items.map(({ icon: Icon, title, body, href }) => (
            <li key={title}>
              <LocalizedClientLink href={href} className="group flex items-center gap-4 py-6 sm:px-6 sm:first:pl-0">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-bold uppercase tracking-wide group-hover:underline">{title}</span>
                  <span className="text-sm text-muted-foreground">{body}</span>
                </span>
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
