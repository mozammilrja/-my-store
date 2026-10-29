import { useQuery } from "@tanstack/react-query"
import { adminApi } from "@/lib/api"
import type { AdminOrder } from "@/lib/types"

export type RangeKey = "7d" | "30d" | "90d"

export const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
]

/** The API's largest page. */
const PAGE_SIZE = 100
/** Upper bound on rows read per load, across the current and previous period. */
const MAX_ROWS = 2000

export type DailyPoint = { date: Date; revenue: number; orders: number }

export type ProductRow = {
  key: string
  productId?: string | null
  title: string
  thumbnail?: string | null
  quantity: number
  revenue: number
}

export type StatusSlice = { status: string; count: number }

export type SalesAnalytics = {
  currencyCode?: string
  otherCurrencies: string[]
  truncated: boolean
  revenue: number
  previousRevenue: number
  orders: number
  previousOrders: number
  averageOrderValue: number
  previousAverageOrderValue: number
  itemsSold: number
  newCustomers: number
  daily: DailyPoint[]
  topProducts: ProductRow[]
  paymentStatus: StatusSlice[]
  fulfillmentStatus: StatusSlice[]
  recentOrders: AdminOrder[]
}

const startOfDay = (date: Date) => {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

/**
 * Reads orders newest first and stops at the first page that reaches back past
 * `since`. The list endpoint has no date filter, so the cutoff is applied here.
 */
const fetchOrdersSince = async (since: Date) => {
  const orders: AdminOrder[] = []

  for (let page = 1; ; page += 1) {
    const result = await adminApi.orders({ page, limit: PAGE_SIZE })
    const fresh = result.orders.filter((order) => new Date(order.createdAt) >= since)
    orders.push(...fresh)
    // This page reached past the cutoff, so every later page is older still.
    if (fresh.length < result.orders.length || !result.orders.length) {
      return { orders, truncated: false }
    }
    if (page >= result.pages) return { orders, truncated: false }
    // Stopped early: the figures cover only the most recent orders.
    if (orders.length >= MAX_ROWS) return { orders, truncated: true }
  }
}

/** Same trick for customers: they are listed newest first too. */
const countCustomersSince = async (since: Date) => {
  let count = 0

  for (let page = 1; ; page += 1) {
    const result = await adminApi.customers({ page, limit: PAGE_SIZE })
    const fresh = result.customers.filter(
      (customer) => new Date(customer.createdAt) >= since
    )
    count += fresh.length
    if (fresh.length < result.customers.length || !result.customers.length) return count
    if (page >= result.pages || count >= MAX_ROWS) return count
  }
}

const countBy = (values: (string | null | undefined)[]) => {
  const counts = new Map<string, number>()

  for (const value of values) {
    const key = value || "unknown"
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)
}

const summarize = (
  orders: AdminOrder[],
  days: number,
  truncated: boolean,
  newCustomers: number
): SalesAnalytics => {
  const today = startOfDay(new Date())
  const currentStart = new Date(today)
  currentStart.setDate(currentStart.getDate() - (days - 1))
  const previousStart = new Date(currentStart)
  previousStart.setDate(previousStart.getDate() - days)

  // Money is only comparable within one currency, so report the busiest one
  const currencies = countBy(orders.map((order) => order.currency))
  const currencyCode = currencies[0]?.status
  const otherCurrencies = currencies.slice(1).map((entry) => entry.status.toUpperCase())

  const counted = orders.filter(
    (order) => order.status !== "canceled" && order.currency === currencyCode
  )

  const current = counted.filter((order) => new Date(order.createdAt) >= currentStart)
  const previous = counted.filter((order) => {
    const created = new Date(order.createdAt)
    return created >= previousStart && created < currentStart
  })

  const sumTotals = (list: AdminOrder[]) =>
    list.reduce((sum, order) => sum + (order.totals?.total ?? 0), 0)

  const revenue = sumTotals(current)
  const previousRevenue = sumTotals(previous)

  const daily: DailyPoint[] = []
  const dailyIndex = new Map<string, DailyPoint>()

  for (let i = 0; i < days; i++) {
    const date = new Date(currentStart)
    date.setDate(date.getDate() + i)
    const point = { date, revenue: 0, orders: 0 }
    daily.push(point)
    dailyIndex.set(dayKey(date), point)
  }

  const products = new Map<string, ProductRow>()
  let itemsSold = 0

  for (const order of current) {
    const point = dailyIndex.get(dayKey(new Date(order.createdAt)))

    if (point) {
      point.revenue += order.totals?.total ?? 0
      point.orders += 1
    }

    for (const item of order.items ?? []) {
      const quantity = item.quantity || 0
      const lineTotal = item.total ?? item.unitPrice * quantity
      const key = item.productId || item.productTitle || item.id
      const row = products.get(key) ?? {
        key,
        productId: item.productId,
        title: item.productTitle || "Untitled product",
        thumbnail: item.thumbnail,
        quantity: 0,
        revenue: 0,
      }

      row.quantity += quantity
      row.revenue += lineTotal
      products.set(key, row)
      itemsSold += quantity
    }
  }

  const currentAll = orders.filter((order) => new Date(order.createdAt) >= currentStart)

  return {
    currencyCode,
    otherCurrencies,
    truncated,
    revenue,
    previousRevenue,
    orders: current.length,
    previousOrders: previous.length,
    averageOrderValue: current.length ? revenue / current.length : 0,
    previousAverageOrderValue: previous.length ? previousRevenue / previous.length : 0,
    itemsSold,
    newCustomers,
    daily,
    topProducts: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
    paymentStatus: countBy(currentAll.map((order) => order.paymentStatus)),
    fulfillmentStatus: countBy(currentAll.map((order) => order.fulfillmentStatus)),
    recentOrders: currentAll.slice(0, 6),
  }
}

export const useSalesAnalytics = (range: RangeKey) => {
  const days = RANGES.find((entry) => entry.key === range)?.days ?? 30

  return useQuery({
    queryKey: ["dashboard-analytics", range],
    queryFn: async () => {
      const currentStart = startOfDay(new Date())
      currentStart.setDate(currentStart.getDate() - (days - 1))
      const previousStart = new Date(currentStart)
      previousStart.setDate(previousStart.getDate() - days)

      const [{ orders, truncated }, newCustomers] = await Promise.all([
        fetchOrdersSince(previousStart),
        countCustomersSince(currentStart),
      ])

      return summarize(orders, days, truncated, newCustomers)
    },
    staleTime: 60_000,
  })
}
