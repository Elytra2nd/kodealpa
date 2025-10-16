<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class Tournament extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'status',
        'current_round',
        'max_groups',
        'created_by',
        'tournament_rules',
        'starts_at',
        'completed_at',
        'winner_group_id',
    ];

    /**
     * Laravel 12: Updated casts() method
     */
    protected function casts(): array
    {
        return [
            'tournament_rules' => 'array',
            'starts_at' => 'datetime',
            'completed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Boot method untuk handle events (Laravel 12 style)
     */
    protected static function booted(): void
    {
        // ✅ Auto-fill created_by dengan user yang sedang login
        static::creating(function (Tournament $tournament) {
            if (!$tournament->isDirty('created_by') && auth()->check()) {
                $tournament->created_by = auth()->id();
            }
        });

        // Event sebelum tournament dihapus
        static::deleting(function (Tournament $tournament) {
            // Hitung jumlah related data
            $groupsCount = $tournament->groups()->count();
            $participantsCount = TournamentParticipant::whereHas('group', function ($query) use ($tournament) {
                $query->where('tournament_id', $tournament->id);
            })->count();
            $matchesCount = $tournament->matches()->count();
            $sessionsCount = $tournament->sessions()->count();

            // Hapus related data secara cascade
            $tournament->groups()->delete();
            $tournament->matches()->delete();

            // Log untuk tracking
            Log::info('Tournament deleted', [
                'tournament_id' => $tournament->id,
                'tournament_name' => $tournament->name,
                'status' => $tournament->status,
                'created_at' => $tournament->created_at?->toDateTimeString(),
                'updated_at' => $tournament->updated_at?->toDateTimeString(),
                'groups_deleted' => $groupsCount,
                'participants_affected' => $participantsCount,
                'matches_deleted' => $matchesCount,
                'sessions_affected' => $sessionsCount,
                'deleted_at' => now()->toDateTimeString(),
                'deleted_by' => 'auto_cleanup',
            ]);
        });

        // Event setelah tournament dibuat
        static::created(function (Tournament $tournament) {
            Log::info('Tournament created', [
                'tournament_id' => $tournament->id,
                'tournament_name' => $tournament->name,
                'max_groups' => $tournament->max_groups,
                'created_by' => $tournament->created_by,
                'created_at' => now()->toDateTimeString(),
            ]);
        });

        // Event ketika tournament status berubah
        static::updated(function (Tournament $tournament) {
            if ($tournament->isDirty('status')) {
                Log::info('Tournament status changed', [
                    'tournament_id' => $tournament->id,
                    'tournament_name' => $tournament->name,
                    'old_status' => $tournament->getOriginal('status'),
                    'new_status' => $tournament->status,
                    'updated_at' => now()->toDateTimeString(),
                ]);
            }
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * Tournament belongs to creator
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Tournament has many groups
     */
    public function groups(): HasMany
    {
        return $this->hasMany(TournamentGroup::class);
    }

    /**
     * Tournament has many matches
     */
    public function matches(): HasMany
    {
        return $this->hasMany(TournamentMatch::class);
    }

    /**
     * Tournament has winner group
     */
    public function winnerGroup(): BelongsTo
    {
        return $this->belongsTo(TournamentGroup::class, 'winner_group_id');
    }

    /**
     * Tournament has many sessions through groups
     */
    public function sessions(): HasManyThrough
    {
        return $this->hasManyThrough(
            GameSession::class,
            TournamentGroup::class,
            'tournament_id',        // Foreign key on tournament_groups table
            'tournament_group_id',  // Foreign key on game_sessions table
            'id',                   // Local key on tournaments table
            'id'                    // Local key on tournament_groups table
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors & Attributes
    |--------------------------------------------------------------------------
    */

    /**
     * Get active participants count
     */
    public function getActiveParticipantsCountAttribute(): int
    {
        return $this->groups()
            ->whereNotIn('status', ['eliminated'])
            ->withCount('participants')
            ->get()
            ->sum('participants_count');
    }

    /**
     * Get elimination progress
     */
    public function getEliminationProgressAttribute(): array
    {
        $total = $this->groups()->count();
        $eliminated = $this->groups()->where('status', 'eliminated')->count();

        return [
            'total' => $total,
            'eliminated' => $eliminated,
            'remaining' => $total - $eliminated,
            'percentage' => $total > 0 ? round(($eliminated / $total) * 100, 2) : 0,
        ];
    }

    /**
     * Get tournament statistics
     */
    public function getStatsAttribute(): array
    {
        $groups = $this->groups;

        return [
            'total_groups' => $groups->count(),
            'active_groups' => $groups->whereNotIn('status', ['eliminated'])->count(),
            'eliminated_groups' => $groups->where('status', 'eliminated')->count(),
            'completed_groups' => $groups->where('status', 'completed')->count(),
            'average_completion_time' => $groups->where('completion_time', '>', 0)->avg('completion_time'),
            'fastest_completion' => $groups->where('completion_time', '>', 0)->min('completion_time'),
            'slowest_completion' => $groups->where('completion_time', '>', 0)->max('completion_time'),
            'total_participants' => $groups->sum(function ($group) {
                return $group->participants->count();
            }),
            'age_in_hours' => $this->created_at?->diffInHours(now()),
            'inactive_duration' => $this->updated_at?->diffInHours(now()),
        ];
    }

    /**
     * Check if tournament is stale/inactive
     */
    public function getIsStaleAttribute(): bool
    {
        $config = config('tournament.cleanup');

        // Tournament completed dan sudah lama
        if ($this->status === 'completed') {
            return $this->updated_at?->diffInDays(now()) >= $config['completed_after_days'];
        }

        // Tournament waiting tanpa peserta
        if ($this->status === 'waiting' && $this->groups()->count() === 0) {
            return $this->created_at?->diffInHours(now()) >= $config['waiting_empty_after_hours'];
        }

        // Tournament waiting dengan sedikit peserta
        if ($this->status === 'waiting' && $this->groups()->count() < $config['minimum_active_groups']) {
            return $this->created_at?->diffInHours(now()) >= $config['waiting_inactive_after_hours'];
        }

        // Tournament stuck
        if (in_array($this->status, ['qualification', 'semifinals', 'finals'])) {
            return $this->updated_at?->diffInHours(now()) >= $config['stuck_after_hours'];
        }

        return false;
    }

    /*
    |--------------------------------------------------------------------------
    | Query Methods (Race Condition Safe)
    |--------------------------------------------------------------------------
    */

    /**
     * Check if tournament is full
     */
    public function isFull(): bool
    {
        return $this->groups()->count() >= $this->max_groups;
    }

    /**
     * ✅ RACE CONDITION SAFE: Check if user can join tournament
     * Uses pessimistic locking to prevent concurrent access issues
     */
    public function canUserJoin(int $userId): bool
    {
        return DB::transaction(function () use ($userId) {
            // ✅ Lock tournament row to prevent concurrent reads
            $tournament = self::where('id', $this->id)
                ->lockForUpdate()
                ->first();

            if (!$tournament || $tournament->status !== 'waiting') {
                return false;
            }

            // ✅ Lock and count groups atomically
            $currentGroupsCount = TournamentGroup::where('tournament_id', $this->id)
                ->lockForUpdate()
                ->count();

            if ($currentGroupsCount >= $this->max_groups) {
                Log::info('Tournament join rejected: full', [
                    'tournament_id' => $this->id,
                    'user_id' => $userId,
                    'current_groups' => $currentGroupsCount,
                    'max_groups' => $this->max_groups,
                ]);
                return false;
            }

            // ✅ Check existing participation
            $existingParticipation = TournamentParticipant::whereHas('group', function ($query) {
                $query->where('tournament_id', $this->id)
                      ->lockForUpdate();
            })->where('user_id', $userId)->exists();

            if ($existingParticipation) {
                Log::info('Tournament join rejected: already participating', [
                    'tournament_id' => $this->id,
                    'user_id' => $userId,
                ]);
                return false;
            }

            return true;
        });
    }

    /**
     * ✅ RACE CONDITION SAFE: Join tournament
     * Atomic operation with retry mechanism
     */
    public function joinTournament(int $userId, string $groupName, int $maxRetries = 3): ?TournamentGroup
    {
        $retryCount = 0;

        while ($retryCount < $maxRetries) {
            try {
                return DB::transaction(function () use ($userId, $groupName) {
                    // ✅ Double-check with lock
                    if (!$this->canUserJoin($userId)) {
                        throw new \RuntimeException('Cannot join tournament: full or already joined');
                    }

                    // ✅ Create group atomically
                    $group = TournamentGroup::create([
                        'tournament_id' => $this->id,
                        'name' => $groupName,
                        'status' => 'waiting',
                    ]);

                    // ✅ Create participant
                    TournamentParticipant::create([
                        'tournament_group_id' => $group->id,
                        'user_id' => $userId,
                        'role' => 'leader',
                    ]);

                    Log::info('User successfully joined tournament', [
                        'tournament_id' => $this->id,
                        'user_id' => $userId,
                        'group_id' => $group->id,
                        'group_name' => $groupName,
                        'groups_count' => $this->groups()->count(),
                    ]);

                    return $group->fresh();
                });

            } catch (\Exception $e) {
                $retryCount++;

                Log::warning('Tournament join attempt failed', [
                    'tournament_id' => $this->id,
                    'user_id' => $userId,
                    'attempt' => $retryCount,
                    'max_retries' => $maxRetries,
                    'error' => $e->getMessage(),
                ]);

                if ($retryCount >= $maxRetries) {
                    Log::error('Tournament join failed after max retries', [
                        'tournament_id' => $this->id,
                        'user_id' => $userId,
                        'error' => $e->getMessage(),
                    ]);
                    throw $e;
                }

                // ✅ Exponential backoff: 100ms, 200ms, 400ms
                usleep(pow(2, $retryCount) * 100000);
            }
        }

        return null;
    }

    /**
     * Get current round matches
     */
    public function getCurrentRoundMatches()
    {
        return $this->matches()
            ->where('round', $this->current_round)
            ->with(['group1', 'group2', 'winnerGroup'])
            ->orderBy('created_at')
            ->get();
    }

    /**
     * Get tournament bracket structure
     */
    public function getBracketStructure(): array
    {
        $brackets = [];

        // Qualification round (Round 1)
        if ($this->current_round >= 1) {
            $brackets[] = [
                'round' => 1,
                'name' => 'Qualification Round',
                'description' => '4 groups compete, slowest eliminated',
                'groups' => $this->groups()->take(4)->get(),
                'status' => $this->current_round > 1 ? 'completed' :
                           ($this->status === 'qualification' ? 'active' : 'pending'),
            ];
        }

        // Semifinals (Round 2)
        if ($this->current_round >= 2) {
            $brackets[] = [
                'round' => 2,
                'name' => 'Semifinals',
                'description' => '3 groups compete, top 2 advance',
                'groups' => $this->groups()
                    ->whereNotIn('status', ['eliminated'])
                    ->take(3)
                    ->get(),
                'status' => $this->current_round > 2 ? 'completed' :
                           ($this->status === 'semifinals' ? 'active' : 'pending'),
            ];
        }

        // Finals (Round 3)
        if ($this->current_round >= 3) {
            $brackets[] = [
                'round' => 3,
                'name' => 'Finals',
                'description' => '2 groups battle for championship',
                'groups' => $this->groups()
                    ->whereIn('status', ['playing', 'completed', 'champion'])
                    ->whereIn('rank', [1, 2])
                    ->get(),
                'status' => $this->status === 'completed' ? 'completed' :
                           ($this->status === 'finals' ? 'active' : 'pending'),
            ];
        }

        return $brackets;
    }

    /**
     * Get user's group in this tournament
     */
    public function getUserGroup(int $userId): ?TournamentGroup
    {
        return $this->groups()
            ->whereHas('participants', function ($query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->first();
    }

    /**
     * Check if tournament is ready to start
     */
    public function isReadyToStart(): bool
    {
        return $this->status === 'waiting' &&
               $this->groups()->count() === $this->max_groups &&
               $this->groups()->where('status', 'ready')->count() === $this->max_groups;
    }

    /*
    |--------------------------------------------------------------------------
    | Query Scopes
    |--------------------------------------------------------------------------
    */

    /**
     * Scope for active tournaments
     */
    public function scopeActive($query)
    {
        return $query->whereIn('status', ['waiting', 'qualification', 'semifinals', 'finals']);
    }

    /**
     * Scope for completed tournaments
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope for tournaments that can accept new participants
     */
    public function scopeJoinable($query)
    {
        return $query->where('status', 'waiting')
            ->whereHas('groups', function ($q) {
                $q->havingRaw('COUNT(*) < ?', [4]); // Less than max groups
            }, '<', 4);
    }

    /**
     * Scope for stale/inactive tournaments (untuk cleanup)
     */
    public function scopeStale($query)
    {
        $config = config('tournament.cleanup');

        return $query->where(function ($query) use ($config) {
            // Completed tournaments yang sudah lama
            $query->where('status', 'completed')
                  ->where('updated_at', '<', now()->subDays($config['completed_after_days']));
        })->orWhere(function ($query) use ($config) {
            // Waiting tournaments kosong
            $query->where('status', 'waiting')
                  ->whereDoesntHave('groups')
                  ->where('created_at', '<', now()->subHours($config['waiting_empty_after_hours']));
        })->orWhere(function ($query) use ($config) {
            // Waiting tournaments dengan sedikit peserta
            $query->where('status', 'waiting')
                  ->where('created_at', '<', now()->subHours($config['waiting_inactive_after_hours']))
                  ->whereHas('groups', function ($q) use ($config) {
                      // Filter akan dilakukan di aplikasi level
                  }, '<', $config['minimum_active_groups']);
        })->orWhere(function ($query) use ($config) {
            // Stuck tournaments
            $query->whereIn('status', ['qualification', 'semifinals', 'finals'])
                  ->where('updated_at', '<', now()->subHours($config['stuck_after_hours']));
        });
    }

    /**
     * Scope for empty tournaments
     */
    public function scopeEmpty($query)
    {
        return $query->where('status', 'waiting')
                     ->whereDoesntHave('groups');
    }

    /**
     * Scope for abandoned tournaments
     */
    public function scopeAbandoned($query, int $hours = 48)
    {
        return $query->whereIn('status', ['qualification', 'semifinals', 'finals'])
                     ->where('updated_at', '<', now()->subHours($hours));
    }
}
