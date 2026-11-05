# Logistics analytics

Last updated: 2026-11-05. Phase 7 of the logistics programme.

`GET /admin/analytics/logistics?from=&to=` (ISO dates with an offset; the
default is the last 30 days; at most a year). It is computed in
`apps/backend/src/lib/analytics/logistics.ts` from the operational records
only: shipments and their courier scans, warehouse fulfilments, own-fleet
delivery tasks and cash remittances, and returns.

Nothing is estimated. A figure the records can't support is null, and the
admin shows "–" with the reason, never 0. Two figures aren't available at
all, and the report lists them in `unavailable`:
- freight cost (courier invoices aren't imported);
- courier COD remittances (settled in the courier's dashboard).

## Windows

| Record | Counted in the range it was |
| --- | --- |
| Shipment | Created (booked) |
| Fulfilment | Created (allocated) |
| Delivery task | Created |
| Return | Requested |
| Cash remittance | Submitted |

Cash on hand is as of now, whatever the range. Days are India days (IST).
Return parcels and cancelled bookings are left out of the shipment figures;
cancellations are counted on their own.

## Definitions

| Figure | Definition |
| --- | --- |
| Delivered rate | delivered ÷ (delivered + returned to origin), counting closed parcels only. Parcels still moving don't count against it. |
| Returned to origin (RTO) | rto_initiated, rto_in_transit or rto_delivered |
| First attempt | delivered with no failed attempt before it (no NDR, no `delivery_failed` scan; for our fleet, no recorded attempt) |
| On time | delivered by the end of the courier's promised day in IST. Only parcels with a promise count, and the count is shown next to the rate. |
| Transit days (median) | first courier movement (pickup, in transit or out for delivery scan) to delivery |
| Hours to pack, hours to dispatch (median) | fulfilment created to packed, and to handed to the courier or rider |
| Dispatched within 24 h | share of dispatched fulfilments handed over within 24 hours of allocation |
| Destination | the first three digits of the PIN code (its sorting district); top 15 by volume, with the RTO rate |
| Failure reasons | the courier's NDR wording, plus the reasons our riders recorded for each failed attempt |
| Fleet cash on hand | COD collected by riders and not yet in a remittance, per rider |
| Remittance mismatch | finance counted a different amount from what the rider's tasks collected |
| Days to refund (median) | return requested to refund resolution |

## Sections returned

- `totals`, `carriers` (by integration and courier name; our fleet is
  "Everwear Fleet")
- `destinations`, `failureReasons`
- `warehouses` (seller locations are marked `seller: true`)
- `fleet`: totals, per rider, and cash
- `returns`: status, reasons by units, refund time
- `daily`: booked, delivered and RTO per IST day
- `unavailable`

## Admin screens (Phase 7)

| Screen | Path | What it does |
| --- | --- | --- |
| Logistics Analytics | `/logistics-analytics` | This report, with date presets, a daily chart, and tables for couriers, destinations, warehouses, riders, cash and returns. A null figure shows as "–" with the reason. |
| Warehouse Operations | `/warehouse-operations` | Warehouses (with Shiprocket and Delhivery pickup names; seller locations read-only), stock levels, ledger and movements, floor staff, and the fulfilment board with reassignment |
| Delivery Fleet | `/delivery-fleet` | Deliveries board (assign, offer, unassign, return to hub, proof-of-delivery photo), rider checks and approval, zones, fleet settings |
| Cash on Delivery | `/cash-on-delivery` | Cash with riders now; hand-overs counted by finance, with mismatches kept open for a recount |
| Sellers & Settlements | `/marketplace-sellers` | Seller applications checked item by item; the full bank number only for finance and the owner, after an audit warning; the listings review queue; settlements with the payout UTR; marketplace settings |
| Notifications | `/notifications` | Delivery log with detail and resend of dead letters, channel status, SMS and WhatsApp template ids per event, failed outbox events |
| Order panel | order drawer | Quotes from every courier integration, booking with the chosen integration and courier, Delhivery parcels' label, pickup and cancel |

The sidebar's hub switcher lists the store's real warehouses (it used to list
made-up ones), and System Settings shows the three real webhook endpoints with
whether each secret is set.

Browser tests: `apps/operations/e2e/ops/*.ops.js`, run with `npm run test:e2e:ops`
from `apps/operations`. Each area runs on a fresh API and database seeded with its
own records.

## Tests

`apps/backend/test/logistics-analytics.test.ts` seeds known shipments,
fulfilments, delivery tasks, remittances and returns, then checks every
figure. That includes:
- the window edges;
- the evening delivery on its promised IST day counting as on time;
- a parcel with no promise having no on-time figure;
- an empty range returning nulls, not zeros.
