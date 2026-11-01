import React, { useEffect, useRef, useState } from 'react';
import { Icon, Button, Card, Badge, Input } from '../ui';
import { Sparkline } from '../shared';
import { cn } from '../../lib/utils';
import { RANGES, CUSTOM_RANGE, VIEWS, toDateInput } from './analytics-data';

/**
 * The pieces every report section is built from.
 *
 * Three rules hold the screen together:
 *
 *  - A figure the business leads with is a tile of its own; everything else is
 *    a region inside a panel grouped by the question it answers. A panel means
 *    a subject, not a single statistic.
 *  - Rules between regions are the panel grid's own 1px gap letting the border
 *    colour through, so a region never has to know where in the grid it landed.
 *  - Nothing claims a trend the records cannot support. A delta appears only
 *    when a comparison period was asked for and the previous window had
 *    something in it; a sparkline is drawn only where the daily series
 *    measures exactly what the tile above it measures.
 */

/** The change between this window and the one before it, when one was asked for. */
export function Delta({ current, previous, invert = false, periodLabel }) {
  if (previous === null || previous === undefined || previous === 0) {
    return <span className="text-meta text-faint">No comparable period</span>;
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const flat = Math.abs(change) < 0.05;
  const good = invert ? change < 0 : change > 0;
  const variant = flat ? 'secondary' : good ? 'success' : 'destructive';

  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <Badge variant={variant} size="sm" className="shrink-0 gap-1">
        {!flat && (
          <Icon
            name={change > 0 ? 'trending_up' : 'trending_down'}
            aria-hidden="true"
            size={14}
          />
        )}
        <span className="tabular-nums">
          {flat ? 'No change' : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
        </span>
      </Badge>
      {periodLabel && (
        <span className="truncate text-meta text-muted">vs previous {periodLabel}</span>
      )}
    </span>
  );
}

/**
 * KpiCard
 * One headline figure: what it is, what it reads, how it moved, and the
 * sentence that says how it was worked out — because "net sales" means
 * different things in different tools.
 *
 * The trend line at the foot is drawn only for the measures the daily series
 * actually carries. A line under a figure it does not describe is a decoration
 * that reads as evidence, so the money tiles go without one rather than borrow
 * a neighbouring series.
 */
export function KpiCard({ label, value, note, icon, delta, spark, sparkLabel }) {
  return (
    <Card className="flex min-w-0 flex-col justify-between gap-space-lg p-space-lg">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-start justify-between gap-space-sm">
          {/* Two lines are always reserved for the name. A five-across row on
              a 1280px screen is narrower than "Average order value", and a
              label that wraps on one tile would drop that tile's figure out
              of line with the other four. */}
          <span className="line-clamp-2 min-h-[2rem] min-w-0 text-label text-muted" title={label}>
            {label}
          </span>
          {icon && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-subtle bg-surface-subtle text-faint">
              <Icon name={icon} aria-hidden="true" size={16} />
            </span>
          )}
        </div>

        <span className="block text-display text-primary">{value}</span>

        {delta && <div className="flex min-w-0 flex-wrap items-center gap-2">{delta}</div>}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        {spark && spark.length > 1 && (
          <Sparkline points={spark} height={34} label={sparkLabel} />
        )}
        {note && <span className="block text-meta leading-snug text-muted">{note}</span>}
      </div>
    </Card>
  );
}

/**
 * Region
 * A titled area inside a panel. Each paints its own surface so the 1px grid
 * gap between regions reads as a hairline rule at any column count.
 */
export function Region({ title, hint, action, children, className }) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-space-lg bg-surface-container-lowest p-space-lg',
        className
      )}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-space-sm">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-heading text-primary">{title}</h3>
          {hint && <p className="text-meta text-muted">{hint}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * Panel
 * Columns are weighted, not equal: a waterfall and a six-line statement need
 * more room than two lists of three.
 */
export function Panel({ columns = 1, children, className }) {
  const cols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 xl:grid-cols-[1.5fr_1fr]',
    even: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  }[columns];
  return (
    <Card className={cn('grid gap-px overflow-hidden bg-border-subtle', cols, className)}>
      {children}
    </Card>
  );
}

/** A column of regions that keeps the hairline rule between them. */
export function RegionStack({ children, className }) {
  return (
    <div className={cn('grid gap-px bg-border-subtle [&>*]:bg-surface-container-lowest', className)}>
      {children}
    </div>
  );
}

/**
 * SummaryStat
 * A supporting figure that is not a headline: smaller than a KPI tile, and
 * grouped with its siblings in one ruled strip rather than four little cards.
 */
export function SummaryStat({ label, value, note }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-surface-container-lowest p-space-lg">
      <span className="truncate text-label text-muted">{label}</span>
      <span className="text-kpi text-primary">{value}</span>
      {note && <span className="text-meta leading-snug text-faint">{note}</span>}
    </div>
  );
}

export function SummaryStrip({ children, className }) {
  return (
    <Card
      className={cn(
        'grid gap-px overflow-hidden bg-border-subtle sm:grid-cols-2 lg:grid-cols-3',
        // An odd figure in a two-column strip leaves a hole, and the grid's
        // gap colour shows through it as a stray dark rectangle. The last
        // cell takes the slack instead.
        'sm:[&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1',
        className
      )}
    >
      {children}
    </Card>
  );
}

/**
 * A row of a statement: a label that may carry a definition, and the amount it
 * has to tie out to.
 */
