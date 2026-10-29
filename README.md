# Everwear

Everwear is an online store for clothing and everyday essentials, with delivery across Europe and India. It is a headless e-commerce app: a standalone commerce API, a Next.js storefront and a separate admin dashboard, in one Turborepo monorepo.

The API is a plain Node and Express service, independent of any frontend, so the storefront, the admin dashboard and a future mobile app all talk to the same HTTP endpoints.

## Features

- Multi-region storefront with automatic country detection (Europe and India)
- Product catalog with faceted search, filters and variant selection
- Cart with promotion codes
- Multi-step checkout with cash on delivery
- Customer accounts with order history and address management
- Admin dashboard with sales figures, orders, products and customers
- Stock and order placement in MongoDB transactions, so the last unit is never sold twice

## Tech stack

| Layer | Technology |
| --- | --- |
| API | Node.js 22, Express 5, TypeScript, Zod |
| Database | MongoDB 7 (single-node replica set) |
| Storefront | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Admin | React 19, Vite 8, React Router, TanStack Query, Tailwind CSS 4, shadcn/ui and ReUI |
| Monorepo | Turborepo, npm workspaces |
| Tests | `node:test` (API), Playwright (storefront end-to-end) |

## Apps

| Path | Package | What it is | Dev URL |
| --- | --- | --- | --- |
| `apps/backend` | `@dtc/backend` | The Everwear API | http://localhost:9100 |
| `apps/storefront` | `@dtc/storefront` | The shop | http://localhost:8001 |
| `apps/admin` | `@dtc/admin` | The admin dashboard | http://localhost:7001 |

## Getting started

**Prerequisites:** Node.js 22+, npm 10+, and MongoDB 7 running as a **single-node replica set**. The replica set is required: placing an order uses a multi-document transaction, which standalone MongoDB does not support.

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/mozammilrja/-my-store.git
   cd -- -my-store
   npm install
   ```

2. Set up the API environment:

   ```bash
   cp apps/backend/.env.template apps/backend/.env
   ```

   Then set `JWT_SECRET` in `apps/backend/.env` to a random string of at least 32 characters, and check that `MONGODB_URI` points at your replica set.

3. Create an admin user:

   ```bash
   cd apps/backend && npm run admin:create -- admin@example.com '<password>' "Your Name"
   ```

4. Set up the storefront and admin environments:

   ```bash
   cp apps/storefront/.env.template apps/storefront/.env.local
   cp apps/admin/.env.template apps/admin/.env.local
   ```

5. Start everything from the repo root:

   ```bash
   npm run dev
   ```

| Service | URL (dev) |
| --- | --- |
| Storefront | http://localhost:8001 (port 8000 with `npm run start`) |
| API | http://localhost:9100 |
| Admin dashboard | http://localhost:7001 |
| Health check | http://localhost:9100/health |

## Configuration

Never commit `.env` or `.env.local`. Each app's `.env.template` documents its variables.

API variables (`apps/backend/.env`):

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Port the API listens on | `9100` |
| `MONGODB_URI` | Connection string, replica set required | required |
| `MONGODB_DB` | Database name | `everwear` |
| `JWT_SECRET` | Signs customer and admin tokens; 32+ characters | required |
| `STORE_CORS` | Browser origins allowed to call `/store` | — |
| `ADMIN_CORS` | Browser origins allowed to call `/admin` | — |
| `API_PUBLIC_URL` | Public base URL, used to build image links | `http://localhost:9100` |
| `UPLOADS_DIR` | Folder for uploaded product images | `uploads` |

The API validates all of these at startup and exits with a clear message if any are missing or invalid.

Storefront variables (`apps/storefront/.env.local`):

| Variable | Description | Default |
| --- | --- | --- |
| `EVERWEAR_API_URL` | Address of the API; server-side only | `http://localhost:9100` |
| `NEXT_PUBLIC_API_PUBLIC_URL` | Public address for API-hosted images, if different | optional |
| `NEXT_PUBLIC_DEFAULT_REGION` | Country shown at `/` | `dk` |
| `NEXT_PUBLIC_BASE_URL` | Public URL of the storefront | `http://localhost:8001` |

