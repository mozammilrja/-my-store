"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useState } from "react"

type Method = "upi" | "card" | "netbanking" | "cod"

export function RecoveryMethods({
  failedMethod,
  total,
}: {
  failedMethod: Method
  total: string
}) {
  const [method, setMethod] = useState<Method>(failedMethod === "upi" ? "cod" : "upi")
  const [vpaInput, setVpaInput] = useState("aditya.k@okaxis")
  const [cvvInput, setCvvInput] = useState("")

  return (
    <div className="flex flex-col gap-space-md">
      <form className="space-y-space-md" id="payment-recovery-form">
        {/* Option 1: Instant UPI / QR Code */}
        <label
          className={`payment-option relative flex flex-col sm:flex-row items-start p-space-md rounded-lg cursor-pointer transition-all border ${
            method === "upi"
              ? "bg-surface-container-high/60 border-primary shadow-sm ring-1 ring-primary/20"
              : "bg-surface-container-low hover:bg-surface-container-high/40 border-transparent"
          }`}
          data-method="upi"
          onClick={() => setMethod("upi")}
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="radio"
              name="recovery_method"
              value="upi"
              checked={method === "upi"}
              onChange={() => setMethod("upi")}
              className="mt-0.5 accent-primary size-4 cursor-pointer"
              data-testid="recovery-upi"
            />
          </div>
          <div className="sm:ml-space-md flex-1 w-full mt-2 sm:mt-0">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-[1.05rem] text-primary font-medium">Instant UPI / QR Code</span>
                <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary font-label-caps text-[0.625rem] tracking-wider uppercase">
                  Recommended
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">0% Declination Rate</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
              Google Pay, PhonePe, Paytm, CRED or any BHIM UPI handle. Immediate clearance.
            </p>
            {method === "upi" && (
              <div className="upi-expansion flex flex-col sm:flex-row items-center gap-space-md pt-space-xs">
                <div className="p-2 bg-surface-container-lowest rounded-lg shadow-sm flex flex-col items-center shrink-0">
                  <svg className="w-24 h-24 text-primary" fill="currentColor" viewBox="0 0 100 100">
                    <rect height="30" rx="3" width="30" x="0" y="0" />
                    <rect height="30" rx="3" width="30" x="70" y="0" />
                    <rect height="30" rx="3" width="30" x="0" y="70" />
                    <rect fill="white" height="18" width="18" x="6" y="6" />
                    <rect fill="white" height="18" width="18" x="76" y="6" />
                    <rect fill="white" height="18" width="18" x="6" y="76" />
                    <rect height="10" width="10" x="10" y="10" />
                    <rect height="10" width="10" x="80" y="10" />
                    <rect height="10" width="10" x="10" y="80" />
                    <rect height="8" width="8" x="40" y="10" />
                    <rect height="18" width="8" x="52" y="10" />
                    <rect height="20" width="20" x="40" y="40" />
                    <rect height="10" width="10" x="70" y="40" />
                    <rect height="12" width="12" x="40" y="70" />
                    <rect height="8" width="25" x="60" y="75" />
                    <rect height="6" width="12" x="80" y="65" />
                  </svg>
                  <span className="font-label-caps text-[0.6rem] text-outline mt-1 uppercase tracking-tighter">
                    Scan via Camera
                  </span>
                </div>
                <div className="flex-1 w-full">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Or enter VPA / UPI ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={vpaInput}
                      onChange={(e) => setVpaInput(e.target.value)}
                      placeholder="username@okhdfcbank"
                      className="h-11 px-3 bg-surface-container-lowest rounded text-on-surface font-body-sm text-body-sm w-full outline-none focus:ring-1 focus:ring-primary border border-surface-container-high"
                    />
                    <button
                      type="button"
                      className="h-11 px-4 bg-surface-container-highest text-on-surface font-label-caps text-label-caps uppercase hover:bg-surface-container transition-colors rounded"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </label>

        {/* Option 2: Alternative Saved Card */}
        <label
          className={`payment-option relative flex flex-col sm:flex-row items-start p-space-md rounded-lg cursor-pointer transition-all border ${
            method === "card"
              ? "bg-surface-container-high/60 border-primary shadow-sm ring-1 ring-primary/20"
              : "bg-surface-container-low hover:bg-surface-container-high/40 border-transparent"
          }`}
          data-method="card"
          onClick={() => setMethod("card")}
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="radio"
              name="recovery_method"
              value="card"
              checked={method === "card"}
              onChange={() => setMethod("card")}
              className="mt-0.5 accent-primary size-4 cursor-pointer"
              data-testid="recovery-card"
            />
          </div>
          <div className="sm:ml-space-md flex-1 w-full mt-2 sm:mt-0">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-[1.05rem] text-primary font-medium">Use Alternative Saved Card</span>
                <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface font-mono text-[0.7rem]">
                  ICICI SAPPHIRO
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">•••• 1108</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
              ICICI Bank Visa Infinite credit card ending in 1108. Exp: 08/28.
            </p>
            {method === "card" && (
              <div className="flex items-center gap-space-md pt-1">
                <div className="w-32">
                  <label className="block font-label-caps text-[0.65rem] text-outline uppercase tracking-wider mb-1">
                    Card CVV
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cvvInput}
                    onChange={(e) => setCvvInput(e.target.value)}
                    placeholder="•••"
                    className="h-10 px-3 w-full bg-surface-container-lowest rounded text-center tracking-widest font-mono text-body-md text-on-surface outline-none border border-surface-container-high focus:border-primary"
                  />
                </div>
                <span className="text-xs text-on-surface-variant pt-4 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">credit_card</span>
                  Verified with Visa SafeKey
                </span>
              </div>
            )}
          </div>
        </label>

        {/* Option 3: NetBanking */}
        <label
          className={`payment-option relative flex flex-col sm:flex-row items-start p-space-md rounded-lg cursor-pointer transition-all border ${
            method === "netbanking"
              ? "bg-surface-container-high/60 border-primary shadow-sm ring-1 ring-primary/20"
              : "bg-surface-container-low hover:bg-surface-container-high/40 border-transparent"
          }`}
          data-method="netbanking"
          onClick={() => setMethod("netbanking")}
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="radio"
              name="recovery_method"
              value="netbanking"
              checked={method === "netbanking"}
              onChange={() => setMethod("netbanking")}
              className="mt-0.5 accent-primary size-4 cursor-pointer"
              data-testid="recovery-netbanking"
            />
          </div>
          <div className="sm:ml-space-md flex-1 w-full mt-2 sm:mt-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-headline-sm text-[1.05rem] text-primary font-medium">NetBanking / Corporate Transfer</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">54 Banks</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Direct authenticated gateway via State Bank of India, Axis Bank, Kotak, or ICICI NetBanking.
            </p>
          </div>
        </label>

        {/* Option 4: Doorstep Trial & Settlement (COD) */}
        <label
          className={`payment-option relative flex flex-col sm:flex-row items-start p-space-md rounded-lg cursor-pointer transition-all border ${
            method === "cod"
              ? "bg-surface-container-high/60 border-primary shadow-sm ring-1 ring-primary/20"
              : "bg-surface-container-low hover:bg-surface-container-high/40 border-transparent"
          }`}
          data-method="cod"
          onClick={() => setMethod("cod")}
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="radio"
              name="recovery_method"
              value="cod"
              checked={method === "cod"}
              onChange={() => setMethod("cod")}
              className="mt-0.5 accent-primary size-4 cursor-pointer"
              data-testid="recovery-cod"
            />
          </div>
          <div className="sm:ml-space-md flex-1 w-full mt-2 sm:mt-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-[1.05rem] text-primary font-medium">Doorstep Trial & Settlement</span>
                <span className="px-2 py-0.5 rounded bg-secondary-container/40 text-on-secondary-container font-label-caps text-[0.625rem] tracking-wider uppercase">
                  Vault Verified
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Card / Cash at Door</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Our private courier carries a secure mobile POS terminal. Inspect the tailoring before final release.
            </p>
          </div>
        </label>
      </form>

      {/* Action Buttons */}
      <div className="mt-space-xl pt-space-lg flex flex-col sm:flex-row items-center gap-space-md">
        <LocalizedClientLink
          href={`/checkout?step=payment&method=${method}`}
          className="w-full sm:flex-1 h-12 bg-primary hover:bg-primary-container text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 group"
          data-testid="payment-retry"
        >
          <span>Authorize &amp; Retry Settlement ({total})</span>
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/checkout?step=payment&method=cod"
          className="w-full sm:w-auto h-12 px-6 bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-caps text-label-caps uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center"
          data-testid="payment-switch-cod"
        >
          Pay on delivery instead
        </LocalizedClientLink>
      </div>
    </div>
  )
}
