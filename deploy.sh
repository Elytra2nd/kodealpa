#!/bin/bash
set -e  # Exit on error

echo "🚀 Running deployment script..."

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Force production environment
echo "🔧 Setting production environment..."
if [ -f .env ]; then
    sed -i 's|APP_URL=.*|APP_URL=https://codealpha-dungeon.tech|g' .env
    sed -i 's|APP_ENV=.*|APP_ENV=production|g' .env
    sed -i 's|APP_DEBUG=.*|APP_DEBUG=false|g' .env
else
    echo "⚠️  Warning: .env file not found!"
fi

# Enter maintenance mode
echo "🔒 Entering maintenance mode..."
php artisan down || true

# Install PHP dependencies
echo "📦 Installing PHP dependencies..."
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

# Run migrations
echo "🗄️  Running database migrations..."
php artisan migrate --force

# Clear and rebuild cache
echo "🗑️  Clearing cache..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

echo "⚡ Building cache..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Ensure storage structure exists (without sudo)
echo "📁 Ensuring storage structure..."
mkdir -p storage/app/public/pdfs

# Ensure storage link exists
echo "🔗 Ensuring storage link..."
php artisan storage:link || true

# Exit maintenance mode
echo "🔓 Exiting maintenance mode..."
php artisan up

echo "✅ Deployment finished successfully!"
