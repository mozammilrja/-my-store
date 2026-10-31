import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Chart primitives.
 *
 * Hand-built SVG and flexbox rather than a charting dependency: every mark here
 * is a bar, a line or a rectangle, and a library would cost more bytes than the
 * whole admin bundle saves.
 *
 * The rules these follow, so a new chart does not have to re-derive them:
 *
 *  - Colour does a job. Identity -> the categorical slots (--chart-1..5, in
 *    fixed order, never cycled). Magnitude -> one hue for every bar. State ->
 *    the reserved status tokens, which never stand in for a series colour.
 *  - A single measure gets one colour. A ramp across nominal categories would
 *    encode bar length twice and spend the only free channel on nothing.
 *  - Marks stay thin, grid lines stay hairline and solid, and the separation
 *    between touching fills is a 2px gap in the surface colour, never a stroke.
 *  - Nothing is reachable only by hovering. Every chart prints its figures
 *    beside the marks or carries a table underneath it.
 */

/** Categorical identity, in fixed order. Past three, fold the tail into Other. */
export const SERIES = ['rgb(var(--chart-1))', 'rgb(var(--chart-2))', 'rgb(var(--chart-3))'];

/** Reserved for state. Never used as "series four". */
export const STATE = {
  good: 'rgb(var(--status-success))',
  info: 'rgb(var(--status-info))',
  warning: 'rgb(var(--status-warning))',
  critical: 'rgb(var(--status-danger))',
  idle: 'rgb(var(--chart-baseline))',
};

const ACCENT = 'rgb(var(--chart-1))';
const GRID = 'rgb(var(--chart-grid))';
const SURFACE = 'rgb(var(--surface))';

/** Width of an element, tracked so SVG text is never stretched by a viewBox. */
function useWidth() {
  const ref = React.useRef(null);
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect?.width ?? 0;
      setWidth((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
    });
    observer.observe(node);
    setWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/**
 * Axis ticks land on round numbers, so the grid reads as a scale and not as
 * data. Picking the step straight from max/4 and rounding up overshoots badly —
 * a 46,951 maximum lands on a 60,000 axis and throws away a fifth of the plot.
 * Candidate steps are scored instead, and the tightest axis that still gives a
 * sane number of gridlines wins.
 */
function niceTicks(max) {
  if (!Number.isFinite(max) || max <= 0) return { top: 1, ticks: [0, 1] };
  const mag = 10 ** Math.floor(Math.log10(max / 4));
  const candidates = [0.5, 1, 2, 2.5, 5, 10, 20].map((m) => m * mag).filter((step) => step > 0);

  let best = null;
  for (const step of candidates) {
    const top = Math.ceil(max / step) * step;
    const lines = Math.round(top / step);
    if (lines < 3 || lines > 6) continue;
    if (!best || top < best.top || (top === best.top && lines < best.lines)) best = { step, top, lines };
  }
  const { step, top } = best ?? { step: max, top: max };

  const ticks = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return { top, ticks };
}

/** A readout pinned near the mark it describes, clamped inside the plot. */
function Tooltip({ x, width, children }) {
  const left = Math.min(Math.max(x, 72), Math.max(width - 72, 72));
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 w-max max-w-[15rem] -translate-x-1/2 rounded-lg border border-subtle bg-overlay px-space-sm py-1.5 shadow-md"
      style={{ left }}
    >
      {children}
    </div>
  );
}

