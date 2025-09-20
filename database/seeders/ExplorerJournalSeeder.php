<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ExplorerJournalSeeder extends Seeder
{
    public function run(): void
    {
        $userId = 1; // sesuaikan untuk env lokal
        for ($i = 1; $i <= 24; $i++) {
            DB::table('explorer_journal')->insert([
                'user_id'    => $userId,
                'kind'       => $i % 6 === 0 ? 'tournament' : ($i % 5 === 0 ? 'achievement' : 'session'),
                'ref_id'     => rand(100, 999),
                'title'      => 'Run #'.$i,
                'status'     => $i % 4 === 0 ? 'failed' : 'success',
                'score'      => rand(50, 500),
                'time_taken' => rand(60, 420),
                'accuracy'   => rand(800, 995) / 10,
                'hints_used' => rand(0, 3),
                'meta'       => json_encode(['note' => 'sample']),
                'created_at' => now()->subDays(30 - $i),
                'updated_at' => now()->subDays(30 - $i),
            ]);
        }
    }
}
