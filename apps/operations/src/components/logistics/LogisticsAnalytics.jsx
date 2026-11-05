import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Icon,
  Input,
  PageContainer,
  PageHeader,
  ErrorState,
  SkeletonPage,
  TimeSeries,
  RankedBars,
  ChartTabs,
  BarCell,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui';
import { api } from '../../lib/api';
import { formatCount, formatMoney } from '../../lib/format';
import { cn } from '../../lib/utils';
import { KpiCard, Panel, Region, SummaryStat, SummaryStrip } from '../analytics/analytics-parts';
import { dayLabel, longDayLabel, toDateInput } from '../analytics/analytics-data';
import {
  DASH,
  DEFINITIONS,
  LOGISTICS_RANGES,
  PROVIDER_LABEL,
  RETURN_REASON_LABEL,
  RETURN_STATUS_LABEL,
  days,
  fillDays,
  hours,
  rate,
} from './logistics-format';

/*
 * Logistics analytics, from GET /admin/analytics/logistics: couriers and our
 * own fleet, where parcels go and why deliveries fail, how fast each
 * warehouse dispatches, the riders and the cash they hold, and returns.
 *
 * Every figure is computed from the operational records. Where a figure has
 * nothing to stand on (a rate over no closed parcels, an on-time share with no
 * promised date) it prints as a dash with the reason beside it, never as 0, and
 * what the records can't tell at all is listed at the foot of the page.
 */

const DAY_MS = 86_400_000;

function windowFor(rangeId, customFrom, customTo) {
  if (rangeId === 'custom' && customFrom && customTo) {
    const from = new Date(`${customFrom}T00:00:00`);
    const to = new Date(`${customTo}T23:59:59.999`);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) return { from, to };
  }
  const preset = LOGISTICS_RANGES.find((r) => r.id === rangeId) ?? LOGISTICS_RANGES[1];
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to.getTime() - preset.days * DAY_MS + 1);
  return { from, to };
}

const MEASURES = [
  { id: 'booked', label: 'Booked', axis: 'Parcels booked' },
  { id: 'delivered', label: 'Delivered', axis: 'Parcels delivered' },
  { id: 'returnedToOrigin', label: 'Returned', axis: 'Booked that day and returned to origin' },
];

/** A figure, or a dash with the reason it has none. */
function Figure({ value, format, reason }) {
  const text = format(value);
  if (text !== DASH) return <span className="tabular-nums">{text}</span>;
  return (
    <span className="text-muted" title={reason}>
      {DASH}
      <span className="sr-only"> ({reason})</span>
    </span>
  );
}

function RangeBar({ rangeId, onRange, customFrom, customTo, onCustom, onRefresh, isFetching }) {
  const [from, setFrom] = useState(customFrom || toDateInput(Date.now() - 30 * DAY_MS));
  const [to, setTo] = useState(customTo || toDateInput(Date.now()));
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-space-sm">
      <div role="group" aria-label="Date range" className="flex items-center gap-0.5 rounded-lg border border-subtle bg-surface-subtle p-1">
        {[...LOGISTICS_RANGES, { id: 'custom', label: 'Custom range', short: 'Custom' }].map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={r.id === rangeId}
            aria-label={r.label}
            onClick={() => onRange(r.id)}
            className={cn(
              'h-7 whitespace-nowrap rounded-md px-2.5 text-label transition-colors',
              r.id === rangeId ? 'bg-surface-container-lowest font-semibold text-accent shadow-xs' : 'text-muted hover:text-primary'
            )}
          >
            {r.short}
          </button>
        ))}
      </div>
      {rangeId === 'custom' && (
        <form
          className="flex flex-wrap items-center gap-space-xs"
          onSubmit={(e) => {
            e.preventDefault();
            onCustom(from, to);
          }}
        >
          <Input type="date" aria-label="Range start" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-8 w-40" />
          <span className="text-meta text-muted">to</span>
          <Input type="date" aria-label="Range end" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-8 w-40" />
          <Button type="submit" size="sm" variant="outline">
            Apply
          </Button>
        </form>
      )}
      <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isFetching}>
        <Icon name="refresh" aria-hidden="true" size={14} className={cn(isFetching && 'animate-spin')} />
        <span>{isFetching ? 'Refreshing' : 'Refresh'}</span>
      </Button>
    </div>
  );
}

