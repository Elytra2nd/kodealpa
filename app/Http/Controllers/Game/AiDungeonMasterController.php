<?php

namespace App\Http\Controllers\Game;

use App\Http\Controllers\Controller;
use App\Services\Ai\{GeminiService, GrimoireRetrieval, AiToolExecutor};
use App\Models\{GameSession, DmConversation, DmMessage};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AiDungeonMasterController extends Controller
{
    public function __construct(
        protected GeminiService $gemini,
        protected GrimoireRetrieval $grimoire,
        protected AiToolExecutor $toolExecutor
    ) {}

    /**
     * Show DM Chat page
     */
    public function index(Request $request)
    {
        $sessionId = $request->query('session_id');

        if (!$sessionId) {
            return redirect()->route('dashboard')
                ->with('error', 'Session ID required');
        }

        $session = GameSession::findOrFail($sessionId);
        $this->authorize('view', $session);

        // Get or create conversation
        $conversation = DmConversation::firstOrCreate(
            ['game_session_id' => $session->id],
            ['status' => 'active']
        );

        // Get recent messages
        $messages = $conversation->messages()
            ->with('user:id,name')
            ->latest()
            ->limit(50)
            ->get()
            ->reverse()
            ->values();

        return inertia('Game/DungeonMasterChat', [
            'session' => $session,
            'conversation' => $conversation,
            'messages' => $messages,
            'activeRoles' => $this->getActiveRoles($session),
        ]);
    }

    /**
     * Non-streaming message endpoint
     */
    public function message(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|exists:game_sessions,id',
            'message' => 'required|string|max:1000',
        ]);

        $session = GameSession::findOrFail($validated['session_id']);
        $this->authorize('participate', $session);

        // Get or create conversation
        $conversation = DmConversation::firstOrCreate(
            ['game_session_id' => $session->id],
            ['status' => 'active']
        );

        // Save user message
        $userMessage = DmMessage::create([
            'dm_conversation_id' => $conversation->id,
            'user_id' => auth()->id(),
            'role' => 'user',
            'content' => $validated['message'],
        ]);

        // Build system prompt dengan RAG
        $systemPrompt = $this->buildSystemPrompt($session);

        // Get recent history
        $history = $conversation->getRecentMessages(10);

        // Generate response
        try {
            $response = $this->gemini->generateContent(
                prompt: $validated['message'],
                config: ['max_tokens' => 500, 'temperature' => 0.7]
            );

            // Save AI response
            $aiMessage = DmMessage::create([
                'dm_conversation_id' => $conversation->id,
                'role' => 'assistant',
                'content' => $response,
                'tokens_used' => $this->gemini->countTokens($response),
            ]);

            // Update conversation stats
            $conversation->increment('total_tokens', $aiMessage->tokens_used ?? 0);

            return response()->json([
                'success' => true,
                'message' => $aiMessage,
                'conversation' => $conversation->fresh(),
            ]);

        } catch (\Exception $e) {
            Log::error('DM message generation failed', [
                'error' => $e->getMessage(),
                'session_id' => $session->id,
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Gagal generate response. Coba lagi.'
            ], 500);
        }
    }

    /**
     * SSE streaming endpoint
     */
    public function stream(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|exists:game_sessions,id',
            'message' => 'required|string|max:1000',
        ]);

        $session = GameSession::findOrFail($validated['session_id']);
        $this->authorize('participate', $session);

        return response()->stream(function () use ($validated, $session) {
            // Get or create conversation
            $conversation = DmConversation::firstOrCreate(
                ['game_session_id' => $session->id],
                ['status' => 'active']
            );

            // Save user message
            $userMessage = DmMessage::create([
                'dm_conversation_id' => $conversation->id,
                'user_id' => auth()->id(),
                'role' => 'user',
                'content' => $validated['message'],
            ]);

            // Build system prompt
            $systemPrompt = $this->buildSystemPrompt($session);

            try {
                // Stream response
                $stream = $this->gemini->streamGenerateContent(
                    prompt: $validated['message']
                );

                $fullResponse = '';

                foreach ($stream as $chunk) {
                    if (connection_aborted()) break;

                    $text = $chunk->text();
                    $fullResponse .= $text;

                    if (!empty($text)) {
                        echo "event: message\n";
                        echo 'data: ' . json_encode(['content' => $text]) . "\n\n";

                        if (ob_get_level() > 0) ob_flush();
                        flush();
                    }
                }

                // Save complete AI response
                $aiMessage = DmMessage::create([
                    'dm_conversation_id' => $conversation->id,
                    'role' => 'assistant',
                    'content' => $fullResponse,
                    'tokens_used' => $this->gemini->countTokens($fullResponse),
                ]);

                // Update conversation stats
                $conversation->increment('total_tokens', $aiMessage->tokens_used ?? 0);

                // Send done event
                echo "event: done\n";
                echo 'data: ' . json_encode([
                    'message_id' => $aiMessage->id,
                    'tokens' => $aiMessage->tokens_used
                ]) . "\n\n";

                if (ob_get_level() > 0) ob_flush();
                flush();

            } catch (\Exception $e) {
                echo "event: error\n";
                echo 'data: ' . json_encode(['error' => 'Streaming failed']) . "\n\n";
                if (ob_get_level() > 0) ob_flush();
                flush();
            }

        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
            'Connection' => 'keep-alive',
        ]);
    }

    /**
     * Build system prompt dengan RAG context
     */
    private function buildSystemPrompt(GameSession $session): string
    {
        $grimoire = $this->grimoire->getContextForSession($session);

        return <<<PROMPT
Kamu adalah AI Facilitator untuk CodeAlpha Dungeon, sebuah game edukasi kolaboratif.

**Peranmu:**
1. Fasilitasi peer learning dengan mendorong dialog terbuka
2. Pastikan semua anggota tim berpartisipasi secara merata
3. Jangan kasih spoiler jawaban - stimulasi pertanyaan hingga muncul minimal 2 hipotesis
4. Gunakan konteks Grimoire di bawah untuk menjaga konsistensi narasi
5. Pantau dinamika tim dan sarankan rotasi peran jika ada yang pasif

**Konteks Grimoire:**
{$grimoire}

**Tim saat ini:**
- Stage: {$session->current_stage}
- Team Code: {$session->team_code}

Berikan hint yang memancing berpikir kritis, bukan jawaban langsung.
Gunakan Bahasa Indonesia yang ramah dan suportif.
Fokus pada proses pembelajaran kolaboratif.
PROMPT;
    }

    /**
     * Get active roles untuk panel
     */
    private function getActiveRoles(GameSession $session): array
    {
        // TODO: Get from player_roles table atau session metadata
        return [
            'Pengamat Simbol' => 'Player 1',
            'Pembaca Mantra' => 'Player 2',
            'Penjaga Waktu' => 'Player 3',
        ];
    }
}
