import {
  ArrowRight,
  Minus,
  PackageX,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription } from "@/components/reui/alert"
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
  type SalesAnalytics,
  type StatusSlice,
} from "@/features/analytics/use-sales-analytics"
import { useOperations } from "@/hooks/use-operations"
import {
  formatCount,
  formatDay,
  formatMoney,
  formatMoneyCompact,
  formatRelative,
  formatStatus,
  percentChange,
} from "@/lib/format"
import { LABEL_CAPS, METRIC_STAT } from "@/lib/typography"
import { cn } from "@/lib/utils"

const percent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`

/* ---------------------------------------------------------------- tiles --- */

const Meta = ({ children }: { children: ReactNode }) => (
  <span className="text-muted-foreground text-xs">{children}</span>
)

/** The change pill, or nothing when there is no earlier period to compare. */
const Trend = ({ current, previous }: { current: number; previous: number }) => {
  const change = percentChange(current, previous)

  if (change === null) return null

  const rounded = Math.round(change)
  const Icon = rounded > 0 ? TrendingUp : rounded < 0 ? TrendingDown : Minus

  return (
    <Badge
      variant={
        rounded > 0 ? "success-light" : rounded < 0 ? "destructive-light" : "outline"
      }
      radius="full"
      className={cn(LABEL_CAPS, "gap-1 px-2 tabular-nums")}
    >
      <Icon aria-hidden="true" />
      {rounded > 0 ? "+" : ""}
      {rounded}%
    </Badge>
  )
}

const Kpi = ({
  label,
  value,
  unit,
  action,
  children,
  className,
}: {
  label: string
  value: string
  unit?: string
  action?: ReactNode
  children?: ReactNode
  className?: string
}) => (
  <Card size="sm" className={className}>
    <CardHeader>
      <CardTitle className={cn(LABEL_CAPS, "text-muted-foreground")}>{label}</CardTitle>
      {action ? <CardAction>{action}</CardAction> : null}
    </CardHeader>
    <CardContent className="flex flex-1 flex-col justify-between gap-3">
      <div className={METRIC_STAT}>
        {value}
        {unit ? (
          <span className="text-muted-foreground ml-1 text-sm font-normal">{unit}</span>
        ) : null}
      </div>
      {children}
    </CardContent>
  </Card>
)

/** Payment mix under the order count: three states, each named beside its share. */
const PaymentSplit = ({ slices }: { slices: StatusSlice[] }) => {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0)

  if (!total) return <Meta>No orders in range</Meta>

  const TONES: Record<string, string> = {
    paid: "bg-success",
    awaiting: "bg-warning",
    refunded: "bg-destructive",
  }
  const ordered = ["paid", "awaiting", "refunded"]
    .map((status) => slices.find((slice) => slice.status === status))
    .filter((slice): slice is StatusSlice => !!slice && slice.count > 0)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
        {ordered.map((slice) => (
          <div
            key={slice.status}
            className={cn("h-full", TONES[slice.status] ?? "bg-muted")}
            // The width is the datum; a utility cannot carry a runtime ratio.
            style={{ width: `${(slice.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        {ordered.map((slice) => (
          <Meta key={slice.status}>
            {formatStatus(slice.status)} {Math.round((slice.count / total) * 100)}%
          </Meta>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- charts --- */

const FULFILLMENT_ORDER = ["unfulfilled", "shipped", "delivered", "returned"]

/**
 * Fixed slot per status, so a filter or a quiet day never repaints the rest.
 * The arc needs a colour value; the legend dot beside the label is a class.
 */
const FUNNEL_FILL: Record<string, string> = {
  unfulfilled: "var(--chart-4)",
  shipped: "var(--chart-3)",
  delivered: "var(--chart-2)",
  returned: "var(--chart-5)",
}

const FUNNEL_DOT: Record<string, string> = {
  unfulfilled: "bg-chart-4",
  shipped: "bg-chart-3",
  delivered: "bg-chart-2",
  returned: "bg-chart-5",
}

const FunnelChart = ({ slices }: { slices: StatusSlice[] }) => {
  const rows = FULFILLMENT_ORDER.map((status) => ({
    status,
    label: formatStatus(status),
    count: slices.find((slice) => slice.status === status)?.count ?? 0,
  })).filter((row) => row.count > 0)
  const total = rows.reduce((sum, row) => sum + row.count, 0)

  if (!total) {
    return (
      <div className="text-muted-foreground flex min-h-40 items-center justify-center text-sm">
        No orders in this range yet
      </div>
    )
  }

  const config = Object.fromEntries(
    rows.map((row) => [row.status, { label: row.label, color: FUNNEL_FILL[row.status] }])
  ) satisfies ChartConfig

  return (
    <div className="flex flex-col gap-4">
      <ChartContainer config={config} className="mx-auto aspect-square h-44">
        <PieChart>
          <ChartTooltip
            content={<ChartTooltipContent nameKey="status" hideLabel />}
          />
          <Pie
            data={rows}
            dataKey="count"
            nameKey="status"
            innerRadius="62%"
            outerRadius="100%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {rows.map((row) => (
              <Cell key={row.status} fill={FUNNEL_FILL[row.status]} />
            ))}
            <Label
              content={({ viewBox }) =>
                viewBox && "cx" in viewBox ? (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-xl font-semibold tabular-nums"
                    >
                      {formatCount(total)}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 18}
                      className="fill-muted-foreground text-[11px]"
                    >
                      orders
                    </tspan>
                  </text>
                ) : null
              }
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.status} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className={cn("size-2.5 shrink-0 rounded-full", FUNNEL_DOT[row.status])}
            />
            <span className="min-w-0 flex-1 truncate">{row.label}</span>
            <span className="tabular-nums">{formatCount(row.count)}</span>
            <span className="text-muted-foreground w-9 text-end text-xs tabular-nums">
              {Math.round((row.count / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const VelocityChart = ({
  data,
  metric,
}: {
  data: SalesAnalytics
  metric: "revenue" | "orders"
}) => {
  const rows = data.daily.map((point, index) => ({
    day: formatDay(point.date),
    current: point[metric],
    previous: data.previousDaily[index]?.[metric] ?? 0,
  }))
  const hasSales = rows.some((row) => row.current > 0 || row.previous > 0)

  const config = {
    current: { label: "This period", color: "var(--chart-1)" },
    previous: { label: "Previous period", color: "var(--muted-foreground)" },
  } satisfies ChartConfig

  const axis = (value: number) =>
    metric === "revenue" ? formatMoneyCompact(value, data.currencyCode) : formatCount(value)

  if (!hasSales) {
    return (
      <div className="text-muted-foreground flex min-h-64 items-center justify-center text-sm">
        No orders in this range yet
      </div>
    )
  }

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <AreaChart data={rows} margin={{ left: 4, right: 4, top: 4 }}>
        <defs>
          <linearGradient id="velocity-current" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-current)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-current)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 4" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={axis} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {name === "current" ? "This period" : "Previous period"}
                  </span>
                  <span className="tabular-nums">
                    {metric === "revenue"
                      ? formatMoney(Number(value), data.currencyCode)
                      : formatCount(Number(value))}
                  </span>
                </span>
              )}
            />
          }
        />
        <Area
          dataKey="previous"
          type="monotone"
          stroke="var(--color-previous)"
          strokeWidth={2}
          strokeDasharray="4 4"
          fill="none"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          dataKey="current"
          type="monotone"
          stroke="var(--color-current)"
          strokeWidth={2}
          fill="url(#velocity-current)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  )
}

