<?php
// app/Models/GameSession.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GameSession extends Model
{
    protected $table = 'game_sessions';

    protected $fillable = [
        'team_code',
        'status',
        'stage_id',        // Add this
        'current_stage',
        'seed',
        'started_at',
        'completed_at',
        'ends_at',
        'stages_completed',
        'total_score',
        'collaboration_score'
    ];

    protected $casts = [
        'stages_completed' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'ends_at' => 'datetime'
    ];

    public function attempts(): HasMany
    {
        return $this->hasMany(GameAttempt::class, 'game_session_id');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(GameParticipant::class, 'game_session_id');
    }

    public function tournament()
    {
        return $this->belongsTo(Tournament::class);
    }

    /**
    * Session belongs to tournament group
    */
    public function tournamentGroup()
    {
        return $this->belongsTo(TournamentGroup::class);
    }

    /**
    * Check if this is a tournament session
    */
    public function isTournamentSession()
    {
        return $this->is_tournament_session && $this->tournament_id !== null;
    }

    /**
    * Get tournament round name
    */
    public function getTournamentRoundNameAttribute()
    {
        if (!$this->isTournamentSession()) {
            return null;
        }

        switch ($this->tournament_round) {
            case 1: return 'Qualification Round';
            case 2: return 'Semifinals';
            case 3: return 'Finals';
            default: return "Round {$this->tournament_round}";
        }
    }
    
}
