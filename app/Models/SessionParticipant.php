<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SessionParticipant extends Model
{
    protected $fillable = ['game_session_id', 'role', 'nickname'];

    public function session()
    {
        return $this->belongsTo(GameSession::class, 'game_session_id');
    }
}
