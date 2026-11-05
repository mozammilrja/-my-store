import type { Collection } from "mongodb"
import { getDb } from "./client.js"

/**
 * Money is always an integer in the currency's minor unit (cents, paise).
 * `prices` maps a lowercase ISO currency code to that amount.
 */
export type Prices = Record<string, number>

export type Address = {
  firstName: string
  lastName: string
  company?: string
  address1: string
  address2?: string
  city: string
  postalCode: string
  province?: string
  countryCode: string
  phone?: string
}

export type RegionDoc = {
  _id: string
  name: string
  currency: string
  countries: { code: string; name: string }[]
  /** Percentage, e.g. 25 for 25% VAT. 0 when prices already include tax. */
  taxRate: number
  taxInclusive: boolean
  policies?: {
    returnWindowDays: number
    freeReturns: boolean
    shippingRate: number
    handlingDays: { min: number; max: number }
    transitDays: { min: number; max: number }
  }
  shippingOptions: { _id: string; name: string; amount: number }[]
  createdAt: Date
  updatedAt: Date
}

export type CategoryDoc = {
  _id: string
  handle: string
  name: string
  description?: string
  parentId?: string | null
  rank: number
  createdAt: Date
  updatedAt: Date
}

export type CollectionDoc = {
  _id: string
  handle: string
  title: string
  createdAt: Date
  updatedAt: Date
}

export type VariantDoc = {
  _id: string
  sku?: string
  title: string
  /** Option title to value, e.g. { Size: "M", Color: "Black" }. */
  options: Record<string, string>
  prices: Prices
  /** Original prices before a sale; omitted when not on sale. */
  compareAtPrices?: Prices
  manageInventory: boolean
  allowBackorder: boolean
  /** Units on hand. Only decremented inside an order transaction. */
  stock: number
  images?: string[]
}

export type ProductDoc = {
  _id: string
  handle: string
  title: string
  subtitle?: string
  brand?: string
  description?: string
  status: "draft" | "published"
  thumbnail?: string
  images: string[]
  categoryIds: string[]
  collectionId?: string | null
  tags: string[]
  options: { title: string; values: string[] }[]
  variants: VariantDoc[]
  material?: string
  originCountry?: string
  weight?: number
  /** Marketplace seller who lists it; absent for the store's own products. */
  sellerId?: string | null
  /** A seller's listing is published only after the store approves it. */
  review?: { status: "draft" | "pending" | "approved" | "rejected"; note?: string; submittedAt?: Date; reviewedAt?: Date; reviewedBy?: string }
  createdAt: Date
  updatedAt: Date
}

export type CustomerDoc = {
  _id: string
  email: string
  passwordHash?: string
  firstName?: string
  lastName?: string
  phone?: string
  addresses: (Address & { _id: string })[]
  /** Which channels order and delivery updates may use. WhatsApp only after an explicit opt-in (Meta policy). */
  notificationPrefs?: { email: boolean; sms: boolean; whatsapp: boolean; push: boolean; whatsappOptInAt?: Date }
  createdAt: Date
  updatedAt: Date
}

export type AdminUserRole =
  | "owner"
  | "staff"
  | "store_admin"
  | "catalog_manager"
  | "inventory_manager"
  | "order_manager"
  | "finance_manager"
  | "customer_support"

export type AdminUserDoc = {
  _id: string
  email: string
  passwordHash: string
  name?: string
  role: AdminUserRole
  /** Absent means active. A suspended admin can't sign in and loses access on the next request. */
  status?: "active" | "suspended"
  /** Bearer tokens issued before this are refused (sign out everywhere, suspension, password change). */
  sessionsRevokedAt?: Date
  createdAt: Date
  updatedAt: Date
}

/** One storefront image slot (see lib/site-media.ts); `_id` is its original path under /images/. */
export type SiteMediaDoc = {
  _id: string
  label: string
  group: string
  usedOn: string[]
  /** Sidebar order in the admin. */
  order: number
  /** What the storefront shows: an /uploads/ path, a shipped /images/ path, or an https URL. */
  url: string
  createdAt: Date
  updatedAt: Date
}

/** One document, id `store`: the knobs an owner can turn without a deploy. */
export type SettingsDoc = {
  _id: string
  storeName: string
  /** A variant at or under this count is reported as low stock. */
  lowStockThreshold: number
  supportEmail?: string
  /** Whether an order may ship from several warehouses when none holds all of it. Default true. */
  allowSplitFulfilment?: boolean
  /** Own delivery fleet rules; defaults in lib/fleet/settings.ts. */
  fleet?: Partial<FleetSettings>
  /** Marketplace fees and statutory deductions; defaults in lib/marketplace/settings.ts. */
  marketplace?: Partial<MarketplaceSettings>
  /**
   * Provider-side templates per notification event: DLT-registered MSG91
   * flow ids and approved WhatsApp templates. A channel whose provider needs
   * a template is skipped for events that have none.
   */
  notificationTemplates?: Partial<Record<NotificationEvent, ProviderTemplates>>
  /** The seller's legal details, printed on every GST tax invoice. */
  seller?: SellerDetails
  updatedAt: Date
}

/** Legal identity of the seller of record. Any field may be absent until set. */
export type SellerDetails = {
  legalName?: string
  gstin?: string
  cin?: string
  /** Registered address, one line; printed as written. */
  address?: string
  /** State with its GST state code, e.g. "Delhi (07)". */
  state?: string
  email?: string
  phone?: string
}

export type LineItem = {
  _id: string
  productId: string
  variantId: string
  productTitle: string
  productHandle: string
  variantTitle: string
  thumbnail?: string
  quantity: number
  unitPrice: number
}

/** A business buyer's GST registration, given at checkout for a B2B tax invoice. */
export type BuyerGstin = {
  /** 15-character GSTIN, upper case. */
  gstin: string
  /** Registered legal (trade) name of the business. */
  legalName: string
}

export type CartDoc = {
  _id: string
  regionId: string
  currency: string
  customerId?: string | null
  email?: string
  items: LineItem[]
  shippingAddress?: Address
  billingAddress?: Address
  shippingOptionId?: string
  /** Business buyer's GST registration, printed on the tax invoice. */
  buyerGstin?: BuyerGstin
  /** Shopper's note for the courier (gate code, leave with concierge...). */
  deliveryInstructions?: string
  promoCodes: string[]
  completedAt?: Date | null
  orderId?: string
  createdAt: Date
  updatedAt: Date
}

export type OrderTotals = {
  itemSubtotal: number
  discountTotal: number
  shippingTotal: number
  taxTotal: number
  total: number
}

export type PaymentDetails = {
  provider: "cod" | "razorpay"
  transactionId?: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  paidAt?: Date
  failureReason?: string
  refunds?: {
    id: string
    amount: number
    reason: string
    createdAt: Date
    providerRefundId?: string
  }[]
}

