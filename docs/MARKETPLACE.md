# Marketplace sellers

Last updated: 2026-11-05. Phase 6 of the logistics programme.

## Two kinds of seller

| | Seller-fulfilled (`fulfilmentModel: "seller"`) | Store-fulfilled (`"platform"`) |
| --- | --- | --- |
| Stock lives | At the seller's pickup address, which becomes a seller-owned warehouse on approval | In the store's warehouses, sent in against an advance shipping notice (ASN) |
| Orders are packed by | The seller, in the Seller Hub (or the warehouse app, if given accounts for their location) | The store's warehouse staff |
| Fees | Commission + GST | Commission + GST + a fulfilment fee per unit + GST |

Both kinds use everything already built:

- allocation, reservations and the stock ledger;
- courier booking (from the seller's own Shiprocket pickup location);
- own-fleet delivery where zones exist;
- returns, which go back to the seller's address for seller-fulfilled orders;
- notifications.

**Allocation:** lines a seller ships themselves go only to that seller's
warehouse; everything else goes only to the store's warehouses. A mixed order
splits by who ships it, even when split fulfilment is otherwise off
(`lib/fulfilment/allocate.ts`).

## Onboarding and KYC

1. The seller signs up (`/seller/auth/register`) and enters their details:
   - business type and legal name;
   - PAN: format checked, including the holder-type letter;
   - GSTIN: the official mod-36 check character, a valid state code, and the
     embedded PAN must match the seller's PAN;
   - registered address;
   - bank account: IFSC format checked, the number stored encrypted
     (AES-256-GCM) with only the last 4 digits shown;
   - for seller-fulfilled, a pickup address.
2. The seller submits, which locks their details.
3. The store verifies each item (PAN, GSTIN if given, bank). Viewing the full
   bank number is limited to finance and the owner, and audited.
4. Approval creates a seller-fulfilled seller's warehouse (with their GSTIN)
   and can set a commission override and the Shiprocket pickup location
   nickname.
5. Suspension takes listings off sale at once and stops their warehouse
   taking orders. Re-approval restores both.

Online format checks are not government verification. Checking a PAN or
GSTIN against the tax portal, or a penny-drop bank check, needs a KYC
provider (for example Karza, Signzy or Cashfree); the store team checks
documents by hand until then.

## Listings

- Sellers create listings (title, description, category, photos, sizes and
  colours, SKU and price per variant) as drafts and submit them for review.
- The store approves (the listing is published at once) or rejects with a
  note.
- SKUs are unique across the whole catalogue, because the warehouse scans
  them.
- A live listing can change only its prices. Other changes go through the
  store.
- Stock never comes from the listing form; only the stock ledger sets it.

## Orders (seller-fulfilled)

1. **Accept**, within `acceptSlaHours`, or **decline** with a reason (counted
   in performance).
2. **Pack:** one declared step that runs the same guarded workflow (pick each
   unit, check, pack with weight and size), recorded under the seller's name.
3. **Ship:** book through the store's courier account from the seller's
   pickup location, or enter the AWB of a parcel booked elsewhere.
4. **Hand over** to the courier's pickup person, with their name (manifest,
   scans, close).
5. **Customer details:** the seller never sees the customer's phone or
   email. The delivery address appears only from packing until handover, to
   go on the parcel.

## Invoices

Each issuer invoices for its own items:

- a seller, in their name and GSTIN (`SEL-0007/INV-2026-1042`);
- the store, for its own items and the delivery charge.

The discount (and tax, for tax-exclusive prices) is shared by line value,
and the store's invoice takes the rounding, so the invoices add up exactly to
the order total. `GET /store/orders/:id/invoice` returns the store's invoice,
with the sellers' invoices in `sellerInvoices`. Orders with no seller items
are unchanged: one invoice.

## Money

The ledger (`seller_ledger`) is immutable, one line per order line, kind and
cause, with a unique key so nothing posts twice. On delivery of a seller's
item:

| Kind | Amount |
| --- | --- |
| `sale` | + what the customer paid for the item: its share of the order total after discount, delivery excluded |
| `commission` | − sale x commission % (seller override or default) |
| `commission_gst` | − commission x fee GST % |
| `fulfilment_fee`, `fulfilment_fee_gst` | − per unit, store-fulfilled only |
| `tcs` | − taxable value x TCS % (GST section 52) |
| `tds` | − sale x TDS % (Income Tax section 194-O) |

- **Refunds:** a refunded return reverses these lines for the returned units.
  The fulfilment fee stays.
- **When lines become payable:** after the return window (from delivery), and
  for sales, once the order is paid. A COD order counts as paid once its cash
  is reconciled.
- **Settlements** (`POST /admin/settlements/run`, finance or owner):
  - gather each seller's payable lines;
  - a seller whose total is zero or less waits for the next run;
  - lines are claimed in a transaction, so two runs can't pay twice.
- **Payouts:** finance pays by bank transfer and records the UTR
  (`POST /admin/settlements/:id/paid`). Automatic payouts need a payout
  provider (e.g. RazorpayX); the encrypted bank details are ready for one.

**Defaults** (`PATCH /admin/marketplace/settings`, owner):

- commission 15% (placeholder);
- fulfilment fee ₹30 per unit (placeholder);
- GST on fees 18%;
- TCS 0.5% (the rate since 10 July 2024);
- TDS 0.1% (the rate since 1 October 2024);
- accept within 24 hours, dispatch within 48 hours of accepting.

**Confirm the statutory rates with the store's tax adviser.** TCS also
requires the store to file GSTR-8. The ledger records what was deducted per
seller; producing the GSTR-8 and 26Q filings themselves isn't built.

## Performance

`GET /seller/performance` and `GET /admin/sellers/:id/performance`, computed
from the fulfilments, status history, returns and ledger:

