import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon, Button, Card } from '../ui';
import {
  PageContainer,
  PageHeader,
  SectionCard,
  DataTable,
  TablePagination,
  SearchInput,
  EmptyState,
  ErrorState,
  SkeletonPage,
  StatusBadge,
  TimeSeries,
  RankedBars,
  SplitBreakdown,
  Waterfall,
  Meter,
  BarCell,
  ChartTabs,
  SERIES,
  STATE,
} from '../shared';
import { useAnalyticsQuery } from '../../hooks/useAdminQueries';
import { useClientTable } from '../../hooks/useClientTable';
import { formatMoney, formatMoneyCompact, formatCount } from '../../lib/format';
import { cn } from '../../lib/utils';

/**
 * Analytics and reports.
 *
 * Every figure comes from GET /admin/analytics, which aggregates the orders,
 * products, customers and operational collections in the database over the
 * chosen range.
 *
 * How the screen is composed, and why:
 *
 * This was fourteen panels of identical weight — same frame, same header, same
 * grey sentence under every title — so nothing on it was more important than
 * anything else and the eye had nowhere to land. It also said several things
 * twice: a ranked-bar chart of the top products sat directly above a table of
 * the same products.
 *
 * Now there is one board and a set of sheets. The board owns the fold: the
 * figure the business leads with, its trend, and the supporting figures as a
 * ruled strip inside the same frame rather than six separate boxes. Everything
 * below is grouped by the question it answers — money, who bought, what moved,
 * the registers — so a panel means a subject rather than a single statistic.
 *
 * Explanations survive only where a figure is genuinely ambiguous ("net sales"
 * means different things in different tools). The rest moved onto the figure
 * itself, where it is there when wanted and silent when not.
 */

const RANGES = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: '12m', label: 'Last 12 months', days: 365 },
];

const MEASURES = [
  { id: 'revenue', label: 'Revenue', axis: 'Revenue' },
  { id: 'orders', label: 'Orders', axis: 'Orders' },
  { id: 'units', label: 'Units', axis: 'Units' },
];

const FULFILLMENT = {
  unfulfilled: { label: 'Unfulfilled', color: STATE.warning },
  shipped: { label: 'Shipped', color: STATE.info },
  delivered: { label: 'Delivered', color: STATE.good },
  returned: { label: 'Returned', color: STATE.critical },
};

const PAYMENT = {
  awaiting: { label: 'Awaiting', color: STATE.warning },
  paid: { label: 'Paid', color: STATE.good },
  refunded: { label: 'Refunded', color: STATE.critical },
};

// Payment method is identity, not state, so it takes the categorical slots in
// a fixed order: a method keeps its colour whether or not the others appear.
const METHOD = {
  cod: { label: 'Cash on delivery', color: SERIES[0] },
  razorpay: { label: 'Razorpay', color: SERIES[1] },
  stripe: { label: 'Stripe', color: SERIES[2] },
};

const SHIPMENT_LABEL = {
  manifested: 'Manifested',
  pickup_scheduled: 'Pickup scheduled',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  rto: 'Returned to origin',
  canceled: 'Cancelled',
};

const PO_LABEL = {
  draft: 'Draft',
  submitted: 'Submitted',
  partially_received: 'Partly received',
  received: 'Received',
  canceled: 'Cancelled',
};

/** The API returns only the days that had orders; a time axis needs all of them. */
function buildSeries(daily, range) {
  const timezone = range?.timezone || 'UTC';
  const dayKey = (date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);

  const from = new Date(range?.from ?? Date.now());
  const to = new Date(range?.to ?? Date.now());
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return { points: [], grain: 'day' };

  const byDay = new Map((daily ?? []).map((d) => [d.day, d]));
  const days = [];
  const seen = new Set();
  for (let t = from.getTime(); t <= to.getTime() + 1000; t += 86400000) {
    const key = dayKey(new Date(t));
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = byDay.get(key);
    days.push({ key, revenue: hit?.revenue ?? 0, orders: hit?.orders ?? 0, units: hit?.units ?? 0 });
  }

  // A year of daily columns is 365 marks nobody can read; roll up to months.
  if (days.length <= 92) return { points: days, grain: 'day' };

  const months = new Map();
  for (const d of days) {
    const key = d.key.slice(0, 7);
    const acc = months.get(key) ?? { key, revenue: 0, orders: 0, units: 0 };
    acc.revenue += d.revenue;
    acc.orders += d.orders;
    acc.units += d.units;
    months.set(key, acc);
  }
  return { points: [...months.values()], grain: 'month' };
}

