# AGENTS.md

## Overview

Everwear: an online clothing store for Europe and India. A Turborepo monorepo (npm workspaces) with three apps:

| App | Package | What it is | Dev URL |
| --- | --- | --- | --- |
| `apps/backend` | `@dtc/backend` | Everwear API: catalog, carts, checkout, orders, customers and admin endpoints. Node 22, Express 5, MongoDB, Zod. | http://localhost:9100 |
| `apps/storefront` | `@dtc/storefront` | Shop front. Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui + ReUI. | http://localhost:8001 |
| `apps/admin` | `@dtc/admin` | Store admin: dashboard, orders, products, customers. React 19, Vite 8, React Router, TanStack Query + Table, shadcn/ui + ReUI. | http://localhost:7001 |

The project started from the Medusa DTC starter and has since moved off Medusa. Medusa and PostgreSQL are no longer part of the running stack; the only remaining link is the one-off `migrate:medusa` script that copies data out of an old Medusa database. Ignore Medusa docs, skills and the `@medusajs/*` package `AGENTS.md` files unless you are working on that script.

**`apps/admin` is a Vite single-page app**, not Next.js: `index.html` boots `src/main.tsx`, routing is React Router and data loading is TanStack Query. It talks to the API's `/admin` routes with a Bearer token held in `localStorage`, through `src/lib/api.ts`. It has no server side, so anything it shows must come from an endpoint the API already exposes.

Architecture, design tokens and known issues: [`docs/PROJECT.md`](./docs/PROJECT.md).

## Where to Look

| Task | Location |
| --- | --- |
| Store API route (shopper-facing) | `apps/backend/src/routes/store/<area>.ts`, mounted in `src/app.ts` under `/store` |
| Admin API route | `apps/backend/src/routes/admin/<area>.ts`, mounted under `/admin` behind `requireAdmin` |
| App setup: CORS, body limits, error shape, uploads | `apps/backend/src/app.ts` |
| Environment settings (validated at startup) | `apps/backend/src/env.ts`, documented in `apps/backend/.env.template` |
| Data model, collections, indexes | `apps/backend/src/db/schema.ts` (types + `db.<collection>()` accessors + `ensureIndexes`) |
| MongoDB connection, transactions | `apps/backend/src/db/client.ts` (`connect`, `getDb`, `withTransaction`) |
| Auth, tokens, password hashing, rate limits | `apps/backend/src/lib/auth.ts` |
| API errors | `apps/backend/src/lib/errors.ts` (`notFound`, `badRequest`, `unauthorized`, ...) |
| Shared request validation | `apps/backend/src/lib/validation.ts` |
| Order totals, regions, IDs, response shaping | `apps/backend/src/lib/{totals,regions,ids,serialize}.ts` |
| One-off scripts | `apps/backend/scripts/` |
| Backend tests | `apps/backend/test/*.test.ts` |
| Storefront API calls | `apps/storefront/src/lib/api/client.ts` (server-only fetch wrapper) and `src/lib/data/*.ts` |
| Storefront UI | `apps/storefront/src/modules/<feature>/`, routes in `src/app/[countryCode]/` |
| Storefront e2e tests | `apps/storefront/e2e/` |
| Admin API client and response types | `apps/admin/src/lib/api.ts`, `src/lib/types.ts` |
| Admin pages | `apps/admin/src/routes/*.tsx`, wired up in `src/main.tsx` |
| Admin list tables (search, paging) | `apps/admin/src/components/resource-grid.tsx` |
| Admin UI | `apps/admin/src/` |

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
│   └── admin/                  # Store admin SPA (@dtc/admin)
│       ├── index.html          # Vite entry point
│       └── src/
│           ├── main.tsx        # Router, query client, providers
│           ├── routes/         # login, dashboard, orders, products, customers
│           ├── components/     # app shell, resource grid, ui/ + reui/ primitives
│           └── lib/            # api client, response types, formatters
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
npm run admin:dev           # admin dashboard only (Vite)
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

Admin (from `apps/admin`, with the API running):

```bash
npm run dev          # Vite dev server on 7001
npm run typecheck
npm run lint
npm run build && npm run preview
```

Signing in needs an admin account, created from the API with `npm run admin:create`.

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
- **CORS is split by audience:** `/store` accepts only `STORE_CORS` origins and `/admin` only `ADMIN_CORS`. A new frontend origin must be added to the right list in `.env.template`.
- **Auth:** customers and admins get signed JWTs (`issueToken`) sent as `Authorization: Bearer <token>`; check them with `requireAuth` or `optionalAuth`. Rate-limit login-style endpoints with `rateLimit`.

### Storefront

- **Call the API only from the server**, through `src/lib/api/client.ts` (marked `server-only`) and the fetchers in `src/lib/data/`. Never expose `EVERWEAR_API_URL` to the browser.
- Catalog reads may be cached briefly; carts, accounts and orders are always `no-store`.
- UI is built from shadcn/ui and ReUI components (`components.json`, style `radix-sera`, registry `@reui`). Follow the ReUI skill when adding UI.

### Admin

- Built from shadcn/ui and ReUI components (style `radix-sera` in `components.json`, registry `@reui`). Follow the ReUI skill.
- Talks to the API's `/admin` routes with a Bearer token. Its origin (port 7001) must be in `ADMIN_CORS`.
- **Every request goes through `src/lib/api.ts`.** It attaches the token, unwraps the `{ error: { code, message } }` envelope and drops the token on a 401, which sends the viewer back to the login.
- **Response types live in `src/lib/types.ts`** and mirror the API exactly: camelCase fields, and money as an integer in the currency's minor unit. Format money with `formatMoney` from `src/lib/format.ts`, which divides it out; never print a raw amount.
- **List pages use `ResourceGrid`**, which pages with `page`/`limit` and searches with `q`. A new list page supplies a path, a result key and columns.
- **`src/components/ui/` and `src/components/reui/` are installed files.** Don't hand-edit them; the lint config reports their findings as warnings for that reason.
- The palette is light-only by design (`src/styles/globals.css` says so); there is no dark theme to maintain.

## Code Style

- TypeScript everywhere, strict mode.
- No semicolons. Double quotes. 2-space indent.
- Files: kebab-case. Types and classes: PascalCase. Functions and variables: camelCase. API JSON and MongoDB fields: camelCase.
- No emojis in code, comments or commit messages.

## Common Mistakes

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
