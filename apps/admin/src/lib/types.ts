/**
 * Shapes returned by the Everwear API's /admin routes (apps/backend).
 * Money is always an integer in the currency's minor unit (cents, paise).
 */

export type AdminUser = {
  id: string
  email: string
  name: string | null
  role: "owner" | "staff"
}

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

export type OrderStatus = "pending" | "completed" | "canceled"
export type PaymentStatus = "awaiting" | "paid" | "refunded"
export type FulfillmentStatus = "unfulfilled" | "shipped" | "delivered" | "returned"
export type ProductStatus = "draft" | "published"

export type OrderItem = {
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
}

export type OrderTotals = {
  itemSubtotal: number
  discountTotal: number
  shippingTotal: number
  taxTotal: number
  total: number
}

export type AdminOrder = {
  id: string
  displayId: number
  email: string
  customerId: string | null
  currency: string
  regionId: string
  items: OrderItem[]
  shippingAddress: Address
  billingAddress: Address
  shippingOption: { id: string; name: string; amount: number }
  promoCodes: string[]
  totals: OrderTotals
  paymentMethod: "cod"
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  status: OrderStatus
  createdAt: string
  updatedAt: string
}

export type AdminVariant = {
  id: string
  sku: string | null
  title: string
  options: Record<string, string>
  prices: Record<string, number>
  compareAtPrices: Record<string, number>
  manageInventory: boolean
  allowBackorder: boolean
  stock: number
}

export type AdminProduct = {
  id: string
  handle: string
  title: string
  subtitle: string | null
  description: string | null
  status: ProductStatus
  thumbnail: string | null
  images: string[]
  categoryIds: string[]
  collectionId: string | null
  tags: string[]
  options: { title: string; values: string[] }[]
  material: string | null
  variants: AdminVariant[]
  totalStock: number
  createdAt: string
  updatedAt: string
}

export type AdminCustomer = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  hasAccount: boolean
  addresses: (Address & { id: string })[]
  createdAt: string
  orderCount: number
}

export type LowStockRow = {
  productId: string
  title: string
  handle: string
  variantId: string
  variantTitle: string
  stock: number
}

export type Dashboard = {
  periodDays: number
  revenue: { currency: string; total: number; orders: number }[]
  daily: { day: string; currency: string; total: number; orders: number }[]
  attention: { toShip: number; toCollect: number; lowStock: number }
  lowStock: LowStockRow[]
  recentOrders: AdminOrder[]
  customers: number
  lowStockThreshold: number
}

/** Every paged list endpoint answers with the rows plus these counters. */
export type Paged<K extends string, T> = { [key in K]: T[] } & {
  count: number
  page: number
  pages: number
}

export type AdminCollection = { id: string; handle: string; title: string }
