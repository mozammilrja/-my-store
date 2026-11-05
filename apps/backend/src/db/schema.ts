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
    status: "requested" | "approved" | "pickup_scheduled" | "received" | "inspected" | "refunded" | "rejected"
    reason: string
    items: { itemId: string; quantity: number }[]
    returnAwb?: string
    carrier?: string
    requestedAt: Date
    updatedAt: Date
  }
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
  /** Who created it: a courier integration, or recorded by hand with details from elsewhere. */
  provider: "shiprocket" | "manual"
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
  createdAt: Date
  updatedAt: Date
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
  provider: "razorpay" | "shiprocket"
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

export type AuditLogDoc = {
  _id: string
  adminId: string
  adminEmail: string
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
  productReviews: (): Collection<ProductReviewDoc> => getDb().collection("product_reviews"),
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
    db.shipments().createIndex({ orderId: 1, isReturn: 1 }, { unique: true, partialFilterExpression: { active: true }, name: "one_live_parcel_per_order" }),
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
    db.productReviews().createIndex({ productId: 1, status: 1, createdAt: -1 }),
    db.productReviews().createIndex({ customerId: 1, productId: 1 }),
  ])

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
