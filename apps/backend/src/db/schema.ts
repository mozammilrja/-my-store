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

export type AdminUserDoc = {
  _id: string
  email: string
  passwordHash: string
  name?: string
  role: "owner" | "staff"
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
  paymentMethod: "cod"
  paymentStatus: "awaiting" | "paid" | "refunded"
  fulfillmentStatus: "unfulfilled" | "shipped" | "delivered" | "returned"
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

export type CounterDoc = { _id: string; seq: number }

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
  counters: (): Collection<CounterDoc> => getDb().collection("counters"),
  settings: (): Collection<SettingsDoc> => getDb().collection("settings"),
}

/** Creates every index the API relies on. Safe to run on each start. */
export async function ensureIndexes() {
  await Promise.all([
    db.regions().createIndex({ "countries.code": 1 }, { unique: true }),
    db.categories().createIndex({ handle: 1 }, { unique: true }),
    db.collections().createIndex({ handle: 1 }, { unique: true }),
    db.products().createIndex({ handle: 1 }, { unique: true }),
    db.products().createIndex({ status: 1, createdAt: -1 }),
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
    db.orders().createIndex({ createdAt: -1 }),
    db.orders().createIndex({ cartId: 1 }, { unique: true }),
    db.promotions().createIndex({ code: 1 }, { unique: true }),
  ])
}
