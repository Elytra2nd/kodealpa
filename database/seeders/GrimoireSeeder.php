<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GrimoireSeeder extends Seeder
{
    public function run()
    {
        // Seed kategori dulu
        $categories = [
            ['name' => 'Dasar', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Strategi', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Tim', 'created_at' => now(), 'updated_at' => now()],
        ];

        DB::table('grimoire_categories')->insert($categories);

        // Ambil ID kategori berdasarkan nama
        $dasarId = DB::table('grimoire_categories')->where('name', 'Dasar')->value('id');
        $strategiId = DB::table('grimoire_categories')->where('name', 'Strategi')->value('id');
        $timId = DB::table('grimoire_categories')->where('name', 'Tim')->value('id');

        // Seed entries
        $entries = [
            [
                'title' => 'Panduan Pemula Dungeon',
                'category_id' => $dasarId,
                'content' => 'Pedoman dasar untuk memulai perjalanan di CodeAlpha Dungeon.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Strategi Leveling Cepat',
                'category_id' => $strategiId,
                'content' => 'Teknik untuk mempercepat leveling karakter dengan efisien.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Manajemen Tim Efektif',
                'category_id' => $timId,
                'content' => 'Cara mengatur peran dan koordinasi antar pemain dalam dungeon.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('grimoire_entries')->insert($entries);
    }
}
