<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use App\Services\Ai\{GeminiService, GrimoireRetrieval, AiToolExecutor};

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register AI services as singletons
        $this->app->singleton(GeminiService::class, function ($app) {
            return new GeminiService();
        });

        $this->app->singleton(GrimoireRetrieval::class, function ($app) {
            return new GrimoireRetrieval();
        });

        $this->app->singleton(AiToolExecutor::class, function ($app) {
            return new AiToolExecutor();
        });
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
