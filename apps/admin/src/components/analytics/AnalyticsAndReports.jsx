import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer, PageHeader, ErrorState, SkeletonPage } from '../shared';
import { useAnalyticsQuery } from '../../hooks/useAdminQueries';
import { formatMoney, formatMoneyCompact } from '../../lib/format';
import { cn } from '../../lib/utils';
import {
  RANGES,
  CUSTOM_RANGE,
  MEASURES,
  VIEWS,
  buildSeries,
  dayLabel,
  monthLabel,
  longDayLabel,
  toDateInput,
} from './analytics-data';
import { RangeControls, ReportTabs } from './analytics-parts';
import { OverviewReport } from './OverviewReport';
import { CatalogReport } from './CatalogReport';
import { FinanceReport } from './FinanceReport';
import { MarketingReport } from './MarketingReport';

/**
 * Analytics and reports.
 *
 * Every figure comes from GET /admin/analytics, which aggregates the orders,
 * products, customers and operational collections in the database over the
 * chosen range. Nothing on these screens is estimated, and where the records
 * cannot support a figure it is a dash rather than a zero dressed up as one.
 *
 * How the screen is composed, and why:
 *
 * This was one page of fourteen panels of equal weight, scrolled past in a
 * single column: the headline figures, the trend, the tax ledger and the
 * coupon list all presented as equally urgent. Nothing on it was more
 * important than anything else, so the eye had nowhere to land and the
 * registers at the bottom were never reached.
 *
 * It is now four reports behind one toolbar. Overview answers "how is the
 * business doing" on its own — five figures, the trend behind them, and the
 * supporting readings grouped by subject. The catalogue, the registers and
 * the codes each get a section with room to be read properly rather than a
 * compressed strip at the end of a long scroll.
 *
 * The window is owned by this shell, not by a section, so changing the dates
 * and changing the subject are independent: the range survives every switch,
 * one query feeds every section, and a section cannot disagree with its
 * neighbour about which days it is reporting.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days, so the same range always asks the API the same question. */
function windowFor(rangeId, customFrom, customTo) {
  if (rangeId === CUSTOM_RANGE.id && customFrom && customTo) {
    const from = new Date(`${customFrom}T00:00:00`);
    const to = new Date(`${customTo}T23:59:59.999`);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
      return { from, to };
    }
  }
  const preset = RANGES.find((r) => r.id === rangeId) ?? RANGES[1];
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to.getTime() - (preset.days - 1) * DAY_MS);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export default function AnalyticsAndReports() {
  const [searchParams, setSearchParams] = useSearchParams();

  const viewId = searchParams.get('view') ?? 'overview';
  const view = VIEWS.find((v) => v.id === viewId) ?? VIEWS[0];
  const rangeParam = searchParams.get('range') ?? '30d';
  const customFrom = searchParams.get('from') ?? '';
  const customTo = searchParams.get('to') ?? '';
  const isCustom = rangeParam === CUSTOM_RANGE.id && Boolean(customFrom && customTo);
  const rangeId = isCustom ? CUSTOM_RANGE.id : rangeParam;
  const compare = searchParams.get('compare') === 'previous';
  const productSearch = searchParams.get('product') ?? '';
  const measure = MEASURES.find((m) => m.id === searchParams.get('measure')) ?? MEASURES[0];

  const setParams = (changes) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
          if (!value) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true }
    );

  const preset = RANGES.find((r) => r.id === rangeId);

  const params = useMemo(() => {
    const { from, to } = windowFor(rangeId, customFrom, customTo);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      compare: compare ? 'previous' : 'none',
    };
  }, [rangeId, customFrom, customTo, compare]);

  const { data, isLoading, isError, error, refetch, isFetching } = useAnalyticsQuery(params, {
    // The frame is held while a new range loads: no skeleton flash, no jump.
    placeholderData: (prev) => prev,
  });

  const currency = data?.currency ?? 'inr';
  const totals = data?.totals;
  const previous = data?.previous ?? null;

  const money = useMemo(() => (v) => formatMoney(v, currency), [currency]);
  const moneyTick = useMemo(() => (v) => formatMoneyCompact(v, currency), [currency]);

  const series = useMemo(() => buildSeries(data?.daily, data?.range), [data]);

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

  /**
   * The tile sparklines. Only the measures the daily series actually carries
   * get one: orders, units, and the order value those two imply. Net and
   * gross sales have no daily equivalent in this response, so their tiles go
   * without a line rather than borrow the order-value series and imply a
   * trend in a figure it does not describe.
   */
  const sparks = useMemo(() => {
    const points = series.points ?? [];
    return {
      orders: points.map((p) => ({ key: p.key, value: p.orders })),
      units: points.map((p) => ({ key: p.key, value: p.units })),
      aov: points.map((p) => ({ key: p.key, value: p.orders > 0 ? p.revenue / p.orders : 0 })),
    };
  }, [series]);

  const periodLabel = isCustom
    ? 'period'
    : (preset ?? RANGES[1]).short;

  const rangeCaption = data?.range
    ? `${longDayLabel(toDateInput(data.range.from))} to ${longDayLabel(toDateInput(data.range.to))}`
    : null;

  if (isLoading && !data) {
    return <SkeletonPage variant="analytics" stats={5} statsCols={5} columns={7} label="Loading analytics" />;
  }

  const header = (
    <PageHeader
      kicker="Core"
      title="Analytics & reports"
      description="Revenue, customers and order performance over time."
      size="lg"
      actions={
        <RangeControls
          rangeId={rangeId}
          onRangeChange={(id) => setParams({ range: id, from: '', to: '' })}
          customFrom={customFrom}
          customTo={customTo}
          onCustomRange={(from, to) => setParams({ range: CUSTOM_RANGE.id, from, to })}
          compare={compare}
          onToggleCompare={() => setParams({ compare: compare ? '' : 'previous' })}
          onRefresh={() => refetch()}
          isFetching={isFetching}
        />
      }
    />
  );

  if (isError) {
    return (
      <PageContainer>
        {header}
        <ErrorState
          variant="page"
          title="Analytics could not be loaded"
          error={error}
          onRetry={() => refetch()}
        />
      </PageContainer>
    );
  }

  const shared = { data, totals, money, moneyTick };

  return (
    <PageContainer className="gap-space-xl">
      {header}

      <ReportTabs
        view={view.id}
        onViewChange={(id) => setParams({ view: id === 'overview' ? '' : id })}
        caption={
          rangeCaption &&
          `${data?.region?.name ?? 'Operating region'} \u00b7 ${currency.toUpperCase()} \u00b7 ${rangeCaption}`
        }
      />

      <div className={cn('flex min-w-0 flex-col transition-opacity', isFetching && 'opacity-60')}>
        {view.id === 'overview' && (
          <OverviewReport
            {...shared}
            previous={previous}
            compare={compare}
            periodLabel={periodLabel}
            measure={measure}
            onMeasureChange={(id) => setParams({ measure: id === 'revenue' ? '' : id })}
            seriesPoints={seriesPoints}
            sparks={sparks}
          />
        )}

        {view.id === 'catalog' && (
          <CatalogReport
            {...shared}
            productSearch={productSearch}
            onProductSearch={(value) => setParams({ product: value })}
          />
        )}

        {view.id === 'finance' && <FinanceReport {...shared} />}

        {view.id === 'marketing' && <MarketingReport {...shared} />}
      </div>
    </PageContainer>
  );
}
