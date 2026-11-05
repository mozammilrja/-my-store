/**
 * Shapes returned by the Everwear API (apps/backend). Money is always an integer
 * in the currency's minor unit (cents, paise).
 */

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

export type ShippingOption = { id: string; name: string; amount: number }

/** A business buyer's GST registration, given at checkout for a B2B tax invoice. */
export type BuyerGstin = { gstin: string; legalName: string }

export type RegionPolicies = {
  returnWindowDays: number
  freeReturns: boolean
  shippingRate: number
  handlingDays: { min: number; max: number }
  transitDays: { min: number; max: number }
}

export type Region = {
  id: string
  name: string
  currency: string
  countries: { code: string; name: string }[]
  taxRate: number
  taxInclusive: boolean
  policies: RegionPolicies | null
  shippingOptions: ShippingOption[]
}

export type Category = {
  id: string
  handle: string
  name: string
  description: string | null
  parentId: string | null
  productCount?: number
}

export type Collection = { id: string; handle: string; title: string; productCount?: number }

export type Variant = {
  id: string
  title: string
  sku: string | null
  options: Record<string, string>
  price: number | null
  compareAtPrice: number | null
  /** Whole-percent saving against compareAtPrice, null when not on sale. */
  discountPercent: number | null
  inStock: boolean
  available: number
  images: string[]
}

export type Product = {
  id: string
  handle: string
  title: string
  subtitle: string | null
  brand?: string | null
  rating?: number | null
  ratingCount?: number
  description: string | null
  thumbnail: string | null
  images: string[]
  categoryIds: string[]
  collectionId: string | null
  tags: string[]
  options: { title: string; values: string[] }[]
  material: string | null
  originCountry: string | null
  weight: number | null
  currency: string
  priceRange: { min: number; max: number } | null
  /** MRP range across variants, null when nothing is discounted. */
  compareAtPriceRange: { min: number; max: number } | null
  /** MRP of the cheapest variant: the figure quoted beside the card price. */
  compareAtPrice: number | null
  /** Saving on the cheapest variant, null when not on sale. */
  discountPercent: number | null
  onSale: boolean
  /** A paid placement, rendered as an AD badge. */
  sponsored: boolean
  /** At least one variant is buyable. */
  inStock: boolean
  variants: Variant[]
  createdAt: string
}

export type ProductList = { products: Product[]; count: number; page: number; limit: number; pages: number }

export type Facets = {
  currency: string
  options: { title: string; values: { value: string; count: number }[] }[]
  priceRange: { min: number; max: number } | null
  onSaleCount: number
  brands: { value: string; count: number }[]
  /** Minimum-discount tiers that match at least one product. */
  discounts: { value: number; count: number }[]
  /** Minimum-rating tiers that match at least one product. */
  ratings: { value: number; count: number }[]
}

export type Totals = {
  itemSubtotal: number
  discountTotal: number
  shippingTotal: number
  taxTotal: number
  total: number
}

export type CartItem = {
  id: string
  productId: string
  variantId: string
  productTitle: string
  productHandle: string
  variantTitle: string
  thumbnail: string | null
  quantity: number
  unitPrice: number
  total: number
  /** Units this line could have right now; null when unknown (e.g. a completed cart). */
  available?: number | null
}

export type Cart = {
  id: string
  regionId: string
  currency: string
  countryCodes: string[]
  email: string | null
  customerId: string | null
  items: CartItem[]
  shippingAddress: Address | null
  billingAddress: Address | null
  shippingOptionId: string | null
  shippingOptions: ShippingOption[]
  /** Set when the shopper asked for a GST (B2B) invoice. */
  buyerGstin?: BuyerGstin | null
  /** The shopper's note for the courier. */
  deliveryInstructions?: string | null
  promoCodes: string[]
  totals: Totals
  completed: boolean
  orderId: string | null
  removedItems: string[]
}

export type OrderItem = Omit<CartItem, "productId" | "variantId">

export type Order = {
  id: string
  displayId: number
  email: string
  currency: string
  items: OrderItem[]
  shippingAddress: Address
  billingAddress: Address
  shippingOption: ShippingOption
  buyerGstin?: BuyerGstin | null
  deliveryInstructions?: string | null
  promoCodes: string[]
  totals: Totals
  paymentMethod: "cod" | "razorpay"
  paymentStatus: "awaiting" | "paid" | "partially_refunded" | "refunded"
  fulfillmentStatus: "unfulfilled" | "shipped" | "delivered" | "returned"
  shipment?: {
    carrier: string
    awb: string
    status: string
    labelUrl?: string
    /** The courier's public tracking page, when the courier integration gave one. */
    trackingUrl?: string
    pickupScheduledAt?: string
    estimatedDelivery?: string
    shippedAt?: string
    deliveredAt?: string
    /** Carrier scans, oldest first. Only on the single-order endpoint (GET /store/orders/:id). */
    events?: TrackingEvent[]
  }
  /** When the payment was captured; absent while it is still due (e.g. COD before delivery). */
  paidAt?: string
  /** The payment gateway's reference for the payment, when there is one. */
  paymentReference?: string
  /** Doorstep slot and options the shopper chose; absent until they choose. */
  deliveryPreferences?: DeliveryPreferences
  /** Whether those can still be changed (before the order ships). */
  preferencesEditable?: boolean
  /** Where the order ships from (GET /store/orders/:id only). */
  dispatchFrom?: DispatchWarehouse | null
  /** Delivery by Everwear's own riders: OTP, rider and position (GET /store/orders/:id only; null for courier parcels). */
  delivery?: OwnFleetDelivery | null
  returnRequest?: { status: string; returnAwb?: string; carrier?: string }
  status: "pending" | "completed" | "canceled"
  createdAt: string
}

