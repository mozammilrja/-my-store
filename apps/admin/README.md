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

**Lists.** `ResourceGrid` wraps the ReUI data grid: it searches with `q`, pages with `page` and `limit`, sends one query parameter per `GridFilter`, keeps the previous page visible while fetching, and owns the loading, empty and error states. A new list page supplies a path, the response key, its columns and whichever filters the endpoint accepts. Every row opens its detail page, through a real link in the first column as well as a row click.

**The dashboard** derives its figures from the orders list. `use-sales-analytics.ts` asks `/admin/orders` for the range with `from`, so nothing out of range reaches the browser; past 2000 rows it stops and says the figures cover only the most recent orders.

**Installed components.** `components/ui/` and `components/reui/` are vendored from shadcn and ReUI as published. Don't hand-edit them; theme through the tokens in `styles/globals.css`, and reach for `lib/typography.ts` when a label needs the design's caps or metric treatment over a primitive's own classes. Lint reports their findings as warnings for that reason. Every `npx shadcn add` rewrites imports to a bare `cn` package: point them back at `@/lib/utils` and `npm uninstall cn` afterwards. It also restores `next-themes` in `ui/sonner.tsx`; this app owns its theme, so point the toaster back at `@/hooks/use-theme` and uninstall `next-themes` again.

**Two themes, one operational design system.** The admin runs the `radix-nova` shadcn/ReUI style: zinc neutrals, royal violet for anything interactive, Inter from `@fontsource-variable/inter`, 6px controls inside 8px panels, `rounded-full` only on status pills, and depth from hairlines rather than drop shadows. It is deliberately not the storefront's square editorial look. `globals.css` defines a light palette on `:root` and a dark one on `.dark`. `src/lib/theme.ts` is the only place that sets the class, from the viewer's choice of light, dark or the browser's; the inline script in `index.html` applies the same choice before the first paint, and both share one storage key. Semantic tokens switch on their own, so check a new screen in both themes. The `--chart-1` to `--chart-5` slots are a fixed categorical order, validated for colour-vision separation and contrast in each theme; assign them in order and always pair them with a label.
