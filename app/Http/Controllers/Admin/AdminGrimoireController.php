<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GrimoireCategory;
use App\Models\GrimoireEntry;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminGrimoireController extends Controller
{
    public function index(): Response
    {
        $entries = GrimoireEntry::with('category')
            ->orderByDesc('created_at')
            ->paginate(20);

        return Inertia::render('Admin/Grimoire/Index', [
            'entries' => $entries,
        ]);
    }

    public function create(): Response
    {
        $categories = GrimoireCategory::orderBy('sort_order')->get();

        return Inertia::render('Admin/Grimoire/Create', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:grimoire_categories,id',
            'slug' => 'required|string|unique:grimoire_entries,slug|max:255',
            'title' => 'required|string|max:255',
            'summary' => 'nullable|string',
            'content_html' => 'nullable|string',
            'tags' => 'nullable|array',
            'pdf_file' => 'nullable|file|mimes:pdf|max:10240', // 10MB
            'role_access' => 'required|in:defuser,expert,all',
            'difficulty' => 'nullable|string|max:50',
            'is_published' => 'boolean',
        ]);

        if (empty($validated['content_html'])) {
            $validated['content_html'] = '';
        }

        if (empty($validated['difficulty'])) {
            $validated['difficulty'] = null;
        }

        // Handle PDF upload
        if ($request->hasFile('pdf_file')) {
            $path = $request->file('pdf_file')->store('pdfs', 'public');
            $validated['pdf_path'] = $path;
        }

        $validated['version'] = 1;

        GrimoireEntry::create($validated);

        return redirect()->route('admin.grimoire.index')
            ->with('success', 'Pedoman berhasil ditambahkan!');
    }

    public function edit(GrimoireEntry $grimoire): Response
    {
        $categories = GrimoireCategory::orderBy('sort_order')->get();

        return Inertia::render('Admin/Grimoire/Edit', [
            'entry' => $grimoire->load('category'),
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, GrimoireEntry $grimoire)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:grimoire_categories,id',
            'slug' => 'required|string|max:255|unique:grimoire_entries,slug,' . $grimoire->id,
            'title' => 'required|string|max:255',
            'summary' => 'nullable|string',
            'content_html' => 'nullable|string',
            'tags' => 'nullable|array',
            'pdf_file' => 'nullable|file|mimes:pdf|max:10240',
            'role_access' => 'required|in:defuser,expert,all',
            'difficulty' => 'nullable|string|max:50',
            'is_published' => 'boolean',
        ]);

        if (empty($validated['content_html'])) {
            $validated['content_html'] = '';
        }

        if (empty($validated['difficulty'])) {
            $validated['difficulty'] = null;
        }

        // Handle PDF upload
        if ($request->hasFile('pdf_file')) {
            // Delete old file if exists
            if ($grimoire->pdf_path) {
                \Storage::disk('public')->delete($grimoire->pdf_path);
            }

            $path = $request->file('pdf_file')->store('pdfs', 'public');
            $validated['pdf_path'] = $path;
        }

        $validated['version'] = $grimoire->version + 1;

        $grimoire->update($validated);

        return redirect()->route('admin.grimoire.index')
            ->with('success', 'Pedoman berhasil diperbarui!');
    }

    public function destroy(GrimoireEntry $grimoire)
    {
        // Delete PDF file if exists
        if ($grimoire->pdf_path) {
            \Storage::disk('public')->delete($grimoire->pdf_path);
        }

        $grimoire->delete();

        return redirect()->route('admin.grimoire.index')
            ->with('success', 'Pedoman berhasil dihapus!');
    }
}
