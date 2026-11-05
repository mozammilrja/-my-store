/**
 * Shared vocabulary for the logistics analytics screen: how a rate, a median
 * and a missing figure are written, the range presets, and the definitions the
 * API computes by (lib/analytics/logistics.ts), repeated here word for word so
 * the operator reads the same rule the number was made with.
 */

export const DASH = '–';

/** A percentage the API returned, or a dash: a rate over nothing is not 0%. */
export const rate = (v) => (v === null || v === undefined ? DASH : `${v}%`);
export const days = (v) => (v === null || v === undefined ? DASH : `${v} d`);
export const hours = (v) => (v === null || v === undefined ? DASH : `${v} h`);

export const LOGISTICS_RANGES = [
  { id: '7d', label: 'Last 7 days', short: '7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', short: '30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', short: '90 days', days: 90 },
];

export const DEFINITIONS = [
  ['Delivered rate', 'Delivered ÷ (delivered + returned to origin). Closed parcels only; parcels still moving are left out.'],
  ['First attempt', 'Delivered parcels that had no failed attempt before delivery.'],
  ['On time', "Delivered by the end of the courier's promised day (India time). Only parcels with a promise count."],
  ['Transit days', 'From the first courier movement (pickup or in-transit scan) to delivery.'],
  ['Dispatch hours', 'From the fulfilment being created to the parcel being handed to the courier or a rider.'],
  ['Window', 'Parcels, fulfilments and deliveries count in the range they were created in; returns in the range they were requested in. Cash on hand is as of now.'],
];

export const RETURN_REASON_LABEL = {
  too_small: 'Too small',
  too_large: 'Too large',
  not_as_pictured: 'Not as pictured',
  damaged: 'Damaged',
  wrong_item: 'Wrong item',
  quality: 'Quality',
  changed_mind: 'Changed mind',
  other: 'Other',
};

export const RETURN_STATUS_LABEL = {
  requested: 'Requested',
  approved: 'Approved',
  pickup_scheduled: 'Pickup booked',
  in_transit: 'On its way back',
  received: 'Received',
  inspected: 'Inspected',
  refund_pending: 'Refund pending',
  refunded: 'Refunded',
  exchanged: 'Exchanged',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const PROVIDER_LABEL = { shiprocket: 'Shiprocket', delhivery: 'Delhivery direct', own_fleet: 'Own fleet', manual: 'Recorded by hand' };

/** A calendar day in India, as the API's daily keys are. */
export const istDay = (d) => new Date(new Date(d).getTime() + 330 * 60_000).toISOString().slice(0, 10);

/** Every day from `from` to `to`, so a quiet day plots as zero rather than vanishing from the axis. */
export function fillDays(daily = [], from, to) {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const out = [];
  const start = new Date(`${istDay(from)}T00:00:00Z`);
  const end = new Date(`${istDay(to)}T00:00:00Z`);
  for (let t = start.getTime(); t <= end.getTime() && out.length < 400; t += 86_400_000) {
    const key = new Date(t).toISOString().slice(0, 10);
    out.push(byDay.get(key) ?? { day: key, booked: 0, delivered: 0, returnedToOrigin: 0 });
  }
  return out;
}
