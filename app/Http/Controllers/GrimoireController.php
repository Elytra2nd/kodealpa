<?php

namespace App\Http\Controllers;

use App\Models\GrimoireCategory;
use App\Models\GrimoireEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GrimoireController extends Controller
{
    public function categories()
    {
        $data = GrimoireCategory::orderBy('sort_order')->get();
        // tidak perlu transform khusus
        return response()->json(['categories' => $data]);
    }

    public function index(Request $req)
    {
        $q = GrimoireEntry::query()->published();

        // Filter kategori
        if ($req->filled('category')) {
            $q->forCategorySlug($req->string('category')->value());
        }

        // Filter role (defuser/expert/all)
        if ($req->filled('role') && in_array($req->role, ['defuser', 'expert'], true)) {
            $q->forRole($req->role);
        }

        // Pencarian judul/ringkasan
        if ($req->filled('q')) {
            $q->searchTerm($req->string('q')->value());
        }

        // Filter khusus PDF sesuai panel frontend: ?format=pdf
        // Perbaikan: ambil nilai string lower-case lalu bandingkan
        $format = $req->string('format')->lower()->value();
        if ($format === 'pdf') {
            $q->pdfOnly();
        }

        $perPage = (int) $req->input('per_page', 20);
        $entries = $q->orderByDesc('updated_at')->paginate($perPage);

        // Sertakan atribut terhitung (file_url_web, is_pdf) ke dalam item data
        // Pakai through() agar metadata pagination tetap utuh
        $entries = $entries->through(function (GrimoireEntry $e) {
            return $e->append(['file_url_web', 'is_pdf'])->load('category');
        });

        return response()->json(['entries' => $entries]);
    }

    public function show($slug)
    {
        $entry = GrimoireEntry::where('slug', $slug)
            ->published()
            ->firstOrFail()
            ->append(['file_url_web', 'is_pdf'])
            ->load('category');

        // Mengembalikan seluruh field, termasuk file_url_web & content_type bila ada
        return response()->json(['entry' => $entry]);
    }

    public function search(Request $req)
    {
        $term = $req->string('q')->value();
        $q = GrimoireEntry::published()
            ->searchTerm($term)
            ->orderByDesc('updated_at');

        // Opsional: dukungan format=pdf juga di endpoint search
        $format = $req->string('format')->lower()->value();
        if ($format === 'pdf') {
            $q->pdfOnly();
        }

        $entries = $q->limit(20)->get()
            ->each(fn (GrimoireEntry $e) => $e->append(['file_url_web', 'is_pdf'])->load('category'));

        return response()->json(['entries' => $entries]);
    }

    public function store(Request $req)
    {
        // Validasi: izinkan URL absolut atau root-relative PDF; atau konten HTML
        $data = $req->validate([
            'category_id'  => 'required|exists:grimoire_categories,id',
            'slug'         => 'required|unique:grimoire_entries,slug',
            'title'        => 'required|string',
            'summary'      => 'nullable|string',

            // Salah satu wajib: content_html atau file_url
            'content_html' => 'required_without:file_url|string',
            'file_url'     => [
                'required_without:content_html',
                'string',
                // http(s)://...pdf atau /...pdf atau nama file .pdf (ditormalkan di mutator)
                'regex:/^(https?:\/\/|\/)?[^\s]+\.pdf(\?.*)?$/i'
            ],

            'content_type' => 'nullable|string',
            'tags'         => 'array',
            'role_access'  => 'required|in:defuser,expert,all',
            'difficulty'   => 'required|in:beginner,intermediate,advanced',
            'is_published' => 'boolean',
        ]);

        // Normalisasi otomatis terjadi di mutator model (fileUrl, contentType)
        $entry = GrimoireEntry::create($data + ['version' => 1]);

        return response()->json([
            'entry' => $entry->append(['file_url_web', 'is_pdf'])->load('category')
        ], 201);
    }

    public function update($id, Request $req)
    {
        $entry = GrimoireEntry::findOrFail($id);

        $data = $req->validate([
            'category_id'  => 'sometimes|exists:grimoire_categories,id',
            'slug'         => "sometimes|unique:grimoire_entries,slug,{$entry->id}",
            'title'        => 'sometimes|string',
            'summary'      => 'nullable|string',

            'content_html' => 'sometimes|required_without:file_url|string',
            'file_url'     => [
                'sometimes',
                'required_without:content_html',
                'string',
                'regex:/^(https?:\/\/|\/)?[^\s]+\.pdf(\?.*)?$/i'
            ],

            'content_type' => 'sometimes|nullable|string',
            'tags'         => 'array',
            'role_access'  => 'sometimes|in:defuser,expert,all',
            'difficulty'   => 'sometimes|in:beginner,intermediate,advanced',
            'is_published' => 'boolean',
        ]);

        $entry->update($data + ['version' => (int) $entry->version + 1]);

        return response()->json([
            'entry' => $entry->append(['file_url_web', 'is_pdf'])->load('category')
        ]);
    }

    public function destroy($id)
    {
        GrimoireEntry::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }
}
