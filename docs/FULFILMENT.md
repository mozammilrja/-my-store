# Warehouse fulfilment (WMS)

Last updated: 2026-11-05. Phase 1 (backend) and Phase 2 (the `apps/warehouse` floor app) of the logistics programme.

## What it does

An order whose items are stocked in warehouses is allocated to the best
warehouse at checkout, with its units reserved in the same transaction. Warehouse
staff then accept, pick, inspect, pack, label, manifest and hand it to the
courier. Every unit that moves writes one stock-ledger row, and every status
change writes one status event.

```mermaid
flowchart LR
  Checkout["placeOrder (transaction)"] --> Alloc["allocate()<br/>PIN proximity, service areas,<br/>stock, priority, split"]
  Alloc --> F["fulfilment: assigned"]
  F --> Floor["/warehouse API<br/>accept, pick, QC, pack"]
  Floor --> Label["Shiprocket booking<br/>AWB + label from the warehouse's pickup address"]
  Label --> Manifest["manifest, pickup request,<br/>dock scans, close"]
  Manifest --> Courier["courier webhooks<br/>(existing tracking)"]
  Courier --> Order["order delivered / completed"]
```

## Opting in, and legacy behaviour

A variant is warehouse-managed once it has a **stock level** (a row in
`stock_levels`). This happens when a warehouse receives it, or through
`POST /admin/stock-levels/opening-balance`, which books its current sellable
count into one warehouse.

- An order with **no** warehouse-managed lines creates no fulfilment. It ships
  as before, from the order page (`POST /admin/orders/:id/shipments`).
- An order with **any** warehouse-managed line is allocated. The order page
  then refuses a direct booking (`warehouse_fulfilment`), so the
  pick/QC/pack checks can't be bypassed. Unmanaged lines ride along in the
  first parcel, unreserved.

The product variant's `stock` (what the storefront sells against) always
equals the sum of `available` across warehouses for managed variants. The
product page and the old `/admin/inventory/adjust` refuse to set it for those
(`warehouse_managed`).

## Stock model

Buckets per variant per warehouse: `available` (the only sellable one),
`reserved`, `picked`, `packed`, `damaged` and `quarantine`, plus running
`receivedTotal` and `dispatchedTotal`.

| Event | Move |
| --- | --- |
| Receive goods / opening balance / transfer in | outside -> available |
| Order allocated | available -> reserved |
| Pick scan | reserved -> picked |
| Failed QC | picked -> damaged, then available -> reserved for a replacement |
| Pack | picked -> packed |
| Manifest closed | packed -> outside (dispatch) |
| Cancel / decline / reassign | reserved, picked or packed -> available |
| Return inspected | outside -> quarantine -> available (sellable) or damaged |
| Damage found on shelf / write-off / count correction | available -> damaged / damaged -> outside / +-available |

`lib/inventory/stock.ts#moveStock` is the only writer. Its guarded `$inc`
refuses to take any bucket below zero, and it writes the ledger row in the
caller's transaction. A transfer is immediate. There's no in-transit stock
between warehouses yet.

## Allocation

`lib/fulfilment/allocate.ts`, inside the order transaction:

1. Eligible warehouses: active, `acceptsOrders !== false`, `serviceAreas`
   empty or containing a prefix of the delivery PIN code, and not one that
   already declined this order.
2. Ranked by the length of the shared PIN-code prefix (the Indian PIN
   hierarchy: zone, then circle, then sorting district), then `priority`
   (lower first), then code.
3. The first warehouse holding everything wins. Otherwise, if
   `settings.allowSplitFulfilment !== false`, warehouses are taken in turn by
   how many of the remaining units each can cover.
4. If nothing can fill the order, it fails with `out_of_stock` or
   `unserviceable`, and the whole placement rolls back.

Courier rates are compared when the parcel is booked from the chosen
warehouse, not during allocation, because a network call can't sit inside
the order transaction.

Duplicate tasks are impossible: a partial unique index allows one live
fulfilment per order and warehouse.

