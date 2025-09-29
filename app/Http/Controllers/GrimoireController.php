<?php

namespace App\Http\Controllers;

use App\Models\GrimoireCategory;
use App\Models\GrimoireEntry;
use Illuminate\Http\Request;

class GrimoireController extends Controller
{
    public function categories()
    {
        $data = GrimoireCategory::orderBy('sort_order')->get();
        return response()->json(['categories' => $data]);
    }

    public function index(Request $req)
    {
        $q = GrimoireEntry::query()->where('is_published', true);

        // Filter kategori
        if ($req->filled('category')) {
            $q->whereHas('category', fn($x) => $x->where('slug', $req->string('category')));
        }

        // Filter role (defuser/expert/all)
        if ($req->filled('role') && in_array($req->role, ['defuser', 'expert'], true)) {
            $q->whereIn('role_access', [$req->role, 'all']);
        }

        // Pencarian judul/ringkasan
        if ($req->filled('q')) {
            $term = '%'.$req->q.'%';
            $q->where(fn($x) => $x->where('title','like',$term)->orWhere('summary','like',$term));
        }

        // Filter khusus PDF sesuai panel frontend: ?format=pdf
        // Kriteria: content_type = application/pdf ATAU file_url berakhiran .pdf
        if ($req->string('format')->lower() === 'pdf') {
            $q->where(function ($x) {
                $x->where('content_type', 'application/pdf')
                  ->orWhereNotNull('file_url')
                  ->orWhere('file_url', 'like', '%.pdf%');
            });
        }

        $perPage = (int)($req->input('per_page', 20));
        $entries = $q->orderByDesc('updated_at')->paginate($perPage);

        return response()->json(['entries' => $entries]);
    }

    public function show($slug)
    {
        $entry = GrimoireEntry::where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        // Mengembalikan seluruh field, termasuk file_url & content_type bila ada
        return response()->json(['entry' => $entry->load('category')]);
    }

    public function search(Request $req)
    {
        $term = '%'.trim($req->q ?? '').'%';

        $q = GrimoireEntry::where('is_published', true)
            ->where(fn($x) => $x->where('title','like',$term)->orWhere('summary','like',$term))
            ->orderByDesc('updated_at');

        // Opsional: dukungan format=pdf juga di endpoint search
        if ($req->string('format')->lower() === 'pdf') {
            $q->where(function ($x) {
                $x->where('content_type', 'application/pdf')
                  ->orWhereNotNull('file_url')
                  ->orWhere('file_url', 'like', '%.pdf%');
            });
        }

        $entries = $q->limit(20)->get();
        return response()->json(['entries' => $entries]);
    }

    public function store(Request $req)
    {
        // Longgarkan validasi: entri boleh berbasis HTML ATAU PDF (file_url)
        $data = $req->validate([
            'category_id'  => 'required|exists:grimoire_categories,id',
            'slug'         => 'required|unique:grimoire_entries,slug',
            'title'        => 'required|string',
            'summary'      => 'nullable|string',

            // Salah satu wajib: content_html atau file_url
            'content_html' => 'required_without:file_url|string',
            'file_url'     => 'required_without:content_html|url',

            // Content-Type untuk file (disarankan application/pdf untuk PDF)
            'content_type' => 'nullable|string',

            'tags'         => 'array',
            'role_access'  => 'required|in:defuser,expert,all',
            'difficulty'   => 'required|in:beginner,intermediate,advanced',
            'is_published' => 'boolean',
        ]);

        $entry = GrimoireEntry::create($data + [
            'version' => 1,
        ]);

        return response()->json(['entry' => $entry], 201);
    }

    public function update($id, Request $req)
    {
        $entry = GrimoireEntry::findOrFail($id);

        $data = $req->validate([
            'category_id'  => 'sometimes|exists:grimoire_categories,id',
            'slug'         => "sometimes|unique:grimoire_entries,slug,{$entry->id}",
            'title'        => 'sometimes|string',
            'summary'      => 'nullable|string',

            // Tetap konsisten: boleh HTML atau PDF
            'content_html' => 'sometimes|required_without:file_url|string',
            'file_url'     => 'sometimes|required_without:content_html|url',

            // Content-Type opsional (application/pdf untuk PDF)
            'content_type' => 'sometimes|nullable|string',

            'tags'         => 'array',
            'role_access'  => 'sometimes|in:defuser,expert,all',
            'difficulty'   => 'sometimes|in:beginner,intermediate,advanced',
            'is_published' => 'boolean',
        ]);

        $entry->update($data + ['version' => (int)$entry->version + 1]);

        return response()->json(['entry' => $entry]);
    }

    public function destroy($id)
    {
        GrimoireEntry::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }
}
