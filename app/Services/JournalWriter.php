<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;

class JournalWriter
{
    public static function logSessionComplete(array $data): void
    {
        $userId = $data['user_id'] ?? Auth::id();
        DB::table('explorer_journal')->insert([
            'user_id'    => $userId,
            'kind'       => 'session',
            'ref_id'     => $data['session_id'] ?? null,
            'title'      => $data['title'] ?? 'Sesi Dungeon',
            'status'     => $data['status'] ?? null, // success/failed/completed
            'score'      => $data['score'] ?? null,
            'time_taken' => $data['time_taken'] ?? null, // in seconds
            'accuracy'   => $data['accuracy'] ?? null,
            'hints_used' => $data['hints_used'] ?? null,
            'meta'       => json_encode($data['meta'] ?? []),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        activity()
            ->causedBy($userId)
            ->withProperties([
                'scope' => 'session_complete',
                'session_id' => $data['session_id'] ?? null,
                'score' => $data['score'] ?? null,
                'time_taken' => $data['time_taken'] ?? null,
                'accuracy' => $data['accuracy'] ?? null,
                'hints_used' => $data['hints_used'] ?? null,
                'status' => $data['status'] ?? null,
            ])
            ->log('session_completed'); // Spatie Activitylog [web:914][web:909]
    }

    public static function logTournamentComplete(array $data): void
    {
        $userId = $data['user_id'] ?? Auth::id();
        DB::table('explorer_journal')->insert([
            'user_id'    => $userId,
            'kind'       => 'tournament',
            'ref_id'     => $data['tournament_id'] ?? null,
            'title'      => $data['title'] ?? 'Turnamen',
            'status'     => $data['status'] ?? null, // completed/champion/eliminated
            'score'      => $data['score'] ?? null,
            'time_taken' => $data['time_taken'] ?? null,
            'accuracy'   => $data['accuracy'] ?? null,
            'hints_used' => $data['hints_used'] ?? null,
            'meta'       => json_encode($data['meta'] ?? []),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        activity()
            ->causedBy($userId)
            ->withProperties([
                'scope' => 'tournament_result',
                'tournament_id' => $data['tournament_id'] ?? null,
                'score' => $data['score'] ?? null,
                'result' => $data['status'] ?? null,
            ])
            ->log('tournament_result'); // Spatie Activitylog [web:914][web:909]
    }

    public static function logAchievement(array $data): void
    {
        $userId = $data['user_id'] ?? Auth::id();
        DB::table('explorer_journal')->insert([
            'user_id'    => $userId,
            'kind'       => 'achievement',
            'ref_id'     => $data['achievement_id'] ?? null,
            'title'      => $data['title'] ?? 'Pencapaian',
            'status'     => 'earned',
            'score'      => $data['score'] ?? null,
            'time_taken' => $data['time_taken'] ?? null,
            'accuracy'   => $data['accuracy'] ?? null,
            'hints_used' => $data['hints_used'] ?? null,
            'meta'       => json_encode($data['meta'] ?? []),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        activity()
            ->causedBy($userId)
            ->withProperties([
                'scope' => 'achievement',
                'key' => $data['key'] ?? null,
                'title' => $data['title'] ?? null,
            ])
            ->log('achievement_unlocked'); // Spatie Activitylog [web:914][web:909]
    }
}
