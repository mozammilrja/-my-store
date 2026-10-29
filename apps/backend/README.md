# Everwear API (`@dtc/backend`)

The commerce API: catalog, carts, checkout, orders, customer accounts and admin endpoints. Node 22, Express 5, TypeScript and MongoDB, with no frontend code in it — the storefront, the admin dashboard and any future mobile app are all just HTTP clients.

## Run it

```bash
cp .env.template .env        # then set JWT_SECRET (32+ characters)
npm run dev                  # watch mode, http://localhost:9100
npm run build && npm start   # compile to dist/, then run it
npm run typecheck
npm test                     # needs MongoDB; uses its own test databases
```

MongoDB must run as a **single-node replica set**. Placing an order and moving stock happen in a multi-document transaction, which standalone MongoDB rejects.

One-off scripts:

```bash
npm run admin:create -- you@example.com '<password>' "Your Name"
npm run migrate:medusa       # import a catalog from an old Medusa PostgreSQL database
npm run catalog:localize     # download remote product images into uploads/
```

## Layout

```text
src/
├── index.ts      # Connects to MongoDB, ensures indexes, starts the server
├── app.ts        # Express app: helmet, CORS, body limits, routers, error handler
├── env.ts        # Settings, validated with Zod at startup
├── db/
│   ├── client.ts # connect, getDb, withTransaction
│   └── schema.ts # Document types, db.<collection>() accessors, ensureIndexes
├── lib/
│   ├── auth.ts       # Password hashing, JWTs, auth middleware, rate limiting
│   ├── errors.ts     # ApiError and the notFound/badRequest/... helpers
│   ├── validation.ts # Shared Zod pieces (email, password, address)
│   ├── totals.ts     # Cart and order money maths
│   ├── regions.ts    # Country to region lookup
│   ├── serialize.ts  # Document to API response shaping
│   └── ids.ts        # Prefixed random ids
└── routes/
    ├── store/    # catalog, customers, carts (shopper-facing)
    └── admin/    # auth, orders, products, store (dashboard)
```

## How it is put together

**Two audiences.** `/store/*` is the shop and `/admin/*` is the dashboard; each accepts only its own browser origins (`STORE_CORS`, `ADMIN_CORS`). Everything under `/admin` past the login route sits behind `requireAdmin`.

**Auth is stateless.** Customers and admins get a signed JWT from their login route and send it as `Authorization: Bearer <token>`. Nothing is kept in a session store and no cookie is required, which is what lets a native mobile client use the same endpoints as the browser. `requireAuth` rejects a missing or wrong-audience token; `optionalAuth` just records who is calling.

**Validation at the edge.** Every body and query goes through a Zod schema. A thrown `ZodError` is turned into a 400 by the error handler, so route code can assume its input is already clean.

**One error shape.** Throw the helpers in `lib/errors.ts`; the handler in `app.ts` turns them, Zod errors, duplicate-key errors and body-parser failures into `{ error: { code, message } }`. Anything unrecognised is logged and becomes a generic 500, so internals never reach a client.

**Money is integers.** Always the currency's minor unit (cents, paise). `prices` maps a lowercase ISO currency code to that amount. Never floats, never major units.

**Prices are never trusted from the client.** Carts re-read every line from the catalog before they are returned or completed, so a stale or tampered price cannot survive to an order.

**Transactions where it counts.** Placing an order re-prices the cart, takes stock with a conditional update, counts promotion usage, numbers the order and closes the cart inside one `withTransaction`. If any step fails, nothing is written, and two shoppers racing for the last unit cannot both win.

## Adding an endpoint

1. Put the handler in the right router under `src/routes/store/` or `src/routes/admin/`, or add a new router and mount it in `src/app.ts`.
2. Parse the input with Zod. Throw from `lib/errors.ts` for anything the client did wrong.
3. Read and write through the `db.<collection>()` accessors in `db/schema.ts`; add any new index to `ensureIndexes`.
4. Shape the response in `lib/serialize.ts` style: ids as `id`, no internal fields, absolute URLs for images.
5. Cover it in `test/`, then run `npm run typecheck && npm test`.

Imports use explicit `.js` suffixes (`import { env } from "./env.js"`) because the compiled output is ESM. Leaving the suffix off builds but fails at runtime from `dist/`.
