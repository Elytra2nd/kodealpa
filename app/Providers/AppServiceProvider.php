<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Log;
use App\Services\Ai\{GeminiService, GrimoireRetrieval, AiToolExecutor};

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // ============================================
        // REGISTER AI SERVICES AS SINGLETONS
        // ============================================

        $this->app->singleton(GeminiService::class, function ($app) {
            $service = new GeminiService();

            // Log initialization
            Log::info('GeminiService initialized', [
                'api_key_set' => !empty(config('services.gemini.api_key')),
                'model' => config('services.gemini.model', 'gemini-1.5-flash'),
            ]);

            return $service;
        });

        $this->app->singleton(GrimoireRetrieval::class, function ($app) {
            return new GrimoireRetrieval();
        });

        $this->app->singleton(AiToolExecutor::class, function ($app) {
            return new AiToolExecutor();
        });

        // ✅ NEW: Register hint system event listeners
        $this->registerHintSystemListeners();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ============================================
        // FORCE HTTPS FOR PRODUCTION
        // ============================================

        // Solusi untuk 'Mixed Content' error saat menggunakan ngrok
        // Memaksa semua URL yang dibuat menjadi HTTPS jika APP_URL menggunakan https.
        if (config('app.url') && str_starts_with(config('app.url'), 'https')) {
            URL::forceScheme('https');
        }

        // ✅ Force HTTPS in production
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        // ============================================
        // VITE CONFIGURATION
        // ============================================

        // Fungsionalitas prefetch Vite yang sudah ada sebelumnya
        Vite::prefetch(concurrency: 3);

        // ============================================
        // RATE LIMITING CONFIGURATION
        // ============================================

        $this->configureRateLimiting();

        // ============================================
        // ✅ NEW: MONITORING & LOGGING
        // ============================================

        $this->configureMonitoring();
    }

    /**
     * Configure rate limiting for AI DM and API endpoints
     */
    protected function configureRateLimiting(): void
    {
        // ============================================
        // AI DUNGEON MASTER RATE LIMITS
        // ============================================

        // Regular DM messages (non-streaming)
        RateLimiter::for('ai-dm', function (Request $request) {
            $userId = $request->user()?->id ?? 'guest';
            $sessionId = $request->input('session_id') ?? 'no-session';

            return Limit::perMinute(10)
                ->by("{$userId}:{$sessionId}")
                ->response(function (Request $request, array $headers) {
                    Log::warning('AI DM rate limit exceeded', [
                        'user_id' => $request->user()?->id,
                        'session_id' => $request->input('session_id'),
                        'ip' => $request->ip(),
                    ]);

                    return response()->json([
                        'message' => 'Terlalu banyak request. Tunggu sebentar.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                        'limit' => 10,
                        'window' => 'per minute',
                    ], 429);
                });
        });

        // DM streaming (SSE) - stricter limit
        RateLimiter::for('ai-dm-stream', function (Request $request) {
            $userId = $request->user()?->id ?? 'guest';
            $sessionId = $request->query('session_id') ?? 'no-session';

            return Limit::perMinute(5)
                ->by("{$userId}:{$sessionId}")
                ->response(function (Request $request, array $headers) {
                    Log::warning('AI DM stream rate limit exceeded', [
                        'user_id' => $request->user()?->id,
                        'session_id' => $request->query('session_id'),
                        'ip' => $request->ip(),
                    ]);

                    return response()->json([
                        'message' => 'Terlalu banyak streaming request. Tunggu sebentar.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                        'limit' => 5,
                        'window' => 'per minute',
                    ], 429);
                });
        });

        // AI Tools (function calling, RAG, etc.)
        RateLimiter::for('ai-tools', function (Request $request) {
            return Limit::perMinute(20)
                ->by($request->user()?->id ?? $request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'message' => 'Terlalu banyak tool requests.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 429);
                });
        });

        // ============================================
        // ✅ NEW: HINT SYSTEM RATE LIMITS
        // ============================================

        // Hint usage endpoint - prevent rapid hint consumption
        RateLimiter::for('hint-usage', function (Request $request) {
            $userId = $request->user()?->id ?? 'guest';

            return Limit::perMinute(20)
                ->by($userId)
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'message' => 'Terlalu banyak hint requests.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 429);
                });
        });

        // ============================================
        // ✅ NEW: GENERAL API RATE LIMITS
        // ============================================

        // Default API rate limit
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)
                ->by($request->user()?->id ?? $request->ip());
        });

        // Authenticated API - higher limit
        RateLimiter::for('api-auth', function (Request $request) {
            return Limit::perMinute(120)
                ->by($request->user()?->id);
        });

        // Public API - stricter limit
        RateLimiter::for('api-public', function (Request $request) {
            return Limit::perMinute(30)
                ->by($request->ip());
        });
    }

    /**
     * ✅ NEW: Register hint system event listeners
     */
    protected function registerHintSystemListeners(): void
    {
        // Listen for hint usage events (if you implement events)
        // Event::listen(HintUsedEvent::class, HintUsageLogger::class);

        // You can add event listeners here if needed
        // For now, logging is done directly in the controller
    }

    /**
     * ✅ NEW: Configure monitoring and logging
     */
    protected function configureMonitoring(): void
    {
        // Log application boot
        if ($this->app->environment('production')) {
            Log::channel('daily')->info('Application booted', [
                'environment' => $this->app->environment(),
                'url' => config('app.url'),
                'debug' => config('app.debug'),
            ]);
        }

        // Monitor AI service health
        if ($this->app->bound(GeminiService::class)) {
            $gemini = $this->app->make(GeminiService::class);

            // Check if API key is configured
            if (empty(config('services.gemini.api_key'))) {
                Log::error('Gemini API key not configured');
            }
        }
    }

    /**
     * ✅ NEW: Get rate limiter statistics
     */
    public static function getRateLimiterStats(Request $request): array
    {
        $userId = $request->user()?->id ?? 'guest';

        return [
            'ai_dm' => RateLimiter::remaining('ai-dm', 10),
            'ai_dm_stream' => RateLimiter::remaining('ai-dm-stream', 5),
            'ai_tools' => RateLimiter::remaining('ai-tools', 20),
            'hint_usage' => RateLimiter::remaining('hint-usage', 20),
            'user_id' => $userId,
        ];
    }
}
