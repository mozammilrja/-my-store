"use client"

import { paymentOutcome, placeOrder, startOnlinePayment, type OnlinePaymentIntent } from "@lib/data/shop"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { MIcon } from "./m-icon"

type OnlineMethod = "upi" | "card" | "netbanking"

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
type RazorpayFailure = { error?: { description?: string; reason?: string } }
type RazorpayInstance = { open: () => void; close: () => void; on: (event: "payment.failed", cb: (r: RazorpayFailure) => void) => void }
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance

declare global {
  interface Window {
    Razorpay?: RazorpayCtor
  }
}

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js"

/** Loads Razorpay's Checkout script once (allowed by the storefront CSP). */
const loadRazorpay = () =>
  new Promise<RazorpayCtor>((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay)
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`)
    const script = existing ?? document.createElement("script")
    script.addEventListener("load", () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("unavailable"))))
    script.addEventListener("error", () => reject(new Error("unavailable")))
    if (!existing) {
      script.src = SCRIPT
      script.async = true
      document.body.appendChild(script)
    }
  })

type Status = "starting" | "with-provider" | "dismissed" | "confirming" | "error"

const METHOD_NAME: Record<OnlineMethod, string> = { upi: "UPI", card: "Credit / Debit Card", netbanking: "Net Banking" }

/**
 * Shown while an online payment is with the provider. Everwear never asks for
 * an OTP, PIN or password here: the bank's verification (3-D Secure, UPI PIN,
 * net-banking login) happens inside Razorpay's window, and this page only
 * reports where the payment stands.
 */
export function AuthenticateView({
  available,
  method,
  amount,
  merchant,
  countryCode,
  prefill,
}: {
  available: boolean
  method: OnlineMethod
  amount: string
  merchant: string
  countryCode: string
  prefill: { name: string; email: string; contact: string }
}) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>(available ? "starting" : "error")
  const [message, setMessage] = useState<string | null>(available ? null : "Online payment isn't available on this store right now.")
  const [intent, setIntent] = useState<OnlinePaymentIntent | null>(null)
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const rzp = useRef<RazorpayInstance | null>(null)
  const started = useRef(false)

  const backToPayment = `/checkout?step=payment&method=${method}`

  const failTo = useCallback(
    (reason: string) => router.push(`/${countryCode}/checkout/payment-failed?method=${method}&reason=${encodeURIComponent(reason)}`),
    [router, countryCode, method]
  )

  const open = useCallback(async () => {
    setStatus("starting")
    setMessage(null)
    try {
      const result = intent ? { error: null, intent } : await startOnlinePayment()
      if (result.error || !result.intent) {
        setStatus("error")
        setMessage(result.error ?? "The payment couldn't be started.")
        return
      }
      const current = result.intent
      setIntent(current)
      setStartedAt(new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "medium" }).format(new Date()))
      const Razorpay = await loadRazorpay()
      const instance = new Razorpay({
        key: current.keyId,
        order_id: current.razorpayOrderId,
        amount: current.amount,
        currency: current.currency.toUpperCase(),
        name: merchant,
        description: "Everwear order",
        prefill: { ...prefill, method },
        handler: async (r: RazorpayResponse) => {
          setStatus("confirming")
          const form = new FormData()
          form.append("countryCode", countryCode)
          form.append("paymentMethod", "razorpay")
          form.append("razorpayOrderId", r.razorpay_order_id)
          form.append("razorpayPaymentId", r.razorpay_payment_id)
          form.append("razorpaySignature", r.razorpay_signature)
          // The bank approved: confirm with the API. If that fails, the payment
          // may still settle (bank slow to confirm, network drop, or the webhook
          // gets there first), so check its real status before saying it failed.
          const settleOrFail = async (reason: string) => {
            for (let i = 0; i < 10; i++) {
              const outcome = await paymentOutcome()
              if (outcome.status === "paid" && outcome.orderId) {
                router.push(`/${countryCode}/order/${outcome.orderId}/confirmed`)
                return
              }
              if (outcome.status === "failed" || outcome.status === "refunded") break
              await new Promise((r) => setTimeout(r, 3000))
            }
            failTo(reason)
          }
          try {
            const placed = await placeOrder({ error: null }, form)
            if (placed?.error) await settleOrFail(placed.error)
          } catch (e) {
            const m = e instanceof Error ? e.message : String(e)
            if (!m.includes("NEXT_REDIRECT")) await settleOrFail(m)
          }
        },
        modal: { ondismiss: () => setStatus((s) => (s === "confirming" ? s : "dismissed")) },
      })
      instance.on("payment.failed", (r) => {
        instance.close()
        failTo(r.error?.description || "Your bank declined the payment.")
      })
      rzp.current = instance
      setStatus("with-provider")
      instance.open()
    } catch {
      setStatus("error")
      setMessage("The secure payment window couldn't be opened. Check your connection and try again.")
    }
  }, [intent, merchant, prefill, method, countryCode, failTo, router])

  useEffect(() => {
    if (!available || started.current) return
    started.current = true
    void open()
  }, [available, open])

  const heading =
    status === "starting"
      ? "Opening your bank's secure window"
      : status === "with-provider"
        ? "Complete the verification in your bank's window"
        : status === "dismissed"
          ? "The payment window was closed"
          : status === "confirming"
            ? "Confirming your payment"
            : "Online payment unavailable"

  const detail =
    status === "starting"
      ? "Connecting to Razorpay. This takes a moment."
      : status === "with-provider"
        ? "Approve the payment where your bank asks you to: an OTP, your UPI app or your net-banking login. Everwear never asks for these on this page."
        : status === "dismissed"
          ? "No money has been taken. Reopen the window to finish paying, or go back and choose another way to pay."
          : status === "confirming"
            ? "Your bank approved the payment. We're verifying it and placing your order; don't close this page."
            : message ?? "Online payment isn't available right now."

  return (
    <section className="w-full py-space-xl px-margin-mobile md:px-margin flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute w-96 h-96 rounded-full bg-secondary-fixed/30 blur-3xl -top-20 -left-20 pointer-events-none" aria-hidden />
      <div className="absolute w-80 h-80 rounded-full bg-surface-container-high/80 blur-2xl -bottom-16 -right-16 pointer-events-none" aria-hidden />

      {/* Gateway Identity & Compliance Badge */}
      <div className="w-full max-w-xl mb-space-md flex flex-wrap items-center justify-between gap-y-space-xs text-on-surface-variant font-label-caps text-label-caps tracking-widest uppercase relative z-10">
        <div className="flex items-center gap-space-xs">
          <span className={`inline-block w-2 h-2 rounded-full bg-on-background ${available ? "animate-pulse" : ""}`} aria-hidden />
          <span>{available ? "Razorpay Secure Payment Gateway" : "Secure Checkout"}</span>
        </div>
        <div className="text-right">
          <span>Merchant: {merchant}</span>
        </div>
      </div>

      {/* Core verification card */}
      <div className="w-full max-w-xl bg-surface-container-lowest shadow-xl rounded-xl p-space-lg md:p-space-xl relative z-10 flex flex-col gap-space-lg" data-testid="payment-authenticate">
        <div className="flex items-center justify-between gap-space-sm pb-space-sm">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary shrink-0">
              <MIcon name={method === "upi" ? "qr_code_2" : method === "card" ? "credit_card" : "account_balance"} className="text-[22px]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-headline-sm text-primary font-medium tracking-tight uppercase">{METHOD_NAME[method]}</span>
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Payment Security Verification</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs bg-surface-container-low px-space-sm py-space-xs rounded-lg shrink-0">
            <MIcon name="verified_user" className="text-primary text-[18px]" />
            <span className="font-label-caps text-label-caps text-primary uppercase">Identity Check</span>
          </div>
        </div>

        {/* Transaction Spec Sheet */}
        <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-space-sm">
          <div className="flex items-baseline justify-between gap-space-sm">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Amount</span>
            <span className="font-headline-lg text-headline-lg text-primary font-medium" data-testid="authenticate-amount">
              {amount}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-space-xs font-body-sm text-body-sm text-on-surface-variant">
            <div>
              <span className="block text-outline font-label-caps text-label-caps uppercase">Payment Instrument</span>
              <span className="text-on-surface font-medium">{METHOD_NAME[method]}, chosen in the bank window</span>
            </div>
            <div>
              <span className="block text-outline font-label-caps text-label-caps uppercase">Merchant</span>
              <span className="text-on-surface font-medium">{merchant}</span>
            </div>
            <div>
              <span className="block text-outline font-label-caps text-label-caps uppercase">Session Started</span>
              <span className="text-on-surface font-medium">{startedAt ?? "Not started"}</span>
            </div>
            <div>
              <span className="block text-outline font-label-caps text-label-caps uppercase">Gateway Reference</span>
              <span className="text-on-surface font-medium break-all">{intent?.razorpayOrderId ?? "Issued when the window opens"}</span>
            </div>
          </div>
        </div>

        {/* Authentication status (replaces the export's OTP boxes: the bank collects those) */}
        <div className="flex flex-col gap-space-md" aria-live="polite">
          <div className="flex flex-col gap-space-xs">
            <h1 className="font-headline-sm text-headline-sm text-primary" data-testid="authenticate-status">
              {heading}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{detail}</p>
          </div>
          <div className="flex items-center gap-space-sm p-space-md bg-surface-container rounded-lg">
            <MIcon
              name={status === "error" ? "block" : status === "dismissed" ? "pause_circle" : status === "confirming" ? "hourglass_top" : "open_in_new"}
              className={`text-[22px] text-primary ${status === "starting" || status === "confirming" ? "animate-pulse" : ""}`}
            />
            <span className="font-body-sm text-body-sm text-on-surface">
              {status === "error"
                ? "Pay on Delivery is available for this order."
                : status === "confirming"
                  ? "Verifying with the gateway…"
                  : status === "dismissed"
                    ? "Waiting for you to reopen the window."
                    : "Your bank's verification happens in Razorpay's window, not on this page."}
            </span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex flex-col gap-space-sm pt-space-xs">
          {status === "error" ? (
            <LocalizedClientLink
              href="/checkout?step=payment&method=cod"
              className="w-full bg-primary text-on-primary py-space-sm px-space-md rounded-lg font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-space-xs hover:bg-primary-container transition-colors shadow-md"
              data-testid="authenticate-back-to-payment"
            >
              <MIcon name="arrow_back" className="text-[18px]" />
              <span>Back to payment options</span>
            </LocalizedClientLink>
          ) : (
            <button
              className="w-full bg-primary text-on-primary py-space-sm px-space-md rounded-lg font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-space-xs hover:bg-primary-container transition-colors shadow-md disabled:opacity-60"
              type="button"
              disabled={status === "starting" || status === "confirming"}
              onClick={() => (rzp.current && status === "with-provider" ? rzp.current.open() : open())}
              data-testid="authenticate-reopen"
            >
              <MIcon name="lock" className="text-[18px]" />
              <span>Reopen secure window · {amount}</span>
            </button>
          )}
          {status !== "confirming" && (
            <LocalizedClientLink
              className="w-full text-center py-space-xs text-on-surface-variant hover:text-primary font-label-sm text-label-sm uppercase tracking-wider transition-colors"
              href={backToPayment}
              onClick={() => rzp.current?.close()}
              data-testid="authenticate-cancel"
            >
              Cancel Transaction &amp; Return to Everwear
            </LocalizedClientLink>
          )}
        </div>

        <div className="bg-surface-container-low p-space-sm rounded-lg flex items-start gap-space-xs">
          <MIcon name="info" className="text-outline text-[18px] shrink-0 mt-0.5" />
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            Do not refresh this window or press Back while your bank is verifying the payment. Everwear will never ask you for an OTP, PIN or password.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-space-lg gap-y-space-xs pt-space-xs opacity-75">
          <div className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant tracking-wider uppercase">
            <MIcon name="shield" className="text-[16px]" />
            <span>Razorpay Secured</span>
          </div>
          <div className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant tracking-wider uppercase">
            <MIcon name="verified" className="text-[16px]" />
            <span>3-D Secure by your bank</span>
          </div>
          <div className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant tracking-wider uppercase">
            <MIcon name="key" className="text-[16px]" />
            <span>PCI-DSS Level 1</span>
          </div>
        </div>
      </div>
    </section>
  )
}
