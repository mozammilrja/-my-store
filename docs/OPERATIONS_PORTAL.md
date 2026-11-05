# Operations portal

Last updated: 2026-11-05.

The Admin, Warehouse, Rider and Seller Hub frontends are now one role-based
app, `apps/operations`, with one sign-in. The storefront is still its own
app. The API and the database are shared, as before.

## 1. Before and after

| | Before | After |
| --- | --- | --- |
| Frontends | 5: storefront (8001), admin (7001), warehouse (7101), rider (7201), seller (7301) | 2: storefront (8001), operations portal (7001) |
| Frontend containers in production | 5 | 2 |
| Sign-in | 4 separate forms and token types (admin, warehouse, rider, seller), bearer tokens in `localStorage`, no way to revoke them | 1 form (`/login`). One server-side session per sign-in in an httpOnly cookie, which can be listed and revoked. The old bearer tokens still work for each realm, as a rollback path. |
| Backend | 1 Express API | The same API, plus `/ops/auth/*` |
| Database | 1 MongoDB | The same database, plus `ops_sessions` and `ops_password_resets`. No existing document is rewritten. |
| Hosts | admin., warehouse., rider., sellers., api., storefront | admin. (the portal), api., storefront. The old warehouse, rider and sellers hosts 301-redirect into the portal. |

```text
Before                                         After
------                                         -----
storefront ─┐                                  storefront ─┐
admin ──────┤                                  operations ─┤  /admin /warehouse /delivery /seller
warehouse ──┼── API (Express) ── MongoDB                   ├── API (Express) ── MongoDB
rider ──────┤                                              │   + /ops/auth (one session)
seller ─────┘                                              ┘
```

The API keeps its realm routers (`/admin`, `/warehouse`, `/rider`, `/seller`)
and each one's own authorisation code. That keeps the system modular: an area
can become its own deployment again later by pointing a new frontend at the
same routes.

## 2. Routes

| Portal route | Who | What it was |
| --- | --- | --- |
| `/login` | everyone | The four login screens |
| `/forgot-password`, `/reset-password?token=` | everyone | New |
| `/account` | any signed-in user | New: profile, password, signed-in devices |
| `/admin/*` (`/admin/overview`, `/admin/order-management`, … every module in `src/routes.jsx`) | OWNER, ADMIN | apps/admin `/<module>` |
| `/warehouse`, `/warehouse/fulfilments/:id`, `/warehouse/dispatch`, `/warehouse/stock`, `/warehouse/returns` | WAREHOUSE_SUPERVISOR, WAREHOUSE_STAFF | apps/warehouse `/`, `/fulfilments/:id`, `/dispatch`, `/stock`, `/returns` |
| `/delivery`, `/delivery/tasks/:id`, `/delivery/cash`, `/delivery/earnings`, `/delivery/profile` | DELIVERY_RIDER | apps/rider `/`, `/tasks/:id`, `/cash`, `/earnings`, `/profile` |
| `/delivery/register` | public | apps/rider sign-up |
| `/seller`, `/seller/listings[/:id]`, `/seller/stock`, `/seller/orders[/:id]`, `/seller/sales`, `/seller/returns`, `/seller/payments`, `/seller/reports` | SELLER | apps/seller same paths without `/seller` |
| `/seller/register` | public | apps/seller sign-up |
| `/` | signed in | Redirects to the person's own dashboard: the first area their accounts open, in the order admin, warehouse, delivery, seller |

Old links still work:
- `/<admin module>` and `#/<admin module>` redirect to `/admin/<module>` in the app.
- `warehouse.everwear.com/*`, `rider.everwear.com/*` and `sellers.everwear.com/*` get a 301 to `admin.everwear.com/{warehouse,delivery,seller}/*` from the edge proxy.
- Notification links (`WAREHOUSE_APP_URL`, `RIDER_APP_URL`) now default to the portal paths.

New API routes, under `/ops` (CORS: `OPS_CORS`):

