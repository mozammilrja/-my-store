# Everwear admin (`@dtc/admin`)

The store dashboard: sales figures, orders, products and customers. A React 19 single-page app built with Vite, routed with React Router and loading data with TanStack Query.

It has no server of its own. Everything on screen comes from the Everwear API's `/admin` routes, so the API must be running and this app's origin must appear in its `ADMIN_CORS`.

## Run it

```bash
cp .env.template .env.local     # VITE_API_URL, the address of the API
npm run dev                     # http://localhost:7001
npm run build && npm run preview
npm run typecheck
npm run lint
```

You need an admin account before you can sign in. Create one from the API:

```bash
cd ../backend && npm run admin:create -- you@example.com '<password>' "Your Name"
```

## Layout

```text
index.html            # Vite entry point
src/
├── main.tsx          # Router, query client, providers
├── routes/           # login, dashboard, orders, products, customers
├── components/
│   ├── app-shell.tsx     # Sidebar, header, breadcrumbs, sign-out
│   ├── resource-grid.tsx # Searchable, server-paged table used by the list pages
│   ├── ui/               # Installed shadcn primitives
│   └── reui/             # Installed ReUI primitives, including the data grid
├── features/analytics/   # Dashboard figures derived from the orders list
├── lib/
│   ├── api.ts        # Fetch client: attaches the token, unwraps API errors
│   ├── types.ts      # The API's response shapes
│   └── format.ts     # Money, dates, counts, statuses
└── styles/globals.css
```

## How it is put together

**Signing in.** `POST /admin/auth/login` returns a JWT that is kept in `localStorage`. `src/lib/api.ts` attaches it to every request and deletes it on a 401, so an expired or rejected token drops the viewer back at the login screen. `RequireAuth` guards every route except `/login`; signing out clears the token and the query cache.

**One client, one error shape.** Nothing calls `fetch` directly. `api.ts` unwraps the API's `{ error: { code, message } }` envelope into an `ApiError`, which the pages show as-is, so an API message reaches the screen unchanged.

**Money is never a float.** The API sends integers in the currency's minor unit. Keep them that way and let `formatMoney` divide them out at the point of display.

**Lists.** `ResourceGrid` wraps the ReUI data grid: it searches with `q`, pages with `page` and `limit`, keeps the previous page visible while fetching, and owns the loading, empty and error states. A new list page supplies a path, the response key and its columns.

**The dashboard** derives its figures from the orders list. `/admin/orders` has no date filter, so `use-sales-analytics.ts` pages newest-first and stops at the range cutoff. Past 2000 rows it stops and says the figures cover only the most recent orders.

**Installed components.** `components/ui/` and `components/reui/` are vendored from shadcn and ReUI as published. Don't hand-edit them; theme through the tokens in `styles/globals.css`. Lint reports their findings as warnings for that reason.

**Light only.** `globals.css` defines a single light palette by design, so there is no dark theme to keep in step. The `--chart-1` to `--chart-5` slots are a fixed categorical order, validated for colour-vision separation and contrast on the white surface; assign them in order and always pair them with a label.
