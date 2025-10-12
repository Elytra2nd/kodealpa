<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Log;

class TournamentGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'tournament_id',
        'name',
        'status',
        'session_id',
        'completion_time',
        'score',
        'rank',
        'completed_at',
    ];

    /**
     * Laravel 12: Updated casts() method
     */
    protected function casts(): array
    {
        return [
            'completion_time' => 'integer',
            'score' => 'integer',
            'rank' => 'integer',
            'completed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Boot method untuk handle events (Laravel 12 style)
     */
    protected static function booted(): void
    {
        // Event sebelum group dihapus
        static::deleting(function (TournamentGroup $group) {
            $participantsCount = $group->participants()->count();

            // Hapus semua participants terkait
            $group->participants()->delete();

            // Log untuk tracking
            Log::info('Tournament group deleted', [
                'group_id' => $group->id,
                'group_name' => $group->name,
                'tournament_id' => $group->tournament_id,
                'tournament_name' => $group->tournament?->name,
                'status' => $group->status,
                'participants_deleted' => $participantsCount,
                'completion_time' => $group->completion_time,
                'score' => $group->score,
                'rank' => $group->rank,
                'deleted_at' => now()->toDateTimeString(),
            ]);
        });

        // Event ketika group dibuat
        static::created(function (TournamentGroup $group) {
            Log::info('Tournament group created', [
                'group_id' => $group->id,
                'group_name' => $group->name,
                'tournament_id' => $group->tournament_id,
                'created_at' => now()->toDateTimeString(),
            ]);
        });

        // Event ketika group status berubah
        static::updated(function (TournamentGroup $group) {
            if ($group->isDirty('status')) {
                Log::info('Tournament group status changed', [
                    'group_id' => $group->id,
                    'group_name' => $group->name,
                    'tournament_id' => $group->tournament_id,
                    'old_status' => $group->getOriginal('status'),
                    'new_status' => $group->status,
                    'updated_at' => now()->toDateTimeString(),
                ]);
            }

            // Log ketika group menyelesaikan session
            if ($group->isDirty('completed_at') && $group->completed_at) {
                Log::info('Tournament group completed session', [
                    'group_id' => $group->id,
                    'group_name' => $group->name,
                    'tournament_id' => $group->tournament_id,
                    'completion_time' => $group->completion_time,
                    'score' => $group->score,
                    'rank' => $group->rank,
                    'completed_at' => $group->completed_at->toDateTimeString(),
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
     * Group belongs to tournament
     */
    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    /**
     * Group has many participants
     */
    public function participants(): HasMany
    {
        return $this->hasMany(TournamentParticipant::class);
    }

    /**
     * Group belongs to session
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(GameSession::class, 'session_id');
    }

    /**
     * Group can be group1 in matches
     */
    public function matchesAsGroup1(): HasMany
    {
        return $this->hasMany(TournamentMatch::class, 'group1_id');
    }

    /**
     * Group can be group2 in matches
     */
    public function matchesAsGroup2(): HasMany
    {
        return $this->hasMany(TournamentMatch::class, 'group2_id');
    }

    /**
     * Group can be winner in matches
     */
    public function wonMatches(): HasMany
    {
        return $this->hasMany(TournamentMatch::class, 'winner_group_id');
    }

    /**
     * Get all matches for this group
     */
    public function matches()
    {
        return TournamentMatch::where('group1_id', $this->id)
            ->orWhere('group2_id', $this->id);
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors & Attributes
    |--------------------------------------------------------------------------
    */

    /**
     * Get completion time in human readable format
     */
    public function getFormattedCompletionTimeAttribute(): ?string
    {
        if (!$this->completion_time) {
            return null;
        }

        $minutes = floor($this->completion_time / 60);
        $seconds = $this->completion_time % 60;

        return sprintf('%02d:%02d', $minutes, $seconds);
    }

    /**
     * Get performance rating based on completion time and accuracy
     */
    public function getPerformanceRatingAttribute(): string
    {
        if (!$this->completion_time || !$this->score) {
            return 'N/A';
        }

        if ($this->completion_time <= 300 && $this->score >= 800) { // 5 min, high score
            return 'Excellent';
        } elseif ($this->completion_time <= 600 && $this->score >= 600) { // 10 min, decent score
            return 'Good';
        } elseif ($this->completion_time <= 900) { // 15 min
            return 'Average';
        } else {
            return 'Poor';
        }
    }

    /**
     * Get performance emoji
     */
    public function getPerformanceEmojiAttribute(): string
    {
        return match($this->performance_rating) {
            'Excellent' => '🏆',
            'Good' => '⭐',
            'Average' => '👍',
            'Poor' => '💪',
            default => '❓'
        };
    }

    /**
     * Get group statistics
     */
    public function getStatsAttribute(): array
    {
        $matchesPlayed = $this->matches()->where('status', 'completed')->count();
        $matchesWon = $this->wonMatches()->count();

        return [
            'matches_played' => $matchesPlayed,
            'matches_won' => $matchesWon,
            'matches_lost' => $matchesPlayed - $matchesWon,
            'win_rate' => $matchesPlayed > 0
                ? round(($matchesWon / $matchesPlayed) * 100, 2)
                : 0,
            'average_completion_time' => $this->completion_time,
            'formatted_completion_time' => $this->formatted_completion_time,
            'best_performance' => $this->performance_rating,
            'performance_emoji' => $this->performance_emoji,
            'total_score' => $this->score,
            'current_rank' => $this->rank,
            'participants_count' => $this->participants()->count(),
            'is_ready' => $this->isReady(),
        ];
    }

    /**
     * Check if group has completed their session
     */
    public function getHasCompletedAttribute(): bool
    {
        return !is_null($this->completed_at) && !is_null($this->completion_time);
    }

    /**
     * Get group's tournament progress percentage
     */
    public function getTournamentProgressAttribute(): int
    {
        if (!$this->tournament) {
            return 0;
        }

        $maxRounds = 3; // Qualification, Semifinals, Finals
        $currentRound = $this->tournament->current_round;

        if ($this->status === 'eliminated') {
            return 100; // Eliminated = journey ended
        }

        if ($this->status === 'champion') {
            return 100; // Won = 100%
        }

        return min(100, round(($currentRound / $maxRounds) * 100));
    }

    /*
    |--------------------------------------------------------------------------
    | Query Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Check if group is ready to play
     */
    public function isReady(): bool
    {
        $participantsCount = $this->participants()->count();
        $rolesCount = $this->participants()
            ->whereIn('role', ['defuser', 'expert'])
            ->count();

        return $participantsCount === 2 && $rolesCount === 2;
    }

    /**
     * Get group's current opponent in active match
     */
    public function getCurrentOpponent(): ?self
    {
        $activeMatch = $this->matches()
            ->where('status', 'active')
            ->first();

        if (!$activeMatch) {
            return null;
        }

        return $activeMatch->group1_id === $this->id
            ? $activeMatch->group2
            : $activeMatch->group1;
    }

    /**
     * Get next opponent for upcoming match
     */
    public function getNextOpponent(): ?self
    {
        $upcomingMatch = $this->matches()
            ->where('status', 'pending')
            ->orderBy('created_at')
            ->first();

        if (!$upcomingMatch) {
            return null;
        }

        return $upcomingMatch->group1_id === $this->id
            ? $upcomingMatch->group2
            : $upcomingMatch->group1;
    }

    /**
     * Get group leader (creator/first participant)
     */
    public function getLeader(): ?TournamentParticipant
    {
        return $this->participants()->orderBy('created_at')->first();
    }

    /**
     * Check if user is member of this group
     */
    public function hasMember(int $userId): bool
    {
        return $this->participants()
            ->where('user_id', $userId)
            ->exists();
    }

    /**
     * Check if group can accept new members
     */
    public function canAcceptMembers(): bool
    {
        return $this->participants()->count() < 2 &&
               $this->status === 'waiting';
    }

    /**
     * Get missing roles in group
     */
    public function getMissingRoles(): array
    {
        $requiredRoles = ['defuser', 'expert'];
        $existingRoles = $this->participants()
            ->pluck('role')
            ->toArray();

        return array_diff($requiredRoles, $existingRoles);
    }

    /*
    |--------------------------------------------------------------------------
    | Query Scopes
    |--------------------------------------------------------------------------
    */

    /**
     * Scope for active groups (not eliminated)
     */
    public function scopeActive($query)
    {
        return $query->whereNotIn('status', ['eliminated']);
    }

    /**
     * Scope for eliminated groups
     */
    public function scopeEliminated($query)
    {
        return $query->where('status', 'eliminated');
    }

    /**
     * Scope for completed groups
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope for groups ready to play
     */
    public function scopeReady($query)
    {
        return $query->where('status', 'ready');
    }

    /**
     * Scope for groups waiting for members
     */
    public function scopeWaiting($query)
    {
        return $query->where('status', 'waiting');
    }

    /**
     * Scope for groups currently playing
     */
    public function scopePlaying($query)
    {
        return $query->where('status', 'playing');
    }

    /**
     * Scope for champion groups
     */
    public function scopeChampion($query)
    {
        return $query->where('status', 'champion');
    }

    /**
     * Scope for groups with incomplete teams
     */
    public function scopeIncomplete($query)
    {
        return $query->whereHas('participants', function ($q) {
            $q->havingRaw('COUNT(*) < 2');
        }, '<', 2);
    }

    /**
     * Scope for groups that have finished their sessions
     */
    public function scopeFinished($query)
    {
        return $query->whereNotNull('completed_at')
                     ->whereNotNull('completion_time');
    }

    /**
     * Scope for groups ordered by performance
     */
    public function scopeOrderedByPerformance($query)
    {
        return $query->orderBy('rank')
                     ->orderBy('completion_time')
                     ->orderByDesc('score');
    }

    /**
     * Scope for groups in specific tournament
     */
    public function scopeForTournament($query, int $tournamentId)
    {
        return $query->where('tournament_id', $tournamentId);
    }

    /**
     * Scope for top performing groups
     */
    public function scopeTopPerformers($query, int $limit = 10)
    {
        return $query->whereNotNull('completion_time')
                     ->whereNotNull('score')
                     ->orderBy('completion_time')
                     ->orderByDesc('score')
                     ->limit($limit);
    }
}
