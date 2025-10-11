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
        $history = $conversation->messages()
            ->where('id', '!=', $userMessage->id)
            ->whereIn('role', ['user', 'assistant'])
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

        // Generate response
        try {
            // Start chat with history
            $chat = $this->gemini->startChat($systemPrompt, $history);
            $response = $chat->sendMessage($validated['message']);
            $fullResponse = $response->text();

            // Save AI response
            $aiMessage = DmMessage::create([
                'dm_conversation_id' => $conversation->id,
                'role' => 'assistant',
                'content' => $fullResponse,
                'tokens_used' => $this->gemini->countTokens($fullResponse),
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
     * ✅ SSE streaming endpoint with hint tracking
     */
    public function stream(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|exists:game_sessions,id',
            'message' => 'required|string|max:1000',
        ]);

        $session = GameSession::findOrFail($validated['session_id']);
        // $this->authorize('participate', $session);

        // ✅ Check hint availability BEFORE streaming
        $currentStage = $session->current_stage ?? 1;
        $maxHints = $session->max_hints_per_stage ?? 3;
        $hintUsage = $session->hint_usage ?? [];
        $usedHints = $hintUsage[$currentStage] ?? 0;

        if ($usedHints >= $maxHints) {
            return response()->json([
                'error' => 'Tidak ada hint yang tersisa untuk stage ini',
                'hintsRemaining' => 0,
                'maxHints' => $maxHints,
            ], 400);
        }

        return response()->stream(function () use ($validated, $session, $currentStage, $hintUsage, $usedHints) {
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
                    ->whereIn('role', ['user', 'assistant'])
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

                // Get single response
                $response = $chat->sendMessage($validated['message']);
                $fullResponse = $response->text();

                // Chunk the response manually for streaming effect
                $chunkSize = 30; // Characters per chunk
                $chunks = mb_str_split($fullResponse, $chunkSize);

                foreach ($chunks as $chunk) {
                    if (connection_aborted()) break;

                    if (!empty($chunk)) {
                        echo "event: message\n";
                        echo 'data: ' . json_encode(['content' => $chunk]) . "\n\n";

                        if (ob_get_level() > 0) ob_flush();
                        flush();

                        usleep(30000); // 0.03 second delay per chunk
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

                // ✅ INCREMENT HINT USAGE
                $hintUsage[$currentStage] = $usedHints + 1;
                $session->hint_usage = $hintUsage;
                $session->total_hints_used = ($session->total_hints_used ?? 0) + 1;
                $session->save();

                // Calculate remaining hints
                $hintsRemaining = ($session->max_hints_per_stage ?? 3) - $hintUsage[$currentStage];

                // Send done event with hint info
                echo "event: done\n";
                echo 'data: ' . json_encode([
                    'message_id' => $aiMessage->id,
                    'tokens' => $aiMessage->tokens_used,
                    'hintsRemaining' => $hintsRemaining,
                    'hintsUsed' => $hintUsage[$currentStage],
                    'stage' => $currentStage,
                ]) . "\n\n";

                if (ob_get_level() > 0) ob_flush();
                flush();

                // ✅ Log hint usage
                Log::info('DM Hint Used', [
                    'session_id' => $session->id,
                    'stage' => $currentStage,
                    'hints_used' => $hintUsage[$currentStage],
                    'hints_remaining' => $hintsRemaining,
                    'user_id' => auth()->id(),
                ]);

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
     * ✅ NEW: Get hint usage statistics
     */
    public function getHintUsage(Request $request, $sessionId)
    {
        $session = GameSession::findOrFail($sessionId);

        $currentStage = $session->current_stage ?? 1;
        $maxHints = $session->max_hints_per_stage ?? 3;
        $hintUsage = $session->hint_usage ?? [];
        $usedHints = $hintUsage[$currentStage] ?? 0;

        return response()->json([
            'currentStage' => $currentStage,
            'hintsUsed' => $usedHints,
            'hintsRemaining' => max(0, $maxHints - $usedHints),
            'maxHintsPerStage' => $maxHints,
            'totalHintsUsed' => $session->total_hints_used ?? 0,
            'hintHistory' => collect($hintUsage)->map(function ($used, $stage) {
                return [
                    'stage' => $stage,
                    'hintsUsed' => $used,
                ];
            })->values(),
        ]);
    }

    /**
     * ✅ NEW: Use a hint (alternative REST endpoint, not streaming)
     */
    public function useHint(Request $request, $sessionId)
    {
        $validated = $request->validate([
            'stage' => 'required|integer|min:1',
        ]);

        $session = GameSession::findOrFail($sessionId);

        // Check hint availability
        $currentStage = $validated['stage'];
        $maxHints = $session->max_hints_per_stage ?? 3;
        $hintUsage = $session->hint_usage ?? [];
        $usedHints = $hintUsage[$currentStage] ?? 0;

        if ($usedHints >= $maxHints) {
            return response()->json([
                'message' => 'Tidak ada hint yang tersisa untuk stage ini',
                'hintsRemaining' => 0,
            ], 400);
        }

        // Generate contextual hint
        $hint = $this->generateContextualHint($session, $currentStage, $usedHints);

        // Increment hint usage
        $hintUsage[$currentStage] = $usedHints + 1;
        $session->hint_usage = $hintUsage;
        $session->total_hints_used = ($session->total_hints_used ?? 0) + 1;
        $session->save();

        // Log hint usage
        Log::info('Hint Used', [
            'session_id' => $session->id,
            'stage' => $currentStage,
            'hints_used' => $hintUsage[$currentStage],
            'user_id' => auth()->id(),
        ]);

        return response()->json([
            'hint' => $hint,
            'hintsRemaining' => $maxHints - $hintUsage[$currentStage],
            'hintsUsed' => $hintUsage[$currentStage],
        ]);
    }

    /**
     * ✅ Generate contextual hint based on puzzle type and stage
     */
    private function generateContextualHint(GameSession $session, int $stage, int $hintLevel): string
    {
        // Get current puzzle (you'll need to implement this based on your structure)
        // For now, return progressive hints

        $progressiveHints = [
            0 => "Fokus pada pola yang terlihat. Amati dengan seksama dan diskusikan dengan tim!",
            1 => "Coba hitung selisih atau rasio antar elemen. Pola sering tersembunyi di sana.",
            2 => "Gunakan metode eliminasi. Validasi hipotesis dengan beberapa contoh sebelum submit.",
        ];

        return $progressiveHints[$hintLevel] ?? $progressiveHints[2];
    }

    /**
     * Build system prompt dengan RAG context
     */
    private function buildSystemPrompt(GameSession $session): string
    {
        $grimoire = $this->grimoire->getContextForSession($session);

        // ✅ Get hint info for context
        $currentStage = $session->current_stage ?? 1;
        $maxHints = $session->max_hints_per_stage ?? 3;
        $hintUsage = $session->hint_usage ?? [];
        $usedHints = $hintUsage[$currentStage] ?? 0;
        $hintsRemaining = max(0, $maxHints - $usedHints);

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

## HINT SYSTEM
- Hints tersisa untuk stage ini: **{$hintsRemaining}/{$maxHints}**
- Berikan hint yang membantu berpikir, BUKAN jawaban langsung
- Gunakan metode Socratic questioning untuk memandu reasoning
- Jika hints hampir habis, ingatkan tim untuk menggunakan dengan bijak

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
- **Hints Remaining**: {$hintsRemaining}/{$maxHints}

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
