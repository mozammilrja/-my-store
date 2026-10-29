import { useQuery } from "@tanstack/react-query"
import { sdk } from "@/lib/sdk"

export type RangeKey = "7d" | "30d" | "90d"

export const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
]

const PAGE_SIZE = 200
// Upper bound on orders read per load, across the current and previous period
const MAX_ORDERS = 2000

const ORDER_FIELDS = [
  "id",
  "display_id",
  "status",
  "created_at",
  "email",
  "currency_code",
  "total",
  "payment_status",
  "fulfillment_status",
  "items.id",
  "items.title",
  "items.product_title",
  "items.product_id",
  "items.thumbnail",
  "items.quantity",
  "items.unit_price",
  "items.total",
].join(",")

type AnalyticsItem = {
  id: string
  title?: string | null
  product_title?: string | null
  product_id?: string | null
  thumbnail?: string | null
  quantity: number
  unit_price: number
  total?: number | null
}

export type AnalyticsOrder = {
  id: string
  display_id?: number | null
  status: string
  created_at: string
  email?: string | null
  currency_code: string
  total: number
  payment_status?: string | null
  fulfillment_status?: string | null
  items?: AnalyticsItem[] | null
}

type ListResponse<K extends string, T> = { [key in K]: T[] } & {
  count: number
  offset: number
  limit: number
}

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
  heatmap: number[][]
  topProducts: ProductRow[]
  paymentStatus: StatusSlice[]
  fulfillmentStatus: StatusSlice[]
  recentOrders: AnalyticsOrder[]
}

const startOfDay = (date: Date) => {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

const fetchOrders = async (since: Date) => {
  const orders: AnalyticsOrder[] = []
  let count = 0

  do {
    const page = await sdk.client.fetch<ListResponse<"orders", AnalyticsOrder>>(
      "/admin/orders",
      {
        query: {
          fields: ORDER_FIELDS,
          limit: PAGE_SIZE,
          offset: orders.length,
          order: "-created_at",
          created_at: { $gte: since.toISOString() },
        },
      }
    )

    count = page.count
    orders.push(...page.orders)

    if (!page.orders.length) {
      break
    }
  } while (orders.length < count && orders.length < MAX_ORDERS)

  return { orders, truncated: count > orders.length }
}

const fetchNewCustomerCount = async (since: Date) => {
  const { count } = await sdk.client.fetch<ListResponse<"customers", unknown>>(
    "/admin/customers",
    {
      query: {
        fields: "id",
        limit: 1,
        created_at: { $gte: since.toISOString() },
      },
    }
  )

  return count
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
  orders: AnalyticsOrder[],
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
  const currencies = countBy(orders.map((order) => order.currency_code))
  const currencyCode = currencies[0]?.status
  const otherCurrencies = currencies
    .slice(1)
    .map((entry) => entry.status.toUpperCase())

  const counted = orders.filter(
    (order) =>
      order.status !== "canceled" &&
      order.status !== "draft" &&
      order.currency_code === currencyCode
  )

  const current = counted.filter(
    (order) => new Date(order.created_at) >= currentStart
  )
  const previous = counted.filter((order) => {
    const created = new Date(order.created_at)
    return created >= previousStart && created < currentStart
  })

  const sumTotals = (list: AnalyticsOrder[]) =>
    list.reduce((sum, order) => sum + (Number(order.total) || 0), 0)

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

  // Rows are weekdays (Mon first), columns are 3-hour blocks
  const heatmap = Array.from({ length: 7 }, () => Array(8).fill(0) as number[])
  const products = new Map<string, ProductRow>()
  let itemsSold = 0

  for (const order of current) {
    const created = new Date(order.created_at)
    const point = dailyIndex.get(dayKey(created))

    if (point) {
      point.revenue += Number(order.total) || 0
      point.orders += 1
    }

    const weekday = (created.getDay() + 6) % 7
    heatmap[weekday][Math.floor(created.getHours() / 3)] += 1

    for (const item of order.items ?? []) {
      const quantity = Number(item.quantity) || 0
      const lineTotal =
        item.total != null
          ? Number(item.total)
          : (Number(item.unit_price) || 0) * quantity
      const key = item.product_id || item.product_title || item.title || item.id
      const row = products.get(key) ?? {
        key,
        productId: item.product_id,
        title: item.product_title || item.title || "Untitled product",
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

  const currentAll = orders.filter(
    (order) => new Date(order.created_at) >= currentStart
  )

  return {
    currencyCode,
    otherCurrencies,
    truncated,
    revenue,
    previousRevenue,
    orders: current.length,
    previousOrders: previous.length,
    averageOrderValue: current.length ? revenue / current.length : 0,
    previousAverageOrderValue: previous.length
      ? previousRevenue / previous.length
      : 0,
    itemsSold,
    newCustomers,
    daily,
    heatmap,
    topProducts: [...products.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6),
    paymentStatus: countBy(currentAll.map((order) => order.payment_status)),
    fulfillmentStatus: countBy(
      currentAll.map((order) => order.fulfillment_status)
    ),
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
        fetchOrders(previousStart),
        fetchNewCustomerCount(currentStart),
      ])

      return summarize(orders, days, truncated, newCustomers)
    },
    staleTime: 60_000,
  })
}
