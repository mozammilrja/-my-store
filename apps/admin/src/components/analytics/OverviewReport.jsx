import React from 'react';
import {
  EmptyState,
  TimeSeries,
  RankedBars,
  SplitBreakdown,
  Waterfall,
  ChartTabs,
  SERIES,
  STATE,
} from '../shared';
import { formatCount } from '../../lib/format';
import {
  MEASURES,
  FULFILLMENT,
  PAYMENT,
  SHIPMENT_LABEL,
  partsInOrder,
} from './analytics-data';
import {
  Delta,
  KpiCard,
  Panel,
  Region,
  RegionStack,
  ReportPanel,
  StatementRow,
} from './analytics-parts';

/**
 * Overview: how the business is doing, in the order the question is asked.
 *
 * Five figures lead, the trend behind the money sits under them at full width,
 * and the supporting readings are grouped by subject — where the money went,
 * who spent it, and what happened to what they bought. Everything heavier than
 * that (the catalogue, the registers, the codes) lives in its own section, so
 * this view answers the opening question without a scroll through four
 * reports to reach it.
 */
export function OverviewReport({
  data,
  totals,
  previous,
  compare,
  periodLabel,
  measure,
  onMeasureChange,
  seriesPoints,
  sparks,
  money,
  moneyTick,
}) {
  const orderParts = partsInOrder(data?.orderStatus, FULFILLMENT, 'status');
  const paymentParts = partsInOrder(data?.paymentStatus, PAYMENT, 'status', { amount: true });

  const moneyFlow = [
    { key: 'gross', label: 'Gross', title: 'Gross sales', type: 'total', value: totals?.grossSales ?? 0, color: SERIES[0] },
    { key: 'discounts', label: 'Discounts', title: 'Discounts given', type: 'step', value: -(totals?.discounts ?? 0), color: STATE.critical },
    { key: 'refunds', label: 'Refunds', title: 'Refunds paid out', type: 'step', value: -(totals?.refunds ?? 0), color: STATE.critical },
    { key: 'net', label: 'Net', title: 'Net sales', type: 'total', value: totals?.netSales ?? 0, color: SERIES[0] },
  ];

  const delta = (current, prev, invert) =>
    compare ? (
      <Delta current={current ?? 0} previous={prev} invert={invert} periodLabel={periodLabel} />
    ) : null;

  const customers = totals?.activeCustomers ?? 0;

  return (
    <ReportPanel id="overview">
      {/* The five figures the business leads with. Consistent height, one
          definition each, and a trend line only where the daily series
          measures the same thing the tile does. */}
      <div className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:[&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1">
        <KpiCard
          label="Net sales"
          icon="payments"
          value={money(totals?.netSales ?? 0)}
          note="Gross sales less discounts and refunds"
          delta={delta(totals?.netSales, previous?.netSales)}
        />
        <KpiCard
          label="Gross sales"
          icon="toll"
          value={money(totals?.grossSales ?? 0)}
          note="Before tax and shipping"
          delta={delta(totals?.grossSales, previous?.grossSales)}
        />
        <KpiCard
          label="Total orders"
          icon="shopping_bag"
          value={formatCount(totals?.orders ?? 0)}
          note={`${totals?.cancelledOrders ?? 0} cancelled, counted apart`}
          delta={delta(totals?.orders, previous?.orders)}
          spark={sparks.orders}
          sparkLabel="Orders per day over the selected range"
        />
        <KpiCard
          label="Average order value"
          icon="receipt"
          value={totals?.aov === null || totals?.aov === undefined ? '—' : money(totals.aov)}
          note="Order total divided by orders"
          delta={delta(totals?.aov, previous?.aov)}
          spark={sparks.aov}
          sparkLabel="Average order value per day over the selected range"
        />
        <KpiCard
          label="Units sold"
          icon="inventory_2"
          value={formatCount(totals?.units ?? 0)}
          note="Item quantities across orders"
          delta={delta(totals?.units, previous?.units)}
          spark={sparks.units}
          sparkLabel="Units sold per day over the selected range"
        />
      </div>

      {/* The trend owns the fold: one measure at a time, on a plot with room
          to show its shape rather than a strip squeezed beside a figure. */}
      <Panel columns={1}>
        <Region
          title={`${measure.axis} trend`}
          hint="Each point is a day in the selected range. Hover for the day's figures."
          action={
            <ChartTabs
              options={MEASURES}
              value={measure.id}
              onChange={onMeasureChange}
              label="Plot"
            />
          }
        >
          {seriesPoints.every((p) => p.value === 0) ? (
            // A flat line pinned to zero is a chart of nothing. The range is
            // filled in to make the axis continuous, so "no points" is not the
            // test for emptiness — "no activity" is.
            <EmptyState
              icon="auto_graph"
              title="No orders in this range"
              description={`Nothing was recorded against ${measure.axis.toLowerCase()} over these dates. Pick a wider date range to see the trend.`}
            />
          ) : (
            <TimeSeries
              points={seriesPoints}
              height={320}
              valueLabel={measure.axis}
              formatValue={measure.id === 'revenue' ? money : formatCount}
              formatTick={measure.id === 'revenue' ? moneyTick : formatCount}
            />
          )}
        </Region>
      </Panel>

      {/* Money: how gross becomes net, and how it was paid for. */}
      <Panel columns={2}>
        <Region title="Money flow" hint="How gross sales become net sales over this range.">
          {/* The chart shows that the deductions are small; the statement
              beside it gives the amounts that have to tie out. Stacked, the
              pair made this column twice the height of the one next to it. */}
          <div className="grid gap-space-lg xl:grid-cols-2 xl:items-center">
            <Waterfall steps={moneyFlow} height={300} formatValue={money} formatTick={moneyTick} />
            <dl className="flex flex-col gap-space-sm border-t border-subtle pt-space-md xl:border-l xl:border-t-0 xl:pl-space-lg xl:pt-0">
              <StatementRow label="Gross sales" value={money(totals?.grossSales ?? 0)} />
              <StatementRow label="Discounts" value={money(-(totals?.discounts ?? 0))} negative={(totals?.discounts ?? 0) > 0} />
              <StatementRow label="Refunds" value={money(-(totals?.refunds ?? 0))} negative={(totals?.refunds ?? 0) > 0} />
              <StatementRow label="Net sales" value={money(totals?.netSales ?? 0)} />
              <StatementRow
                label="Tax collected"
                hint="Held for the tax authority, not revenue"
                value={money(totals?.tax ?? 0)}
              />
              <StatementRow
                label="Shipping collected"
                hint="Charged to customers for delivery"
                value={money(totals?.shipping ?? 0)}
              />
            </dl>
          </div>
        </Region>

        {/* Two readings stacked against the money flow rather than one short
            region beside a tall one, which left a column of empty frame as
            wide as the statement next to it. */}
        <RegionStack>
          <Region title="Payment status" hint="Every order placed in this range, including cancelled ones.">
            <SplitBreakdown
              parts={paymentParts}
              formatValue={money}
              emptyMessage="No payments were recorded in this range."
            />
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
        </RegionStack>
      </Panel>

      {/* Who bought, and what happened to what they bought. */}
      <Panel columns="even">
        <Region
          title="Customers"
          hint="A customer is first-time when their earliest order falls in this range."
        >
          <div className="flex flex-col gap-space-lg">
            <div className="flex flex-col gap-space-xs">
              <span className="text-kpi text-primary">{formatCount(customers)}</span>
              <span className="text-meta text-faint">ordered in this range</span>
            </div>
            <SplitBreakdown
              parts={[
                { key: 'new', label: 'First-time', color: SERIES[0], value: totals?.newCustomers ?? 0 },
                { key: 'returning', label: 'Returning', color: SERIES[1], value: totals?.returningCustomers ?? 0 },
              ]}
              emptyMessage="No identified customers ordered in this range."
            />
            <dl className="flex flex-col gap-space-sm border-t border-subtle pt-space-md">
              <StatementRow
                label="Orders each"
                value={customers ? (totals.orders / customers).toFixed(2) : '—'}
              />
              <StatementRow
                label="Net sales each"
                value={customers ? money(Math.round(totals.netSales / customers)) : '—'}
              />
            </dl>
          </div>
        </Region>

        <Region title="Order status" hint="Fulfilment state of orders placed in this range.">
          <div className="flex flex-col gap-space-lg">
            <SplitBreakdown parts={orderParts} emptyMessage="No orders were placed in this range." />
            <dl className="flex flex-col gap-space-sm border-t border-subtle pt-space-md">
              <StatementRow
                label="Return rate"
                hint="Refunded orders as a share of orders placed"
                value={totals?.returnRate === null || totals?.returnRate === undefined ? '—' : `${totals.returnRate}%`}
              />
              <StatementRow
                label="Refunded orders"
                value={`${formatCount(totals?.refundedOrders ?? 0)} of ${formatCount(totals?.orders ?? 0)}`}
              />
            </dl>
          </div>
        </Region>

      </Panel>
    </ReportPanel>
  );
}

export default OverviewReport;
