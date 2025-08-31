<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class GameSession extends Model {
    protected $fillable=['stage_id','team_code','status','started_at','ends_at'];
    protected $casts=['started_at'=>'datetime','ends_at'=>'datetime'];
    public static function generateTeamCode(): string { return strtoupper(Str::random(6)); }
    public function stage(){ return $this->belongsTo(Stage::class); }
    public function participants(){ return $this->hasMany(SessionParticipant::class); }
    public function attempts(){ return $this->hasMany(Attempt::class); }
}
