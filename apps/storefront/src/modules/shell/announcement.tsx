"use client"

import { useState } from "react"
import { XIcon } from "lucide-react"

export function Announcement({
  countryCode,
  deliveryInfo,
}: {
  countryCode: string
  deliveryInfo?: { deliveryDays: string; returnDays: number; freeReturns: boolean } | null
}) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const deliveryText = deliveryInfo
    ? `Complimentary delivery in ${deliveryInfo.deliveryDays} business days · ${deliveryInfo.returnDays}-day ${deliveryInfo.freeReturns ? "free " : ""}returns`
    : countryCode === "in"
      ? "Complimentary standard delivery across India on orders above ₹1,999"
      : "Complimentary standard delivery across Europe on orders above €49"

  return (
    <div
      id="top-promo-banner"
      className="w-full bg-primary text-primary-foreground py-2 px-4 transition-all duration-300 text-xs"
    >
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-2 text-center">
        <div className="flex-1 text-center truncate sm:overflow-visible">
          <span className="font-label-caps text-[11px] uppercase tracking-wider text-surface-container-high font-semibold">
            Mid-Season Spring Edit
          </span>
          <span className="mx-2 opacity-40">|</span>
          <span className="font-body-sm text-xs text-surface-bright">
            {deliveryText}
          </span>
          <span className="hidden sm:inline mx-2 opacity-40">|</span>
          <span className="hidden sm:inline font-label-caps text-[10px] bg-white/10 px-2 py-0.5 rounded text-surface-bright font-bold tracking-wider">
            Code: EVERSPRING
          </span>
        </div>
        <button
          type="button"
          aria-label="Dismiss announcement"
          onClick={() => setDismissed(true)}
          className="p-1 text-primary-foreground/60 hover:text-primary-foreground transition-colors flex items-center justify-center shrink-0 cursor-pointer"
        >
          <XIcon className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
}