| Method and path | What |
| --- | --- |
| `POST /ops/auth/login` | `{email, password}` signs in to every account of that email whose password matches and that may sign in. Sets the cookie and returns the principal. |
| `GET /ops/auth/me` | The principal: email, name, roles, areas, home, accounts, session. |
| `POST /ops/auth/logout` | Revokes this session on the server and clears the cookie. |
| `GET /ops/auth/sessions` | Live sessions on the signed-in accounts. |
| `DELETE /ops/auth/sessions/:id` | Revokes one of them. |
| `POST /ops/auth/sessions/revoke-others` | Revokes all other sessions, and any bearer tokens issued before now. |
| `POST /ops/auth/password` | `{currentPassword, newPassword}`: changes the password on every account in the session and signs other devices out. |
| `POST /ops/auth/password/forgot` | `{email}`. Always answers 202. Emails a single-use 30-minute link if the email has an account that can sign in. |
| `POST /ops/auth/password/reset` | `{token, password}`: sets the password on every account with that email and revokes all their sessions. |
| `POST /admin/accounts/:realm/:id/revoke-sessions` | Signs any operational account out everywhere. Owner for any account; store_admin for every kind except admin. |
| `GET /admin/audit-logs` | The audit trail (owner, store_admin). |
| `PATCH /admin/users/:id` | Gains `status: "active" \| "suspended"` (owner). |

## 3. Roles and permissions

Portal roles are derived on the server from the accounts a session holds. A
role sent by the browser is never accepted.

