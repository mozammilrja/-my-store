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
  inStock: boolean
  available: number
  images: string[]
}

export type Product = {
  id: string
  handle: string
  title: string
  subtitle: string | null
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
  onSale: boolean
  variants: Variant[]
  createdAt: string
}

export type ProductList = { products: Product[]; count: number; page: number; limit: number; pages: number }

export type Facets = {
  currency: string
  options: { title: string; values: { value: string; count: number }[] }[]
  priceRange: { min: number; max: number } | null
  onSaleCount: number
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
  promoCodes: string[]
  totals: Totals
  paymentMethod: "cod"
  paymentStatus: "awaiting" | "paid" | "refunded"
  fulfillmentStatus: "unfulfilled" | "shipped" | "delivered" | "returned"
  status: "pending" | "completed" | "canceled"
  createdAt: string
}

export type OrderSummary = {
  id: string
  displayId: number
  createdAt: string
  currency: string
  total: number
  itemCount: number
  status: Order["status"]
  paymentStatus: Order["paymentStatus"]
  fulfillmentStatus: Order["fulfillmentStatus"]
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
