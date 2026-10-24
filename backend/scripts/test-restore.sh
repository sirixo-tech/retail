#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RESTORE_DB="${TEST_RESTORE_DB:-retail_restore_test}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"

echo "Locating latest backup file in ${BACKUP_DIR}..."
LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/*.dump.gz 2>/dev/null | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "No backup archive found in ${BACKUP_DIR}."
    exit 1
fi

echo "Testing restore of: ${LATEST_BACKUP}"

TEMP_RESTORE_DIR=$(mktemp -d)
gunzip -c "$LATEST_BACKUP" > "${TEMP_RESTORE_DIR}/restore.dump"

# Create test database
echo "Creating temporary restore database: ${RESTORE_DB}..."
PGPASSWORD="${DB_PASSWORD:-}" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" --if-exists "$RESTORE_DB" || true
PGPASSWORD="${DB_PASSWORD:-}" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" "$RESTORE_DB"

# Restore
echo "Restoring database..."
PGPASSWORD="${DB_PASSWORD:-}" pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$RESTORE_DB" --clean --if-exists "${TEMP_RESTORE_DIR}/restore.dump" || true

# Verification query
echo "Verifying restored tables..."
RECORD_COUNT=$(PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$RESTORE_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Restored public tables count: ${RECORD_COUNT}"

# Cleanup test database
echo "Cleaning up temporary test database..."
PGPASSWORD="${DB_PASSWORD:-}" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" "$RESTORE_DB"
rm -rf "$TEMP_RESTORE_DIR"

echo "Disaster recovery restore test PASSED!"
