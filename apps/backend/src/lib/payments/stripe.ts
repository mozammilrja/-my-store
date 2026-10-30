import crypto from "node:crypto"
import { env } from "../../env.js"

export interface StripePaymentIntentResult {
  id: string
  object: string
  amount: number
  client_secret: string
  currency: string
  status: string
  metadata: Record<string, string>
}

export interface StripeRefundResult {
  id: string
  object: string
  amount: number
  currency: string
  payment_intent?: string
  status: string
}

export function isStripeConfigured(): boolean {
  return !!env.STRIPE_SECRET_KEY
}

/**
 * Creates a Stripe PaymentIntent for Europe/international orders.
 * Amount is in minor units (e.g. cents for EUR/GBP).
 */
export async function createStripePaymentIntent(params: {
  amount: number
  currency: string
  metadata?: Record<string, string>
}): Promise<StripePaymentIntentResult> {
  if (!isStripeConfigured()) {
    throw new Error("Stripe secret key (STRIPE_SECRET_KEY) is not configured.")
  }

  const body = new URLSearchParams()
  body.append("amount", String(params.amount))
  body.append("currency", params.currency.toLowerCase())
  body.append("automatic_payment_methods[enabled]", "true")
  if (params.metadata) {
    for (const [k, v] of Object.entries(params.metadata)) {
      body.append(`metadata[${k}]`, v)
    }
  }

  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Stripe payment intent creation failed: ${data?.error?.message ?? res.statusText}`)
  }

  return data as StripePaymentIntentResult
}

/**
 * Validates a Stripe webhook payload against the stripe-signature header using tolerance checking.
 */
export function verifyStripeWebhook(payload: string | Buffer, header: string, toleranceSeconds = 300, customSecret?: string): boolean {
  const secret = customSecret ?? env.STRIPE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.")
  }

  const parts = header.split(",").reduce((acc, part) => {
    const [key, value] = part.split("=")
    if (key && value) acc[key.trim()] = value.trim()
    return acc
  }, {} as Record<string, string>)

  const timestamp = parts["t"]
  const expectedSig = parts["v1"]
  if (!timestamp || !expectedSig) return false

  const timestampNum = parseInt(timestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestampNum) > toleranceSeconds) {
    return false
  }

  const payloadStr = Buffer.isBuffer(payload) ? payload.toString("utf8") : payload
  const signedPayload = `${timestamp}.${payloadStr}`
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex")

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expectedSig, "utf8")
    )
  } catch {
    return false
  }
}

/**
 * Creates a Stripe Refund for a payment intent.
 */
export async function createStripeRefund(params: {
  paymentIntentId: string
  amount?: number
  reason?: "duplicate" | "fraudulent" | "requested_by_customer"
}): Promise<StripeRefundResult> {
  if (!isStripeConfigured()) {
    throw new Error("STRIPE_SECRET_KEY is not configured.")
  }

  const body = new URLSearchParams()
  body.append("payment_intent", params.paymentIntentId)
  if (params.amount) {
    body.append("amount", String(params.amount))
  }
  if (params.reason) {
    body.append("reason", params.reason)
  }

  const res = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Stripe refund failed: ${data?.error?.message ?? res.statusText}`)
  }

  return data as StripeRefundResult
}
