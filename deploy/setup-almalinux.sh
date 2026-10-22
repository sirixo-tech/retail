#!/usr/bin/env bash
# Sirixo Retail - AlmaLinux 8/9 Automated Production Environment Setup
# Installs PHP 8.3, Node.js 20, pnpm, PM2, Composer, Nginx, Certbot & Configures SELinux
set -euo pipefail

echo "=========================================================="
echo " Starting Sirixo Retail Environment Setup for AlmaLinux "
echo "=========================================================="

# 1. Update system
echo "--> Updating system packages..."
sudo dnf update -y

# 2. Install EPEL and Remi repositories for PHP 8.3
echo "--> Setting up EPEL & Remi Repositories..."
sudo dnf install -y epel-release
RHEL_VERSION=$(rpm -E %rhel)
sudo dnf install -y "https://rpms.remirepo.net/enterprise/remi-release-${RHEL_VERSION}.rpm" || true

# 3. Enable PHP 8.3 module
echo "--> Enabling PHP 8.3 Remi Module..."
sudo dnf module reset php -y || true
sudo dnf module enable php:remi-8.3 -y || true

# 4. Install PHP 8.3 and all required extensions
echo "--> Installing PHP 8.3 and extensions..."
sudo dnf install -y php php-fpm php-cli php-common php-pgsql php-sqlite3 \
    php-curl php-mbstring php-xml php-zip php-bcmath php-intl php-gd \
    php-opcache php-process git curl unzip nginx certbot python3-certbot-nginx

# 5. Install Composer
echo "--> Installing Composer..."
if ! command -v composer &> /dev/null; then
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
fi

# 6. Install Node.js 20 LTS & pnpm & PM2
echo "--> Installing Node.js 20, pnpm, and PM2..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo dnf install -y nodejs
fi
sudo npm install -g pnpm pm2

# 7. Configure SELinux to allow Nginx reverse proxy connections (Critical on AlmaLinux)
echo "--> Configuring SELinux boolean permissions..."
sudo setsebool -P httpd_can_network_connect 1 || true
sudo setsebool -P httpd_can_network_relay 1 || true

# 8. Configure Firewall for HTTP (80) and HTTPS (443)
echo "--> Configuring Firewall..."
if command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-service=http || true
    sudo firewall-cmd --permanent --add-service=https || true
    sudo firewall-cmd --reload || true
fi

# 9. Enable & Start Services
echo "--> Enabling and starting Nginx & PHP-FPM..."
sudo systemctl enable --now nginx
sudo systemctl enable --now php-fpm

echo "=========================================================="
echo " AlmaLinux Environment Setup Completed Successfully! "
echo "=========================================================="
