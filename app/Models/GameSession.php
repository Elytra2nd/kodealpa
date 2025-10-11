<?php
// app/Models/GameSession.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class GameSession extends Model
{
    use HasFactory;

    protected $table = 'game_sessions';

    protected $fillable = [
        'team_code',
        'status',
        'stage_id',
        'current_stage',
        'seed',
        'started_at',
        'completed_at',
        'ends_at',
        'stages_completed',
        'total_score',
        'collaboration_score',
        'failed_stage',
        'hint_usage',              // ✅ Hint system
        'max_hints_per_stage',     // ✅ Hint system
        'total_hints_used',        // ✅ Hint system
        'is_tournament_session',   // ✅ Tournament flag
        'tournament_id',           // ✅ Tournament reference
        'tournament_group_id',     // ✅ Tournament group reference
        'tournament_round',        // ✅ Tournament round
    ];

    protected $casts = [
        'stages_completed' => 'array',
        'hint_usage' => 'array',           // ✅ Cast to array for JSON
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'ends_at' => 'datetime',
        'is_tournament_session' => 'boolean',
        'current_stage' => 'integer',
        'total_score' => 'integer',
        'collaboration_score' => 'integer',
        'max_hints_per_stage' => 'integer',
        'total_hints_used' => 'integer',
    ];

    protected $attributes = [
        'hint_usage' => '{}',              // ✅ Default empty object
        'max_hints_per_stage' => 3,       // ✅ Default 3 hints per stage
        'total_hints_used' => 0,          // ✅ Default 0
        'current_stage' => 1,             // ✅ Default stage 1
        'total_score' => 0,
        'is_tournament_session' => false,
    ];

    // ============================================
    // RELATIONSHIPS
    // ============================================

    /**
     * Session has many attempts
     */
    public function attempts(): HasMany
    {
        return $this->hasMany(GameAttempt::class, 'game_session_id');
    }

    /**
     * Session has many participants
     */
    public function participants(): HasMany
    {
        return $this->hasMany(GameParticipant::class, 'game_session_id');
    }

    /**
     * Session belongs to tournament
     */
    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    /**
     * Session belongs to tournament group
     */
    public function tournamentGroup(): BelongsTo
    {
        return $this->belongsTo(TournamentGroup::class);
    }

    /**
     * Session has one DM conversation
     */
    public function dmConversation(): HasOne
    {
        return $this->hasOne(DmConversation::class, 'game_session_id');
    }

    /**
     * Session belongs to stage
     */
    public function stage(): BelongsTo
    {
        return $this->belongsTo(Stage::class);
    }

    // ============================================
    // HINT SYSTEM METHODS
    // ============================================

    /**
     * Get hints used for a specific stage
     */
    public function getHintsUsedForStage(int $stage): int
    {
        $hintUsage = $this->hint_usage ?? [];
        return $hintUsage[$stage] ?? 0;
    }

    /**
     * Get hints remaining for a specific stage
     */
    public function getHintsRemainingForStage(int $stage): int
    {
        $maxHints = $this->max_hints_per_stage ?? 3;
        $usedHints = $this->getHintsUsedForStage($stage);
        return max(0, $maxHints - $usedHints);
    }

    /**
     * Check if hints are available for a stage
     */
    public function hasHintsAvailable(?int $stage = null): bool
    {
        $stage = $stage ?? $this->current_stage ?? 1;
        return $this->getHintsRemainingForStage($stage) > 0;
    }

    /**
     * Increment hint usage for current stage
     */
    public function incrementHintUsage(?int $stage = null): void
    {
        $stage = $stage ?? $this->current_stage ?? 1;
        $hintUsage = $this->hint_usage ?? [];
        $hintUsage[$stage] = ($hintUsage[$stage] ?? 0) + 1;

        $this->hint_usage = $hintUsage;
        $this->total_hints_used = ($this->total_hints_used ?? 0) + 1;
        $this->save();
    }

    /**
     * Reset hints for a new stage
     */
    public function resetHintsForNewStage(): void
    {
        // Hint usage per stage is tracked separately, no need to reset
        // Just ensure current_stage is incremented properly
    }

    /**
     * Get hint usage summary
     */
    public function getHintUsageSummary(): array
    {
        $currentStage = $this->current_stage ?? 1;
        $maxHints = $this->max_hints_per_stage ?? 3;
        $hintUsage = $this->hint_usage ?? [];

        return [
            'currentStage' => $currentStage,
            'hintsUsed' => $hintUsage[$currentStage] ?? 0,
            'hintsRemaining' => $this->getHintsRemainingForStage($currentStage),
            'maxHintsPerStage' => $maxHints,
            'totalHintsUsed' => $this->total_hints_used ?? 0,
            'hintHistory' => collect($hintUsage)->map(function ($used, $stage) {
                return [
                    'stage' => $stage,
                    'hintsUsed' => $used,
                ];
            })->values()->toArray(),
        ];
    }

    // ============================================
    // TOURNAMENT METHODS
    // ============================================

    /**
     * Check if this is a tournament session
     */
    public function isTournamentSession(): bool
    {
        return $this->is_tournament_session && $this->tournament_id !== null;
    }

    /**
     * Get tournament round name
     */
    public function getTournamentRoundNameAttribute(): ?string
    {
        if (!$this->isTournamentSession()) {
            return null;
        }

        return match ($this->tournament_round) {
            1 => 'Qualification Round',
            2 => 'Semifinals',
            3 => 'Finals',
            default => "Round {$this->tournament_round}",
        };
    }

    /**
     * Check if session is in qualification round
     */
    public function isQualificationRound(): bool
    {
        return $this->isTournamentSession() && $this->tournament_round === 1;
    }

    /**
     * Check if session is in semifinals
     */
    public function isSemifinals(): bool
    {
        return $this->isTournamentSession() && $this->tournament_round === 2;
    }

    /**
     * Check if session is in finals
     */
    public function isFinals(): bool
    {
        return $this->isTournamentSession() && $this->tournament_round === 3;
    }

    // ============================================
    // STATUS METHODS
    // ============================================

    /**
     * Check if session is active
     */
    public function isActive(): bool
    {
        return in_array($this->status, ['running', 'in_progress']);
    }

    /**
     * Check if session is completed
     */
    public function isCompleted(): bool
    {
        return in_array($this->status, ['success', 'completed']);
    }

    /**
     * Check if session has failed
     */
    public function hasFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * Check if session is waiting
     */
    public function isWaiting(): bool
    {
        return $this->status === 'waiting';
    }

    /**
     * Check if session is ended
     */
    public function isEnded(): bool
    {
        return $this->status === 'ended';
    }

    // ============================================
    // STAGE METHODS
    // ============================================

    /**
     * Check if stage is completed
     */
    public function isStageCompleted(int $stage): bool
    {
        $completed = $this->stages_completed ?? [];
        return in_array($stage, $completed);
    }

    /**
     * Mark stage as completed
     */
    public function completeStage(int $stage): void
    {
        $completed = $this->stages_completed ?? [];

        if (!in_array($stage, $completed)) {
            $completed[] = $stage;
            $this->stages_completed = $completed;
            $this->save();
        }
    }

    /**
     * Advance to next stage
     */
    public function advanceToNextStage(): void
    {
        $this->current_stage = ($this->current_stage ?? 1) + 1;
        $this->save();
    }

    // ============================================
    // SCORE METHODS
    // ============================================

    /**
     * Add score to total
     */
    public function addScore(int $points): void
    {
        $this->total_score = ($this->total_score ?? 0) + $points;
        $this->save();
    }

    /**
     * Update collaboration score
     */
    public function updateCollaborationScore(int $score): void
    {
        $this->collaboration_score = $score;
        $this->save();
    }

    // ============================================
    // SCOPES
    // ============================================

    /**
     * Scope for active sessions
     */
    public function scopeActive($query)
    {
        return $query->whereIn('status', ['running', 'in_progress']);
    }

    /**
     * Scope for completed sessions
     */
    public function scopeCompleted($query)
    {
        return $query->whereIn('status', ['success', 'completed']);
    }

    /**
     * Scope for tournament sessions
     */
    public function scopeTournament($query)
    {
        return $query->where('is_tournament_session', true);
    }

    /**
     * Scope for regular sessions
     */
    public function scopeRegular($query)
    {
        return $query->where('is_tournament_session', false);
    }

    /**
     * Scope for sessions in specific round
     */
    public function scopeInRound($query, int $round)
    {
        return $query->where('tournament_round', $round);
    }

    // ============================================
    // ACCESSOR & MUTATOR
    // ============================================

    /**
     * Get time remaining in seconds
     */
    public function getTimeRemainingAttribute(): ?int
    {
        if (!$this->ends_at) {
            return null;
        }

        $now = now();
        $endsAt = $this->ends_at;

        if ($endsAt->isPast()) {
            return 0;
        }

        return $now->diffInSeconds($endsAt);
    }

    /**
     * Get formatted duration
     */
    public function getDurationAttribute(): ?string
    {
        if (!$this->started_at || !$this->completed_at) {
            return null;
        }

        $duration = $this->started_at->diffInSeconds($this->completed_at);
        $minutes = floor($duration / 60);
        $seconds = $duration % 60;

        return sprintf('%d:%02d', $minutes, $seconds);
    }

    /**
     * Check if session has expired
     */
    public function hasExpired(): bool
    {
        return $this->ends_at && $this->ends_at->isPast();
    }
}
