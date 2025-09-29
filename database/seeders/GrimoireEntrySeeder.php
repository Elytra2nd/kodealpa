<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GrimoireEntrySeeder extends Seeder
{
    public function run()
    {
        DB::table('grimoire_entries')->insert([
            [
                'category_id' => 1,
                'slug' => 'fireball',
                'title' => 'Fireball',
                'summary' => 'A powerful fire spell.',
                'content_html' => '<p>Fireball deals massive fire damage in an area.</p>',
                'tags' => json_encode(['fire', 'aoe', 'damage']),
                'role_access' => 'all',
                'level' => 'beginner',
                'is_published' => 1,
                'version' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'category_id' => 2,
                'slug' => 'teleport',
                'title' => 'Teleport',
                'summary' => 'Instantly move to another location.',
                'content_html' => '<p>Teleport allows the caster to move instantly across distances.</p>',
                'tags' => json_encode(['utility', 'movement']),
                'role_access' => 'expert',
                'level' => 'advanced',
                'is_published' => 1,
                'version' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
