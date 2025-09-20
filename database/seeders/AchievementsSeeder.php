<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AchievementsSeeder extends Seeder {
  public function run(): void {
    $rows = [
      ['key'=>'no_hints','title'=>'No Hints Run','description'=>'Menuntaskan sesi tanpa hint','icon'=>'🧠','rarity'=>'legendary','criteria'=>json_encode(['type'=>'no_hints']) ,'sort_order'=>10],
      ['key'=>'sub_120','title'=>'Sub-120s','description'=>'Selesaikan sesi < 120 detik','icon'=>'⏱️','rarity'=>'epic','criteria'=>json_encode(['type'=>'time_lt','seconds'=>120]),'sort_order'=>20],
      ['key'=>'accuracy_95','title'=>'Sharp Mind','description'=>'Akurasi ≥ 95%','icon'=>'🎯','rarity'=>'rare','criteria'=>json_encode(['type'=>'accuracy_gte','value'=>95]),'sort_order'=>30],
      ['key'=>'streak_3','title'=>'Hot Streak','description'=>'Menang 3 kali beruntun','icon'=>'🔥','rarity'=>'epic','criteria'=>json_encode(['type'=>'win_streak','count'=>3]),'sort_order'=>40],
      ['key'=>'tour_first','title'=>'First Tournament','description'=>'Ikut turnamen pertama','icon'=>'🏆','rarity'=>'uncommon','criteria'=>json_encode(['type'=>'tournament_first']),'sort_order'=>50],
    ];
    foreach ($rows as $r) {
      DB::table('achievements')->updateOrInsert(['key'=>$r['key']], $r + ['created_at'=>now(),'updated_at'=>now()]);
    }
  }
}
