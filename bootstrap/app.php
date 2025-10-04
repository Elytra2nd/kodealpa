<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Configure AI DM rate limiters
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
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
