# Everwear Database Reliability, Backup & Disaster Recovery Guide

The Everwear Commerce Platform uses **MongoDB 7.0** configured with a replica set (`rs0`) for multi-document ACID transactions (cart checkouts, concurrent stock deductions, and financial order allocations).

---

## 1. Replica Set Architecture: Single-Node vs 3-Node High Availability

### Default Single-Node Architecture (`docker-compose.prod.yml`)
- **Node Count**: 1 (Single Primary `rs0`)
- **Capability**: Enables MongoDB multi-document ACID transactions (`withTransaction`).
- **Limitation**: **Not Fault-Tolerant (No High Availability).** If the host server crashes, automatic failover cannot occur. This single-node configuration is tailored for single-server VPS deployments (e.g. 4GB–16GB RAM VPS) where running 3 full database nodes on the same host would waste memory without providing real hardware redundancy.

### Enterprise 3-Node High Availability (HA) Production Setup
For enterprise mission-critical deployments requiring zero hardware single-points-of-failure:
1. Deploy 3 separate database nodes across different availability zones or cloud hosts:
   - `mongo-primary.internal:27017`
   - `mongo-secondary-1.internal:27017`
   - `mongo-secondary-2.internal:27017`
2. Initialize with replica set members:
   ```javascript
   rs.initiate({
     _id: "rs0",
     members: [
       { _id: 0, host: "mongo-primary.internal:27017", priority: 2 },
       { _id: 1, host: "mongo-secondary-1.internal:27017", priority: 1 },
       { _id: 2, host: "mongo-secondary-2.internal:27017", priority: 1 }
     ]
   });
   ```
3. Update connection string in `apps/backend/.env`:
   ```ini
   MONGODB_URI=mongodb://mongo-primary.internal:27017,mongo-secondary-1.internal:27017,mongo-secondary-2.internal:27017/everwear?replicaSet=rs0&readPreference=primaryPreferred
   ```

---

## 2. Recovery Objectives (RPO & RTO)

| Metric | Target (Standard Snapshot) | Target (Oplog Continuous PITR) | Definition |
| :--- | :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | **1 to 24 Hours** | **< 60 Seconds** | The maximum acceptable data loss measured in time. With daily snapshots, maximum loss is 24 hours of orders; with hourly snapshots, 1 hour; with continuous oplog, near zero. |
| **RTO (Recovery Time Objective)** | **< 20 Minutes** | **< 45 Minutes** | The maximum acceptable duration to restore service after a catastrophic database failure. |

---

## 3. Storage Architecture & Persistent Volumes

In `docker-compose.prod.yml`, data persistence is isolated from container lifecycles:
- **MongoDB Data Volume**: `mongodb_data` mounted at `/data/db`.
- **Product Media Uploads**: `backend_uploads` mounted at `/app/apps/backend/uploads`.

Stopping, restarting, or upgrading containers via `docker compose -f docker-compose.prod.yml down` and `docker compose -f docker-compose.prod.yml up -d` **preserves all database records and media files**.

---

## 4. Scheduled Backup Schedule & Retention Policy

### Daily Snapshot Script
Create the backup script at `/opt/everwear/scripts/backup-mongodb.sh`:

```bash
#!/bin/bash
set -eo pipefail

BACKUP_DIR="/var/backups/everwear/mongodb"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TARGET_DIR="${BACKUP_DIR}/${TIMESTAMP}"
RETENTION_DAYS=14

mkdir -p "${TARGET_DIR}"

echo "[$(date)] Starting Everwear MongoDB backup..."

# Dump database using Docker exec
docker compose -f /var/www/everwear/docker-compose.prod.yml exec -T mongodb \
  mongodump --db everwear --archive --gzip > "${TARGET_DIR}/everwear_${TIMESTAMP}.archive.gz"

echo "[$(date)] Backup completed: ${TARGET_DIR}/everwear_${TIMESTAMP}.archive.gz"

# Prune backups older than 14 days
find "${BACKUP_DIR}" -type f -name "*.archive.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Old backups older than ${RETENTION_DAYS} days pruned."
```

Make the script executable:
```bash
sudo chmod +x /opt/everwear/scripts/backup-mongodb.sh
```

### Schedule Cron Jobs
Add to `/etc/crontab`:
```cron
# Daily full backup at 02:30 AM UTC
30 2 * * * root /opt/everwear/scripts/backup-mongodb.sh >> /var/log/everwear_backup.log 2>&1

# Hourly delta backup between 08:00 and 22:00 UTC (optional for higher transaction volume)
0 8-22 * * * root /opt/everwear/scripts/backup-mongodb.sh >> /var/log/everwear_backup.log 2>&1
```

---

## 5. Continuous Point-in-Time Recovery (PITR via Oplog)

> [!NOTE]
> Continuous Point-in-Time Recovery (PITR) requires recording the replica set oplog continuously alongside the base snapshot. Standard `mongodump` snapshots restore data to the exact second the backup script executed.

### Capturing Base Snapshot + Oplog
```bash
docker compose -f docker-compose.prod.yml exec -T mongodb \
  mongodump --oplog --archive --gzip > "/var/backups/everwear/mongodb/everwear_pitr_$(date +%Y%m%d).archive.gz"
```

### Restoring to an Exact Timestamp (PITR)
To restore up to an exact second (e.g., right before an accidental bulk deletion or corrupt import):
```bash
# 1. Stop backend service
docker compose -f docker-compose.prod.yml stop backend

# 2. Replay oplog up to specific cluster timestamp (e.g. 1761849600:1)
cat /var/backups/everwear/mongodb/everwear_pitr_20261030.archive.gz | \
  docker compose -f docker-compose.prod.yml exec -T mongodb \
  mongorestore --drop --oplogReplay --oplogLimit "1761849600:1" --archive --gzip

# 3. Restart backend service
docker compose -f docker-compose.prod.yml start backend
```

---

## 6. Disaster Recovery Procedures

### Scenario A: Restoring Database on Existing Host
```bash
# 1. Stop backend service
docker compose -f docker-compose.prod.yml stop backend

# 2. Restore archive
cat /var/backups/everwear/mongodb/20261030_023000/everwear_20261030_023000.archive.gz | \
  docker compose -f docker-compose.prod.yml exec -T mongodb \
  mongorestore --db everwear --drop --archive --gzip

# 3. Restart backend service
docker compose -f docker-compose.prod.yml start backend
```

### Scenario B: Complete Server Disaster Recovery (New VM)
1. Provision a fresh Ubuntu 24.04 VM.
2. Clone repository:
   ```bash
   git clone https://github.com/mozammilrja/-my-store.git /var/www/everwear
   cd /var/www/everwear
   cp .env.example .env
   # Ensure JWT_SECRET matches the original secret so customer sessions remain valid
   ```
3. Start database container:
   ```bash
   docker compose -f docker-compose.prod.yml up -d mongodb
   ```
4. Restore latest database archive:
   ```bash
   cat latest_everwear.archive.gz | docker compose -f docker-compose.prod.yml exec -T mongodb \
     mongorestore --db everwear --archive --gzip
   ```
5. Restore product media uploads:
   ```bash
   tar -xzf uploads_backup.tar.gz -C /var/lib/docker/volumes/everwear_backend_uploads/_data/
   ```
6. Start all services:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
