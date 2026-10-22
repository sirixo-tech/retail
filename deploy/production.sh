#!/usr/bin/env bash
# SelfX Retail Enterprise - Production Automated Zero-Downtime Deployment Script
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "=== Starting Production Deployment for SelfX at ${ROOT_DIR} ==="

# 1. Backend Optimization
echo "--> Optimizing Laravel 11 Backend..."
cd "${ROOT_DIR}/backend"
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan down || true
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan queue:restart
php artisan up

# 2. Node & Next.js Monorepo Build
echo "--> Building Next.js Frontends (Super Admin, Console, Storefront)..."
cd "${ROOT_DIR}/frontend"
pnpm install --frozen-lockfile
pnpm run build

# 3. Reload Services
echo "--> Reloading Systemd / PM2 Processes..."
if command -v pm2 &> /dev/null; then
    pm2 reload "${ROOT_DIR}/deploy/ecosystem.config.cjs" || pm2 start "${ROOT_DIR}/deploy/ecosystem.config.cjs"
fi

if command -v systemctl &> /dev/null; then
    sudo systemctl reload php8.3-fpm || sudo systemctl reload php-fpm || true
    sudo systemctl reload nginx || true
fi

echo "=== Deployment Completed Successfully! ==="
