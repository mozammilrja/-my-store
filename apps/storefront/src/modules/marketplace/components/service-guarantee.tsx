"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Icon } from "@/components/ui/icon"

export function ServiceGuarantee() {
  return (
    <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin pb-12 w-full">
      <div className="p-8 rounded-2xl bg-surface-container-low flex flex-col lg:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-secondary shrink-0">
            <Icon name="auto_stories" size={32} />
          </div>
          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary font-bold">
              Omnichannel Service Guarantee
            </span>
            <h4 className="font-headline-sm text-headline-sm text-on-surface font-normal mt-0.5">
              Need bespoke fit styling or urgent doorstep trial?
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Book an appointment with an Everwear Atelier Stylist or request 24h concierge
              try-at-home across Mumbai, Delhi NCR, and Bengaluru.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <LocalizedClientLink
            href="/contact"
            className="px-5 py-2.5 rounded bg-surface-container-lowest text-on-surface font-label-sm text-label-sm font-semibold hover:bg-surface-container transition-colors shadow-sm text-center"
          >
            Book Atelier Slot
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/contact"
            className="px-5 py-2.5 rounded bg-primary text-on-primary font-label-sm text-label-sm font-semibold hover:bg-surface-container-highest hover:text-on-surface transition-colors shadow-sm text-center"
          >
            Talk to Concierge
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}
