/* Response shapes of the API's /rider routes (apps/backend/src/routes/rider). Dates are ISO strings. */

export type RiderStatus = "pending" | "approved" | "suspended" | "rejected"
export const DOCUMENT_TYPES = ["driving_licence", "vehicle_rc", "aadhaar", "pan", "insurance"] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]
export type Shift = { day: number; start: string; end: string }

export type Rider = {
  _id: string
  email: string
  phone: string
  name: string
  status: RiderStatus
  statusReason?: string
  vehicle: { type: "bicycle" | "bike" | "scooter" | "van"; registration?: string }
  documents: { type: DocumentType; number: string; verified: boolean }[]
  warehouseId: string | null
  zoneIds: string[]
  shifts: Shift[]
  online: boolean
  onlineSince?: string
}

export type Me = {
  rider: Rider
  zones: { _id: string; code: string; name: string; pincodes: string[] }[]
  warehouse: { _id: string; code: string; name: string; address: string; city: string; pincode: string; lat?: number | null; lng?: number | null } | null
  payout: { perDelivery: number; perFailedAttempt: number }
  failedReasons: FailReason[]
}

export type FailReason = "customer_unavailable" | "customer_refused" | "address_not_found" | "customer_rescheduled" | "cash_not_ready" | "premises_closed" | "unsafe_location" | "other"

export type TaskStatus = "unassigned" | "offered" | "assigned" | "picked_up" | "out_for_delivery" | "attempt_failed" | "delivered" | "rto" | "returned" | "cancelled"

export type Task = {
  _id: string
  code: string
  displayId: number
  status: TaskStatus
  sequence: number | null
  area: { city: string; postalCode: string }
  cod: { due: number; currency: string; collected: number | null } | null
  attempts: { at: string; reason: FailReason; note: string | null; rescheduledFor: string | null }[]
  offer: { expiresAt: string } | null
  otpIssued: boolean
  delivered: { at: string; receiverName: string } | null
  earnings: number
  updatedAt: string
  stop?: {
    name: string
    address1: string
    address2: string | null
    city: string
    postalCode: string
    instructions: string | null
    lat: number | null
    lng: number | null
    phone: string | null
  } | null
}

export type Remittance = { _id: string; code: string; expected: number; declared: number; counted?: number; status: "submitted" | "reconciled" | "mismatch"; note?: string; submittedAt: string; reconciledAt?: string }
export type Cash = { inHand: number; parcels: { code: string; displayId: number; amount: number; at: string | null }[]; remittances: Remittance[] }
export type Earnings = { from: string; to: string; deliveries: number; failedAttempts: number; amount: number; currency: string }
