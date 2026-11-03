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

/** One document, id `store`: the knobs an owner can turn without a deploy. */
export type SettingsDoc = {
  _id: string
  storeName: string
  /** A variant at or under this count is reported as low stock. */
  lowStockThreshold: number
  supportEmail?: string
  updatedAt: Date
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
  provider: "cod" | "razorpay" | "stripe"
  transactionId?: string
  paymentIntentId?: string
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
  promoCodes: string[]
  totals: OrderTotals
  paymentMethod: "cod" | "razorpay" | "stripe"
  paymentStatus: "awaiting" | "paid" | "refunded"
  paymentDetails?: PaymentDetails
  fulfillmentStatus: "unfulfilled" | "shipped" | "delivered" | "returned"
  shipment?: {
    carrier: "delhivery" | "bluedart" | "custom"
    awb: string
    status: string
    labelUrl?: string
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

export type ShipmentDoc = {
  _id: string
  orderId: string
  displayId: number
  carrier: "delhivery" | "bluedart" | "custom"
  awb: string
  status: "manifested" | "pickup_scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "rto" | "canceled"
  trackingEvents: {
    timestamp: Date
    status: string
    location: string
    note: string
  }[]
  pickupDate?: Date
  labelUrl?: string
  isReturn: boolean
  customer: {
    name: string
    phone?: string
    city: string
    postalCode: string
  }
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
  shippingAddress: Address
  billingAddress: Address
  items: {
    name: string
    sku: string
    hsn: string
    quantity: number
    unitPrice: number
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
  provider: "razorpay" | "stripe"
  eventId: string
  event: string
  payload: any
  signature: string
  status: "processed" | "failed" | "ignored"
  processedAt: Date
  createdAt: Date
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
  warehouses: (): Collection<WarehouseDoc> => getDb().collection("warehouses"),
  inventoryReservations: (): Collection<InventoryReservationDoc> => getDb().collection("inventory_reservations"),
  inventoryMovements: (): Collection<InventoryMovementDoc> => getDb().collection("inventory_movements"),
  wishlists: (): Collection<WishlistDoc> => getDb().collection("wishlists"),
  couponRedemptions: (): Collection<CouponRedemptionDoc> => getDb().collection("coupon_redemptions"),
  paymentWebhookEvents: (): Collection<PaymentWebhookEventDoc> => getDb().collection("payment_webhook_events"),
  idempotencyRecords: (): Collection<IdempotencyRecordDoc> => getDb().collection("idempotency_records"),
  outboxEvents: (): Collection<OutboxEventDoc> => getDb().collection("outbox_events"),
  supportTickets: (): Collection<SupportTicketDoc> => getDb().collection("support_tickets"),
  loyaltyAccounts: (): Collection<LoyaltyAccountDoc> => getDb().collection("loyalty_accounts"),
  notifications: (): Collection<NotificationDoc> => getDb().collection("notifications"),
  auditLogs: (): Collection<AuditLogDoc> => getDb().collection("audit_logs"),
  productReviews: (): Collection<ProductReviewDoc> => getDb().collection("product_reviews"),
}

/** Creates every index the API relies on. Safe to run on each start. */
export async function ensureIndexes() {
  await Promise.all([
    db.regions().createIndex({ "countries.code": 1 }, { unique: true }),
    db.categories().createIndex({ handle: 1 }, { unique: true }),
    db.collections().createIndex({ handle: 1 }, { unique: true }),
    db.products().createIndex({ handle: 1 }, { unique: true }),
    db.products().createIndex({ status: 1, createdAt: -1 }),
    db.products().createIndex({ status: 1, categoryIds: 1 }),
    db.products().createIndex({ categoryIds: 1 }),
    db.products().createIndex({ collectionId: 1 }),
    db.products().createIndex({ "variants._id": 1 }, { unique: true }),
    db.products().createIndex(
      { title: "text", description: "text", tags: "text" },
      { weights: { title: 5, tags: 2, description: 1 }, name: "product_text" }
    ),
    db.customers().createIndex({ email: 1 }, { unique: true }),
    db.adminUsers().createIndex({ email: 1 }, { unique: true }),
    db.carts().createIndex({ updatedAt: 1 }),
    db.orders().createIndex({ displayId: 1 }, { unique: true }),
    db.orders().createIndex({ customerId: 1, createdAt: -1 }),
    db.orders().createIndex({ status: 1, createdAt: -1 }),
    db.orders().createIndex({ createdAt: -1 }),
    db.orders().createIndex({ cartId: 1 }, { unique: true }),
    db.promotions().createIndex({ code: 1 }, { unique: true }),
    db.shipments().createIndex({ awb: 1 }, { unique: true }),
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
    db.idempotencyRecords().createIndex({ key: 1, scope: 1 }, { unique: true }),
    db.idempotencyRecords().createIndex({ lockedUntil: 1 }),
    db.outboxEvents().createIndex({ status: 1, createdAt: 1 }),
    db.supportTickets().createIndex({ ticketNumber: 1 }, { unique: true }),
    db.supportTickets().createIndex({ customerId: 1, createdAt: -1 }),
    db.supportTickets().createIndex({ status: 1 }),
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
