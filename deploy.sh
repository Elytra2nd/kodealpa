#!/bin/bash
set -e

echo "🚀 Running deployment script..."
cd "$(dirname "$0")"

echo "🔧 Setting production environment..."
if [ -f .env ]; then
    sed -i 's|APP_URL=.*|APP_URL=https://codealpha-dungeon.tech|g' .env
    sed -i 's|APP_ENV=.*|APP_ENV=production|g' .env
    sed -i 's|APP_DEBUG=.*|APP_DEBUG=false|g' .env
fi

echo "🔒 Entering maintenance mode..."
php artisan down || true

echo "📦 Installing PHP dependencies..."
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

echo "🗄️  Running database migrations..."
php artisan migrate --force

echo "🗑️  Clearing cache..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

echo "⚡ Building cache..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "📁 Ensuring storage structure..."
mkdir -p storage/app/public/pdfs

echo "🔗 Ensuring storage link..."
php artisan storage:link || true

# ✅ Ensure PDF.js worker file exists
echo "📄 Ensuring PDF.js worker..."
mkdir -p public/js
if [ ! -f public/js/pdf.worker.min.js ]; then
    if [ -f node_modules/pdfjs-dist/build/pdf.worker.min.mjs ]; then
        cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/js/pdf.worker.min.js
        echo "✅ Worker file copied from node_modules"
    elif [ -f node_modules/pdfjs-dist/build/pdf.worker.min.js ]; then
        cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/js/pdf.worker.min.js
        echo "✅ Worker file copied from node_modules"
    else
        echo "⚠️  Worker file not found in node_modules"
    fi
fi

echo "🔓 Exiting maintenance mode..."
php artisan up

echo "✅ Deployment finished successfully!"
