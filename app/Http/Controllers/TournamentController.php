<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tournament;
use App\Models\TournamentGroup;
use App\Models\TournamentMatch;
use App\Models\TournamentParticipant;
use App\Models\GameSession;
use App\Models\GameParticipant;
use App\Models\Stage;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class TournamentController extends Controller
{
    const MAX_GROUPS = 4;
    const MAX_PARTICIPANTS_PER_GROUP = 2;
    const TOTAL_MAX_PARTICIPANTS = 8;
    const TOURNAMENT_TIME_LIMIT = 30;
    const CACHE_TTL = 300;

    /**
     * ✅ FIXED: Get all tournaments with safe manual loading
     */
    public function index()
    {
        try {
            $tournaments = Tournament::orderBy('created_at', 'desc')->get();

            $result = [];

            foreach ($tournaments as $tournament) {
                try {
                    $groups = TournamentGroup::where('tournament_id', $tournament->id)->get();

                    $totalParticipants = 0;
                    foreach ($groups as $group) {
                        $participantCount = TournamentParticipant::where('group_id', $group->id)->count();
                        $totalParticipants += $participantCount;
                    }

                    // ✅ Add phase calculation
                    $phase = $this->getTournamentPhase($tournament);

                    $result[] = [
                        'id' => $tournament->id,
                        'name' => $tournament->name,
                        'status' => $tournament->status,
                        'phase' => $phase, // ✅ NEW
                        'tournament_type' => $tournament->tournament_type,
                        'max_groups' => $tournament->max_groups,
                        'current_round' => $tournament->current_round,
                        'total_participants' => $totalParticipants,
                        'groups_count' => $groups->count(),
                        'created_at' => $tournament->created_at,
                        'started_at' => $tournament->started_at,
                    ];
                } catch (\Exception $e) {
                    Log::error('Error loading tournament data', [
                        'tournament_id' => $tournament->id,
                        'error' => $e->getMessage()
                    ]);

                    $result[] = [
                        'id' => $tournament->id,
                        'name' => $tournament->name,
                        'status' => $tournament->status ?? 'unknown',
                        'phase' => 'unknown', // ✅ NEW
                        'error' => 'Failed to load tournament details'
                    ];
                }
            }

            return response()->json([
                'tournaments' => $result
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to load tournaments: ' . $e->getMessage());

            return response()->json([
                'tournaments' => [],
                'error' => 'Failed to load tournaments'
            ], 500);
        }
    }


    /**
     * Create a new tournament
     */
    public function create(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'max_groups' => 'nullable|integer|min:2|max:16',
            'tournament_type' => 'nullable|in:elimination,round_robin',
        ]);

        DB::beginTransaction();
        try {
            $tournament = Tournament::create([
                'name' => $validated['name'],
                'status' => 'waiting',
                'tournament_type' => $validated['tournament_type'] ?? 'elimination',
                'max_groups' => $validated['max_groups'] ?? self::MAX_GROUPS,
                'current_round' => 1,
            ]);

            Log::info('Tournament created', [
                'tournament_id' => $tournament->id,
                'name' => $tournament->name
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'tournament' => $tournament,
                'message' => 'Tournament created successfully'
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Tournament creation failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create tournament'
            ], 500);
        }
    }

    /**
     * Join tournament
     */
    public function join(Request $request, $tournamentId)
    {
        $validated = $request->validate([
            'group_name' => 'required|string|max:100',
            'participants' => 'required|array|min:2|max:2',
            'participants.*.nickname' => 'required|string|max:50',
            'participants.*.role' => 'required|in:defuser,expert',
        ]);

        DB::beginTransaction();
        try {
            $tournament = Tournament::findOrFail($tournamentId);

            if ($tournament->status !== 'waiting') {
                return response()->json([
                    'success' => false,
                    'message' => 'Tournament is not open for registration'
                ], 400);
            }

            $existingGroupsCount = TournamentGroup::where('tournament_id', $tournament->id)->count();
            if ($existingGroupsCount >= $tournament->max_groups) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tournament is full'
                ], 400);
            }

            $existingGroupWithName = TournamentGroup::where('tournament_id', $tournament->id)
                ->where('name', $validated['group_name'])
                ->first();

            if ($existingGroupWithName) {
                return response()->json([
                    'success' => false,
                    'message' => 'Group name already taken'
                ], 400);
            }

            $userParticipation = TournamentParticipant::whereHas('group', function($query) use ($tournament) {
                $query->where('tournament_id', $tournament->id);
            })->where('user_id', auth()->id())->first();

            if ($userParticipation) {
                return response()->json([
                    'success' => false,
                    'message' => 'You have already joined this tournament'
                ], 400);
            }

            $group = TournamentGroup::create([
                'tournament_id' => $tournament->id,
                'name' => $validated['group_name'],
                'status' => 'waiting',
                'score' => 0,
            ]);

            $roles = ['defuser', 'expert'];
            foreach ($validated['participants'] as $index => $participantData) {
                TournamentParticipant::create([
                    'group_id' => $group->id,
                    'user_id' => $index === 0 ? auth()->id() : auth()->id(),
                    'nickname' => $participantData['nickname'],
                    'role' => $participantData['role'],
                ]);
            }

            Log::info('Group joined tournament', [
                'tournament_id' => $tournament->id,
                'group_id' => $group->id,
                'group_name' => $group->name
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'tournament' => $tournament->fresh(),
                'group' => $group->load('participants'),
                'message' => 'Successfully joined tournament'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Tournament join failed', [
                'tournament_id' => $tournamentId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to join tournament: ' . $e->getMessage()
            ], 500);
        }
    }

        /**
     * Get tournament session for user's group
     */
    public function getSession(Request $request, $tournamentId)
    {
        try {
            $tournament = Tournament::findOrFail($tournamentId);

            $groupId = $request->query('group_id');

            if ($groupId) {
                $group = TournamentGroup::with(['participants.user', 'session'])
                    ->where('tournament_id', $tournament->id)
                    ->where('id', $groupId)
                    ->firstOrFail();
            } else {
                $group = TournamentGroup::with(['participants.user', 'session'])
                    ->where('tournament_id', $tournament->id)
                    ->whereHas('participants', function($query) {
                        $query->where('user_id', auth()->id());
                    })
                    ->first();

                if (!$group) {
                    return response()->json([
                        'error' => 'You are not part of any group in this tournament'
                    ], 404);
                }
            }

            if (!$group->session) {
                $session = $this->createTournamentSession($group);
            } else {
                $session = $group->session;
            }

            $stage = Stage::find($session->stage_id);
            if (!$stage) {
                Log::error('Stage not found', ['stage_id' => $session->stage_id]);
                return response()->json(['error' => 'Stage configuration not found'], 404);
            }

            $stageData = $stage->config;
            $currentStageIndex = $session->current_stage - 1;
            $puzzle = $stageData['puzzles'][$currentStageIndex] ?? null;

            if (!$puzzle) {
                Log::error('Puzzle not found', [
                    'stage_id' => $session->stage_id,
                    'current_stage' => $session->current_stage,
                    'stage_index' => $currentStageIndex
                ]);
                return response()->json(['error' => 'Puzzle not found'], 404);
            }

            $userParticipant = $group->participants->where('user_id', auth()->id())->first();
            $userRole = $userParticipant ? $userParticipant->role : 'host';

            $filteredPuzzle = $this->filterPuzzleByRole($puzzle, $userRole);

            $leaderboard = TournamentGroup::where('tournament_id', $tournament->id)
                ->with('participants')
                ->orderBy('rank', 'asc')
                ->orderBy('score', 'desc')
                ->orderBy('completion_time', 'asc')
                ->get()
                ->map(function($g) {
                    return [
                        'id' => $g->id,
                        'name' => $g->name,
                        'rank' => $g->rank,
                        'score' => $g->score ?? 0,
                        'status' => $g->status,
                        'completion_time' => $g->completion_time,
                        'participants' => $g->participants->map(fn($p) => [
                            'id' => $p->id,
                            'nickname' => $p->nickname,
                            'role' => $p->role,
                            'user' => [
                                'name' => $p->user->name ?? 'Unknown',
                                'email' => $p->user->email ?? ''
                            ]
                        ])
                    ];
                });

            // ✅ Calculate tournament phase
            $phase = $this->getTournamentPhase($tournament);

            return response()->json([
                'tournament' => array_merge($tournament->toArray(), [
                    'phase' => $phase // ✅ Add phase to tournament data
                ]),
                'group' => $group,
                'session' => $session,
                'gameState' => [
                    'session' => $session,
                    'puzzle' => $filteredPuzzle,
                    'userRole' => $userRole,
                    'stage' => [
                        'current' => $session->current_stage,
                        'total' => count($stageData['puzzles']),
                        'name' => $stage->name,
                    ],
                    'serverTime' => now()->toISOString()
                ],
                'leaderboard' => $leaderboard
            ]);
        } catch (\Exception $e) {
            Log::error('Get tournament session failed', [
                'tournament_id' => $tournamentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to load tournament session',
                'message' => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Filter puzzle by role
     */
    private function filterPuzzleByRole($puzzle, $role)
    {
        $filtered = [
            'key' => $puzzle['key'],
            'title' => $puzzle['title'] ?? 'Puzzle',
            'description' => $puzzle['description'] ?? '',
            'type' => $puzzle['type'],
            'learningObjectives' => $puzzle['learningObjectives'] ?? [],
        ];

        if ($role === 'defuser') {
            $filtered['defuserView'] = $puzzle['defuserView'];
            if (isset($puzzle['expertView']['tree'])) {
                $filtered['expertView'] = ['tree' => $puzzle['expertView']['tree']];
            }
        } elseif ($role === 'expert') {
            $filtered['expertView'] = $puzzle['expertView'];
        } elseif ($role === 'host') {
            $filtered['defuserView'] = $puzzle['defuserView'];
            $filtered['expertView'] = $puzzle['expertView'];
            $filtered['solution'] = $puzzle['solution'] ?? null;
        }

        return $filtered;
    }

    /**
     * Create tournament session for group
     */
    private function createTournamentSession(TournamentGroup $group)
    {
        $stage = Stage::first();
        if (!$stage) {
            throw new \Exception('No stages available');
        }

        $seed = rand(10000, 99999);

        $session = GameSession::create([
            'stage_id' => $stage->id,
            'seed' => $seed,
            'tournament_id' => $group->tournament_id,
            'tournament_group_id' => $group->id,
            'is_tournament_session' => true,
            'tournament_round' => $group->tournament->current_round,
            'current_stage' => 1,
            'status' => 'running',
            'started_at' => now(),
            'stage_started_at' => now(),
            'ends_at' => now()->addMinutes(self::TOURNAMENT_TIME_LIMIT),
        ]);

        foreach ($group->participants as $participant) {
            GameParticipant::create([
                'game_session_id' => $session->id,
                'user_id' => $participant->user_id,
                'role' => $participant->role,
                'nickname' => $participant->nickname,
                'joined_at' => now(),
            ]);
        }

        $group->update(['status' => 'playing']);

        Log::info('Tournament session created', [
            'session_id' => $session->id,
            'group_id' => $group->id,
            'tournament_id' => $group->tournament_id
        ]);

        return $session;
    }

    /**
     * ✅ UPDATED: Tournament session completed - with leaderboard update
     */
    public function sessionCompleted(Request $request, $sessionId)
    {
        DB::beginTransaction();
        try {
            $session = GameSession::with('tournamentGroup.tournament')->findOrFail($sessionId);

            if (!$session->tournament_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Not a tournament session'
                ], 400);
            }

            $tournament = $session->tournamentGroup->tournament;
            $group = $session->tournamentGroup;

            $completionTime = $session->started_at->diffInSeconds($session->completed_at ?? now());
            $finalScore = $this->calculateTournamentScore($session);

            $group->update([
                'status' => 'completed',
                'completion_time' => $completionTime,
                'score' => $finalScore,
                'completed_at' => now(),
            ]);

            // ✅ Update leaderboard rankings after completion
            $this->updateLeaderboard($tournament);

            Log::info('Tournament group completed', [
                'tournament_id' => $tournament->id,
                'group_id' => $group->id,
                'completion_time' => $completionTime,
                'score' => $finalScore
            ]);

            $this->checkRoundCompletion($tournament);

            DB::commit();

            return response()->json([
                'success' => true,
                'group' => $group->fresh(),
                'tournament' => $tournament->fresh(['groups', 'matches'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Tournament session completion failed', [
                'session_id' => $sessionId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process tournament completion'
            ], 500);
        }
    }

    /**
     * Calculate tournament score
     */
    private function calculateTournamentScore(GameSession $session)
    {
        $baseScore = $session->total_score ?? 0;
        $attempts = $session->attempts()->count();
        $correctAttempts = $session->attempts()->where('is_correct', true)->count();

        $accuracy = $attempts > 0 ? ($correctAttempts / $attempts) * 100 : 0;
        $accuracyBonus = ($accuracy > 80) ? 200 : (($accuracy > 60) ? 100 : 0);

        $timeSpent = $session->started_at->diffInSeconds($session->completed_at ?? now());
        $timeLimit = 1800;
        $timeBonus = max(0, floor(($timeLimit - $timeSpent) / 10));

        return $baseScore + $accuracyBonus + $timeBonus;
    }

        /**
     * ✅ NEW: Update tournament leaderboard rankings
     */
    private function updateLeaderboard(Tournament $tournament): void
    {
        // Get all groups ordered by: status (completed first), score (desc), completion_time (asc)
        $groups = $tournament->groups()
            ->orderByRaw("CASE
                WHEN status = 'completed' OR status = 'champion' THEN 1
                WHEN status = 'playing' THEN 2
                WHEN status = 'eliminated' THEN 4
                ELSE 3
            END")
            ->orderBy('score', 'desc')
            ->orderBy('completion_time', 'asc')
            ->get();

        // Assign ranks to completed groups only
        $rank = 1;
        foreach ($groups as $group) {
            if (in_array($group->status, ['completed', 'champion'])) {
                $group->update(['rank' => $rank]);
                $rank++;
            } else {
                // Keep existing rank for champions, reset for others
                if (!in_array($group->status, ['champion'])) {
                    $group->update(['rank' => null]);
                }
            }
        }

        Log::info('Leaderboard updated', [
            'tournament_id' => $tournament->id,
            'ranked_groups' => $rank - 1
        ]);
    }

    /**
 * ✅ NEW: Get current tournament phase based on groups and round
 */
    private function getTournamentPhase(Tournament $tournament): string
    {
        $groups = $tournament->groups;
        $champion = $groups->where('status', 'champion')->first();

        // If there's a champion, tournament is completed
        if ($champion) {
            return 'completed';
        }

        // Determine phase based on current round
        if ($tournament->current_round >= 3) {
            return 'finals';
        }

        if ($tournament->current_round >= 2) {
            return 'semifinals';
        }

        return 'qualification';
    }


    /**
     * Check if round is completed
     */
    private function checkRoundCompletion(Tournament $tournament)
    {
        $currentRound = $tournament->current_round;

        $playingGroups = TournamentGroup::where('tournament_id', $tournament->id)
            ->whereIn('status', ['waiting', 'playing'])
            ->count();

        if ($playingGroups === 0) {
            Log::info('Tournament round completed', [
                'tournament_id' => $tournament->id,
                'round' => $currentRound
            ]);

            $this->advanceToNextRound($tournament);
        }
    }

    /**
     * Advance to next tournament round
     */
    private function advanceToNextRound(Tournament $tournament)
    {
        $completedGroups = TournamentGroup::where('tournament_id', $tournament->id)
            ->where('status', 'completed')
            ->orderBy('score', 'desc')
            ->orderBy('completion_time', 'asc')
            ->get();

        if ($completedGroups->isEmpty()) {
            $tournament->update(['status' => 'completed']);
            return;
        }

        $winnerCount = ceil($completedGroups->count() / 2);
        $winners = $completedGroups->take($winnerCount);
        $losers = $completedGroups->skip($winnerCount);

        foreach ($winners as $winner) {
            $winner->update([
                'status' => 'waiting',
                'completion_time' => null
            ]);
        }

        foreach ($losers as $loser) {
            $loser->update(['status' => 'eliminated']);
        }

        if ($winners->count() === 1) {
            $champion = $winners->first();
            $champion->update(['status' => 'champion', 'rank' => 1]);
            $tournament->update([
                'status' => 'completed',
                'winner_group_id' => $champion->id
            ]);

            Log::info('Tournament completed with champion', [
                'tournament_id' => $tournament->id,
                'champion_group_id' => $champion->id
            ]);
        } else {
            $tournament->update([
                'current_round' => $tournament->current_round + 1
            ]);

            Log::info('Advanced to next round', [
                'tournament_id' => $tournament->id,
                'new_round' => $tournament->current_round
            ]);
        }
    }

    /**
     * Get tournament details
     */
    public function show($tournamentId)
    {
        try {
            $tournament = Tournament::with(['groups.participants.user'])->findOrFail($tournamentId);

            // ✅ Calculate tournament phase
            $phase = $this->getTournamentPhase($tournament);

            $bracket = $this->generateBracket($tournament);

            return response()->json([
                'tournament' => array_merge($tournament->toArray(), [
                    'phase' => $phase // ✅ Add phase to response
                ]),
                'bracket' => $bracket
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to load tournament details', [
                'tournament_id' => $tournamentId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Failed to load tournament details'
            ], 500);
        }
    }


    /**
     * Generate tournament bracket
     */
    private function generateBracket(Tournament $tournament)
    {
        $groups = $tournament->groups;
        $bracket = [];

        foreach ($groups as $group) {
            $bracket[] = [
                'group_id' => $group->id,
                'group_name' => $group->name,
                'round' => $tournament->current_round,
                'status' => $group->status,
                'score' => $group->score,
                'participants' => $group->participants->map(function($p) {
                    return [
                        'nickname' => $p->nickname,
                        'role' => $p->role
                    ];
                })
            ];
        }

        return $bracket;
    }

    /**
     * Get tournament leaderboard
     */
    public function getLeaderboard($tournamentId)
    {
        try {
            $tournament = Tournament::findOrFail($tournamentId);

            $leaderboard = TournamentGroup::where('tournament_id', $tournament->id)
                ->with('participants.user')
                ->orderBy('rank', 'asc')
                ->orderBy('score', 'desc')
                ->orderBy('completion_time', 'asc')
                ->get()
                ->map(function($group) {
                    return [
                        'id' => $group->id,
                        'name' => $group->name,
                        'rank' => $group->rank,
                        'status' => $group->status,
                        'score' => $group->score ?? 0,
                        'completion_time' => $group->completion_time,
                        'participants' => $group->participants->map(function($p) {
                            return [
                                'nickname' => $p->nickname,
                                'role' => $p->role,
                                'user' => [
                                    'name' => $p->user->name ?? 'Unknown',
                                    'email' => $p->user->email ?? ''
                                ]
                            ];
                        })
                    ];
                });

            return response()->json([
                'tournament' => [
                    'id' => $tournament->id,
                    'name' => $tournament->name,
                    'status' => $tournament->status
                ],
                'leaderboard' => $leaderboard
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get leaderboard', [
                'tournament_id' => $tournamentId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Failed to load leaderboard'
            ], 500);
        }
    }

    /**
     * Leave tournament (before it starts)
     */
    public function leave($tournamentId)
    {
        DB::beginTransaction();
        try {
            $tournament = Tournament::findOrFail($tournamentId);

            if ($tournament->status !== 'waiting') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot leave tournament after it has started'
                ], 400);
            }

            $group = TournamentGroup::where('tournament_id', $tournament->id)
                ->whereHas('participants', function($query) {
                    $query->where('user_id', auth()->id());
                })
                ->first();

            if (!$group) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not in this tournament'
                ], 404);
            }

            TournamentParticipant::where('group_id', $group->id)->delete();
            $group->delete();

            Log::info('User left tournament', [
                'tournament_id' => $tournament->id,
                'group_id' => $group->id,
                'user_id' => auth()->id()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Successfully left tournament'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Leave tournament failed', [
                'tournament_id' => $tournamentId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to leave tournament'
            ], 500);
        }
    }

    /**
     * Delete tournament (admin only)
     */
    public function destroy($tournamentId)
    {
        DB::beginTransaction();
        try {
            $tournament = Tournament::findOrFail($tournamentId);

            // Delete all related data
            $groups = TournamentGroup::where('tournament_id', $tournament->id)->get();

            foreach ($groups as $group) {
                TournamentParticipant::where('group_id', $group->id)->delete();

                if ($group->session) {
                    GameParticipant::where('game_session_id', $group->session->id)->delete();
                    $group->session->delete();
                }

                $group->delete();
            }

            $tournament->delete();

            Log::info('Tournament deleted', [
                'tournament_id' => $tournament->id,
                'deleted_by' => auth()->id()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tournament deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Tournament deletion failed', [
                'tournament_id' => $tournamentId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete tournament'
            ], 500);
        }
    }
}


