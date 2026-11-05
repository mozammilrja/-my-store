/* Response shapes of the API's /seller routes (apps/backend/src/routes/seller). Dates are ISO strings; money in paise. */

export type SellerStatus = "draft" | "submitted" | "approved" | "suspended" | "rejected"
export type Address = { line1: string; city: string; state: string; postalCode: string }

export type Seller = {
  _id: string
  code: string
  displayName: string
  email: string
  phone: string
  status: SellerStatus
  statusReason?: string
  businessType?: "individual" | "proprietorship" | "partnership" | "llp" | "company"
  legalName?: string
  pan?: string
  gstin?: string | null
  registeredAddress?: Address
  bank: { accountName: string; ifsc: string; last4: string } | null
  verified: { pan: boolean; gstin: boolean; bank: boolean }
  fulfilmentModel: "seller" | "platform"
  pickupAddress?: Address & { phone: string }
  warehouseId?: string | null
}

export type Terms = { commissionPct: number; fulfilmentFeePerUnit: number; feeGstPct: number; tcsPct: number; tdsPct: number; acceptSlaHours: number; dispatchSlaHours: number }
export type Me = { seller: Seller; warehouse: { code: string; name: string; city: string; pincode: string; acceptsOrders?: boolean } | null; terms: Terms }

export type Listing = {
  id: string
  title: string
  description: string | null
  status: "draft" | "published"
  review: { status: "draft" | "pending" | "approved" | "rejected"; note?: string; submittedAt?: string; reviewedAt?: string }
  categoryIds: string[]
  images: { path: string; url: string }[]
  options: { title: string; values: string[] }[]
  material: string | null
  weight: number | null
  variants: { id: string; sku: string; title: string; options: Record<string, string>; price: number; compareAtPrice: number | null; stock: number }[]
  updatedAt: string
}

export type StockRow = { variantId: string; sku: string; productTitle: string; variantTitle: string; available: number; reserved: number; damaged: number; warehouses: { code: string; available: number }[] }

export type FulfilmentStatus = "assigned" | "picking_pending" | "picking" | "picked" | "qc_passed" | "packed" | "label_generated" | "ready_to_dispatch" | "manifested" | "handed_over" | "dispatched" | "rejected" | "cancelled"
export type SellerOrder = {
  _id: string
  code: string
  orderId: string
  displayId: number
  status: FulfilmentStatus
  paymentMethod: "cod" | "razorpay"
  destination: { city: string; state: string; postalCode: string }
  lines: { itemId: string; sku: string; productTitle: string; variantTitle: string; quantity: number }[]
  package?: { code: string; weightKg: number }
  awb?: string
  carrier?: string
  createdAt: string
  dispatchedAt?: string
  cancelReason?: string
}

export type Sale = { orderId: string; displayId: number; createdAt: string; status: string; fulfillmentStatus: string; paymentMethod: string; city: string; items: { itemId: string; productTitle: string; variantTitle: string; quantity: number; unitPrice: number }[] }

export type SellerReturn = { id: string; code: string; displayId: number; type: "return" | "exchange"; status: string; requestedAt: string; items: { itemId: string; productTitle: string; variantTitle: string; quantity: number; reason: string; note: string | null }[]; inspection: unknown }

export type LedgerEntry = { _id: string; orderId: string; displayId: number; kind: string; reversal: boolean; amount: number; quantity: number; status: "pending" | "settled"; payableFrom: string; note?: string; createdAt: string }
export type Settlement = { _id: string; code: string; periodEnd: string; net: number; status: "pending" | "paid"; totals: Record<string, number>; payout?: { utr: string; paidAt: string }; createdAt: string }
export type Balance = { payableNow: number; waiting: number; paidOut: number }

export type Performance = {
  from: string
  to: string
  sla: { acceptHours: number; dispatchHours: number }
  sales: { gross: number; refunded: number; unitsSold: number; unitsReturned: number; returnRate: number }
  fees: { commission: number; commissionGst: number; fulfilment: number; tcs: number; tds: number }
  net: number
  fulfilment: { orders: number; declined: number; accepted: number; acceptedLate: number; medianAcceptHours: number | null; dispatched: number; dispatchedLate: number; medianDispatchHours: number | null; waitingToAccept: number; undelivered: number } | null
}

export type Inbound = { _id: string; code: string; warehouseId: string; status: "created" | "in_transit" | "receiving" | "closed"; carrier?: string; awb?: string; lines: { variantId: string; sku: string; title: string; expected: number; received: number }[]; createdAt: string }
