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
     * Constructor - apply middleware
     */
    public function __construct()
    {
        // ✅ Rate limiting
        $this->middleware('throttle:60,1')->only(['store', 'update', 'destroy']);

        // ✅ Authentication - use web guard for same-site requests
        $this->middleware('auth')->except(['index', 'show', 'categories', 'search']);
    }

    /**
     * Get all grimoire categories
     */
    public function categories(): JsonResponse
    {
        $categories = GrimoireCategory::orderBy('sort_order')->get();

        return $this->successResponse(
            ['categories' => $categories],
            'Categories retrieved successfully'
        );
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
        $perPage = min((int) $request->input('per_page', 20), 100);
        $entries = $query->orderByDesc('updated_at')->paginate($perPage);

        return $this->successResponse(
            [
                'entries' => [
                    'data' => GrimoireEntryResource::collection($entries->items()),
                    'links' => [
                        'first' => $entries->url(1),
                        'last' => $entries->url($entries->lastPage()),
                        'prev' => $entries->previousPageUrl(),
                        'next' => $entries->nextPageUrl(),
                    ],
                    'meta' => [
                        'current_page' => $entries->currentPage(),
                        'from' => $entries->firstItem(),
                        'last_page' => $entries->lastPage(),
                        'per_page' => $entries->perPage(),
                        'to' => $entries->lastItem(),
                        'total' => $entries->total(),
                    ],
                ],
            ],
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
            ['entry' => new GrimoireEntryResource($entry)],
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
            'format' => 'nullable|string|in:pdf,html',
        ]);

        $term = $request->string('q')->value();
        $query = GrimoireEntry::published()
            ->with('category')
            ->searchTerm($term)
            ->orderByDesc('updated_at');

        $format = $request->string('format')->lower()->value();
        if ($format === 'pdf') {
            $query->pdfOnly();
        }

        $entries = $query->limit(20)->get();

        return $this->successResponse(
            ['entries' => GrimoireEntryResource::collection($entries)],
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

            // Handle PDF upload
            if ($request->hasFile('pdf_file')) {
                $path = $request->file('pdf_file')->store('pdfs', 'public');
                $data['pdf_path'] = $path;
            }

            $data['version'] = 1;

            $entry = GrimoireEntry::create($data);
            $entry->load('category');

            return $this->successResponse(
                ['entry' => new GrimoireEntryResource($entry)],
                'Grimoire entry created successfully',
                201
            );
        } catch (\Exception $e) {
            \Log::error('Failed to create grimoire entry', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

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

            // Handle PDF upload
            if ($request->hasFile('pdf_file')) {
                // Delete old PDF if exists
                if ($entry->pdf_path) {
                    \Storage::disk('public')->delete($entry->pdf_path);
                }

                $path = $request->file('pdf_file')->store('pdfs', 'public');
                $data['pdf_path'] = $path;
            }

            $data['version'] = (int) $entry->version + 1;

            $entry->update($data);
            $entry->load('category');

            return $this->successResponse(
                ['entry' => new GrimoireEntryResource($entry)],
                'Grimoire entry updated successfully'
            );
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->errorResponse('Grimoire entry not found', 404);
        } catch (\Exception $e) {
            \Log::error('Failed to update grimoire entry', [
                'id' => $id,
                'error' => $e->getMessage(),
            ]);

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

            // Delete PDF file if exists
            if ($entry->pdf_path) {
                \Storage::disk('public')->delete($entry->pdf_path);
            }

            $entry->delete();

            return $this->successResponse(
                null,
                'Grimoire entry deleted successfully'
            );
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->errorResponse('Grimoire entry not found', 404);
        } catch (\Exception $e) {
            \Log::error('Failed to delete grimoire entry', [
                'id' => $id,
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse(
                'Failed to delete grimoire entry: ' . $e->getMessage(),
                500
            );
        }
    }
}
