import React, { useMemo } from 'react';
import {
  Icon,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Progress,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  SectionCard,
  StatusBadge,
  EmptyState,
  ErrorState,
  PageBody,
  SkeletonPage,
  Thumbnail,
} from '../ui';
import { DataTable, RankedBars, Sparkline } from '../shared';
import { useAnalyticsQuery, useDashboardQuery, useOrdersQuery } from '../../hooks/useAdminQueries';
import { formatMoney, formatDateTime } from '../../lib/format';

/**
 * Every figure on this screen comes from /admin/dashboard or /admin/orders.
 * The dashboard endpoint reports a fixed 30-day window, so the whole page is
 * labelled for that window rather than offering ranges it cannot answer.
 */
const WINDOW_LABEL = 'Last 30 days';
const WINDOW_DAYS = 30;

/** The same 30 whole days the dashboard reports on, asked of the analytics API with the 30 before it. */
function trailingWindow() {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - (WINDOW_DAYS - 1));
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString(), compare: 'previous' };
}

/** "2026-10-06" as "6 Oct" (or "Tue, 6 Oct 2026" in full), read as a calendar day, not UTC midnight. */
function dayLabel(day, full = false) {
  const [y, m, d] = String(day).split('-').map(Number);
  if (!y || !m || !d) return String(day);
  return new Date(y, m - 1, d).toLocaleDateString(
    'en-IN',
    full ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }
  );
}

/**
 * Percentage change against the previous window, from one API's figures on
 * both sides. No previous figure means no comparison, not "+100%".
 */
