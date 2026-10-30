# Everwear Carrier Logistics & Shipping Integration Guide

Everwear provides integrated logistics telemetry and carrier dispatch for domestic fulfillment across India:
- **Delhivery Express**: Primary surface and air courier for automated AWB generation, shipping labels, dispatch manifests, and reverse return pickups.
- **BlueDart Express**: Premium express air courier for metro-to-metro high-priority dispatches.

Both carrier adapters support sandboxed staging mock simulation and direct production API dispatch based on environment credentials.

---

## 1. Delhivery Express Setup

### Step 1: Open Delhivery Enterprise Account
1. Register a corporate shipping account at [Delhivery Enterprise](https://www.delhivery.com/).
2. Complete KYC and warehouse pickup address registration.
3. Access the **Delhivery Developer Portal** -> **API Credentials**.

### Step 2: Obtain API Credentials
- **Client ID**: Your registered client code (e.g., `EVERWEAR_PROD`).
- **API Token**: The authorization bearer token provided by your Delhivery account manager.

### Step 3: Configure Environment Variables
In `apps/backend/.env`:
```ini
DELHIVERY_MODE=production
DELHIVERY_API_KEY=your_delhivery_production_token_here
DELHIVERY_CLIENT_ID=EVERWEAR_PROD
```

For sandboxed staging testing:
```ini
DELHIVERY_MODE=staging
DELHIVERY_API_KEY=test_sandbox_api_token
DELHIVERY_CLIENT_ID=EVERWEAR_STAGING
```

### Supported API Actions
1. **Shipment Creation (`createDelhiveryShipment`)**:
   - Calls `https://track.delhivery.com/api/cmu/create.json` (Production) or `https://staging-express.delhivery.com/...` (Staging).
   - Generates official numeric Waybill / AWB (`DELH-...`).
   - Generates thermal shipping label URL and packing slip barcode.
2. **Real-Time Telemetry Tracking (`trackDelhiveryShipment`)**:
   - Queries `https://track.delhivery.com/api/v1/packages/json/?waybill=...`.
   - Returns live courier scan history, origin/destination hub hops, and expected delivery date.
3. **Reverse Pickup for Returns**:
   - Generates reverse courier pickup AWB for customer product exchanges and return inspections.

---

## 2. BlueDart Express Setup

### Step 1: Acquire BlueDart Apex Credentials
1. Coordinate with your regional BlueDart corporate account manager.
2. Obtain:
   - **Customer Code** (6-digit numeric identifier)
   - **Login ID**
   - **Licence Key** (Soap / REST API authentication key)

### Step 2: Configure Environment Variables
In `apps/backend/.env`:
```ini
BLUEDART_API_MODE=production
BLUEDART_CUSTOMER_CODE=123456
BLUEDART_LOGIN_ID=BLR001
BLUEDART_LICENCE_KEY=your_bluedart_licence_key_32_chars
```

For staging verification:
```ini
BLUEDART_API_MODE=staging
BLUEDART_CUSTOMER_CODE=test_code
BLUEDART_LOGIN_ID=test_login
BLUEDART_LICENCE_KEY=test_licence
```

### Supported API Actions
1. **Air Waybill Dispatch (`createBlueDartShipment`)**:
   - Dispatches transit payload to BlueDart TrackDart gateway.
   - Generates Waybill (`BLUD-...`).
2. **Waybill Query (`trackBlueDartShipment`)**:
   - Retrieves live scan transit telemetry and hub coordinates.

---

## 3. Operations Workflow in Admin Console

1. **Order Manifestation**:
   - Go to **Order Management** or **Shipments & Dispatch**.
   - Select an order ready for dispatch (`packed` or `paid`).
   - Click **Generate AWB / Dispatch**.
   - Choose carrier: **Delhivery** or **BlueDart**.
   - The system calls the carrier API, stores the Waybill, sets fulfillment status to `shipped`, and provides a printable thermal packing slip.
2. **Live Tracking Sync**:
   - Customers can track live transit directly in their order view at `/account/orders/details/[id]`.
   - Admins can trigger manual telemetry sync in **Shipments & Dispatch**.