- orders;
- accepted, and accepted late against the SLA, with the median hours;
- dispatched, and dispatched late, with the median hours;
- declined;
- waiting to accept;
- undelivered (RTO);
- sales, units sold and returned, and the return rate;
- fees and net.

## Store-fulfilled sellers: sending stock

1. The seller creates an ASN (warehouse, items, units) and marks it sent
   (courier, AWB).
2. The warehouse scans the ASN code in the warehouse app (Stock > Seller
   stock arriving) and counts each line.
3. Only counted units become stock, through the ledger (reference: the ASN
   code).
4. Receiving more than announced is refused. The ASN closes when everything
   is received, or the warehouse closes it short.

## API

**Seller hub (`/seller`, CORS `SELLER_CORS`, token audience `everwear:seller`, 24 hours):**

| Area | Endpoints |
| --- | --- |
| Account | `POST /auth/register`, `POST /auth/login`; `GET /me`, `PUT /me/kyc`, `POST /me/kyc/submit` |
| Listings | `GET /categories`; `POST /uploads`; `GET/POST /listings`, `GET/PUT /listings/:id`, `POST /listings/:id/submit` |
| Stock | `GET /stock`, `POST /stock/operations` (seller-fulfilled) |
| Sending stock | `GET /store-warehouses`, `GET/POST /inbound`, `POST /inbound/:id/shipped` (store-fulfilled) |
| Orders | `GET /sales`; `GET /orders`, `GET /orders/:id`, `POST /orders/:id/accept`, `/decline`, `/pack`, `/ship`; `POST /handover` |
| Returns | `GET /returns`, `POST /returns/:id/inspect` |
| Money and reports | `GET /balance`, `GET /ledger`, `GET /settlements`, `GET /performance` |

**Admin (`/admin`):**

| Area | Endpoints |
| --- | --- |
| Settings | `GET/PATCH /marketplace/settings` |
| Sellers | `GET /sellers`, `GET /sellers/:id`, `GET /sellers/:id/bank` (finance, audited), `POST /sellers/:id/verify/:item`, `POST /sellers/:id/approve`, `POST /sellers/:id/suspend`, `/reject`, `GET /sellers/:id/performance` |
| Listings | `GET /listings/review`, `POST /listings/:id/approve`, `/reject` |
| Settlements | `GET /settlements`, `POST /settlements/run`, `POST /settlements/:id/paid` |

**Warehouse:** `GET /warehouse/inbound/:code`, `POST /warehouse/inbound/:code/receive`.

## Indexes

| Collection | Indexes |
| --- | --- |
| `sellers` | `email`, `phone`, `code` unique; `gstin` unique where present; `status` |
| `seller_ledger` | `key` unique; `{sellerId, status, payableFrom}`; `orderId` |
| `seller_settlements` | `code` unique; `{sellerId, createdAt}` |
| `inbound_shipments` | `code` unique; `{sellerId, createdAt}` |
| `products` | `{sellerId, review.status}` |
| `warehouses` | `sellerId` (sparse) |
| `invoices` | `{orderId, sellerId}` |

## Seller Hub (`apps/seller`, port 7301)

| Screen | What it does |
| --- | --- |
| Overview | Onboarding checklist and KYC until approved; then to-do counts by stage against the SLAs, sales, return rate and balance |
| Listings | Editor with photo upload, sizes and colours expanded into variants with SKU and price; submit for review |
| Stock | Levels; goods in, counts and damage (seller-fulfilled); shipping notices (store-fulfilled) |
| Orders | By stage; accept or decline, pack, book or enter AWB, printable address label, hand over |
| Sales | Lines for your items |
| Returns | Grade returned units (seller-fulfilled) |
| Payments | Payable, waiting, paid out; settlements with UTR; itemised ledger |
| Performance | 30 or 90 days |

Production: `apps/seller/Dockerfile`, the `seller` compose service, and
`sellers.everwear.com` behind the edge proxy, with rate-limited login and
sign-up.

## Tests

- **`apps/backend/test/marketplace.test.ts` (14 tests):**
  - KYC checks: holder type, GSTIN check character, GSTIN/PAN mismatch;
  - bank encryption, and finance-only audited viewing;
  - verification before approval, and the seller warehouse;
  - listing review, unique SKUs, and price-only changes once live;
  - seller stock;
  - the ASN with over-receipt refused and a short close;
  - a mixed order split three ways, with invoices adding up exactly;
  - the seller's own fulfilment, with the address only once packed and no
    customer phone;
  - delivery posting exact amounts for both seller kinds, without
    double-posting;
  - nothing payable inside the window, one settlement per seller, no double
    payout, UTR checks;
  - a returned item inspected by the seller, its stock back and its lines
    fully reversed;
  - performance;
  - suspension and re-approval;
  - token separation.
- **`apps/seller/e2e` (4 browser tests):**
  - applying, with KYC errors shown and details locked after submission;
  - accept, pack, address after packing, AWB, hand over;
  - a listing with a real photo upload, sent to review;
  - stock in, payments and performance, with the phone layout.

  axe accessibility checks run throughout.

## Not done yet

- **Admin screens:** seller review, listing review, settlements and
  marketplace settings are API-only; they come with the admin work.
- **Government checks:** PAN/GSTIN against the tax portal and penny-drop bank
  verification need a KYC provider.
- **Automatic payouts** (RazorpayX or similar).
- **Tax filings:** GSTR-8 and TDS filing exports.
- **Seller staff:** one login per seller; multiple staff accounts with roles
  are a later step.
- **Seller invoices on the storefront:** the invoice page shows the store's
  invoice; the sellers' invoices are in the API response but not yet
  rendered on that page.
