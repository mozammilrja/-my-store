# AGENTS.md

## Overview

Everwear: an online clothing store for India (one region, prices in INR). A Turborepo monorepo (npm workspaces) with three apps:

| App | Package | What it is | Dev URL |
| --- | --- | --- | --- |
| `apps/backend` | `@dtc/backend` | Everwear API: catalog, carts, checkout, orders, customers and admin endpoints. Node 22, Express 5, MongoDB, Zod. | http://localhost:9100 |
| `apps/storefront` | `@dtc/storefront` | Shop front. Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui + ReUI. | http://localhost:8001 |
| `apps/operations` | `@dtc/operations` | The operations portal: one role-based app with one sign-in for admins (`/admin`: dashboard, orders, products, customers, returns, finance, warehouses, fleet, COD, marketplace, notifications, analytics), warehouse floor staff (`/warehouse`: picking, packing, labels, dispatch, stock, returns), own-fleet riders (`/delivery`: offers, OTP and proof of delivery, cash, earnings) and marketplace sellers (`/seller`: listings, stock, orders, returns, payments). React 19, Vite 6, React Router 7, TanStack Query, Tailwind 3. Replaced the separate admin, warehouse, rider and seller apps. | http://localhost:7001 |

The project started from the Medusa DTC starter and has since moved off Medusa. Medusa and PostgreSQL are no longer part of the running stack; the only remaining link is the one-off `migrate:medusa` script that copies data out of an old Medusa database. Ignore Medusa docs, skills and the `@medusajs/*` package `AGENTS.md` files unless you are working on that script.

**`apps/operations` is a Vite single-page app**, not Next.js: `index.html` boots `src/main.jsx`, which routes `/admin/*` to the admin (`src/App.jsx`, modules from `src/routes.jsx`, JSX) and `/warehouse/*`, `/delivery/*`, `/seller/*` to the areas in `src/areas/<area>/` (TypeScript). Sign-in, the session, the account menu and the area guard are `src/portal/`. Every call carries the portal session (an httpOnly cookie) and the `X-Everwear-Ops` header through `src/portal/client.ts`; there are no tokens in `localStorage`. It has no server side, so anything it shows must come from an endpoint the API already exposes. Design, role matrix, deployment and rollback: [`docs/OPERATIONS_PORTAL.md`](./docs/OPERATIONS_PORTAL.md).

Architecture, design tokens and known issues: [`docs/PROJECT.md`](./docs/PROJECT.md).

## Where to Look

