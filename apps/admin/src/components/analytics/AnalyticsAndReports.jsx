import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon, Button } from '../ui';
import {
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  SectionCard,
  DataTable,
  TablePagination,
  SearchInput,
  EmptyState,
  ErrorState,
  SkeletonPage,
  StatusBadge,
} from '../shared';
import { useAnalyticsQuery } from '../../hooks/useAdminQueries';
import { useClientTable } from '../../hooks/useClientTable';
import { formatMoney } from '../../lib/format';
import { cn } from '../../lib/utils';

/**
 * Analytics and reports.
 *
 * Every figure comes from GET /admin/analytics, which aggregates the orders,
 * products, customers and operational collections in the database over the
 * chosen range. This screen used to be a thousand lines of channel economics,
 * margin tables and return rates typed directly into the file.
 *
 * Each metric states how it is calculated, because "net sales" means different
 * things in different tools and an operator should not have to guess.
 */

const RANGES = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: '12m', label: 'Last 12 months', days: 365 },
];

const FULFILLMENT_LABEL = {
  unfulfilled: 'Unfulfilled',
  shipped: 'Shipped',
  delivered: 'Delivered',
  returned: 'Returned',
};

const PAYMENT_LABEL = { awaiting: 'Awaiting', paid: 'Paid', refunded: 'Refunded' };

const METHOD_LABEL = { cod: 'Cash on delivery', razorpay: 'Razorpay', stripe: 'Stripe' };

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

const dayLabel = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