export function StatementRow({ label, hint, value, negative = false }) {
  return (
    <div className="flex items-baseline justify-between gap-space-md">
      <dt className="truncate text-body-lg text-secondary" title={hint}>
        {label}
      </dt>
      <dd
        className={cn(
          'shrink-0 text-num tabular-nums',
          negative ? 'text-danger' : 'text-primary'
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * CustomRangePopover
 * Two dates and an apply. The API takes any window, so the presets are a
 * shortcut rather than the whole offer; a finance question is usually "the
 * quarter that closed", which no preset names.
 */
function CustomRangePopover({ from, to, onApply, onClose }) {
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  const invalid = !start || !end || start > end;

  return (
    <div
      role="dialog"
      aria-label="Custom date range"
      className="absolute right-0 top-full z-overlay mt-2 w-[19rem] animate-zoom-in rounded-xl border border-subtle bg-overlay p-space-md shadow-lg"
    >
      <div className="flex flex-col gap-space-md">
        <div className="grid grid-cols-2 gap-space-sm">
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-secondary">From</span>
            <Input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-secondary">To</span>
            <Input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        {invalid && (
          <p className="text-meta text-danger">Pick a start date on or before the end date.</p>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={invalid} onClick={() => onApply(start, end)}>
            Apply range
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * RangeControls
 * The window every section is read through. It sits in the page header
 * because it governs the whole screen rather than the section under it: the
 * dates survive a switch between reports, and a report never has its own.
 */
export function RangeControls({
  rangeId,
  onRangeChange,
  customFrom,
  customTo,
  onCustomRange,
  compare,
  onToggleCompare,
  onRefresh,
  isFetching,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const onPointerDown = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setPickerOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [pickerOpen]);

  const isCustom = rangeId === CUSTOM_RANGE.id;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Date range"
        className="scrollbar-thin flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-subtle bg-surface-subtle p-1"
      >
        {/* The pill shows the short form and keeps the full phrase as its
            accessible name, so the rail fits a laptop without the control
            losing the words a screen reader announces. */}
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={r.id === rangeId}
            aria-label={r.label}
            title={r.label}
            onClick={() => onRangeChange(r.id)}
            className={cn(
              'h-7 shrink-0 whitespace-nowrap rounded-md px-2.5 text-label transition-colors',
              r.id === rangeId
                ? 'bg-surface-container-lowest font-semibold text-accent shadow-xs'
                : 'text-muted hover:text-primary'
            )}
          >
            {r.short}
          </button>
        ))}
        <div className="relative shrink-0" ref={pickerRef}>
          <button
            type="button"
            aria-pressed={isCustom}
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
            aria-label="Custom date range"
            title="Custom date range"
            onClick={() => setPickerOpen((open) => !open)}
            className={cn(
              'flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-label transition-colors',
              isCustom
                ? 'bg-surface-container-lowest font-semibold text-accent shadow-xs'
                : 'text-muted hover:text-primary'
            )}
          >
            <Icon name="calendar_month" aria-hidden="true" size={14} />
            {isCustom && customFrom && customTo ? `${customFrom} to ${customTo}` : 'Custom'}
          </button>
          {pickerOpen && (
            <CustomRangePopover
              from={customFrom || toDateInput(Date.now())}
              to={customTo || toDateInput(Date.now())}
              onClose={() => setPickerOpen(false)}
              onApply={(start, end) => {
                onCustomRange(start, end);
                setPickerOpen(false);
              }}
            />
          )}
        </div>
      </div>

      <Button
        size="sm"
        variant={compare ? 'default' : 'outline'}
        aria-pressed={compare}
        onClick={onToggleCompare}
        title="Compare with the period immediately before this one"
      >
        <Icon name="swap_vert" aria-hidden="true" size={14} />
        <span>Compare</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={isFetching}
        title="Fetch the figures again"
      >
        <Icon
          name="refresh"
          aria-hidden="true"
          size={14}
          className={cn(isFetching && 'animate-spin')}
        />
        <span>{isFetching ? 'Refreshing' : 'Refresh'}</span>
      </Button>
    </div>
  );
}

/**
 * ReportTabs
 * The four reports, on a rail of their own so a long section name is never
 * squeezed against the date control beside it. The caption on the right says
 * which window every one of them is reporting, since the control that set it
 * is a row above.
 */
export function ReportTabs({ view, onViewChange, caption }) {
  return (
    <div className="flex flex-col gap-space-sm border-b border-subtle pb-space-sm xl:flex-row xl:items-center xl:justify-between xl:gap-space-lg">
      <div
        role="tablist"
        aria-label="Report sections"
        className="scrollbar-thin -mb-px flex min-w-0 items-center gap-1 overflow-x-auto overflow-y-hidden pb-px"
      >
        {VIEWS.map((v) => {
          const isActive = v.id === view;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              id={`report-tab-${v.id}`}
              aria-selected={isActive}
              aria-controls={`report-panel-${v.id}`}
              onClick={() => onViewChange(v.id)}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-body-lg transition-colors',
                isActive
                  ? 'bg-surface-container font-semibold text-primary'
                  : 'text-muted hover:bg-surface-subtle hover:text-primary'
              )}
            >
              <Icon
                name={v.icon}
                aria-hidden="true"
                size={16}
                className={isActive ? 'text-accent' : 'text-faint'}
              />
              {v.label}
            </button>
          );
        })}
      </div>

      {caption && (
        <p className="shrink-0 text-meta text-muted xl:text-right">{caption}</p>
      )}
    </div>
  );
}

/** The panel one report section renders into. */
export function ReportPanel({ id, children }) {
  return (
    <div
      role="tabpanel"
      id={`report-panel-${id}`}
      aria-labelledby={`report-tab-${id}`}
      tabIndex={-1}
      className="flex min-w-0 flex-col gap-space-xl focus-visible:outline-none"
    >
      {children}
    </div>
  );
}