| Task | Location |
| --- | --- |
| Store API route (shopper-facing) | `apps/backend/src/routes/store/<area>.ts`, mounted in `src/app.ts` under `/store` |
| Admin API route | `apps/backend/src/routes/admin/<area>.ts`, mounted under `/admin` behind `requireAdmin` (`auth`, `orders`, `products`, `store`, `settings`, `users`) |
| App setup: CORS, body limits, error shape, uploads | `apps/backend/src/app.ts` |
| Environment settings (validated at startup) | `apps/backend/src/env.ts`, documented in `apps/backend/.env.template` |
| Data model, collections, indexes | `apps/backend/src/db/schema.ts` (types + `db.<collection>()` accessors + `ensureIndexes`) |
| MongoDB connection, transactions | `apps/backend/src/db/client.ts` (`connect`, `getDb`, `withTransaction`) |
| Auth, tokens, password hashing, rate limits | `apps/backend/src/lib/auth.ts` |
| API errors | `apps/backend/src/lib/errors.ts` (`notFound`, `badRequest`, `unauthorized`, ...) |
| Shared request validation | `apps/backend/src/lib/validation.ts` |
| Order totals, regions, IDs, response shaping | `apps/backend/src/lib/{totals,regions,ids,serialize}.ts` |
| One-off scripts | `apps/backend/scripts/` |
| Warehouse fulfilment: stock ledger, allocation, pick/pack/dispatch, returns inspection | `apps/backend/src/lib/{inventory,fulfilment,returns,state}/`; floor API `src/routes/warehouse/`, admin API `src/routes/admin/fulfilment.ts`; design in [`docs/FULFILMENT.md`](./docs/FULFILMENT.md) |
| Status changes (order, payment, fulfilment, return) | `apps/backend/src/lib/state/machines.ts`: legal moves plus the `status_events` history |
| Backend tests | `apps/backend/test/*.test.ts` |
| Storefront API calls | `apps/storefront/src/lib/api/client.ts` (server-only fetch wrapper) and `src/lib/data/*.ts` |
| Storefront UI | `apps/storefront/src/modules/<feature>/`, routes in `src/app/[countryCode]/` |
| Storefront e2e tests | `apps/storefront/e2e/` |
| Operations portal sign-in, session, roles | API: `apps/backend/src/routes/ops/auth.ts`, `src/lib/ops-session.ts` (cookie session, revocation), `src/lib/ops-access.ts` (portal roles and areas); portal: `apps/operations/src/portal/` |
| Admin API client | `apps/operations/src/lib/api.js` (`adminApi`), plus one `src/lib/api-<area>.js` per operations area (warehouses, fleet, notifications, marketplace) |
| Admin pages | `apps/operations/src/components/<area>/*.jsx` (JSX), served under `/admin`; every module route and the sidebar come from `src/routes.jsx` |
| Admin list tables (search, filters, paging) | `apps/operations/src/components/shared/DataTable.jsx` with `src/hooks/useClientTable.js` / `useServerTable.js` |
| Admin operations browser tests (warehouses, fleet, COD, notifications, marketplace, logistics) | `apps/operations/e2e/ops/*.ops.js`; `api-server.ts` runs the real API on `everwear_e2e_admin_ops` and runs each area's `seed/*.ts` |
| Portal browser tests (every role, direct URLs, sign-out, password reset) | `apps/operations/e2e/portal/` (`api-server.ts` runs the real API on `everwear_e2e_portal` with a local SMTP server) |
| Warehouse floor screens | `apps/operations/src/areas/warehouse/routes/` (orders, fulfilment work screen, dispatch, stock, returns); API client `lib/api.ts`, types `lib/types.ts` |
| Warehouse scanning and printing | `apps/operations/src/areas/shared/scan-field.tsx` (keyboard-wedge scanners, camera through the Barcode Detection API), `src/areas/warehouse/lib/code128.ts` (pick slip and parcel barcodes) |
| Warehouse, delivery and seller browser tests | `apps/operations/e2e/areas/` (one real API per area: `everwear_e2e_warehouse`, `everwear_e2e_rider`, `everwear_e2e_seller`) |
| Courier integrations: Shiprocket, Delhivery direct, comparing quotes | `apps/backend/src/lib/shipping/` (`service.ts` one interface for both, `shiprocket.ts`, `delhivery.ts`, `status.ts` status mapping); design in [`docs/PAYMENTS_AND_SHIPPING.md`](./docs/PAYMENTS_AND_SHIPPING.md) |
| Logistics analytics | `apps/backend/src/lib/analytics/logistics.ts`, `GET /admin/analytics/logistics`; definitions in [`docs/LOGISTICS_ANALYTICS.md`](./docs/LOGISTICS_ANALYTICS.md) |
| Marketplace sellers: KYC, listings, seller warehouses, ledger, settlements, ASN | `apps/backend/src/lib/marketplace/`; seller API `src/routes/seller/`, admin API `src/routes/admin/marketplace.ts`; design in [`docs/MARKETPLACE.md`](./docs/MARKETPLACE.md) |
| Notifications: email, SMS, WhatsApp, push | `apps/backend/src/lib/notify/` (`index.ts` recipients, queue and worker; `templates.ts` wording and template variables; `providers/` one file per channel); admin API `src/routes/admin/notifications.ts`; design in [`docs/NOTIFICATIONS.md`](./docs/NOTIFICATIONS.md) |
| Returns and exchanges: rules, refunds, replacement orders | `apps/backend/src/lib/returns/` (`returns.ts` rules and lifecycle, `resolve.ts` decisions, `inspect.ts` warehouse grading); design in [`docs/RETURNS.md`](./docs/RETURNS.md) |
| Own delivery fleet: zones, riders, dispatch, OTP delivery, cash, RTO | `apps/backend/src/lib/fleet/`; rider API `src/routes/rider/`, admin API `src/routes/admin/fleet.ts`; design in [`docs/FLEET.md`](./docs/FLEET.md) |
| Rider screens | `apps/operations/src/areas/delivery/routes/` (today, task, money, profile, register); location sharing in `lib/session.tsx` |
| Seller Hub screens | `apps/operations/src/areas/seller/routes/` (overview, listings, stock, orders, sales and returns, money, register) |

## Directory Structure

