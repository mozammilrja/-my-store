# Everwear

Everwear is an online store for clothing and everyday essentials, with delivery across Europe and India. It is a headless e-commerce app: a commerce backend with an admin dashboard, plus a Next.js storefront, in one Turborepo monorepo.

## Features

- Multi-region storefront with automatic country detection (Europe and India)
- Product catalog with faceted search, filters and variant selection
- Cart with promotion codes
- Multi-step checkout with shipping and payment
- Customer accounts with order history and address management
- Order transfer between accounts, with a confirmation step
- Admin dashboard for products, orders, customers and settings

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend and admin | Medusa 2.22 (Node.js 22.22+) |
| Storefront | Next.js 16 (App Router), React 19, Tailwind CSS |
| Database | PostgreSQL 15+ |
| Monorepo | Turborepo, npm workspaces |
| Tests | Jest (backend), Playwright (storefront end-to-end) |

## Getting started

**Prerequisites:** Node.js 22.22+, npm 10+, and a running PostgreSQL 15+ database.

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/mozammilrja/-my-store.git
   cd -- -my-store
   npm install
   ```

2. Set up the backend environment, then set `DATABASE_URL` in `apps/backend/.env`:

   ```bash
   cp apps/backend/.env.template apps/backend/.env
   ```

   ```bash
   DATABASE_URL=postgres://postgres:<password>@localhost:5432/everwear
   ```

3. Run migrations (this also seeds the initial store data) and create an admin user:

   ```bash
   cd apps/backend
   npx medusa db:migrate
   npx medusa user -e admin@example.com -p <password>
   ```

4. Optional: add demo products:

   ```bash
   npx medusa exec ./src/scripts/seed-demo-products.ts
   ```

5. Start the backend with `npm run backend:dev` from the repo root. Open the admin dashboard at http://localhost:9000/app, log in, and copy the publishable API key from **Settings > Publishable API keys**.

6. Create `apps/storefront/.env.local`:

   ```bash
   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
   NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
   NEXT_PUBLIC_DEFAULT_REGION=dk
   NEXT_PUBLIC_BASE_URL=http://localhost:8001
   ```

7. Start everything from the repo root:

   ```bash
   npm run dev
   ```

| Service | URL (dev) |
| --- | --- |
| Storefront | http://localhost:8001 |
| Backend API | http://localhost:9000 |
| Admin dashboard | http://localhost:9000/app |

## Configuration

Storefront variables go in `apps/storefront/.env.local`. Never commit this file.

| Variable | Description | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Publishable API key from the admin dashboard | required |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Backend URL | `http://localhost:9000` |
| `NEXT_PUBLIC_DEFAULT_REGION` | Default country code | `dk` |
| `NEXT_PUBLIC_BASE_URL` | Public URL of the storefront | `http://localhost:8000` |
| `NEXT_PUBLIC_STRIPE_KEY` | Stripe publishable key | optional |

Backend variables (`DATABASE_URL`, `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`, `JWT_SECRET`, `COOKIE_SECRET`, `REDIS_URL`) go in `apps/backend/.env`. See `apps/backend/.env.template`. Replace the default secrets before deploying.

## Scripts

Run from the repo root:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the backend and storefront in dev mode |
| `npm run backend:dev` | Start only the backend |
| `npm run storefront:dev` | Start only the storefront |
| `npm run build` | Build all apps |
| `npm run start` | Build, then start in production mode (storefront on port 8000) |
| `npm run lint` | Lint all apps |

The storefront's production build reads the sitemap from the backend, so the backend must be running while you build.

## Testing

```bash
# Backend (from apps/backend)
npm run test:unit
npm run test:integration:modules
npm run test:integration:http      # needs PostgreSQL

# Storefront (from apps/storefront, with both apps running)
npx tsc --noEmit
npx playwright test
```

The checkout and account tests create real orders and customers in the local database. Don't run them against production.

## Project structure

```text
apps/
├── backend/        # Commerce backend: API routes, workflows, modules, admin extensions
│   ├── medusa-config.ts
│   └── src/
└── storefront/     # Everwear Next.js storefront
    ├── e2e/        # Playwright tests
    └── src/
        ├── app/        # Routes (under [countryCode]/)
        ├── lib/data/   # Server-side API calls
        └── modules/    # Feature UI: shell, catalog, product, bag, checkout, account, order
docs/PROJECT.md     # Architecture, design system, and known issues
AGENTS.md           # Conventions and commands for coding agents
```

For architecture, design tokens and known issues, see [`docs/PROJECT.md`](./docs/PROJECT.md).

## Branches

- `main`: stable code
- `develop`: ongoing work; open pull requests against this branch
