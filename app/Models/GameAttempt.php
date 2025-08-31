<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class GameAttempt extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'game_attempts';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'game_session_id',
        'stage',
        'input',
        'is_correct',
        'puzzle_key',
        'points_earned',
        'time_taken',
        'hints_used',
        'attempt_metadata'
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'is_correct' => 'boolean',
        'points_earned' => 'integer',
        'time_taken' => 'integer', // in seconds
        'hints_used' => 'integer',
        'attempt_metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the session that owns the attempt.
     */
    public function session()
    {
        return $this->belongsTo(GameSession::class, 'game_session_id');
    }

    /**
     * Get the participant who made this attempt.
     */
    public function participant()
    {
        return $this->session->participants()
                   ->where('role', $this->getParticipantRole())
                   ->first();
    }

    /**
     * Scope a query to only include correct attempts.
     */
    public function scopeCorrect($query)
    {
        return $query->where('is_correct', true);
    }

    /**
     * Scope a query to only include incorrect attempts.
     */
    public function scopeIncorrect($query)
    {
        return $query->where('is_correct', false);
    }

    /**
     * Scope a query to only include attempts for a specific stage.
     */
    public function scopeForStage($query, $stage)
    {
        return $query->where('stage', $stage);
    }

    /**
     * Get attempts made in the last N minutes.
     */
    public function scopeRecent($query, $minutes = 30)
    {
        return $query->where('created_at', '>=', now()->subMinutes($minutes));
    }

    /**
     * Calculate accuracy percentage for attempts.
     */
    public static function calculateAccuracy($sessionId, $stage = null)
    {
        $query = static::where('game_session_id', $sessionId);

        if ($stage) {
            $query->where('stage', $stage);
        }

        $totalAttempts = $query->count();
        $correctAttempts = $query->where('is_correct', true)->count();

        return $totalAttempts > 0 ? round(($correctAttempts / $totalAttempts) * 100, 2) : 0;
    }

    /**
     * Get average time taken for attempts.
     */
    public static function averageTimeTaken($sessionId, $stage = null)
    {
        $query = static::where('game_session_id', $sessionId);

        if ($stage) {
            $query->where('stage', $stage);
        }

        return $query->avg('time_taken') ?? 0;
    }

    /**
     * Get total points earned from attempts.
     */
    public static function totalPointsEarned($sessionId, $stage = null)
    {
        $query = static::where('game_session_id', $sessionId);

        if ($stage) {
            $query->where('stage', $stage);
        }

        return $query->sum('points_earned') ?? 0;
    }

    /**
     * Get participant role based on attempt pattern.
     */
    private function getParticipantRole()
    {
        // This could be enhanced based on your game logic
        // For now, return null and handle in the relationship
        return null;
    }

    /**
     * Format time taken for display.
     */
    public function getFormattedTimeTakenAttribute()
    {
        if (!$this->time_taken) return 'N/A';

        $minutes = floor($this->time_taken / 60);
        $seconds = $this->time_taken % 60;

        return $minutes > 0
            ? "{$minutes}m {$seconds}s"
            : "{$seconds}s";
    }

    /**
     * Get attempt status with emoji.
     */
    public function getStatusWithEmojiAttribute()
    {
        return $this->is_correct ? '✅ Correct' : '❌ Incorrect';
    }
}
