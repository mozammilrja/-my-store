"use client"

import { TruckIcon } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export function CategoryShortcuts() {
  return (
    <div className="w-full bg-surface-container-low/50 border-b border-border/50 py-2.5 px-margin-mobile md:px-margin">
      <div className="w-full flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-muted-foreground font-body-sm">
          <span className="font-label-caps text-[10px] uppercase text-foreground font-bold tracking-wider shrink-0">
            Curated Shortcuts:
          </span>
          <LocalizedClientLink className="hover:text-foreground transition-colors font-medium" href="/categories/women">
            Sarees under ₹3,999
          </LocalizedClientLink>
          <span className="opacity-30">•</span>
          <LocalizedClientLink className="hover:text-foreground transition-colors font-medium" href="/categories/pants">
            Trousers &amp; High-Waist Knits
          </LocalizedClientLink>
          <span className="opacity-30">•</span>
          <LocalizedClientLink className="hover:text-foreground transition-colors font-medium" href="/categories/women">
            Bridal Guest Lookbook
          </LocalizedClientLink>
          <span className="opacity-30">•</span>
          <LocalizedClientLink className="hover:text-foreground transition-colors font-medium" href="/categories/jewellery">
            Pure Silver Jhumkas
          </LocalizedClientLink>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="font-label-caps text-[11px] text-secondary font-bold uppercase tracking-wider flex items-center gap-1.5">
            <TruckIcon className="size-3.5" />
            <span>Express Metro Dispatch: 24h</span>
          </span>
        </div>
      </div>
    </div>
  )
}
