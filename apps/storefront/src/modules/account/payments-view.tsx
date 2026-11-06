"use client"

import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

// Zod Schemas for Payment Instruments
const cardPaymentSchema = z.object({
  type: z.literal("card"),
  cardNumber: z
    .string()
    .transform((val) => val.replace(/\s+/g, ""))
    .refine((val) => /^\d{15,16}$/.test(val), "Card number must be 15 or 16 digits"),
  expiry: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\s*\/\s*([2-3]\d)$/, "Expiry date must be in MM / YY format")
    .refine((val) => {
      const parts = val.split("/")
      if (parts.length !== 2) return false
      const month = parseInt(parts[0].trim(), 10)
      const year = 2000 + parseInt(parts[1].trim(), 10)
      const now = new Date()
      const expiry = new Date(year, month, 1)
      return expiry > now
    }, "Card has expired"),
  cvv: z
    .string()
    .trim()
    .regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits"),
  cardholderName: z
    .string()
    .trim()
    .min(2, "Cardholder name must be at least 2 characters")
    .max(60, "Name is too long"),
})

const upiPaymentSchema = z.object({
  type: z.literal("upi"),
  vpa: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[\w.-]+@[\w.-]+$/,
      "Please enter a valid UPI Virtual Payment Address (e.g. name@okhdfcbank)"
    ),
  holderName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters"),
})

type CardFormValues = {
  type: "card"
  cardNumber: string
  expiry: string
  cvv: string
  cardholderName: string
}

type UpiFormValues = {
  type: "upi"
  vpa: string
  holderName: string
}

type StoredPayment = {
  id: string
  type: "card" | "upi" | "wallet"
  title: string
  subtitle: string
  meta: string
  isDefault: boolean
  tag: string
  icon: string
  encryptedNote?: string
}

const INITIAL_METHODS: StoredPayment[] = [
  {
    id: "pay-1",
    type: "card",
    title: "•••• •••• •••• 4892",
    subtitle: "Exp: 08/28",
    meta: "Visa Infinite",
    isDefault: true,
    tag: "Default",
    icon: "credit_card",
    encryptedNote: "Encrypted 3DS",
  },
  {
    id: "pay-2",
    type: "upi",
    title: "sarah.j@okhdfcbank",
    subtitle: "Instant Settlement Enabled",
    meta: "Google Pay UPI",
    isDefault: false,
    tag: "UPI Handle",
    icon: "account_balance_wallet",
  },
  {
    id: "pay-3",
    type: "wallet",
    title: "Apple Pay Token",
    subtitle: "Device Account #8821",
    meta: "Apple Wallet",
    isDefault: false,
    tag: "Tokenized",
    icon: "phone_iphone",
  },
]

