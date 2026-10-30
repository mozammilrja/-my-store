"use client"

import { useState } from "react"

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
      className="w-full bg-primary text-on-primary py-1.5 px-margin-mobile md:px-margin transition-all duration-300"
    >
      <div className="max-w-[1440px] mx-auto flex items-center justify-between text-center">
        <div className="flex-1 text-center">
          <span className="font-label-caps text-label-caps uppercase tracking-wider text-surface-container-high">
            Mid-Season Spring Edit
          </span>
          <span className="mx-2 opacity-30">|</span>
          <span className="font-body-sm text-body-sm text-surface-bright">
            {deliveryText}
          </span>
          <span className="hidden sm:inline mx-2 opacity-30">|</span>
          <span className="hidden sm:inline font-label-caps text-label-caps bg-surface/10 px-2 py-0.5 rounded text-surface-bright">
            Code: EVERSPRING
          </span>
        </div>
        <button
          type="button"
          aria-label="Dismiss announcement"
          onClick={() => setDismissed(true)}
          className="p-1 text-on-primary/60 hover:text-on-primary transition-colors flex items-center justify-center shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  )
}
