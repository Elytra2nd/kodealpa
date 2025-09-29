<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GrimoireCategorySeeder extends Seeder
{
    public function run()
    {
        DB::table('grimoire_categories')->insert([
            [
                'slug' => 'magic-basics',
                'title' => 'Magic Basics',
                'icon' => 'fa-magic',
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'advanced-spells',
                'title' => 'Advanced Spells',
                'icon' => 'fa-book-spells',
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}