## State machines

`lib/state/machines.ts`. Each machine has its own field and its own table of
legal moves. An illegal move or a repeat move answers 409 `invalid_transition`
(or `stale` when a concurrent request won). Every move is appended to
`status_events` with the actor (system, admin, warehouse, customer or
courier) and a reason.

| Machine | Field | Moves |
| --- | --- | --- |
| order | `orders.status` | pending -> completed, canceled |
| payment | `orders.paymentStatus` | awaiting -> paid -> partially_refunded / refunded |
| fulfilment | `fulfilments.status` | assigned -> picking_pending -> picking -> picked -> qc_passed -> packed -> label_generated -> ready_to_dispatch -> manifested -> handed_over -> dispatched. Also: assigned -> rejected; picked -> picking_pending (failed QC); label_generated / ready_to_dispatch -> packed (courier booking cancelled); manifested -> ready_to_dispatch (not handed over); cancel allowed until packed. |
| shipment | `shipments.status` | ranked courier statuses (`lib/shipping/status.ts`), unchanged |
| return | `orders.returnRequest.status` | requested -> approved -> pickup_scheduled -> received -> inspected -> refunded; requested / approved -> rejected -> approved |

Status events are recorded today for: order placement, cancellation and
completion; the payment status at placement; every fulfilment move; and
every return move. Payment moves made later by refunds and settlement don't
write status events yet.

## Scan validation

| Step | Must scan | Refused with |
| --- | --- | --- |
| Pick | the SKU of a line still to pick | `wrong_item` (another size, colour or product), `over_pick` |
| Pack | the pick slip (`FUL-<order>-<n>`) and every unit going in the box | `wrong_order`, `wrong_item`, `over_pack`, `missing_item` |
| Label | the parcel barcode (`PKG-...`) | `wrong_package` |
| Ready to dispatch | the AWB on the applied label | `wrong_awb` |
| Handover | each AWB on the manifest | `not_on_manifest`, `already_scanned` |

Scan errors are 422 and move nothing.

## Warehouse API (`/warehouse`, CORS `WAREHOUSE_CORS`)

Staff accounts (`warehouse_users`) are separate from admin accounts. They use
the token audience `everwear:warehouse` (12 hours), are reloaded on every
request (so a suspension takes effect at once), and are scoped to
`warehouseIds`. Another warehouse's records answer 404. Responses never carry
the customer's name, phone, email or street. A fulfilment holds only city,
state and PIN code.

| Role | Permissions |
| --- | --- |
| picker | view, pick |
| packer | view, qc, pack, label |
| inspector | view, qc (including returns) |
| dispatcher | view, accept, label, dispatch |
| supervisor | all of the above, plus stock |

| Method and path | Purpose |
| --- | --- |
| `POST /auth/login` | Sign in (rate-limited) |
| `GET /me` | User, permissions, warehouses |
| `GET /fulfilments?warehouseId&status&limit` | Queue, oldest first |
| `GET /fulfilments/:id` | Detail with status history |
| `GET /scan/fulfilment/:code` | Look up by scanned pick slip |
| `POST /fulfilments/:id/accept`, `/reject {reason}` | Accept. Reject releases stock and re-allocates. |
| `POST /fulfilments/:id/picking/start`, `/picking/scan {barcode, quantity}`, `/picking/complete` | Picking |
| `POST /fulfilments/:id/qc {result, notes?, failures?}` | Quality check |
| `POST /fulfilments/:id/pack {orderCode, scans[], weightKg, lengthCm, breadthCm, heightCm}` | Packing |
| `POST /fulfilments/:id/label {packageCode, courierId?, manual?}` | Courier booking, AWB and label (retry-safe) |
| `POST /fulfilments/:id/label/verify {awb}` | Label applied to the right box |
| `GET/POST /manifests`, `POST /manifests/:id/scan {awb}`, `POST /manifests/:id/close {courierExecutive}` | Manifest and handover |
| `GET /stock?warehouseId&sku`, `GET /stock/ledger?warehouseId&variantId` | SKU lookup, ledger |
| `POST /stock/operations` | `receive`, `adjust`, `damage`, `write_off`, `transfer` |
| `PATCH /stock/:id/bin {binCode}` | Rack/bin placement shown on pick lines |
| `GET /returns/lookup?awb|orderNumber`, `POST /returns/:orderId/inspect` | Return receipt and inspection |

