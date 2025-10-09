<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GrimoireCategory;
use App\Models\GrimoireEntry;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Storage;

class AdminGrimoireController extends Controller
{
    public function index(Request $request): Response
    {
        $query = GrimoireEntry::query()->with('category');

        // ✅ Search filter
        if ($request->filled('search')) {
            $search = $request->string('search')->value();
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('summary', 'like', "%{$search}%");
            });
        }

        // ✅ Category filter
        if ($request->filled('category')) {
            $query->whereHas('category', function ($q) use ($request) {
                $q->where('slug', $request->string('category')->value());
            });
        }

        // ✅ Status filter
        if ($request->filled('status')) {
            $isPublished = $request->string('status')->value() === 'published';
            $query->where('is_published', $isPublished);
        }

        // Pagination
        $entries = $query->orderByDesc('updated_at')->paginate(15)->withQueryString();
        $categories = GrimoireCategory::orderBy('sort_order')->get();

        return Inertia::render('Admin/Grimoire/Index', [
            'entries' => $entries,
            'categories' => $categories, // ✅ Added
            'filters' => [ // ✅ Added
                'search' => $request->string('search')->value() ?: null,
                'category' => $request->string('category')->value() ?: null,
                'status' => $request->string('status')->value() ?: null,
            ],
            'flash' => [ // ✅ Added flash messages
                'success' => session('success'),
                'error' => session('error'),
            ],
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
            'pdf_file' => 'nullable|file|mimes:pdf|max:51200', // ✅ 50MB
            'role_access' => 'required|in:defuser,expert,all',
            'difficulty' => 'nullable|in:beginner,intermediate,advanced', // ✅ Validate specific values
            'is_published' => 'boolean',
        ]);

        // Set defaults
        $validated['content_html'] = $validated['content_html'] ?? '';
        $validated['difficulty'] = $validated['difficulty'] ?? null;
        $validated['is_published'] = $validated['is_published'] ?? false;

        // Handle PDF upload
        if ($request->hasFile('pdf_file')) {
            $file = $request->file('pdf_file');

            if ($file->isValid()) {
                $path = $file->store('pdfs', 'public');
                $validated['pdf_path'] = $path;
            } else {
                return back()->withErrors(['pdf_file' => 'File upload gagal.']);
            }
        }

        $validated['version'] = 1;

        try {
            GrimoireEntry::create($validated);

            return redirect()->route('admin.grimoire.index')
                ->with('success', 'Pedoman berhasil ditambahkan!');
        } catch (\Exception $e) {
            \Log::error('Failed to create grimoire entry', [
                'error' => $e->getMessage(),
            ]);

            return back()
                ->withInput()
                ->with('error', 'Gagal menambahkan pedoman: ' . $e->getMessage());
        }
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
            'title' => 'required|string|max:255',
            'summary' => 'nullable|string',
            'content_html' => 'nullable|string',
            'tags' => 'nullable|array',
            'pdf_file' => 'nullable|file|mimes:pdf|max:51200', // ✅ 50MB
            'role_access' => 'required|in:defuser,expert,all',
            'difficulty' => 'nullable|in:beginner,intermediate,advanced',
            'is_published' => 'boolean',
        ]);

        // Set defaults
        $validated['content_html'] = $validated['content_html'] ?? '';
        $validated['difficulty'] = $validated['difficulty'] ?? null;
        $validated['is_published'] = $validated['is_published'] ?? false;

        // Handle PDF upload
        if ($request->hasFile('pdf_file')) {
            $file = $request->file('pdf_file');

            if ($file->isValid()) {
                // Delete old file if exists
                if ($grimoire->pdf_path && Storage::disk('public')->exists($grimoire->pdf_path)) {
                    Storage::disk('public')->delete($grimoire->pdf_path);
                }

                $path = $file->store('pdfs', 'public');
                $validated['pdf_path'] = $path;
            } else {
                return back()->withErrors(['pdf_file' => 'File upload gagal.']);
            }
        }

        $validated['version'] = $grimoire->version + 1;

        try {
            $grimoire->update($validated);

            return redirect()->route('admin.grimoire.index')
                ->with('success', 'Pedoman berhasil diperbarui!');
        } catch (\Exception $e) {
            \Log::error('Failed to update grimoire entry', [
                'id' => $grimoire->id,
                'error' => $e->getMessage(),
            ]);

            return back()
                ->withInput()
                ->with('error', 'Gagal memperbarui pedoman: ' . $e->getMessage());
        }
    }

    public function destroy(GrimoireEntry $grimoire)
    {
        try {
            // Delete PDF file if exists
            if ($grimoire->pdf_path && Storage::disk('public')->exists($grimoire->pdf_path)) {
                Storage::disk('public')->delete($grimoire->pdf_path);
            }

            $grimoire->delete();

            return redirect()->route('admin.grimoire.index')
                ->with('success', 'Pedoman berhasil dihapus!');
        } catch (\Exception $e) {
            \Log::error('Failed to delete grimoire entry', [
                'id' => $grimoire->id,
                'error' => $e->getMessage(),
            ]);

            return back()->with('error', 'Gagal menghapus pedoman: ' . $e->getMessage());
        }
    }
}
