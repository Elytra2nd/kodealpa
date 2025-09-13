<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

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

    protected $casts = [
        'tournament_rules' => 'array',
        'starts_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Tournament belongs to creator
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Tournament has many groups
     */
    public function groups()
    {
        return $this->hasMany(TournamentGroup::class);
    }

    /**
     * Tournament has many matches
     * FIXED: Added proper relationship
     */
    public function matches()
    {
        return $this->hasMany(TournamentMatch::class);
    }

    /**
     * Tournament has winner group
     */
    public function winnerGroup()
    {
        return $this->belongsTo(TournamentGroup::class, 'winner_group_id');
    }

    /**
     * Tournament has many sessions through groups
     */
    public function sessions()
    {
        return $this->hasManyThrough(
            GameSession::class,
            TournamentGroup::class,
            'tournament_id',   // Foreign key on tournament_groups table
            'tournament_group_id', // Foreign key on game_sessions table
            'id',              // Local key on tournaments table
            'id'               // Local key on tournament_groups table
        );
    }

    /**
     * Get active participants count
     */
    public function getActiveParticipantsCountAttribute()
    {
        return $this->groups()
            ->whereNotIn('status', ['eliminated'])
            ->withCount('participants')
            ->get()
            ->sum('participants_count');
    }

    /**
     * Check if tournament is full
     */
    public function isFull()
    {
        return $this->groups()->count() >= $this->max_groups;
    }

    /**
     * Get elimination progress
     */
    public function getEliminationProgressAttribute()
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
    public function getBracketStructure()
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
     * Get tournament statistics
     */
    public function getStatsAttribute()
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
        ];
    }

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
     * Check if user can join tournament
     */
    public function canUserJoin($userId)
    {
        if ($this->status !== 'waiting') {
            return false;
        }

        if ($this->groups()->count() >= $this->max_groups) {
            return false;
        }

        // Check if user is already participating
        $existingParticipation = TournamentParticipant::whereHas('group', function ($query) {
            $query->where('tournament_id', $this->id);
        })->where('user_id', $userId)->exists();

        return !$existingParticipation;
    }

    /**
     * Get user's group in this tournament
     */
    public function getUserGroup($userId)
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
    public function isReadyToStart()
    {
        return $this->status === 'waiting' &&
               $this->groups()->count() === $this->max_groups &&
               $this->groups()->where('status', 'ready')->count() === $this->max_groups;
    }
}
