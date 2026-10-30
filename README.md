# Everwear Commerce Platform

**Everwear** is a multi-region direct-to-consumer online fashion and apparel commerce platform serving Europe and India. Engineered as a high-performance headless commerce architecture inside a Turborepo monorepo, Everwear connects an Express/MongoDB transactional commerce backend, a modern Next.js 16 storefront, and a 16-module operational administrative suite.

---

## 1. Monorepo Architecture

| App | Package | Technology Stack | Default URL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`apps/backend`** | `@dtc/backend` | Node.js 22, Express 5, MongoDB 7, Zod, JWT | `http://localhost:9100` | Commerce API: catalog, carts, checkout, multi-document transactions, webhooks, payments, carriers, and admin endpoints. |
| **`apps/storefront`** | `@dtc/storefront` | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui + ReUI | `http://localhost:8001` | Customer shop: faceted catalog search, typeahead, currency & region routing, bag, checkout, payments, customer portal. |
| **`apps/admin`** | `@dtc/admin` | React 18/19, Vite 6, Tailwind CSS, Lucide | `http://localhost:7001` | Operations console: 16 integrated modules for live orders, inventory telemetry, dispatch manifests, GST compliance, and CRM. |

---

## 2. Key Features

### Storefront & Customer Experience
- **Multi-Region & Currency Detection**: Automatic geo-detection routing for India (INR / `in`) and European territories (EUR / `dk`, `de`, `fr`).
- **Faceted Catalog Discovery**: Fast text search, category trees, collection landings, color/size variant selector, price filtering, and out-of-stock indicators.
- **Transactional Cart & Checkout**: Promotion coupon engine, dynamic shipping option pricing, address book selection, and stock reservation.
- **Dual Payment Engine**: Razorpay (UPI, NetBanking, Cards) for INR and Stripe (Credit Cards, Apple Pay) for EUR, alongside Cash On Delivery (COD).
- **Customer Self-Service Portal**: Order history, live carrier waybill tracking, return requests, and multi-address management.

### Operational Admin Suite (16 Modules)
1. **Executive Overview**: Real-time revenue metrics, regional fulfillment node telemetry, and operations alerts.
2. **Order Management**: Order lifecycle controls, packing state transitions, payment status verification, and itemized customer inspection.
3. **Product Catalog**: SKU management, multi-variant generation, pricing per region, and image uploads.
4. **Categories & Collections**: Hierarchical taxonomies, marketing collections, and seasonal drop scheduling.
5. **Inventory & Warehouses**: Real-time inventory tracking, low-stock threshold triggers, and multi-warehouse bin adjustments.
6. **Fulfillment & Dispatch**: Carrier manifest creation, one-click AWB generation, packing slip generation, and tracking telemetry.
7. **Returns & Exchanges**: Inspection workflow, return authorizations, reverse courier pickups, and automated credit note issuance.
8. **Customers & Loyalty**: VIP tier segmentation, lifetime value telemetry, order frequency metrics, and customer notes.
9. **Promotions & Coupons**: Percentage and fixed-discount vouchers, minimum cart thresholds, and expiry management.
10. **GST & Tax Invoices**: Automatic GST invoice generation, CGST/SGST/IGST breakdown, and compliance export.
11. **Payments & Reconciliation**: Gateway settlement tracking, payment method audit, and reconciliation ledgers.
12. **Credit Notes & Refunds**: Automated legal credit note generation and gateway refund triggers.
13. **Purchase Orders & Suppliers**: Vendor management, procurement PO lifecycles, and restock receipts.
14. **Analytics & Reports**: Sales velocity, regional revenue distribution, conversion metrics, and CSV data export.
15. **Users & Role Access (RBAC)**: Fine-grained admin role management (Owner, Admin, Staff) with protection against last-owner removal.
16. **System Settings**: Global operational rules, default fulfillment hubs, return windows, and store policies.

---

## 3. Getting Started (Local Development)

### Prerequisites
- **Node.js 22+** and **npm 10+**
- **MongoDB 7.0+** running as a **single-node replica set** (`rs0`). Multi-document transactions require a replica set.

### Quick Start with Docker
```bash
# Clone the repository
git clone https://github.com/mozammilrja/-my-store.git
cd -- -my-store

# Copy root environment
cp .env.example .env

# Start full stack via Docker Compose
docker compose up -d
```

### Manual Local Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure API environment**:
   ```bash
   cp apps/backend/.env.template apps/backend/.env
   ```
   Set `JWT_SECRET` (minimum 32 characters) and verify `MONGODB_URI` points to your replica set:
   ```ini
   MONGODB_URI=mongodb://localhost:27017/?replicaSet=rs0&directConnection=true
   JWT_SECRET=replace_with_a_secure_random_string_of_at_least_32_characters
   ```

3. **Generate First Admin Account**:
   ```bash
   cd apps/backend && npm run admin:create -- admin@everwear.test "adminpassword123" "Lead Admin"
   cd ../..
   ```

4. **Configure Storefront & Admin environments**:
   ```bash
   cp apps/storefront/.env.template apps/storefront/.env.local
   cp apps/admin/.env.example apps/admin/.env.local
   ```

5. **Start Dev Server (All Apps)**:
   ```bash
   npm run dev
   ```

| Service | Local Dev URL |
| :--- | :--- |
| **Storefront** | http://localhost:8001 |
| **Admin Console** | http://localhost:7001 |
| **Backend API** | http://localhost:9100 |
| **API Health Check** | http://localhost:9100/health |

---

## 4. Verification & Testing

Everwear features test suites across all layers:

```bash
# Backend Test Suites (32 tests in 9 suites: auth, orders, products, payments, logistics, E2E)
npm test --workspace=@dtc/backend

# Type-checking across all packages
npm run typecheck

# Code quality and linting
npm run lint

# Production compilation
npm run build
```

---

## 5. Production & Infrastructure Documentation

Detailed guides are available in the repository:

- 📖 **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Production deployment, Docker Compose, systemd, SSL/TLS, and Nginx reverse proxy.
- 💳 **[PAYMENT_SETUP.md](./PAYMENT_SETUP.md)** — Razorpay and Stripe configuration, webhook setup, and refund settlement.
- 🚚 **[SHIPPING_SETUP.md](./SHIPPING_SETUP.md)** — Delhivery and BlueDart carrier credentials and waybill generation.
- 💾 **[BACKUP_RECOVERY.md](./BACKUP_RECOVERY.md)** — MongoDB backups, automated cron scripts, and disaster recovery.
- 🏛️ **[PROJECT.md](./docs/PROJECT.md)** — Core architecture, design tokens, and technical reference.

---

## 6. Monorepo Scripts Reference

Run from repository root:
- `npm run dev`: Starts all workspace applications in watch mode.
- `npm run backend:dev`: Starts only the Backend API.
- `npm run admin:dev`: Starts only the Admin Console.
- `npm run storefront:dev`: Starts only the Next.js Storefront.
- `npm run build`: Runs production compilation across all packages.
- `npm run lint`: Runs ESLint checks across all apps.
- `npm run typecheck`: Runs TypeScript compiler type-checks.