function changeOf(current, previous) {
  if (typeof current !== 'number' || typeof previous !== 'number' || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  return {
    label: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
    type: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'neutral',
  };
}

/**
 * The two states an order carries, as a table column reads them. The shared
 * badge guesses a colour from the words in a status, and "unfulfilled",
 * "returned" and "refunded" are in none of its lists, so every row came out
 * the same flat grey. Declared here instead, and in the same words the
 * pipeline panel above uses, so the operator meets one vocabulary.
 */
const PAYMENT_STATE = {
  paid: { label: 'Paid', variant: 'success' },
  awaiting: { label: 'Awaiting', variant: 'warning' },
  refunded: { label: 'Refunded', variant: 'destructive' },
};

/** Rows the low-stock card lists before pointing to Inventory for the rest. */
const LOW_STOCK_ROWS = 8;

const PAYMENT_METHOD_LABEL = { cod: 'COD', razorpay: 'Razorpay', stripe: 'Stripe' };

const FULFILLMENT_STAGES = [
  { key: 'unfulfilled', label: 'Awaiting dispatch', tone: 'warning', icon: 'inventory_2' },
  { key: 'shipped', label: 'In transit', tone: 'info', icon: 'local_shipping' },
  { key: 'delivered', label: 'Delivered', tone: 'success', icon: 'task_alt' },
  { key: 'returned', label: 'Returned', tone: 'destructive', icon: 'assignment_return' },
];

const PAYMENT_STAGES = [
  { key: 'paid', label: 'Paid', tone: 'success' },
  { key: 'awaiting', label: 'Awaiting payment', tone: 'warning' },
  { key: 'refunded', label: 'Refunded', tone: 'info' },
];

const RELATIVE_STEPS = [
  [60, 'sec'],
  [3600, 'min'],
  [86400, 'hr'],
];

const FULFILLMENT_STATE = Object.fromEntries(
  FULFILLMENT_STAGES.map((stage) => [stage.key, { label: stage.label, variant: stage.tone }])
);

function relativeTime(iso) {
  if (!iso) return '—';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (Number.isNaN(seconds)) return '—';
  if (seconds < 10) return 'just now';
  for (const [limit, unit] of RELATIVE_STEPS) {
    if (seconds < limit) {
      const divisor = limit === 60 ? 1 : limit === 3600 ? 60 : 3600;
      return `${Math.floor(seconds / divisor)} ${unit} ago`;
    }
  }
  return `${Math.floor(seconds / 86400)} d ago`;
}

export function ExecutiveOverview({ onNavigate, onShowToast, onSelectOrder }) {
  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboard,
    isFetching: isDashboardFetching,
  } = useDashboardQuery();

  // A wider slice of orders so the pipeline and product mix are counted from
  // the same window the dashboard reports on.
  const {
    data: ordersData,
    isError: isOrdersError,
    refetch: refetchOrders,
  } = useOrdersQuery({ limit: 100 });

  // Period-over-period comparison and the daily shape for the KPI tiles.
  // The window is fixed for the life of the page so the query key is stable.
  const comparisonParams = useMemo(() => trailingWindow(), []);
  const { data: analytics } = useAnalyticsQuery(comparisonParams);
  const trend = useMemo(() => {
    const now = analytics?.totals;
    const before = analytics?.previous;
    const daily = analytics?.daily ?? [];
    return {
      revenue: changeOf(now?.total, before?.total),
      orders: changeOf(now?.orders, before?.orders),
      aov: changeOf(now?.aov, before?.aov),
      newCustomers: now?.newCustomers,
      revenuePoints: daily.map((d) => ({ value: d.revenue ?? 0 })),
      orderPoints: daily.map((d) => ({ value: d.orders ?? 0 })),
    };
  }, [analytics]);
  const COMPARE_LABEL = 'vs previous 30 days';

  const currency = dashboard?.currency ?? 'inr';

  // The overview reports on the one region the store trades in, so orders
  // placed in a currency it no longer operates are left out of these counts.
  // They remain visible, in full, in Order management.
  const orders = useMemo(
    () => (ordersData?.orders ?? []).filter((o) => o.currency === currency),
    [ordersData, currency]
  );

  const derived = useMemo(() => {
    const byFulfillment = Object.fromEntries(FULFILLMENT_STAGES.map((s) => [s.key, 0]));
    const byPayment = Object.fromEntries(PAYMENT_STAGES.map((s) => [s.key, 0]));
    const byMethod = new Map();
    const destinations = new Map();
    const products = new Map();
    let units = 0;
    let cancelled = 0;

    for (const order of orders) {
      if (order.status === 'canceled') cancelled += 1;
      if (order.fulfillmentStatus in byFulfillment) byFulfillment[order.fulfillmentStatus] += 1;
      if (order.paymentStatus in byPayment) byPayment[order.paymentStatus] += 1;
      const method = order.paymentMethod || 'unknown';
      byMethod.set(method, (byMethod.get(method) || 0) + 1);

      const city = (order.shippingAddress?.city ?? '').trim() || 'Not recorded';
      destinations.set(city, (destinations.get(city) || 0) + 1);

      for (const item of order.items ?? []) {
        const qty = item.quantity ?? 0;
        units += qty;
        const key = item.productId || item.productTitle;
        const prev = products.get(key) || {
          title: item.productTitle,
          thumbnail: item.thumbnail,
          units: 0,
          revenue: 0,
          currency: order.currency,
        };
        prev.units += qty;
        prev.revenue += item.total ?? 0;
        products.set(key, prev);
      }
    }

    const topProducts = [...products.values()].sort((a, b) => b.units - a.units).slice(0, 5);

    /*
     * Destinations are a long tail, so only the busiest are drawn. Folding the
     * rest into an "other" row was worse than leaving them out: the bars sort
     * by size, so the aggregate landed above every real city and was the first
     * thing the eye met. The panel states the share of every order instead,
     * which the caller passes as the total, so six bars still say what they
     * are a share of.
     */
    const topDestinations = [...destinations.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ key: label, label, value }));

    return {
      byFulfillment,
      byPayment,
      byMethod: [...byMethod.entries()],
      topProducts,
      topDestinations,
      units,
      cancelled,
    };
  }, [orders]);

  const revenue = dashboard?.revenue ?? { total: 0, orders: 0 };
  const totalOrders = revenue.orders;

  const averageOrderValue = useMemo(
    () => (revenue.orders > 0 ? Math.round(revenue.total / revenue.orders) : null),
    [revenue]
  );

  const dailySeries = useMemo(() => {
    const days = dashboard?.daily ?? [];
    return { days, max: Math.max(...days.map((d) => d.total), 1), currency };
  }, [dashboard, currency]);

  if (isDashboardLoading) {
    return <SkeletonPage variant="dashboard" stats={6} statsCols={6} label="Loading executive overview" />;
  }

  const attention = dashboard?.attention ?? { toShip: 0, toCollect: 0, lowStock: 0 };
  const lowStock = dashboard?.lowStock ?? [];
  const recentOrders = dashboard?.recentOrders ?? [];

  return (
    <PageContainer>
      <PageHeader
        kicker="Core"
        title="Overview"
        description="Sales, fulfilment and stock at a glance."
        badge={WINDOW_LABEL}
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              refetchDashboard();
              refetchOrders();
            }}
            disabled={isDashboardFetching}
          >
            <Icon
              name="sync"
              aria-hidden="true"
              className={`material-symbols-outlined text-icon-md ${isDashboardFetching ? 'animate-spin' : ''}`}
            />
            <span>{isDashboardFetching ? 'Refreshing' : 'Refresh'}</span>
          </Button>
        }
      />
      <PageBody
        error={dashboardError}
        hasData={dashboard != null}
        title="Dashboard figures are unavailable"
        onRetry={refetchDashboard}
      >

        {/* KPI row. Each tile is one number the API reports or one derived from it. */}
        <ContentGrid columns={6}>
          <StatsCard
            title={`Revenue · ${WINDOW_LABEL}`}
            value={formatMoney(revenue.total, currency)}
            change={trend.revenue?.label}
            changeType={trend.revenue?.type}
            trendLabel={trend.revenue ? COMPARE_LABEL : undefined}
            visual={
              trend.revenuePoints.length > 1 ? (
                <Sparkline points={trend.revenuePoints} height={28} label="Daily revenue, last 30 days" />
              ) : undefined
            }
            icon="payments"
            subtext={`${dashboard?.region?.name ?? 'Operating region'}, excluding cancelled orders`}
          />
          <StatsCard
            title="Orders placed"
            value={totalOrders}
            change={trend.orders?.label}
            changeType={trend.orders?.type}
            trendLabel={trend.orders ? COMPARE_LABEL : undefined}
            visual={
              trend.orderPoints.length > 1 ? (
                <Sparkline points={trend.orderPoints} height={28} label="Daily orders, last 30 days" />
              ) : undefined
            }
            icon="shopping_bag"
            iconColor="text-info"
            subtext={
              derived.cancelled > 0 ? `${derived.cancelled} cancelled separately` : 'Excludes cancelled orders'
            }
          />
          <StatsCard
            title="Average order value"
            value={averageOrderValue === null ? '—' : formatMoney(averageOrderValue, currency)}
            change={trend.aov?.label}
            changeType={trend.aov?.type}
            trendLabel={trend.aov ? COMPARE_LABEL : undefined}
            icon="receipt_long"
            subtext={`${derived.units} unit${derived.units === 1 ? '' : 's'} sold`}
          />
          <StatsCard
            title="Registered customers"
            value={dashboard?.customers ?? 0}
            badge={trend.newCustomers > 0 ? `+${trend.newCustomers} new` : undefined}
            badgeVariant="success"
            icon="group"
            iconColor="text-info"
            subtext="Accounts with a password set"
            onClick={() => onNavigate('customers-and-loyalty')}
          />
          <StatsCard
            title="Awaiting dispatch"
            value={attention.toShip}
            icon="local_shipping"
            iconColor="text-warning"
            badge={attention.toShip > 0 ? 'Action' : undefined}
            badgeVariant="warning"
            subtext="Orders not yet fulfilled"
            onClick={() => onNavigate('order-management')}
          />
          <StatsCard
            title="Low stock SKUs"
            value={attention.lowStock}
            icon="inventory_2"
            iconColor={attention.lowStock > 0 ? 'text-danger' : 'text-success'}
            subtext={`At or below ${dashboard?.lowStockThreshold ?? 0} units`}
            onClick={() => onNavigate('inventory-and-warehouses')}
          />
        </ContentGrid>

        <div className="grid gap-space-lg xl:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-space-lg xl:col-span-8">
            {/* Daily revenue, straight from the dashboard's own series. */}
            <SectionCard
              title={`Daily revenue · ${WINDOW_LABEL}`}
              description={
                dailySeries.currency
                  ? `Orders settled in ${dailySeries.currency.toUpperCase()}, by day.`
                  : 'No settled orders in this window yet.'
              }
            >
              {dailySeries.days.length === 0 ? (
                <EmptyState
                  icon="show_chart"
                  title="No revenue in this window"
                  description="A paid order appears on this trend as soon as it is placed."
                />
              ) : (
                <div className="flex flex-col gap-space-sm">
                  <div
                    role="img"
                    aria-label={`Daily revenue in ${dailySeries.currency.toUpperCase()} across ${dailySeries.days.length} days`}
                    className="flex h-56 items-end gap-2 rounded-xl border border-subtle bg-surface-subtle p-space-md"
                  >
                    {dailySeries.days.map((d) => {
                      const pct = Math.max(4, Math.round((d.total / dailySeries.max) * 100));
                      return (
                        <div key={d.day} className="group flex h-full min-w-0 flex-1 flex-col items-center gap-1.5">
                          <span className="whitespace-nowrap text-micro tabular-nums text-muted opacity-0 transition-opacity group-hover:opacity-100">
                            {formatMoney(d.total, d.currency)}
                          </span>
                          {/* The track is the measured box; the bar takes its share of it. */}
                          <div className="flex w-full flex-1 items-end justify-center">
                            <div
                              className="w-full max-w-10 rounded-t-sm bg-chart-1 transition-colors group-hover:bg-accent"
                              style={{ height: `${pct}%` }}
                              title={`${dayLabel(d.day, true)}: ${formatMoney(d.total, d.currency)} from ${d.orders} order${d.orders === 1 ? '' : 's'}`}
                            />
                          </div>
                          <span className="w-full truncate text-center text-micro tabular-nums text-muted">
                            {dayLabel(d.day)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-meta text-muted">Hover a bar for the exact amount and order count.</p>
                </div>
              )}
            </SectionCard>

            {/* Product mix derived from the line items on those orders. */}
            <SectionCard
              title="Most ordered products"
              description="Ranked by units across the orders in this window."
              action={
                <Button variant="outline" size="sm" onClick={() => onNavigate('products')}>
                  Open catalog
                </Button>
              }
              contentClassName="p-0"
            >
              {derived.topProducts.length === 0 ? (
                <EmptyState
                  icon="checkroom"
                  title="No line items yet"
                  description="Product rankings appear once orders contain items."
                  className="m-space-md"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="w-1/3">Share of units</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derived.topProducts.map((p) => {
                      const share = derived.units ? Math.round((p.units / derived.units) * 100) : 0;
                      return (
                        <TableRow key={p.title} className="cursor-pointer" onClick={() => onNavigate('products')}>
                          <TableCell>
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Thumbnail
                                src={p.thumbnail}
                                alt={p.title}
                                className="h-11 w-9 rounded-md"
                                imgClassName="object-cover"
                              />
                              <span className="line-clamp-2 font-semibold text-meta text-primary" title={p.title}>
                                {p.title}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{p.units}</TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">
                            {formatMoney(p.revenue, p.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={share} label={`${share}% of units`} className="flex-1" />
                              <span className="w-9 shrink-0 text-right text-meta tabular-nums text-muted">{share}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </SectionCard>
            {/* Sits under the product table so both columns end together. */}
            <SectionCard
              className="flex-1"
              title="Where orders ship"
              description={`The busiest delivery cities across the ${orders.length} most recent ${
                orders.length === 1 ? 'order' : 'orders'
              }.`}
              action={
                <Button variant="outline" size="sm" onClick={() => onNavigate('shipments-and-dispatch')}>
                  Shipments
                </Button>
              }
            >
              <RankedBars
                rows={derived.topDestinations}
                // Six of eleven cities are drawn, so the share each bar reports
                // is of every order rather than of the six that fitted.
                total={orders.length}
                emptyMessage="No orders carry a delivery address yet."
              />
            </SectionCard>
          </div>

          <div className="flex min-w-0 flex-col gap-space-lg xl:col-span-4">
            {/* Pipeline counts, from the order list rather than a static figure. */}
            <SectionCard
              title="Order pipeline"
              description={`${orders.length} order${orders.length === 1 ? '' : 's'} counted.`}
            >
              {isOrdersError ? (
                <ErrorState
                  title="Pipeline unavailable"
                  message="The order list could not be read."
                  onRetry={() => refetchOrders()}
                />
              ) : orders.length === 0 ? (
                <EmptyState icon="inbox" title="No orders yet" description="The pipeline fills as orders arrive." />
              ) : (
                <div className="flex flex-col gap-space-sm">
                  {FULFILLMENT_STAGES.map((stage) => (
                    <div key={stage.key} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 text-meta text-secondary">
                        <Icon
                          name={stage.icon}
                          aria-hidden="true"
                          className="material-symbols-outlined shrink-0 text-icon-sm text-muted"
                        />
                        <span className="truncate">{stage.label}</span>
                      </span>
                      <Badge variant={stage.tone} size="sm" className="tabular-nums">
                        {derived.byFulfillment[stage.key]}
                      </Badge>
                    </div>
                  ))}
                  <div className="mt-1 flex flex-col gap-1 border-t border-subtle pt-space-sm">
                    {PAYMENT_STAGES.map((stage) => (
                      <div key={stage.key} className="flex items-center justify-between gap-2">
                        <span className="truncate text-meta text-secondary">{stage.label}</span>
                        <Badge variant={stage.tone} size="sm" className="tabular-nums">
                          {derived.byPayment[stage.key]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {derived.byMethod.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 border-t border-subtle pt-space-sm">
                      <span className="text-caption uppercase text-muted">Payment method</span>
                      {derived.byMethod.map(([method, count]) => (
                        <Badge key={method} variant="secondary" size="sm">
                          {method.toUpperCase()} · {count}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </SectionCard>

            <SectionCard
              className="flex-1"
              title="Low stock"
              description={`At or below ${dashboard?.lowStockThreshold ?? 0} units.`}
              action={
                <Button variant="outline" size="sm" onClick={() => onNavigate('inventory-and-warehouses')}>
                  Inventory
                </Button>
              }
            >
              {lowStock.length === 0 ? (
                <EmptyState
                  icon="task_alt"
                  title="Nothing below threshold"
                  description="Every tracked variant is above its reorder point."
                />
              ) : (
                <div className="flex flex-col gap-space-xs">
                  {lowStock.slice(0, LOW_STOCK_ROWS).map((row) => (
                    <div
                      key={`${row.productId}-${row.variantId}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-subtle p-2.5"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold text-meta text-primary">{row.title}</span>
                        <span className="truncate text-micro text-muted">{row.variantTitle}</span>
                      </span>
                      <Badge variant={row.stock === 0 ? 'destructive' : 'warning'} size="sm" className="tabular-nums">
                        {row.stock} left
                      </Badge>
                    </div>
                  ))}
                  {lowStock.length > LOW_STOCK_ROWS && (
                    <button
                      type="button"
                      onClick={() => onNavigate('inventory-and-warehouses')}
                      className="rounded-lg px-2.5 py-1.5 text-left text-meta font-semibold text-accent hover:bg-surface-subtle"
                    >
                      +{lowStock.length - LOW_STOCK_ROWS} more in Inventory
                    </button>
                  )}
                </div>
              )}
            </SectionCard>

          </div>
        </div>

        {/* The orders rail used to live in the narrow right column as a stack
            of three-line blocks: the number, the customer and the total each on
            a row of their own, so reading down the list for the largest order,
            or for the ones still unfulfilled, meant tracking a zig-zag. It also
            ran some six hundred pixels past the column beside it and left a
            hole under the product table.

            Full width and in columns it reads down instead of across, and the
            two columns above it now finish together. */}
        <SectionCard
          title="Latest orders"
          description="The newest orders across the store. Open one to work it in Order management."
          action={
            <Button variant="outline" size="sm" onClick={() => onNavigate('order-management')}>
              All orders
            </Button>
          }
          contentClassName="p-0"
        >
          <DataTable
            columns={[
              {
                key: 'order',
                fit: true,
                header: 'Order',
                accessor: (order) => (
                  <span className="whitespace-nowrap font-mono text-num text-primary">
                    #{order.displayId}
                  </span>
                ),
              },
              {
                // No column takes the slack on its own. `grow` on Customer put
                // every spare pixel into one cell, so the name sat at the left
                // of a field half the table wide and the rest of the row was
                // pushed against the right edge. Sharing it spreads the columns
                // across the panel instead.
                key: 'customer',
                header: 'Customer',
                className: 'max-w-sm',
                accessor: (order) => {
                  const name = order.shippingAddress
                    ? `${order.shippingAddress.firstName ?? ''} ${order.shippingAddress.lastName ?? ''}`.trim()
                    : '';
                  return (
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-body-lg text-primary" title={name || order.email}>
                        {name || order.email}
                      </span>
                      {name && (
                        <span className="truncate text-meta text-muted" title={order.email}>
                          {order.email}
                        </span>
                      )}
                    </span>
                  );
                },
              },
              {
                // Customer alone took every pixel of slack and left a hand's
                // width of empty cell between the name and the next column.
                // Where the parcel is going is the other thing a fulfilment
                // desk reads off this list, and it earns the space.
                key: 'destination',
                header: 'Destination',
                accessor: (order) => {
                  const city = order.shippingAddress?.city;
                  const country = order.shippingAddress?.countryCode;
                  if (!city) return <span className="text-faint">\u2014</span>;
                  return (
                    <span className="whitespace-nowrap text-secondary">
                      {city}
                      {country && (
                        <span className="ml-1.5 uppercase text-meta text-muted">{country}</span>
                      )}
                    </span>
                  );
                },
              },
              {
                key: 'placed',
                header: 'Placed',
                accessor: (order) => (
                  <span className="whitespace-nowrap text-secondary" title={formatDateTime(order.createdAt)}>
                    {relativeTime(order.createdAt)}
                  </span>
                ),
              },
              {
                key: 'items',
                header: 'Items',
                align: 'right',
                accessor: (order) => order.items?.length ?? 0,
              },
              {
                key: 'payment',
                header: 'Payment',
                accessor: (order) => (
                  <span className="flex items-center gap-2">
                    <StatusBadge
                      status={PAYMENT_STATE[order.paymentStatus]?.label ?? order.paymentStatus}
                      variant={PAYMENT_STATE[order.paymentStatus]?.variant}
                      size="sm"
                      showDot
                    />
                    <span className="whitespace-nowrap text-meta text-muted">
                      {PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
                    </span>
                  </span>
                ),
              },
              {
                key: 'fulfillment',
                header: 'Fulfilment',
                accessor: (order) => (
                  <StatusBadge
                    status={FULFILLMENT_STATE[order.fulfillmentStatus]?.label ?? order.fulfillmentStatus}
                    variant={FULFILLMENT_STATE[order.fulfillmentStatus]?.variant}
                    size="sm"
                    showDot
                  />
                ),
              },
              {
                key: 'total',
                header: 'Total',
                align: 'right',
                accessor: (order) => (
                  <span className="text-num text-primary">
                    {formatMoney(order.totals?.total ?? 0, order.currency)}
                  </span>
                ),
              },
            ]}
            data={recentOrders}
            keyField="id"
            onRowClick={(order) => {
              onSelectOrder?.(order.id);
              onNavigate('order-management');
            }}
            emptyIcon="receipt_long"
            emptyTitle="No orders yet"
            emptyMessage="New orders appear here first."
            caption="The most recent orders, newest first"
          />
        </SectionCard>
      </PageBody>
    </PageContainer>
  );
}

export default ExecutiveOverview;