const Sparkline = ({ points }: { points: { date: Date; revenue: number }[] }) => {
  const config = {
    revenue: { label: "Revenue", color: "var(--chart-1)" },
  } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="aspect-auto h-8 w-full">
      <AreaChart data={points} margin={{ top: 2, bottom: 2 }}>
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.24} />
            <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          dataKey="revenue"
          type="monotone"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          fill="url(#spark-fill)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}

/* --------------------------------------------------------------- panels --- */

const Panel = ({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) => (
  <Frame className={className}>
    <FrameHeader className="flex-row items-start justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        {eyebrow ? (
          <span className={cn(LABEL_CAPS, "text-muted-foreground")}>{eyebrow}</span>
        ) : null}
        <FrameTitle>{title}</FrameTitle>
        {description ? <FrameDescription>{description}</FrameDescription> : null}
      </div>
      {action}
    </FrameHeader>
    <FramePanel>{children}</FramePanel>
  </Frame>
)

const Strip = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className={cn(LABEL_CAPS, "text-muted-foreground")}>{label}</span>
    <span className={cn("text-base font-semibold tabular-nums", tone)}>{value}</span>
  </div>
)

type Exception = {
  id: string
  tone: "destructive" | "warning" | "info"
  label: string
  title: string
  body: ReactNode
  action: { to: string; text: string }
}

