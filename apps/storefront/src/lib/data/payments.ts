import "server-only"
import { cache } from "react"
import { api } from "../api/client"

/** Ways to pay that work right now, as reported by the API. */
export type PaymentMethods = {
  /** True when online payment (Razorpay) is configured. */
  online: boolean
  provider: "razorpay" | null
  methods: { upi: boolean; card: boolean; netbanking: boolean; cod: boolean }
}

/** Cash on delivery only: what checkout falls back to if the API can't be asked. */
const COD_ONLY: PaymentMethods = {
  online: false,
  provider: null,
  methods: { upi: false, card: false, netbanking: false, cod: true },
}

/**
 * Which payment methods checkout may offer. Never cached: availability follows
 * the API's configuration and must not go stale between deploys.
 */
export const getPaymentMethods = cache(async (): Promise<PaymentMethods> => {
  try {
    return await api<PaymentMethods>("/store/payment-methods", { cache: "no-store" })
  } catch {
    return COD_ONLY
  }
})
