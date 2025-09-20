<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AchievementsController extends Controller {
  public function index(Request $req) {
    $userId = $req->user()->id;
    $master = DB::table('achievements')->where('is_active',true)->orderBy('sort_order')->get();
    $user = DB::table('user_achievements')->where('user_id',$userId)->get()->keyBy('achievement_id');

    $items = $master->map(function ($m) use ($user) {
      $ua = $user->get($m->id);
      return [
        'id' => $m->id,
        'key' => $m->key,
        'title' => $m->title,
        'description' => $m->description,
        'icon' => $m->icon,
        'rarity' => $m->rarity,
        'criteria' => json_decode($m->criteria, true),
        'unlocked' => (bool) $ua,
        'unlocked_at' => $ua->unlocked_at ?? null,
        'progress' => isset($ua->progress) ? json_decode($ua->progress, true) : null,
      ];
    });

    return response()->json(['achievements' => $items]);
  }
}
