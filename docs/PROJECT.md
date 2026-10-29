# Everwear — Project Docs

Last updated: 2026-10-29

## Overview

Everwear is a headless e-commerce store: a Medusa 2.22.1 backend with an admin dashboard, plus a Next.js 16 storefront, in one Turborepo monorepo managed with npm.

| Layer | Technology | Version |
| --- | --- | --- |
| Backend + Admin | Medusa (`@medusajs/medusa`) | 2.22.1 |
| Storefront | Next.js (App Router, Turbopack), React | 16.4.2, 19.0.5 |
| Styling | Tailwind CSS (CSS-first config), shadcn/ui `radix-sera` style, ReUI (free tier) | 4.3.3 |
| Icons | lucide-react | latest 0.x |
| Storefront API client | `@medusajs/js-sdk` | 2.22.1 |
| Browser tests | Playwright (installed Google Chrome) + axe-core | 1.56 / 4.11 |
| Database | PostgreSQL (Docker container `medusa-postgres`) | 16 |
| Monorepo | Turborepo, npm workspaces | npm 10.9.7 |
| Runtime | Node.js | 22.22+ |

## Architecture and design

The storefront and admin dashboard are thin clients; all business logic and data live in the Medusa backend.

```mermaid
flowchart LR
  Shopper --> Storefront["Storefront<br/>Next.js 16, port 8001<br/>calls Store API via JS SDK"]
  Admin["Store admin"] --> Dashboard["Admin dashboard<br/>React app served at /app<br/>calls Admin API"]

  subgraph Backend["Medusa backend, port 9000"]
    direction TB
    Routes["API routes<br/>/store/* needs a publishable key<br/>/admin/* needs an admin login"]
    Workflows["Workflows<br/>core-flows plus custom steps"]
    Modules["Commerce modules<br/>product, cart, order, pricing,<br/>payment, plus custom modules"]
    Routes --> Workflows --> Modules
  end

  Storefront --> Routes
  Dashboard --> Routes
  Modules --> DB[("PostgreSQL 16<br/>medusa-store database, port 5432")]
```

A request flows top to bottom: an API route validates it, runs a workflow, and the workflow changes data through commerce modules, which store it in Postgres.

**Example: adding to cart**

1. The shopper clicks Add to cart on a product page.
2. A server action in `apps/storefront/src/lib/data/cart.ts` calls `POST /store/carts/:id/line-items` with the publishable key.
3. The backend route runs the core add-to-cart workflow.
4. The cart and pricing modules update the cart and write it to Postgres; the storefront clears its cart cache so the new item shows.

## Project structure

Two apps live under `apps/`; the backend holds all business logic and the storefront only calls its Store API.

| Path | What it holds |
| --- | --- |
| `apps/backend/medusa-config.ts` | Database URL, CORS, JWT and cookie secrets, modules |
| `apps/backend/src/api/` | File-based routes: `store/*`, `admin/*`, plus `middlewares.ts` |
| `apps/backend/src/workflows/` | Business logic as workflows and steps |
| `apps/backend/src/modules/` | Custom data models and services |
| `apps/backend/src/links/` | Links between modules |
| `apps/backend/src/subscribers/`, `jobs/` | Event handlers and scheduled jobs |
| `apps/backend/src/search/` | Product search index definition |
| `apps/backend/src/migration-scripts/` | Initial data seed and region store policies |
| `apps/backend/src/scripts/` | One-off scripts, e.g. `seed-demo-products.ts` |
| `apps/backend/src/admin/` | Admin dashboard widgets, routes, i18n |
| `apps/storefront/src/app/` | Next.js routes, mostly under `[countryCode]/`; `error.tsx`, `global-error.tsx`, `not-found.tsx` boundaries |
| `apps/storefront/src/proxy.ts` | Country-code routing (Next.js 16 name for middleware); falls back to the default region if the backend is down |
| `apps/storefront/src/lib/data/` | Server-side Medusa API calls: cart, products, orders, customer, payment |
| `apps/storefront/src/components/ui/`, `components/reui/` | Installed shadcn and ReUI primitives (do not restyle these files; theme through tokens) |
| `apps/storefront/src/components/store/` | Brand parts: wordmark, container, product card, money format, status page |
| `apps/storefront/src/modules/shell/` | Header, announcement bar, mobile menu, search dialog, cart drawer, region and language pickers, footer |
| `apps/storefront/src/modules/home/`, `catalog/`, `product/`, `bag/` | Home page, listings and filters, product page, cart |
| `apps/storefront/src/modules/checkout/`, `account/`, `order/` | Checkout steps, account and order screens (existing logic, restyled) |
| `apps/storefront/src/styles/globals.css` | Brand tokens, plus a bridge mapping legacy Medusa `ui-*` variables onto them |
| `apps/storefront/e2e/` | Playwright tests: shopping, checkout, account, agent API, mobile, accessibility |
| `.claude/skills/reui/` | ReUI design rules for Claude Code |

## Setup and running

Start Postgres, then run `npm run dev` from the repo root; both apps come up in about 10 seconds.

1. Start the database: `docker start medusa-postgres`
2. Install dependencies (first time only): `npm install`
3. Run migrations and the initial seed: `cd apps/backend && npx medusa db:migrate`
4. Create an admin user: `npx medusa user -e admin@example.com -p <password>`
5. Start everything: `npm run dev` (or `npm run backend:dev` / `npm run storefront:dev`)
6. Optional demo products: `npx medusa exec ./src/scripts/seed-demo-products.ts`