/** The change between this window and the one before it, when one was asked for. */
function Delta({ current, previous, invert = false }) {
  if (previous === null || previous === undefined || previous === 0) {
    return <span className="text-micro text-faint">No comparable period</span>;
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const good = invert ? change < 0 : change > 0;
  const flat = Math.abs(change) < 0.05;
  return (
    <span
      className={cn(
        'text-micro font-medium tabular-nums',
        flat ? 'text-muted' : good ? 'text-success' : 'text-danger'
      )}
    >
      {flat ? 'No change' : `${change > 0 ? '+' : ''}${change.toFixed(1)}% vs previous`}
    </span>
  );
}

/** A bar per day, measured against the busiest day in the range. */
function RevenueChart({ days, currency }) {
  const max = Math.max(...days.map((d) => d.revenue), 1);
  if (!days.length) {
    return (
      <EmptyState
        icon="show_chart"
        title="No orders in this range"
        message="Pick a wider date range to see revenue over time."
      />
    );
  }
  return (
    <div className="flex h-56 w-full items-end gap-1" role="img" aria-label="Revenue per day">
      {days.map((d) => (
        <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full flex-1 items-end justify-center">
            <div
              className="w-full rounded-t bg-primary-container transition-[height]"
              style={{ height: `${Math.max(2, (d.revenue / max) * 100)}%` }}
              title={`${dayLabel(d.day)}: ${formatMoney(d.revenue, currency)} from ${d.orders} ${
                d.orders === 1 ? 'order' : 'orders'
              }, ${d.units} ${d.units === 1 ? 'unit' : 'units'}`}
            />
          </div>
          <span className="w-full truncate text-center text-micro text-faint">{dayLabel(d.day)}</span>
        </div>
      ))}
    </div>
  );
}

/** A labelled proportion bar; never decorative, always carries its number. */
function Breakdown({ rows, total, currency }) {
  if (!rows.length) {
    return <p className="text-meta text-muted">Nothing recorded in this range.</p>;
  }
  return (
    <ul className="flex flex-col gap-space-sm">
      {rows.map((row) => {
        const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
        return (
          <li key={row.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-body text-primary">{row.label}</span>
              <span className="shrink-0 text-num tabular-nums text-secondary">
                {row.count}
                {row.amount !== undefined && (
                  <span className="ml-2 text-meta text-muted">{formatMoney(row.amount, currency)}</span>
                )}
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle"
              role="progressbar"
              aria-valuenow={share}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${row.label}: ${share}% of ${total}`}
              title={`${row.label}: ${row.count} of ${total} (${share}%)`}
            >
              <div className="h-full rounded-full bg-primary-container" style={{ width: `${share}%` }} />
            </div>
            <span className="text-micro text-faint tabular-nums">{share}% of {total}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function AnalyticsAndReports({ onShowToast }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const rangeId = searchParams.get('range') ?? '30d';
  const compare = searchParams.get('compare') === 'previous';
  const productSearch = searchParams.get('product') ?? '';

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

  const productRows = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const rows = data?.topProducts ?? [];
    return q ? rows.filter((p) => (p.title ?? '').toLowerCase().includes(q)) : rows;
  }, [data, productSearch]);

  const productPager = useClientTable(productRows);
  const categoryPager = useClientTable(data?.categories ?? []);

  if (isLoading && !data) {
    return <SkeletonPage variant="analytics" stats={6} statsCols={6} columns={7} label="Loading analytics" />;
  }

  if (isError) {
    return (
      <PageContainer>
        <PageHeader kicker="Core" title="Analytics & reports" />
        <ErrorState
          title="Analytics could not be loaded"
          message={error?.message}
          onRetry={() => refetch()}
        />
      </PageContainer>
    );
  }

  const ordersTotal = (data?.orderStatus ?? []).reduce((n, s) => n + s.count, 0);
  const paymentsTotal = (data?.paymentStatus ?? []).reduce((n, s) => n + s.count, 0);
  const methodsTotal = (data?.paymentMethods ?? []).reduce((n, s) => n + s.count, 0);
  const shipmentsTotal = (data?.shipments ?? []).reduce((n, s) => n + s.count, 0);
  const returnsTotal = (data?.returnReasons ?? []).reduce((n, s) => n + s.count, 0);

  return (
    <PageContainer>
      <PageHeader
        kicker="Core"
        title="Analytics & reports"
        description={`Calculated from ${data?.region?.name ?? 'the operating region'}'s orders over the selected range. Amounts in ${currency.toUpperCase()}.`}
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

      <ContentGrid columns={6}>
        <StatsCard
          title="Net sales"
          value={formatMoney(totals?.netSales ?? 0, currency)}
          icon="payments"
          subtext="Gross less discounts and refunds"
          trendLabel={compare ? <Delta current={totals?.netSales ?? 0} previous={previous?.netSales} /> : undefined}
        />
        <StatsCard
          title="Gross sales"
          value={formatMoney(totals?.grossSales ?? 0, currency)}
          icon="trending_up"
          subtext="Item subtotals, before tax and shipping"
          trendLabel={compare ? <Delta current={totals?.grossSales ?? 0} previous={previous?.grossSales} /> : undefined}
        />
        <StatsCard
          title="Orders"
          value={totals?.orders ?? 0}
          icon="shopping_bag"
          subtext={`${totals?.cancelledOrders ?? 0} cancelled, counted separately`}
          trendLabel={compare ? <Delta current={totals?.orders ?? 0} previous={previous?.orders} /> : undefined}
        />
        <StatsCard
          title="Average order value"
          value={totals?.aov === null ? '—' : formatMoney(totals?.aov ?? 0, currency)}
          icon="receipt_long"
          subtext="Order total divided by orders"
          trendLabel={compare ? <Delta current={totals?.aov ?? 0} previous={previous?.aov} /> : undefined}
        />
        <StatsCard
          title="Units sold"
          value={totals?.units ?? 0}
          icon="inventory_2"
          subtext="Item quantities across orders"
          trendLabel={compare ? <Delta current={totals?.units ?? 0} previous={previous?.units} /> : undefined}
        />
        <StatsCard
          title="Return rate"
          value={totals?.returnRate === null ? '—' : `${totals?.returnRate}%`}
          icon="assignment_return"
          iconColor="text-warning"
          subtext={`${totals?.refundedOrders ?? 0} refunded of ${totals?.orders ?? 0}`}
          trendLabel={
            compare ? (
              <Delta current={totals?.refundedOrders ?? 0} previous={previous?.refundedOrders} invert />
            ) : undefined
          }
        />
      </ContentGrid>

      <SectionCard
        title="Revenue over time"
        description={`Order totals per day, ${data?.range?.timezone ?? 'local'} day boundaries.`}
      >
        <RevenueChart days={data?.daily ?? []} currency={currency} />
      </SectionCard>

      <ContentGrid columns={2}>
        <SectionCard title="Where the money went" description="How the range's takings break down.">
          <dl className="flex flex-col gap-space-sm">
            {[
              ['Gross sales', totals?.grossSales, 'Item subtotals before anything is added or taken off'],
              ['Discounts', -(totals?.discounts ?? 0), 'Promotions and coupons applied at checkout'],
              ['Refunds', -(totals?.refunds ?? 0), 'Order totals of orders that ended up refunded'],
              ['Net sales', totals?.netSales, 'Gross sales less discounts and refunds'],
              ['Tax collected', totals?.tax, 'Held on behalf of the tax authority, not revenue'],
              ['Shipping collected', totals?.shipping, 'Charged to customers for delivery'],
            ].map(([label, amount, hint]) => (
              <div key={label} className="flex items-start justify-between gap-space-md">
                <div className="flex min-w-0 flex-col">
                  <dt className="text-body text-primary">{label}</dt>
                  <dd className="text-meta text-muted">{hint}</dd>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-num tabular-nums',
                    (amount ?? 0) < 0 ? 'text-danger' : 'text-primary'
                  )}
                >
                  {formatMoney(amount ?? 0, currency)}
                </span>
              </div>
            ))}
          </dl>
        </SectionCard>

        <SectionCard title="Customers" description="Counted by who placed the orders in this range.">
          <div className="flex flex-col gap-space-md">
            <div className="flex flex-wrap gap-space-lg">
              <div className="flex flex-col">
                <span className="text-meta text-muted">Ordered in range</span>
                <span className="text-kpi-sm tabular-nums text-primary">{totals?.activeCustomers ?? 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-meta text-muted">First-time</span>
                <span className="text-kpi-sm tabular-nums text-primary">{totals?.newCustomers ?? 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-meta text-muted">Returning</span>
                <span className="text-kpi-sm tabular-nums text-primary">
                  {totals?.returningCustomers ?? 0}
                </span>
              </div>
            </div>
            <p className="text-meta text-muted">
              A customer counts as first-time when their earliest order falls inside this range.
              Guest checkouts carry no account and are not counted here.
            </p>
          </div>
        </SectionCard>
      </ContentGrid>

      <ContentGrid columns={3}>
        <SectionCard title="Order status" description="Fulfilment state of orders placed in this range.">
          <Breakdown
            rows={(data?.orderStatus ?? []).map((s) => ({
              key: s.status,
              label: FULFILLMENT_LABEL[s.status] ?? s.status,
              count: s.count,
            }))}
            total={ordersTotal}
            currency={currency}
          />
        </SectionCard>

        <SectionCard title="Payment status" description="Including cancelled orders.">
          <Breakdown
            rows={(data?.paymentStatus ?? []).map((s) => ({
              key: s.status,
              label: PAYMENT_LABEL[s.status] ?? s.status,
              count: s.count,
              amount: s.amount,
            }))}
            total={paymentsTotal}
            currency={currency}
          />
        </SectionCard>

        <SectionCard title="Payment method" description="How customers paid.">
          <Breakdown
            rows={(data?.paymentMethods ?? []).map((s) => ({
              key: s.method,
              label: METHOD_LABEL[s.method] ?? s.method,
              count: s.count,
              amount: s.amount,
            }))}
            total={methodsTotal}
            currency={currency}
          />
        </SectionCard>
      </ContentGrid>

      <SectionCard
        title="Product performance"
        description="Revenue counted at the price each line actually sold for."
        action={
          <SearchInput
            value={productSearch}
            onChange={(value) => setParam('product', value)}
            onClear={() => setParam('product', '')}
            label="Search products"
            placeholder="Product name"
          />
        }
      >
        <DataTable
          columns={[
            {
              key: 'title',
              header: 'Product',
              // Long garment names wrapped to four lines on a phone and broke
              // the row rhythm; the full name stays available on hover.
              className: 'max-w-[14rem]',
              accessor: (p) => (
                <span className="block truncate" title={p.title ?? 'Unknown product'}>
                  {p.title ?? 'Unknown product'}
                </span>
              ),
            },
            { key: 'units', header: 'Units', align: 'right', accessor: (p) => p.units },
            { key: 'orders', header: 'Order lines', align: 'right', accessor: (p) => p.orders },
            {
              key: 'revenue',
              header: 'Revenue',
              align: 'right',
              accessor: (p) => formatMoney(p.revenue, currency),
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
          <TablePagination
            currentPage={productPager.page}
            pageSize={productPager.limit}
            totalItems={productPager.total}
            onPageChange={productPager.setPage}
            onPageSizeChange={productPager.setLimit}
          />
        )}
      </SectionCard>

      <SectionCard
        title="Category performance"
        description="Each sold line counted against every category its product belongs to."
      >
        <DataTable
          columns={[
            {
              key: 'name',
              header: 'Category',
              className: 'max-w-[14rem]',
              accessor: (c) => (
                <span className="block truncate" title={c.name}>
                  {c.name}
                </span>
              ),
            },
            { key: 'units', header: 'Units', align: 'right', accessor: (c) => c.units },
            {
              key: 'revenue',
              header: 'Revenue',
              align: 'right',
              accessor: (c) => formatMoney(c.revenue, currency),
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
          <TablePagination
            currentPage={categoryPager.page}
            pageSize={categoryPager.limit}
            totalItems={categoryPager.total}
            onPageChange={categoryPager.setPage}
            onPageSizeChange={categoryPager.setLimit}
          />
        )}
      </SectionCard>

      <ContentGrid columns={2}>
        <SectionCard title="Why customers returned" description="Reasons recorded on return requests.">
          <Breakdown
            rows={(data?.returnReasons ?? []).map((r) => ({
              key: r.reason,
              label: r.reason,
              count: r.count,
            }))}
            total={returnsTotal}
            currency={currency}
          />
        </SectionCard>

        <SectionCard title="Shipments" description="Parcels created in this range, by carrier state.">
          <Breakdown
            rows={(data?.shipments ?? []).map((s) => ({
              key: s.status,
              label: SHIPMENT_LABEL[s.status] ?? s.status,
              count: s.count,
            }))}
            total={shipmentsTotal}
            currency={currency}
          />
        </SectionCard>
      </ContentGrid>

      <ContentGrid columns={2}>
        <SectionCard title="GST and invoices" description="Tax invoices issued in this range.">
          {(data?.invoices ?? []).length === 0 ? (
            <EmptyState
              icon="receipt_long"
              title="No invoices in this range"
              message="An invoice is raised when an order is paid."
            />
          ) : (
            <div className="scrollbar-thin w-full overflow-x-auto">
              <table className="w-full border-collapse text-left text-body">
                <caption className="sr-only">GST invoice totals by status</caption>
                <thead className="bg-surface-subtle">
                  <tr className="border-b border-subtle">
                    <th className="h-10 px-3 text-caption uppercase text-secondary">Status</th>
                    <th className="h-10 px-3 text-right text-caption uppercase text-secondary">Count</th>
                    <th className="h-10 px-3 text-right text-caption uppercase text-secondary">Taxable</th>
                    <th className="h-10 px-3 text-right text-caption uppercase text-secondary">CGST</th>
                    <th className="h-10 px-3 text-right text-caption uppercase text-secondary">SGST</th>
                    <th className="h-10 px-3 text-right text-caption uppercase text-secondary">IGST</th>
                    <th className="h-10 px-3 text-right text-caption uppercase text-secondary">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((row) => (
                    <tr key={row.status} className="border-b border-subtle">
                      <td className="px-3 py-2">
                        <StatusBadge
                          status={row.status === 'paid' ? 'Paid' : row.status === 'canceled' ? 'Cancelled' : 'Issued'}
                          variant={row.status === 'paid' ? 'success' : row.status === 'canceled' ? 'destructive' : 'info'}
                        />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.taxable, currency)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.cgst, currency)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.sgst, currency)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.igst, currency)}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {formatMoney(row.grandTotal, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Purchase orders" description="Raised with suppliers in this range.">
          {(data?.purchaseOrders ?? []).length === 0 ? (
            <EmptyState
              icon="local_shipping"
              title="No purchase orders in this range"
              message="Procurement raised nothing with suppliers over these dates."
            />
          ) : (
            <ul className="flex flex-col gap-space-sm">
              {data.purchaseOrders.map((row) => (
                <li key={row.status} className="flex items-center justify-between gap-space-md">
                  <span className="text-body text-primary">{PO_LABEL[row.status] ?? row.status}</span>
                  <span className="text-num tabular-nums text-secondary">
                    {row.count}
                    <span className="ml-2 text-meta text-muted">{formatMoney(row.amount, currency)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </ContentGrid>

      <SectionCard
        title="Promotion usage"
        description="Redemptions counted on the promotion itself, so they span its whole life rather than this range."
      >
        <DataTable
          columns={[
            { key: 'code', header: 'Code', accessor: (p) => <span className="font-mono text-num">{p.code}</span> },
            {
              key: 'state',
              header: 'State',
              accessor: (p) => (
                <StatusBadge
                  status={p.active ? 'Live' : 'Paused'}
                  variant={p.active ? 'success' : 'neutral'}
                />
              ),
            },
            { key: 'used', header: 'Redemptions', align: 'right', accessor: (p) => p.usageCount },
            {
              key: 'limit',
              header: 'Limit',
              align: 'right',
              accessor: (p) => (p.usageLimit === null ? 'No limit' : p.usageLimit),
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
    </PageContainer>
  );
}
