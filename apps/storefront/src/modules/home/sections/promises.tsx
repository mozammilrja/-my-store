import { Container } from "@/components/store/container"
import { formatMoney } from "@lib/money"
import type { RegionPolicies } from "@lib/api/types"
import { deliveryDays } from "@lib/util/policies"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { MessageCircleIcon, RotateCcwIcon, TruckIcon } from "lucide-react"

/** Service facts for the visitor's region, from the region's policy data. */
export function Promises({ policies, currencyCode }: { policies: RegionPolicies | null; currencyCode: string }) {
  if (!policies) return null

  const items = [
    {
      icon: TruckIcon,
      title: "Regional Delivery",
      body: `${deliveryDays(policies)} business days, standard shipping from ${formatMoney(policies.shippingRate, currencyCode)}`,
      href: "/shipping",
    },
    {
      icon: RotateCcwIcon,
      title: `${policies.returnWindowDays}-Day Returns`,
      body: policies.freeReturns ? "Complimentary doorstep exchange & returns" : "Hassle-free regional returns and pickup",
      href: "/returns",
    },
    {
      icon: MessageCircleIcon,
      title: "Client Concierge",
      body: "Expert advice on fit, fabrics, sizing, and order tracking",
      href: "/contact",
    },
  ]

  return (
    <section aria-label="Store services and guarantees" className="py-12 border-t border-border/60 bg-surface-container-low/40">
      <Container>
        <ul className="grid gap-4 sm:grid-cols-3">
          {items.map(({ icon: Icon, title, body, href }) => (
            <li key={title}>
              <LocalizedClientLink
                href={href}
                className="group flex items-start gap-4 p-5 rounded-xl bg-surface-container-lowest border border-border/50 hover:border-foreground/30 shadow-2xs hover:shadow-xs transition-all h-full"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-foreground border border-border/40 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-label-sm text-sm font-bold text-foreground group-hover:text-secondary transition-colors">
                    {title}
                  </span>
                  <span className="font-body-sm text-xs text-muted-foreground leading-relaxed">
                    {body}
                  </span>
                </div>
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
