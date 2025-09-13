<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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

    protected $casts = [
        'completion_time' => 'integer',
        'score' => 'integer',
        'rank' => 'integer',
        'completed_at' => 'datetime',
    ];

    /**
     * Group belongs to tournament
     */
    public function tournament()
    {
        return $this->belongsTo(Tournament::class);
    }

    /**
     * Group has many participants
     */
    public function participants()
    {
        return $this->hasMany(TournamentParticipant::class);
    }

    /**
     * Group belongs to session
     */
    public function session()
    {
        return $this->belongsTo(GameSession::class, 'session_id');
    }

    /**
     * Group can be group1 in matches
     */
    public function matchesAsGroup1()
    {
        return $this->hasMany(TournamentMatch::class, 'group1_id');
    }

    /**
     * Group can be group2 in matches
     */
    public function matchesAsGroup2()
    {
        return $this->hasMany(TournamentMatch::class, 'group2_id');
    }

    /**
     * Group can be winner in matches
     */
    public function wonMatches()
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

    /**
     * Get completion time in human readable format
     */
    public function getFormattedCompletionTimeAttribute()
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
    public function getPerformanceRatingAttribute()
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
     * Check if group is ready to play
     */
    public function isReady()
    {
        return $this->participants()->count() == 2 &&
               $this->participants()->whereIn('role', ['defuser', 'expert'])->count() == 2;
    }

    /**
     * Get group's current opponent in active match
     */
    public function getCurrentOpponent()
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
     * Get group statistics
     */
    public function getStatsAttribute()
    {
        return [
            'matches_played' => $this->matches()->where('status', 'completed')->count(),
            'matches_won' => $this->wonMatches()->count(),
            'win_rate' => $this->matches()->where('status', 'completed')->count() > 0
                ? ($this->wonMatches()->count() / $this->matches()->where('status', 'completed')->count()) * 100
                : 0,
            'average_completion_time' => $this->completion_time,
            'best_performance' => $this->performance_rating,
        ];
    }

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
}
