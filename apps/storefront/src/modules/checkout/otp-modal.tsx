"use client"

import { useEffect, useRef, useState } from "react"

interface OtpModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  amount: string
  bankName?: string
  paymentMethod?: string
  customerEmail?: string
  customerPhone?: string
}

export function OtpBankingModal({
  isOpen,
  onClose,
  onSuccess,
  amount,
  bankName = "HDFC BANK",
  paymentMethod = "HDFC Regalia Gold (•••• 4092)",
  customerEmail = "customer@everwear.studio",
  customerPhone = "•••• 5959",
}: OtpModalProps) {
  const [pins, setPins] = useState(["4", "8", "1", "", "", ""])
  const [countdown, setCountdown] = useState(102)
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!isOpen) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      // Focus first empty input
      const nextIdx = pins.findIndex((p) => !p)
      if (nextIdx !== -1 && inputRefs.current[nextIdx]) {
        inputRefs.current[nextIdx]?.focus()
      }
    }
  }, [isOpen, pins])

  if (!isOpen) return null

  const handleInputChange = (idx: number, val: string) => {
    const char = val.slice(-1)
    const newPins = [...pins]
    newPins[idx] = char
    setPins(newPins)
    if (char && idx < 5) {
      inputRefs.current[idx + 1]?.focus()
    }
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pins[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handleVerify = () => {
    setIsVerifying(true)
    setTimeout(() => {
      setIsVerifying(false)
      onSuccess()
    }, 800)
  }

  const mins = String(Math.floor(countdown / 60)).padStart(2, "0")
  const secs = String(countdown % 60).padStart(2, "0")

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="3D Secure Banking Authentication"
      data-testid="3ds-otp-modal"
    >
      <div className="relative w-full max-w-xl my-8">
        {/* Ambient Secure Layer Accent */}
        <div className="absolute w-96 h-96 rounded-full bg-secondary-fixed/30 blur-3xl -top-20 -left-20 pointer-events-none" />
        <div className="absolute w-80 h-80 rounded-full bg-surface-container-high/80 blur-2xl -bottom-16 -right-16 pointer-events-none" />

        {/* Gateway Identity & Compliance Badge */}
        <div className="w-full mb-space-md flex flex-wrap items-center justify-between gap-y-space-xs text-on-surface-variant font-label-caps text-label-caps tracking-widest uppercase">
          <div className="flex items-center gap-space-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white sm:text-on-surface-variant">256-Bit Bank-Grade Tokenized SSL Gateway</span>
          </div>
          <div className="text-right text-white sm:text-on-surface-variant">
            <span>MID: EVERWEAR STUDIOS INDIA PVT LTD</span>
          </div>
        </div>

        {/* Core 3DS Verification Modal Card */}
        <div className="w-full bg-surface-container-lowest shadow-2xl rounded-xl p-space-lg md:p-space-xl relative z-10 flex flex-col gap-space-lg border border-surface-container-high/80">
          {/* Institutional Partner Badges */}
          <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high/60">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary font-headline-sm font-medium">
                {bankName.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-primary font-medium tracking-tight">
                  {bankName}
                </span>
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                  Card Security Verification
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-xs bg-surface-container-low px-space-sm py-space-xs rounded-lg">
              <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
              <span className="font-label-caps text-label-caps text-primary uppercase">Identity Check</span>
            </div>
          </div>

          {/* Transaction Spec Sheet */}
          <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-space-sm">
            <div className="flex items-baseline justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Authorized Amount</span>
              <span className="font-headline-lg text-headline-lg text-primary font-medium">{amount}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-space-xs font-body-sm text-body-sm text-on-surface-variant">
              <div>
                <span className="block text-outline font-label-caps text-label-caps uppercase">Payment Instrument</span>
                <span className="text-on-surface font-medium truncate block">{paymentMethod}</span>
              </div>
              <div>
                <span className="block text-outline font-label-caps text-label-caps uppercase">Merchant</span>
                <span className="text-on-surface font-medium">Everwear Studios India</span>
              </div>
              <div>
                <span className="block text-outline font-label-caps text-label-caps uppercase">Session Timestamp</span>
                <span className="text-on-surface font-medium">04 Nov 2026, 14:31:05 IST</span>
              </div>
              <div>
                <span className="block text-outline font-label-caps text-label-caps uppercase">Gateway Reference</span>
                <span className="text-on-surface font-medium font-mono text-xs">TXN-EVR-89240182</span>
              </div>
            </div>
          </div>

          {/* Authentication Challenge Module */}
          <div className="flex flex-col gap-space-md">
            <div className="flex flex-col gap-space-xs">
              <h2 className="font-headline-sm text-headline-sm text-primary">Enter One-Time Password</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                A 6-digit authentication token was dispatched to mobile ending in{" "}
                <strong className="text-on-surface">{customerPhone}</strong> and{" "}
                <strong className="text-on-surface">{customerEmail}</strong>.
              </p>
            </div>

            {/* Interactive 6-Pin Input Segment */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex justify-between items-center gap-space-xs md:gap-space-sm" id="otp-container">
                {pins.map((pin, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={pin}
                    placeholder="·"
                    onChange={(e) => handleInputChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="w-12 h-14 md:w-14 md:h-16 text-center font-headline-lg text-headline-lg text-primary bg-surface-container rounded-lg focus:outline-none focus:bg-surface-container-high transition-colors"
                    data-testid={`otp-box-${i}`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-label-sm font-label-sm pt-space-xs">
                <span className="text-on-surface-variant flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  <span>
                    Resend OTP in <span className="font-medium text-primary">{mins}:{secs}</span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => alert("Verification code dispatched via WhatsApp.")}
                  className="text-secondary font-medium hover:underline focus:outline-none cursor-pointer"
                >
                  Get OTP via WhatsApp
                </button>
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <div className="flex flex-col gap-space-sm pt-space-xs">
            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full bg-primary text-on-primary py-space-sm px-space-md rounded-lg font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-space-xs hover:bg-primary-container transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              data-testid="verify-otp-button"
            >
              <span className="material-symbols-outlined text-[18px]">lock</span>
              <span>{isVerifying ? "Verifying Token..." : `Verify & Authorize ${amount}`}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full text-center py-space-xs text-on-surface-variant hover:text-primary font-label-sm text-label-sm uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel Transaction &amp; Return to Everwear
            </button>
          </div>

          {/* Mandatory Tokenization Mandate Notice */}
          <div className="bg-surface-container-low p-space-sm rounded-lg flex items-start gap-space-xs">
            <span className="material-symbols-outlined text-outline text-[18px] shrink-0 mt-0.5">info</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Do not refresh this window or press Back. This payment is cryptographically processed under RBI tokenization and dual-factor compliance standards.
            </p>
          </div>

          {/* Security Accreditation Logos Strip */}
          <div className="flex items-center justify-center gap-space-lg pt-space-xs opacity-75">
            <div className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant tracking-wider uppercase">
              <span className="material-symbols-outlined text-[16px]">shield</span>
              <span>Razorpay Shield</span>
            </div>
            <div className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant tracking-wider uppercase">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Visa Secure</span>
            </div>
            <div className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant tracking-wider uppercase">
              <span className="material-symbols-outlined text-[16px]">key</span>
              <span>PCI-DSS Level 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
