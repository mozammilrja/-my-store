import {
  DollarSign,
  Package,
  Receipt,
  RefreshCw,
  ShoppingCart,
  UserPlus,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  RANGES,
  useSalesAnalytics,
  type RangeKey,
  type StatusSlice,
} from "@/features/analytics/use-sales-analytics"
import {
  formatCount,
  formatDateTime,
  formatDay,
  formatMoney,
  formatStatus,
  percentChange,
} from "@/lib/format"
import { LEGACY_ADMIN_URL } from "@/lib/sdk"

const Delta = ({ current, previous }: { current: number; previous: number }) => {
  const change = percentChange(current, previous)

  if (change === null) {
    return <span className="text-muted-foreground text-xs">No earlier data</span>
  }

  const rounded = Math.round(change)

  return (
    <div className="flex items-center gap-1.5">
      <Badge
        size="sm"
        variant={rounded > 0 ? "success-light" : rounded < 0 ? "destructive-light" : "outline"}
        className="tabular-nums"
      >
        {rounded > 0 ? "+" : ""}
        {rounded}%
      </Badge>
      <span className="text-muted-foreground text-xs">vs previous period</span>
    </div>
  )
}

const Kpi = ({
  label,
  value,
  icon: Icon,
  footer,
}: {
  label: string
  value: string
  icon: typeof DollarSign
  footer: ReactNode
}) => (
  <Card size="sm">
    <CardHeader>
      <CardAction>
        <Icon className="text-muted-foreground size-4" aria-hidden="true" />
      </CardAction>
      <CardTitle>{label}</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-1">
      <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {footer}
    </CardContent>
  </Card>
)

