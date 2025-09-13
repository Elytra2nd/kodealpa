<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tournament;
use App\Models\TournamentGroup;
use App\Models\TournamentMatch;
use App\Models\GameSession;
use App\Models\GameParticipant;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TournamentController extends Controller
{
    /**
     * Get all tournaments with their current status
     */
    public function index()
    {
        $tournaments = Tournament::with([
            'groups.participants.user',
            'matches.group1',
            'matches.group2',
            'matches.winnerGroup'
        ])->orderBy('created_at', 'desc')->get();

        return response()->json([
            'tournaments' => $tournaments->map(function ($tournament) {
                return [
                    'id' => $tournament->id,
                    'name' => $tournament->name,
                    'status' => $tournament->status,
                    'current_round' => $tournament->current_round,
                    'max_groups' => $tournament->max_groups,
                    'groups' => $tournament->groups->map(function ($group) {
                        return [
                            'id' => $group->id,
                            'name' => $group->name,
                            'status' => $group->status,
                            'participants' => $group->participants->map(function ($participant) {
                                return [
                                    'id' => $participant->id,
                                    'user_id' => $participant->user_id,
                                    'nickname' => $participant->nickname,
                                    'role' => $participant->role,
                                ];
                            }),
                            'completion_time' => $group->completion_time,
                            'score' => $group->score,
                            'rank' => $group->rank,
                        ];
                    }),
                    'bracket' => $this->generateBracketStructure($tournament),
                    'created_at' => $tournament->created_at->toISOString(),
                    'starts_at' => $tournament->starts_at?->toISOString(),
                ];
            })
        ]);
    }

    /**
     * Create a new tournament
     */
    public function create(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'max_groups' => 'integer|min:4|max:4', // Fixed at 4 for this tournament format
        ]);

        DB::beginTransaction();
        try {
            $tournament = Tournament::create([
                'name' => $request->name,
                'status' => 'waiting',
                'current_round' => 1,
                'max_groups' => 4, // Fixed tournament size
                'created_by' => auth()->id(),
                'tournament_rules' => [
                    'elimination_type' => 'time_based',
                    'qualification_rounds' => 1,
                    'semifinal_rounds' => 1,
                    'final_rounds' => 1,
                    'max_completion_time' => 1800, // 30 minutes max per stage
                ],
                'created_at' => now(),
            ]);

            Log::info('Tournament created', [
                'tournament_id' => $tournament->id,
                'created_by' => auth()->id(),
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
                'message' => 'Failed to create tournament: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Join a tournament
     */
    public function join(Request $request, $tournamentId)
    {
        $request->validate([
            'group_name' => 'required|string|max:100',
            'role' => 'required|in:defuser,expert',
            'nickname' => 'required|string|max:50'
        ]);

        $tournament = Tournament::findOrFail($tournamentId);

        if ($tournament->status !== 'waiting') {
            return response()->json([
                'success' => false,
                'message' => 'Tournament is not accepting new participants'
            ], 400);
        }

        if ($tournament->groups()->count() >= $tournament->max_groups) {
            return response()->json([
                'success' => false,
                'message' => 'Tournament is full'
            ], 400);
        }

        // Check if user is already in this tournament
        $existingParticipation = TournamentGroup::whereHas('participants', function ($query) {
            $query->where('user_id', auth()->id());
        })->where('tournament_id', $tournamentId)->first();

        if ($existingParticipation) {
            return response()->json([
                'success' => false,
                'message' => 'You are already participating in this tournament'
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Find existing group with same name or create new one
            $group = TournamentGroup::where('tournament_id', $tournamentId)
                ->where('name', $request->group_name)
                ->first();

            if (!$group) {
                $group = TournamentGroup::create([
                    'tournament_id' => $tournamentId,
                    'name' => $request->group_name,
                    'status' => 'waiting',
                    'session_id' => null,
                ]);
            }

            // Check if group is full (max 2 participants)
            if ($group->participants()->count() >= 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'This group is already full'
                ], 400);
            }

            // Check if role is already taken in this group
            $existingRole = $group->participants()->where('role', $request->role)->first();
            if ($existingRole) {
                return response()->json([
                    'success' => false,
                    'message' => "Role '{$request->role}' is already taken in this group"
                ], 400);
            }

            // Create participant
            $participant = $group->participants()->create([
                'user_id' => auth()->id(),
                'role' => $request->role,
                'nickname' => $request->nickname,
                'joined_at' => now(),
            ]);

            // If group is now full (2 participants), mark as ready
            if ($group->participants()->count() == 2) {
                $group->update(['status' => 'ready']);

                // Check if all groups are ready to start qualification round
                if ($tournament->groups()->where('status', 'ready')->count() == $tournament->max_groups) {
                    $this->startQualificationRound($tournament);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'group' => $group->load('participants.user'),
                'tournament' => $tournament->load('groups.participants.user'),
                'message' => 'Successfully joined tournament'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Tournament join failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to join tournament: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Start qualification round
     */
    private function startQualificationRound(Tournament $tournament)
    {
        DB::beginTransaction();
        try {
            $tournament->update([
                'status' => 'qualification',
                'starts_at' => now(),
            ]);

            // Create game sessions for each group
            foreach ($tournament->groups as $group) {
                $session = GameSession::create([
                    'team_code' => strtoupper(\Str::random(6)),
                    'status' => 'waiting',
                    'stage_id' => 1,
                    'current_stage' => 1,
                    'seed' => rand(10000, 99999),
                    'tournament_id' => $tournament->id,
                    'tournament_group_id' => $group->id,
                    'is_tournament_session' => true,
                    'created_at' => now(),
                ]);

                // Add participants to session
                foreach ($group->participants as $participant) {
                    GameParticipant::create([
                        'game_session_id' => $session->id,
                        'user_id' => $participant->user_id,
                        'role' => $participant->role,
                        'nickname' => $participant->nickname,
                        'joined_at' => now(),
                    ]);
                }

                $group->update([
                    'session_id' => $session->id,
                    'status' => 'playing'
                ]);

                // Auto-start the session
                $session->update([
                    'status' => 'running',
                    'started_at' => now(),
                    'stage_started_at' => now(),
                    'ends_at' => now()->addMinutes(30) // 30 minutes time limit
                ]);
            }

            Log::info('Qualification round started', [
                'tournament_id' => $tournament->id,
                'groups_count' => $tournament->groups->count()
            ]);

            DB::commit();

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to start qualification round: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle tournament session completion
     */
    public function sessionCompleted(Request $request, $sessionId)
    {
        $session = GameSession::with('tournamentGroup.tournament')->findOrFail($sessionId);

        if (!$session->tournament_id) {
            return response()->json(['message' => 'Not a tournament session'], 400);
        }

        $tournament = $session->tournamentGroup->tournament;
        $group = $session->tournamentGroup;

        DB::beginTransaction();
        try {
            // Calculate completion time (in seconds)
            $completionTime = $session->started_at->diffInSeconds($session->completed_at ?? now());

            // Calculate final score
            $finalScore = $this->calculateTournamentScore($session);

            $group->update([
                'status' => 'completed',
                'completion_time' => $completionTime,
                'score' => $finalScore,
                'completed_at' => now(),
            ]);

            Log::info('Tournament group completed', [
                'tournament_id' => $tournament->id,
                'group_id' => $group->id,
                'completion_time' => $completionTime,
                'score' => $finalScore
            ]);

            // Check if all groups in current round are completed
            $this->checkRoundCompletion($tournament);

            DB::commit();

            return response()->json([
                'success' => true,
                'group' => $group,
                'tournament' => $tournament->fresh(['groups', 'matches'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Tournament session completion failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to process tournament completion: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if current round is completed and advance to next round
     */
    private function checkRoundCompletion(Tournament $tournament)
    {
        $completedGroups = $tournament->groups()
            ->where('status', 'completed')
            ->get();

        if ($tournament->status === 'qualification') {
            // All 4 groups completed qualification
            if ($completedGroups->count() == 4) {
                $this->processQualificationResults($tournament);
            }
        } elseif ($tournament->status === 'semifinals') {
            // Check if semifinal round is complete
            $activeSemifinalGroups = $tournament->groups()
                ->whereIn('status', ['playing', 'ready'])
                ->count();

            if ($activeSemifinalGroups == 0) {
                $this->processSemifinalResults($tournament);
            }
        } elseif ($tournament->status === 'finals') {
            // Finals completed
            if ($completedGroups->whereIn('status', ['completed'])->count() >= 2) {
                $this->processFinalResults($tournament);
            }
        }
    }

    /**
     * Process qualification results and eliminate slowest group
     */
    private function processQualificationResults(Tournament $tournament)
    {
        $groups = $tournament->groups()
            ->where('status', 'completed')
            ->orderBy('completion_time', 'asc')
            ->get();

        // Rank groups by completion time
        foreach ($groups as $index => $group) {
            $group->update(['rank' => $index + 1]);
        }

        // Eliminate the slowest group (rank 4)
        $eliminatedGroup = $groups->last(); // Slowest time
        $eliminatedGroup->update(['status' => 'eliminated']);

        // Top 3 groups advance to semifinals
        $advancingGroups = $groups->take(3);

        Log::info('Qualification results processed', [
            'tournament_id' => $tournament->id,
            'eliminated_group' => $eliminatedGroup->id,
            'advancing_groups' => $advancingGroups->pluck('id')->toArray()
        ]);

        // Start semifinals after short delay
        $this->startSemifinalsRound($tournament, $advancingGroups);
    }

    /**
     * Start semifinals with top 3 groups
     */
    private function startSemifinalsRound(Tournament $tournament, $advancingGroups)
    {
        $tournament->update([
            'status' => 'semifinals',
            'current_round' => 2,
        ]);

        // For 3 groups, we'll do a round-robin or best 2 advance system
        // Let's implement: All 3 groups compete, top 2 by time advance to finals

        DB::beginTransaction();
        try {
            foreach ($advancingGroups as $group) {
                // Create new session for semifinal round
                $session = GameSession::create([
                    'team_code' => strtoupper(\Str::random(6)),
                    'status' => 'running',
                    'stage_id' => 1,
                    'current_stage' => 1,
                    'seed' => rand(10000, 99999),
                    'tournament_id' => $tournament->id,
                    'tournament_group_id' => $group->id,
                    'is_tournament_session' => true,
                    'tournament_round' => 2,
                    'started_at' => now(),
                    'stage_started_at' => now(),
                    'ends_at' => now()->addMinutes(30),
                ]);

                // Copy participants to new session
                foreach ($group->participants as $participant) {
                    GameParticipant::create([
                        'game_session_id' => $session->id,
                        'user_id' => $participant->user_id,
                        'role' => $participant->role,
                        'nickname' => $participant->nickname,
                        'joined_at' => now(),
                    ]);
                }

                $group->update([
                    'session_id' => $session->id,
                    'status' => 'playing',
                    'completion_time' => null, // Reset for new round
                    'score' => 0,
                ]);
            }

            Log::info('Semifinals round started', [
                'tournament_id' => $tournament->id,
                'competing_groups' => $advancingGroups->count()
            ]);

            DB::commit();

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to start semifinals: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Process semifinal results
     */
    private function processSemifinalResults(Tournament $tournament)
    {
        $semifinalGroups = $tournament->groups()
            ->where('status', 'completed')
            ->whereNotIn('status', ['eliminated'])
            ->orderBy('completion_time', 'asc')
            ->get();

        // Top 2 groups advance to finals
        $finalists = $semifinalGroups->take(2);
        $eliminatedInSemifinal = $semifinalGroups->skip(2)->first();

        if ($eliminatedInSemifinal) {
            $eliminatedInSemifinal->update(['status' => 'eliminated']);
        }

        Log::info('Semifinal results processed', [
            'tournament_id' => $tournament->id,
            'finalists' => $finalists->pluck('id')->toArray(),
            'eliminated_in_semifinal' => $eliminatedInSemifinal?->id
        ]);

        // Start finals
        $this->startFinalsRound($tournament, $finalists);
    }

    /**
     * Start finals round
     */
    private function startFinalsRound(Tournament $tournament, $finalists)
    {
        $tournament->update([
            'status' => 'finals',
            'current_round' => 3,
        ]);

        DB::beginTransaction();
        try {
            foreach ($finalists as $group) {
                // Create final session
                $session = GameSession::create([
                    'team_code' => strtoupper(\Str::random(6)),
                    'status' => 'running',
                    'stage_id' => 1,
                    'current_stage' => 1,
                    'seed' => rand(10000, 99999),
                    'tournament_id' => $tournament->id,
                    'tournament_group_id' => $group->id,
                    'is_tournament_session' => true,
                    'tournament_round' => 3,
                    'started_at' => now(),
                    'stage_started_at' => now(),
                    'ends_at' => now()->addMinutes(30),
                ]);

                // Copy participants
                foreach ($group->participants as $participant) {
                    GameParticipant::create([
                        'game_session_id' => $session->id,
                        'user_id' => $participant->user_id,
                        'role' => $participant->role,
                        'nickname' => $participant->nickname,
                        'joined_at' => now(),
                    ]);
                }

                $group->update([
                    'session_id' => $session->id,
                    'status' => 'playing',
                    'completion_time' => null,
                    'score' => 0,
                ]);
            }

            Log::info('Finals round started', [
                'tournament_id' => $tournament->id,
                'finalists' => $finalists->pluck('id')->toArray()
            ]);

            DB::commit();

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to start finals: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Process final results and determine champion
     */
    private function processFinalResults(Tournament $tournament)
    {
        $finalGroups = $tournament->groups()
            ->where('status', 'completed')
            ->whereNotIn('status', ['eliminated'])
            ->orderBy('completion_time', 'asc')
            ->get();

        $champion = $finalGroups->first();
        $runnerUp = $finalGroups->skip(1)->first();

        if ($champion) {
            $champion->update([
                'status' => 'champion',
                'rank' => 1
            ]);
        }

        if ($runnerUp) {
            $runnerUp->update([
                'rank' => 2
            ]);
        }

        $tournament->update([
            'status' => 'completed',
            'completed_at' => now(),
            'winner_group_id' => $champion?->id,
        ]);

        Log::info('Tournament completed', [
            'tournament_id' => $tournament->id,
            'champion_group' => $champion?->id,
            'runner_up_group' => $runnerUp?->id
        ]);
    }

    /**
     * Calculate tournament score based on completion time and accuracy
     */
    private function calculateTournamentScore($session)
    {
        $baseScore = 1000;
        $timeBonus = max(0, 1800 - ($session->started_at->diffInSeconds($session->completed_at ?? now())));
        $attemptPenalty = ($session->attempts()->count() - 3) * 50; // Penalty for attempts over 3

        return max(100, $baseScore + $timeBonus - $attemptPenalty);
    }

    /**
     * Generate bracket structure for frontend display
     */
    private function generateBracketStructure(Tournament $tournament)
    {
        $brackets = [];

        // Qualification round
        $brackets[] = [
            'round' => 1,
            'name' => 'Qualification',
            'groups' => $tournament->groups->take(4)->map(function ($group) {
                return [
                    'id' => $group->id,
                    'name' => $group->name,
                    'status' => $group->status,
                    'completion_time' => $group->completion_time,
                    'rank' => $group->rank,
                ];
            }),
        ];

        // Add semifinals and finals if applicable
        if (in_array($tournament->status, ['semifinals', 'finals', 'completed'])) {
            $brackets[] = [
                'round' => 2,
                'name' => 'Semifinals',
                'groups' => $tournament->groups
                    ->where('status', '!=', 'eliminated')
                    ->take(3)
                    ->values(),
            ];
        }

        if (in_array($tournament->status, ['finals', 'completed'])) {
            $brackets[] = [
                'round' => 3,
                'name' => 'Finals',
                'groups' => $tournament->groups
                    ->whereIn('status', ['playing', 'completed', 'champion'])
                    ->where('rank', '<=', 2)
                    ->values(),
            ];
        }

        return $brackets;
    }

    /**
     * Get tournament details
     */
    public function show($id)
    {
        $tournament = Tournament::with([
            'groups.participants.user',
            'groups.session',
            'matches'
        ])->findOrFail($id);

        return response()->json([
            'tournament' => $tournament,
            'bracket' => $this->generateBracketStructure($tournament),
        ]);
    }

    /**
     * Get leaderboard for a tournament
     */
    public function leaderboard($id)
    {
        $tournament = Tournament::with([
            'groups.participants.user'
        ])->findOrFail($id);

        $leaderboard = $tournament->groups()
            ->orderBy('rank', 'asc')
            ->orderBy('completion_time', 'asc')
            ->get()
            ->map(function ($group) {
                return [
                    'id' => $group->id,
                    'name' => $group->name,
                    'rank' => $group->rank,
                    'status' => $group->status,
                    'completion_time' => $group->completion_time,
                    'score' => $group->score,
                    'participants' => $group->participants->map(function ($p) {
                        return [
                            'nickname' => $p->nickname,
                            'role' => $p->role,
                            'user' => $p->user->only(['name', 'email']),
                        ];
                    }),
                ];
            });

        return response()->json([
            'tournament' => $tournament->only(['id', 'name', 'status']),
            'leaderboard' => $leaderboard,
        ]);
    }
}
