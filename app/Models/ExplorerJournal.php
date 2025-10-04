<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExplorerJournal extends Model
{
    protected $table = 'explorer_journal';

    protected $fillable = [
        'dm_conversation_id',
        'user_id',
        'kind',
        'ref_id',
        'title',
        'status',
        'score',
        'time_taken',
        'accuracy',
        'hints_used',
        'meta',
        'metadata'
    ];

    protected $casts = [
        'meta' => 'array',
        'metadata' => 'array',
        'score' => 'integer',
        'time_taken' => 'integer',
        'accuracy' => 'float',
        'hints_used' => 'integer'
    ];

    // ✅ Definisikan konstanta untuk kind values
    const KIND_SESSION = 'session';
    const KIND_TOURNAMENT = 'tournament';
    const KIND_ACHIEVEMENT = 'achievement';
    const KIND_DM_ROUND = 'dm_round';

    public function dmConversation(): BelongsTo
    {
        return $this->belongsTo(DmConversation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeOfKind($query, string $kind)
    {
        return $query->where('kind', $kind);
    }

    public function scopeDmRounds($query)
    {
        return $query->where('kind', self::KIND_DM_ROUND);
    }

    public function scopeSessions($query)
    {
        return $query->where('kind', self::KIND_SESSION);
    }

    public function scopeTournaments($query)
    {
        return $query->where('kind', self::KIND_TOURNAMENT);
    }

    public function scopeAchievements($query)
    {
        return $query->where('kind', self::KIND_ACHIEVEMENT);
    }
}
