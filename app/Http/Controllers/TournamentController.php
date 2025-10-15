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
            // Get tournaments tanpa eager loading kompleks
            $tournaments = Tournament::orderBy('created_at', 'desc')->get();

            // Manual mapping untuk avoid relationship error
            $result = [];

            foreach ($tournaments as $tournament) {
                $groups = [];

                // Get groups untuk tournament ini
                $groupModels = TournamentGroup::where('tournament_id', $tournament->id)->get();

                foreach ($groupModels as $group) {
                    $participants = [];

                    // Get participants untuk group ini
                    $participantModels = TournamentParticipant::where('tournament_group_id', $group->id)->get();

                    foreach ($participantModels as $participant) {
                        $participants[] = [
                            'id' => $participant->id,
                            'user_id' => $participant->user_id,
                            'nickname' => $participant->nickname,
                            'role' => $participant->role,
                        ];
                    }

                    $groups[] = [
                        'id' => $group->id,
                        'name' => $group->name,
                        'status' => $group->status,
                        'participants' => $participants,
                        'completion_time' => $group->completion_time,
                        'score' => $group->score ?? 0,
                        'rank' => $group->rank,
                    ];
                }

                $result[] = [
                    'id' => $tournament->id,
                    'name' => $tournament->name,
                    'status' => $tournament->status,
                    'current_round' => $tournament->current_round,
                    'max_groups' => $tournament->max_groups ?? 4,
                    'groups' => $groups,
                    'bracket' => [],
                    'created_at' => $tournament->created_at ? $tournament->created_at->toISOString() : now()->toISOString(),
                    'starts_at' => $tournament->starts_at ? $tournament->starts_at->toISOString() : null,
                ];
            }

            return response()->json([
                'success' => true,
                'tournaments' => $result
            ]);

        } catch (\Exception $e) {
            Log::error('Tournament index failed', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'tournaments' => [],
                'error' => config('app.debug') ? $e->getMessage() : 'Failed to load tournaments'
            ], 500);
        }
    }

    public function create(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:tournaments,name',
            'max_groups' => 'integer|in:4',
        ]);

        DB::beginTransaction();
        try {
            $tournament = Tournament::create([
                'name' => $validated['name'],
                'status' => 'waiting',
                'current_round' => 1,
                'max_groups' => self::MAX_GROUPS,
                'created_by' => auth()->id(),
                'tournament_rules' => [
                    'elimination_type' => 'time_based',
                    'qualification_rounds' => 1,
                    'semifinal_rounds' => 1,
                    'final_rounds' => 1,
                    'max_completion_time' => self::TOURNAMENT_TIME_LIMIT * 60,
                    'max_groups' => self::MAX_GROUPS,
                    'max_participants_per_group' => self::MAX_PARTICIPANTS_PER_GROUP,
                ]
            ]);

            Log::info('Tournament created successfully', [
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
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Tournament creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create tournament'
            ], 500);
        }
    }

    /**
     * ✅ RACE CONDITION SAFE: Join tournament (Fixed for 8 participants)
     */
    public function join(Request $request, $tournamentId)
    {
        $validated = $request->validate([
            'group_name' => 'required|string|max:100',
            'role' => 'required|in:defuser,expert',
            'nickname' => 'required|string|max:50'
        ]);

        $userId = auth()->id();
        $lockKey = "tournament:join:{$tournamentId}";
        $lock = Cache::lock($lockKey, 10);

        try {
            if (!$lock->get()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Another user is joining. Please try again.'
                ], 409);
            }

            return DB::transaction(function () use ($tournamentId, $validated, $userId, $lock) {
                $tournament = Tournament::lockForUpdate()->findOrFail($tournamentId);

                if ($tournament->status !== 'waiting') {
                    throw new \RuntimeException('Tournament is not accepting new participants');
                }

                $totalParticipants = TournamentParticipant::whereHas('group', function ($query) use ($tournamentId) {
                    $query->where('tournament_id', $tournamentId)->lockForUpdate();
                })->lockForUpdate()->count();

                if ($totalParticipants >= self::TOTAL_MAX_PARTICIPANTS) {
                    throw new \RuntimeException(sprintf('Tournament is full (%d/%d participants)',
                        $totalParticipants, self::TOTAL_MAX_PARTICIPANTS));
                }

                $existingParticipation = TournamentParticipant::whereHas('group', function ($query) use ($tournamentId) {
                    $query->where('tournament_id', $tournamentId)->lockForUpdate();
                })->where('user_id', $userId)->exists();

                if ($existingParticipation) {
                    throw new \RuntimeException('You are already participating in this tournament');
                }

                $group = TournamentGroup::lockForUpdate()
                    ->where('tournament_id', $tournamentId)
                    ->where('name', $validated['group_name'])
                    ->first();

                if ($group) {
                    $currentParticipantsInGroup = $group->participants()->lockForUpdate()->count();

                    if ($currentParticipantsInGroup >= self::MAX_PARTICIPANTS_PER_GROUP) {
                        throw new \RuntimeException(sprintf('Group "%s" is full (%d/%d participants)',
                            $group->name, $currentParticipantsInGroup, self::MAX_PARTICIPANTS_PER_GROUP));
                    }

                    $roleExists = $group->participants()->lockForUpdate()->where('role', $validated['role'])->exists();

                    if ($roleExists) {
                        $availableRole = $validated['role'] === 'defuser' ? 'expert' : 'defuser';
                        throw new \RuntimeException(sprintf('Role "%s" is already taken in group "%s". Available role: "%s"',
                            $validated['role'], $group->name, $availableRole));
                    }
                } else {
                    $currentGroupsCount = $tournament->groups()->lockForUpdate()->count();

                    if ($currentGroupsCount >= self::MAX_GROUPS) {
                        throw new \RuntimeException(sprintf('Cannot create new group. Maximum %d groups allowed. Please join an existing group.',
                            self::MAX_GROUPS));
                    }

                    $group = TournamentGroup::create([
                        'tournament_id' => $tournamentId,
                        'name' => $validated['group_name'],
                        'status' => 'waiting',
                        'session_id' => null,
                    ]);

                    Log::info('New tournament group created', [
                        'tournament_id' => $tournamentId,
                        'group_id' => $group->id,
                        'group_name' => $group->name
                    ]);
                }

                $participant = TournamentParticipant::create([
                    'tournament_group_id' => $group->id,
                    'user_id' => $userId,
                    'role' => $validated['role'],
                    'nickname' => $validated['nickname'],
                    'joined_at' => now(),
                ]);

                Log::info('Participant joined tournament', [
                    'tournament_id' => $tournamentId,
                    'group_id' => $group->id,
                    'user_id' => $userId,
                    'role' => $validated['role'],
                    'nickname' => $validated['nickname'],
                    'participants_in_group' => $group->participants()->count(),
                    'total_participants' => $totalParticipants + 1
                ]);

                $newParticipantsInGroup = $group->participants()->count();
                $newTotalParticipants = $totalParticipants + 1;

                $groupRoles = $group->participants()->pluck('role')->toArray();
                $hasDefuser = in_array('defuser', $groupRoles);
                $hasExpert = in_array('expert', $groupRoles);

                if ($newParticipantsInGroup >= self::MAX_PARTICIPANTS_PER_GROUP && $hasDefuser && $hasExpert) {
                    $group->update(['status' => 'ready']);
                    Log::info('Group is now ready', [
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                        'participants' => $newParticipantsInGroup
                    ]);
                }

                $readyGroupsCount = $tournament->groups()->where('status', 'ready')->count();
                $totalGroupsCount = $tournament->groups()->count();

                Log::info('Tournament status check', [
                    'tournament_id' => $tournamentId,
                    'ready_groups' => $readyGroupsCount,
                    'total_groups' => $totalGroupsCount,
                    'total_participants' => $newTotalParticipants,
                    'max_groups' => self::MAX_GROUPS,
                    'max_participants' => self::TOTAL_MAX_PARTICIPANTS
                ]);

                $canStart = $readyGroupsCount >= self::MAX_GROUPS &&
                           $totalGroupsCount >= self::MAX_GROUPS &&
                           $newTotalParticipants >= self::TOTAL_MAX_PARTICIPANTS;

                if ($canStart) {
                    Log::info('All conditions met - Starting qualification round', [
                        'tournament_id' => $tournamentId
                    ]);
                    $this->startQualificationRound($tournament);
                }

                $lock->release();

                $tournament->refresh();
                $group->refresh();

                return response()->json([
                    'success' => true,
                    'group' => $group->load('participants.user'),
                    'tournament' => $tournament->load('groups.participants.user'),
                    'tournament_status' => [
                        'ready_groups' => $readyGroupsCount,
                        'total_groups' => $totalGroupsCount,
                        'total_participants' => $newTotalParticipants,
                        'max_participants' => self::TOTAL_MAX_PARTICIPANTS,
                        'can_start' => $canStart,
                        'started' => $tournament->status !== 'waiting',
                    ],
                    'message' => 'Successfully joined tournament'
                ], 200);
            });

        } catch (ModelNotFoundException $e) {
            optional($lock)->release();
            Log::warning('Tournament not found', [
                'tournament_id' => $tournamentId,
                'user_id' => $userId
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Tournament not found'
            ], 404);
        } catch (\RuntimeException $e) {
            optional($lock)->release();
            Log::info('Tournament join validation failed', [
                'tournament_id' => $tournamentId,
                'user_id' => $userId,
                'reason' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        } catch (\Exception $e) {
            optional($lock)->release();
            Log::error('Tournament join failed', [
                'tournament_id' => $tournamentId,
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to join tournament. Please try again.'
            ], 500);
        }
    }

    public function getSession(Request $request, $id)
    {
        try {
            $tournament = Tournament::with([
                'groups.participants.user',
                'groups.session'
            ])->findOrFail($id);

            $groupId = $request->query('group_id');
            $userId = auth()->id();

            $userGroup = $tournament->groups()
                ->whereHas('participants', function ($query) use ($userId) {
                    $query->where('user_id', $userId);
                })
                ->first();

            if (!$userGroup && $groupId) {
                $userGroup = $tournament->groups()->find($groupId);
            }

            if (!$userGroup) {
                return response()->json([
                    'success' => false,
                    'error' => 'You are not participating in this tournament'
                ], 403);
            }

            $session = $userGroup->session;
            $gameState = null;

            if ($session) {
                $stage = Stage::find($session->stage_id);
                $puzzle = null;

                if ($stage && $session->status === 'running') {
                    $stageData = json_decode($stage->stage_data, true);
                    $currentStageIndex = $session->current_stage - 1;

                    if (isset($stageData['stages'][$currentStageIndex])) {
                        $puzzle = $stageData['stages'][$currentStageIndex];
                    }
                }

                $gameState = [
                    'session' => $session->load('participants', 'attempts'),
                    'puzzle' => $puzzle ?? [],
                    'stage' => $stage,
                    'serverTime' => now()->toISOString()
                ];
            }

            $leaderboard = $tournament->groups()
                ->with('participants.user')
                ->orderBy('rank', 'asc')
                ->orderBy('completion_time', 'asc')
                ->get()
                ->map(function ($group) {
                    return [
                        'id' => $group->id,
                        'name' => $group->name,
                        'status' => $group->status,
                        'completion_time' => $group->completion_time,
                        'rank' => $group->rank,
                        'score' => $group->score,
                        'participants' => $group->participants->map(function ($p) {
                            return [
                                'nickname' => $p->nickname,
                                'role' => $p->role,
                            ];
                        }),
                    ];
                });

            return response()->json([
                'success' => true,
                'tournament' => [
                    'id' => $tournament->id,
                    'name' => $tournament->name,
                    'status' => $tournament->status,
                    'current_round' => $tournament->current_round,
                ],
                'group' => [
                    'id' => $userGroup->id,
                    'name' => $userGroup->name,
                    'status' => $userGroup->status,
                    'completion_time' => $userGroup->completion_time,
                    'rank' => $userGroup->rank,
                    'participants' => $userGroup->participants->map(function ($p) {
                        return [
                            'id' => $p->id,
                            'user_id' => $p->user_id,
                            'nickname' => $p->nickname,
                            'role' => $p->role,
                        ];
                    }),
                ],
                'session' => $session,
                'gameState' => $gameState,
                'leaderboard' => $leaderboard
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Tournament not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Tournament session error', [
                'tournament_id' => $id,
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to load tournament session'
            ], 500);
        }
    }

    private function startQualificationRound(Tournament $tournament)
    {
        try {
            $groups = $tournament->groups()->with('participants')->get();

            if ($groups->count() !== self::MAX_GROUPS) {
                throw new \RuntimeException(sprintf(
                    'Cannot start tournament: Expected %d groups, got %d',
                    self::MAX_GROUPS,
                    $groups->count()
                ));
            }

            $totalParticipants = $groups->sum(function ($group) {
                return $group->participants->count();
            });

            if ($totalParticipants !== self::TOTAL_MAX_PARTICIPANTS) {
                throw new \RuntimeException(sprintf(
                    'Cannot start tournament: Expected %d participants, got %d',
                    self::TOTAL_MAX_PARTICIPANTS,
                    $totalParticipants
                ));
            }

            foreach ($groups as $group) {
                $participantCount = $group->participants->count();

                if ($participantCount !== self::MAX_PARTICIPANTS_PER_GROUP) {
                    throw new \RuntimeException(sprintf(
                        'Group "%s" has %d participants, expected %d',
                        $group->name,
                        $participantCount,
                        self::MAX_PARTICIPANTS_PER_GROUP
                    ));
                }

                $roles = $group->participants->pluck('role')->toArray();
                if (!in_array('defuser', $roles) || !in_array('expert', $roles)) {
                    throw new \RuntimeException(sprintf(
                        'Group "%s" must have both defuser and expert roles',
                        $group->name
                    ));
                }

                if ($group->status !== 'ready') {
                    throw new \RuntimeException(sprintf(
                        'Group "%s" is not ready (status: %s)',
                        $group->name,
                        $group->status
                    ));
                }
            }

            $tournament->update([
                'status' => 'qualification',
                'starts_at' => now(),
            ]);

            foreach ($groups as $group) {
                $session = GameSession::create([
                    'team_code' => strtoupper(Str::random(6)),
                    'status' => 'waiting',
                    'stage_id' => 1,
                    'current_stage' => 1,
                    'seed' => rand(10000, 99999),
                    'tournament_id' => $tournament->id,
                    'tournament_group_id' => $group->id,
                    'is_tournament_session' => true,
                    'tournament_round' => 1,
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

                $group->update([
                    'session_id' => $session->id,
                    'status' => 'playing'
                ]);

                $session->update([
                    'status' => 'running',
                    'started_at' => now(),
                    'stage_started_at' => now(),
                    'ends_at' => now()->addMinutes(self::TOURNAMENT_TIME_LIMIT),
                ]);
            }

            Log::info('Qualification round started successfully', [
                'tournament_id' => $tournament->id,
                'groups_count' => $groups->count(),
                'total_participants' => $totalParticipants,
                'started_at' => now()->toISOString()
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to start qualification round', [
                'tournament_id' => $tournament->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

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
                'group' => $group,
                'tournament' => $tournament->fresh('groups', 'matches')
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

    private function checkRoundCompletion(Tournament $tournament)
    {
        $completedGroups = $tournament->groups()->where('status', 'completed')->get();

        if ($tournament->status === 'qualification') {
            if ($completedGroups->count() >= self::MAX_GROUPS) {
                $this->processQualificationResults($tournament);
            }
        } elseif ($tournament->status === 'semifinals') {
            $activeSemifinalGroups = $tournament->groups()
                ->whereIn('status', ['playing', 'ready'])
                ->count();

            if ($activeSemifinalGroups === 0) {
                $this->processSemifinalResults($tournament);
            }
        } elseif ($tournament->status === 'finals') {
            $completedFinalGroups = $tournament->groups()
                ->where('status', 'completed')
                ->whereNotIn('status', ['eliminated'])
                ->count();

            if ($completedFinalGroups >= 2) {
                $this->processFinalResults($tournament);
            }
        }
    }

    private function processQualificationResults(Tournament $tournament)
    {
        $groups = $tournament->groups()
            ->where('status', 'completed')
            ->orderBy('completion_time', 'asc')
            ->get();

        foreach ($groups as $index => $group) {
            $group->update(['rank' => $index + 1]);
        }

        $eliminatedGroup = $groups->last();
        if ($eliminatedGroup) {
            $eliminatedGroup->update(['status' => 'eliminated']);
        }

        $advancingGroups = $groups->take(3);

        Log::info('Qualification results processed', [
            'tournament_id' => $tournament->id,
            'eliminated_group' => $eliminatedGroup?->id,
            'advancing_groups' => $advancingGroups->pluck('id')->toArray()
        ]);

        $this->startSemifinalsRound($tournament, $advancingGroups);
    }

    private function startSemifinalsRound(Tournament $tournament, $advancingGroups)
    {
        $tournament->update([
            'status' => 'semifinals',
            'current_round' => 2,
        ]);

        DB::beginTransaction();
        try {
            foreach ($advancingGroups as $group) {
                $session = GameSession::create([
                    'team_code' => strtoupper(Str::random(6)),
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

                $group->update([
                    'session_id' => $session->id,
                    'status' => 'playing',
                    'completion_time' => null,
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
            Log::error('Failed to start semifinals', [
                'tournament_id' => $tournament->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    private function processSemifinalResults(Tournament $tournament)
    {
        $semifinalGroups = $tournament->groups()
            ->where('status', 'completed')
            ->whereNotIn('status', ['eliminated'])
            ->orderBy('completion_time', 'asc')
            ->get();

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

        $this->startFinalsRound($tournament, $finalists);
    }

    private function startFinalsRound(Tournament $tournament, $finalists)
    {
        $tournament->update([
            'status' => 'finals',
            'current_round' => 3,
        ]);

        DB::beginTransaction();
        try {
            foreach ($finalists as $group) {
                $session = GameSession::create([
                    'team_code' => strtoupper(Str::random(6)),
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
            Log::error('Failed to start finals', [
                'tournament_id' => $tournament->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

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
            $runnerUp->update(['rank' => 2]);
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

    private function calculateTournamentScore($session)
    {
        $baseScore = 1000;
        $maxTime = self::TOURNAMENT_TIME_LIMIT * 60;
        $actualTime = $session->started_at->diffInSeconds($session->completed_at ?? now());

        $timeBonus = max(0, $maxTime - $actualTime);

        $attemptCount = 0;
        try {
            $attemptCount = $session->attempts->count();
        } catch (\Exception $e) {
            Log::warning('Could not get attempt count', ['session_id' => $session->id]);
        }

        $attemptPenalty = max(0, ($attemptCount - 3) * 50);

        return max(100, $baseScore + $timeBonus - $attemptPenalty);
    }

    private function generateBracketStructure(Tournament $tournament): array
    {
        $brackets = [];

        $brackets[] = [
            'round' => 1,
            'name' => 'Qualification',
            'groups' => $tournament->groups()->take(4)->get()->toArray(),
        ];

        if (in_array($tournament->status, ['semifinals', 'finals', 'completed'])) {
            $brackets[] = [
                'round' => 2,
                'name' => 'Semifinals',
                'groups' => $tournament->groups()
                    ->where('status', '!=', 'eliminated')
                    ->take(3)
                    ->get()
                    ->toArray(),
            ];
        }

        if (in_array($tournament->status, ['finals', 'completed'])) {
            $brackets[] = [
                'round' => 3,
                'name' => 'Finals',
                'groups' => $tournament->groups()
                    ->whereIn('status', ['playing', 'completed', 'champion'])
                    ->whereIn('rank', [1, 2])
                    ->get()
                    ->toArray(),
            ];
        }

        return $brackets;
    }

    public function show($id)
    {
        try {
            $tournament = Tournament::with([
                'groups.participants.user',
                'groups.session',
                'matches'
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'tournament' => $tournament,
                'bracket' => $this->generateBracketStructure($tournament),
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Tournament not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to load tournament details', [
                'tournament_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to load tournament details'
            ], 500);
        }
    }

    public function leaderboard($id)
    {
        try {
            $tournament = Tournament::with('groups.participants.user')->findOrFail($id);

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
                'success' => true,
                'tournament' => $tournament->only(['id', 'name', 'status']),
                'leaderboard' => $leaderboard,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Tournament not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to load leaderboard', [
                'tournament_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to load leaderboard'
            ], 500);
        }
    }

    public function leave(Request $request, $tournamentId)
    {
        $lockKey = "tournament:leave:{$tournamentId}:" . auth()->id();
        $lock = Cache::lock($lockKey, 5);

        try {
            if (!$lock->get()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Processing. Please wait.'
                ], 409);
            }

            return DB::transaction(function () use ($tournamentId, $lock) {
                $tournament = Tournament::lockForUpdate()->findOrFail($tournamentId);

                if ($tournament->status !== 'waiting') {
                    throw new \RuntimeException('Cannot leave tournament that has already started');
                }

                $participant = TournamentParticipant::whereHas('group', function ($query) use ($tournamentId) {
                    $query->where('tournament_id', $tournamentId);
                })->where('user_id', auth()->id())->first();

                if (!$participant) {
                    throw new \RuntimeException('You are not participating in this tournament');
                }

                $group = $participant->group;
                $participant->delete();

                if ($group->participants()->count() === 0) {
                    $group->delete();
                } else {
                    $group->update(['status' => 'waiting']);
                }

                Log::info('User left tournament', [
                    'tournament_id' => $tournamentId,
                    'user_id' => auth()->id(),
                    'group_deleted' => $group->participants()->count() === 0
                ]);

                $lock->release();

                return response()->json([
                    'success' => true,
                    'message' => 'Successfully left tournament'
                ]);
            });

        } catch (ModelNotFoundException $e) {
            optional($lock)->release();
            return response()->json([
                'success' => false,
                'message' => 'Tournament not found'
            ], 404);
        } catch (\RuntimeException $e) {
            optional($lock)->release();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        } catch (\Exception $e) {
            optional($lock)->release();
            Log::error('Failed to leave tournament', [
                'tournament_id' => $tournamentId,
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to leave tournament'
            ], 500);
        }
    }
}
