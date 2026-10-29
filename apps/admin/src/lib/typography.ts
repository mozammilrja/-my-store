/**
 * The two type treatments the design system uses outside the component library,
 * as Tailwind utilities rather than custom CSS: written here once, they merge
 * correctly wherever a primitive already sets its own size or weight.
 */

/** Micro-label over a metric, a table header or a nav group. */
export const LABEL_CAPS =
  "text-[11px] leading-[14px] font-semibold tracking-[0.06em] uppercase"

/** The number a KPI card exists to show. */
export const METRIC_STAT =
  "text-[28px] leading-8 font-semibold tracking-[-0.02em] tabular-nums"

/**
 * Caps headers for the ReUI data grid. Its column header renders its own label
 * class and never merges a `className`, so the header row reaches the label
 * through a descendant selector, which also outranks it on specificity.
 */
export const GRID_CAPS_HEADER = [
  "[&_th_div]:text-[11px] [&_th_div]:font-semibold [&_th_div]:uppercase [&_th_div]:tracking-[0.06em]",
  "[&_th_button]:text-[11px] [&_th_button]:font-semibold [&_th_button]:uppercase [&_th_button]:tracking-[0.06em]",
].join(" ")
