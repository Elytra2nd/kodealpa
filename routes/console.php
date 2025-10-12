<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;


Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('tournaments:cleanup')
    ->everySixHours()                    // Run every 6 hours
    ->withoutOverlapping()               // Prevent multiple instances
    ->runInBackground()                  // Async execution
    ->timezone('Asia/Jakarta')           // WIB timezone
    ->appendOutputTo(storage_path('logs/tournament-cleanup.log'))
    ->emailOutputOnFailure(env('ADMIN_EMAIL'))  // Optional: email on failure
    ->onSuccess(function () {
        \Illuminate\Support\Facades\Log::info('✅ Tournament auto-cleanup completed successfully', [
            'executed_at' => now()->toDateTimeString(),
            'next_run' => now()->addHours(6)->toDateTimeString(),
        ]);

        // Update cache for monitoring dashboard
        cache()->put('tournament_cleanup_last_success', now()->toDateTimeString(), now()->addDays(7));
    })
    ->onFailure(function () {
        \Illuminate\Support\Facades\Log::error('❌ Tournament auto-cleanup failed', [
            'failed_at' => now()->toDateTimeString(),
            'next_retry' => now()->addHours(6)->toDateTimeString(),
        ]);

        // Update cache for monitoring dashboard
        cache()->put('tournament_cleanup_last_failure', now()->toDateTimeString(), now()->addDays(7));
    });
