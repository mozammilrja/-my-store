# Everwear Commerce Platform - Operations Troubleshooting & Diagnostics Guide

This document provides symptoms, diagnostic commands, root causes, and remediation procedures for operational issues encountered during staging or production.

---

## 1. Container & Infrastructure Diagnostics

### Symptom: `everwear-mongodb` container exits or fails health check
- **Diagnostic Command**:
  ```bash
  docker compose -f docker-compose.prod.yml logs mongodb
  ```
- **Common Root Cause 1: Permission Denied on `/data/db`**:
  - *Fix*:
    ```bash
    sudo chown -R 999:999 /var/lib/docker/volumes/everwear_mongodb_data/_data
    docker compose -f docker-compose.prod.yml restart mongodb
    ```
- **Common Root Cause 2: Replica Set `rs0` not initialized**:
  - *Fix*:
    ```bash
    docker compose -f docker-compose.prod.yml exec mongodb mongosh --eval "rs.initiate()"
    ```

---

### Symptom: `everwear-backend` fails startup with code 1
- **Diagnostic Command**:
  ```bash
  docker compose -f docker-compose.prod.yml logs backend
  ```
- **Root Cause 1: Missing or short `JWT_SECRET`**:
  - *Log Output*: `Invalid environment: JWT_SECRET must be at least 32 characters`
  - *Fix*: Ensure `JWT_SECRET` in `.env` has 32+ characters. Generate with `openssl rand -base64 48`.
- **Root Cause 2: Cannot connect to MongoDB replica set**:
  - *Log Output*: `MongoServerSelectionError: connect ECONNREFUSED`
  - *Fix*: Verify `mongodb` service is healthy:
    ```bash
    docker compose -f docker-compose.prod.yml exec mongodb mongosh --eval "rs.status().ok"
    ```

---

### Symptom: `everwear-storefront` fails build or exit on startup
- **Diagnostic Command**:
  ```bash
  docker compose -f docker-compose.prod.yml logs storefront
  ```
- **Root Cause: Missing `EVERWEAR_API_URL`**:
  - *Log Output*: `Error: missing required environment variables: EVERWEAR_API_URL`
  - *Fix*: In `docker-compose.prod.yml`, ensure `EVERWEAR_API_URL=http://backend:9100` is defined in the container environment.

---

### Symptom: `everwear-proxy` (Nginx) fails to start
- **Diagnostic Command**:
  ```bash
  docker compose -f docker-compose.prod.yml logs reverse-proxy
  ```
- **Root Cause: Missing SSL Certificate files**:
  - *Log Output*: `cannot load certificate "/etc/nginx/ssl/live/everwear.com/fullchain.pem": BIO_new_file() failed`
  - *Fix*: In local/staging testing without real Let's Encrypt certificates, generate temporary self-signed certificates:
    ```bash
    mkdir -p nginx/ssl/live/everwear.com
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout nginx/ssl/live/everwear.com/privkey.pem \
      -out nginx/ssl/live/everwear.com/fullchain.pem \
      -subj "/CN=everwear.com"
    docker compose -f docker-compose.prod.yml restart reverse-proxy
    ```

---

## 2. Database & Transaction Diagnostics

### Symptom: `Transaction numbers are only allowed on a replica set member or mongos`
- **Root Cause**: The MongoDB server was booted without the `--replSet rs0` flag, or the replica set was not initiated.
- **Fix**: Check that `command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]` is in `docker-compose.prod.yml` and run `rs.initiate()`:
  ```bash
  docker compose -f docker-compose.prod.yml exec mongodb mongosh --eval "rs.initiate()"
  ```

### Symptom: Slow Database Queries / High Latency
- **Diagnostic Command**:
  ```bash
  docker compose -f docker-compose.prod.yml exec mongodb \
    mongosh everwear --eval 'db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 }).limit(5)'
  ```
- **Fix**: Re-apply schema indexes to ensure compound indexes exist:
  ```bash
  docker compose -f docker-compose.prod.yml exec backend node -e '
  import { connect } from "./dist/db/client.js";
  import { ensureIndexes } from "./dist/db/schema.js";
  await connect();
  await ensureIndexes();
  console.log("Indexes refreshed");
  process.exit(0);'
  ```

---

## 3. Payment Gateway Webhook Diagnostics

### Symptom: Razorpay Webhook fails with `400 Invalid signature`
- **Diagnostics**:
  1. Verify whether `RAZORPAY_WEBHOOK_SECRET` in `.env` matches the secret configured in the Razorpay Webhooks dashboard. Note: Do not confuse `RAZORPAY_KEY_SECRET` with `RAZORPAY_WEBHOOK_SECRET`.
  2. Confirm raw body buffer is preserved. Everwear uses `express.json({ verify: (req, res, buf) => { req.rawBody = buf } })`.

### Symptom: Stripe Webhook rejected with `400 Invalid signature`
- **Diagnostics**:
  1. Verify server clock synchronization. Stripe enforces a 300-second tolerance window:
     ```bash
     timedatectl status
     sudo timedatectl set-ntp on
     ```
  2. Check `STRIPE_WEBHOOK_SECRET` begins with `whsec_`.

---

## 4. CORS Diagnostics

### Symptom: Browser displays `has been blocked by CORS policy`
- **Storefront Request to `/store/*`**:
  - Check `STORE_CORS` in `apps/backend/.env`.
  - Add the exact protocol, domain, and port (e.g. `STORE_CORS=https://everwear.com,https://shop.everwear.com`).
- **Admin Console Request to `/admin/*`**:
  - Check `ADMIN_CORS` in `apps/backend/.env`.
  - Add `ADMIN_CORS=https://admin.everwear.com`.
  - Restart backend:
    ```bash
    docker compose -f docker-compose.prod.yml restart backend
    ```

---

## 5. Emergency Rollback Procedure

If a production deploy causes unexpected customer-facing degradation:

```bash
# 1. Rollback git checkout to last known good tag
cd /var/www/everwear
git checkout <previous-release-tag>

# 2. Rebuild and restart the application containers
docker compose -f docker-compose.prod.yml build backend storefront admin
docker compose -f docker-compose.prod.yml up -d --no-deps backend storefront admin

# 3. Verify health
curl -f https://api.everwear.com/health
```
