<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\GameSession;

class VoiceChatController extends Controller
{
    public function getVoiceToken(Request $request, $sessionId)
    {
        $session = GameSession::findOrFail($sessionId);

        // Verify user is participant
        $participant = $session->participants()
            ->where('user_id', auth()->id())
            ->first();

        if (!$participant) {
            return response()->json(['error' => 'Not a participant'], 403);
        }

        // Generate voice chat token (for production WebRTC signaling)
        $token = [
            'sessionId' => $sessionId,
            'userId' => auth()->id(),
            'nickname' => $participant->nickname,
            'role' => $participant->role,
            'timestamp' => now()->timestamp
        ];

        return response()->json([
            'token' => base64_encode(json_encode($token)),
            'iceServers' => [
                ['urls' => 'stun:stun.l.google.com:19302'],
                ['urls' => 'stun:stun1.l.google.com:19302']
            ]
        ]);
    }

    public function getParticipants($sessionId)
    {
        $session = GameSession::with('participants')->findOrFail($sessionId);

        return response()->json([
            'participants' => $session->participants->map(function ($p) {
                return [
                    'id' => $p->id,
                    'user_id' => $p->user_id,
                    'nickname' => $p->nickname,
                    'role' => $p->role,
                    'is_online' => $p->updated_at->gt(now()->subMinutes(5))
                ];
            })
        ]);
    }
}