const dayLabel = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

const monthLabel = (iso) =>
  new Date(`${iso}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

const longDayLabel = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

/** The change between this window and the one before it, when one was asked for. */
function Delta({ current, previous, invert = false, quiet = false }) {
  if (previous === null || previous === undefined || previous === 0) {
    return quiet ? null : <span className="text-micro text-faint">No comparable period</span>;
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const good = invert ? change < 0 : change > 0;
  const flat = Math.abs(change) < 0.05;
  return (
    <span
      className={cn(
        'text-micro tabular-nums',
        flat ? 'text-muted' : good ? 'text-success' : 'text-danger'
      )}
    >
      {flat ? 'No change' : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
      {!quiet && <span className="text-faint"> vs previous</span>}
    </span>
  );
}

/**
 * One cell of the board's figure strip. Hairlines between cells come from the
 * grid's own gap showing the border colour through, so the rules survive any
 * number of columns without a cell having to know where it sits.
 */
function Figure({ label, value, note, delta }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-surface-container-lowest px-space-lg py-space-md">
      <span className="truncate text-meta text-muted" title={note}>
        {label}
      </span>
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-kpi text-primary">{value}</span>
        {delta}
      </span>
      {note && <span className="truncate text-micro text-faint">{note}</span>}
    </div>
  );
}

/**
 * A titled region inside a panel.
 *
 * The rule between regions is the panel grid's 1px gap letting the border
 * colour show through, which is why each region paints its own surface: it
 * survives any number of columns and any wrap without a region having to know
 * where in the grid it landed.
 */
function Region({ title, hint, children, className }) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-space-md bg-surface-container-lowest p-space-lg',
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="text-subheading text-primary">{title}</h3>
        {hint && <p className="text-meta text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Panels are grouped by subject rather than by statistic, so one frame can
 * hold several regions. Columns are weighted, not equal: a waterfall and a
 * six-line statement need more room than two lists of three.
 */
function Panel({ columns = 1, children, className }) {
  const cols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-[1.55fr_1fr]',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  }[columns];
  return (
    <Card className={cn('grid gap-px overflow-hidden bg-border-subtle', cols, className)}>
      {children}
    </Card>
  );
}

export default function AnalyticsAndReports({ onShowToast }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const rangeId = searchParams.get('range') ?? '30d';
  const compare = searchParams.get('compare') === 'previous';
  const productSearch = searchParams.get('product') ?? '';
  const measureId = searchParams.get('measure') ?? 'revenue';

  const setParam = (key, value) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true }
    );

  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[1];
  const measure = MEASURES.find((m) => m.id === measureId) ?? MEASURES[0];

  // Whole days, so the same range always asks the API the same question and
  // the query cache is not churned by the clock ticking.
  const params = useMemo(() => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date(to.getTime() - (range.days - 1) * 24 * 60 * 60 * 1000);
    from.setHours(0, 0, 0, 0);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      compare: compare ? 'previous' : 'none',
    };
  }, [range.days, compare]);

  const { data, isLoading, isError, error, refetch, isFetching } = useAnalyticsQuery(params, {
    placeholderData: (prev) => prev,
  });

  const currency = data?.currency ?? 'inr';
  const totals = data?.totals;
  const previous = data?.previous ?? null;

  const series = useMemo(() => buildSeries(data?.daily, data?.range), [data]);

  const money = (v) => formatMoney(v, currency);
  const moneyTick = (v) => formatMoneyCompact(v, currency);

  const seriesPoints = useMemo(() => {
    const labelFor = series.grain === 'month' ? monthLabel : dayLabel;
    const titleFor = series.grain === 'month' ? monthLabel : longDayLabel;
    return (series.points ?? []).map((p) => ({
      key: p.key,
      label: labelFor(p.key),
      title: titleFor(p.key),
      value: p[measure.id],
      note:
        measure.id === 'revenue'
          ? `${p.orders} ${p.orders === 1 ? 'order' : 'orders'}, ${p.units} units`
          : measure.id === 'orders'
          ? formatMoney(p.revenue, currency)
          : `${p.orders} ${p.orders === 1 ? 'order' : 'orders'}`,
    }));
  }, [series, measure.id, currency]);

  const productRows = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const rows = data?.topProducts ?? [];
    return q ? rows.filter((p) => (p.title ?? '').toLowerCase().includes(q)) : rows;
  }, [data, productSearch]);

  const productPager = useClientTable(productRows);
  const categoryPager = useClientTable(data?.categories ?? []);

  if (isLoading && !data) {
    return <SkeletonPage variant="analytics" stats={0} columns={7} label="Loading analytics" />;
  }

  if (isError) {
    return (
      <PageContainer>
        <PageHeader title="Analytics & reports" breadcrumb="Core / Analytics & Reports" />
        <ErrorState
          title="Analytics could not be loaded"
          message={error?.message}
          onRetry={() => refetch()}
        />
      </PageContainer>
    );
  }

  /**
   * The API returns these groups in whatever order the aggregation produced.
   * A split bar is only readable when its blocks follow the real sequence —
   * the fulfilment pipeline, the payment lifecycle — so the order comes from
   * the maps above rather than from the response, and a state the API did not
   * send simply does not appear.
   */
  const partsInOrder = (rows, map, keyField, { amount = false } = {}) =>
    Object.keys(map)
      .map((key) => [key, rows.find((row) => row[keyField] === key)])
      .filter(([, row]) => row)
      .map(([key, row]) => ({
        key,
        label: map[key].label,
        color: map[key].color,
        value: row.count,
        ...(amount ? { amount: row.amount } : {}),
      }));

  const orderParts = partsInOrder(data?.orderStatus ?? [], FULFILLMENT, 'status');
  const paymentParts = partsInOrder(data?.paymentStatus ?? [], PAYMENT, 'status', { amount: true });
  const methodParts = partsInOrder(data?.paymentMethods ?? [], METHOD, 'method', { amount: true });

  const moneyFlow = [
    { key: 'gross', label: 'Gross', title: 'Gross sales', type: 'total', value: totals?.grossSales ?? 0, color: SERIES[0] },
    { key: 'discounts', label: 'Discounts', title: 'Discounts given', type: 'step', value: -(totals?.discounts ?? 0), color: STATE.critical },
    { key: 'refunds', label: 'Refunds', title: 'Refunds paid out', type: 'step', value: -(totals?.refunds ?? 0), color: STATE.critical },
    { key: 'net', label: 'Net', title: 'Net sales', type: 'total', value: totals?.netSales ?? 0, color: SERIES[0] },
  ];

  const productMax = Math.max(...(data?.topProducts ?? []).map((p) => p.revenue), 0);
  const categoryMax = Math.max(...(data?.categories ?? []).map((c) => c.revenue), 0);

  return (
    <PageContainer>
      <PageHeader
        title="Analytics & reports"
        description={`${data?.region?.name ?? 'The operating region'}'s orders over the selected range, in ${currency.toUpperCase()}.`}
        breadcrumb="Core / Analytics & Reports"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {RANGES.map((r) => (
              <Button
                key={r.id}
                size="sm"
                variant={r.id === range.id ? 'default' : 'outline'}
                onClick={() => setParam('range', r.id)}
              >
                {r.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant={compare ? 'default' : 'outline'}
              onClick={() => setParam('compare', compare ? '' : 'previous')}
              title="Compare with the period immediately before this one"
            >
              Compare
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <Icon name="refresh" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>{isFetching ? 'Refreshing' : 'Refresh'}</span>
            </Button>
          </div>
        }
      />

      {/* The frame is held while a new range loads: no skeleton flash, no jump. */}
      <div className={cn('flex flex-col gap-space-lg transition-opacity', isFetching && 'opacity-60')}>
        {/* The board. One figure leads, its trend sits under it, and the rest
            of the headline numbers are a ruled strip in the same frame. */}
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-space-lg p-space-lg">
            <div className="flex flex-wrap items-start justify-between gap-space-lg">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-meta text-muted">Net sales</span>
                <span className="flex flex-wrap items-baseline gap-x-space-md">
                  <span className="text-figure text-primary">{money(totals?.netSales ?? 0)}</span>
                  {compare && <Delta current={totals?.netSales ?? 0} previous={previous?.netSales} />}
                </span>
                <span className="text-micro text-faint">Gross sales less discounts and refunds</span>
              </div>
              <ChartTabs
                options={MEASURES}
                value={measure.id}
                onChange={(id) => setParam('measure', id === 'revenue' ? '' : id)}
                label="Plot"
              />
            </div>

            {seriesPoints.every((p) => p.value === 0) ? (
              // A flat line pinned to zero is a chart of nothing. The range is
              // filled in to make the axis continuous, so "no points" is not
              // the test for emptiness — "no activity" is.
              <EmptyState
                icon="show_chart"
                title="No orders in this range"
                description={`Nothing was recorded against ${measure.axis.toLowerCase()} over these dates. Pick a wider date range to see the trend.`}
              />
            ) : (
              <TimeSeries
                points={seriesPoints}
                height={248}
                valueLabel={measure.axis}
                formatValue={measure.id === 'revenue' ? money : formatCount}
                formatTick={measure.id === 'revenue' ? moneyTick : formatCount}
              />
            )}
          </div>

          {/* Five figures over two or three columns leaves a hole in the last
              row, and the grid's gap colour shows through it as a stray dark
              rectangle. The final cell takes the slack instead. */}
          <div className="grid grid-cols-2 gap-px border-t border-subtle bg-border-subtle [&>*:last-child]:col-span-2 sm:grid-cols-3 xl:grid-cols-5 xl:[&>*:last-child]:col-span-1">
            <Figure
              label="Gross sales"
              value={money(totals?.grossSales ?? 0)}
              note="Before tax and shipping"
              delta={compare && <Delta current={totals?.grossSales ?? 0} previous={previous?.grossSales} quiet />}
            />
            <Figure
              label="Orders"
              value={formatCount(totals?.orders ?? 0)}
              note={`${totals?.cancelledOrders ?? 0} cancelled, counted apart`}
              delta={compare && <Delta current={totals?.orders ?? 0} previous={previous?.orders} quiet />}
            />
            <Figure
              label="Average order"
              value={totals?.aov === null ? '—' : money(totals?.aov ?? 0)}
              note="Order total divided by orders"
              delta={compare && <Delta current={totals?.aov ?? 0} previous={previous?.aov} quiet />}
            />
            <Figure
              label="Units sold"
              value={formatCount(totals?.units ?? 0)}
              note="Item quantities across orders"
              delta={compare && <Delta current={totals?.units ?? 0} previous={previous?.units} quiet />}
            />
            <Figure
              label="Return rate"
              value={totals?.returnRate === null ? '—' : `${totals?.returnRate}%`}
              note={`${totals?.refundedOrders ?? 0} refunded of ${totals?.orders ?? 0}`}
              delta={compare && <Delta current={totals?.refundedOrders ?? 0} previous={previous?.refundedOrders} invert quiet />}
            />
          </div>
        </Card>

        {/* Money: how gross becomes net, and who paid it. */}
        <Panel columns={2}>
          <Region title="Money flow">
            {/* The chart shows that the deductions are small; the statement
                beside it gives the amounts that have to tie out. Stacked, the
                pair made this column twice the height of the one next to it. */}
            <div className="grid gap-space-lg xl:grid-cols-[1.1fr_1fr] xl:items-center">
            <Waterfall steps={moneyFlow} height={210} formatValue={money} formatTick={moneyTick} />
            <dl className="flex flex-col gap-space-sm border-t border-subtle pt-space-md xl:border-l xl:border-t-0 xl:pl-space-lg xl:pt-0">
              {[
                ['Gross sales', totals?.grossSales],
                ['Discounts', -(totals?.discounts ?? 0)],
                ['Refunds', -(totals?.refunds ?? 0)],
                ['Net sales', totals?.netSales],
                ['Tax collected', totals?.tax, 'Held for the tax authority, not revenue'],
                ['Shipping collected', totals?.shipping, 'Charged to customers for delivery'],
              ].map(([label, amount, hint]) => (
                <div key={label} className="flex items-baseline justify-between gap-space-md">
                  <dt className="truncate text-body text-secondary" title={hint}>
                    {label}
                  </dt>
                  <dd
                    className={cn(
                      'shrink-0 text-num tabular-nums',
                      (amount ?? 0) < 0 ? 'text-danger' : 'text-primary'
                    )}
                  >
                    {money(amount ?? 0)}
                  </dd>
                </div>
              ))}
            </dl>
            </div>
          </Region>

          <div className="grid gap-px bg-border-subtle [&>*]:bg-surface-container-lowest">
            <Region title="Payment status" hint="Including cancelled orders.">
              <SplitBreakdown parts={paymentParts} formatValue={money} emptyMessage="No payments recorded in this range." />
            </Region>
            <Region title="Payment method">
              <SplitBreakdown parts={methodParts} formatValue={money} emptyMessage="No payments recorded in this range." />
            </Region>
          </div>
        </Panel>

        {/* Who bought, and what happened to what they bought. */}
        <Panel columns={3}>
          <Region title="Customers" hint="A customer is first-time when their earliest order falls in this range.">
            <div className="flex flex-col gap-1">
              <span className="text-kpi text-primary">{formatCount(totals?.activeCustomers ?? 0)}</span>
              <span className="text-micro text-faint">ordered in this range</span>
            </div>
            <SplitBreakdown
              parts={[
                { key: 'new', label: 'First-time', color: SERIES[0], value: totals?.newCustomers ?? 0 },
                { key: 'returning', label: 'Returning', color: SERIES[1], value: totals?.returningCustomers ?? 0 },
              ]}
              emptyMessage="No identified customers ordered in this range."
            />
            <dl className="flex flex-col gap-space-sm border-t border-subtle pt-space-md">
              <div className="flex items-baseline justify-between gap-space-md">
                <dt className="text-body text-secondary">Orders each</dt>
                <dd className="text-num tabular-nums text-primary">
                  {totals?.activeCustomers ? (totals.orders / totals.activeCustomers).toFixed(2) : '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-space-md">
                <dt className="text-body text-secondary">Net sales each</dt>
                <dd className="text-num tabular-nums text-primary">
                  {totals?.activeCustomers ? money(Math.round(totals.netSales / totals.activeCustomers)) : '—'}
                </dd>
              </div>
            </dl>
          </Region>

          <Region title="Order status" hint="Fulfilment state of orders placed in this range.">
            <SplitBreakdown parts={orderParts} emptyMessage="No orders were placed in this range." />
          </Region>

          <Region title="Shipments" hint="Parcels created in this range, by carrier state.">
            <RankedBars
              rows={(data?.shipments ?? []).map((s) => ({
                key: s.status,
                label: SHIPMENT_LABEL[s.status] ?? s.status,
                value: s.count,
              }))}
              formatValue={formatCount}
              emptyMessage="No parcels were created in this range."
            />
          </Region>
        </Panel>

        {/* What sold. One reading of the data, not a chart above a table of it. */}
        <SectionCard
          title="Product performance"
          description="Revenue at the price each line actually sold for."
          action={
            <SearchInput
              value={productSearch}
              onChange={(value) => setParam('product', value)}
              onClear={() => setParam('product', '')}
              label="Search products"
              placeholder="Product name"
            />
          }
          contentClassName="p-0"
        >
          <DataTable
            columns={[
              {
                key: 'title',
                header: 'Product',
                // Long garment names wrapped to four lines on a phone and broke
                // the row rhythm; the full name stays available on hover.
                className: 'max-w-[22rem]',
                accessor: (p) => (
                  <span className="block truncate" title={p.title ?? 'Unknown product'}>
                    {p.title ?? 'Unknown product'}
                  </span>
                ),
              },
              {
                key: 'share',
                header: 'Share',
                className: 'w-[30%] min-w-[8rem]',
                accessor: (p) => (
                  <BarCell
                    value={p.revenue}
                    max={productMax}
                    label={`${p.title ?? 'Unknown product'}: ${money(p.revenue)} against ${money(productMax)}, the best-selling line`}
                  />
                ),
              },
              { key: 'units', fit: true, header: 'Units', align: 'right', accessor: (p) => p.units },
              { key: 'orders', fit: true, header: 'Order lines', align: 'right', accessor: (p) => p.orders },
              {
                key: 'revenue',
                fit: true,
                header: 'Revenue',
                align: 'right',
                accessor: (p) => money(p.revenue),
              },
            ]}
            data={productPager.pageRows}
            keyField="productId"
            emptyIcon="inventory_2"
            emptyTitle={productSearch ? 'No products match that search' : 'Nothing sold in this range'}
            emptyMessage={
              productSearch
                ? 'Clear the search to see every product that sold.'
                : 'Widen the date range to see product performance.'
            }
            caption="Products by revenue in the selected range"
          />
          {productRows.length > 0 && (
            <div className="p-space-md pt-0">
              <TablePagination
                currentPage={productPager.page}
                pageSize={productPager.limit}
                totalItems={productPager.total}
                onPageChange={productPager.setPage}
                onPageSizeChange={productPager.setLimit}
              />
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Category performance"
          description="Each sold line counted against every category its product belongs to."
          contentClassName="p-0"
        >
          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Category',
                className: 'max-w-[22rem]',
                accessor: (c) => (
                  <span className="block truncate" title={c.name}>
                    {c.name}
                  </span>
                ),
              },
              {
                key: 'share',
                header: 'Share',
                className: 'w-[30%] min-w-[8rem]',
                accessor: (c) => (
                  <BarCell
                    value={c.revenue}
                    max={categoryMax}
                    label={`${c.name}: ${money(c.revenue)} against ${money(categoryMax)}, the strongest category`}
                  />
                ),
              },
              { key: 'units', fit: true, header: 'Units', align: 'right', accessor: (c) => c.units },
              {
                key: 'revenue',
                fit: true,
                header: 'Revenue',
                align: 'right',
                accessor: (c) => money(c.revenue),
              },
            ]}
            data={categoryPager.pageRows}
            keyField="categoryId"
            emptyIcon="folder_open"
            emptyTitle="No category sales in this range"
            emptyMessage="Products sold in this range are not assigned to a category."
            caption="Categories by revenue in the selected range"
          />
          {(data?.categories ?? []).length > 0 && (
            <div className="p-space-md pt-0">
              <TablePagination
                currentPage={categoryPager.page}
                pageSize={categoryPager.limit}
                totalItems={categoryPager.total}
                onPageChange={categoryPager.setPage}
                onPageSizeChange={categoryPager.setLimit}
              />
            </div>
          )}
        </SectionCard>

        {/* The registers: what the range owes, ordered and gave back. */}
        <Panel columns={2}>
          <Region title="GST and invoices" hint="Tax invoices issued in this range.">
            {(data?.invoices ?? []).length === 0 ? (
              <EmptyState
                icon="receipt_long"
                title="No invoices in this range"
                description="An invoice is raised when an order is paid."
              />
            ) : (
              <div className="scrollbar-thin w-full overflow-x-auto">
                <table className="w-full border-collapse text-left text-body">
                  <caption className="sr-only">GST invoice totals by status</caption>
                  <thead>
                    <tr className="border-b border-subtle">
                      <th className="h-8 pr-3 text-label text-secondary">Status</th>
                      <th className="h-8 px-3 text-right text-label text-secondary">Count</th>
                      <th className="h-8 px-3 text-right text-label text-secondary">Taxable</th>
                      <th className="h-8 px-3 text-right text-label text-secondary">CGST</th>
                      <th className="h-8 px-3 text-right text-label text-secondary">SGST</th>
                      <th className="h-8 px-3 text-right text-label text-secondary">IGST</th>
                      <th className="h-8 pl-3 text-right text-label text-secondary">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((row) => (
                      <tr key={row.status} className="border-b border-subtle last:border-0">
                        <td className="py-2 pr-3">
                          <StatusBadge
                            status={row.status === 'paid' ? 'Paid' : row.status === 'canceled' ? 'Cancelled' : 'Issued'}
                            variant={row.status === 'paid' ? 'success' : row.status === 'canceled' ? 'destructive' : 'info'}
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-secondary">{row.count}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-secondary">{money(row.taxable)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-secondary">{money(row.cgst)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-secondary">{money(row.sgst)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-secondary">{money(row.igst)}</td>
                        <td className="py-2 pl-3 text-right text-num tabular-nums text-primary">
                          {money(row.grandTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Region>

          <div className="grid gap-px bg-border-subtle [&>*]:bg-surface-container-lowest">
            <Region title="Purchase orders" hint="Raised with suppliers in this range, by committed value.">
              <RankedBars
                rows={(data?.purchaseOrders ?? []).map((row) => ({
                  key: row.status,
                  label: PO_LABEL[row.status] ?? row.status,
                  value: row.amount,
                  note: `${row.count} ${row.count === 1 ? 'order' : 'orders'}`,
                }))}
                formatValue={money}
                emptyMessage="No purchase orders in this range — procurement raised nothing with suppliers over these dates."
              />
            </Region>

            <Region title="Why customers returned" hint="Reasons recorded on return requests.">
              <RankedBars
                rows={(data?.returnReasons ?? []).map((r) => ({
                  key: r.reason,
                  label: r.reason,
                  value: r.count,
                }))}
                scale="total"
                formatValue={formatCount}
                emptyMessage="Nothing was returned in this range."
              />
            </Region>
          </div>
        </Panel>

        <SectionCard
          title="Promotion usage"
          description="Redemptions are counted on the code itself, so they span its whole life rather than this range."
          contentClassName="p-0"
        >
          <DataTable
            columns={[
              {
                key: 'code',
                header: 'Code',
                accessor: (p) => <span className="font-mono text-num">{p.code}</span>,
              },
              {
                key: 'state',
                fit: true,
                header: 'State',
                accessor: (p) => (
                  <StatusBadge
                    status={p.active ? 'Live' : 'Paused'}
                    variant={p.active ? 'success' : 'neutral'}
                  />
                ),
              },
              { key: 'used', fit: true, header: 'Redemptions', align: 'right', accessor: (p) => p.usageCount },
              {
                key: 'limit',
                fit: true,
                header: 'Limit',
                align: 'right',
                accessor: (p) => (p.usageLimit === null ? 'No limit' : p.usageLimit),
              },
              {
                key: 'burn',
                fit: true,
                header: 'Against limit',
                accessor: (p) => (
                  <Meter value={p.usageCount} max={p.usageLimit} label={`${p.code} redemptions against its limit`} />
                ),
              },
            ]}
            data={data?.promotions ?? []}
            keyField="code"
            emptyIcon="sell"
            emptyTitle="No promotions yet"
            emptyMessage="Codes created in Promotions & coupons appear here."
            caption="Promotion codes and how often they have been redeemed"
          />
        </SectionCard>
      </div>
    </PageContainer>
  );
}
