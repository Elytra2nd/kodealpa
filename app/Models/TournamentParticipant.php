<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TournamentParticipant extends Model
{
    use HasFactory;

    protected $fillable = [
        'tournament_group_id',
        'user_id',
        'role',
        'nickname',
        'joined_at',
    ];

    protected $casts = [
        'joined_at' => 'datetime',
    ];

    /**
     * Participant belongs to user
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Participant belongs to tournament group
     */
    public function group()
    {
        return $this->belongsTo(TournamentGroup::class, 'tournament_group_id');
    }

    /**
     * Get role badge color
     */
    public function getRoleBadgeColorAttribute()
    {
        return match($this->role) {
            'defuser' => 'red',
            'expert' => 'blue',
            'host' => 'green',
            default => 'gray',
        };
    }
}
