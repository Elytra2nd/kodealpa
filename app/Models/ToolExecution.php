<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ToolExecution extends Model
{
    protected $fillable = [
        'dm_message_id',
        'game_session_id',
        'executed_by',
        'tool_name',
        'arguments',
        'result',
        'status',
        'error_message'
    ];

    protected $casts = [
        'arguments' => 'array',
        'result' => 'array'
    ];

    public function message(): BelongsTo
    {
        return $this->belongsTo(DmMessage::class, 'dm_message_id');
    }

    public function gameSession(): BelongsTo
    {
        return $this->belongsTo(GameSession::class);
    }

    public function executor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'executed_by');
    }
}