export type OrderDoc = {
  _id: string
  /** Human-friendly sequential number shown to customers (#1001). */
  displayId: number
  cartId: string
  regionId: string
  currency: string
  customerId?: string | null
  email: string
  items: LineItem[]
  shippingAddress: Address
  billingAddress: Address
  shippingOption: { _id: string; name: string; amount: number }
  /** Copied from the cart: the business buyer's GST registration, if any. */
  buyerGstin?: BuyerGstin
  /** Copied from the cart: the shopper's note for the courier. */
  deliveryInstructions?: string
  promoCodes: string[]
  totals: OrderTotals
  paymentMethod: "cod" | "razorpay"
  paymentStatus: "awaiting" | "paid" | "partially_refunded" | "refunded"
  paymentDetails?: PaymentDetails
  fulfillmentStatus: "unfulfilled" | "shipped" | "delivered" | "returned"
  /** Summary of the outbound shipment, copied from its ShipmentDoc for order pages. */
  shipment?: {
    /** Courier name as the provider reports it, e.g. "Delhivery Surface". */
    carrier: string
    /** Empty until the provider assigns an AWB. */
    awb: string
    status: ShipmentStatus
    labelUrl?: string
    trackingUrl?: string
    pickupScheduledAt?: Date
    estimatedDelivery?: Date
    shippedAt?: Date
    deliveredAt?: Date
  }
  returnRequest?: {
    /** Mirrors the latest ReturnDoc (the returns collection is the source of truth). */
    status: ReturnStatus
    /** The ReturnDoc this summarises; absent on summaries written before returns had their own collection. */
    returnId?: string
    type?: "return" | "exchange"
    reason: string
    items: { itemId: string; quantity: number }[]
    returnAwb?: string
    carrier?: string
    /** What the warehouse found when it opened the parcel. */
    inspection?: { warehouseId: string; at: Date; by: string; lines: { itemId: string; quantity: number; condition: "sellable" | "damaged"; notes?: string }[] }
    requestedAt: Date
    updatedAt: Date
  }
  /** For a replacement sent for an exchange: the original order and the return it settles. Nothing is charged on it. */
  exchangeOf?: { orderId: string; displayId: number; returnId: string }
  /** The shopper's doorstep choices, editable until the order ships. */
  deliveryPreferences?: {
    slot: "morning" | "evening" | null
    options: { measuringTape: boolean; reusableBox: boolean }
    updatedAt: Date
  }
  status: "pending" | "completed" | "canceled"
  createdAt: Date
  updatedAt: Date
}

export type PromotionDoc = {
  _id: string
  code: string
  type: "percentage" | "fixed"
  /** Percentage (10 = 10%) or a fixed amount in minor units of `currency`. */
  value: number
  currency?: string
  active: boolean
  usageLimit?: number | null
  usageCount: number
  startsAt?: Date | null
  endsAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Internal shipment statuses. Courier statuses are mapped onto these
 * (lib/shipping/status.ts); not every courier reports every one.
 */
export const SHIPMENT_STATUSES = [
  "pending",
  "ready_to_ship",
  "shipment_created",
  "pickup_scheduled",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "delivery_failed",
  "rto_initiated",
  "rto_in_transit",
  "rto_delivered",
  "cancelled",
] as const
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]

/** One parcel: an order's outbound delivery or a return (reverse pickup). */
export type ShipmentDoc = {
  _id: string
  orderId: string
  displayId: number
  /** Who created it: a courier integration, our own delivery fleet, or recorded by hand with details from elsewhere. */
  provider: "shiprocket" | "delhivery" | "manual" | "own_fleet"
  /** Courier name ("Delhivery Surface", "Blue Dart Air"); empty until a courier is assigned. */
  carrier: string
  courierId?: number
  /** Provider's order and shipment ids (Shiprocket order_id / shipment_id). */
  providerOrderId?: string
  providerShipmentId?: string
  /** Empty until the courier assigns one. */
  awb: string
  status: ShipmentStatus
  /** The courier's own wording of the latest status. */
  providerStatus?: string
  labelUrl?: string
  manifestUrl?: string
  trackingUrl?: string
  pickup?: { scheduledFor?: Date; token?: string; requestedAt: Date }
  /** The courier's name for the building it collects from (Delhivery registered warehouse, Shiprocket pickup nickname). */
  pickupLocation?: string
  estimatedDelivery?: Date
  deliveredAt?: Date
  /** Non-delivery report: the courier couldn't deliver and is waiting on an action. */
  ndr?: { reason: string; attempts: number; action?: "reattempt" | "return"; actionAt?: Date; updatedAt: Date }
  /** Lines (and units) in this parcel. */
  items: { itemId: string; quantity: number }[]
  parcel: { weightKg: number; lengthCm: number; breadthCm: number; heightCm: number }
  /** Courier scans and status changes, oldest first. */
  trackingEvents: {
    timestamp: Date
    status: string
    /** Internal status this scan maps to, when it maps to one. */
    internalStatus?: ShipmentStatus
    location: string
    note: string
  }[]
  isReturn: boolean
  /** For a return: the outbound shipment it reverses. */
  returnOf?: string
  /** The warehouse fulfilment this parcel carries; absent for parcels booked straight from the order. */
  fulfilmentId?: string
  /** When an undelivered parcel was received back and graded at its warehouse. */
  rtoReceivedAt?: Date
  /** For a reverse pickup: the return it collects. */
  returnId?: string
  /** True while not cancelled; a partial unique index allows one live parcel of each kind per order. */
  active: boolean
  lastSyncedAt?: Date
  customer: { name: string; phone?: string; city: string; postalCode: string }
  itemsCount: number
  createdAt: Date
  updatedAt: Date
}

export type InventoryDoc = {
  _id: string
  productId: string
  variantId: string
  sku: string
  productTitle: string
  variantTitle: string
  hubId: string
  stock: number
  allocated: number
  reorderPoint: number
  updatedAt: Date
}

export type SupplierDoc = {
  _id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  categories: string[]
  rating: number
  status: "active" | "inactive"
  createdAt: Date
  updatedAt: Date
}

export type PurchaseOrderDoc = {
  _id: string
  poNumber: string
  supplierId: string
  supplierName: string
  hubId: string
  items: {
    sku: string
    name: string
    quantity: number
    unitCost: number
    received: number
  }[]
  status: "draft" | "submitted" | "partially_received" | "received" | "canceled"
  expectedDate?: Date
  totalAmount: number
  createdAt: Date
  updatedAt: Date
}

export type InvoiceDoc = {
  _id: string
  invoiceNumber: string
  orderId: string
  displayId: number
  customerName: string
  customerGstin?: string
  /** Registered legal name that goes with customerGstin. */
  customerLegalName?: string
  shippingAddress: Address
  billingAddress: Address
  items: {
    name: string
    sku: string
    hsn: string
    quantity: number
    unitPrice: number
    /** The line's share of the order discount (minor units). Absent on invoices raised before it was recorded. */
    discount?: number
    taxableValue: number
    gstRate: number
    cgst: number
    sgst: number
    igst: number
  }[]
  subtotal: number
  cgstTotal: number
  sgstTotal: number
  igstTotal: number
  grandTotal: number
  currency: string
  status: "issued" | "paid" | "canceled"
  /** Issued in a marketplace seller's name for their items (absent: the store's own invoice). */
  sellerId?: string
  issuer?: { legalName: string; gstin: string | null; address: string; state: string }
  issuedAt: Date
}

export type CreditNoteDoc = {
  _id: string
  creditNoteNumber: string
  invoiceNumber: string
  orderId: string
  customerName: string
  refundAmount: number
  reason: string
  status: "issued" | "settled" | "canceled"
  createdAt: Date
}

export type CounterDoc = { _id: string; seq: number }

export type WarehouseDoc = {
  _id: string
  code: string
  name: string
  city: string
  state: string
  pincode: string
  address: string
  leadDispatcher?: string
  /** The warehouse's own GST registration (state code + PAN), printed on invoices dispatched from it. */
  gstin?: string | null
  /** Location of the building (WGS84), for the shopper's tracking map. */
  lat?: number | null
  lng?: number | null
  status: "active" | "inactive"
  isDefault?: boolean
  /**
   * PIN codes or PIN prefixes ("560", "5600") this warehouse ships to. Empty
   * or absent: it ships anywhere its couriers reach.
   */
  serviceAreas?: string[]
  /** Lower ships first when two warehouses are equally close. Default 100. */
  priority?: number
  /** Whether new orders may be allocated here (a warehouse can be active for returns only). */
  acceptsOrders?: boolean
  /** Shiprocket pickup location nickname for parcels leaving this building; falls back to SHIPROCKET_PICKUP_LOCATION. */
  shiprocketPickupLocation?: string
  /** Delhivery registered warehouse name for this building; falls back to DELHIVERY_PICKUP_LOCATION. */
  delhiveryPickupLocation?: string
  /** A seller's own dispatch location (seller-fulfilled orders ship from here). Absent for the store's warehouses. */
  sellerId?: string | null
  createdAt: Date
  updatedAt: Date
}

