<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGrimoireRequest;
use App\Http\Requests\UpdateGrimoireRequest;
use App\Http\Resources\GrimoireEntryResource;
use App\Models\GrimoireCategory;
use App\Models\GrimoireEntry;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class GrimoireController extends Controller
{
    use ApiResponse;

    /**
     * Constructor - apply middleware if needed
     */
    public function __construct()
    {
        // Rate limiting untuk proteksi API
        $this->middleware('throttle:60,1')->only(['store', 'update', 'destroy']);

        // Uncomment jika perlu authentication
        // $this->middleware('auth:sanctum')->except(['index', 'show', 'categories', 'search']);
    }

    /**
     * Get all grimoire categories
     */
    public function categories(): JsonResponse
    {
        $categories = GrimoireCategory::orderBy('sort_order')->get();

        return $this->successResponse($categories, 'Categories retrieved successfully');
    }

    /**
     * Get paginated grimoire entries with filters
     */
    public function index(Request $request): JsonResponse
    {
        $query = GrimoireEntry::query()
            ->published()
            ->with('category');

        // Filter by category
        if ($request->filled('category')) {
            $query->forCategorySlug($request->string('category')->value());
        }

        // Filter by role (defuser/expert/all)
        if ($request->filled('role') && in_array($request->role, ['defuser', 'expert'], true)) {
            $query->forRole($request->role);
        }

        // Search by title/summary
        if ($request->filled('q')) {
            $query->searchTerm($request->string('q')->value());
        }

        // Filter PDF only
        $format = $request->string('format')->lower()->value();
        if ($format === 'pdf') {
            $query->pdfOnly();
        }

        // Pagination
        $perPage = min((int) $request->input('per_page', 20), 100); // Max 100 items
        $entries = $query->orderByDesc('updated_at')->paginate($perPage);

        \Log::info('Grimoire entries fetched', [
            'count' => $entries->total(),
            'entries' => $entries->items()
        ]);

        return $this->successResponse(
            GrimoireEntryResource::collection($entries)->response()->getData(true),
            'Entries retrieved successfully'
        );
    }

    /**
     * Get single grimoire entry by slug
     */
    public function show(string $slug): JsonResponse
    {
        $entry = GrimoireEntry::where('slug', $slug)
            ->published()
            ->with('category')
            ->firstOrFail();

        return $this->successResponse(
            new GrimoireEntryResource($entry),
            'Entry retrieved successfully'
        );
    }

    /**
     * Search grimoire entries
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:2|max:255',
            'format' => 'nullable|string|in:pdf,html'
        ]);

        $term = $request->string('q')->value();
        $query = GrimoireEntry::published()
            ->with('category')
            ->searchTerm($term)
            ->orderByDesc('updated_at');

        // Optional: support format=pdf in search endpoint
        $format = $request->string('format')->lower()->value();
        if ($format === 'pdf') {
            $query->pdfOnly();
        }

        $entries = $query->limit(20)->get();

        return $this->successResponse(
            GrimoireEntryResource::collection($entries),
            'Search completed successfully'
        );
    }

    /**
     * Create new grimoire entry
     */
    public function store(StoreGrimoireRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();

            // --- TAMBAHKAN LOGIKA UPLOAD DI SINI ---
            if ($request->hasFile('pdf_file')) {
                // 1. Validasi sudah dilakukan oleh StoreGrimoireRequest, pastikan ada rule untuk file.
                // 2. Simpan file di dalam folder 'storage/app/public/pdfs'.
                //    'public' adalah disk yang merujuk ke filesystem di config/filesystems.php
                $path = $request->file('pdf_file')->store('pdfs', 'public');

                // 3. Simpan path relatif yang dikembalikan oleh store() ke dalam database.
                //    Pastikan Anda punya kolom di tabel, misalnya 'pdf_path'.
                $data['pdf_path'] = $path;
            }
            // --- AKHIR DARI LOGIKA UPLOAD ---

            $data['version'] = 1;

            $entry = GrimoireEntry::create($data);
            $entry->load('category');

            return $this->successResponse(
                new GrimoireEntryResource($entry),
                'Grimoire entry created successfully',
                201
            );
        } catch (\Exception $e) {
            return $this->errorResponse(
                'Failed to create grimoire entry: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * Update existing grimoire entry
     */
    public function update(UpdateGrimoireRequest $request, int $id): JsonResponse
    {
        try {
            $entry = GrimoireEntry::findOrFail($id);

            $data = $request->validated();
            $data['version'] = (int) $entry->version + 1;

            $entry->update($data);
            $entry->load('category');

            return $this->successResponse(
                new GrimoireEntryResource($entry),
                'Grimoire entry updated successfully'
            );
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->errorResponse('Grimoire entry not found', 404);
        } catch (\Exception $e) {
            return $this->errorResponse(
                'Failed to update grimoire entry: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * Delete grimoire entry
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $entry = GrimoireEntry::findOrFail($id);
            $entry->delete();

            return $this->successResponse(
                null,
                'Grimoire entry deleted successfully'
            );
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->errorResponse('Grimoire entry not found', 404);
        } catch (\Exception $e) {
            return $this->errorResponse(
                'Failed to delete grimoire entry: ' . $e->getMessage(),
                500
            );
        }
    }
}
