#!/bin/bash
set -e # Hentikan skrip jika ada perintah yang gagal

echo "🚀 Running deployment script..."

# Masuk ke direktori proyek
cd /var/www/kodealpa

# Masuk ke mode maintenance
php artisan down || true

# Install dependensi PHP (jika ada perubahan di composer.json)
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

# Jalankan migrasi database
php artisan migrate --force

# Bersihkan dan buat cache baru
php artisan cache:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Keluar dari mode maintenance
php artisan up

echo "✅ Deployment finished successfully!"
