<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DmMessage extends Model
{
    protected $fillable = [
        'dm_conversation_id',
        'user_id',
        'role',
        'content',
        'tool_calls',
        'tokens_used'
    ];

    protected $casts = [
        'tool_calls' => 'array'
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(DmConversation::class, 'dm_conversation_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function toolExecutions(): HasMany
    {
        return $this->hasMany(ToolExecution::class);
    }
}
