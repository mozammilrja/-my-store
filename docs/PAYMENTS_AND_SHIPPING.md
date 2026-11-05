# Payments and shipping

Online payments go through **Razorpay**. Parcels go through **Shiprocket** (which books Delhivery, Blue Dart, Xpressbees, Ekart and other couriers from one account), **Delhivery directly** with the store's own Delhivery account, or both: each integration is on when its credentials are set, and quotes from both are compared at booking. Nothing in either flow is simulated. Without credentials, online payment is switched off (cash on delivery still works) and shipments can only be recorded by hand. No AWB, label, scan or payment status is ever made up.

## Status

| | Verified | Not verified yet |
| --- | --- | --- |
| Razorpay | Every flow below, run against a local stand-in for the Razorpay API (`apps/backend/test/provider-stub.ts`) in `test/payments-shipping.test.ts` | Razorpay **test mode** with real keys; **live mode** |
| Shiprocket | Every flow below, against the same stand-in | Shiprocket with a real account; real courier pickups |
| Delhivery | Every flow below, against the same stand-in (`test/delhivery.test.ts`) | Delhivery **staging** with a real token; production pickups. The status mapping and NDR codes especially need checking against real scans. |

The stand-in implements only the endpoints this code calls, with request and response shapes from the providers' API docs. It proves our side of each flow (verification, idempotency, refunds, state changes). It does not prove the real providers answer the same way. That needs the sandbox runs below.

## Payments (Razorpay)

**Flow.** Checkout → `POST /store/carts/:id/payment-intent` creates a Razorpay order for the cart's exact total, computed on the server. An open one is reused, so a double click doesn't create a second. The browser opens Razorpay's checkout with the order id and the public key id only. When the shopper pays, `POST /store/carts/:id/confirm-payment`:

1. checks the checkout signature (HMAC-SHA256 of `order_id|payment_id` with the key secret);
2. checks the Razorpay order belongs to **this cart's** payment attempt;
3. **re-reads the payment from Razorpay** and requires the same order, the exact amount, and status `captured` (an `authorized` payment is captured first);
4. places the order in one transaction (stock, coupon, invoice, ledger) and marks the attempt paid.

Nothing the browser says about a payment is trusted. The same settlement code runs for the checkout callback, the webhook and reconciliation, so whichever arrives first places the order and the others return it.

**Money that can't become an order is refunded automatically.** This covers a bag that changed during payment, an item that sold out, a used-up coupon, and the same bag paid twice.

**Webhooks.** `POST /store/webhooks/razorpay`. The endpoint is refused unless `RAZORPAY_WEBHOOK_SECRET` is set and the signature matches the **raw** body. Each `x-razorpay-event-id` is applied once (unique index). A failed event returns 500, so Razorpay redelivers it, and it is applied again. Events handled: `payment.captured`, `payment.authorized`, `order.paid` (places the order if the browser never confirmed), `payment.failed`, `refund.created/processed/failed`.

**Reconciliation** runs every 2 minutes (and from Admin → Payments → *Reconcile now*). Attempts unheard of for over 2 minutes are settled from Razorpay's record of the order's payments. Unpaid attempts expire after `PAYMENT_ATTEMPT_TTL_MINUTES`. Refunds whose outcome is unknown are looked up on Razorpay.

**Refunds.** `POST /admin/orders/:id/refunds` (owner only), or the refund step of a return. A refund is recorded first, and the ceiling (total paid) is re-checked after recording, so concurrent refunds can't over-refund. Razorpay's refund id is stored. A refused refund is marked failed and changes nothing. An unknown outcome (timeout) stays `requested` until reconciliation resolves it. The order becomes `partially_refunded` or `refunded` once Razorpay accepts. A COD order records a manual cash refund; nothing is sent anywhere.

**Payment status is separate from delivery.** An online order's payment status only changes through Razorpay: the admin can't set it by hand. A COD order is `awaiting` until an admin records the cash as collected, even after delivery.

Collections: `payment_attempts` (one per Razorpay order, unique `providerOrderId`), `refunds` (unique `providerRefundId`), `payment_webhook_events` (unique `provider + eventId`), and `orders.paymentDetails`.

## Shipping (Shiprocket)

**Flow** (Admin → Orders → order → Shipment, owner only):

