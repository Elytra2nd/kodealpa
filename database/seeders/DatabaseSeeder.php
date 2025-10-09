<?php

namespace Database\Seeders;

use App\Models\GrimoireCategory;
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
            AdminSeeder::class,
            GameSeeder::class,
            ExplorerJournalSeeder::class,
            AchievementsSeeder::class,
            GrimoireCategorySeeder::class,
            GrimoireEntrySeeder::class,
        ]);

    }
}
