<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

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
            'time_taken' => $data['time_taken'] ?? null, // seconds
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

        // Evaluasi dan unlock achievements berbasis ringkasan sesi
        self::evaluateAndUnlock($userId, [
            'scope'      => 'session',
            'status'     => $data['status'] ?? null,
            'time_taken' => $data['time_taken'] ?? null,
            'accuracy'   => $data['accuracy'] ?? null,
            'hints_used' => $data['hints_used'] ?? null,
        ]);
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

        // Evaluasi dan unlock achievements berbasis aktivitas turnamen
        self::evaluateAndUnlock($userId, [
            'scope'      => 'tournament',
            'status'     => $data['status'] ?? null,
            'time_taken' => $data['time_taken'] ?? null,
            'accuracy'   => $data['accuracy'] ?? null,
            'hints_used' => $data['hints_used'] ?? null,
        ]);
    }

    public static function logAchievement(array $data): void
    {
        $userId = $data['user_id'] ?? Auth::id();

        // Catat ke jurnal untuk feed aktivitas
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

        // Tandai unlock di user_achievements jika ada key yang valid
        if (!empty($data['key'])) {
            self::unlockByKey($userId, (string)$data['key']);
        }

        activity()
            ->causedBy($userId)
            ->withProperties([
                'scope' => 'achievement',
                'key' => $data['key'] ?? null,
                'title' => $data['title'] ?? null,
            ])
            ->log('achievement_unlocked'); // Spatie Activitylog [web:914][web:909]
    }

    /**
     * Evaluasi kriteria achievement dan tandai unlock.
     * Kriteria dasar:
     * - no_hints: hints_used === 0 dan status success
     * - sub_120: time_taken < 120 detik
     * - accuracy_95: accuracy ≥ 95
     * - tournament_first: entri turnamen pertama user
     * - streak_3: 3 kemenangan berturut-turut (hitung dari explorer_journal)
     */
    private static function evaluateAndUnlock(int $userId, array $summary): void
    {
        // No hints run
        if (($summary['hints_used'] ?? 0) === 0 && ($summary['status'] ?? '') === 'success') {
            self::unlockByKey($userId, 'no_hints');
        }

        // Sub-120 seconds
        if (!is_null($summary['time_taken']) && (int)$summary['time_taken'] < 120) {
            self::unlockByKey($userId, 'sub_120');
        }

        // Accuracy >= 95
        if (!is_null($summary['accuracy']) && (float)$summary['accuracy'] >= 95) {
            self::unlockByKey($userId, 'accuracy_95');
        }

        // First tournament participation
        if (($summary['scope'] ?? null) === 'tournament') {
            $count = DB::table('explorer_journal')
                ->where('user_id', $userId)
                ->where('kind', 'tournament')
                ->count();
            if ($count === 1) {
                self::unlockByKey($userId, 'tour_first');
            }
        }

        // 3-win streak (berdasarkan jurnal sesi terbaru)
        self::checkAndUnlockStreak($userId, 3);
    }

    private static function checkAndUnlockStreak(int $userId, int $target): void
    {
        // Ambil 10 sesi terakhir dan hitung streak success dari belakang
        $recent = DB::table('explorer_journal')
            ->where('user_id', $userId)
            ->where('kind', 'session')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get(['status']);

        $streak = 0;
        foreach ($recent as $row) {
            if (($row->status ?? '') === 'success') {
                $streak++;
                if ($streak >= $target) break;
            } else {
                break;
            }
        }

        if ($streak >= $target) {
            self::unlockByKey($userId, 'streak_3');
        }
    }

    /**
     * Tandai achievement sebagai unlocked untuk user berdasarkan key master.
     * Menggunakan updateOrInsert agar idempoten dan efisien.
     */
    private static function unlockByKey(int $userId, string $key): void
    {
        $ach = DB::table('achievements')->where('key', $key)->first();
        if (!$ach) return;

        DB::table('user_achievements')->updateOrInsert(
            ['user_id' => $userId, 'achievement_id' => $ach->id],
            ['unlocked_at' => now(), 'updated_at' => now(), 'created_at' => now()]
        ); // Upsert gaya Query Builder [web:980][web:982]

        activity()
            ->causedBy($userId)
            ->withProperties(['achievement' => $key])
            ->log('achievement_unlocked'); // Spatie Activitylog [web:914][web:909]
    }
}