/**
 * A wide table scrolls inside its region; the scroll area is focusable and
 * named so a keyboard can reach and scroll it.
 */
function ScrollTable({ label, children }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className="scrollbar-thin -mx-space-xs overflow-x-auto px-space-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]">
      {children}
    </div>
  );
}

const Num = ({ children, className }) => <TableCell className={cn('text-right tabular-nums', className)}>{children}</TableCell>;
const NumHead = ({ children, title }) => (
  <TableHead className="text-right" title={title}>
    {children}
  </TableHead>
);

function CarriersTable({ carriers }) {
  if (!carriers.length) return <p className="text-meta text-muted">No parcels were booked in this range.</p>;
  const max = Math.max(...carriers.map((c) => c.booked), 1);
  return (
    <ScrollTable label="Carriers table">
      <Table aria-label="Carriers" containerClassName="overflow-visible">
      <TableHeader>
        <TableRow>
          <TableHead>Carrier</TableHead>
          <NumHead>Booked</NumHead>
          <TableHead className="w-32">
            <span className="sr-only">Share of parcels</span>
          </TableHead>
          <NumHead>Delivered</NumHead>
          <NumHead>Returned</NumHead>
          <NumHead>Moving</NumHead>
          <NumHead title="Delivered ÷ (delivered + returned to origin)">Delivered rate</NumHead>
          <NumHead title="Delivered with no failed attempt">First attempt</NumHead>
          <NumHead title="Delivered by the promised day; promised parcels only">On time</NumHead>
          <NumHead title="First courier movement to delivery">Median transit</NumHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {carriers.map((c) => (
          <TableRow key={`${c.provider}:${c.carrier}`}>
            <TableCell>
              <span className="block text-body text-primary">{c.carrier}</span>
              <span className="block text-meta text-muted">{PROVIDER_LABEL[c.provider] ?? c.provider}</span>
            </TableCell>
            <Num>{formatCount(c.booked)}</Num>
            <TableCell>
              <BarCell value={c.booked} max={max} label={`${c.carrier}: ${c.booked} parcels`} />
            </TableCell>
            <Num>{formatCount(c.delivered)}</Num>
            <Num>{formatCount(c.returnedToOrigin)}</Num>
            <Num>{formatCount(c.inFlight)}</Num>
            <Num>
              <Figure value={c.deliveredRate} format={rate} reason="no closed parcels yet" />
            </Num>
            <Num>
              <Figure value={c.firstAttemptRate} format={rate} reason="nothing delivered yet" />
            </Num>
            <Num>
              <Figure value={c.onTimeRate} format={rate} reason="no promised delivery dates" />
              {c.onTime.promised > 0 && <span className="block text-meta text-muted">{`${c.onTime.met} of ${c.onTime.promised} promised`}</span>}
            </Num>
            <Num>
              <Figure value={c.medianTransitDays} format={days} reason="no delivered parcel with a courier movement scan" />
            </Num>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </ScrollTable>
  );
}

function DestinationsTable({ rows }) {
  if (!rows.length) return <p className="text-meta text-muted">No destinations in this range.</p>;
  return (
    <ScrollTable label="Destinations table">
      <Table aria-label="Destinations" containerClassName="overflow-visible">
      <TableHeader>
        <TableRow>
          <TableHead title="The first three digits of a PIN code are its sorting district">PIN district</TableHead>
          <NumHead>Booked</NumHead>
          <NumHead>Delivered</NumHead>
          <NumHead>Returned</NumHead>
          <NumHead title="Returned to origin ÷ closed parcels">RTO rate</NumHead>
          <NumHead>Median transit</NumHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((d) => (
          <TableRow key={d.zone}>
            <TableCell>
              <span className="font-mono text-body text-primary">{d.zone}xxx</span>
              {d.city && <span className="ml-2 text-meta text-muted">{d.city}</span>}
            </TableCell>
            <Num>{formatCount(d.booked)}</Num>
            <Num>{formatCount(d.delivered)}</Num>
            <Num>{formatCount(d.returnedToOrigin)}</Num>
            <Num>
              <Figure value={d.rtoRate} format={rate} reason="no closed parcels yet" />
            </Num>
            <Num>
              <Figure value={d.medianTransitDays} format={days} reason="nothing delivered yet" />
            </Num>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </ScrollTable>
  );
}

function WarehousesTable({ rows }) {
  if (!rows.length) return <p className="text-meta text-muted">No warehouse orders in this range.</p>;
  return (
    <ScrollTable label="Warehouses table">
      <Table aria-label="Warehouses" containerClassName="overflow-visible">
      <TableHeader>
        <TableRow>
          <TableHead>Location</TableHead>
          <NumHead>Orders</NumHead>
          <NumHead>Dispatched</NumHead>
          <NumHead title="Accepted and not yet handed over">Open now</NumHead>
          <NumHead>Rejected</NumHead>
          <NumHead>Cancelled</NumHead>
          <NumHead title="Created to packed">Median to pack</NumHead>
          <NumHead title="Created to handed to the courier or a rider">Median to dispatch</NumHead>
          <NumHead>Within 24 h</NumHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((w) => (
          <TableRow key={w.warehouseId}>
            <TableCell>
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-body text-primary">{w.code}</span>
                {w.seller && <Badge variant="secondary">Seller location</Badge>}
              </span>
              {w.name && <span className="block text-meta text-muted">{w.name}</span>}
            </TableCell>
            <Num>{formatCount(w.orders)}</Num>
            <Num>{formatCount(w.dispatched)}</Num>
            <Num>{formatCount(w.open)}</Num>
            <Num>{formatCount(w.rejected)}</Num>
            <Num>{formatCount(w.cancelled)}</Num>
            <Num>
              <Figure value={w.medianHoursToPack} format={hours} reason="nothing packed yet" />
            </Num>
            <Num>
              <Figure value={w.medianHoursToDispatch} format={hours} reason="nothing dispatched yet" />
            </Num>
            <Num>
              <Figure value={w.dispatchedWithin24h} format={rate} reason="nothing dispatched yet" />
            </Num>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </ScrollTable>
  );
}

function RidersTable({ riders, money }) {
  if (!riders.length) return <p className="text-meta text-muted">No rider deliveries in this range.</p>;
  return (
    <ScrollTable label="Riders table">
      <Table aria-label="Riders" containerClassName="overflow-visible">
      <TableHeader>
        <TableRow>
          <TableHead>Rider</TableHead>
          <NumHead>Tasks</NumHead>
          <NumHead>Delivered</NumHead>
          <NumHead>Returned</NumHead>
          <NumHead>Failed attempts</NumHead>
          <NumHead>Delivered rate</NumHead>
          <NumHead>First attempt</NumHead>
          <NumHead title="Cash collected on these tasks">Cash collected</NumHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {riders.map((r) => (
          <TableRow key={r.riderId}>
            <TableCell className="text-body text-primary">{r.name}</TableCell>
            <Num>{formatCount(r.tasks)}</Num>
            <Num>{formatCount(r.delivered)}</Num>
            <Num>{formatCount(r.returnedToOrigin)}</Num>
            <Num>{formatCount(r.failedAttempts)}</Num>
            <Num>
              <Figure value={r.deliveredRate} format={rate} reason="no closed deliveries yet" />
            </Num>
            <Num>
              <Figure value={r.firstAttemptRate} format={rate} reason="nothing delivered yet" />
            </Num>
            <Num>{money(r.codCollected)}</Num>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </ScrollTable>
  );
}

export function LogisticsAnalytics() {
  const [rangeId, setRangeId] = useState('30d');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [measure, setMeasure] = useState('booked');

  const params = useMemo(() => {
    const { from, to } = windowFor(rangeId, custom.from, custom.to);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [rangeId, custom]);

  const q = useQuery({
    queryKey: ['admin', 'analytics', 'logistics', params],
    queryFn: () => api('/admin/analytics/logistics', { query: params }),
    placeholderData: (prev) => prev,
  });
  const data = q.data;
  const money = (v) => formatMoney(v ?? 0, 'inr');

  const points = useMemo(() => {
    if (!data) return [];
    const m = MEASURES.find((x) => x.id === measure);
    return fillDays(data.daily, data.from, data.to).map((d) => ({
      key: d.day,
      label: dayLabel(d.day),
      title: longDayLabel(d.day),
      value: d[m.id],
    }));
  }, [data, measure]);

  if (q.isLoading && !data) return <SkeletonPage variant="analytics" stats={5} statsCols={5} columns={7} label="Loading logistics analytics" />;

  const header = (
    <PageHeader
      kicker="Logistics"
      title="Logistics analytics"
      description="Couriers, our fleet, warehouses, cash and returns, from the parcels' own records."
      size="lg"
      actions={
        <RangeBar
          rangeId={rangeId}
          onRange={(id) => setRangeId(id)}
          customFrom={custom.from}
          customTo={custom.to}
          onCustom={(from, to) => setCustom({ from, to })}
          onRefresh={() => q.refetch()}
          isFetching={q.isFetching}
        />
      }
    />
  );

  if (q.isError && !data) {
    return (
      <PageContainer>
        {header}
        <ErrorState variant="page" error={q.error} title="Logistics analytics could not be loaded" onRetry={() => q.refetch()} />
      </PageContainer>
    );
  }

  const t = data.totals;
  const fleet = data.fleet;
  const returns = data.returns;
  const measureDef = MEASURES.find((x) => x.id === measure);
  const statuses = Object.entries(returns.byStatus ?? {});

  return (
    <PageContainer>
      {header}
      {q.isError && <ErrorState error={q.error} title="The latest figures could not be loaded; showing the previous ones" onRetry={() => q.refetch()} />}

      <div className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:[&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1">
        <KpiCard
          label="Parcels booked"
          icon="local_shipping"
          value={formatCount(t.booked)}
          note={`${formatCount(t.inFlight)} still moving · ${formatCount(t.cancelled)} cancelled (not counted)`}
        />
        <KpiCard
          label="Delivered rate"
          icon="task_alt"
          value={<Figure value={t.deliveredRate} format={rate} reason="no closed parcels in this range" />}
          note={`${formatCount(t.delivered)} delivered, ${formatCount(t.returnedToOrigin)} returned to origin`}
        />
        <KpiCard
          label="First attempt"
          icon="bolt"
          value={<Figure value={t.firstAttemptRate} format={rate} reason="nothing delivered in this range" />}
          note={`${formatCount(t.withFailedAttempt)} parcels had a failed attempt`}
        />
        <KpiCard
          label="On time"
          icon="schedule"
          value={<Figure value={t.onTimeRate} format={rate} reason="no delivered parcel had a promised date" />}
          note={t.onTime.promised ? `${t.onTime.met} of ${t.onTime.promised} with a promised date` : 'No delivered parcel had a promised date'}
        />
        <KpiCard
          label="Median transit"
          icon="timer"
          value={<Figure value={t.medianTransitDays} format={days} reason="no delivered parcel with a courier movement scan" />}
          note="First courier movement to delivery"
        />
      </div>

      <Panel>
        <Region
          title="Parcels by day"
          hint={measureDef.axis}
          action={<ChartTabs options={MEASURES} value={measure} onChange={setMeasure} label="Daily measure" />}
        >
          <TimeSeries points={points} valueLabel={measureDef.label} formatValue={(v) => formatCount(v)} formatTick={(v) => formatCount(v)} />
        </Region>
      </Panel>

      <Panel>
        <Region title="Carriers" hint="Courier integrations, hand-recorded parcels and our own fleet, for parcels booked in this range.">
          <CarriersTable carriers={data.carriers} />
        </Region>
      </Panel>

      <Panel columns={2}>
        <Region title="Destinations" hint="The fifteen busiest PIN districts.">
          <DestinationsTable rows={data.destinations} />
        </Region>
        <Region title="Why deliveries failed" hint="Courier NDR wording and riders' recorded reasons.">
          <RankedBars
            rows={data.failureReasons.map((r) => ({ key: r.reason, label: r.reason, value: r.count }))}
            formatValue={(v) => formatCount(v)}
            emptyMessage="No failed delivery attempts in this range."
          />
        </Region>
      </Panel>

      <Panel>
        <Region title="Warehouses" hint="Orders allocated in this range, by the location that packs them.">
          <WarehousesTable rows={data.warehouses} />
        </Region>
      </Panel>

      <SummaryStrip className="lg:grid-cols-5">
        <SummaryStat label="Fleet tasks" value={formatCount(fleet.tasks)} note={`${formatCount(fleet.unassigned)} waiting for a rider`} />
        <SummaryStat
          label="Fleet delivered rate"
          value={<Figure value={fleet.deliveredRate} format={rate} reason="no closed deliveries in this range" />}
          note={`${formatCount(fleet.delivered)} delivered, ${formatCount(fleet.returnedToOrigin)} returned`}
        />
        <SummaryStat label="Cash on hand now" value={money(fleet.cash.onHand)} note="Collected by riders, not yet handed in" />
        <SummaryStat label="Handed in this range" value={money(fleet.cash.counted)} note={`${formatCount(fleet.cash.remittances)} remittances, ${money(fleet.cash.expected)} expected`} />
        <SummaryStat
          label="Remittance mismatches"
          value={formatCount(fleet.cash.mismatches)}
          note={`${formatCount(fleet.cash.awaitingCount)} still to be counted`}
        />
      </SummaryStrip>

      <Panel columns={2}>
        <Region title="Riders" hint="Delivery tasks created in this range.">
          <RidersTable riders={fleet.riders} money={money} />
        </Region>
        <Region title="Cash on hand by rider" hint="As of now, across all dates.">
          <RankedBars
            rows={fleet.cash.onHandByRider.map((r) => ({ key: r.riderId, label: r.name, value: r.amount, note: `${r.parcels} ${r.parcels === 1 ? 'parcel' : 'parcels'}` }))}
            formatValue={money}
            emptyMessage="No rider is holding cash."
          />
        </Region>
      </Panel>

      <Panel columns={2}>
        <Region title="Returns" hint="Returns and exchanges requested in this range.">
          <dl className="grid grid-cols-2 gap-space-md sm:grid-cols-4">
            {[
              ['Requested', formatCount(returns.requested)],
              ['Exchanges', formatCount(returns.exchanges)],
              ['Units', formatCount(returns.units)],
              ['Median days to refund', <Figure key="refund" value={returns.medianDaysToRefund} format={days} reason="no refunds in this range" />],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="text-label text-muted">{label}</dt>
                <dd className="text-kpi-sm tabular-nums text-primary">{value}</dd>
              </div>
            ))}
          </dl>
          {statuses.length > 0 && (
            <ul className="flex flex-wrap gap-space-xs" aria-label="Returns by status">
              {statuses.map(([status, count]) => (
                <li key={status}>
                  <Badge variant="secondary">{`${RETURN_STATUS_LABEL[status] ?? status}: ${count}`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Region>
        <Region title="Return reasons" hint="Units returned, by the reason the customer gave.">
          <RankedBars
            rows={returns.byReason.map((r) => ({ key: r.reason, label: RETURN_REASON_LABEL[r.reason] ?? r.reason, value: r.units }))}
            formatValue={(v) => `${formatCount(v)} ${v === 1 ? 'unit' : 'units'}`}
            scale="total"
            emptyMessage="No returns in this range."
          />
        </Region>
      </Panel>

      <Panel columns="even">
        <Region title="How these figures are worked out">
          <dl className="flex flex-col gap-space-sm">
            {DEFINITIONS.map(([term, text]) => (
              <div key={term}>
                <dt className="text-label text-primary">{term}</dt>
                <dd className="text-meta text-muted">{text}</dd>
              </div>
            ))}
          </dl>
        </Region>
        <Region title="What the records can't show" hint="Shown here rather than estimated.">
          <ul className="flex list-disc flex-col gap-space-xs pl-5 text-meta text-secondary">
            {data.unavailable.map((u) => (
              <li key={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</li>
            ))}
          </ul>
        </Region>
      </Panel>
    </PageContainer>
  );
}
