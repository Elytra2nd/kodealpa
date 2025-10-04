<?php

namespace App\Policies;

use App\Models\{User, GameSession};

class GameSessionPolicy
{
    /**
     * Determine if user can view the session
     */
    public function view(User $user, GameSession $session): bool
    {
        // TODO: Check if user is participant in this session
        // For now, allow all authenticated users
        return true;
    }

    /**
     * Determine if user can participate (send messages)
     */
    public function participate(User $user, GameSession $session): bool
    {
        // TODO: Check if user is active participant
        // Check session is running
        if ($session->status !== 'running') {
            return false;
        }

        return true;
    }
}
