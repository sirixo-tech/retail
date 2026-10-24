#!/bin/bash
set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups}"
mkdir -p "$BACKUP_DIR"

DB_DATABASE="${DB_DATABASE:-retail}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"

BACKUP_FILE="${BACKUP_DIR}/retail_${DATE}.dump"
GZ_FILE="${BACKUP_FILE}.gz"

echo "Starting PostgreSQL backup: ${BACKUP_FILE}..."

# PostgreSQL dump
PGPASSWORD="${DB_PASSWORD:-}" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" \
    --format=custom \
    --file="$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

# Upload to S3 if configured
if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
    echo "Uploading to s3://${S3_BACKUP_BUCKET}/database/..."
    aws s3 cp "$GZ_FILE" "s3://${S3_BACKUP_BUCKET}/database/" --storage-class STANDARD_IA
fi

# Cleanup old backups older than 30 days
find "$BACKUP_DIR" -name "*.dump.gz" -mtime +30 -delete

# Record backup timestamp
date +%s > "${BACKUP_DIR}/latest_backup_timestamp.txt"

echo "Backup completed successfully: ${GZ_FILE}"
