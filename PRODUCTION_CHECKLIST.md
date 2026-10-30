# Everwear Commerce Platform - Production Deployment Verification Checklist

This checklist provides an exact, step-by-step verification protocol for deploying the Everwear Commerce Platform to a clean production server (Ubuntu 24.04 LTS VM).

---

## 1. Pre-Flight Server Infrastructure Requirements

| Requirement | Minimum Specification | Production Recommended | Verification Command |
| :--- | :--- | :--- | :--- |
| **Operating System** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS (x86_64) | `cat /etc/os-release` |
| **CPU Architecture** | 2 vCPU cores | 4+ vCPU cores | `lscpu | grep "CPU(s):"` |
| **System Memory** | 4 GB RAM | 8 GB – 16 GB RAM | `free -h` |
| **Storage** | 30 GB SSD | 80 GB+ NVMe SSD | `df -h /` |
| **Container Engine**| Docker Engine 26+ | Docker Engine 27+ with Compose v2 | `docker --version && docker compose version` |
| **Public IP & Firewall**| Ports 80 & 443 open | UFW: 22, 80, 443 only | `sudo ufw status` |

---

## 2. Server Provisioning & Docker Installation (Fresh Ubuntu 24.04 VM)

Execute on the target host as `root` or `sudo`:

```bash
# Step 1: System packages update
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw certbot ca-certificates

# Step 2: Configure basic firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Step 3: Install official Docker Engine & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```
*Expected Output*:
```text
Client: Docker Engine - Community
 Version: 27.x.x
Docker Compose version v2.29.x
```

---

## 3. Deployment Steps & Exact Verification Commands

### Step 1: Clone Repository
```bash
sudo mkdir -p /var/www/everwear
sudo chown -R $USER:$USER /var/www/everwear
git clone https://github.com/mozammilrja/-my-store.git /var/www/everwear
cd /var/www/everwear
```

### Step 2: Environment Configuration
```bash
cp .env.example .env
```
Edit `.env` and configure:
```ini
# Cryptographic secret (must be 32+ characters)
JWT_SECRET=$(openssl rand -base64 48)

# Domain Names
DOMAIN_STORE=everwear.com
DOMAIN_ADMIN=admin.everwear.com
DOMAIN_API=api.everwear.com

# CORS Allowed Origins
STORE_CORS=https://everwear.com,https://www.everwear.com
ADMIN_CORS=https://admin.everwear.com

# Public URLs
API_PUBLIC_URL=https://api.everwear.com
NEXT_PUBLIC_BASE_URL=https://everwear.com
NEXT_PUBLIC_DEFAULT_REGION=in

# Payment Gateways (Leave blank if testing with staging mock adapters first)
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

### Step 3: Provision SSL Certificates (Let's Encrypt Certbot)
```bash
sudo certbot certonly --standalone \
  -d everwear.com \
  -d www.everwear.com \
  -d admin.everwear.com \
  -d api.everwear.com \
  --email ops@everwear.com \
  --agree-tos \
  --non-interactive

# Copy certificates into Nginx mount location
mkdir -p nginx/ssl/live/everwear.com
sudo cp /etc/letsencrypt/live/everwear.com/fullchain.pem nginx/ssl/live/everwear.com/
sudo cp /etc/letsencrypt/live/everwear.com/privkey.pem nginx/ssl/live/everwear.com/
sudo chown -R $USER:$USER nginx/ssl
```

### Step 4: Build Images from Scratch & Launch
```bash
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Step 5: Verify Container Health Status
```bash
docker compose -f docker-compose.prod.yml ps
```
*Expected Output*:
```text
NAME                  IMAGE                        STATUS
everwear-mongodb      mongo:7.0-jammy              Up (healthy)
everwear-backend      everwear-backend             Up (healthy)
everwear-storefront   everwear-storefront          Up (healthy)
everwear-admin        everwear-admin               Up (healthy)
everwear-proxy        nginx:alpine                 Up
```

### Step 6: Initialize First Store Owner Admin
```bash
docker compose -f docker-compose.prod.yml exec backend \
  npm run admin:create -- admin@everwear.com "SuperSecretPassw0rd!" "Operations Director"
```
*Expected Output*:
```text
Created admin user: admin@everwear.com (role: owner)
```

### Step 7: Test Container Persistence & Restart Survival
```bash
# Stop stack
docker compose -f docker-compose.prod.yml down

# Bring back up
docker compose -f docker-compose.prod.yml up -d

# Verify MongoDB still contains the admin user
docker compose -f docker-compose.prod.yml exec mongodb \
  mongosh everwear --eval "db.admin_users.find({}, {email: 1, role: 1})"
```
*Expected Output*:
```text
[ { _id: 'adm_...', email: 'admin@everwear.com', role: 'owner' } ]
```

---

## 4. Post-Deployment Verification Gate (Go / No-Go)

- [ ] **Health Endpoint**: `curl -f https://api.everwear.com/health` returns `{"status":"ok"}`.
- [ ] **HTTP to HTTPS**: `curl -I http://everwear.com` returns `HTTP/1.1 301 Moved Permanently`.
- [ ] **Storefront SSR**: Navigating to `https://everwear.com/in` loads catalog without client errors.
- [ ] **Admin Console SPA**: Navigating to `https://admin.everwear.com` loads login and dashboard.
- [ ] **Customer Journey**: Register customer, add item to cart, place COD test order, verify in Admin.
- [ ] **Webhooks**: Test webhook payload delivered from Razorpay/Stripe dashboard returns `200 OK`.
- [ ] **Thermal Dispatch**: Admin clicks "Generate AWB" and receives valid courier manifest tracking link.
- [ ] **Backup Cron**: Verify daily `backup-mongodb.sh` is active in `/etc/crontab`.
