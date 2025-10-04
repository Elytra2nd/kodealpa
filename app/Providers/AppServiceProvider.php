<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
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

        // Configure AI DM rate limiters
        $this->configureRateLimiting();
    }

    /**
     * Configure rate limiting for AI DM
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('ai-dm', function (Request $request) {
            return Limit::perMinute(10)
                ->by($request->user()?->id . ':' . $request->input('session_id'))
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'message' => 'Terlalu banyak request. Tunggu sebentar.',
                        'retry_after' => $headers['Retry-After'] ?? 60
                    ], 429);
                });
        });

        RateLimiter::for('ai-dm-stream', function (Request $request) {
            return Limit::perMinute(5)
                ->by($request->user()?->id . ':' . $request->input('session_id'));
        });

        RateLimiter::for('ai-tools', function (Request $request) {
            return Limit::perMinute(20)
                ->by($request->user()?->id);
        });
    }
}
