<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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

    protected $casts = [
        'match_details' => 'array',
        'group1_completion_time' => 'integer',
        'group2_completion_time' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Match belongs to tournament
     */
    public function tournament()
    {
        return $this->belongsTo(Tournament::class);
    }

    /**
     * Match has group1
     */
    public function group1()
    {
        return $this->belongsTo(TournamentGroup::class, 'group1_id');
    }

    /**
     * Match has group2
     */
    public function group2()
    {
        return $this->belongsTo(TournamentGroup::class, 'group2_id');
    }

    /**
     * Match has winner group
     */
    public function winnerGroup()
    {
        return $this->belongsTo(TournamentGroup::class, 'winner_group_id');
    }

    /**
     * Get match winner based on completion times
     */
    public function getWinnerAttribute()
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
    public function getLoserAttribute()
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
    public function getDurationAttribute()
    {
        if (!$this->started_at || !$this->completed_at) {
            return null;
        }

        return $this->started_at->diffInSeconds($this->completed_at);
    }

    /**
     * Get time difference between groups
     */
    public function getTimeDifferenceAttribute()
    {
        if (!$this->group1_completion_time || !$this->group2_completion_time) {
            return null;
        }

        return abs($this->group1_completion_time - $this->group2_completion_time);
    }

    /**
     * Scope for matches in specific round
     */
    public function scopeInRound($query, $round)
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
}