Admin variables (`apps/admin/.env.local`):

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_URL` | Address of the API. The admin is a browser app, so this must be reachable from the browser and ends up in the bundle. | `http://localhost:9100` |

Sign in at http://localhost:7001 with the admin created in step 3. The admin's origin must appear in the API's `ADMIN_CORS`.

## API

Two audiences, each with its own CORS origins:

- `/store/*` — the shop. Catalog, carts, checkout and customer accounts. Customers get a Bearer token from `/store/auth/login`.
- `/admin/*` — the dashboard. Everything past `/admin/auth/login` needs an admin Bearer token.

Both use stateless JWTs in an `Authorization: Bearer <token>` header rather than cookies, so a native mobile client can use the same endpoints as the browser. Every error response has the shape `{ "error": { "code": "...", "message": "..." } }`, and all money is an integer in the currency's minor unit (cents, paise).

## Scripts

Run from the repo root:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start every app in dev mode |
| `npm run backend:dev` | Start only the API |
| `npm run admin:dev` | Start only the admin dashboard |
| `npm run storefront:dev` | Start only the storefront |
| `npm run build` | Build all apps |
| `npm run start` | Build, then start in production mode (storefront on port 8000) |
| `npm run lint` | Lint the frontend apps |
| `npm run typecheck` | Type-check every app that defines the task |
| `npm test` | Run each app's tests |

From `apps/backend`:

| Command | What it does |
| --- | --- |
| `npm run dev` | Watch mode on `PORT` |
| `npm run build` / `npm start` | Compile to `dist/`, then run it |
| `npm run typecheck` | `tsc`, no emit |
| `npm test` | API suites; needs MongoDB |
| `npm run admin:create -- <email> <password> ["Name"]` | Create or reset an admin |
| `npm run migrate:medusa` | One-off import of a catalog from an old Medusa PostgreSQL database |
| `npm run catalog:localize` | One-off pass that pulls remote product images into `uploads/` |

The storefront's production build reads the sitemap from the API, so the API must be running while you build.

## Testing

```bash
# API (from apps/backend) — needs MongoDB; drops its own test databases
npm test

# Storefront (from apps/storefront, with the API running)
npx tsc --noEmit
npx playwright test
```

The checkout and account tests create real orders and customers in the local database. Don't run them against production.

## Project structure

```text
apps/
├── backend/        # Everwear API: Express app, routes, MongoDB access, scripts, tests
│   ├── scripts/
│   ├── test/
│   └── src/
│       ├── app.ts      # Express app: middleware, routers, error handler
│       ├── index.ts    # Server start and shutdown
│       ├── db/         # MongoDB client, schema types, indexes
│       ├── lib/        # auth, errors, validation, totals, regions, serialize, ids
│       └── routes/     # store/* and admin/* routers
├── admin/          # Admin dashboard: a Vite single-page app
│   ├── index.html
│   └── src/
│       ├── main.tsx    # Router and query client
│       ├── routes/     # login, dashboard, orders, products, customers
│       ├── components/ # app shell, resource grid, ui/ + reui/ primitives
│       └── lib/        # API client, response types, formatters
├── storefront/     # Next.js storefront
│   ├── e2e/        # Playwright tests
│   └── src/
│       ├── app/        # Routes (under [countryCode]/)
│       ├── lib/api/    # Server-side API client
│       └── modules/    # Feature UI: shell, catalog, product, bag, checkout, account, order
docs/PROJECT.md     # Architecture, design system, and known issues
AGENTS.md           # Conventions and commands for coding agents
```

For architecture, design tokens and known issues, see [`docs/PROJECT.md`](./docs/PROJECT.md).

## Branches

- `main`: stable code
- `develop`: ongoing work; open pull requests against this branch
