<?php

namespace App\Http\Controllers;

use App\Models\Stage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StageController extends Controller
{
    /**
     * Get list of active stages with related mission
     */
    public function index()
    {
        try {
            $stages = Stage::with('mission')
                ->where('is_active', true)
                ->orderBy('order', 'asc')
                ->get();

            Log::info('Stages retrieved', [
                'count' => $stages->count(),
                'stages' => $stages->toArray()
            ]);

            return response()->json($stages);

        } catch (\Exception $e) {
            Log::error('Failed to retrieve stages: ' . $e->getMessage());

            return response()->json([
                'error' => 'Failed to retrieve stages',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show specific stage details
     */
    public function show($id)
    {
        try {
            $stage = Stage::with('mission')->findOrFail($id);
            return response()->json($stage);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Stage not found'
            ], 404);
        }
    }

    /**
     * Create sample stages when none exist
     * Only accessible to authenticated users
     */
    public function createSample(Request $request)
    {
        try {
            // Check if active stages already exist
            $existingStagesCount = Stage::where('is_active', true)->count();

            if ($existingStagesCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Active stages already exist',
                    'existing_count' => $existingStagesCount
                ], 400);
            }

            // Sample stage configurations
            $sampleStages = [
                [
                    'name' => 'Stage 1: Pattern Analysis',
                    'is_active' => true,
                    'order' => 1,
                    'config' => [
                        'title' => 'Pattern Analysis Challenge',
                        'timeLimit' => 300, // 5 minutes
                        'maxAttempts' => 3,
                        'difficulty' => 'beginner',
                        'learningObjectives' => [
                            'Identify mathematical patterns',
                            'Communicate findings clearly',
                            'Work under time pressure'
                        ]
                    ]
                ],
                [
                    'name' => 'Stage 2: Code Analysis',
                    'is_active' => true,
                    'order' => 2,
                    'config' => [
                        'title' => 'Code Debugging Challenge',
                        'timeLimit' => 420, // 7 minutes
                        'maxAttempts' => 3,
                        'difficulty' => 'intermediate',
                        'learningObjectives' => [
                            'Analyze code structure',
                            'Identify logical errors',
                            'Collaborative debugging'
                        ]
                    ]
                ],
                [
                    'name' => 'Stage 3: Navigation Challenge',
                    'is_active' => true,
                    'order' => 3,
                    'config' => [
                        'title' => 'Pathfinding Challenge',
                        'timeLimit' => 480, // 8 minutes
                        'maxAttempts' => 3,
                        'difficulty' => 'advanced',
                        'learningObjectives' => [
                            'Spatial reasoning',
                            'Strategic planning',
                            'Complex problem solving'
                        ]
                    ]
                ]
            ];

            $createdStages = [];

            foreach ($sampleStages as $stageData) {
                $stage = Stage::create([
                    'name' => $stageData['name'],
                    'is_active' => $stageData['is_active'],
                    'order' => $stageData['order'],
                    'config' => $stageData['config'],
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                $createdStages[] = $stage;
            }

            Log::info('Sample stages created successfully', [
                'user_id' => auth()->id(),
                'stages_count' => count($createdStages),
                'stage_names' => collect($createdStages)->pluck('name')->toArray()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sample stages created successfully',
                'stages' => $createdStages,
                'count' => count($createdStages)
            ], 201);

        } catch (\Exception $e) {
            Log::error('Failed to create sample stages: ' . $e->getMessage(), [
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create sample stages',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle stage active status (optional admin feature)
     */
    public function toggleActive($id)
    {
        try {
            $stage = Stage::findOrFail($id);
            $stage->is_active = !$stage->is_active;
            $stage->save();

            return response()->json([
                'success' => true,
                'message' => 'Stage status updated',
                'stage' => $stage
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update stage status'
            ], 500);
        }
    }

    /**
     * Admin methods for managing stages
     */
    public function adminIndex()
    {
        $stages = Stage::with('mission')->orderBy('order', 'asc')->get();
        return response()->json($stages);
    }

    public function adminShow($id)
    {
        $stage = Stage::with('mission')->findOrFail($id);
        return response()->json($stage);
    }

    public function adminDestroy($id)
    {
        try {
            $stage = Stage::findOrFail($id);
            $stage->delete();

            return response()->json([
                'success' => true,
                'message' => 'Stage deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to delete stage'
            ], 500);
        }
    }
}