const TONE_STYLES: Record<Exception["tone"], { wrap: string; icon: string }> = {
  destructive: {
    wrap: "border-destructive/15 bg-destructive/10",
    icon: "text-destructive-foreground dark:text-destructive",
  },
  warning: {
    wrap: "border-warning/15 bg-warning/10",
    icon: "text-warning-foreground dark:text-warning",
  },
  info: {
    wrap: "border-info/15 bg-info/10",
    icon: "text-info-foreground dark:text-info",
  },
}

const ExceptionCard = ({ exception }: { exception: Exception }) => {
  const Icon =
    exception.tone === "destructive" ? PackageX : exception.tone === "warning" ? Truck : Wallet
  const tone = TONE_STYLES[exception.tone]

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-3", tone.wrap)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", tone.icon)} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn(LABEL_CAPS, tone.icon)}>{exception.label}</span>
        </div>
        <p className="text-sm font-medium">{exception.title}</p>
        <div className="text-muted-foreground text-sm">{exception.body}</div>
        <Button variant="outline" size="sm" className="mt-1 self-start" asChild>
          <Link to={exception.action.to}>
            {exception.action.text}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  )
}

const DashboardSkeleton = () => (
  <>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <Skeleton className="h-36 xl:col-span-2" />
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-36" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Skeleton className="h-96 lg:col-span-2" />
      <Skeleton className="h-96" />
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
    </div>
  </>
)

/* ------------------------------------------------------------------ page --- */

