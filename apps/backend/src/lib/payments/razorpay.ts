import crypto from "node:crypto"
import { env } from "../../env.js"

export interface RazorpayOrderResult {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  status: string
  attempts: number
  notes: Record<string, string>
  created_at: number
}

export interface RazorpayRefundResult {
  id: string
  entity: string
  amount: number
  currency: string
  payment_id: string
  status: string
  created_at: number
}

export function isRazorpayConfigured(): boolean {
  return !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)
}

/**
 * Creates an order on Razorpay for collecting payment.
 * Amount must be an integer in minor units (e.g. paise for INR).
 */
export async function createRazorpayOrder(params: {
  amount: number
  currency: string
  receipt: string
  notes?: Record<string, string>
}): Promise<RazorpayOrderResult> {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured in environment.")
  }

  const authHeader = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Razorpay order creation failed: ${data?.error?.description ?? res.statusText}`)
  }

  return data as RazorpayOrderResult
}

/**
 * Cryptographically validates the HMAC-SHA256 signature returned by the Razorpay frontend checkout.
 */
export function verifyRazorpaySignature(params: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
  secret?: string
}): boolean {
  const secret = params.secret ?? env.RAZORPAY_KEY_SECRET ?? process.env.RAZORPAY_KEY_SECRET
  if (!secret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured.")
  }

  const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(params.razorpaySignature, "utf8")
    )
  } catch {
    return false
  }
}

/**
 * Validates a Razorpay webhook signature from the x-razorpay-signature header.
 */
export function verifyRazorpayWebhook(payload: string | Buffer, signature: string, customSecret?: string): boolean {
  const secret = customSecret ?? env.RAZORPAY_WEBHOOK_SECRET ?? process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured.")
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(signature, "utf8")
    )
  } catch {
    return false
  }
}

/**
 * Initiates an instant refund through Razorpay's Refund API.
 */
export async function createRazorpayRefund(params: {
  paymentId: string
  amount: number
  notes?: Record<string, string>
}): Promise<RazorpayRefundResult> {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay credentials are not configured.")
  }

  const authHeader = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")
  const res = await fetch(`https://api.razorpay.com/v1/payments/${params.paymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amount,
      notes: params.notes ?? {},
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Razorpay refund failed: ${data?.error?.description ?? res.statusText}`)
  }

  return data as RazorpayRefundResult
}