| Service | URL (dev) |
| --- | --- |
| Storefront | http://localhost:8001 (port 8000 with `npm run start`) |
| Backend API | http://localhost:9000 |
| Admin dashboard | http://localhost:9000/app |
| Health check | http://localhost:9000/health |

**Environment variables** (names only; never commit the values):

| File | Variables |
| --- | --- |
| `apps/backend/.env` | `DATABASE_URL`, `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`, `JWT_SECRET`, `COOKIE_SECRET`, `REDIS_URL` (optional) |
| `apps/storefront/.env.local` | `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_DEFAULT_REGION`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_STRIPE_KEY` |

Production: `npm run build`, then `npm run start`. The build prerenders the sitemap from the Store API, so the backend must be running.

## Design system

The storefront uses an editorial look: warm ivory surfaces, ink text, one cobalt accent, a display serif for headlines and square controls.

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#f6f3ec` ivory | Page |
| `--card` | `#fbfaf6` paper | Panels, footer |
| `--foreground` | `#16171b` ink | Text |
| `--muted-foreground` | `#5e5c57` | Secondary text (6.0:1 on ivory) |
| `--primary` | `#2440d6` cobalt | Main buttons, links, focus ring only |
| `--border` | `#e3ded3` | Hairlines |
| `--destructive-foreground`, `--success-foreground`, `--warning-foreground` | `#8f1d14`, `#14532f`, `#7a4a00` | Status text |

- **Type:** Fraunces (display serif) for headings and the wordmark, Inter Tight for UI and body. Both are self-hosted at build time with `next/font`.
- **Shape:** `--radius: 0`; the `radix-sera` style gives square, uppercase buttons. Product images use a 4:5 ratio.
- **Motion:** 200 to 500 ms transform and opacity only. Everything respects `prefers-reduced-motion`.
- **Rules:** use installed components and theme tokens. The ReUI skill in `.claude/skills/reui` lists the details. After every `npx shadcn add`, check that no stray npm package called `cn` was added (this shadcn style does that) and remove it.

## Testing

Run from `apps/storefront` with both apps running (`npm run dev` at the root):

| Check | Command |
| --- | --- |
| Types | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Production build | `npm run build` |
| End-to-end and accessibility | `npx playwright test` (29 tests: shopping, checkout with manual payment, account, agent API, mobile, axe WCAG 2.2 AA) |

The checkout and account tests create real orders and customers in the local database. Don't point them at production.

## Development guide

Put business logic in workflows, expose it through file-based routes, and keep `npm run lint` clean.

- **Routes are file-based:** a store endpoint is `src/api/store/<path>/route.ts` exporting `GET`, `POST`, and so on.
- **Logic goes in workflows:** routes run a workflow; workflows compose steps. Change commerce data through `@medusajs/medusa/core-flows`, not raw service calls.
- **Imports:** use `@medusajs/framework/*` subpaths, never `@medusajs/utils` directly.
- **Custom models:** after editing one, run `npx medusa db:generate <module>`, then `db:migrate`.
- **Code style:** no semicolons, double quotes, 2-space indent, kebab-case files, PascalCase types, camelCase functions, snake_case DB columns.
- **Dependencies:** install inside the app that needs them (`cd apps/backend && npm install <pkg>`), never at the root.
- **Do not edit:** `node_modules/`, `.medusa/`, `.next/`, `.turbo/`, the lockfile, existing migrations.

| Task | Command (from `apps/backend`) |
| --- | --- |
| Lint | `npm run lint` (root: lints all apps) |
| Unit tests | `npm run test:unit` |
| Module integration tests | `npm run test:integration:modules` |
| HTTP integration tests | `npm run test:integration:http` (needs Postgres) |

## Known issues and notes

None of these block the app in development.

- **Payments:** only the manual provider (`pp_system_default`) is configured. The Stripe checkout path is kept but untested until a Stripe provider and test keys are added to the backend.
- **Emails:** the backend uses the local notification provider, so no order or account emails are sent.
- **Locales:** `/store/locales` returns 404 because `MEDUSA_FF_TRANSLATION` is off. The language picker stays hidden until it is on.
- **India region:** its metadata has no store policies, so shipping and returns details show as unavailable for `/in`.
- **Demo data:** the 50 demo products share four images and use the same number in EUR and INR (for example 75 EUR and 75 INR).
- **No Redis:** the backend uses an in-memory fake Redis and local event bus. Set it up for production.
- **Node version:** the root `package.json` asks for Node 22.23.4 or newer; the machine runs 22.22.2 without errors.
- **Sessions:** customer tokens are stateless JWTs, so logging out removes the cookie but can't revoke a copied token before it expires.
- **CSP:** scripts are allowed `'unsafe-inline'` because statically rendered pages can't carry nonces.
- **Dependencies:** `npm audit` still reports a high-severity `zod` advisory that comes in through ESLint tooling and the backend. `pg` and `qs` are listed in the storefront but not imported.
- **Lighthouse (production build, simulated mobile):** performance 79 to 90, accessibility, best practices and SEO 100 (cart SEO 63 by design: `noindex`). LCP 3.6 to 5 s, limited by the large demo product PNGs.
  