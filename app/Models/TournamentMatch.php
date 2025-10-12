<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Log;

class TournamentMatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'tournament_id',
        'round',
        'match_name',
        'group1_id',
        'group2_id',
        'winner_group_id',
        'status',
        'group1_completion_time',
        'group2_completion_time',
        'match_details',
        'started_at',
        'completed_at',
    ];

    /**
     * Laravel 12: Updated casts() method
     */
    protected function casts(): array
    {
        return [
            'match_details' => 'array',
            'group1_completion_time' => 'integer',
            'group2_completion_time' => 'integer',
            'started_at' => 'datetime',
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
        // Event sebelum match dihapus
        static::deleting(function (TournamentMatch $match) {
            Log::info('Tournament match deleted', [
                'match_id' => $match->id,
                'match_name' => $match->match_name,
                'tournament_id' => $match->tournament_id,
                'tournament_name' => $match->tournament?->name,
                'round' => $match->round,
                'status' => $match->status,
                'group1' => $match->group1?->name,
                'group2' => $match->group2?->name,
                'winner' => $match->winnerGroup?->name,
                'started_at' => $match->started_at?->toDateTimeString(),
                'completed_at' => $match->completed_at?->toDateTimeString(),
                'deleted_at' => now()->toDateTimeString(),
            ]);
        });

        // Event ketika match dibuat
        static::created(function (TournamentMatch $match) {
            Log::info('Tournament match created', [
                'match_id' => $match->id,
                'match_name' => $match->match_name,
                'tournament_id' => $match->tournament_id,
                'round' => $match->round,
                'group1_id' => $match->group1_id,
                'group2_id' => $match->group2_id,
                'created_at' => now()->toDateTimeString(),
            ]);
        });

        // Event ketika match status berubah
        static::updated(function (TournamentMatch $match) {
            if ($match->isDirty('status')) {
                Log::info('Tournament match status changed', [
                    'match_id' => $match->id,
                    'match_name' => $match->match_name,
                    'tournament_id' => $match->tournament_id,
                    'old_status' => $match->getOriginal('status'),
                    'new_status' => $match->status,
                    'updated_at' => now()->toDateTimeString(),
                ]);
            }

            // Log ketika match selesai
            if ($match->isDirty('completed_at') && $match->completed_at) {
                Log::info('Tournament match completed', [
                    'match_id' => $match->id,
                    'match_name' => $match->match_name,
                    'tournament_id' => $match->tournament_id,
                    'round' => $match->round,
                    'winner' => $match->winnerGroup?->name,
                    'group1_time' => $match->group1_completion_time,
                    'group2_time' => $match->group2_completion_time,
                    'time_difference' => $match->time_difference,
                    'duration' => $match->duration,
                    'completed_at' => $match->completed_at->toDateTimeString(),
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
     * Match belongs to tournament
     */
    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    /**
     * Match has group1
     */
    public function group1(): BelongsTo
    {
        return $this->belongsTo(TournamentGroup::class, 'group1_id');
    }

    /**
     * Match has group2
     */
    public function group2(): BelongsTo
    {
        return $this->belongsTo(TournamentGroup::class, 'group2_id');
    }

    /**
     * Match has winner group
     */
    public function winnerGroup(): BelongsTo
    {
        return $this->belongsTo(TournamentGroup::class, 'winner_group_id');
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors & Attributes
    |--------------------------------------------------------------------------
    */

    /**
     * Get match winner based on completion times
     */
    public function getWinnerAttribute(): ?TournamentGroup
    {
        if ($this->status !== 'completed') {
            return null;
        }

        if (!$this->group1_completion_time || !$this->group2_completion_time) {
            return null;
        }

        // Winner is the group with faster completion time
        return $this->group1_completion_time <= $this->group2_completion_time
            ? $this->group1
            : $this->group2;
    }

    /**
     * Get match loser
     */
    public function getLoserAttribute(): ?TournamentGroup
    {
        if ($this->status !== 'completed') {
            return null;
        }

        $winner = $this->getWinnerAttribute();
        if (!$winner) {
            return null;
        }

        return $winner->id === $this->group1_id ? $this->group2 : $this->group1;
    }

    /**
     * Get match duration in seconds
     */
    public function getDurationAttribute(): ?int
    {
        if (!$this->started_at || !$this->completed_at) {
            return null;
        }

        return $this->started_at->diffInSeconds($this->completed_at);
    }

    /**
     * Get formatted match duration
     */
    public function getFormattedDurationAttribute(): ?string
    {
        $duration = $this->getDurationAttribute();

        if (!$duration) {
            return null;
        }

        $minutes = floor($duration / 60);
        $seconds = $duration % 60;

        return sprintf('%02d:%02d', $minutes, $seconds);
    }

    /**
     * Get time difference between groups
     */
    public function getTimeDifferenceAttribute(): ?int
    {
        if (!$this->group1_completion_time || !$this->group2_completion_time) {
            return null;
        }

        return abs($this->group1_completion_time - $this->group2_completion_time);
    }

    /**
     * Get formatted time difference
     */
    public function getFormattedTimeDifferenceAttribute(): ?string
    {
        $diff = $this->getTimeDifferenceAttribute();

        if (!$diff) {
            return null;
        }

        $minutes = floor($diff / 60);
        $seconds = $diff % 60;

        return sprintf('%02d:%02d', $minutes, $seconds);
    }

    /**
     * Get match result summary
     */
    public function getResultSummaryAttribute(): array
    {
        if ($this->status !== 'completed') {
            return [
                'status' => 'in_progress',
                'message' => 'Match belum selesai',
            ];
        }

        $winner = $this->getWinnerAttribute();
        $loser = $this->getLoserAttribute();

        if (!$winner || !$loser) {
            return [
                'status' => 'incomplete',
                'message' => 'Data tidak lengkap',
            ];
        }

        $winnerTime = $winner->id === $this->group1_id
            ? $this->group1_completion_time
            : $this->group2_completion_time;

        $loserTime = $loser->id === $this->group1_id
            ? $this->group1_completion_time
            : $this->group2_completion_time;

        return [
            'status' => 'completed',
            'winner' => [
                'id' => $winner->id,
                'name' => $winner->name,
                'time' => $winnerTime,
                'formatted_time' => sprintf('%02d:%02d', floor($winnerTime / 60), $winnerTime % 60),
            ],
            'loser' => [
                'id' => $loser->id,
                'name' => $loser->name,
                'time' => $loserTime,
                'formatted_time' => sprintf('%02d:%02d', floor($loserTime / 60), $loserTime % 60),
            ],
            'time_difference' => $this->time_difference,
            'formatted_time_difference' => $this->formatted_time_difference,
            'margin' => $this->getMarginCategory(),
        ];
    }

    /**
     * Get margin category (close/comfortable/dominant)
     */
    public function getMarginCategory(): string
    {
        $diff = $this->time_difference;

        if (!$diff) {
            return 'unknown';
        }

        if ($diff <= 30) { // 30 detik atau kurang
            return 'very_close'; // 🔥
        } elseif ($diff <= 60) { // 1 menit
            return 'close'; // ⚔️
        } elseif ($diff <= 120) { // 2 menit
            return 'comfortable'; // 💪
        } else {
            return 'dominant'; // 👑
        }
    }

    /**
     * Get margin emoji
     */
    public function getMarginEmojiAttribute(): string
    {
        return match($this->getMarginCategory()) {
            'very_close' => '🔥',
            'close' => '⚔️',
            'comfortable' => '💪',
            'dominant' => '👑',
            default => '❓'
        };
    }

    /**
     * Check if match is close/exciting
     */
    public function getIsCloseMatchAttribute(): bool
    {
        return in_array($this->getMarginCategory(), ['very_close', 'close']);
    }

    /**
     * Get match statistics
     */
    public function getStatsAttribute(): array
    {
        return [
            'round' => $this->round,
            'round_name' => $this->getRoundName(),
            'status' => $this->status,
            'duration' => $this->duration,
            'formatted_duration' => $this->formatted_duration,
            'group1_time' => $this->group1_completion_time,
            'group2_time' => $this->group2_completion_time,
            'time_difference' => $this->time_difference,
            'formatted_time_difference' => $this->formatted_time_difference,
            'winner_id' => $this->winner?->id,
            'winner_name' => $this->winner?->name,
            'loser_id' => $this->loser?->id,
            'loser_name' => $this->loser?->name,
            'margin_category' => $this->getMarginCategory(),
            'margin_emoji' => $this->margin_emoji,
            'is_close_match' => $this->is_close_match,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Query Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Get round name
     */
    public function getRoundName(): string
    {
        return match($this->round) {
            1 => 'Qualification Round',
            2 => 'Semifinals',
            3 => 'Finals',
            default => "Round {$this->round}"
        };
    }

    /**
     * Check if match is ready to start
     */
    public function isReadyToStart(): bool
    {
        return $this->status === 'pending' &&
               $this->group1_id &&
               $this->group2_id &&
               $this->group1()->exists() &&
               $this->group2()->exists();
    }

    /**
     * Check if both groups completed
     */
    public function areBothGroupsCompleted(): bool
    {
        return !is_null($this->group1_completion_time) &&
               !is_null($this->group2_completion_time);
    }

    /**
     * Determine winner and update
     */
    public function determineWinner(): ?TournamentGroup
    {
        if (!$this->areBothGroupsCompleted()) {
            return null;
        }

        $winner = $this->getWinnerAttribute();

        if ($winner && !$this->winner_group_id) {
            $this->update([
                'winner_group_id' => $winner->id,
                'status' => 'completed',
                'completed_at' => now(),
            ]);
        }

        return $winner;
    }

    /*
    |--------------------------------------------------------------------------
    | Query Scopes
    |--------------------------------------------------------------------------
    */

    /**
     * Scope for matches in specific round
     */
    public function scopeInRound($query, int $round)
    {
        return $query->where('round', $round);
    }

    /**
     * Scope for active matches
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for completed matches
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope for pending matches
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope for matches of specific tournament
     */
    public function scopeForTournament($query, int $tournamentId)
    {
        return $query->where('tournament_id', $tournamentId);
    }

    /**
     * Scope for matches involving specific group
     */
    public function scopeInvolvingGroup($query, int $groupId)
    {
        return $query->where(function ($q) use ($groupId) {
            $q->where('group1_id', $groupId)
              ->orWhere('group2_id', $groupId);
        });
    }

    /**
     * Scope for close matches (exciting)
     */
    public function scopeCloseMatches($query, int $maxDifference = 60)
    {
        return $query->completed()
            ->whereNotNull('group1_completion_time')
            ->whereNotNull('group2_completion_time')
            ->whereRaw('ABS(group1_completion_time - group2_completion_time) <= ?', [$maxDifference]);
    }

    /**
     * Scope for matches won by specific group
     */
    public function scopeWonBy($query, int $groupId)
    {
        return $query->where('winner_group_id', $groupId);
    }

    /**
     * Scope ordered by recency
     */
    public function scopeRecent($query)
    {
        return $query->orderByDesc('created_at');
    }

    /**
     * Scope ordered by completion
     */
    public function scopeOrderedByCompletion($query)
    {
        return $query->orderByDesc('completed_at');
    }
}
