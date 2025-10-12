<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Log;

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

    /**
     * Laravel 12: Updated casts() method
     */
    protected function casts(): array
    {
        return [
            'joined_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Boot method untuk handle events (Laravel 12 style)
     */
    protected static function booted(): void
    {
        // Event sebelum participant dihapus
        static::deleting(function (TournamentParticipant $participant) {
            Log::info('Tournament participant deleted', [
                'participant_id' => $participant->id,
                'user_id' => $participant->user_id,
                'user_name' => $participant->user?->name,
                'nickname' => $participant->nickname,
                'group_id' => $participant->tournament_group_id,
                'group_name' => $participant->group?->name,
                'tournament_id' => $participant->group?->tournament_id,
                'tournament_name' => $participant->group?->tournament?->name,
                'role' => $participant->role,
                'joined_at' => $participant->joined_at?->toDateTimeString(),
                'participation_duration' => $participant->joined_at?->diffForHumans(now(), true),
                'deleted_at' => now()->toDateTimeString(),
                'deleted_by' => 'cascade_or_manual',
            ]);
        });

        // Event ketika participant bergabung
        static::created(function (TournamentParticipant $participant) {
            Log::info('Tournament participant joined', [
                'participant_id' => $participant->id,
                'user_id' => $participant->user_id,
                'user_name' => $participant->user?->name,
                'nickname' => $participant->nickname,
                'group_id' => $participant->tournament_group_id,
                'group_name' => $participant->group?->name,
                'tournament_id' => $participant->group?->tournament_id,
                'tournament_name' => $participant->group?->tournament?->name,
                'role' => $participant->role,
                'joined_at' => $participant->joined_at?->toDateTimeString(),
            ]);

            // Check if group is now full (2 participants with correct roles)
            $group = $participant->group;
            if ($group && $group->isReady()) {
                Log::info('Tournament group is now ready', [
                    'group_id' => $group->id,
                    'group_name' => $group->name,
                    'tournament_id' => $group->tournament_id,
                    'participants_count' => $group->participants()->count(),
                ]);
            }
        });

        // Event ketika role berubah
        static::updated(function (TournamentParticipant $participant) {
            if ($participant->isDirty('role')) {
                Log::info('Tournament participant role changed', [
                    'participant_id' => $participant->id,
                    'user_id' => $participant->user_id,
                    'user_name' => $participant->user?->name,
                    'old_role' => $participant->getOriginal('role'),
                    'new_role' => $participant->role,
                    'group_id' => $participant->tournament_group_id,
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
     * Participant belongs to user
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Participant belongs to tournament group
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(TournamentGroup::class, 'tournament_group_id');
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors & Attributes
    |--------------------------------------------------------------------------
    */

    /**
     * Get role badge color
     */
    public function getRoleBadgeColorAttribute(): string
    {
        return match($this->role) {
            'defuser' => 'red',
            'expert' => 'blue',
            'host' => 'green',
            'spectator' => 'purple',
            default => 'gray',
        };
    }

    /**
     * Get role emoji
     */
    public function getRoleEmojiAttribute(): string
    {
        return match($this->role) {
            'defuser' => '💣',
            'expert' => '🧠',
            'host' => '👑',
            'spectator' => '👁️',
            default => '👤'
        };
    }

    /**
     * Get role display name
     */
    public function getRoleDisplayNameAttribute(): string
    {
        return match($this->role) {
            'defuser' => 'Defuser (Bomb Specialist)',
            'expert' => 'Expert (Code Master)',
            'host' => 'Host (Game Master)',
            'spectator' => 'Spectator (Observer)',
            default => ucfirst($this->role)
        };
    }

    /**
     * Get display name (nickname atau user name)
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->nickname ?? $this->user?->name ?? 'Anonymous';
    }

    /**
     * Get participation duration
     */
    public function getParticipationDurationAttribute(): ?string
    {
        if (!$this->joined_at) {
            return null;
        }

        return $this->joined_at->diffForHumans(now(), true);
    }

    /**
     * Check if participant is team leader (first to join)
     */
    public function getIsLeaderAttribute(): bool
    {
        if (!$this->group) {
            return false;
        }

        $firstParticipant = $this->group->participants()
            ->orderBy('created_at')
            ->first();

        return $firstParticipant?->id === $this->id;
    }

    /**
     * Get teammate
     */
    public function getTeammateAttribute(): ?self
    {
        if (!$this->group) {
            return null;
        }

        return $this->group->participants()
            ->where('id', '!=', $this->id)
            ->first();
    }

    /**
     * Get participant statistics
     */
    public function getStatsAttribute(): array
    {
        return [
            'user_id' => $this->user_id,
            'display_name' => $this->display_name,
            'nickname' => $this->nickname,
            'role' => $this->role,
            'role_display' => $this->role_display_name,
            'role_emoji' => $this->role_emoji,
            'role_badge_color' => $this->role_badge_color,
            'is_leader' => $this->is_leader,
            'has_teammate' => !is_null($this->teammate),
            'teammate_name' => $this->teammate?->display_name,
            'joined_at' => $this->joined_at?->toDateTimeString(),
            'participation_duration' => $this->participation_duration,
            'group_id' => $this->tournament_group_id,
            'group_name' => $this->group?->name,
            'tournament_id' => $this->group?->tournament_id,
            'tournament_name' => $this->group?->tournament?->name,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Query Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Check if participant can leave
     */
    public function canLeave(): bool
    {
        if (!$this->group) {
            return false;
        }

        // Tidak bisa leave kalau match sedang berlangsung
        if (in_array($this->group->status, ['playing', 'completed'])) {
            return false;
        }

        return true;
    }

    /**
     * Check if participant is in active match
     */
    public function isInActiveMatch(): bool
    {
        return $this->group?->status === 'playing';
    }

    /**
     * Get opponent group participants
     */
    public function getOpponentParticipants(): ?array
    {
        $opponent = $this->group?->getCurrentOpponent();

        if (!$opponent) {
            return null;
        }

        return $opponent->participants()->get()->toArray();
    }

    /*
    |--------------------------------------------------------------------------
    | Query Scopes
    |--------------------------------------------------------------------------
    */

    /**
     * Scope for participants with specific role
     */
    public function scopeWithRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    /**
     * Scope for defusers
     */
    public function scopeDefusers($query)
    {
        return $query->where('role', 'defuser');
    }

    /**
     * Scope for experts
     */
    public function scopeExperts($query)
    {
        return $query->where('role', 'expert');
    }

    /**
     * Scope for hosts
     */
    public function scopeHosts($query)
    {
        return $query->where('role', 'host');
    }

    /**
     * Scope for specific user
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope for specific group
     */
    public function scopeForGroup($query, int $groupId)
    {
        return $query->where('tournament_group_id', $groupId);
    }

    /**
     * Scope for specific tournament
     */
    public function scopeForTournament($query, int $tournamentId)
    {
        return $query->whereHas('group', function ($q) use ($tournamentId) {
            $q->where('tournament_id', $tournamentId);
        });
    }

    /**
     * Scope for active participants (not in eliminated groups)
     */
    public function scopeActive($query)
    {
        return $query->whereHas('group', function ($q) {
            $q->whereNotIn('status', ['eliminated']);
        });
    }

    /**
     * Scope for participants in playing matches
     */
    public function scopePlaying($query)
    {
        return $query->whereHas('group', function ($q) {
            $q->where('status', 'playing');
        });
    }

    /**
     * Scope for participants who joined recently
     */
    public function scopeRecentlyJoined($query, int $hours = 24)
    {
        return $query->where('joined_at', '>=', now()->subHours($hours));
    }

    /**
     * Scope ordered by join time
     */
    public function scopeOrderedByJoinTime($query, string $direction = 'asc')
    {
        return $query->orderBy('joined_at', $direction);
    }

    /**
     * Scope for team leaders (first participants)
     */
    public function scopeLeaders($query)
    {
        return $query->whereIn('id', function ($subQuery) {
            $subQuery->select(\DB::raw('MIN(id)'))
                ->from('tournament_participants')
                ->groupBy('tournament_group_id');
        });
    }

    /**
     * Scope for participants with teammates
     */
    public function scopeWithTeammate($query)
    {
        return $query->whereHas('group', function ($q) {
            $q->whereHas('participants', function ($pq) {
                $pq->havingRaw('COUNT(*) >= 2');
            }, '>=', 2);
        });
    }

    /**
     * Scope for solo participants (no teammate yet)
     */
    public function scopeSolo($query)
    {
        return $query->whereHas('group', function ($q) {
            $q->whereHas('participants', function ($pq) {
                $pq->havingRaw('COUNT(*) = 1');
            }, '=', 1);
        });
    }

    /**
     * Scope for participants in champion groups
     */
    public function scopeChampions($query)
    {
        return $query->whereHas('group', function ($q) {
            $q->where('status', 'champion');
        });
    }

    /**
     * Scope for participants in eliminated groups
     */
    public function scopeEliminated($query)
    {
        return $query->whereHas('group', function ($q) {
            $q->where('status', 'eliminated');
        });
    }
}
