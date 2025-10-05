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
        // Comment out authorization for testing
        // $this->authorize('view', $session);

        // Get or create conversation with defaults
        $conversation = DmConversation::firstOrCreate(
            ['game_session_id' => $session->id],
            [
                'status' => 'active',
                'total_tokens' => 0,
                'estimated_cost' => 0.0,
            ]
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
            'session' => [
                'id' => $session->id,
                'team_code' => $session->team_code,
                'current_stage' => $session->current_stage,
                'status' => $session->status,
            ],
            'conversation' => [
                'id' => $conversation->id,
                'status' => $conversation->status,
                'total_tokens' => (int)($conversation->total_tokens ?? 0),
                'estimated_cost' => (float)($conversation->estimated_cost ?? 0.0),
            ],
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
        // Comment out authorization for testing
        // $this->authorize('participate', $session);

        // Get or create conversation with defaults
        $conversation = DmConversation::firstOrCreate(
            ['game_session_id' => $session->id],
            [
                'status' => 'active',
                'total_tokens' => 0,
                'estimated_cost' => 0.0,
            ]
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
        // $this->authorize('participate', $session);

        return response()->stream(function () use ($validated, $session) {
            // Get or create conversation
            $conversation = DmConversation::firstOrCreate(
                ['game_session_id' => $session->id],
                [
                    'status' => 'active',
                    'total_tokens' => 0,
                    'estimated_cost' => 0.0,
                ]
            );

        // Save user message
            $userMessage = DmMessage::create([
                'dm_conversation_id' => $conversation->id,
                'user_id' => auth()->id(),
                'role' => 'user',
                'content' => $validated['message'],
            ]);

            try {
                // Build system prompt with enhanced context
                $systemPrompt = $this->buildSystemPrompt($session);

                // Get recent conversation history (exclude current message)
                $history = $conversation->messages()
                    ->where('id', '!=', $userMessage->id)
                    ->latest()
                    ->limit(10)
                    ->get()
                    ->reverse()
                    ->map(function ($msg) {
                        return [
                            'role' => $msg->role === 'user' ? 'user' : 'model',
                            'content' => $msg->content,
                        ];
                    })
                    ->toArray();

                // Start chat with system instruction & history
                $chat = $this->gemini->startChat($systemPrompt, $history);

                // Send message and stream response
                $streamResponse = $chat->sendMessage($validated['message']);

                $fullResponse = '';

                foreach ($streamResponse as $chunk) {
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
                Log::error('DM streaming failed', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'session_id' => $session->id,
                ]);

                echo "event: error\n";
                echo 'data: ' . json_encode(['error' => 'Streaming failed: ' . $e->getMessage()]) . "\n\n";
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
    Kamu adalah **AI Dungeon Master** untuk CodeAlpha Dungeon, game edukasi kolaboratif berbasis peer learning.

    ## IDENTITAS
    Nama: Dungeon Master (DM)
    Karakter: Fasilitator yang ramah, suportif, dan bijaksana
    Bahasa: Bahasa Indonesia yang natural dan hangat

    ## PERAN UTAMA
    1. **Fasilitator Aktif**: Dorong diskusi terbuka dengan pertanyaan terbuka dan thought-provoking
    2. **Pemerata Partisipasi**: Pastikan semua anggota tim berkontribusi secara seimbang
    3. **Stimulator Berpikir Kritis**: Jangan beri jawaban langsung - pancing minimal 2 hipotesis berbeda
    4. **Penjaga Narasi**: Gunakan konteks Grimoire untuk konsistensi cerita dungeon
    5. **Pengamat Dinamika**: Sarankan rotasi peran jika ada anggota yang terlalu pasif/dominan

    ## LARANGAN
    ❌ JANGAN beri kode lengkap atau jawaban final
    ❌ JANGAN kasih spoiler solusi
    ❌ JANGAN biarkan satu orang mendominasi
    ❌ JANGAN skip proses diskusi collaborative

    ## CARA MEMFASILITASI
    1. **Awali dengan pertanyaan terbuka**: "Bagaimana menurut kalian...?", "Apa hipotesis tim tentang...?"
    2. **Stimulasi dengan hint bertingkat**: Mulai dari hint umum → spesifik jika stuck
    3. **Validasi semua ide**: "Interesting point!", "Good thinking!", "Mari explore lebih jauh..."
    4. **Redirect ke tim**: "Tanya ke teman yang lain, apa pendapatnya?"
    5. **Summarize insights**: Rangkum poin penting yang muncul dari diskusi

    ## KONTEKS GAME
    {$grimoire}

    ## TIM SAAT INI
    - **Stage**: {$session->current_stage}
    - **Team Code**: {$session->team_code}
    - **Status**: {$session->status}

    ## GAYA BICARA
    - Gunakan emoji sesekali untuk warmth: 🤔💡✨🎯
    - Panggil mereka "Explorers" atau "Tim"
    - Rayakan insight bagus: "Brilliant observation!"
    - Berikan encouragement: "Kalian di jalur yang tepat!"

    ## CONTOH INTERAKSI

    **User**: "Gimana cara buat loop di Python?"
    **DM**: "Great question! 🤔 Sebelum kita bahas implementasi, coba diskusikan dulu:
    1. Menurut kalian, kapan kita perlu 'loop' dalam programming?
    2. Apa bedanya kalau kita tulis kode berulang manual vs pakai loop?

    Mari brainstorming dulu, minimal muncul 2 ide berbeda dari tim!"

    **User**: "Loop itu buat ngulang kode"
    **DM**: "Yes! 💡 Benar sekali. Sekarang expand lagi:
    - Loop itu ngulang berapa kali? Fixed atau dynamic?
    - Apa yang menentukan kapan loop berhenti?

    Diskusikan dengan tim, lalu share hipotesis kalian!"

    Sekarang, bantu tim ini belajar dengan fasilitasi yang engaging dan thought-provoking! 🚀
    PROMPT;
    }
}