1. **Book with Shiprocket**: `POST /admin/orders/:id/shipments` creates the Shiprocket order. One live parcel per order (unique index); an online order must be paid first.
2. **Assign courier & AWB**: `POST /admin/shipments/:id/assign-courier`. Either Shiprocket's recommended courier, or one picked from *Compare couriers* (live rates from `GET /admin/orders/:id/couriers`).
3. **Generate label**: `POST /admin/shipments/:id/label`.
4. **Request pickup**: `POST /admin/shipments/:id/pickup`.
5. **Tracking**: Shiprocket's webhook `POST /store/webhooks/courier-tracking` (authenticated by the `x-api-key` token; each update applied once), plus a 30-minute polling sweep for missed webhooks, plus *Refresh tracking*. Scans are merged without duplicates, and status only moves forward.
6. **Cancel** before pickup: `POST /admin/shipments/:id/cancel`. Re-booking uses a new Shiprocket order reference (`1234-2`).
7. **Failed delivery (NDR)**: shown on the order. *Re-attempt* or *Return to us*: `POST /admin/shipments/:id/ndr`.
8. **Returns**: approve the return request, then *schedule pickup* books a reverse pickup to the dispatching warehouse.

Checkout calls `GET /store/shipping/serviceability?pincode=` to show the delivery window, and blocks continuing when no courier serves the pincode.

**Internal statuses** (`SHIPMENT_STATUSES` in `db/schema.ts`): pending, ready_to_ship, shipment_created, pickup_scheduled, picked_up, in_transit, out_for_delivery, delivered, delivery_failed, rto_initiated, rto_in_transit, rto_delivered, cancelled. Shiprocket status ids and labels are mapped in `lib/shipping/status.ts`. An unrecognised status is recorded as the courier's wording and changes nothing. Not every courier reports every status.

## Shipping (Delhivery direct)

The same booking screens and endpoints as Shiprocket, with `carrier: "delhivery"` (or `SHIPPING_PROVIDER=delhivery` as the default). `lib/shipping/delhivery.ts` speaks Delhivery's B2C API. Base URL `DELHIVERY_API_BASE`: `https://track.delhivery.com`, or `https://staging-express.delhivery.com` for testing. Auth is the `Authorization: Token <DELHIVERY_API_TOKEN>` header.

| Step | Delhivery API | Notes |
| --- | --- | --- |
| Quotes | `GET /c/api/pin-codes/json/?filter_codes=`, then `GET /api/kinko/v1/invoice/charges/.json` for Surface (`md=S`) and Express (`md=E`) | Both are offered as couriers 1 (Surface) and 2 (Express). An embargoed pincode, or one without COD for a COD order, gets no Delhivery quote. Delhivery gives no ETA here, so `etdDays` is empty. |
| Book | `POST /api/cmu/create.json` (form body `format=json&data=<JSON>`) | The waybill (AWB) comes back in the same call, so there's no assign step. COD amount and total in rupees, weight in grams, the seller's name, address and GSTIN (from the warehouse, the marketplace seller, or Settings). The order reference is unique: a re-booking after a cancel uses `1234-2`. A refused booking returns Delhivery's remark and frees the order. |
| Label | `GET /api/p/packing_slip?wbns=&pdf=true` | Stored as `labelUrl`. |
| Pickup | `POST /fm/request/new/` | One request per registered warehouse and day, sized to the parcel count. A manifest's parcels are batched (`schedulePickups`). "Already exists for today" counts as booked. |
| Tracking | `GET /api/v1/packages/json/?waybill=`, and the scan push to `POST /store/webhooks/courier-tracking/dlv` | The push is authenticated by `DELHIVERY_WEBHOOK_TOKEN` (`Authorization: Bearer` or `x-api-key`); each push is applied once. The same 30-minute sweep polls Delhivery parcels. Delhivery's times are IST without an offset and are read as IST. |
| Cancel | `POST /api/p/edit` `{ waybill, cancellation: "true" }` | Before pickup only. |
| NDR | `POST /api/p/update` `{ data: [{ waybill, act: "RE-ATTEMPT" }] }` | Re-attempt only. *Return to us* is refused with `courier_unsupported`: ask for the RTO in Delhivery One, and its scans then show the return here. |
| Return pickup | `create.json` with `payment_mode: "Pickup"` | Collected from the customer, delivered to the registered warehouse. A return goes back with the courier that delivered it when that integration is still on. |

**Status mapping** (`mapDelhiveryStatus` in `lib/shipping/status.ts`) uses Delhivery's StatusType and Status:

