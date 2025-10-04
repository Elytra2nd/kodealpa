<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExplorerJournal extends Model
{
    // ⚠️ PENTING: Nama tabel singular, bukan plural
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

    public function dmConversation(): BelongsTo
    {
        return $this->belongsTo(DmConversation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope untuk filter berdasarkan kind
     */
    public function scopeOfKind($query, string $kind)
    {
        return $query->where('kind', $kind);
    }

    /**
     * Scope untuk DM rounds
     */
    public function scopeDmRounds($query)
    {
        return $query->where('kind', 'dm_round');
    }
}