export function PaymentsView() {
  const [methods, setMethods] = useState<StoredPayment[]>(INITIAL_METHODS)
  const [showAddModal, setShowAddModal] = useState(false)
  const [paymentType, setPaymentType] = useState<"card" | "upi" | "wallet">("card")

  const [cardForm, setCardForm] = useState<CardFormValues>({
    type: "card",
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
  })

  const [upiForm, setUpiForm] = useState<UpiFormValues>({
    type: "upi",
    vpa: "",
    holderName: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    return parts.length ? parts.join(" ") : v
  }

  const formatExpiry = (value: string) => {
    const clean = value.replace(/[^0-9]/g, "")
    if (clean.length >= 3) {
      return `${clean.slice(0, 2)} / ${clean.slice(2, 4)}`
    }
    return clean
  }

  const handleMakeDefault = (id: string) => {
    setMethods((prev) =>
      prev.map((m) => ({
        ...m,
        isDefault: m.id === id,
        tag: m.id === id ? "Default" : m.type === "upi" ? "UPI Handle" : "Tokenized",
      }))
    )
    toast.success("Default settlement instrument updated")
  }

  const handleDelete = (id: string) => {
    setMethods((prev) => prev.filter((m) => m.id !== id))
    toast.success("Payment method removed")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (paymentType === "card") {
      // Zod Validation for Card
      const result = cardPaymentSchema.safeParse(cardForm)
      if (!result.success) {
        const fieldErrors: Record<string, string> = {}
        result.error.issues.forEach((issue) => {
          const path = issue.path[0] as string
          if (!fieldErrors[path]) {
            fieldErrors[path] = issue.message
          }
        })
        setErrors(fieldErrors)
        toast.error("Please resolve validation errors")
        return
      }

      const last4 = result.data.cardNumber.slice(-4)
      const newMethod: StoredPayment = {
        id: `pay-${Date.now()}`,
        type: "card",
        title: `•••• •••• •••• ${last4}`,
        subtitle: `Exp: ${result.data.expiry.replace(/\s+/g, "")}`,
        meta: "Visa Infinite (Tokenized)",
        isDefault: methods.length === 0,
        tag: methods.length === 0 ? "Default" : "Saved Card",
        icon: "credit_card",
        encryptedNote: "Encrypted 3DS",
      }

      setMethods((prev) => [...prev, newMethod])
      toast.success("New card saved securely via 256-bit tokenization")
      setShowAddModal(false)
      setCardForm({ type: "card", cardNumber: "", expiry: "", cvv: "", cardholderName: "" })
      setErrors({})
    } else if (paymentType === "upi") {
      // Zod Validation for UPI
      const result = upiPaymentSchema.safeParse(upiForm)
      if (!result.success) {
        const fieldErrors: Record<string, string> = {}
        result.error.issues.forEach((issue) => {
          const path = issue.path[0] as string
          if (!fieldErrors[path]) {
            fieldErrors[path] = issue.message
          }
        })
        setErrors(fieldErrors)
        toast.error("Please resolve validation errors")
        return
      }

      const newMethod: StoredPayment = {
        id: `pay-${Date.now()}`,
        type: "upi",
        title: result.data.vpa,
        subtitle: "Instant Settlement Enabled",
        meta: "BHIM / UPI Apps",
        isDefault: methods.length === 0,
        tag: methods.length === 0 ? "Default" : "UPI Handle",
        icon: "account_balance_wallet",
      }

      setMethods((prev) => [...prev, newMethod])
      toast.success("UPI ID verified and linked successfully")
      setShowAddModal(false)
      setUpiForm({ type: "upi", vpa: "", holderName: "" })
      setErrors({})
    } else {
      // Wallet token
      const newMethod: StoredPayment = {
        id: `pay-${Date.now()}`,
        type: "wallet",
        title: "Apple Pay Token",
        subtitle: `Device Account #${Math.floor(1000 + Math.random() * 9000)}`,
        meta: "Apple Wallet",
        isDefault: false,
        tag: "Tokenized",
        icon: "phone_iphone",
      }
      setMethods((prev) => [...prev, newMethod])
      toast.success("Wallet token synchronized")
      setShowAddModal(false)
    }
  }

  return (
    <div className="flex flex-col w-full" data-testid="payments-view">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-xl pb-space-md border-b border-surface-container-high">
        <div>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-[0.2em] block mb-1">
            Financial Credentials
          </span>
          <h1 className="font-headline-xl text-headline-xl text-on-surface uppercase">
            PAYMENT METHODS
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddModal(true)
            setErrors({})
          }}
          className="h-11 px-6 bg-primary text-on-primary hover:bg-inverse-surface font-label-sm text-label-sm uppercase font-medium rounded transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add_card</span>
          Add New Payment Method
        </button>
      </div>

      {/* Stored Methods Grid (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-space-xl">
        {methods.map((method) => (
          <div
            key={method.id}
            className="bg-surface-container-lowest p-space-lg rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-surface-container-high/60 flex flex-col justify-between relative group"
          >
            <div>
              <div className="flex items-center justify-between mb-space-md">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[24px] text-primary">
                    {method.icon}
                  </span>
                  <span
                    className={`font-label-caps text-label-caps px-2 py-0.5 rounded font-bold uppercase ${
                      method.isDefault
                        ? "bg-secondary-fixed text-on-secondary-fixed"
                        : "text-on-surface-variant bg-surface-container"
                    }`}
                  >
                    {method.tag}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(method.id)}
                  className="text-outline hover:text-error transition-colors p-1 cursor-pointer"
                  title="Remove Method"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
              <div className="mb-space-md">
                <p className="font-headline-sm text-headline-sm text-on-surface tracking-wider font-mono">
                  {method.title}
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  {method.subtitle}
                </p>
              </div>
            </div>
            <div className="pt-space-md flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm border-t border-surface-container-high/50">
              <span>{method.meta}</span>
              {method.encryptedNote ? (
                <span className="text-secondary font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  {method.encryptedNote}
                </span>
              ) : (
                !method.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleMakeDefault(method.id)}
                    className="text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Make Default
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Secure Transactions Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-space-lg mb-space-xl border border-surface-container-high/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md mb-space-md border-b border-surface-container-high gap-2">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Recent Secure Transactions
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Encrypted settlements across all linked payment instruments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              verified_user
            </span>
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-semibold">
              Bank-Grade 256-Bit SSL
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-container-high font-label-caps text-label-caps text-on-surface-variant uppercase">
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Secure Status</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm divide-y divide-surface-container-low">
              <tr className="hover:bg-surface-container-low/50 transition-colors">
                <td className="py-4 px-4 font-mono font-medium text-on-surface">TXN-8849-2025</td>
                <td className="py-4 px-4 text-on-surface-variant">12 Apr 2025, 14:32</td>
                <td className="py-4 px-4 text-on-surface">Visa Infinite •••• 4892</td>
                <td className="py-4 px-4 font-semibold text-on-surface">₹4,890</td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-[10px] uppercase font-bold">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    Settled Securely
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-low/50 transition-colors">
                <td className="py-4 px-4 font-mono font-medium text-on-surface">TXN-7120-2025</td>
                <td className="py-4 px-4 text-on-surface-variant">02 Mar 2025, 09:15</td>
                <td className="py-4 px-4 text-on-surface">Google Pay UPI (sarah.j)</td>
                <td className="py-4 px-4 font-semibold text-on-surface">₹12,400</td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-[10px] uppercase font-bold">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    Settled Securely
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-low/50 transition-colors">
                <td className="py-4 px-4 font-mono font-medium text-on-surface">TXN-5491-2025</td>
                <td className="py-4 px-4 text-on-surface-variant">14 Feb 2025, 18:44</td>
                <td className="py-4 px-4 text-on-surface">Apple Pay Token</td>
                <td className="py-4 px-4 font-semibold text-on-surface">₹8,750</td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-[10px] uppercase font-bold">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    Settled Securely
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Payment Instrument Modal (Validated with Zod) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-xl shadow-[0_20px_40px_-15px_rgba(24,24,27,0.2)] p-space-lg border border-surface-container-high/80">
            <div className="flex items-center justify-between pb-space-md mb-space-md border-b border-surface-container-high">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Add New Payment Instrument
                </h3>
                <span className="font-label-caps text-label-caps text-secondary uppercase font-bold">
                  PCI-DSS Level 1 &bull; Validated via Zod
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-outline hover:text-on-surface transition-colors p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-space-md" noValidate>
              {/* Payment Type Selection */}
              <div>
                <label className="font-label-caps text-label-caps text-on-surface uppercase block mb-1">
                  Payment Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType("card")
                      setErrors({})
                    }}
                    className={`h-10 px-3 font-label-sm text-label-sm uppercase rounded font-medium transition-colors cursor-pointer ${
                      paymentType === "card"
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface"
                    }`}
                  >
                    Credit/Debit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType("upi")
                      setErrors({})
                    }}
                    className={`h-10 px-3 font-label-sm text-label-sm uppercase rounded font-medium transition-colors cursor-pointer ${
                      paymentType === "upi"
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface"
                    }`}
                  >
                    UPI Handle
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType("wallet")
                      setErrors({})
                    }}
                    className={`h-10 px-3 font-label-sm text-label-sm uppercase rounded font-medium transition-colors cursor-pointer ${
                      paymentType === "wallet"
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface"
                    }`}
                  >
                    Wallet Token
                  </button>
                </div>
              </div>

              {/* Card Form */}
              {paymentType === "card" && (
                <>
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface uppercase block mb-1">
                      Card Number *
                    </label>
                    <input
                      type="text"
                      maxLength={19}
                      value={cardForm.cardNumber}
                      onChange={(e) => {
                        setCardForm({ ...cardForm, cardNumber: formatCardNumber(e.target.value) })
                        if (errors.cardNumber) setErrors({ ...errors, cardNumber: "" })
                      }}
                      className={`w-full h-11 px-3 bg-surface-container-low rounded border ${
                        errors.cardNumber ? "border-error" : "border-surface-container-high"
                      } focus:outline-none focus:border-primary text-on-surface font-mono`}
                      placeholder="4111 2222 3333 4444"
                    />
                    {errors.cardNumber && (
                      <p className="text-xs text-error mt-1">{errors.cardNumber}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-label-caps text-label-caps text-on-surface uppercase block mb-1">
                        Expiry Date (MM / YY) *
                      </label>
                      <input
                        type="text"
                        maxLength={7}
                        value={cardForm.expiry}
                        onChange={(e) => {
                          setCardForm({ ...cardForm, expiry: formatExpiry(e.target.value) })
                          if (errors.expiry) setErrors({ ...errors, expiry: "" })
                        }}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded border ${
                          errors.expiry ? "border-error" : "border-surface-container-high"
                        } focus:outline-none focus:border-primary text-on-surface font-mono`}
                        placeholder="MM / YY"
                      />
                      {errors.expiry && (
                        <p className="text-xs text-error mt-1">{errors.expiry}</p>
                      )}
                    </div>
                    <div>
                      <label className="font-label-caps text-label-caps text-on-surface uppercase block mb-1">
                        CVV / Security Code *
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardForm.cvv}
                        onChange={(e) => {
                          setCardForm({ ...cardForm, cvv: e.target.value })
                          if (errors.cvv) setErrors({ ...errors, cvv: "" })
                        }}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded border ${
                          errors.cvv ? "border-error" : "border-surface-container-high"
                        } focus:outline-none focus:border-primary text-on-surface font-mono`}
                        placeholder="123"
                      />
                      {errors.cvv && (
                        <p className="text-xs text-error mt-1">{errors.cvv}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface uppercase block mb-1">
                      Cardholder Name *
                    </label>
                    <input
                      type="text"
                      value={cardForm.cardholderName}
                      onChange={(e) => {
                        setCardForm({ ...cardForm, cardholderName: e.target.value })
                        if (errors.cardholderName) setErrors({ ...errors, cardholderName: "" })
                      }}
                      className={`w-full h-11 px-3 bg-surface-container-low rounded border ${
                        errors.cardholderName ? "border-error" : "border-surface-container-high"
                      } focus:outline-none focus:border-primary text-on-surface font-body-sm`}
                      placeholder="e.g. Sarah Jenkins"
                    />
                    {errors.cardholderName && (
                      <p className="text-xs text-error mt-1">{errors.cardholderName}</p>
                    )}
                  </div>
                </>
              )}

              {/* UPI Form */}
              {paymentType === "upi" && (
                <>
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface uppercase block mb-1">
                      UPI Virtual Payment Address (VPA) *
                    </label>
                    <input
                      type="text"
                      value={upiForm.vpa}
                      onChange={(e) => {
                        setUpiForm({ ...upiForm, vpa: e.target.value })
                        if (errors.vpa) setErrors({ ...errors, vpa: "" })
                      }}
                      className={`w-full h-11 px-3 bg-surface-container-low rounded border ${
                        errors.vpa ? "border-error" : "border-surface-container-high"
                      } focus:outline-none focus:border-primary text-on-surface font-mono`}
                      placeholder="username@okhdfcbank"
                    />
                    {errors.vpa && <p className="text-xs text-error mt-1">{errors.vpa}</p>}
                  </div>

                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface uppercase block mb-1">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      value={upiForm.holderName}
                      onChange={(e) => {
                        setUpiForm({ ...upiForm, holderName: e.target.value })
                        if (errors.holderName) setErrors({ ...errors, holderName: "" })
                      }}
                      className={`w-full h-11 px-3 bg-surface-container-low rounded border ${
                        errors.holderName ? "border-error" : "border-surface-container-high"
                      } focus:outline-none focus:border-primary text-on-surface font-body-sm`}
                      placeholder="Sarah Jenkins"
                    />
                    {errors.holderName && (
                      <p className="text-xs text-error mt-1">{errors.holderName}</p>
                    )}
                  </div>
                </>
              )}

              {/* Wallet Token Info */}
              {paymentType === "wallet" && (
                <div className="p-4 bg-surface-container-low rounded-lg text-body-sm text-on-surface-variant">
                  <p>
                    Clicking &ldquo;Save Securely&rdquo; will initiate biometric device pairing
                    for instant tokenized Apple Pay and Google Wallet checkouts.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-space-sm flex items-center justify-end gap-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-11 px-6 bg-surface-container text-on-surface font-label-sm text-label-sm uppercase rounded hover:bg-surface-container-high transition-colors font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-11 px-6 bg-primary text-on-primary font-label-sm text-label-sm uppercase rounded hover:bg-inverse-surface transition-colors font-medium shadow-sm cursor-pointer"
                >
                  Save Securely
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