| StatusType | Status | Internal status |
| --- | --- | --- |
| UD (forward) | Manifested | shipment_created |
| UD | Not Picked | pickup_scheduled |
| UD | In Transit, Pending | in_transit |
| UD | Dispatched | out_for_delivery |
| UD | with an end-of-day NDR code (`EOD-…`) or "undelivered" wording | delivery_failed |
| DL | Delivered | delivered |
| DL | RTO | rto_delivered |
| DL | DTO (a reverse pickup back at the warehouse) | delivered |
| RT | any | rto_in_transit |
| PP | any | pickup_scheduled |
| PU | picked up and moving | in_transit |
| CN | any | cancelled |
| LT (lost) | any | delivery_failed |

Anything else changes nothing. Validate these against real staging scans before going live.

**Pickup names:** each warehouse can carry `delhiveryPickupLocation`: its name exactly as registered on Delhivery. It falls back to `DELHIVERY_PICKUP_LOCATION`. A marketplace seller's own location gets one at approval.

**Comparing quotes.** `GET /admin/orders/:id/couriers` asks every configured integration at once. It returns all quotes cheapest first, each with its `provider`; `recommended` is the default integration's own pick. An integration that fails to answer is listed in `unavailable` and leaves out its quotes; only all failing is an error. The shopper's checkout window uses the same quotes.

**Manual shipments.** Without Shiprocket (or for parcels booked elsewhere), *Record a shipment booked elsewhere* stores the carrier and AWB exactly as typed. Its status is then updated by an admin as the courier reports it, stamped as admin-entered.

## Setup: sandbox first

1. **Razorpay test mode.** Dashboard → Account & Settings → API Keys → generate test keys. Put them in `RAZORPAY_KEY_ID` (`rzp_test_…`) and `RAZORPAY_KEY_SECRET`.
2. **Razorpay webhook.** Dashboard → Webhooks → add `https://<public API URL>/store/webhooks/razorpay` with a secret, and the events above. Put the secret in `RAZORPAY_WEBHOOK_SECRET`. For a local API, expose it with a tunnel (for example `cloudflared tunnel --url http://localhost:9100`).
3. **Shiprocket.** Create an API user (Settings → API), add a pickup address, and set `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_PICKUP_LOCATION` and `SHIPPING_ORIGIN_PINCODE`.
4. **Shiprocket webhook.** Settings → API → Webhooks: URL `https://<public API URL>/store/webhooks/courier-tracking` and a token; put the token in `SHIPROCKET_WEBHOOK_TOKEN`.
4b. **Delhivery** (optional, alongside or instead of Shiprocket):
   - Ask Delhivery for a staging token, and register the pickup warehouse in Delhivery One.
   - Set `DELHIVERY_API_TOKEN`, `DELHIVERY_PICKUP_LOCATION` (the registered name, exactly), and `DELHIVERY_API_BASE=https://staging-express.delhivery.com`.
   - Ask Delhivery's tech team to push scans to `https://<public API URL>/store/webhooks/courier-tracking/dlv` with a token, and put the token in `DELHIVERY_WEBHOOK_TOKEN`.
   - Book a test parcel, then compare its scans with the mapping table above.
5. Restart the API. Admin → Payments → *Gateway activity* shows what is configured and in which mode.
6. Run the sandbox checklist: a successful UPI test payment, a failed payment (Razorpay test card for failure), closing the window, a refund, a booked shipment with AWB and label, and a pickup request. Then watch the webhook log in *Gateway activity*.

## Going live

Only after the sandbox checklist passes:

- Razorpay **live** keys (KYC approved, payment methods activated: UPI, cards, net banking, wallets; international cards if wanted), plus a live-mode webhook with its own secret.
- Shiprocket account KYC, a recharged wallet, the courier preferences you want, and the live webhook.
- One real low-value order end to end (pay, ship, track, refund), confirmed against the Razorpay and Shiprocket dashboards.

Until then, real-money payments and live courier operations should be treated as **not enabled**.

## Not built

- Stripe (an India-only store; Razorpay accepts international cards once enabled on the account). It can be added behind the same settlement code.
- EMI / PayLater as a separate method (Razorpay offers them inside its checkout when enabled on the account).
- A direct Blue Dart API (Shiprocket books Blue Dart). Delhivery direct is built (above). The old adapters, which generated fake AWBs, stay removed.
- Freight cost per parcel: courier invoices aren't imported, so logistics analytics shows no shipping cost.
- COD remittance reconciliation from Shiprocket (cash collected by couriers): COD orders are marked paid by an admin.