const DashboardPage = () => {
  const [range, setRange] = useState<RangeKey>("30d")
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue")
  const { data, isPending, isError, error, refetch, isFetching } = useSalesAnalytics(range)
  const operations = useOperations()

  const attention = operations.data?.attention
  const lowStock = operations.data?.lowStock ?? []
  const threshold = operations.data?.lowStockThreshold ?? 0

  /** Products with at least one variant under the threshold, for the stock flag. */
  const lowStockProducts = new Set(lowStock.map((row) => row.productId))

  const fulfilledCount = data?.fulfillmentStatus
    .filter((slice) => slice.status === "shipped" || slice.status === "delivered")
    .reduce((sum, slice) => sum + slice.count, 0)
  const fulfillmentTotal = data?.fulfillmentStatus.reduce(
    (sum, slice) => sum + slice.count,
    0
  )
  const fulfilledShare =
    fulfillmentTotal && fulfilledCount !== undefined
      ? fulfilledCount / fulfillmentTotal
      : null

  const paymentMix = data?.paymentStatus.length
    ? data.paymentStatus
        .map((slice) => {
          const total = data.paymentStatus.reduce((sum, entry) => sum + entry.count, 0)
          return `${formatStatus(slice.status)} ${Math.round((slice.count / total) * 100)}%`
        })
        .join(" · ")
    : ""

  const exceptions: Exception[] = []
  if (attention?.lowStock) {
    exceptions.push({
      id: "low-stock",
      tone: "destructive",
      label: "Inventory",
      title: `${formatCount(attention.lowStock)} variants at or below ${formatCount(threshold)} units`,
      body: lowStock.length ? (
        <>
          Lowest: {lowStock[0].title} ({lowStock[0].variantTitle}), {formatCount(lowStock[0].stock)}{" "}
          left
          {lowStock.length > 1 ? `, and ${formatCount(lowStock.length - 1)} more` : ""}.
        </>
      ) : (
        "Restock before these variants sell out."
      ),
      action: { to: "/products", text: "Open products" },
    })
  }
  if (attention?.toShip) {
    exceptions.push({
      id: "to-ship",
      tone: "warning",
      label: "Fulfillment",
      title: `${formatCount(attention.toShip)} orders waiting to ship`,
      body: "Paid or pending orders that have not been marked shipped yet.",
      action: { to: "/orders?fulfillment=unfulfilled", text: "Open unfulfilled" },
    })
  }
  if (attention?.toCollect) {
    exceptions.push({
      id: "to-collect",
      tone: "info",
      label: "Payments",
      title: `${formatCount(attention.toCollect)} orders awaiting payment`,
      body: "Cash on delivery orders still to be collected and marked paid.",
      action: { to: "/orders?payment=awaiting", text: "Open awaiting" },
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Overview"
        description={`Sales and fulfillment across the last ${
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
              size="sm"
              onClick={() => {
                refetch()
                operations.refetch()
              }}
            >
              <RefreshCw className={isFetching ? "animate-spin" : undefined} />
              Refresh
            </Button>
          </>
        }
      />

      {isPending ? (
        <DashboardSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
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

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <Kpi
              className="xl:col-span-2"
              label="Revenue"
              value={formatMoney(data.revenue, data.currencyCode)}
              action={<Trend current={data.revenue} previous={data.previousRevenue} />}
            >
              <Sparkline points={data.daily} />
              <div className="flex items-center justify-between">
                <Meta>
                  Previous: {formatMoney(data.previousRevenue, data.currencyCode)}
                </Meta>
                <Meta>{formatCount(data.itemsSold)} items sold</Meta>
              </div>
            </Kpi>

            <Kpi
              label="Orders"
              value={formatCount(data.orders)}
              action={<Trend current={data.orders} previous={data.previousOrders} />}
            >
              <PaymentSplit slices={data.paymentStatus} />
            </Kpi>

            <Kpi
              label="Average order"
              value={formatMoney(data.averageOrderValue, data.currencyCode)}
              action={
                <Trend
                  current={data.averageOrderValue}
                  previous={data.previousAverageOrderValue}
                />
              }
            >
              <div className="flex flex-col gap-0.5">
                <span className={cn(LABEL_CAPS, "text-muted-foreground")}>Top seller</span>
                <span className="text-primary truncate text-sm font-medium">
                  {data.topProducts[0]?.title ?? "Nothing sold yet"}
                </span>
              </div>
            </Kpi>

            <Kpi
              label="Awaiting dispatch"
              value={formatCount(attention?.toShip ?? 0)}
              action={
                attention?.toCollect ? (
                  <Badge
                    variant="warning-light"
                    radius="full"
                    className={cn(LABEL_CAPS, "px-2 tabular-nums")}
                  >
                    {formatCount(attention.toCollect)} to collect
                  </Badge>
                ) : null
              }
            >
              <Meta>Orders not yet marked shipped</Meta>
            </Kpi>

            <Kpi
              label="Low inventory"
              value={formatCount(attention?.lowStock ?? 0)}
              unit="variants"
              action={
                attention?.lowStock ? (
                  <Badge
                    variant="destructive-light"
                    radius="full"
                    className={cn(LABEL_CAPS, "px-2 tabular-nums")}
                  >
                    Restock
                  </Badge>
                ) : null
              }
            >
              <Meta>At or below {formatCount(threshold)} units</Meta>
            </Kpi>

            <Kpi
              label="Returns"
              value={formatCount(data.returned)}
              action={
                data.refunded ? (
                  <Badge
                    variant="info-light"
                    radius="full"
                    className={cn(LABEL_CAPS, "px-2 tabular-nums")}
                  >
                    {formatCount(data.refunded)} refunded
                  </Badge>
                ) : null
              }
            >
              <Meta>
                {data.orders
                  ? `${percent(data.returned / data.orders)} of orders in range`
                  : "No orders in range"}
              </Meta>
            </Kpi>
          </section>

          <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
            <Panel
              className="lg:col-span-2"
              eyebrow="Demand"
              title="Sales velocity"
              description={
                metric === "revenue" ? "Revenue per day" : "Orders per day"
              }
              action={
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={metric}
                  onValueChange={(value) => value && setMetric(value as "revenue" | "orders")}
                  aria-label="Trend metric"
                >
                  <ToggleGroupItem value="revenue">Revenue</ToggleGroupItem>
                  <ToggleGroupItem value="orders">Orders</ToggleGroupItem>
                </ToggleGroup>
              }
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-xs">
                    <span
                      aria-hidden="true"
                      className="bg-chart-1 h-0.5 w-4 rounded-full"
                    />
                    This period
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <span
                      aria-hidden="true"
                      className="bg-muted-foreground h-0.5 w-4 rounded-full opacity-60"
                    />
                    Previous period
                  </span>
                </div>

                <VelocityChart data={data} metric={metric} />

                <div className="bg-background grid grid-cols-2 gap-4 rounded-lg p-3 sm:grid-cols-4">
                  <Strip label="Items sold" value={formatCount(data.itemsSold)} />
                  <Strip label="New customers" value={formatCount(data.newCustomers)} />
                  <Strip
                    label="Cancellation rate"
                    value={percent(data.cancellationRate)}
                    tone={
                      data.cancellationRate > 0.05
                        ? "text-destructive-foreground dark:text-destructive"
                        : undefined
                    }
                  />
                  <Strip label="Discount depth" value={percent(data.discountDepth)} />
                </div>
              </div>
            </Panel>

            <Panel
              eyebrow="Fulfillment"
              title="Order status flow"
              description="Every order placed in range"
              action={
                fulfilledShare === null ? null : (
                  <Badge
                    variant={fulfilledShare >= 0.9 ? "success-light" : "warning-light"}
                    radius="full"
                    className={cn(LABEL_CAPS, "px-2 tabular-nums")}
                  >
                    {percent(fulfilledShare, 0)} shipped
                  </Badge>
                )
              }
            >
              <FunnelChart slices={data.fulfillmentStatus} />
            </Panel>
          </section>

          <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <Panel
              eyebrow="Merchandising"
              title="Top performing products"
              description="Ranked by revenue in range"
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/products">
                    View all
                    <ArrowRight />
                  </Link>
                </Button>
              }
            >
              {data.topProducts.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={LABEL_CAPS}>Product</TableHead>
                      <TableHead className={cn(LABEL_CAPS, "text-end")}>Units</TableHead>
                      <TableHead className={cn(LABEL_CAPS, "text-end")}>Revenue</TableHead>
                      <TableHead className={cn(LABEL_CAPS, "text-end")}>Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topProducts.map((product) => (
                      <TableRow key={product.key} className="h-11">
                        <TableCell className="max-w-0">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="bg-muted size-9 shrink-0 overflow-hidden rounded-lg border">
                              {product.thumbnail ? (
                                <img
                                  src={product.thumbnail}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="flex min-w-0 flex-col">
                              {product.productId ? (
                                <Link
                                  to={`/products/${product.productId}`}
                                  className="truncate font-medium hover:underline"
                                >
                                  {product.title}
                                </Link>
                              ) : (
                                <span className="truncate font-medium">{product.title}</span>
                              )}
                              {product.handle ? (
                                <span className="text-muted-foreground truncate text-xs">
                                  {product.handle}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatCount(product.quantity)}
                        </TableCell>
                        <TableCell className="text-primary text-end font-medium tabular-nums">
                          {formatMoney(product.revenue, data.currencyCode)}
                        </TableCell>
                        <TableCell className="text-end">
                          {product.productId && lowStockProducts.has(product.productId) ? (
                            <Badge
                              variant="warning-light"
                              radius="full"
                              className={cn(LABEL_CAPS, "px-2")}
                            >
                              Low stock
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">In stock</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground flex min-h-40 items-center justify-center text-sm">
                  No products sold in this range
                </div>
              )}
              {data.topProducts.length ? (
                <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 pt-3 text-xs">
                  <span>
                    Top {formatCount(data.topProducts.length)} of{" "}
                    {formatCount(data.productsSold)} products sold in range
                  </span>
                  {lowStockProducts.size ? (
                    <Link to="/products" className="text-primary font-medium hover:underline">
                      {formatCount(lowStockProducts.size)} need restocking
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </Panel>

            <Panel
              eyebrow="Exception queue"
              title="Needs attention"
              description="Live from the store, newest state first"
              action={
                exceptions.length ? (
                  <Badge
                    variant="destructive-light"
                    radius="full"
                    className={cn(LABEL_CAPS, "px-2")}
                  >
                    {formatCount(exceptions.length)} open
                  </Badge>
                ) : null
              }
            >
              {operations.isPending ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              ) : exceptions.length ? (
                <div className="flex flex-col gap-3">
                  {exceptions.map((exception) => (
                    <ExceptionCard key={exception.id} exception={exception} />
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground flex min-h-40 items-center justify-center text-sm">
                  Nothing needs attention right now
                </div>
              )}
            </Panel>
          </section>

          <Panel
            eyebrow="Ingestion"
            title="Recent order stream"
            description="The latest orders placed in range"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/orders">
                  All orders
                  <ArrowRight />
                </Link>
              </Button>
            }
          >
            {data.recentOrders.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={LABEL_CAPS}>Order</TableHead>
                      <TableHead className={LABEL_CAPS}>Customer</TableHead>
                      <TableHead className={LABEL_CAPS}>Items</TableHead>
                      <TableHead className={cn(LABEL_CAPS, "text-end")}>Value</TableHead>
                      <TableHead className={LABEL_CAPS}>Payment</TableHead>
                      <TableHead className={LABEL_CAPS}>Fulfillment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentOrders.map((order) => (
                      <TableRow key={order.id} className="h-11">
                        <TableCell>
                          <Link
                            to={`/orders/${order.id}`}
                            className="text-primary font-medium tabular-nums hover:underline"
                          >
                            #{order.displayId}
                          </Link>
                          <span className="text-muted-foreground block text-xs">
                            {formatRelative(order.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-0">
                          <span className="block truncate font-medium">
                            {[order.shippingAddress?.firstName, order.shippingAddress?.lastName]
                              .filter(Boolean)
                              .join(" ") || order.email}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {order.customerId ? "Account" : "Guest"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-0 truncate text-sm">
                          <span className="text-foreground font-medium">
                            {formatCount(
                              order.items.reduce((sum, item) => sum + item.quantity, 0)
                            )}
                          </span>{" "}
                          {order.items[0]?.productTitle ?? ""}
                        </TableCell>
                        <TableCell className="text-end font-medium tabular-nums">
                          {formatMoney(order.totals.total, order.currency)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.paymentStatus} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.fulfillmentStatus} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-muted-foreground flex min-h-40 items-center justify-center text-sm">
                No orders in this range yet
              </div>
            )}
            {paymentMix ? (
              <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 pt-3 text-xs">
                <span>Payment mix: {paymentMix}</span>
                <span>Cash on delivery is the only method this store takes</span>
              </div>
            ) : null}
          </Panel>
        </>
      )}
    </>
  )
}

export default DashboardPage
