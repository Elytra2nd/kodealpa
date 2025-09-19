<?php

namespace App\Http\Controllers;

use App\Models\GrimoireCategory;
use App\Models\GrimoireEntry;
use Illuminate\Http\Request;

class GrimoireController extends Controller {
  public function categories() {
    $data = GrimoireCategory::orderBy('sort_order')->get();
    return response()->json(['categories' => $data]);
  }
  public function index(Request $req) {
    $q = GrimoireEntry::query()->where('is_published', true);
    if ($req->category) {
      $q->whereHas('category', fn($x)=>$x->where('slug',$req->category));
    }
    if ($req->role && in_array($req->role, ['defuser','expert'])) {
      $q->whereIn('role_access', [$req->role, 'all']);
    }
    if ($req->q) {
      $term = '%'.$req->q.'%';
      $q->where(fn($x)=>$x->where('title','like',$term)->orWhere('summary','like',$term));
    }
    $entries = $q->orderByDesc('updated_at')->paginate(20);
    return response()->json(['entries' => $entries]);
  }
  public function show($slug) {
    $entry = GrimoireEntry::where('slug',$slug)->where('is_published',true)->firstOrFail();
    return response()->json(['entry' => $entry->load('category')]);
  }
  public function search(Request $req) {
    $term = '%'.trim($req->q ?? '').'%';
    $entries = GrimoireEntry::where('is_published',true)
      ->where(fn($x)=>$x->where('title','like',$term)->orWhere('summary','like',$term))
      ->limit(20)->get();
    return response()->json(['entries' => $entries]);
  }
  public function store(Request $req) {
    $data = $req->validate([
      'category_id'=>'required|exists:grimoire_categories,id',
      'slug'=>'required|unique:grimoire_entries,slug',
      'title'=>'required|string',
      'summary'=>'nullable|string',
      'content_html'=>'required|string',
      'tags'=>'array',
      'role_access'=>'required|in:defuser,expert,all',
      'difficulty'=>'required|in:beginner,intermediate,advanced',
      'is_published'=>'boolean',
    ]);
    $entry = GrimoireEntry::create($data);
    return response()->json(['entry'=>$entry], 201);
  }
  public function update($id, Request $req) {
    $entry = GrimoireEntry::findOrFail($id);
    $data = $req->validate([
      'category_id'=>'sometimes|exists:grimoire_categories,id',
      'slug'=>"sometimes|unique:grimoire_entries,slug,{$entry->id}",
      'title'=>'sometimes|string',
      'summary'=>'nullable|string',
      'content_html'=>'sometimes|string',
      'tags'=>'array',
      'role_access'=>'sometimes|in:defuser,expert,all',
      'difficulty'=>'sometimes|in:beginner,intermediate,advanced',
      'is_published'=>'boolean',
    ]);
    $entry->update($data + ['version' => $entry->version + 1]);
    return response()->json(['entry'=>$entry]);
  }
  public function destroy($id) {
    GrimoireEntry::findOrFail($id)->delete();
    return response()->json(['success'=>true]);
  }
}
