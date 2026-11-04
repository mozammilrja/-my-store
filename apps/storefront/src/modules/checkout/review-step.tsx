"use client"

import { Button } from "@/components/ui/button"
import { placeOrder } from "@lib/data/shop"
import { useParams } from "next/navigation"
import { useActionState, useState } from "react"
import { FormError } from "./step"
import { toast } from "sonner"
import { cardValidationSchema, upiVerificationSchema } from "@lib/validation/checkout-schemas"

export function ReviewStep({ total }: { total: string }) {
  const { countryCode } = useParams<{ countryCode: string }>()

  const [activeTab, setActiveTab] = useState<"upi" | "card" | "netbanking" | "cod">("upi")
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay")
  const [upiIdInput, setUpiIdInput] = useState("")
  const [upiVerified, setUpiVerified] = useState(false)
  const [upiError, setUpiError] = useState<string | null>(null)

  const [useNewCard, setUseNewCard] = useState(false)
  const [newCard, setNewCard] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
  })
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({})

  const [selectedBank, setSelectedBank] = useState("HDFC Bank")

  const [state, action, pending] = useActionState(placeOrder, { error: null })

  // Validate UPI with Zod
  const handleVerifyUpi = () => {
    setUpiError(null)
    const result = upiVerificationSchema.safeParse({ vpa: upiIdInput })
    if (!result.success) {
      setUpiError(result.error.issues[0]?.message || "Invalid UPI ID")
      setUpiVerified(false)
      toast.error("Please enter a valid UPI address")
      return
    }
    setUpiVerified(true)
    toast.success(`Verified UPI ID: ${result.data.vpa}`)
  }

  // Validate New Card with Zod before placing order
  const handleOrderSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (activeTab === "card" && useNewCard) {
      const result = cardValidationSchema.safeParse(newCard)
      if (!result.success) {
        e.preventDefault()
        const errors: Record<string, string> = {}
        result.error.issues.forEach((issue) => {
          const path = issue.path[0] as string
          if (!errors[path]) errors[path] = issue.message
        })
        setCardErrors(errors)
        toast.error("Please resolve card details before submitting")
        return
      }
    }
    setCardErrors({})
  }

  const paymentMethodValue = activeTab === "cod" ? "cod" : "razorpay"

  return (
    <form
      action={action}
      onSubmit={handleOrderSubmit}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="countryCode" value={countryCode} />
      <input type="hidden" name="paymentMethod" value={paymentMethodValue} />

      {/* Stitch 3. Secure Payment Module */}
      <div className="bg-surface-container-lowest shadow-[0_1px_4px_rgba(0,0,0,0.02)] rounded-xl p-space-lg flex flex-col gap-space-lg border border-surface-container-high/60">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[24px]">
            credit_card
          </span>
          <h2 className="font-headline-sm text-headline-sm text-primary font-semibold">
            Select Payment Method
          </h2>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-space-sm overflow-x-auto pb-space-xs no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("upi")}
            className={`px-space-md py-space-xs rounded-lg font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "upi"
                ? "bg-primary text-on-primary font-semibold shadow-xs"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            UPI Apps
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("card")}
            className={`px-space-md py-space-xs rounded-lg font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "card"
                ? "bg-primary text-on-primary font-semibold shadow-xs"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Credit / Debit Card
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("netbanking")}
            className={`px-space-md py-space-xs rounded-lg font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "netbanking"
                ? "bg-primary text-on-primary font-semibold shadow-xs"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            NetBanking
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cod")}
            className={`px-space-md py-space-xs rounded-lg font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "cod"
                ? "bg-primary text-on-primary font-semibold shadow-xs"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Cash on Delivery
          </button>
        </div>

        {/* Pane: UPI */}
        {activeTab === "upi" && (
          <div className="flex flex-col gap-space-md pt-space-sm" data-testid="payment-method-online">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Instant settlement via Google Pay, PhonePe, Paytm, or any BHIM UPI Virtual Payment Address.
            </p>
            <div className="grid grid-cols-3 gap-space-md">
              <label
                className={`flex flex-col items-center justify-center p-space-md rounded-xl cursor-pointer transition-all border ${
                  selectedUpiApp === "gpay"
                    ? "bg-surface-container/60 border-primary ring-1 ring-primary"
                    : "bg-surface-container/30 border-transparent hover:bg-surface-container"
                }`}
              >
                <input
                  type="radio"
                  name="upi_app"
                  checked={selectedUpiApp === "gpay"}
                  onChange={() => setSelectedUpiApp("gpay")}
                  className="mb-space-xs accent-primary"
                />
                <span className="font-label-sm text-label-sm text-on-surface font-medium">
                  Google Pay
                </span>
              </label>

              <label
                className={`flex flex-col items-center justify-center p-space-md rounded-xl cursor-pointer transition-all border ${
                  selectedUpiApp === "phonepe"
                    ? "bg-surface-container/60 border-primary ring-1 ring-primary"
                    : "bg-surface-container/30 border-transparent hover:bg-surface-container"
                }`}
              >
                <input
                  type="radio"
                  name="upi_app"
                  checked={selectedUpiApp === "phonepe"}
                  onChange={() => setSelectedUpiApp("phonepe")}
                  className="mb-space-xs accent-primary"
                />
                <span className="font-label-sm text-label-sm text-on-surface font-medium">
                  PhonePe
                </span>
              </label>

              <label
                className={`flex flex-col items-center justify-center p-space-md rounded-xl cursor-pointer transition-all border ${
                  selectedUpiApp === "paytm"
                    ? "bg-surface-container/60 border-primary ring-1 ring-primary"
                    : "bg-surface-container/30 border-transparent hover:bg-surface-container"
                }`}
              >
                <input
                  type="radio"
                  name="upi_app"
                  checked={selectedUpiApp === "paytm"}
                  onChange={() => setSelectedUpiApp("paytm")}
                  className="mb-space-xs accent-primary"
                />
                <span className="font-label-sm text-label-sm text-on-surface font-medium">
                  Paytm UPI
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-1.5 mt-space-xs">
              <label className="font-label-caps text-label-caps uppercase text-on-surface-variant font-semibold">
                Or Enter Custom UPI ID (Validated via Zod)
              </label>
              <div className="flex items-center gap-space-sm">
                <input
                  type="text"
                  value={upiIdInput}
                  onChange={(e) => {
                    setUpiIdInput(e.target.value)
                    setUpiError(null)
                    setUpiVerified(false)
                  }}
                  placeholder="e.g. username@okhdfcbank"
                  className="flex-1 h-11 px-space-md bg-surface-container/30 rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high"
                />
                <button
                  type="button"
                  onClick={handleVerifyUpi}
                  className="h-11 px-space-lg bg-surface-container text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container-high transition-colors font-medium cursor-pointer"
                >
                  {upiVerified ? "Verified ✓" : "Verify"}
                </button>
              </div>
              {upiError && <p className="text-xs text-error">{upiError}</p>}
            </div>
          </div>
        )}

        {/* Pane: Card */}
        {activeTab === "card" && (
          <div className="flex flex-col gap-space-md pt-space-sm" data-testid="payment-method-online">
            <div className="flex items-center justify-between">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Tokenized Card Settlement
              </span>
              <span className="font-label-caps text-label-caps text-secondary font-bold">
                Secured by Razorpay
              </span>
            </div>

            {!useNewCard ? (
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between p-space-md bg-surface-container/60 rounded-xl cursor-pointer border border-primary ring-1 ring-primary">
                  <div className="flex items-center gap-space-md">
                    <input
                      type="radio"
                      name="saved_card"
                      defaultChecked
                      className="accent-primary"
                    />
                    <div>
                      <span className="font-label-md text-label-md text-on-surface font-semibold block">
                        Visa Infinite &bull;&bull;&bull;&bull; 4089
                      </span>
                      <span className="font-body-sm text-xs text-on-surface-variant">
                        Expires 08/28 &bull; Verified 3D-Secure
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[28px] text-on-surface-variant">
                    credit_card
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setUseNewCard(true)}
                  className="font-label-md text-label-md text-secondary text-left hover:underline cursor-pointer font-semibold pt-1"
                >
                  + Use a new credit or debit card
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-4 bg-surface-container-low rounded-xl border border-surface-container-high">
                <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
                  <span className="font-label-md font-semibold text-on-surface">
                    New Card Details (Validated via Zod)
                  </span>
                  <button
                    type="button"
                    onClick={() => setUseNewCard(false)}
                    className="text-xs text-secondary underline cursor-pointer"
                  >
                    Use saved card
                  </button>
                </div>
                <div>
                  <input
                    type="text"
                    maxLength={19}
                    placeholder="Card Number (4111 2222 3333 4444)"
                    value={newCard.cardNumber}
                    onChange={(e) =>
                      setNewCard({ ...newCard, cardNumber: e.target.value })
                    }
                    className="w-full h-11 px-3 bg-surface-container-lowest rounded border border-surface-container-high text-on-surface font-mono text-sm"
                  />
                  {cardErrors.cardNumber && (
                    <p className="text-xs text-error mt-1">{cardErrors.cardNumber}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      maxLength={7}
                      placeholder="MM / YY"
                      value={newCard.expiry}
                      onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
                      className="w-full h-11 px-3 bg-surface-container-lowest rounded border border-surface-container-high text-on-surface font-mono text-sm"
                    />
                    {cardErrors.expiry && (
                      <p className="text-xs text-error mt-1">{cardErrors.expiry}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="CVV"
                      value={newCard.cvv}
                      onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value })}
                      className="w-full h-11 px-3 bg-surface-container-lowest rounded border border-surface-container-high text-on-surface font-mono text-sm"
                    />
                    {cardErrors.cvv && (
                      <p className="text-xs text-error mt-1">{cardErrors.cvv}</p>
                    )}
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Cardholder Name"
                    value={newCard.cardholderName}
                    onChange={(e) =>
                      setNewCard({ ...newCard, cardholderName: e.target.value })
                    }
                    className="w-full h-11 px-3 bg-surface-container-lowest rounded border border-surface-container-high text-on-surface text-sm"
                  />
                  {cardErrors.cardholderName && (
                    <p className="text-xs text-error mt-1">{cardErrors.cardholderName}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pane: NetBanking */}
        {activeTab === "netbanking" && (
          <div className="flex flex-col gap-space-md pt-space-sm" data-testid="payment-method-online">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Select your registered banking institution:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
              {["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank"].map((bank) => (
                <button
                  key={bank}
                  type="button"
                  onClick={() => setSelectedBank(bank)}
                  className={`p-space-md rounded-xl text-center font-label-sm text-label-sm transition-colors cursor-pointer border ${
                    selectedBank === bank
                      ? "bg-surface-container border-primary font-bold text-on-surface shadow-xs"
                      : "bg-surface-container/40 border-transparent text-on-surface hover:bg-surface-container"
                  }`}
                >
                  {bank}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pane: Cash on Delivery */}
        {activeTab === "cod" && (
          <div className="flex flex-col gap-space-md pt-space-sm" data-testid="payment-method-cod">
            <div className="p-space-md bg-surface-container/40 rounded-xl flex items-start gap-space-md border border-surface-container-high/60">
              <span className="material-symbols-outlined text-on-surface-variant text-[22px]">
                info
              </span>
              <div>
                <span className="font-label-md text-label-md text-on-surface font-semibold block">
                  Cash on Delivery Verification
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Pay upon arrival via cash or UPI QR code scan. A quick dispatch OTP confirmation will be sent to your mobile.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-on-surface-variant leading-relaxed">
        By placing your order, you agree to Everwear Atelier&apos;s terms of service, bespoke privacy guarantee, and return policies.
      </p>

      <FormError message={state.error} />

      {/* Primary Place Order CTA */}
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        aria-busy={pending}
        className="w-full h-14 bg-primary text-on-primary font-label-md text-label-md uppercase tracking-widest rounded-lg hover:bg-primary-container transition-all flex items-center justify-center gap-space-sm shadow-md cursor-pointer font-semibold"
        data-testid="submit-order-button"
      >
        <span>
          {pending ? "Securing Your Order..." : `Place Secure Order — ${total}`}
        </span>
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </Button>
    </form>
  )
}
