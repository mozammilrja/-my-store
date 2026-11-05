import crypto from "node:crypto"
import { env } from "../../env.js"
import { providerJson } from "../providers/http.js"

/*
 * Razorpay REST API (https://razorpay.com/docs/api/). Amounts are integers in
 * the smallest currency unit (paise). Only the key id ever reaches a browser;
 * the secret signs requests here and verifies signatures.
 */

export type RazorpayOrder = {
  id: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  status: "created" | "attempted" | "paid"
  notes: Record<string, string>
  created_at: number
}

export type RazorpayPayment = {
  id: string
  order_id: string | null
  amount: number
  currency: string
  status: "created" | "authorized" | "captured" | "refunded" | "failed"
  method: string
  captured: boolean
  amount_refunded: number
  error_code?: string | null
  error_description?: string | null
  email?: string
  created_at: number
}

export type RazorpayRefund = {
  id: string
  payment_id: string
  amount: number
  currency: string
  status: "pending" | "processed" | "failed"
  notes: Record<string, string>
  created_at: number
}

export const isRazorpayConfigured = () => !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)

const call = <T>(path: string, options: Parameters<typeof providerJson>[2] = {}) => {
  if (!isRazorpayConfigured()) throw new Error("Razorpay is not configured (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET).")
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")
  return providerJson<T>("Razorpay", `${env.RAZORPAY_API_BASE}/v1${path}`, {
    ...options,
    headers: { authorization: `Basic ${auth}`, ...options.headers },
  })
}

/** A Razorpay order for an exact amount; the checkout window can only collect that amount. */
export const createRazorpayOrder = (params: { amount: number; currency: string; receipt: string; notes?: Record<string, string> }) =>
  call<RazorpayOrder>("/orders", {
    method: "POST",
    body: { amount: params.amount, currency: params.currency.toUpperCase(), receipt: params.receipt, notes: params.notes ?? {} },
  })

export const fetchRazorpayPayment = (paymentId: string) => call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`)

export const fetchRazorpayOrderPayments = async (orderId: string) =>
  (await call<{ items: RazorpayPayment[] }>(`/orders/${encodeURIComponent(orderId)}/payments`)).items

/** Captures an authorized payment (accounts without auto-capture). Capturing twice is rejected by Razorpay, never charged twice. */
export const captureRazorpayPayment = (paymentId: string, amount: number, currency: string) =>
  call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}/capture`, {
    method: "POST",
    body: { amount, currency: currency.toUpperCase() },
  })

/**
 * Refunds part or all of a captured payment. `receipt` is our refund id:
 * Razorpay rejects a second refund with the same receipt, which keeps a retried
 * request from refunding twice.
 */
export const createRazorpayRefund = (params: { paymentId: string; amount: number; receipt: string; notes?: Record<string, string> }) =>
  call<RazorpayRefund>(`/payments/${encodeURIComponent(params.paymentId)}/refund`, {
    method: "POST",
    body: { amount: params.amount, receipt: params.receipt, notes: params.notes ?? {} },
  })

export const fetchRazorpayRefund = (paymentId: string, refundId: string) =>
  call<RazorpayRefund>(`/payments/${encodeURIComponent(paymentId)}/refunds/${encodeURIComponent(refundId)}`)

export const fetchRazorpayPaymentRefunds = async (paymentId: string) =>
  (await call<{ items: RazorpayRefund[] }>(`/payments/${encodeURIComponent(paymentId)}/refunds`)).items

const safeEqualHex = (expected: string, given: string) => {
  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(given, "utf8")
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** The checkout handler's signature: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export function verifyRazorpaySignature(params: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
  if (!env.RAZORPAY_KEY_SECRET) return false
  const expected = crypto.createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`).digest("hex")
  return safeEqualHex(expected, params.razorpaySignature)
}

/** Webhook signature: HMAC-SHA256 of the raw request body with the webhook secret. */
export function verifyRazorpayWebhook(rawBody: Buffer | string, signature: string) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false
  const expected = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex")
  return safeEqualHex(expected, signature)
}
