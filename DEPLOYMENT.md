# Everwear Commerce Platform - Production Deployment Guide

This guide details how to deploy the **Everwear Commerce Platform** to production using Docker Compose, systemd, or bare metal, complete with SSL/TLS termination, automated database replica sets, and persistent volume management.

---

## 1. System Requirements & Architecture

| Service | Technology | Internal Port | Public URL / Port | Container Image / Base |
| :--- | :--- | :--- | :--- | :--- |
| **Reverse Proxy** | Nginx Alpine | 80, 443 | `https://everwear.com` | `nginx:alpine` |
| **Storefront** | Next.js 16 (App Router) | 8001 | `https://everwear.com` | `node:22-alpine` |
| **Admin SPA** | Vite + React 18 | 7001 | `https://admin.everwear.com` | `nginx:alpine` |
| **Backend API** | Node 22 + Express 5 | 9100 | `https://api.everwear.com` | `node:22-alpine` |
| **Database** | MongoDB 7.0 (Replica Set `rs0`) | 27017 | Internal Network only | `mongo:7.0-jammy` |

### Minimum Hardware Recommendations
- **CPU**: 2+ vCPU
- **RAM**: 4 GB RAM minimum (8 GB recommended for combined Next.js SSR and MongoDB cache)
- **Disk**: 40 GB NVMe SSD (with dedicated persistent volume for MongoDB and product uploads)
- **OS**: Ubuntu 22.04 LTS / 24.04 LTS or Debian 12

---

## 2. Production Environment Setup

### Step 1: Clone Repository & Setup Root Environment
```bash
git clone https://github.com/mozammilrja/-my-store.git /var/www/everwear
cd /var/www/everwear

# Copy the production orchestration environment
cp .env.example .env
```

Edit `.env` and configure:
```ini
# Production Domain Names
DOMAIN_STORE=everwear.com
DOMAIN_ADMIN=admin.everwear.com
DOMAIN_API=api.everwear.com

# Cryptographic Session Secrets
JWT_SECRET=$(openssl rand -base64 48)

# CORS Policy (strict browser origins)
STORE_CORS=https://everwear.com,https://www.everwear.com
ADMIN_CORS=https://admin.everwear.com

# Public URLs
API_PUBLIC_URL=https://api.everwear.com
NEXT_PUBLIC_BASE_URL=https://everwear.com
NEXT_PUBLIC_DEFAULT_REGION=in

# Payment Gateways (Leave empty if using staging mock fallbacks)
RAZORPAY_KEY_ID=rzp_live_REPLACE_ME
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_REPLACE_ME
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME

# Logistics Credentials
DELHIVERY_MODE=production
DELHIVERY_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DELHIVERY_CLIENT_ID=EVERWEAR_PROD
BLUEDART_API_MODE=production
BLUEDART_CUSTOMER_CODE=xxxxxx
BLUEDART_LOGIN_ID=xxxxxx
BLUEDART_LICENCE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 3. SSL/TLS Certificate Provisioning (Let's Encrypt / Certbot)

For automated HTTPS on `everwear.com`, `admin.everwear.com`, and `api.everwear.com`:

```bash
# Install Certbot
sudo apt update && sudo apt install -y certbot

# Request multi-domain certificate
sudo certbot certonly --standalone \
  -d everwear.com \
  -d www.everwear.com \
  -d admin.everwear.com \
  -d api.everwear.com \
  --email ops@everwear.com \
  --agree-tos \
  --non-interactive

# Link certificates into Nginx mount location
mkdir -p /var/www/everwear/nginx/ssl/live/everwear.com
sudo cp /etc/letsencrypt/live/everwear.com/fullchain.pem /var/www/everwear/nginx/ssl/live/everwear.com/
sudo cp /etc/letsencrypt/live/everwear.com/privkey.pem /var/www/everwear/nginx/ssl/live/everwear.com/
```

---

## 4. Launching with Docker Compose

Deploy the full production stack using the hardened `docker-compose.prod.yml`:

```bash
# Build and start all services in detached mode
docker compose -f docker-compose.prod.yml up -d --build
```

### Verifying Service Health
```bash
# Inspect container status and health checks
docker compose -f docker-compose.prod.yml ps

