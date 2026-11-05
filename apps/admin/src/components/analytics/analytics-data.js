import { SERIES, STATE } from '../shared';

/**
 * The vocabulary the analytics screens share: the ranges the operator can ask
 * for, the measures the board can plot, and the order each set of states reads
 * in. Kept apart from the views so a label or a colour is defined once.
 */

export const RANGES = [
  { id: '7d', label: 'Last 7 days', short: '7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', short: '30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', short: '90 days', days: 90 },
  { id: '12m', label: 'Last 12 months', short: '12 months', days: 365 },
];

export const CUSTOM_RANGE = { id: 'custom', label: 'Custom range', short: 'Custom' };

export const MEASURES = [
  { id: 'revenue', label: 'Revenue', axis: 'Revenue' },
  { id: 'orders', label: 'Orders', axis: 'Orders' },
  { id: 'units', label: 'Units', axis: 'Units' },
];

/**
 * The report sections. One subject each, so the opening view answers "how is
 * the business doing" without the operator scrolling past four registers to
 * find out.
 */
export const VIEWS = [
  { id: 'overview', label: 'Overview', icon: 'insights' },
  { id: 'catalog', label: 'Products & Categories', icon: 'checkroom' },
  { id: 'finance', label: 'Finance & Procurement', icon: 'account_balance_wallet' },
  { id: 'marketing', label: 'Marketing', icon: 'sell' },
];

export const FULFILLMENT = {
  unfulfilled: { label: 'Unfulfilled', color: STATE.warning },
  shipped: { label: 'Shipped', color: STATE.info },
  delivered: { label: 'Delivered', color: STATE.good },
  returned: { label: 'Returned', color: STATE.critical },
};

export const PAYMENT = {
  awaiting: { label: 'Awaiting', color: STATE.warning },
  paid: { label: 'Paid', color: STATE.good },
  refunded: { label: 'Refunded', color: STATE.critical },
};

// Payment method is identity, not state, so it takes the categorical slots in
// a fixed order: a method keeps its colour whether or not the others appear.
export const METHOD = {
  cod: { label: 'Cash on delivery', color: SERIES[0] },
  razorpay: { label: 'Razorpay', color: SERIES[1] },
  stripe: { label: 'Stripe', color: SERIES[2] },
};

export const SHIPMENT_LABEL = {
  pending: 'Booking',
  ready_to_ship: 'Ready to ship',
  shipment_created: 'Shipment created',
  pickup_scheduled: 'Pickup scheduled',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  delivery_failed: 'Delivery failed',
  rto_initiated: 'RTO initiated',
  rto_in_transit: 'RTO in transit',
  rto_delivered: 'RTO delivered',
  cancelled: 'Cancelled',
};

export const PO_LABEL = {
  draft: 'Draft',
  submitted: 'Submitted',
  partially_received: 'Partly received',
  received: 'Received',
  canceled: 'Cancelled',
};

export const INVOICE_STATE = {
  paid: { label: 'Paid', variant: 'success' },
  canceled: { label: 'Cancelled', variant: 'destructive' },
};

/** The API returns only the days that had orders; a time axis needs all of them. */
export function buildSeries(daily, range) {
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

export const dayLabel = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

export const monthLabel = (iso) =>
  new Date(`${iso}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

export const longDayLabel = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

/** A calendar day in the browser's own zone, as an input[type=date] value. */
export const toDateInput = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * The API returns these groups in whatever order the aggregation produced.
 * A split bar is only readable when its blocks follow the real sequence — the
 * fulfilment pipeline, the payment lifecycle — so the order comes from the
 * maps above rather than from the response, and a state the API did not send
 * simply does not appear.
 */
export function partsInOrder(rows, map, keyField, { amount = false } = {}) {
  return Object.keys(map)
    .map((key) => [key, (rows ?? []).find((row) => row[keyField] === key)])
    .filter(([, row]) => row)
    .map(([key, row]) => ({
      key,
      label: map[key].label,
      color: map[key].color,
      value: row.count,
      ...(amount ? { amount: row.amount } : {}),
    }));
}

/* Sort accessors, defined once at module scope: they are a dependency of the
   sorted result, so rebuilding them on every render would re-sort every row
   on every keystroke. */
export const PRODUCT_SORT = {
  title: (p) => p.title ?? '',
  revenue: (p) => p.revenue,
  units: (p) => p.units,
  orders: (p) => p.orders,
  share: (p) => p.revenue,
};

export const CATEGORY_SORT = {
  name: (c) => c.name ?? '',
  revenue: (c) => c.revenue,
  units: (c) => c.units,
  share: (c) => c.revenue,
};

export const PROMOTION_SORT = {
  code: (p) => p.code ?? '',
  usageCount: (p) => p.usageCount,
  usageLimit: (p) => p.usageLimit,
  state: (p) => (p.active ? 'Live' : 'Paused'),
  burn: (p) => (p.usageLimit > 0 ? p.usageCount / p.usageLimit : null),
};

export const INVOICE_SORT = {
  status: (i) => INVOICE_STATE[i.status]?.label ?? i.status,
  count: (i) => i.count,
  taxable: (i) => i.taxable,
  cgst: (i) => i.cgst,
  sgst: (i) => i.sgst,
  igst: (i) => i.igst,
  grandTotal: (i) => i.grandTotal,
};
