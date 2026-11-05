"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useState, type ReactNode } from "react"

export type RecoveryMethod = "upi" | "card" | "netbanking" | "cod"

type Availability = { upi: boolean; card: boolean; netbanking: boolean; cod: boolean }

/**
 * One option of the Stitch recovery hub ("payment-option" in the export). The
 * export's inline script swaps the selected option's background; here that is
 * React state. The radio sits on the title's line (mt-1 against the 1.05rem
 * title), the meta floats right on the same row.
 */
function RecoveryOption({
  value,
  selected,
  available,
  onSelect,
  title,
  badge,
  meta,
  description,
  children,
}: {
  value: RecoveryMethod
  selected: boolean
  available: boolean
  onSelect: (value: RecoveryMethod) => void
  title: string
  badge?: ReactNode
  meta?: ReactNode
  description: string
  children?: ReactNode
}) {
  return (
    <label
      data-method={value}
      className={`payment-option relative flex items-start p-space-md rounded-lg transition-all ${
        !available
          ? "bg-surface-container-low cursor-not-allowed"
          : selected
            ? "bg-surface-container-high/60 shadow-sm cursor-pointer"
            : "bg-surface-container-low hover:bg-surface-container-high/40 cursor-pointer"
      }`}
    >
      <input
        className="mt-1 shrink-0 accent-primary disabled:cursor-not-allowed"
        name="recovery_method"
        type="radio"
        value={value}
        checked={selected}
        disabled={!available}
        onChange={() => onSelect(value)}
        data-testid={`recovery-${value}`}
      />
      <div className={`ml-space-md flex-1 min-w-0 ${available ? "" : "opacity-60"}`}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <div className="flex items-center flex-wrap gap-2">
            <span className="font-headline-sm text-[1.05rem] text-primary font-medium">{title}</span>
            {badge}
          </div>
          {meta && <span className="font-label-sm text-label-sm text-on-surface-variant">{meta}</span>}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{description}</p>
        {!available && (
          <p className="mt-space-xs flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
            <span aria-hidden className="material-symbols-outlined text-[16px]">block</span>
            Unavailable right now: online payments aren&apos;t enabled for this store yet.
          </p>
        )}
        {available && children && <div className="pt-space-sm">{children}</div>}
      </div>
    </label>
  )
}

const RECOMMENDED = (
  <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary font-label-caps text-[0.625rem] tracking-wider uppercase">
    Recommended
  </span>
)

const GATEWAY_NOTE = (what: string) => (
  <p className="flex items-center gap-1 text-xs text-on-surface-variant">
    <span aria-hidden className="material-symbols-outlined text-[16px]">lock</span>
    {what} in the secure payment window when you retry.
  </p>
)

export function RecoveryMethods({
  failedMethod,
  total,
  methods,
}: {
  failedMethod: RecoveryMethod | null
  total: string
  methods: Availability
}) {
  // Suggest UPI unless it was UPI that just failed (or it can't be used); otherwise pay on delivery.
  const recommended: RecoveryMethod = methods.upi && failedMethod !== "upi" ? "upi" : methods.cod ? "cod" : "card"
  const [method, setMethod] = useState<RecoveryMethod>(recommended)

  return (
    <>
      <div className="space-y-space-md" role="radiogroup" aria-label="Recovery payment method">
        <RecoveryOption
          value="upi"
          selected={method === "upi"}
          available={methods.upi}
          onSelect={setMethod}
          title="Instant UPI / QR Code"
          badge={recommended === "upi" ? RECOMMENDED : undefined}
          description="Google Pay, PhonePe, Paytm, CRED or any BHIM UPI handle. Immediate clearance."
        >
          {GATEWAY_NOTE("Scan the QR code or enter your VPA / UPI ID")}
        </RecoveryOption>

        <RecoveryOption
          value="card"
          selected={method === "card"}
          available={methods.card}
          onSelect={setMethod}
          title="Use Another Card"
          meta="Credit / Debit"
          description="Pay with a different credit or debit card, verified by your bank."
        >
          {GATEWAY_NOTE("Enter your card details")}
        </RecoveryOption>

        <RecoveryOption
          value="netbanking"
          selected={method === "netbanking"}
          available={methods.netbanking}
          onSelect={setMethod}
          title="NetBanking / Corporate Transfer"
          description="Direct authenticated gateway via State Bank of India, Axis Bank, Kotak, or ICICI NetBanking."
        >
          {GATEWAY_NOTE("Choose your bank")}
        </RecoveryOption>

        <RecoveryOption
          value="cod"
          selected={method === "cod"}
          available={methods.cod}
          onSelect={setMethod}
          title="Doorstep Trial & Settlement"
          badge={recommended === "cod" ? RECOMMENDED : undefined}
          meta="Cash / UPI at Door"
          description="Pay by cash or by scanning the courier's UPI QR code when your consignment arrives."
        />
      </div>

      <div className="mt-space-xl pt-space-lg flex flex-col sm:flex-row items-center gap-space-md">
        <LocalizedClientLink
          href={`/checkout?step=payment&method=${method}`}
          className="w-full sm:flex-1 h-12 text-center bg-primary hover:bg-primary-container text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 group"
          data-testid="payment-retry"
        >
          <span>
            Authorize &amp; Retry Settlement ({total})
          </span>
          <span aria-hidden className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </LocalizedClientLink>
        <LocalizedClientLink
            href="/checkout?step=payment"
            className="w-full sm:w-auto h-12 px-6 bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-caps text-label-caps uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center whitespace-nowrap"
            data-testid="payment-switch-method"
          >
            Switch Card Details
          </LocalizedClientLink>
      </div>
    </>
  )
}