```text
.
├── apps/
│   ├── backend/                # Everwear API (@dtc/backend)
│   │   ├── src/
│   │   │   ├── index.ts        # Starts the server
│   │   │   ├── app.ts          # Express app: middleware, routes, error handler
│   │   │   ├── env.ts          # Zod-validated environment
│   │   │   ├── db/             # MongoDB client and schema
│   │   │   ├── lib/            # auth, errors, validation, totals, regions, serialize, ids
│   │   │   └── routes/         # store/* and admin/* routers
│   │   ├── scripts/            # create-admin, migrate-from-medusa, localize-catalog
│   │   ├── test/               # node:test suites against a real MongoDB
│   │   └── uploads/            # Uploaded product images (served at /uploads)
│   ├── storefront/             # Next.js shop (@dtc/storefront)
│   │   ├── e2e/                # Playwright suites
│   │   └── src/
│   │       ├── app/            # App Router routes (under [countryCode]/)
│   │       ├── components/     # ui/ (shadcn), reui/, store/
│   │       ├── lib/            # api/ client, data/ fetchers, util/
│   │       └── modules/        # Feature UI: shell, home, catalog, product, bag, checkout, account, policies, common
│   └── operations/             # Operations portal SPA (@dtc/operations)
│       ├── index.html          # Vite entry point
│       ├── e2e/                # Playwright: admin views, ops/ (admin areas), areas/ (floor, delivery, seller), portal/
│       └── src/
│           ├── main.jsx        # Router: /login, /admin/*, /warehouse/*, /delivery/*, /seller/*, /account
│           ├── portal/         # Sign-in, session, guard, account menu, breadcrumbs, quick switch, account page
│           ├── App.jsx         # The admin (under /admin); modules in routes.jsx, components/, lib/
│           └── areas/          # warehouse/, delivery/, seller/ (TypeScript) and shared/ (UI kit, API factory)
├── docs/PROJECT.md             # Architecture, design system, known issues
└── turbo.json                  # Task graph: build, dev, start, lint, test, typecheck
```

Each app can have its own nested `AGENTS.md`; agents read the nearest one, so put app-specific detail there rather than growing this file.

## Package Manager

npm (`"packageManager": "npm@10.9.7"` in the root `package.json`, lockfile `package-lock.json`). Use npm for everything and never create another lockfile. Install a dependency inside the app that needs it:

```bash
cd apps/<app> && npm install <pkg>
```

## Setup

Prerequisites: Node.js 22+, npm 10+, and MongoDB running as a **single-node replica set** (orders and stock use multi-document transactions, which need one). The default URI expects a local Docker MongoDB with replica set `rs0`.

```bash
npm install
cp apps/backend/.env.template apps/backend/.env            # set JWT_SECRET (32+ chars)
cp apps/storefront/.env.template apps/storefront/.env.local
cd apps/backend && npm run admin:create -- <email> <password> ["Name"]
```