Floor app support: `GET /summary?warehouseId` (live work by status, open
manifests, dispatched today, damaged units, oldest waiting), `GET
/destinations` (transfer targets; stock permission), `GET
/catalog/lookup?sku` (variant by scanned SKU, for receiving an item the
warehouse has never held; no prices). Stock rows carry product and variant
titles, and `GET /fulfilments/:id` includes the courier label (AWB, carrier,
label URL).

## Warehouse app (`apps/warehouse`)

A scanner-first, mobile-first single-page app for floor staff, on port 7101
(`WAREHOUSE_CORS` must list its origin). It uses the admin's operational
palette, in light and dark.

| Screen | What happens there |
| --- | --- |
| Orders | Live counts per stage (Incoming, Pick, Inspect, Pack, Label, Dispatch), refreshed every 15 s. Scan a pick slip to jump to its order. |
| Order (work screen) | Shows only the current step, and only if the user's role allows it: accept or decline (with reason); start picking and scan each SKU; quality check (pass, or per-item failures with reasons); packing (slip scan, unit scans checked against the order, weight and size); label (print the parcel barcode, scan it to book the courier; without a courier integration, record the AWB from the courier's portal); scan the AWB on the applied label. Pick slip printout with a barcode and bin order. Status history. |
| Dispatch | Labelled parcels grouped by courier. Create a manifest (requests the courier pickup and links the courier's manifest PDF), scan each AWB at the dock, close with the courier executive's name. |
| Stock | SKU lookup with every bucket. Rack/bin per variant. Ledger per variant. Supervisors record receiving, count corrections, damage, write-offs and transfers. |
| Returns | Find the return by reverse AWB or order number, grade each unit sellable or damaged, record the inspection. |

Scanning: handheld and ring scanners act as a keyboard (they type the code
and press Enter), which is the primary input. Where the browser has the
Barcode Detection API (Chrome on Android, ChromeOS and macOS) a camera button
scans with the device camera. The camera runs only while that dialog is open,
and the nginx config allows camera use on this origin only. Each scan gives a
toast plus a tone and vibration: a short high tone for success, a low
buzz for a refusal.

Printing: the pick slip and parcel label are printed from the browser with
Code 128 barcodes generated in `src/lib/code128.ts`. The encoder is unit
tested, and was checked against an independent decoder (zxing-cpp), which
read back all 96 set-B characters. The courier's own shipping label is the
PDF Shiprocket returns.

Tests: `npm test` (barcode encoder) and `npm run test:e2e`. The browser tests
run the real API on its own database (`everwear_e2e_warehouse`, reset on each
run) with the courier stand-in, place a COD order through the store API, and
take it across the floor in Chrome:

- a picker can't accept;
- wrong-size pick and wrong-item pack scans are refused;
- courier booking, label check, manifest, dock scan, dispatch;
- stock and ledger afterwards;
- a return graded one sellable and one damaged;
- phone layout.

axe-core checks run in light and dark.

Deployment: `apps/warehouse/Dockerfile` (nginx on 7101) and the `warehouse`
service in `docker-compose.prod.yml`, served at `warehouse.everwear.com` by
the edge proxy, with the login route rate-limited like the others. The TLS
certificate must cover `warehouse.everwear.com`.

## Admin API additions (`/admin`)

| Method and path | Who |
| --- | --- |
| `GET/POST /warehouse-users`, `PATCH /warehouse-users/:id` | read: owner, store_admin, inventory_manager; write: owner, store_admin |
| `GET /fulfilments?warehouseId&status&orderId&page&limit` (with counts by status), `GET /fulfilments/:id` (with history and ledger) | any admin |
| `POST /fulfilments/:id/reassign {warehouseId, reason}` | owner, store_admin, order_manager, inventory_manager; audited |
| `POST /orders/:id/allocate {warehouseId?}` | same; audited |
| `GET /orders/:id/history` | any admin |
| `GET /stock-levels`, `GET /stock-ledger` | any admin |
| `POST /stock-operations`, `POST /stock-levels/opening-balance` | owner, store_admin, inventory_manager; audited |
| `PATCH /warehouses/:id` | now also takes `serviceAreas`, `priority`, `acceptsOrders`, `shiprocketPickupLocation` |

## Collections and indexes

| Collection | Indexes |
| --- | --- |
| `stock_levels` | `{variantId, warehouseId}` unique; `{warehouseId, sku}` |
| `stock_ledger` (append-only) | `{warehouseId, createdAt}`, `{variantId, createdAt}`, `{ref.id}` |
| `fulfilments` | `{orderId, warehouseId}` unique where `active`; `{code}` unique; `{warehouseId, status, createdAt}`; `{awb}` sparse |
| `manifests` | `{code}` unique; `{warehouseId, status}` |
| `warehouse_users` | `{email}` unique |
| `status_events` (append-only) | `{entityId, at}`, `{orderId, at}` |
| `shipments` | `one_live_parcel_per_order` replaced by `one_live_parcel_per_fulfilment` `{orderId, isReturn, fulfilmentId}` (dropped and recreated on start) |

Retention: the ledger and status events are permanent business records. No
TTL is applied.

## Configuration

| Variable | Purpose |
| --- | --- |
| `WAREHOUSE_CORS` | Browser origins of the warehouse app (`apps/warehouse`, port 7101 in development) |
| `VITE_API_URL` (apps/warehouse) | API base URL baked into the warehouse app build |
| Warehouse `shiprocketPickupLocation` | That building's pickup nickname on Shiprocket. Without it, bookings fall back to `SHIPROCKET_PICKUP_LOCATION`. Each must be created on the Shiprocket dashboard first. |

## Tests

`apps/backend/test/fulfilment.test.ts` (26 tests, against the provider stub)
covers:

- receiving and the ledger;
- cross-warehouse and role refusals;
- below-zero adjustments;
- the product-page overwrite guard;
- opening balance;
- prepaid order -> nearest warehouse -> wrong-size pick refused -> QC -> pack scan checks -> Shiprocket AWB and label from the warehouse pickup address -> manifest and dock scans -> dispatch -> courier webhook delivery, with duplicate webhook ignored -> completed;
- return -> approval -> inspection restock -> refund;
- COD order from Delhi staying open until cash is settled;
- split fulfilment;
- rollback when split is off;
- six concurrent checkouts for one unit;
- decline and re-allocate;
- audited reassignment;
- cancel releasing stock exactly once;
- failed QC write-off and replacement;
- token audiences, suspension and login.

## Not in Phase 1

Each later phase builds on the models here:

- **Phase 2 (done):** the `apps/warehouse` app, described above. Admin
  screens for warehouse staff, fulfilments and stock are still API-only and
  come with the admin work in Phase 7.
- **Phase 3 (done):** own delivery fleet and `apps/rider`; see
  [FLEET.md](./FLEET.md). It also added RTO receiving at the warehouse
  (`/warehouse/rto/:awb`), for courier parcels too.
- **Phase 4 (done):** returns and exchanges; see [RETURNS.md](./RETURNS.md).
- **Phase 5 (done):** notifications; see [NOTIFICATIONS.md](./NOTIFICATIONS.md).
- **Phase 6:** seller marketplace (`apps/seller`): KYC, seller-fulfilled
  orders, commissions and settlements.
- **Phase 7:** a direct Delhivery adapter behind the same shipping interface,
  logistics analytics dashboards, and admin UI for all of the above.
