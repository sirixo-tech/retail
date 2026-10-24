# Disaster Recovery Runbook

## Overview
This runbook defines the procedures for recovering the Retail SaaS database and services in the event of hardware failure, database corruption, or regional outages.

- **RPO (Recovery Point Objective):** 4 hours
- **RTO (Recovery Time Objective):** 4 hours

---

## 1. Automated Backups Schedule
- **Full Daily Backups:** Executed every morning at 02:00 UTC using `scripts/backup.sh`. Dumped and uploaded to S3 Standard-IA (`s3://${S3_BACKUP_BUCKET}/database/`).
- **Retention Policy:** 30 days retention locally and 90 days retention on S3 with Glacier lifecycle transition.
- **Monitoring:** `CheckBackupStatusJob` runs daily to assert backups are newer than 26 hours. Alerts sent to DevOps Slack webhook.

---

## 2. Disaster Scenarios & Recovery Procedures

### Scenario A: Accidental Data Corruption or Drop
1. **Identify Target Restore Point:**
   Find the latest valid backup timestamp before the incident in the S3 bucket:
   ```bash
   aws s3 ls s3://${S3_BACKUP_BUCKET}/database/
   ```
2. **Download Backup:**
   ```bash
   aws s3 cp s3://${S3_BACKUP_BUCKET}/database/retail_YYYYMMDD_HHMMSS.dump.gz /backups/
   gunzip /backups/retail_YYYYMMDD_HHMMSS.dump.gz
   ```
3. **Restore to Staging Database First:**
   ```bash
   TEST_RESTORE_DB=retail_staging /app/scripts/test-restore.sh
   ```
4. **Apply to Production:**
   Once verified, switch application traffic into maintenance mode (`php artisan platform:maintenance on`), restore the schema/data, and bring the application back online.

### Scenario B: Full Server Failure (New Host Provisioning)
1. Provision target cloud host / RDS instance.
2. Ensure PostgreSQL 16+ is running with required extensions (`pgcrypto`, `uuid-ossp`).
3. Restore database dump using `pg_restore -d <database> /path/to/dump`.
4. Deploy application container with environment configuration (`.env`).
5. Run migrations to verify consistency: `php artisan migrate --force`.
6. Run health check: `curl -f http://localhost/health`.

---

## 3. Weekly Verification
Run the automated test restore script in a staging container weekly:
```bash
./scripts/test-restore.sh
```
