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
  SkeletonPage,
  Thumbnail,
} from '../ui';
import { useDashboardQuery, useOrdersQuery } from '../../hooks/useAdminQueries';
import { formatMoney } from '../../lib/format';

/**
 * Every figure on this screen comes from /admin/dashboard or /admin/orders.
 * The dashboard endpoint reports a fixed 30-day window, so the whole page is
 * labelled for that window rather than offering ranges it cannot answer.
 */
const WINDOW_LABEL = 'Last 30 days';

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

/** Revenue arrives split by currency, so it is never collapsed into one number. */
function RevenueByCurrency({ revenue }) {
  if (!revenue?.length) return <span className="text-kpi text-muted">—</span>;
  return (
    <span className="flex flex-col gap-0.5">
      {revenue.map((row) => (
        <span key={row.currency} className="text-kpi tabular-nums text-primary">
          {formatMoney(row.total, row.currency)}
        </span>
      ))}
    </span>
  );
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

  const orders = ordersData?.orders ?? [];

  const derived = useMemo(() => {
    const byFulfillment = Object.fromEntries(FULFILLMENT_STAGES.map((s) => [s.key, 0]));
    const byPayment = Object.fromEntries(PAYMENT_STAGES.map((s) => [s.key, 0]));
    const byMethod = new Map();
    const products = new Map();
    let units = 0;
    let cancelled = 0;

    for (const order of orders) {
      if (order.status === 'canceled') cancelled += 1;
      if (order.fulfillmentStatus in byFulfillment) byFulfillment[order.fulfillmentStatus] += 1;
      if (order.paymentStatus in byPayment) byPayment[order.paymentStatus] += 1;
      const method = order.paymentMethod || 'unknown';
      byMethod.set(method, (byMethod.get(method) || 0) + 1);

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
    return { byFulfillment, byPayment, byMethod: [...byMethod.entries()], topProducts, units, cancelled };
  }, [orders]);

  const totalOrders = useMemo(
    () => (dashboard?.revenue ?? []).reduce((sum, row) => sum + row.orders, 0),
    [dashboard]
  );

  // Average order value only means something within a single currency.
  const averageOrderValue = useMemo(
    () =>
      (dashboard?.revenue ?? [])
        .filter((row) => row.orders > 0)
        .map((row) => ({ currency: row.currency, value: Math.round(row.total / row.orders) })),
    [dashboard]
  );

  const dailySeries = useMemo(() => {
    const rows = dashboard?.daily ?? [];
    if (!rows.length) return { days: [], max: 0, currency: null };
    // Chart the currency that carries the most revenue, and say which it is.
    const lead = [...(dashboard?.revenue ?? [])].sort((a, b) => b.total - a.total)[0];
    const currency = lead?.currency ?? rows[0].currency;
    const days = rows.filter((r) => r.currency === currency);
    return { days, max: Math.max(...days.map((d) => d.total), 1), currency };
  }, [dashboard]);

  if (isDashboardLoading) {
    return <SkeletonPage variant="dashboard" stats={6} statsCols={6} label="Loading executive overview" />;
  }

  const attention = dashboard?.attention ?? { toShip: 0, toCollect: 0, lowStock: 0 };
  const lowStock = dashboard?.lowStock ?? [];
  const recentOrders = dashboard?.recentOrders ?? [];

  return (
    <PageContainer>
      <PageHeader
        kicker="Operations"
        badge={WINDOW_LABEL}
        title="Executive overview"
        description="Trading, fulfilment and stock signals for the Everwear store, read straight from the commerce API."
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

      {isDashboardError && (
        <ErrorState
          title="Dashboard figures are unavailable"
          message={dashboardError?.message}
          onRetry={() => refetchDashboard()}
        />
      )}

      {/* KPI row. Each tile is one number the API reports or one derived from it. */}
      <ContentGrid columns={6}>
        <StatsCard
          title={`Revenue · ${WINDOW_LABEL}`}
          value={<RevenueByCurrency revenue={dashboard?.revenue} />}
          icon="payments"
          subtext={
            (dashboard?.revenue?.length ?? 0) > 1
              ? 'Reported per currency, not combined'
              : 'Excludes cancelled orders'
          }
        />
        <StatsCard
          title="Orders placed"
          value={totalOrders}
          icon="shopping_bag"
          iconColor="text-info"
          subtext={
            derived.cancelled > 0 ? `${derived.cancelled} cancelled separately` : 'Excludes cancelled orders'
          }
        />
        <StatsCard
          title="Average order value"
          value={
            averageOrderValue.length ? (
              <span className="flex flex-col gap-0.5">
                {averageOrderValue.map((row) => (
                  <span key={row.currency} className="text-kpi tabular-nums text-primary">
                    {formatMoney(row.value, row.currency)}
                  </span>
                ))}
              </span>
            ) : (
              '—'
            )
          }
          icon="receipt_long"
          subtext={`${derived.units} unit${derived.units === 1 ? '' : 's'} sold`}
        />
        <StatsCard
          title="Registered customers"
          value={dashboard?.customers ?? 0}
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

      <div className="grid items-start gap-space-lg xl:grid-cols-12">
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
                            className="w-full max-w-[42px] rounded-t-sm bg-chart-1 transition-colors group-hover:bg-accent"
                            style={{ height: `${pct}%` }}
                            title={`${d.day}: ${formatMoney(d.total, d.currency)} from ${d.orders} order${d.orders === 1 ? '' : 's'}`}
                          />
                        </div>
                        <span className="w-full truncate text-center text-micro tabular-nums text-muted">
                          {d.day.slice(5)}
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
                    <TableHead className="w-[30%]">Share of units</TableHead>
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
                {lowStock.map((row) => (
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
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Latest orders"
            action={
              <Button variant="outline" size="sm" onClick={() => onNavigate('order-management')}>
                All orders
              </Button>
            }
          >
            {recentOrders.length === 0 ? (
              <EmptyState icon="receipt_long" title="No orders yet" description="New orders appear here first." />
            ) : (
              <div className="flex flex-col gap-space-xs">
                {recentOrders.map((order) => {
                  const name = order.shippingAddress
                    ? `${order.shippingAddress.firstName ?? ''} ${order.shippingAddress.lastName ?? ''}`.trim()
                    : '';
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => {
                        onSelectOrder?.(order.id);
                        onNavigate('order-management');
                      }}
                      className="flex flex-col gap-1 rounded-lg border border-subtle p-2.5 text-left transition-colors hover:bg-surface-subtle"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="whitespace-nowrap font-mono text-meta font-semibold text-primary">
                          #{order.displayId}
                        </span>
                        <span className="whitespace-nowrap text-micro text-muted">{relativeTime(order.createdAt)}</span>
                      </span>
                      <span className="flex items-center justify-between gap-2 text-meta">
                        <span className="truncate text-secondary">{name || order.email}</span>
                        <span className="whitespace-nowrap font-semibold tabular-nums text-primary">
                          {formatMoney(order.totals?.total ?? 0, order.currency)}
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-micro text-muted">
                          {order.items?.length ?? 0} item{(order.items?.length ?? 0) === 1 ? '' : 's'}
                        </span>
                        <StatusBadge status={order.fulfillmentStatus} size="sm" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
}

export default ExecutiveOverview;
