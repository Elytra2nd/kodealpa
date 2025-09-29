<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class GrimoireSeeder extends Seeder
{
    /**
     * Jalankan seeder database.
     */
    public function run(): void
    {
        DB::table('grimoires')->insert([
            [
                'judul' => 'Panduan Pemula Dungeon',
                'kategori' => 'Dasar',
                'konten' => 'Pedoman dasar untuk memulai perjalanan di CodeAlpha Dungeon.',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'judul' => 'Strategi Leveling Cepat',
                'kategori' => 'Strategi',
                'konten' => 'Teknik untuk mempercepat leveling karakter dengan efisien.',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'judul' => 'Manajemen Tim Efektif',
                'kategori' => 'Tim',
                'konten' => 'Cara mengatur peran dan koordinasi antar pemain dalam dungeon.',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ]);
    }
}