/* ---------- Warehouse management (WMS) ---------- */

/**
 * Where a unit of stock is in a warehouse. Only `available` is sellable;
 * a variant's `stock` on the product is kept equal to the sum of its
 * `available` across warehouses once the variant has any stock level.
 */
export const STOCK_BUCKETS = ["available", "reserved", "picked", "packed", "damaged", "quarantine"] as const
export type StockBucket = (typeof STOCK_BUCKETS)[number]

/** One variant in one warehouse. Changed only through lib/inventory/stock.ts, which writes a ledger row for every move. */
export type StockLevelDoc = {
  _id: string
  warehouseId: string
  warehouseCode: string
  productId: string
  variantId: string
  sku: string
  /** Rack/bin code where the variant is shelved, e.g. "A-03-2". */
  binCode?: string | null
  available: number
  reserved: number
  picked: number
  packed: number
  damaged: number
  quarantine: number
  /** Running totals, for reporting. */
  dispatchedTotal: number
  receivedTotal: number
  updatedAt: Date
  createdAt: Date
}

export type StockLedgerReason =
  | "receive"
  | "opening_balance"
  | "reserve"
  | "release"
  | "pick"
  | "unpick"
  | "pack"
  | "dispatch"
  | "qc_damage"
  | "adjust"
  | "damage"
  | "transfer_out"
  | "transfer_in"
  | "return_receive"
  | "return_restock"
  | "return_reject"

/** Immutable: one row per stock move. `from`/`to` are buckets, or "outside" for stock entering or leaving the building. */
export type StockLedgerDoc = {
  _id: string
  warehouseId: string
  variantId: string
  sku: string
  reason: StockLedgerReason
  from: StockBucket | "outside"
  to: StockBucket | "outside"
  quantity: number
  /** Bucket counts after the move. */
  after: Record<StockBucket, number>
  ref: { type: "order" | "fulfilment" | "return" | "transfer" | "manual" | "receipt"; id: string }
  note?: string
  actor: ActorRef
  createdAt: Date
}

/** Who did something, for ledgers and status history. */
export type ActorRef = { type: "system" | "admin" | "warehouse" | "customer" | "courier" | "rider" | "seller"; id: string; name?: string }

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
  /** Whether stock was reserved for this line (false for variants that don't track stock). */
  reserved: boolean
  picked: number
  packed: number
  /** Units the warehouse can no longer supply (damaged at QC with no replacement on the shelf). */
  short: number
  binCode?: string | null
}

