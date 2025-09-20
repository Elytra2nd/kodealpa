<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Solusi untuk 'Mixed Content' error saat menggunakan ngrok
        // Memaksa semua URL yang dibuat menjadi HTTPS jika APP_URL menggunakan https.
        if (config('app.url') && str_starts_with(config('app.url'), 'https')) {
            URL::forceScheme('https');
        }

        // Fungsionalitas prefetch Vite yang sudah ada sebelumnya
        Vite::prefetch(concurrency: 3);
    }
}