Backend settings (`apps/backend/.env`): `PORT`, `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `STORE_CORS`, `ADMIN_CORS`, `API_PUBLIC_URL`, `UPLOADS_DIR`. The process exits at startup if any are missing or invalid.

Storefront settings (`apps/storefront/.env.local`): `EVERWEAR_API_URL` (server-side only), `NEXT_PUBLIC_API_PUBLIC_URL`, `NEXT_PUBLIC_DEFAULT_REGION`, `NEXT_PUBLIC_BASE_URL`.

## Commands

From the repo root:

```bash
npm run dev                 # all apps
npm run backend:dev         # API only (tsx watch)
npm run operations:dev      # operations portal only (Vite)
npm run storefront:dev      # storefront only
npm run build               # all apps
npm run lint                # all apps via turbo
```

Backend (from `apps/backend`):

```bash
npm run dev                  # watch mode on PORT (9100)
npm run typecheck            # tsc, no emit
npm run build && npm start   # compile to dist/ and run
npm test                     # node:test suites; needs MongoDB
npm run admin:create -- <email> <password> ["Name"]
npm run migrate:medusa       # one-off: copy catalog and data from an old Medusa PostgreSQL DB
npm run catalog:localize     # one-off catalog localization pass
```

The test suites drop and recreate their own databases (`everwear_test`, `everwear_test_admin`) on the configured MongoDB. Never point them at a production server.

Operations portal (from `apps/operations`):

```bash
npm run dev                       # Vite dev server on 7001 (needs the API on 9100)
npm run typecheck                 # tsc over src/portal and src/areas
npm test                          # unit tests (code128)
npm run build && npm run preview
npx playwright test               # admin view specs (e2e/*.spec.js)
npm run test:e2e:ops              # admin operations areas, each on a throwaway API and database
npm run test:e2e:ops -- fleet     # one area
npm run test:e2e:areas            # warehouse, delivery and seller workflows (AREA=<name> for one)
npm run test:e2e:portal           # every role: landing, direct URLs, sign-out, sessions, password reset
```

The operations suite starts its own API (`everwear_e2e_admin_ops`, reset each run) and Vite server for each area, seeded with only that area's records (`e2e/ops/seed/<nn>-<area>.ts`), because each spec checks exact counts in its own data. `OPS_SLOT=1..9` gives a run its own ports and database so runs can overlap. The area and portal suites also start their own APIs and databases. The browser must reach the API and the portal on the same site (`localhost` for both, never `127.0.0.1` for one of them): the session cookie is `SameSite=Strict`.

Signing in needs an account: admins from `npm run admin:create` (apps/backend); floor staff from Admin → Warehouse Operations; riders and sellers register at `/delivery/register` and `/seller/register` and are approved in the admin. `npm run ops:audit` (apps/backend) reports accounts per kind and emails shared between kinds, read-only.

Storefront (from `apps/storefront`, with the API running):

```bash
npx tsc --noEmit
npm run lint
npx playwright test                    # e2e/*.spec.ts, desktop + mobile
npx playwright test e2e/a11y.spec.ts   # axe WCAG 2.2 AA scans
```

The checkout and account e2e tests create real orders and customers in the local database. The storefront's production build reads the sitemap from the API, so the API must be running during `next build`.

## Conventions

### Backend

- **ESM with explicit `.js` import suffixes** (`import { env } from "./env.js"`), even from `.ts` files.
- **Routing:** add an Express router in `src/routes/store/` or `src/routes/admin/` and mount it in `src/app.ts`. Admin routers sit behind `requireAdmin`.
- **Validate every request body and query with Zod.** A thrown `ZodError` becomes a 400 automatically.
- **Errors:** throw the helpers from `src/lib/errors.ts`. Every error response has the shape `{ error: { code, message } }`. Never send stack traces or internal messages to clients; unknown errors become a generic 500.
- **Money is always an integer in the currency's minor unit** (cents, paise). `prices` maps a lowercase ISO currency code to that amount. Never store or compute money as floats.
- **Database access** goes through the `db.<collection>()` accessors in `src/db/schema.ts`. Add new indexes to `ensureIndexes`. No ORM.
- **Anything that must be all-or-nothing** (placing an order, moving stock) runs inside `withTransaction`.
- **CORS is split by audience:** `/store` accepts only `STORE_CORS` origins. `/ops`, `/admin`, `/warehouse`, `/rider` and `/seller` accept the operations portal's origins (`OPS_CORS`, or `ADMIN_CORS` when unset), plus each realm's own optional list. A new frontend origin must be added to the right list in `.env.template`.
- **Auth:** customers get signed JWTs (`issueToken`) sent as `Authorization: Bearer <token>`. Operational users sign in once at `POST /ops/auth/login`, which opens a server-side session (httpOnly `everwear_ops` cookie, SHA-256 stored in `ops_sessions`) for every account of that email whose password matches. `requireAuth("admin" | "warehouse" | "rider" | "seller")` accepts that session (with the `X-Everwear-Ops: 1` header) or a bearer token for the realm; each realm's loader still checks its own account (status, `sessionsRevokedAt`) on every request. Never take a role from the request: portal roles are derived in `lib/ops-access.ts`. Rate-limit login-style endpoints with `rateLimit`; write sensitive admin actions to the audit log with `lib/audit.ts`.

### Storefront

- **Call the API only from the server**, through `src/lib/api/client.ts` (marked `server-only`) and the fetchers in `src/lib/data/`. Never expose `EVERWEAR_API_URL` to the browser.
- Catalog reads may be cached briefly; carts, accounts and orders are always `no-store`.
- UI is built from shadcn/ui and ReUI components (`components.json`, style `radix-sera`, registry `@reui`). Follow the ReUI skill when adding UI.

### Operations portal

- The admin half (`src/App.jsx`, `src/components/`, `src/lib/`) is JSX on the admin's Tailwind 3 tokens (`tailwind.config.js`, `src/index.css`). The areas (`src/areas/`) are TypeScript on the same Tailwind build, using the palette they were built with (`canvas`, `panel`, `ink`, `line`, `ok`/`warn`/`bad`, `area-on-accent`, `area-info`), defined in the same two files. Don't add a second Tailwind version.
- **Every request goes through `src/portal/client.ts`** (`portalFetch`): the admin's `src/lib/api.js` and each area's `createAreaApi` build on it. A 401 tells the portal the session ended and it shows the sign-in.
- **Links inside an area are absolute with the area prefix** (`/warehouse/dispatch`, `/admin/order-management`). The admin navigates through `onNavigate`, which adds `/admin`.
- **Each area keeps its own TanStack Query cache** (`areas/shared/AreaShell.tsx`), emptied on sign-out with the admin's.
- **What a role sees is decided by the API** (`/ops/auth/me` areas) and enforced by the API on every call; `RequireArea` only stops the page from rendering. Never hide a control as the only protection.
- **Owner-only routes** (`/admin/settings` writes, every `/admin/users` write) check `req.admin.role`; the API refuses to demote or delete the last owner.
- **List pages use `ResourceGrid`**, which pages with `page`/`limit`, searches with `q` and filters with one query parameter per `GridFilter`. A new list page supplies a path, a result key and columns, plus filters the endpoint accepts.
- **`src/components/ui/` and `src/components/reui/` are installed files.** Don't hand-edit them; the lint config reports their findings as warnings for that reason. Restyle through the tokens in `src/styles/globals.css`. After any `npx shadcn add`: rewrite the `from "cn"` imports back to `@/lib/utils` and uninstall the stray `cn` package, and re-point `ui/sonner.tsx` at `@/hooks/use-theme` and uninstall `next-themes` — the published toaster pulls in a Next.js theme library this app does not use, and leaving it in blanks the page on a stale Vite dep cache.
- Both palettes are themed: `:root` is light, `.dark` is dark, and `src/lib/theme.ts` owns the class (light, dark or the browser's choice). A no-flash script in `index.html` shares its storage key. Check any new screen in both.

## Code Style

- TypeScript everywhere, strict mode.
- No semicolons. Double quotes. 2-space indent.
- Files: kebab-case. Types and classes: PascalCase. Functions and variables: camelCase. API JSON and MongoDB fields: camelCase.
- No emojis in code, comments or commit messages.

## Common Mistakes

- Changing a warehouse-managed variant's stock any way other than `lib/inventory/stock.ts#moveStock`. The product's `stock` must equal the sum of `available` in `stock_levels`, and every move needs a ledger row.
- Exposing a delivery's address, phone or OTP beyond `riderView` in `routes/rider/index.ts`, or serving proof photos from `/uploads`. They live in `PRIVATE_UPLOADS_DIR` and go to admins only.
- Writing seller money anywhere but `seller_ledger` through `lib/marketplace/ledger.ts` (keyed lines; never edited, only reversed), or showing a seller's bank number beyond its last four digits outside the audited finance endpoint.
- Calling a messaging provider directly from a route. Use `notifyCustomer`/`notifyWarehouse`/`notifyRider` with a stable key (it de-duplicates and retries), and wrap the call in `announce()` so a notification failure can't fail the business action.
- Writing `order.returnRequest` directly. Returns live in the `returns` collection; the order field is a mirror written by `lib/returns/returns.ts#mirror`.
- Setting a fulfilment or return status with a plain `$set`. Go through the state machine helpers so the move is checked and recorded.

- Following Medusa instructions (`medusa db:migrate`, `medusa user`, `/app`, publishable keys, `@medusajs/framework`). None of that applies to the current stack.
- Running MongoDB without a replica set: transactions fail and orders cannot be placed.
- Leaving out the `.js` suffix on a backend import, which breaks the compiled `dist/` build.
- Doing money math in floats or major units instead of integer minor units.
- Calling the API from client components in the storefront instead of through `lib/data`.
- Adding a frontend origin without adding it to `STORE_CORS` or `ADMIN_CORS`.
- Installing a dependency at the repo root instead of inside the app that uses it.
- Adding a Turbo task without declaring its `outputs`.

## Off-Limits

- Build output: `dist/`, `.next/`, `.turbo/`, `test-results/`. These are regenerated.
- `node_modules/`: never edit installed packages.
- `package-lock.json`: never hand-edit or delete; it changes only through npm commands.
- `.env` and `.env.local`: never commit, print or copy secret values from them. Document new variables in the matching `.env.template`.
- `apps/backend/uploads/`: holds uploaded product images; don't delete or rewrite them.
- Don't drop or reset a MongoDB database (other than the test suites' own) without explicit confirmation.