| Portal role | Comes from | Area |
| --- | --- | --- |
| OWNER | admin account, role `owner` | `/admin` |
| ADMIN | admin account, any other role: `store_admin`, `catalog_manager`, `inventory_manager`, `order_manager`, `finance_manager`, `customer_support`, `staff` | `/admin` |
| WAREHOUSE_SUPERVISOR | warehouse account, role `supervisor` | `/warehouse` |
| WAREHOUSE_STAFF | warehouse account, role `picker`, `packer`, `inspector` or `dispatcher` | `/warehouse` |
| DELIVERY_RIDER | rider account (pending, approved or suspended; rejected can't sign in) | `/delivery` |
| SELLER | seller account (any state) | `/seller` |

One email can hold several kinds of account, for example a supervisor who also
rides. Signing in opens each account whose password matches the one typed,
so that person gets both roles and both workspaces in one session. Accounts
with a different password stay closed.

**Area access.** Each area is checked by the API on every call:
- A session without a warehouse account gets 401 from every `/warehouse` route; the same holds for `/rider`, `/seller` and `/admin`.
- `RequireArea` in the portal only stops the page from rendering.

| | /admin | /warehouse | /delivery | /seller |
| --- | --- | --- | --- | --- |
| OWNER | ✓ | – | – | – |
| ADMIN | ✓ | – | – | – |
| WAREHOUSE_SUPERVISOR | – | ✓ | – | – |
| WAREHOUSE_STAFF | – | ✓ | – | – |
| DELIVERY_RIDER | – | – | ✓ | – |
| SELLER | – | – | – | ✓ |

Owners and admins don't use the floor, rider or seller screens. They manage
warehouses, floor staff, fulfilments, riders, zones, deliveries, COD, sellers,
listings and settlements from `/admin`: that is the "explicitly authorized
administrative access" over warehouse, rider and seller data. A person who
also works a floor shift or rides has a warehouse or rider account under the
same email.

**Within /admin.** These rules come from the API's existing checks, unchanged:

| Action | Owner | store_admin | inventory_manager | order_manager | finance_manager | catalog_manager | customer_support, staff |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Read every admin screen | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin users: create, edit, suspend, delete | ✓ | | | | | | |
| Store settings, refunds, payment reconciliation | ✓ | | | | | | |
| Book, label, cancel shipments; NDR; returns decisions | ✓ | | | | | | |
| Warehouses: create, edit, remove | ✓ | ✓ | ✓ | | | | |
| Floor staff accounts | ✓ | ✓ | read | | | | |
| Fulfilment reassignment, stock operations | ✓ | ✓ | ✓ | some | | | |
| Riders, zones, deliveries (assign, offer, RTO) | ✓ | ✓ | | ✓ | | | |
| COD remittance reconciliation | ✓ | | | | ✓ | | |
| Seller approval, suspension | ✓ | ✓ | | | | | |
| Seller KYC item checks | ✓ | ✓ | | | ✓ | | |
| Seller full bank number (audited) | ✓ | | | | ✓ | | |
| Listing review | ✓ | ✓ | | | | ✓ | |
| Settlements: run, mark paid | ✓ | | | | ✓ | | |
| Sign another account out everywhere | ✓ (any) | ✓ (non-admin) | | | | | |
| Audit log | ✓ | ✓ | | | | | |

**Within /warehouse.** The existing floor rules: `picker` can view and pick.
`packer` can view, QC, pack and label. `inspector` can view and QC.
`dispatcher` can view, accept, label and dispatch. `supervisor` can do all of
those plus stock. Every route is limited to the warehouses on the account: an
id outside them returns 404.

**Within /delivery.** A rider sees only offers made to them and deliveries
assigned to them; anything else returns 404. Work routes need status
`approved`, so pending and suspended riders get 403 with the reason.

**Within /seller.** Every query is scoped to the signed-in seller's id. Work
routes need `approved`; orders need seller-fulfilment. Bank numbers are shown
only as the last four digits.

**Third-party couriers and the own fleet stay separate.** A shipment booked
with Shiprocket or Delhivery is tracked from courier scans and never needs a
rider account. Only "Everwear Fleet" bookings create delivery tasks for
riders.

## 4. Sessions and security

- **Cookie:** `everwear_ops`, a random 256-bit token.
  - Flags: `HttpOnly; SameSite=Strict; Path=/`, plus `Secure` in production (`OPS_COOKIE_SECURE` overrides).
  - Lifetime: 12 hours, a shift.
  - Only the SHA-256 is stored, in `ops_sessions`. Expired rows are removed a day after they lapse (TTL index).
- **CSRF:** a request authenticated by the cookie must also carry `X-Everwear-Ops: 1`, or it gets `403 csrf`. A cross-site form or image can't set that header, and scripts on other origins fail the CORS preflight.
- **Each request re-checks the account.** The realm loaders reload it every time:
  - a suspended admin or floor user gets 401 at once;
  - a pending or suspended rider or seller gets 403 with the reason, as before;
  - a bearer token issued before `sessionsRevokedAt` is refused.
- **Suspension:** an admin (new) or floor user can be suspended. That revokes their sessions and older tokens.
  - Owners can't suspend themselves.
  - The last owner who can sign in can't be suspended or demoted. This fixes an older gap: demoting the last owner to a role other than `staff` used to be allowed.
- **Password change and reset:** apply to every account of the email, end every other session and older tokens, and are rate-limited.
  - The minimum is 12 characters, the admin rule.
  - Reset links are single-use (claimed atomically), expire after 30 minutes, and an older link stops working when a new one is issued.
  - The answer is the same whether or not the email exists.
- **Audit log** (`audit_logs`, now with `actorRealm`):
  - Sign-in and failed sign-in, sign-out, session revocation, password change, reset request and reset.
  - Admin user create, update, suspend, reactivate and delete; floor staff changes.
  - Plus everything that was already audited: fulfilment, fleet, returns, marketplace, settlements and notifications.
- **Rate limits:** sign-in per email and per IP address; reset requests per email; resets and password changes. The edge proxy also limits `/ops/auth/*`.

## 5. Files

**Moved:** `apps/admin` → `apps/operations` (git rename, history kept). Its
React went from 18 to 19, and `react-router-dom` imports became
`react-router`.

**Moved in and adapted:**

| Old location | New location |
| --- | --- |
| `apps/warehouse/src` | `apps/operations/src/areas/warehouse` |
| `apps/rider/src` | `apps/operations/src/areas/delivery` |
| `apps/seller/src` | `apps/operations/src/areas/seller` |

- Shared code: `areas/shared/{ui,feedback,scan-field,api,AreaShell}.tsx`. The three apps had identical copies of the UI kit and feedback.
- Each area's token handling was replaced by the portal session.
- Links got the area prefix.
- Sign-in screens: the warehouse one was removed; the rider and seller ones are now sign-up only.

**New:**
- Backend:
  - `src/routes/ops/auth.ts`, `src/lib/ops-session.ts`, `src/lib/ops-access.ts`, `src/lib/audit.ts`
  - `scripts/ops-portal-audit.ts`
  - `test/ops-portal.test.ts`
- Portal:
  - `src/portal/*`: client, session, LoginPage (the admin's, adapted), AuthPages, AccountPage, RequireArea, PortalMenu, Breadcrumbs, QuickSwitch, destinations
  - `src/AdminArea.jsx`, `src/main.jsx` (rewritten), `tsconfig.json`
- Tests:
  - `e2e/portal/*`, `e2e/areas/*`
  - `playwright.portal.config.js`, `playwright.areas.config.js`

**Changed:**
- Backend:
  - `app.ts`: mounts `/ops`; realm CORS includes the portal origins.
  - `env.ts`: `OPS_*` variables; app URL defaults.
  - `lib/auth.ts`: realm auth accepts the portal session; token revocation.
  - `db/schema.ts`: session, reset and audit fields; indexes.
  - Realm loaders: `routes/{admin/auth,warehouse,rider,seller}`.
  - `routes/admin/users.ts`: suspension, revocation, audit log, last-owner fix.
  - `routes/admin/fulfilment.ts`: floor staff suspension revokes sessions.
- Admin code:
  - `src/App.jsx`: relative routes under `/admin`.
  - `src/lib/{api,api-fleet,api-marketplace,session,queryClient,theme}.js[x]`
  - `src/components/layout/{Header,Sidebar,NotFound}.jsx`, `customers/CustomersAndLoyalty.jsx`, `shared/FeedbackAndOverlays.jsx`
  - `tailwind.config.js` and `src/index.css`: the areas' palette.
- Deployment:
  - `docker-compose.yml`, `docker-compose.prod.yml`
  - `nginx/nginx.conf`, `nginx/conf.d/everwear.conf`
  - `apps/operations/{Dockerfile,nginx.conf}`; `apps/{backend,storefront}/Dockerfile` (workspace manifests)
- Docs: `AGENTS.md`, `README.md`, `.env.template`, and `docs/{FULFILMENT,FLEET,MARKETPLACE,LOGISTICS_ANALYTICS,PROJECT}.md`.

**Removed:** `apps/warehouse`, `apps/rider`, `apps/seller`, after their test
suites passed inside the portal. The separate `admin`, `warehouse`, `rider`
and `seller` compose services and upstreams are gone too.

## 6. MongoDB migration report

No data migration is needed, and none is run.
- Users stay in their four collections (`admin_users`, `warehouse_users`, `riders`, `sellers`); nothing is copied or merged. The portal links them at sign-in by email.
- Orders, shipments, fulfilments, delivery tasks, ledgers and every other business record are unchanged, and so are their references.
- New optional fields need no backfill:
  - `admin_users.status` (absent means active);
  - `sessionsRevokedAt` on the four account collections;
  - `audit_logs.actorRealm`.
- New collections `ops_sessions` and `ops_password_resets` are created with their indexes by `ensureIndexes` when the API starts. One new index is added: `audit_logs {action, createdAt}`.
- `npm run ops:audit` in `apps/backend` is read-only. It reports accounts per kind and state, how many can sign in, emails held by more than one kind of account, and the portal collections with their indexes.

  Its output on the local `everwear` database (2026-11-05):

  ```text
  admin 8 (active 8); can sign in: 8
  warehouse 1 (active 1); can sign in: 1
  rider 1 (approved 1); can sign in: 1
  seller 1 (approved 1); can sign in: 1
  Emails with more than one kind of account: 0
  ops_sessions: _id_, tokenHash_1, memberships.realm_1_memberships.id_1, expiresAt_1
  No documents were changed.
  ```

## 7. API compatibility

- **Every existing route, request and response shape is unchanged.** `/admin`, `/warehouse`, `/rider`, `/seller` and `/store` behave as before. The realm login routes (`/admin/auth/login`, `/warehouse/auth/login`, `/rider/auth/login`, `/seller/auth/login`) still issue bearer tokens, and bearer tokens still work.
- **Additive:**
  - `/ops/*`, `/admin/accounts/:realm/:id/revoke-sessions` and `/admin/audit-logs`;
  - `status` on admin users, in responses and accepted by `PATCH`;
  - `sessionsRevokedAt` may appear in rider and seller self-views.
- **Behaviour changes:**
  - A suspended admin can no longer sign in or use a token (before, admins couldn't be suspended).
  - Demoting or suspending the last active owner returns `409 last_owner` for any target role, not only `staff`.
  - A bearer token issued before a password change, reset, suspension or sign-out-everywhere is refused with 401.
- **CORS:** the portal's origin (`OPS_CORS`, default `ADMIN_CORS`) is allowed on all five operational prefixes. `WAREHOUSE_CORS`, `RIDER_CORS` and `SELLER_CORS` now only add extra origins.
- **Customers and the storefront:** no change. Customer auth is still bearer-only; customer requests never consult the portal session.

## 8. Deployment and environment

- **Production:** `docker-compose.prod.yml` runs these containers:
  - `mongodb`
  - `backend`
  - `storefront`
  - `operations`
  - `reverse-proxy`

  That is one storefront, one operations frontend, one API and one database. Uploads stay on the backend's volumes.
- **Hosts and cookies:** the portal is served at `admin.everwear.com` and the API at `api.everwear.com`. These are the same site, so the `SameSite=Strict` cookie works without a cookie domain. If the portal moves to a different registrable domain from the API, serve the API under the portal's origin (a reverse-proxy path) instead.

New and changed backend settings:

| Variable | Default | Meaning |
| --- | --- | --- |
| `OPS_CORS` | `ADMIN_CORS` | Portal origins for `/ops`, `/admin`, `/warehouse`, `/rider`, `/seller` |
| `OPS_APP_URL` | `http://localhost:7001` | Where reset links point |
| `OPS_COOKIE_SECURE` | production: on | Force the cookie's Secure flag |
| `OPS_COOKIE_DOMAIN` | unset | Only for split subdomains needing a shared cookie |
| `WAREHOUSE_APP_URL`, `RIDER_APP_URL` | `…:7001/warehouse`, `…:7001/delivery` | Links in staff and rider messages |
| `WAREHOUSE_CORS`, `RIDER_CORS`, `SELLER_CORS` | empty | Extra origins only (e.g. a standalone app during rollback) |

- **Portal build:** `VITE_API_URL`, as the admin had.
- **Development:** `npm run dev` from the root, or `npm run operations:dev` (port 7001) with `npm run backend:dev` (port 9100).
- **Email:** password reset needs `NOTIFY_EMAIL_PROVIDER` with SMTP or SES configured. Without one, the request is still accepted and logged, but no email goes out, and an owner has to set the password from Users & Role Access.

## 9. Rollback

The change is one commit. The data needs no reversal, because nothing was
rewritten.

1. Revert the commit: `git revert <commit>`. This restores `apps/admin`, `apps/warehouse`, `apps/rider`, `apps/seller` and their compose services and nginx blocks, and the backend without `/ops`. Redeploy.
2. **Partial rollback, keeping the new API:** check out `apps/warehouse`, `apps/rider` or `apps/seller` from the commit before this one and deploy it on its old host. Add its origin to `WAREHOUSE_CORS`, `RIDER_CORS` or `SELLER_CORS`. Its bearer-token login still works, because the API still has those routes.
3. Nothing is needed in MongoDB. `ops_sessions` and `ops_password_resets` can be dropped or left; the older code ignores them. Admins suspended under the new code have `status: "suspended"`, which older code doesn't check: unset it, or delete those admins, if that matters during a rollback.
4. Restore the old DNS targets for `warehouse.`, `rider.` and `sellers.` if the redirects were removed upstream.

## 10. Tests

Results on 2026-11-06, each suite run one after another on a local MongoDB
replica set:

| Check | Result |
| --- | --- |
| Backend `npm test` | 263/263 pass (15 of them in `ops-portal.test.ts`) |
| Portal `npm run typecheck`, `npm test`, `npm run build` | clean; 4/4 unit; build OK |
| `npm run test:e2e:portal` | 18/18 |
| `npm run test:e2e:areas` | 17/17 (warehouse 6, delivery 7, seller 4) |
| `npm run test:e2e:ops` | 34/34 across 6 areas |
| `npx playwright test` (admin views, typography, responsive) | 347 passed, 1 skipped (no promotion in the test data to pause) |
| Storefront `tsc --noEmit` | clean (storefront code unchanged) |

| Suite | Command | Covers |
| --- | --- | --- |
| Backend | `npm test` (apps/backend) | Everything as before, plus `test/ops-portal.test.ts`:<br>- roles per account kind<br>- multi-account email<br>- CSRF header<br>- area isolation over the session<br>- warehouse, rider and admin-role scoping through the session<br>- sign-out, expiry, old bearer tokens<br>- suspension and its token cut-off<br>- last-owner rule<br>- session list and revoke<br>- admin revoke rights<br>- password change<br>- reset email through a local SMTP server<br>- CORS |
| Portal | `npm run test:e2e:portal` | Signed-out redirects; each of 6 roles' landing page and refused areas, in the browser and against the API; staff navigation; multi-role switching; Ctrl+K scope; deep link after sign-in; old admin URLs; sign-out; session ended elsewhere; suspended sign-in; password change; forgot and reset; phone width; axe. |
| Areas | `npm run test:e2e:areas` | The warehouse, rider and seller workflows they had as apps |
| Admin | `npx playwright test`, `npm run test:e2e:ops` | The admin's view and operations suites under `/admin` |
