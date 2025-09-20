<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class JournalController extends Controller {
  public function index(Request $req) {
    $userId = Auth::id();
    $q = DB::table('explorer_journal')->where('user_id', $userId);

    if ($req->kind && in_array($req->kind, ['session','tournament','achievement'])) {
      $q->where('kind', $req->kind);
    }
    if ($req->status) {
      $q->where('status', $req->status);
    }
    if ($req->q) {
      $term = '%'.$req->q.'%';
      $q->where(fn($x)=>$x->where('title','like',$term));
    }
    if ($req->date_from) $q->whereDate('created_at','>=',$req->date_from);
    if ($req->date_to) $q->whereDate('created_at','<=',$req->date_to);

    $items = $q->orderByDesc('created_at')->paginate(10)->withQueryString();
    return response()->json(['journal' => $items]);
  }

  public function show($id) {
    $row = DB::table('explorer_journal')->where('id',$id)->where('user_id', auth()->id())->firstOrFail();
    return response()->json(['entry' => $row]);
  }

  public function stats() {
    $userId = auth()->id();
    $base = DB::table('explorer_journal')->where('user_id',$userId);
    $stats = [
      'total_runs' => (clone $base)->where('kind','session')->count(),
      'wins' => (clone $base)->where('kind','session')->where('status','success')->count(),
      'best_time' => (clone $base)->where('kind','session')->min('time_taken'),
      'avg_accuracy' => (clone $base)->where('kind','session')->avg('accuracy'),
      'tournaments_played' => (clone $base)->where('kind','tournament')->count(),
      'achievements' => (clone $base)->where('kind','achievement')->count(),
    ];
    return response()->json(['stats' => $stats]);
  }
}
