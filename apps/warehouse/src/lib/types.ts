/*
 * Response shapes of the API's /warehouse routes, mirroring
 * apps/backend/src/db/schema.ts. Dates arrive as ISO strings.
 */

export type Permission = "view" | "accept" | "pick" | "qc" | "pack" | "label" | "dispatch" | "stock"
export type Role = "picker" | "packer" | "inspector" | "dispatcher" | "supervisor"

export type Me = {
  user: { id: string; email: string; name: string; role: Role; warehouseIds: string[] }
  permissions: Permission[]
  warehouses: { _id: string; code: string; name: string; city: string; pincode: string; status: "active" | "inactive" }[]
}

export const FULFILMENT_STATUSES = [
  "assigned",
  "picking_pending",
  "picking",
  "picked",
  "qc_passed",
  "packed",
  "label_generated",
  "ready_to_dispatch",
  "manifested",
  "handed_over",
  "dispatched",
  "rejected",
  "cancelled",
] as const
export type FulfilmentStatus = (typeof FULFILMENT_STATUSES)[number]

export type FulfilmentLine = {
  itemId: string
  productId: string
  variantId: string
  sku: string
  productTitle: string
  variantTitle: string
  options: Record<string, string>
  quantity: number
  reserved: boolean
  picked: number
  packed: number
  short: number
  binCode?: string | null
}

export type Fulfilment = {
  _id: string
  code: string
  orderId: string
  displayId: number
  warehouseId: string
  warehouseCode: string
  status: FulfilmentStatus
  lines: FulfilmentLine[]
  paymentMethod: "cod" | "razorpay"
  destination: { city: string; state: string; postalCode: string }
  assignment: { method: "auto" | "manual"; reason: string; proximity: number; at: string }
  pick?: { startedAt?: string; startedBy?: string; completedAt?: string }
  qc?: { result: "passed" | "failed"; at: string; by: string; notes?: string; failures: { itemId: string; quantity: number; reason: string }[] }
  package?: { code: string; weightKg: number; lengthCm: number; breadthCm: number; heightCm: number; packedAt: string; packedBy: string }
  shipmentId?: string
  awb?: string
  carrier?: string
  manifestId?: string
  handedOverAt?: string
  dispatchedAt?: string
  cancelReason?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type StatusEvent = {
  _id: string
  machine: string
  from: string | null
  to: string
  actor: { type: string; id: string; name?: string }
  reason?: string
  at: string
}

export type Label = { _id: string; awb: string; carrier: string; labelUrl?: string; status: string; provider: "shiprocket" | "manual" } | null

export type Summary = {
  byStatus: Partial<Record<FulfilmentStatus, number>>
  openManifests: number
  dispatchedToday: number
  damagedUnits: number
  oldestWaitingSince: string | null
}

export type Manifest = {
  _id: string
  code: string
  warehouseId: string
  carrier: string
  fulfilmentIds: string[]
  awbs: string[]
  scannedAwbs: string[]
  status: "open" | "closed"
  manifestUrls: string[]
  courierExecutive?: string
  createdAt: string
  closedAt?: string
}

export type StockLevel = {
  _id: string
  warehouseId: string
  warehouseCode: string
  productId: string
  variantId: string
  sku: string
  binCode?: string | null
  available: number
  reserved: number
  picked: number
  packed: number
  damaged: number
  quarantine: number
  dispatchedTotal: number
  receivedTotal: number
  productTitle: string
  variantTitle: string
  updatedAt: string
}

export type LedgerEntry = {
  _id: string
  sku: string
  reason: string
  from: string
  to: string
  quantity: number
  after: Record<string, number>
  ref: { type: string; id: string }
  note?: string
  actor: { type: string; id: string; name?: string }
  createdAt: string
}

export type CatalogItem = { productId: string; productTitle: string; variantId: string; variantTitle: string; options: Record<string, string>; sku: string }

export type ReturnLookup = {
  orderId: string
  displayId: number
  status: string
  reason: string
  awb: string | null
  items: { itemId: string; quantity: number; productTitle: string; variantTitle: string; variantId: string }[]
}