const Section = ({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) => (
  <Frame className={className}>
    <FrameHeader className="flex-row items-center justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <FrameTitle>{title}</FrameTitle>
        {description ? <FrameDescription>{description}</FrameDescription> : null}
      </div>
      {action}
    </FrameHeader>
    <FramePanel>{children}</FramePanel>
  </Frame>
)

const Empty = ({ children }: { children: ReactNode }) => (
  <div className="text-muted-foreground flex min-h-40 items-center justify-center text-sm">
    {children}
  </div>
)

const STATUS_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

const StatusList = ({ title, slices }: { title: string; slices: StatusSlice[] }) => {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0)

  return (
    <div className="flex flex-col gap-3">
      <span className="text-muted-foreground text-xs font-medium">{title}</span>
      {total ? (
        <>
          <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
            {slices.map((slice, index) => (
              <div
                key={slice.status}
                className="h-full"
                style={{
                  width: `${(slice.count / total) * 100}%`,
                  background: STATUS_COLORS[index % STATUS_COLORS.length],
                }}
              />
            ))}
          </div>
          <ul className="flex flex-col gap-2">
            {slices.map((slice, index) => (
              <li key={slice.status} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: STATUS_COLORS[index % STATUS_COLORS.length] }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{formatStatus(slice.status)}</span>
                <span className="tabular-nums">{formatCount(slice.count)}</span>
                <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">
                  {Math.round((slice.count / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <span className="text-muted-foreground text-sm">No orders yet</span>
      )}
    </div>
  )
}

const DashboardSkeleton = () => (
  <>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-32 rounded-xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Skeleton className="h-80 rounded-xl xl:col-span-2" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  </>
)

const DashboardPage = () => {
  const [range, setRange] = useState<RangeKey>("30d")
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue")
  const { data, isPending, isError, error, refetch, isFetching } =
    useSalesAnalytics(range)

  const chartConfig = {
    [metric]: {
      label: metric === "revenue" ? "Revenue" : "Orders",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig

  const chartData =
    data?.daily.map((point) => ({
      day: formatDay(point.date),
      revenue: point.revenue,
      orders: point.orders,
    })) ?? []
  const hasSales = chartData.some((point) => point[metric] > 0)

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Sales performance over the last ${
          RANGES.find((entry) => entry.key === range)?.label
        }`}
        actions={
          <>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={range}
              onValueChange={(value) => value && setRange(value as RangeKey)}
              aria-label="Date range"
            >
              {RANGES.map((entry) => (
                <ToggleGroupItem key={entry.key} value={entry.key}>
                  {entry.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => refetch()}
              aria-label="Refresh dashboard"
            >
              <RefreshCw className={isFetching ? "animate-spin" : undefined} />
            </Button>
          </>
        }
      />

      {isPending ? (
        <DashboardSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load the dashboard</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            {error instanceof Error ? error.message : "Something went wrong."}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {data.otherCurrencies.length || data.truncated ? (
            <Alert variant="info">
              <AlertDescription>
                {data.otherCurrencies.length
                  ? `Money figures are in ${data.currencyCode?.toUpperCase()}; orders in ${data.otherCurrencies.join(", ")} are left out of totals. `
                  : ""}
                {data.truncated
                  ? "This range has more orders than can be loaded at once, so figures cover the most recent ones."
                  : ""}
              </AlertDescription>
            </Alert>
          ) : null}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi
              label="Revenue"
              icon={DollarSign}
              value={formatMoney(data.revenue, data.currencyCode)}
              footer={<Delta current={data.revenue} previous={data.previousRevenue} />}
            />
            <Kpi
              label="Orders"
              icon={ShoppingCart}
              value={formatCount(data.orders)}
              footer={<Delta current={data.orders} previous={data.previousOrders} />}
            />
            <Kpi
              label="Average order value"
              icon={Receipt}
              value={formatMoney(data.averageOrderValue, data.currencyCode)}
              footer={
                <Delta
                  current={data.averageOrderValue}
                  previous={data.previousAverageOrderValue}
                />
              }
            />
            <Kpi
              label="Items sold"
              icon={Package}
              value={formatCount(data.itemsSold)}
              footer={
                <span className="text-muted-foreground text-xs">
                  {data.orders
                    ? `${(data.itemsSold / data.orders).toFixed(1)} per order`
                    : "Across all orders"}
                </span>
              }
            />
            <Kpi
              label="New customers"
              icon={UserPlus}
              value={formatCount(data.newCustomers)}
              footer={<span className="text-muted-foreground text-xs">Signed up in range</span>}
            />
          </section>

          <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
            <Section
              title="Sales trend"
              description={metric === "revenue" ? "Revenue per day" : "Orders per day"}
              className="xl:col-span-2"
              action={
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={metric}
                  onValueChange={(value) =>
                    value && setMetric(value as "revenue" | "orders")
                  }
                  aria-label="Trend metric"
                >
                  <ToggleGroupItem value="revenue">Revenue</ToggleGroupItem>
                  <ToggleGroupItem value="orders">Orders</ToggleGroupItem>
                </ToggleGroup>
              }
            >
              {hasSales ? (
                <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
                  <BarChart data={chartData} margin={{ left: 4, right: 4 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={24}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={(value: number) =>
                        metric === "revenue"
                          ? new Intl.NumberFormat(undefined, {
                              notation: "compact",
                            }).format(value)
                          : formatCount(value)
                      }
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            metric === "revenue"
                              ? formatMoney(Number(value), data.currencyCode)
                              : formatCount(Number(value))
                          }
                        />
                      }
                    />
                    <Bar dataKey={metric} fill={`var(--color-${metric})`} radius={4} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <Empty>No orders in this range yet</Empty>
              )}
            </Section>

            <Section title="Order status" description="Every order placed in range">
              <div className="flex flex-col gap-6">
                <StatusList title="Payment" slices={data.paymentStatus} />
                <StatusList title="Fulfillment" slices={data.fulfillmentStatus} />
              </div>
            </Section>
          </section>

          <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            <Section title="Top products" description="Ranked by revenue">
              {data.topProducts.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topProducts.map((product) => (
                      <TableRow key={product.key}>
                        <TableCell className="max-w-0">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="bg-muted size-8 shrink-0 overflow-hidden rounded-md border">
                              {product.thumbnail ? (
                                <img
                                  src={product.thumbnail}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : null}
                            </div>
                            <span className="truncate font-medium">{product.title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCount(product.quantity)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(product.revenue, data.currencyCode)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Empty>No products sold in this range</Empty>
              )}
            </Section>

            <Section
              title="Recent orders"
              description="Latest orders in range"
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/orders">View all</Link>
                </Button>
              }
            >
              {data.recentOrders.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer"
                        onClick={() =>
                          window.open(`${LEGACY_ADMIN_URL}/orders/${order.id}`, "_blank")
                        }
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium tabular-nums">
                              #{order.display_id}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {formatDateTime(order.created_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-0 truncate">
                          {order.email || "Guest"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.payment_status} />
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(Number(order.total) || 0, order.currency_code)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Empty>No orders in this range yet</Empty>
              )}
            </Section>
          </section>
        </>
      )}
    </>
  )
}

export default DashboardPage