/** A parcel with Everwear's own riders, as its customer sees it. */
export type OwnFleetDelivery = {
  status: "unassigned" | "offered" | "assigned" | "picked_up" | "out_for_delivery" | "attempt_failed" | "delivered" | "rto" | "returned"
  awb: string
  /** Shown only while the parcel is out for delivery. */
  otp: string | null
  rider: { firstName: string } | null
  /** The rider's latest position while out for delivery, when fresh. */
  location: { lat: number; lng: number; at: string } | null
  attempts: { at: string; reason: string; rescheduledFor: string | null }[]
  cashDue: number | null
}

/** One carrier scan recorded on a shipment. */
export type TrackingEvent = { timestamp: string; status: string; location: string; note: string }

/** The GST tax invoice raised for an order (amounts in minor units). */
export type Invoice = {
  id: string
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
    /** The line's share of the order discount; absent on invoices raised before it was recorded. */
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
  issuedAt: string
  /** The warehouse the order ships from; null when the store has none. Absent from older API builds. */
  dispatchFrom?: DispatchWarehouse | null
}

/** The warehouse an order ships from (GET /store/orders/:id and its invoice). */
export type DispatchWarehouse = {
  code: string
  name: string
  address: string
  city: string
  state: string
  pincode: string
  /** The warehouse's GSTIN; null when none is on record. */
  gstin?: string | null
  /** Location of the warehouse; null when not on record. */
  lat?: number | null
  lng?: number | null
  isDefault: boolean
  source: "allocated" | "default"
}

/** The shopper's doorstep choices on an order. */
export type DeliveryPreferences = {
  slot: "morning" | "evening" | null
  options: { measuringTape: boolean; reusableBox: boolean }
  updatedAt: string
}

export type OrderSummary = {
  id: string
  displayId: number
  createdAt: string
  currency: string
  total: number
  itemCount: number
  status: Order["status"]
  paymentMethod?: Order["paymentMethod"]
  paymentStatus: Order["paymentStatus"]
  fulfillmentStatus: Order["fulfillmentStatus"]
  shipment?: Order["shipment"]
  returnRequest?: Order["returnRequest"] & { reason?: string; requestedAt?: string }
  items?: OrderItem[]
  thumbnails: (string | null)[]
}

export type Customer = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  addresses: (Address & { id: string })[]
  createdAt: string
}

/** What can be sent back on an order (GET /store/customers/me/orders/:id/return-options). */
export type ReturnOptions = {
  windowDays: number | null
  closesAt: string | null
  items: {
    itemId: string
    productTitle: string
    variantTitle: string
    thumbnail: string | null
    quantity: number
    /** Units not yet in a return. */
    returnable: number
    /** What one unit refunds: its share of what was paid, delivery excluded. */
    refundPerUnit: number
    /** Same product, same price, in stock. */
    exchangeFor: { variantId: string; title: string; options: Record<string, string> }[]
  }[]
  reasons: { value: string; label: string }[]
  methods: ("pickup" | "self_ship")[]
}

export type ReturnStatus = "requested" | "approved" | "pickup_scheduled" | "in_transit" | "received" | "inspected" | "refund_pending" | "refunded" | "exchanged" | "rejected" | "cancelled"

/** A return or exchange as its customer sees it. */
export type StoreReturn = {
  id: string
  code: string
  orderId: string
  displayId: number
  type: "return" | "exchange"
  status: ReturnStatus
  method: "pickup" | "self_ship"
  items: { itemId: string; productTitle: string; variantTitle: string; quantity: number; reason: string; note: string | null; exchangeFor: string | null; thumbnail: string | null }[]
  refundableAmount: number
  currency: string
  requestedAt: string
  updatedAt: string
  timeline: { status: ReturnStatus; at: string }[]
  pickup: { carrier: string; awb: string; status: string; trackingUrl: string | null; events: TrackingEvent[] } | null
  selfShip: { carrier: string; awb: string; at: string } | null
  refund: { amount: number; status: "requested" | "pending" | "processed" | "failed"; at: string } | null
  exchangeOrder: { id: string; displayId: number; fulfillmentStatus: string; awb: string | null } | null
  rejectionReason: string | null
  canCancel: boolean
  canAddShipping: boolean
}
