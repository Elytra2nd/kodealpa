<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DmConversation extends Model
{
    protected $fillable = [
        'game_session_id',
        'status',
        'total_tokens',
        'estimated_cost'
    ];

    protected $casts = [
        'estimated_cost' => 'decimal:6'
    ];

    public function gameSession(): BelongsTo
    {
        return $this->belongsTo(GameSession::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(DmMessage::class)->orderBy('created_at');
    }

    public function journals(): HasMany
    {
        // ✅ FIXED: Gunakan nama tabel singular
        return $this->hasMany(ExplorerJournal::class);
    }

    /**
     * Get recent messages untuk context
     */
    public function getRecentMessages(int $limit = 10): array
    {
        return $this->messages()
            ->latest()
            ->limit($limit)
            ->get()
            ->reverse()
            ->map(fn($msg) => [
                'role' => $msg->role,
                'content' => $msg->content
            ])
            ->toArray();
    }
}
