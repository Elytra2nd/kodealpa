<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Attempt extends Model {
    protected $fillable=['game_session_id','puzzle_key','input','is_correct'];
    public function session(){ return $this->belongsTo(GameSession::class); }
}
