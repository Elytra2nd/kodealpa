<?php

namespace App\Http\Controllers;

use App\Models\Tournament;
use Illuminate\Http\JsonResponse;

class TournamentStatsController extends Controller
{
    public function cleanupStats(): JsonResponse
    {
        $config = config('tournament.cleanup');

        return response()->json([
            'enabled' => $config['auto_cleanup_enabled'],
            'last_cleanup' => cache()->get('last_tournament_cleanup'),
            'next_cleanup' => 'Every 6 hours',
            'stats' => [
                'total_tournaments' => Tournament::count(),
                'active' => Tournament::active()->count(),
                'completed' => Tournament::completed()->count(),
                'stale_tournaments' => [
                    'completed_old' => Tournament::where('status', 'completed')
                        ->where('updated_at', '<', now()->subDays($config['completed_after_days']))
                        ->count(),
                    'empty_waiting' => Tournament::where('status', 'waiting')
                        ->whereDoesntHave('groups')
                        ->where('created_at', '<', now()->subHours($config['waiting_empty_after_hours']))
                        ->count(),
                    'stuck' => Tournament::whereIn('status', ['qualification', 'semifinals', 'finals'])
                        ->where('updated_at', '<', now()->subHours($config['stuck_after_hours']))
                        ->count(),
                ],
            ],
            'config' => $config,
        ]);
    }
}
