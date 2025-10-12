<?php

namespace App\Console\Commands;

use App\Models\Tournament;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

use function Laravel\Prompts\info;
use function Laravel\Prompts\warning;

class CleanupInactiveTournaments extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'tournaments:cleanup {--dry-run : Preview cleanup without deleting}';

    /**
     * The console command description.
     */
    protected $description = 'Membersihkan turnamen yang tidak aktif atau sudah selesai';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $isDryRun = $this->option('dry-run');

        if ($isDryRun) {
            warning('Mode DRY RUN - Tidak ada data yang dihapus');
        }

        info('🔍 Memulai pembersihan turnamen...');

        // 1. Turnamen completed yang sudah lebih dari 7 hari
        $completedQuery = Tournament::where('status', 'completed')
            ->where('updated_at', '<', now()->subDays(7));

        $completedCount = $completedQuery->count();

        if (!$isDryRun && $completedCount > 0) {
            $completedQuery->delete();
            $this->info("✓ Turnamen selesai (>7 hari): {$completedCount}");
        } else {
            $this->line("📊 Turnamen selesai yang akan dihapus: {$completedCount}");
        }

        // 2. Turnamen waiting kosong yang sudah lebih dari 24 jam
        $waitingEmptyQuery = Tournament::where('status', 'waiting')
            ->whereDoesntHave('groups')
            ->where('created_at', '<', now()->subHours(24));

        $waitingEmptyCount = $waitingEmptyQuery->count();

        if (!$isDryRun && $waitingEmptyCount > 0) {
            $waitingEmptyQuery->delete();
            $this->info("✓ Turnamen kosong (>24 jam): {$waitingEmptyCount}");
        } else {
            $this->line("📊 Turnamen kosong yang akan dihapus: {$waitingEmptyCount}");
        }

        // 3. Turnamen waiting dengan < 2 grup yang sudah lebih dari 12 jam
        $waitingInactiveQuery = Tournament::where('status', 'waiting')
            ->where('created_at', '<', now()->subHours(12))
            ->whereHas('groups', function($query) {
                // No additional constraint needed here
            }, '<', 2);

        $waitingInactiveCount = $waitingInactiveQuery->count();

        if (!$isDryRun && $waitingInactiveCount > 0) {
            $waitingInactiveQuery->delete();
            $this->info("✓ Turnamen tidak aktif (>12 jam): {$waitingInactiveCount}");
        } else {
            $this->line("📊 Turnamen tidak aktif yang akan dihapus: {$waitingInactiveCount}");
        }

        // 4. Turnamen stuck yang tidak berubah > 48 jam
        $stuckQuery = Tournament::whereIn('status', ['qualification', 'semifinals', 'finals'])
            ->where('updated_at', '<', now()->subHours(48));

        $stuckCount = $stuckQuery->count();

        if (!$isDryRun && $stuckCount > 0) {
            $stuckQuery->delete();
            $this->info("✓ Turnamen stuck (>48 jam): {$stuckCount}");
        } else {
            $this->line("📊 Turnamen stuck yang akan dihapus: {$stuckCount}");
        }

        $totalCount = $completedCount + $waitingEmptyCount +
                     $waitingInactiveCount + $stuckCount;

        // Log activity
        Log::info('Tournament cleanup executed', [
            'dry_run' => $isDryRun,
            'completed' => $completedCount,
            'waiting_empty' => $waitingEmptyCount,
            'waiting_inactive' => $waitingInactiveCount,
            'stuck' => $stuckCount,
            'total' => $totalCount,
            'executed_at' => now()->toDateTimeString(),
        ]);

        $this->newLine();
        $this->line('─────────────────────────────');

        if ($isDryRun) {
            warning("Total yang AKAN dihapus: {$totalCount} arena");
            $this->info('💡 Jalankan tanpa --dry-run untuk menghapus');
        } else {
            $this->info("✅ Total dihapus: {$totalCount} arena");
        }

        return Command::SUCCESS;
    }
}
