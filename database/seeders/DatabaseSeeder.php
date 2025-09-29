<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Panggil seeder inti proyek
        $this->call([
            UserSeeder::class,
            GameSeeder::class,
            ExplorerJournalSeeder::class,
            AchievementsSeeder::class,
            GrimoireSeeder::class,
        ]);

    }
}