# Output should show all services healthy:
# everwear-mongodb     Up (healthy)
# everwear-backend     Up (healthy)
# everwear-storefront  Up (healthy)
# everwear-admin       Up (healthy)
# everwear-proxy       Up
```

### Initializing First Admin User
Run the administrative user generator inside the backend container:
```bash
docker compose -f docker-compose.prod.yml exec backend \
  npm run admin:create -- admin@everwear.com "SuperSecretPassw0rd!" "Operations Lead"
```

---

## 5. Systemd Service (Automated Host Boot Management)

Create a systemd unit file at `/etc/systemd/system/everwear.service`:

```ini
[Unit]
Description=Everwear Commerce Platform Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/var/www/everwear
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable and activate:
```bash
sudo systemctl daemon-reload
sudo systemctl enable everwear.service
sudo systemctl start everwear.service
```

---

## 6. Zero-Downtime Rolling Update Procedure

To deploy an updated version without downtime:

```bash
cd /var/www/everwear
git pull origin main

# Build updated images
docker compose -f docker-compose.prod.yml build backend storefront admin

# Re-create containers with updated images
docker compose -f docker-compose.prod.yml up -d --no-deps backend
docker compose -f docker-compose.prod.yml up -d --no-deps storefront
docker compose -f docker-compose.prod.yml up -d --no-deps admin

# Prune dangling build images
docker image prune -f
```

---

## 7. Health Monitoring & Log Inspection

- **Backend Health Check**: `https://api.everwear.com/health` (returns `{"status":"ok"}`)
- **Container Logs**:
  ```bash
  # Follow backend API logs
  docker compose -f docker-compose.prod.yml logs -f backend

  # Follow storefront SSR logs
  docker compose -f docker-compose.prod.yml logs -f storefront

  # Follow Nginx reverse proxy access/error logs
  docker compose -f docker-compose.prod.yml logs -f reverse-proxy
  ```

---

## 8. Troubleshooting & Rollback Procedures

### Emergency Rollback Procedure
If a bad release introduces unexpected production regressions:

1. **Rollback Git State to Last Known Stable Release**:
   ```bash
   cd /var/www/everwear
   git checkout <last-stable-commit-or-tag>
   ```

2. **Re-compile and Restart Services**:
   ```bash
   docker compose -f docker-compose.prod.yml build backend storefront admin
   docker compose -f docker-compose.prod.yml up -d --no-deps backend storefront admin
   ```

3. **Verify Restored Health**:
   ```bash
   curl -i https://api.everwear.com/health
   # Must return HTTP 200 {"status":"ok"}
   ```

### Common Failure Modes & Fixes

#### Issue 1: MongoDB Transaction Errors (`Transaction numbers are only allowed on a replica set member or mongos`)
- **Cause**: MongoDB started as a standalone server without replica set initialization.
- **Fix**: Run `docker compose -f docker-compose.prod.yml exec mongodb mongosh --eval "rs.initiate()"` to activate replica set `rs0`.

#### Issue 2: CORS Blocked on Storefront or Admin Requests
- **Cause**: The incoming domain or port does not appear in `STORE_CORS` or `ADMIN_CORS`.
- **Fix**: Add the origin to `.env` (e.g. `STORE_CORS=https://everwear.com,https://shop.everwear.com` and `ADMIN_CORS=https://admin.everwear.com`) and restart the backend (`docker compose -f docker-compose.prod.yml restart backend`).

#### Issue 3: Nginx SSL Handshake Failures / Port 443 Connection Refused
- **Cause**: Missing SSL certificate files at `/var/www/everwear/nginx/ssl/live/everwear.com/`.
- **Fix**: Check `certbot` output. In local environments without real DNS, test using HTTP port 80 or mount a self-signed development certificate:
  ```bash
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/live/everwear.com/privkey.pem \
    -out nginx/ssl/live/everwear.com/fullchain.pem \
    -subj "/CN=everwear.com"
  ```