/** The part of an order one warehouse picks, packs and dispatches. */
export type FulfilmentDoc = {
  _id: string
  /** Printed on the pick list and scanned at packing, e.g. FUL-1042-1. */
  code: string
  orderId: string
  displayId: number
  warehouseId: string
  warehouseCode: string
  status: FulfilmentStatus
  lines: FulfilmentLine[]
  paymentMethod: "cod" | "razorpay"
  /** What the warehouse may see about the delivery: no name, phone or street. */
  destination: { city: string; state: string; postalCode: string }
  assignment: { method: "auto" | "manual"; reason: string; proximity: number; at: Date; actor: ActorRef }
  /** Warehouses that refused this order, so re-allocation skips them. */
  rejectedBy: string[]
  pick?: { startedAt?: Date; startedBy?: string; completedAt?: Date }
  qc?: { result: "passed" | "failed"; at: Date; by: string; notes?: string; failures: { itemId: string; quantity: number; reason: string }[] }
  package?: { code: string; weightKg: number; lengthCm: number; breadthCm: number; heightCm: number; packedAt: Date; packedBy: string }
  shipmentId?: string
  awb?: string
  carrier?: string
  manifestId?: string
  handedOverAt?: Date
  dispatchedAt?: Date
  cancelReason?: string
  /** False once rejected or cancelled; a partial unique index allows one live fulfilment per order and warehouse. */
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export type ManifestDoc = {
  _id: string
  code: string
  warehouseId: string
  carrier: string
  fulfilmentIds: string[]
  awbs: string[]
  /** AWBs scanned at the dock as the courier took them. */
  scannedAwbs: string[]
  status: "open" | "closed"
  manifestUrls: string[]
  courierExecutive?: string
  createdBy: string
  createdAt: Date
  closedAt?: Date
  closedBy?: string
}

export const WAREHOUSE_ROLES = ["picker", "packer", "inspector", "dispatcher", "supervisor"] as const
export type WarehouseRole = (typeof WAREHOUSE_ROLES)[number]

/** Warehouse staff: a separate account type from admins, scoped to the warehouses listed. */
export type WarehouseUserDoc = {
  _id: string
  email: string
  passwordHash: string
  name: string
  role: WarehouseRole
  warehouseIds: string[]
  status: "active" | "suspended"
  sessionsRevokedAt?: Date
  createdAt: Date
  updatedAt: Date
}

/** Immutable status history for every state machine (lib/state/machines.ts). */
export type StatusEventDoc = {
  _id: string
  machine: "order" | "payment" | "fulfilment" | "shipment" | "return" | "delivery" | "cod"
  entityId: string
  orderId?: string
  from: string | null
  to: string
  actor: ActorRef
  reason?: string
  at: Date
}

/* ---------- Own delivery fleet ---------- */

export type FleetSettings = {
  /** Rider earning per delivered parcel, minor units. */
  payoutPerDelivery: number
  /** Rider earning per attempted-but-failed delivery, minor units. */
  payoutPerFailedAttempt: number
  /** Minutes a rider has to accept an offered task before it goes to someone else. */
  offerTimeoutMinutes: number
  /** Failed attempts after which the parcel returns to the warehouse (RTO). */
  maxAttempts: number
  /** Tasks a rider may hold at once (assigned, picked up or out for delivery). */
  maxActiveTasks: number
}

/** A delivery area served by our riders from one warehouse. */
export type DeliveryZoneDoc = {
  _id: string
  code: string
  name: string
  warehouseId: string
  /** Six-digit PIN codes covered. */
  pincodes: string[]
  /** Whether riders here collect cash on delivery. */
  codAllowed: boolean
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export const RIDER_DOCUMENT_TYPES = ["driving_licence", "vehicle_rc", "aadhaar", "pan", "insurance"] as const

export type RiderDoc = {
  _id: string
  sessionsRevokedAt?: Date
  email: string
  phone: string
  passwordHash: string
  name: string
  /** pending: registered, awaiting checks; approved: may go online and take tasks. */
  status: "pending" | "approved" | "suspended" | "rejected"
  statusReason?: string
  vehicle: { type: "bicycle" | "bike" | "scooter" | "van"; registration?: string }
  documents: { type: (typeof RIDER_DOCUMENT_TYPES)[number]; number: string; verified: boolean; verifiedAt?: Date; verifiedBy?: string }[]
  warehouseId: string | null
  zoneIds: string[]
  /** Weekly shifts, local time (Asia/Kolkata). day: 0 = Sunday. */
  shifts: { day: number; start: string; end: string }[]
  online: boolean
  onlineSince?: Date
  /** Last position, kept only while the rider is online with a parcel out for delivery. */
  lastLocation?: { lat: number; lng: number; accuracy?: number; at: Date } | null
  approvedAt?: Date
  approvedBy?: string
  createdAt: Date
  updatedAt: Date
}

export const DELIVERY_STATUSES = ["unassigned", "offered", "assigned", "picked_up", "out_for_delivery", "attempt_failed", "delivered", "rto", "returned", "cancelled"] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

export const FAILED_DELIVERY_REASONS = [
  "customer_unavailable",
  "customer_refused",
  "address_not_found",
  "customer_rescheduled",
  "cash_not_ready",
  "premises_closed",
  "unsafe_location",
  "other",
] as const

/** One parcel delivered by our own fleet. */
export type DeliveryTaskDoc = {
  _id: string
  /** Our tracking number, also the shipment's AWB (EWF...). */
  code: string
  shipmentId: string
  fulfilmentId: string
  orderId: string
  displayId: number
  warehouseId: string
  zoneId: string
  status: DeliveryStatus
  riderId: string | null
  offer?: { riderId: string; offeredAt: Date; expiresAt: Date } | null
  /** Riders who declined or let the offer lapse; not offered again. */
  declinedBy: string[]
  /** The doorstep. Shown to the assigned rider only; the phone only while out for delivery. */
  stop: { name: string; phone: string; address1: string; address2?: string; city: string; postalCode: string; instructions?: string; lat?: number; lng?: number }
  sequence?: number
  /** Cash to collect, minor units; set from the order, never by the rider. */
  cod: { due: number; currency: string; collected?: number; collectedAt?: Date; remittanceId?: string | null } | null
  /** Delivery OTP, encrypted so it can be shown to the customer; attempts counted. */
  otp?: { cipher: string; iv: string; tag: string; issuedAt: Date; failures: number } | null
  attempts: { at: Date; reason: (typeof FAILED_DELIVERY_REASONS)[number]; note?: string; lat?: number; lng?: number; rescheduledFor?: Date; riderId: string }[]
  pod?: { at: Date; riderId: string; receiverName: string; otpVerified: true; lat?: number; lng?: number; photo?: string }
  /** Rider earnings booked on this task, minor units. */
  earnings: { kind: "delivery" | "failed_attempt"; amount: number; at: Date; riderId: string }[]
  createdAt: Date
  updatedAt: Date
}

/** Cash a rider hands to finance; reconciled against what the rider collected. */
export type CodRemittanceDoc = {
  _id: string
  code: string
  riderId: string
  taskIds: string[]
  /** Sum of cash collected on those tasks, minor units. */
  expected: number
  /** What the rider says they handed over. */
  declared: number
  /** What finance counted. */
  counted?: number
  status: "submitted" | "reconciled" | "mismatch"
  note?: string
  submittedAt: Date
  reconciledAt?: Date
  reconciledBy?: string
}

/* ---------- Returns and exchanges ---------- */

export const RETURN_STATUSES = [
  "requested",
  "approved",
  "pickup_scheduled",
  "in_transit",
  "received",
  "inspected",
  "refund_pending",
  "refunded",
  "exchanged",
  "rejected",
  "cancelled",
] as const
export type ReturnStatus = (typeof RETURN_STATUSES)[number]

export const RETURN_REASONS = ["too_small", "too_large", "not_as_pictured", "damaged", "wrong_item", "quality", "changed_mind", "other"] as const
export type ReturnReason = (typeof RETURN_REASONS)[number]

/** One return or exchange of some of an order's items. An order may have several over time, one open at a time. */
export type ReturnDoc = {
  _id: string
  /** Shown to customers and printed on the parcel, e.g. RET-1042-1. */
  code: string
  orderId: string
  displayId: number
  customerId: string | null
  type: "return" | "exchange"
  status: ReturnStatus
  items: {
    itemId: string
    variantId: string
    productId: string
    productTitle: string
    variantTitle: string
    quantity: number
    reason: ReturnReason
    note?: string
    /** For an exchange: the variant (same product, same price) the customer wants instead. */
    exchangeVariantId?: string
    exchangeVariantTitle?: string
  }[]
  /** Courier pickup from the door, or the customer ships it back themselves. */
  method: "pickup" | "self_ship"
  /** What the customer would get back for these items: their share of what was paid, minor units. */
  refundableAmount: number
  currency: string
  /** Set when a reverse pickup is booked. */
  shipmentId?: string
  /** Customer's own courier booking (self ship). */
  selfShip?: { carrier: string; awb: string; at: Date }
  inspection?: { warehouseId: string; at: Date; by: string; lines: { itemId: string; quantity: number; condition: "sellable" | "damaged"; notes?: string }[] }
  resolution?: { action: "refund" | "exchange" | "reject"; at: Date; by: string; note?: string; refundId?: string; amount?: number; exchangeOrderId?: string }
  rejectionReason?: string
  requestedAt: Date
  updatedAt: Date
}

/* ---------- Outbound notifications ---------- */

export const NOTIFICATION_EVENTS = [
  "order_confirmed",
  "payment_received",
  "order_packed",
  "order_shipped",
  "out_for_delivery",
  "delivery_otp",
  "delivered",
  "delivery_failed",
  "return_update",
  "refund_processed",
  "fulfilment_assigned",
  "delivery_offered",
  "delivery_assigned",
  "delivery_unassigned",
] as const
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number]
export type NotificationChannel = "email" | "sms" | "whatsapp" | "push"

export type ProviderTemplates = {
  /** MSG91 Flow id (DLT-approved); variables are sent as var1, var2, ... */
  msg91FlowId?: string
  /** Approved WhatsApp template; body parameters are filled in order. */
  whatsapp?: { name: string; language: string }
  /** Gupshup template id (its own registry of approved WhatsApp templates). */
  gupshupTemplateId?: string
}

/**
 * One message to one recipient on one channel. Created when something
 * happens; sent by the delivery worker with retries; never sent twice for the
 * same `key` (unique). Content is rendered at enqueue time except secrets
 * (a delivery OTP is fetched and decrypted only when sending).
 */
export type NotificationDeliveryDoc = {
  _id: string
  key: string
  event: NotificationEvent
  channel: NotificationChannel
  recipient: { type: "customer" | "rider" | "warehouse" | "guest"; id: string; to: string }
  content: {
    subject?: string
    text: string
    html?: string
    title?: string
    url?: string
    /** Ordered values for SMS/WhatsApp provider templates. */
    params: string[]
  }
  /** Values resolved only at send time, never stored in clear. */
  secret?: { otpTaskId: string }
  status: "queued" | "sending" | "sent" | "skipped" | "dead"
  provider?: string
  providerMessageId?: string
  attempts: number
  nextAttemptAt: Date
  lockedUntil?: Date | null
  lastError?: string
  skipReason?: string
  orderId?: string
  sentAt?: Date
  createdAt: Date
  updatedAt: Date
}

/** A device or browser that receives push notifications for its owner. */
export type PushSubscriptionDoc = {
  _id: string
  ownerType: "customer" | "rider" | "warehouse"
  ownerId: string
  kind: "webpush" | "fcm"
  /** Web push: the push service endpoint and its keys. */
  endpoint?: string
  keys?: { p256dh: string; auth: string }
  /** FCM: the device registration token. */
  token?: string
  userAgent?: string
  failures: number
  lastSuccessAt?: Date
  createdAt: Date
}

/* ---------- Marketplace sellers ---------- */

export type MarketplaceSettings = {
  /** Commission on the item's sale price (incl. GST), percent. Per-seller override on the seller. */
  commissionPct: number
  /** Fee per unit when the store stores and ships the seller's stock, minor units. */
  fulfilmentFeePerUnit: number
  /** GST charged on the store's fees, percent. */
  feeGstPct: number
  /** TCS under GST section 52, percent of net taxable value. */
  tcsPct: number
  /** TDS under Income Tax section 194-O, percent of gross sale. */
  tdsPct: number
  /** Hours a seller has to accept an order before it counts as late. */
  acceptSlaHours: number
  /** Hours from acceptance to handover before dispatch counts as late. */
  dispatchSlaHours: number
}

export const SELLER_STATUSES = ["draft", "submitted", "approved", "suspended", "rejected"] as const

export type SellerDoc = {
  _id: string
  sessionsRevokedAt?: Date
  /** Short public code, e.g. SEL-0007. */
  code: string
  displayName: string
  email: string
  phone: string
  passwordHash: string
  /** draft: filling in KYC; submitted: waiting for review; approved: may list and sell. */
  status: (typeof SELLER_STATUSES)[number]
  statusReason?: string
  businessType?: "individual" | "proprietorship" | "partnership" | "llp" | "company"
  legalName?: string
  pan?: string
  gstin?: string | null
  registeredAddress?: { line1: string; city: string; state: string; postalCode: string }
  /** Bank account for settlements; the number is stored encrypted, only the last four shown. */
  bank?: { accountName: string; ifsc: string; last4: string; sealed: string }
  /** Each KYC item, checked by the store. */
  verified: { pan: boolean; gstin: boolean; bank: boolean }
  /** seller: ships from their own location; platform: the store stores and ships their stock. */
  fulfilmentModel: "seller" | "platform"
  pickupAddress?: { line1: string; city: string; state: string; postalCode: string; phone: string }
  /** Seller-fulfilled: their location as a warehouse (created on approval). */
  warehouseId?: string | null
  commissionPct?: number | null
  approvedAt?: Date
  approvedBy?: string
  createdAt: Date
  updatedAt: Date
}

export const SELLER_LEDGER_KINDS = ["sale", "commission", "commission_gst", "fulfilment_fee", "fulfilment_fee_gst", "tcs", "tds"] as const

/**
 * Immutable money lines between the store and a seller: a sale is a credit,
 * fees and statutory deductions are debits (negative), a refund reverses
 * them. Settled in batches once payable.
 */
export type SellerLedgerDoc = {
  _id: string
  /** Unique per order line, kind and cause, so a repeated event posts nothing. */
  key: string
  sellerId: string
  orderId: string
  displayId: number
  itemId: string
  kind: (typeof SELLER_LEDGER_KINDS)[number]
  /** Reversal of an earlier line (a refund). */
  reversal: boolean
  amount: number
  currency: string
  quantity: number
  /** pending: inside the return window or unpaid; settled: in a settlement. */
  status: "pending" | "settled"
  /** From when it may be paid out (delivery + return window). */
  payableFrom: Date
  settlementId?: string | null
  note?: string
  createdAt: Date
}

export type SellerSettlementDoc = {
  _id: string
  code: string
  sellerId: string
  periodEnd: Date
  entryIds: string[]
  totals: Record<(typeof SELLER_LEDGER_KINDS)[number], number>
  net: number
  currency: string
  status: "pending" | "paid"
  /** Bank transfer reference (UTR) recorded by finance when paid. */
  payout?: { utr: string; paidAt: Date; by: string }
  createdAt: Date
}

/** Advance shipping notice: stock a platform-fulfilled seller is sending to a store warehouse. */
export type InboundShipmentDoc = {
  _id: string
  code: string
  sellerId: string
  warehouseId: string
  lines: { variantId: string; productId: string; sku: string; title: string; expected: number; received: number }[]
  carrier?: string
  awb?: string
  status: "created" | "in_transit" | "receiving" | "closed"
  createdAt: Date
  updatedAt: Date
  closedAt?: Date
}

export type InventoryReservationDoc = {
  _id: string
  cartId: string
  items: {
    variantId: string
    sku: string
    quantity: number
    hubId?: string
  }[]
  status: "active" | "committed" | "released" | "expired"
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export type InventoryMovementDoc = {
  _id: string
  sku: string
  variantId: string
  hubId: string
  type: "inbound" | "outbound" | "reservation" | "release" | "adjustment" | "return"
  quantity: number
  referenceType: "po" | "order" | "cart" | "return" | "manual"
  referenceId: string
  reason?: string
  balanceAfter: number
  createdAt: Date
}

export type WishlistDoc = {
  _id: string
  customerId: string
  productIds: string[]
  createdAt: Date
  updatedAt: Date
}

export type CouponRedemptionDoc = {
  _id: string
  code: string
  promotionId: string
  customerId?: string | null
  cartId: string
  orderId?: string | null
  status: "reserved" | "redeemed" | "released"
  expiresAt?: Date
  createdAt: Date
}

export type PaymentWebhookEventDoc = {
  _id: string
  provider: "razorpay" | "shiprocket" | "delhivery"
  eventId: string
  event: string
  payload: any
  signature: string
  /** "processing" while handled; a "failed" event is retried when the provider resends it. */
  status: "processing" | "processed" | "failed" | "ignored"
  error?: string
  attempts?: number
  processedAt?: Date
  createdAt: Date
}

/**
 * One try at paying a cart online: the Razorpay order created for its exact
 * total. The order is only placed once a captured payment for this attempt is
 * verified with Razorpay (checkout callback, webhook or reconciliation).
 */
export type PaymentAttemptDoc = {
  _id: string
  cartId: string
  provider: "razorpay"
  /** Razorpay order id (order_...). Unique. */
  providerOrderId: string
  amount: number
  currency: string
  status: "created" | "paid" | "failed" | "expired" | "refunded"
  /** Razorpay payment id once a payment is seen. */
  paymentId?: string
  method?: string
  /** The store order placed from this attempt. */
  orderId?: string
  failureReason?: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

/** A refund against an order's captured payment. Only "processed" money has left the account. */
export type RefundDoc = {
  _id: string
  orderId: string
  displayId: number
  /** "manual": cash returned by hand for a cash-on-delivery order (recorded, not sent anywhere). */
  provider: "razorpay" | "manual"
  /** Razorpay payment id; empty for manual refunds. */
  paymentId: string
  /** Razorpay refund id (rfnd_...), once Razorpay accepted the request. */
  providerRefundId?: string
  amount: number
  currency: string
  reason: string
  status: "requested" | "pending" | "processed" | "failed"
  failureReason?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type IdempotencyRecordDoc = {
  _id: string
  key: string
  scope: string
  requestHash: string
  responseStatus?: number
  responseBody?: any
  status: "pending" | "completed" | "failed"
  lockedUntil: Date
  createdAt: Date
}

export type OutboxEventDoc = {
  _id: string
  topic: string
  payload: any
  status: "pending" | "published" | "failed"
  retryCount: number
  lastError?: string
  createdAt: Date
  publishedAt?: Date
}

export type SupportMessage = {
  _id: string
  sender: "customer" | "support"
  senderName: string
  message: string
  attachments?: string[]
  createdAt: Date
}

/** A request for a concierge styling appointment, made from the storefront's /concierge page. */
/** One newsletter subscription, from the storefront footer. One row per email. */
export type NewsletterSubscriberDoc = {
  _id: string
  email: string
  /** Where the sign-up came from, e.g. "footer:checkout". */
  source: string
  createdAt: Date
  updatedAt: Date
}

export type ConciergeBookingDoc = {
  _id: string
  /** Shown to the shopper, e.g. CNC-2026-1001. */
  reference: string
  service: "virtual" | "home" | "flagship"
  location: string
  name: string
  phone: string
  /** Requested day, YYYY-MM-DD. */
  date: string
  slot: string
  occasions: string[]
  stylist: string | null
  notes: string
  /** Set when a signed-in customer books. */
  customerId: string | null
  status: "requested" | "confirmed" | "cancelled" | "completed"
  createdAt: Date
  updatedAt: Date
}

export type SupportTicketDoc = {
  _id: string
  ticketNumber: string
  customerId: string
  orderId?: string | null
  subject: string
  category: "order" | "refund" | "shipping" | "general" | "exchange"
  priority: "low" | "medium" | "high" | "urgent"
  status: "open" | "in_progress" | "resolved" | "closed"
  messages: SupportMessage[]
  createdAt: Date
  updatedAt: Date
}

export type LoyaltyTransaction = {
  _id: string
  type: "earn" | "redeem" | "expire" | "adjustment"
  points: number
  orderId?: string
  reason: string
  createdAt: Date
}

export type LoyaltyAccountDoc = {
  _id: string
  customerId: string
  tier: "silver" | "gold" | "platinum" | "vip"
  pointsBalance: number
  lifetimePoints: number
  transactions: LoyaltyTransaction[]
  createdAt: Date
  updatedAt: Date
}

export type NotificationDoc = {
  _id: string
  recipientType: "customer" | "admin"
  recipientId: string
  type: "order_confirmation" | "shipment_update" | "return_status" | "refund_processed" | "low_stock" | "ticket_reply" | "promotion"
  title: string
  message: string
  channel: "email" | "sms" | "in_app"
  status: "unread" | "read" | "sent" | "failed"
  metadata?: Record<string, any>
  createdAt: Date
}

/** The operational account types. Each keeps its own collection; the portal session links them by email. */
export type OpsRealm = "admin" | "warehouse" | "rider" | "seller"

/** A sign-in to the operations portal (lib/ops-session.ts). Only the token's hash is stored. */
export type OpsSessionDoc = {
  _id: string
  tokenHash: string
  email: string
  memberships: { realm: OpsRealm; id: string }[]
  createdAt: Date
  lastSeenAt: Date
  expiresAt: Date
  ip?: string
  userAgent?: string
  revokedAt?: Date
  revokedReason?: string
}

/** A single-use password reset link for every operational account with this email. */
export type OpsPasswordResetDoc = {
  _id: string
  tokenHash: string
  email: string
  createdAt: Date
  expiresAt: Date
  usedAt?: Date
}

export type AuditLogDoc = {
  _id: string
  /** The acting account's id (an admin's, unless actorRealm says otherwise); "" when nobody signed in, e.g. a failed sign-in. */
  adminId: string
  adminEmail: string
  /** Which kind of account acted. Absent on older entries, which were all admins. */
  actorRealm?: OpsRealm | "system"
  action: string
  targetCollection: string
  targetId?: string
  diff?: any
  ip?: string
  createdAt: Date
}

export type ProductReviewDoc = {
  _id: string
  productId: string
  customerId: string
  customerName: string
  rating: number
  title?: string
  comment: string
  verifiedPurchase: boolean
  status: "approved" | "pending" | "rejected"
  createdAt: Date
}

/** Typed collection accessors. */
export const db = {
  regions: (): Collection<RegionDoc> => getDb().collection("regions"),
  categories: (): Collection<CategoryDoc> => getDb().collection("categories"),
  collections: (): Collection<CollectionDoc> => getDb().collection("collections"),
  products: (): Collection<ProductDoc> => getDb().collection("products"),
  customers: (): Collection<CustomerDoc> => getDb().collection("customers"),
  adminUsers: (): Collection<AdminUserDoc> => getDb().collection("admin_users"),
  carts: (): Collection<CartDoc> => getDb().collection("carts"),
  orders: (): Collection<OrderDoc> => getDb().collection("orders"),
  promotions: (): Collection<PromotionDoc> => getDb().collection("promotions"),
  shipments: (): Collection<ShipmentDoc> => getDb().collection("shipments"),
  inventory: (): Collection<InventoryDoc> => getDb().collection("inventory"),
  suppliers: (): Collection<SupplierDoc> => getDb().collection("suppliers"),
  purchaseOrders: (): Collection<PurchaseOrderDoc> => getDb().collection("purchase_orders"),
  invoices: (): Collection<InvoiceDoc> => getDb().collection("invoices"),
  creditNotes: (): Collection<CreditNoteDoc> => getDb().collection("credit_notes"),
  counters: (): Collection<CounterDoc> => getDb().collection("counters"),
  settings: (): Collection<SettingsDoc> => getDb().collection("settings"),
  siteMedia: (): Collection<SiteMediaDoc> => getDb().collection("site_media"),
  warehouses: (): Collection<WarehouseDoc> => getDb().collection("warehouses"),
  inventoryReservations: (): Collection<InventoryReservationDoc> => getDb().collection("inventory_reservations"),
  inventoryMovements: (): Collection<InventoryMovementDoc> => getDb().collection("inventory_movements"),
  wishlists: (): Collection<WishlistDoc> => getDb().collection("wishlists"),
  couponRedemptions: (): Collection<CouponRedemptionDoc> => getDb().collection("coupon_redemptions"),
  paymentWebhookEvents: (): Collection<PaymentWebhookEventDoc> => getDb().collection("payment_webhook_events"),
  paymentAttempts: (): Collection<PaymentAttemptDoc> => getDb().collection("payment_attempts"),
  refunds: (): Collection<RefundDoc> => getDb().collection("refunds"),
  idempotencyRecords: (): Collection<IdempotencyRecordDoc> => getDb().collection("idempotency_records"),
  outboxEvents: (): Collection<OutboxEventDoc> => getDb().collection("outbox_events"),
  supportTickets: (): Collection<SupportTicketDoc> => getDb().collection("support_tickets"),
  conciergeBookings: (): Collection<ConciergeBookingDoc> => getDb().collection("concierge_bookings"),
  newsletterSubscribers: (): Collection<NewsletterSubscriberDoc> => getDb().collection("newsletter_subscribers"),
  loyaltyAccounts: (): Collection<LoyaltyAccountDoc> => getDb().collection("loyalty_accounts"),
  notifications: (): Collection<NotificationDoc> => getDb().collection("notifications"),
  auditLogs: (): Collection<AuditLogDoc> => getDb().collection("audit_logs"),
  opsSessions: (): Collection<OpsSessionDoc> => getDb().collection("ops_sessions"),
  opsPasswordResets: (): Collection<OpsPasswordResetDoc> => getDb().collection("ops_password_resets"),
  productReviews: (): Collection<ProductReviewDoc> => getDb().collection("product_reviews"),
  stockLevels: (): Collection<StockLevelDoc> => getDb().collection("stock_levels"),
  stockLedger: (): Collection<StockLedgerDoc> => getDb().collection("stock_ledger"),
  fulfilments: (): Collection<FulfilmentDoc> => getDb().collection("fulfilments"),
  manifests: (): Collection<ManifestDoc> => getDb().collection("manifests"),
  warehouseUsers: (): Collection<WarehouseUserDoc> => getDb().collection("warehouse_users"),
  statusEvents: (): Collection<StatusEventDoc> => getDb().collection("status_events"),
  deliveryZones: (): Collection<DeliveryZoneDoc> => getDb().collection("delivery_zones"),
  riders: (): Collection<RiderDoc> => getDb().collection("riders"),
  deliveryTasks: (): Collection<DeliveryTaskDoc> => getDb().collection("delivery_tasks"),
  codRemittances: (): Collection<CodRemittanceDoc> => getDb().collection("cod_remittances"),
  returns: (): Collection<ReturnDoc> => getDb().collection("returns"),
  notificationDeliveries: (): Collection<NotificationDeliveryDoc> => getDb().collection("notification_deliveries"),
  pushSubscriptions: (): Collection<PushSubscriptionDoc> => getDb().collection("push_subscriptions"),
  sellers: (): Collection<SellerDoc> => getDb().collection("sellers"),
  sellerLedger: (): Collection<SellerLedgerDoc> => getDb().collection("seller_ledger"),
  sellerSettlements: (): Collection<SellerSettlementDoc> => getDb().collection("seller_settlements"),
  inboundShipments: (): Collection<InboundShipmentDoc> => getDb().collection("inbound_shipments"),
}

/**
 * Order numbers are 1000 + the "order" counter. Raises the counter to cover
 * every existing order (never lowers it), so orders inserted some other way,
 * such as by the seed script, can't make the next checkout reuse a number and
 * fail on the unique displayId index. Safe to run on each start.
 */
export async function syncOrderCounter() {
  const [top] = await db.orders().find({}, { sort: { displayId: -1 }, limit: 1, projection: { displayId: 1 } }).toArray()
  if (!top) return
  await db.counters().updateOne({ _id: "order" }, { $max: { seq: top.displayId - 1000 } }, { upsert: true })
}

/** Creates every index the API relies on. Safe to run on each start. */
/**
 * Brings shipments written before the courier integration up to the current
 * shape: new status names, provider "manual", one-live-parcel flag. Safe to
 * run on each start.
 */
async function migrateShipments() {
  const col = db.shipments()
  for (const [from, to] of [["manifested", "shipment_created"], ["rto", "rto_initiated"], ["canceled", "cancelled"]] as const) {
    await col.updateMany({ status: from as never }, { $set: { status: to } })
    await db.orders().updateMany({ "shipment.status": from as never }, { $set: { "shipment.status": to } })
  }
  await col.updateMany({ provider: { $exists: false } }, [
    {
      $set: {
        provider: "manual",
        active: { $ne: ["$status", "cancelled"] },
        items: [],
        parcel: { weightKg: 0.5, lengthCm: 30, breadthCm: 25, heightCm: 5 },
      },
    },
  ])
  // The old index required every shipment to have an AWB up front.
  await col.dropIndex("awb_1").catch(() => {})
  // One live parcel per order became one per fulfilment (a split order ships from several warehouses).
  await col.dropIndex("one_live_parcel_per_order").catch(() => {})
}

/**
 * Returns filed before they had their own collection lived only on the
 * order. Each becomes a ReturnDoc once (deterministic id), so the returns
 * screens and rules see them. Safe to run on each start.
 */
export async function migrateEmbeddedReturns(orderId?: string) {
  const orders = await db.orders().find({ ...(orderId ? { _id: orderId } : {}), returnRequest: { $exists: true }, "returnRequest.returnId": { $exists: false } }).toArray()
  for (const o of orders) {
    const r = o.returnRequest!
    const _id = `ret_legacy_${o._id.replace(/^order_/, "")}`
    const items = r.items.map((l) => {
      const item = o.items.find((i) => i._id === l.itemId)
      return { itemId: l.itemId, variantId: item?.variantId ?? "", productId: item?.productId ?? "", productTitle: item?.productTitle ?? "", variantTitle: item?.variantTitle ?? "", quantity: l.quantity, reason: "other" as const, note: r.reason }
    })
    const value = items.reduce((n, l) => n + (o.items.find((i) => i._id === l.itemId)?.unitPrice ?? 0) * l.quantity, 0)
    await db.returns().updateOne(
      { _id },
      {
        $setOnInsert: {
          _id,
          code: `RET-${o.displayId}-1`,
          orderId: o._id,
          displayId: o.displayId,
          customerId: o.customerId ?? null,
          type: "return",
          status: r.status,
          items,
          method: "pickup",
          refundableAmount: Math.min(value, o.totals.total),
          currency: o.currency,
          ...(r.inspection ? { inspection: r.inspection } : {}),
          requestedAt: r.requestedAt,
          updatedAt: r.updatedAt,
        },
      },
      { upsert: true }
    )
    await db.orders().updateOne({ _id: o._id }, { $set: { "returnRequest.returnId": _id, "returnRequest.type": "return" } })
  }
}

export async function ensureIndexes() {
  await migrateShipments()
  await Promise.all([
    db.regions().createIndex({ "countries.code": 1 }, { unique: true }),
    db.categories().createIndex({ handle: 1 }, { unique: true }),
    db.collections().createIndex({ handle: 1 }, { unique: true }),
    db.products().createIndex({ handle: 1 }, { unique: true }),
    db.products().createIndex({ status: 1, createdAt: -1 }),
    db.products().createIndex({ status: 1, categoryIds: 1 }),
    db.products().createIndex({ categoryIds: 1 }),
    db.products().createIndex({ collectionId: 1 }),
    db.products().createIndex({ status: 1, brand: 1 }),
    db.products().createIndex({ "variants._id": 1 }, { unique: true }),
    db.products().createIndex(
      { title: "text", description: "text", tags: "text" },
      { weights: { title: 5, tags: 2, description: 1 }, name: "product_text" }
    ),
    db.customers().createIndex({ email: 1 }, { unique: true }),
    db.adminUsers().createIndex({ email: 1 }, { unique: true }),
    db.carts().createIndex({ updatedAt: 1 }),
    db.carts().createIndex({ customerId: 1, completedAt: 1, updatedAt: -1 }),
    db.orders().createIndex({ displayId: 1 }, { unique: true }),
    db.orders().createIndex({ customerId: 1, createdAt: -1 }),
    db.orders().createIndex({ status: 1, createdAt: -1 }),
    db.orders().createIndex({ createdAt: -1 }),
    db.orders().createIndex({ cartId: 1 }, { unique: true }),
    db.promotions().createIndex({ code: 1 }, { unique: true }),
    db.shipments().createIndex({ awb: 1 }, { unique: true, partialFilterExpression: { awb: { $gt: "" } }, name: "awb_assigned_unique" }),
    db.shipments().createIndex({ provider: 1, providerShipmentId: 1 }, { unique: true, partialFilterExpression: { providerShipmentId: { $type: "string" } } }),
    db.shipments().createIndex({ orderId: 1, isReturn: 1, fulfilmentId: 1 }, { unique: true, partialFilterExpression: { active: true }, name: "one_live_parcel_per_fulfilment" }),
    db.shipments().createIndex({ status: 1, lastSyncedAt: 1 }),
    db.shipments().createIndex({ orderId: 1 }),
    db.inventory().createIndex({ sku: 1, hubId: 1 }, { unique: true }),
    db.suppliers().createIndex({ email: 1 }, { unique: true }),
    db.purchaseOrders().createIndex({ poNumber: 1 }, { unique: true }),
    db.invoices().createIndex({ invoiceNumber: 1 }, { unique: true }),
    db.invoices().createIndex({ orderId: 1 }),
    db.creditNotes().createIndex({ creditNoteNumber: 1 }, { unique: true }),
    db.warehouses().createIndex({ code: 1 }, { unique: true }),
    db.inventoryReservations().createIndex({ cartId: 1 }),
    db.inventoryReservations().createIndex({ status: 1, expiresAt: 1 }),
    db.inventoryMovements().createIndex({ sku: 1, createdAt: -1 }),
    db.inventoryMovements().createIndex({ referenceId: 1 }),
    db.wishlists().createIndex({ customerId: 1 }, { unique: true }),
    db.couponRedemptions().createIndex({ code: 1 }),
    db.couponRedemptions().createIndex({ cartId: 1, code: 1 }),
    db.couponRedemptions().createIndex({ orderId: 1 }),
    db.paymentWebhookEvents().createIndex({ provider: 1, eventId: 1 }, { unique: true }),
    db.paymentAttempts().createIndex({ providerOrderId: 1 }, { unique: true }),
    db.paymentAttempts().createIndex({ cartId: 1, status: 1 }),
    db.paymentAttempts().createIndex({ status: 1, createdAt: 1 }),
    db.refunds().createIndex({ providerRefundId: 1 }, { unique: true, partialFilterExpression: { providerRefundId: { $type: "string" } } }),
    db.refunds().createIndex({ orderId: 1, createdAt: -1 }),
    db.idempotencyRecords().createIndex({ key: 1, scope: 1 }, { unique: true }),
    db.idempotencyRecords().createIndex({ lockedUntil: 1 }),
    db.outboxEvents().createIndex({ status: 1, createdAt: 1 }),
    db.supportTickets().createIndex({ ticketNumber: 1 }, { unique: true }),
    db.supportTickets().createIndex({ customerId: 1, createdAt: -1 }),
    db.supportTickets().createIndex({ status: 1 }),
    db.conciergeBookings().createIndex({ reference: 1 }, { unique: true }),
    db.newsletterSubscribers().createIndex({ email: 1 }, { unique: true }),
    db.conciergeBookings().createIndex({ status: 1, date: 1 }),
    db.loyaltyAccounts().createIndex({ customerId: 1 }, { unique: true }),
    db.notifications().createIndex({ recipientId: 1, status: 1, createdAt: -1 }),
    db.auditLogs().createIndex({ adminId: 1, createdAt: -1 }),
    db.auditLogs().createIndex({ targetCollection: 1, createdAt: -1 }),
    db.auditLogs().createIndex({ action: 1, createdAt: -1 }),
    db.opsSessions().createIndex({ tokenHash: 1 }, { unique: true }),
    db.opsSessions().createIndex({ "memberships.realm": 1, "memberships.id": 1 }),
    // Expired sessions are deleted a day after they lapse; revoked ones stay until then for the session list.
    db.opsSessions().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 24 * 3600 }),
    db.opsPasswordResets().createIndex({ tokenHash: 1 }, { unique: true }),
    db.opsPasswordResets().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 24 * 3600 }),
    db.productReviews().createIndex({ productId: 1, status: 1, createdAt: -1 }),
    db.productReviews().createIndex({ customerId: 1, productId: 1 }),
    db.stockLevels().createIndex({ variantId: 1, warehouseId: 1 }, { unique: true }),
    db.stockLevels().createIndex({ warehouseId: 1, sku: 1 }),
    db.stockLedger().createIndex({ warehouseId: 1, createdAt: -1 }),
    db.stockLedger().createIndex({ variantId: 1, createdAt: -1 }),
    db.stockLedger().createIndex({ "ref.id": 1 }),
    db.fulfilments().createIndex({ orderId: 1, warehouseId: 1 }, { unique: true, partialFilterExpression: { active: true }, name: "one_live_fulfilment_per_warehouse" }),
    db.fulfilments().createIndex({ code: 1 }, { unique: true }),
    db.fulfilments().createIndex({ warehouseId: 1, status: 1, createdAt: 1 }),
    db.fulfilments().createIndex({ awb: 1 }, { sparse: true }),
    db.manifests().createIndex({ code: 1 }, { unique: true }),
    db.manifests().createIndex({ warehouseId: 1, status: 1 }),
    db.warehouseUsers().createIndex({ email: 1 }, { unique: true }),
    db.statusEvents().createIndex({ entityId: 1, at: 1 }),
    db.statusEvents().createIndex({ orderId: 1, at: 1 }),
    db.deliveryZones().createIndex({ code: 1 }, { unique: true }),
    db.deliveryZones().createIndex({ warehouseId: 1, pincodes: 1, active: 1 }),
    db.riders().createIndex({ email: 1 }, { unique: true }),
    db.riders().createIndex({ phone: 1 }, { unique: true }),
    db.riders().createIndex({ status: 1, online: 1, zoneIds: 1 }),
    db.deliveryTasks().createIndex({ code: 1 }, { unique: true }),
    db.deliveryTasks().createIndex({ shipmentId: 1 }, { unique: true }),
    db.deliveryTasks().createIndex({ riderId: 1, status: 1 }),
    db.deliveryTasks().createIndex({ status: 1, zoneId: 1, createdAt: 1 }),
    db.deliveryTasks().createIndex({ "offer.expiresAt": 1 }, { sparse: true }),
    db.deliveryTasks().createIndex({ orderId: 1 }),
    db.codRemittances().createIndex({ code: 1 }, { unique: true }),
    db.codRemittances().createIndex({ riderId: 1, submittedAt: -1 }),
    db.codRemittances().createIndex({ status: 1 }),
    db.returns().createIndex({ code: 1 }, { unique: true }),
    db.returns().createIndex({ orderId: 1, requestedAt: -1 }),
    db.returns().createIndex({ customerId: 1, requestedAt: -1 }),
    db.returns().createIndex({ status: 1, requestedAt: -1 }),
    // One open return per order at a time.
    db.returns().createIndex(
      { orderId: 1 },
      { unique: true, partialFilterExpression: { status: { $in: ["requested", "approved", "pickup_scheduled", "in_transit", "received", "inspected", "refund_pending"] } }, name: "one_open_return_per_order" }
    ),
  ])
  await Promise.all([
    db.notificationDeliveries().createIndex({ key: 1 }, { unique: true }),
    db.notificationDeliveries().createIndex({ status: 1, nextAttemptAt: 1 }),
    db.notificationDeliveries().createIndex({ orderId: 1, createdAt: -1 }),
    db.notificationDeliveries().createIndex({ "recipient.id": 1, createdAt: -1 }),
    // Delivered messages are kept 180 days for support; dead letters stay until handled.
    db.notificationDeliveries().createIndex({ sentAt: 1 }, { expireAfterSeconds: 180 * 86_400, partialFilterExpression: { status: { $in: ["sent", "skipped"] } }, name: "sent_retention" }),
    db.pushSubscriptions().createIndex({ endpoint: 1 }, { unique: true, partialFilterExpression: { endpoint: { $type: "string" } } }),
    db.pushSubscriptions().createIndex({ token: 1 }, { unique: true, partialFilterExpression: { token: { $type: "string" } } }),
    db.pushSubscriptions().createIndex({ ownerType: 1, ownerId: 1 }),
    db.notifications().createIndex({ "metadata.key": 1 }, { unique: true, partialFilterExpression: { "metadata.key": { $type: "string" } }, name: "feed_event_key" }),
  ])
  await Promise.all([
    db.sellers().createIndex({ email: 1 }, { unique: true }),
    db.sellers().createIndex({ phone: 1 }, { unique: true }),
    db.sellers().createIndex({ code: 1 }, { unique: true }),
    db.sellers().createIndex({ gstin: 1 }, { unique: true, partialFilterExpression: { gstin: { $type: "string" } } }),
    db.sellers().createIndex({ status: 1 }),
    db.products().createIndex({ sellerId: 1, "review.status": 1 }),
    db.warehouses().createIndex({ sellerId: 1 }, { sparse: true }),
    db.sellerLedger().createIndex({ key: 1 }, { unique: true }),
    db.sellerLedger().createIndex({ sellerId: 1, status: 1, payableFrom: 1 }),
    db.sellerLedger().createIndex({ orderId: 1 }),
    db.sellerSettlements().createIndex({ code: 1 }, { unique: true }),
    db.sellerSettlements().createIndex({ sellerId: 1, createdAt: -1 }),
    db.inboundShipments().createIndex({ code: 1 }, { unique: true }),
    db.inboundShipments().createIndex({ sellerId: 1, createdAt: -1 }),
    db.invoices().createIndex({ orderId: 1, sellerId: 1 }),
  ])
  await migrateEmbeddedReturns()

  // Seed default fulfillment hubs if not present
  const defaultHubs: WarehouseDoc[] = [
    {
      _id: "wh_blr_fc1",
      code: "BLR-FC1",
      name: "BLR-Fulfillment-FC1",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560068",
      address: "Hosur Road, Electronic City",
      leadDispatcher: "Ravi K.",
      status: "active",
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "wh_bom_fc2",
      code: "BOM-FC2",
      name: "BOM-Fulfillment-FC2",
      city: "Bhiwandi / Mumbai",
      state: "Maharashtra",
      pincode: "421302",
      address: "Mankoli Naka, Bhiwandi Logistics Corridor",
      leadDispatcher: "Amit P.",
      status: "active",
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "wh_del_fc1",
      code: "DEL-FC1",
      name: "DEL-Fulfillment-FC1",
      city: "Gurugram / NCR",
      state: "Haryana",
      pincode: "122001",
      address: "Bilaspur Logistics Park, NH 48",
      leadDispatcher: "Vikas S.",
      status: "active",
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "wh_ccu_fc4",
      code: "CCU-FC4",
      name: "CCU-Fulfillment-FC4",
      city: "Kolkata",
      state: "West Bengal",
      pincode: "700135",
      address: "Dankuni Logistics Complex",
      leadDispatcher: "Pooja M.",
      status: "active",
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  for (const hub of defaultHubs) {
    await db.warehouses().updateOne({ code: hub.code }, { $setOnInsert: hub }, { upsert: true })
  }
}