/** A short stroke of the series colour: identity without colouring the text. */
export function SeriesKey({ color, shape = 'rect', className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block shrink-0', shape === 'line' ? 'h-0.5 w-3 rounded-full' : 'h-2.5 w-2.5 rounded-sm', className)}
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * TimeSeries
 * One measure over a continuous day axis, as an area under a 2px line. The
 * reader aims at a date, not at the line, so a crosshair snaps to the nearest
 * day and the readout follows it. Every value is also in the table underneath.
 */
export function TimeSeries({
  points = [],
  formatValue = (v) => String(v),
  formatTick,
  valueLabel = 'Value',
  height = 240,
  detail,
}) {
  const [ref, width] = useWidth();
  const [active, setActive] = React.useState(null);

  const pad = { top: 18, right: 14, bottom: 26, left: 62 };
  const plotW = Math.max(width - pad.left - pad.right, 10);
  const plotH = Math.max(height - pad.top - pad.bottom, 10);

  const values = points.map((p) => p.value);
  const { top, ticks } = niceTicks(Math.max(...values, 0));
  const x = (i) => (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v) => plotH - (v / top) * plotH;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)} ${y(p.value).toFixed(2)}`).join(' ');
  const area = points.length ? `${line} L${x(points.length - 1).toFixed(2)} ${plotH} L${x(0).toFixed(2)} ${plotH} Z` : '';

  // One label every nth day, so the axis never collides with itself.
  const everyNth = Math.max(1, Math.ceil(points.length / Math.max(3, Math.floor(plotW / 62))));
  const peak = points.reduce((best, p, i) => (p.value > (points[best]?.value ?? -1) ? i : best), 0);

  const onMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const local = event.clientX - box.left;
    const ratio = points.length === 1 ? 0 : local / Math.max(box.width, 1);
    setActive(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
  };

  const hovered = active === null ? null : points[active];

  return (
    <div className="flex flex-col gap-space-sm">
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && points.length > 0 && (
          <>
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={`${valueLabel} per day, ${points.length} days`}
              className="block overflow-visible"
            >
              <g transform={`translate(${pad.left},${pad.top})`}>
                {ticks.map((t) => (
                  <g key={t}>
                    <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" shapeRendering="crispEdges" />
                    <text
                      x={-10}
                      y={y(t)}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="fill-[rgb(var(--text-faint))] text-[11px] tabular-nums"
                    >
                      {formatTick ? formatTick(t) : t}
                    </text>
                  </g>
                ))}

                <path d={area} fill={ACCENT} opacity="0.12" />
                <path d={line} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

                {points.map((p, i) =>
                  i % everyNth === 0 || i === points.length - 1 ? (
                    <text
                      key={p.key}
                      x={x(i)}
                      y={plotH + 17}
                      textAnchor="middle"
                      className="fill-[rgb(var(--text-faint))] text-[11px]"
                    >
                      {p.label}
                    </text>
                  ) : null
                )}

                {/* The busiest day is the one worth naming without a hover. */}
                {points[peak] && points[peak].value > 0 && active === null && (
                  <>
                    <circle cx={x(peak)} cy={y(points[peak].value)} r="4" fill={ACCENT} stroke={SURFACE} strokeWidth="2" />
                    <text
                      x={Math.min(Math.max(x(peak), 28), plotW - 28)}
                      y={Math.max(y(points[peak].value) - 11, -6)}
                      textAnchor="middle"
                      className="fill-[rgb(var(--text-secondary))] text-[11px] font-semibold tabular-nums"
                    >
                      {formatTick ? formatTick(points[peak].value) : formatValue(points[peak].value)}
                    </text>
                  </>
                )}

                {active !== null && (
                  <>
                    <line x1={x(active)} x2={x(active)} y1={0} y2={plotH} stroke={GRID} strokeWidth="1" shapeRendering="crispEdges" />
                    <circle cx={x(active)} cy={y(points[active].value)} r="4.5" fill={ACCENT} stroke={SURFACE} strokeWidth="2" />
                  </>
                )}
              </g>
            </svg>

            <div
              className="absolute inset-0 cursor-crosshair"
              style={{ left: pad.left, right: pad.right, top: pad.top, bottom: pad.bottom, width: plotW, height: plotH }}
              onPointerMove={onMove}
              onPointerLeave={() => setActive(null)}
            />

            {hovered && (
              <div className="absolute" style={{ left: pad.left, top: 0, width: plotW }}>
                <Tooltip x={x(active)} width={plotW}>
                  <p className="text-num tabular-nums text-primary">{formatValue(hovered.value)}</p>
                  <p className="text-micro text-muted">{hovered.title ?? hovered.label}</p>
                  {hovered.note && <p className="text-micro text-faint">{hovered.note}</p>}
                </Tooltip>
              </div>
            )}
          </>
        )}
      </div>

      {detail !== false && (
        <details className="group border-t border-subtle pt-space-sm">
          <summary className="cursor-pointer list-none text-micro text-muted hover:text-primary">
            <span className="underline underline-offset-2">View the days as a table</span>
          </summary>
          <div className="scrollbar-thin mt-space-sm max-h-56 overflow-auto">
            <table className="w-full border-collapse text-left text-meta">
              <thead className="sticky top-0 bg-surface-subtle">
                <tr className="border-b border-subtle">
                  <th className="h-8 px-2 text-caption uppercase text-secondary">Day</th>
                  <th className="h-8 px-2 text-right text-caption uppercase text-secondary">{valueLabel}</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.key} className="border-b border-subtle last:border-0">
                    <td className="px-2 py-1 text-secondary">{p.title ?? p.label}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-primary">{formatValue(p.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

/**
 * RankedBars
 * Parts of a whole the reader needs to rank and compare: largest first, all on
 * one baseline, one colour. Bars on a shared baseline compare far more exactly
 * than slices laid end to end, which is why there is no pie in this file.
 *
 * The figures sit in their own column rather than riding each bar's tip. A
 * label printed inside a bar has to be white on the fill, and white on this
 * palette's own accent lands a hair under 4.5:1 — close enough to pass a
 * glance and not close enough to pass the contrast gate. Aligned figures also
 * read down the column, which a row of labels at scattered offsets cannot.
 */
export function RankedBars({
  rows = [],
  formatValue = (v) => String(v),
  total,
  // 'max' measures each bar against the biggest one, which is what you want
  // when the question is "which is largest". 'total' measures it against the
  // whole instead — the right scale when the values are close or identical,
  // where max-scaling degenerates into a column of full-width bars that say
  // nothing. Reasons for return are the usual case: five reasons, one each.
  scale = 'max',
  emptyMessage = 'Nothing recorded in this range.',
  color = ACCENT,
}) {
  if (!rows.length) return <p className="text-meta text-muted">{emptyMessage}</p>;

  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const sum = total ?? sorted.reduce((n, r) => n + r.value, 0);
  const max = scale === 'total' ? Math.max(sum, 1) : Math.max(...sorted.map((r) => r.value), 1);

  return (
    // One grid for the whole list rather than one per row, so the three
    // columns share their widths and the figures line up down the chart.
    <ul className="grid grid-cols-[minmax(5rem,10rem)_1fr_auto] items-center gap-x-space-md gap-y-space-sm">
      {sorted.map((row) => {
        const pct = (row.value / max) * 100;
        const share = sum > 0 ? Math.round((row.value / sum) * 100) : 0;
        const described = `${row.label}: ${formatValue(row.value)}${row.note ? ` (${row.note})` : ''}${
          sum > 0 ? ` — ${share}% of ${formatValue(sum)}` : ''
        }`;
        return (
          <li key={row.key} className="contents">
            <span className="truncate text-body text-secondary" title={described}>
              {row.label}
            </span>
            <span className="flex h-2 min-w-[2rem] overflow-hidden rounded-full" style={{ backgroundColor: 'rgb(var(--chart-grid))' }}>
              <span
                className="h-full rounded-full transition-[width]"
                style={{ width: `${Math.max(pct, row.value > 0 ? 2 : 0)}%`, backgroundColor: color }}
              />
            </span>
            <span className="whitespace-nowrap text-right text-num tabular-nums text-primary" title={described}>
              {formatValue(row.value)}
              {row.note && <span className="ml-1.5 hidden text-meta text-muted sm:inline">{row.note}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * SplitBreakdown
 * One whole split into parts, read beside its figures. The bar carries the
 * proportions, the rows carry the numbers, and a swatch on each row ties the
 * two together — so no legend box has to restate anything.
 */
export function SplitBreakdown({ parts = [], total, formatValue, emptyMessage = 'Nothing recorded in this range.' }) {
  const [active, setActive] = React.useState(null);
  const sum = total ?? parts.reduce((n, p) => n + p.value, 0);
  if (!parts.length || sum <= 0) return <p className="text-meta text-muted">{emptyMessage}</p>;

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex h-2 w-full gap-[2px] overflow-hidden" role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / sum) * 100)}%`).join(', ')}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <div
              key={p.key}
              className="h-full rounded-full first:rounded-l-full last:rounded-r-full transition-opacity"
              style={{
                width: `${(p.value / sum) * 100}%`,
                backgroundColor: p.color,
                opacity: active && active !== p.key ? 0.35 : 1,
              }}
            />
          ))}
      </div>

      <ul className="flex flex-col gap-space-sm">
        {parts.map((p) => {
          const share = Math.round((p.value / sum) * 100);
          return (
            <li
              key={p.key}
              className="flex items-center justify-between gap-space-md"
              onPointerEnter={() => setActive(p.key)}
              onPointerLeave={() => setActive(null)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <SeriesKey color={p.color} />
                <span className="truncate text-body text-secondary" title={p.label}>
                  {p.label}
                </span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                <span className="text-num tabular-nums text-primary">{p.value}</span>
                <span className="w-10 text-right text-micro tabular-nums text-faint">{share}%</span>
                {p.amount !== undefined && formatValue && (
                  <span className="w-24 text-right text-meta tabular-nums text-muted">{formatValue(p.amount)}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Waterfall
 * How one figure becomes another: the opening bar, each step that adds to or
 * takes from it floating at the running total, and the closing bar back on the
 * baseline. A list of six amounts cannot show that the deductions are small.
 */
export function Waterfall({ steps = [], formatValue = (v) => String(v), formatTick, height = 240 }) {
  const [ref, width] = useWidth();
  const [active, setActive] = React.useState(null);

  const pad = { top: 26, right: 12, bottom: 44, left: 62 };
  const plotW = Math.max(width - pad.left - pad.right, 10);
  const plotH = Math.max(height - pad.top - pad.bottom, 10);

  // Each step floats on what came before it; totals sit back on the baseline.
  let running = 0;
  const bars = steps.map((s) => {
    const isTotal = s.type === 'total';
    const from = isTotal ? 0 : running;
    const to = isTotal ? s.value : running + s.value;
    running = isTotal ? s.value : to;
    return { ...s, from: Math.min(from, to), to: Math.max(from, to), level: running, isTotal };
  });

  const { top, ticks } = niceTicks(Math.max(...bars.map((b) => b.to), 0));
  const band = plotW / Math.max(bars.length, 1);
  // Capped, never filling its slot: the leftover in the band is air, not data.
  const barW = Math.min(band - 18, 24);
  const y = (v) => plotH - (v / top) * plotH;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="How gross sales become net sales" className="block overflow-visible">
          <g transform={`translate(${pad.left},${pad.top})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" shapeRendering="crispEdges" />
                <text x={-10} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-[rgb(var(--text-faint))] text-[11px] tabular-nums">
                  {formatTick ? formatTick(t) : t}
                </text>
              </g>
            ))}

            {/* Connectors carry the running total across the gap, so a step
                worth a fraction of a percent still reads as part of a chain
                rather than as a stray line floating near the top. */}
            {bars.slice(0, -1).map((b, i) => (
              <line
                key={`link-${b.key}`}
                x1={band * i + band / 2 + barW / 2}
                x2={band * (i + 1) + band / 2 - barW / 2}
                y1={y(b.level)}
                y2={y(b.level)}
                stroke="rgb(var(--chart-baseline))"
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
            ))}

            {bars.map((b, i) => {
              const cx = band * i + band / 2;
              const barH = Math.max(y(b.from) - y(b.to), 2);
              return (
                <g
                  key={b.key}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  tabIndex={0}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="cursor-default focus:outline-none"
                >
                  {/* The hit target is the whole band, not the painted bar. */}
                  <rect x={cx - band / 2} y={-pad.top} width={band} height={plotH + pad.top} fill="transparent" />
                  <rect
                    x={cx - barW / 2}
                    y={y(b.to)}
                    width={barW}
                    height={barH}
                    rx="4"
                    fill={b.color}
                    opacity={active === null || active === i ? 1 : 0.6}
                  />
                  <text x={cx} y={plotH + 17} textAnchor="middle" className="fill-[rgb(var(--text-muted))] text-[11px]">
                    {b.label}
                  </text>
                  {b.isTotal && (
                    <text x={cx} y={y(b.to) - 8} textAnchor="middle" className="fill-[rgb(var(--text-primary))] text-[11px] font-semibold tabular-nums">
                      {formatTick ? formatTick(b.value) : formatValue(b.value)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {active !== null && bars[active] && (
        <div className="absolute" style={{ left: pad.left, top: 0, width: plotW }}>
          <Tooltip x={band * active + band / 2} width={plotW}>
            <p className="text-num tabular-nums text-primary">{formatValue(Math.abs(bars[active].value))}</p>
            <p className="text-micro text-muted">{bars[active].title ?? bars[active].label}</p>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

/**
 * Meter
 * One ratio against a limit. The track is a lighter step of the fill's own
 * ramp, so the state reads across the whole bar rather than only where it ends.
 */
export function Meter({ value, max, label, className }) {
  if (!Number.isFinite(max) || max <= 0) {
    return <span className="text-micro text-faint">No limit</span>;
  }
  const pct = Math.min(100, Math.round((value / max) * 100));
  const tone = pct >= 90 ? STATE.critical : pct >= 70 ? STATE.warning : ACCENT;
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span
        className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full"
        style={{ backgroundColor: 'rgb(var(--chart-grid))' }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Usage against limit'}
      >
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: tone }} />
      </span>
      <span className="w-9 text-right text-micro tabular-nums text-muted">{pct}%</span>
    </span>
  );
}

/**
 * ChartTabs
 * Picks which measure a chart plots. Never two scales on one plot: the reader
 * swaps the axis instead of trying to read two of them at once.
 *
 * Plain words with a rule under the active one — the panel around it already
 * supplies a frame, and a bordered control inside a bordered card is chrome
 * drawn on top of chrome.
 */
export function ChartTabs({ options = [], value, onChange, label = 'Measure' }) {
  return (
    <div className="flex items-center gap-space-md" role="group" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={opt.id === value}
          className={cn(
            'cursor-pointer border-b-2 pb-1 text-meta transition-colors',
            opt.id === value
              ? 'border-[rgb(var(--chart-1))] text-primary'
              : 'border-transparent text-muted hover:text-primary'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * BarCell
 * A bar sized against the column's largest value, for a table row. Carries no
 * text of its own: the cells beside it already print the figure, and repeating
 * it on the bar would be the same number twice on one line.
 *
 * This is what replaced the pattern of a ranked-bar chart above a table of the
 * same rows — two readings of one dataset, stacked, for no extra information.
 */
export function BarCell({ value, max, label, color = ACCENT }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 1.5 : 0) : 0;
  return (
    <span
      className="flex h-1.5 w-full min-w-[3rem] overflow-hidden rounded-full"
      style={{ backgroundColor: 'rgb(var(--chart-grid))' }}
      role="img"
      aria-label={label}
    >
      <span className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </span>
  );
}
