<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\{Stage, GameSession, SessionParticipant, Attempt};
use Illuminate\Support\Facades\Log;

class SessionController extends Controller
{
    /**
     * Create new game session
     */
    public function create(Request $req)
    {
        $validated = $req->validate(['stage_id' => 'required|exists:stages,id']);
        $stage = Stage::findOrFail($validated['stage_id']);

        $session = GameSession::create([
            'stage_id' => $stage->id,
            'team_code' => GameSession::generateTeamCode(),
            'status' => 'waiting',
            'learning_progress' => [],
            'hint_count' => 0,
            'peer_feedback' => [],
            'collaboration_score' => 0
        ]);

        return response()->json($session);
    }

    /**
     * Join existing game session
     */
    public function join(Request $req)
    {
        $data = $req->validate([
            'team_code' => 'required|string|exists:game_sessions,team_code',
            'role' => 'required|in:defuser,expert',
            'nickname' => 'required|string|max:32'
        ]);

        $session = GameSession::where('team_code', $data['team_code'])->first();

        if ($session->status !== 'waiting' && $session->status !== 'running') {
            return response()->json(['message' => 'Session is closed'], 400);
        }

        if ($session->participants()->where('role', $data['role'])->exists()) {
            return response()->json(['message' => 'Role already taken'], 409);
        }

        $participant = $session->participants()->create($data);

        return response()->json([
            'session' => $this->formatSessionData($session),
            'participant' => $participant
        ]);
    }

    /**
     * Start game session
     */
    public function start($id)
    {
        $session = GameSession::findOrFail($id);

        if ($session->status !== 'waiting') {
            return response()->json(['message' => 'Already started'], 400);
        }

        $timeLimit = $session->stage->config['timeLimit'] ?? 180;

        $session->update([
            'status' => 'running',
            'started_at' => now(),
            'ends_at' => now()->addSeconds($timeLimit)
        ]);

        return response()->json($this->formatSessionData($session));
    }

    /**
     * Get current game state - PERBAIKAN UTAMA
     */
    public function state($id)
    {
        try {
            $session = GameSession::with(['participants', 'attempts', 'stage.mission'])->findOrFail($id);

            if (!$session->stage || !$session->stage->config) {
                return response()->json(['message' => 'Stage configuration not found'], 404);
            }

            $cfg = $session->stage->config;

            if (!isset($cfg['puzzles']) || empty($cfg['puzzles'])) {
                return response()->json(['message' => 'Puzzle configuration not found'], 404);
            }

            // **PERBAIKAN: Format session data dengan participants & attempts yang selalu array**
            $sessionData = $this->formatSessionData($session);

            $puzzle = $cfg['puzzles'][0];
            $seed = crc32($session->team_code . $session->id);

            // Handle different puzzle types
            switch ($puzzle['type'] ?? 'symbol_mapping') {
                case 'code_analysis':
                    return $this->handleCodeAnalysisPuzzle($sessionData, $puzzle);

                case 'pattern_analysis':
                    return $this->handlePatternAnalysisPuzzle($sessionData, $puzzle, $seed);

                case 'navigation_challenge':
                    return $this->handleNavigationChallenge($sessionData, $puzzle, $seed);

                default:
                    return $this->handleSymbolMappingPuzzle($sessionData, $puzzle, $seed);
            }

        } catch (\Exception $e) {
            Log::error('Error in session state:', [
                'session_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Internal server error',
                'error' => config('app.debug') ? $e->getMessage() : 'Something went wrong'
            ], 500);
        }
    }

    /**
     * Format session data - HELPER METHOD BARU
     */
    private function formatSessionData($session)
    {
        // Pastikan session fresh dengan relasi
        $session->load(['participants', 'attempts', 'stage.mission']);

        return [
            'id' => $session->id,
            'team_code' => $session->team_code,
            'status' => $session->status,
            'started_at' => $session->started_at,
            'ends_at' => $session->ends_at,
            'participants' => $session->participants->toArray(), // Force to array
            'attempts' => $session->attempts->toArray(),         // Force to array
            'stage' => [
                'id' => $session->stage->id,
                'name' => $session->stage->name,
                'config' => $session->stage->config,
                'mission' => $session->stage->mission ? [
                    'id' => $session->stage->mission->id,
                    'code' => $session->stage->mission->code,
                    'title' => $session->stage->mission->title,
                    'description' => $session->stage->mission->description,
                ] : null
            ],
            // Stage 2 additional fields with defaults
            'learning_progress' => $session->learning_progress ?? [],
            'hint_count' => $session->hint_count ?? 0,
            'peer_feedback' => $session->peer_feedback ?? [],
            'collaboration_score' => $session->collaboration_score ?? 0,
        ];
    }

    /**
     * Handle code analysis puzzle type
     */
    private function handleCodeAnalysisPuzzle($sessionData, $puzzle)
    {
        return response()->json([
            'session' => $sessionData,
            'puzzle' => [
                'key' => $puzzle['key'],
                'type' => $puzzle['type'],
                'title' => $puzzle['title'],
                'description' => $puzzle['description'],
                'codeSnippet' => $puzzle['codeSnippet'],
                'testInput' => $puzzle['testInput'],
                'expectedOutput' => $puzzle['expectedOutput'],
                'defuserView' => [
                    'codeLines' => $puzzle['codeSnippet'],
                    'testCase' => [
                        'input' => $puzzle['testInput'],
                        'expected' => $puzzle['expectedOutput']
                    ]
                ],
                'expertView' => [
                    'bugs' => $puzzle['bugs'],
                    'solutions' => $puzzle['solutions']
                ],
                'learningObjectives' => $sessionData['stage']['config']['learningObjectives'] ?? []
            ],
            'serverTime' => now()->toISOString()
        ]);
    }

    /**
     * Handle pattern analysis puzzle type
     */
    private function handlePatternAnalysisPuzzle($sessionData, $puzzle, $seed)
    {
        mt_srand($seed);
        $sequences = $puzzle['sequences'];
        $selectedSequence = $sequences[mt_rand(0, count($sequences) - 1)];

        return response()->json([
            'session' => $sessionData,
            'puzzle' => [
                'key' => $puzzle['key'],
                'type' => $puzzle['type'],
                'title' => $puzzle['title'],
                'description' => $puzzle['description'],
                'defuserView' => [
                    'pattern' => $selectedSequence['pattern'],
                    'hints' => $puzzle['hints'],
                    'sequenceId' => $selectedSequence['id']
                ],
                'expertView' => [
                    'rule' => $selectedSequence['rule'],
                    'answer' => $selectedSequence['answer'],
                    'category' => $selectedSequence['category']
                ],
                'learningObjectives' => $sessionData['stage']['config']['learningObjectives'] ?? []
            ],
            'serverTime' => now()->toISOString()
        ]);
    }

    /**
     * Handle navigation challenge puzzle type
     */
    private function handleNavigationChallenge($sessionData, $puzzle, $seed)
    {
        mt_srand($seed);
        $challenges = $puzzle['challenges'];
        $selectedChallenge = $challenges[mt_rand(0, count($challenges) - 1)];

        return response()->json([
            'session' => $sessionData,
            'puzzle' => [
                'key' => $puzzle['key'],
                'type' => $puzzle['type'],
                'title' => $puzzle['title'],
                'description' => $puzzle['description'],
                'defuserView' => [
                    'task' => $selectedChallenge['task'],
                    'traversalOptions' => ['left', 'right', 'root']
                ],
                'expertView' => [
                    'tree' => $puzzle['tree'],
                    'answer' => $selectedChallenge['answer'],
                    'explanation' => $selectedChallenge['explanation'],
                    'traversalMethods' => $puzzle['traversalMethods']
                ],
                'learningObjectives' => $sessionData['stage']['config']['learningObjectives'] ?? []
            ],
            'serverTime' => now()->toISOString()
        ]);
    }

    /**
     * Handle original symbol mapping puzzle type
     */
    private function handleSymbolMappingPuzzle($sessionData, $puzzle, $seed)
    {
        mt_srand($seed);
        $symbols = $puzzle['symbols'];
        $pick = [];
        $pool = $symbols;

        for ($i = 0; $i < 3; $i++) {
            if (count($pool) === 0) break;
            $idx = mt_rand(0, count($pool) - 1);
            $pick[] = $pool[$idx];
            array_splice($pool, $idx, 1);
        }

        return response()->json([
            'session' => $sessionData,
            'puzzle' => [
                'key' => $puzzle['key'],
                'symbols' => $pick,
                'mappingAvailableTo' => 'expert',
                'type' => 'symbol_mapping',
                'mapping' => $puzzle['mapping'] ?? []
            ],
            'serverTime' => now()->toISOString()
        ]);
    }

    /**
     * Submit puzzle attempt
     */
    public function attempt($id, Request $req)
    {
        $session = GameSession::with(['stage', 'participants', 'attempts'])->findOrFail($id);

        if ($session->status !== 'running') {
            return response()->json(['message' => 'Not running'], 400);
        }

        if (now()->greaterThan($session->ends_at)) {
            $session->update(['status' => 'failed']);
            return response()->json([
                'message' => 'Time up',
                'session' => $this->formatSessionData($session)
            ], 400);
        }

        $data = $req->validate([
            'puzzle_key' => 'required|string',
            'input' => 'required|string',
            'attempt_type' => 'string|nullable'
        ]);

        $cfg = $session->stage->config;
        $puzzle = $cfg['puzzles'][0];

        $isCorrect = $this->validateAttempt($session, $puzzle, $data);

        $attempt = $session->attempts()->create([
            'puzzle_key' => $data['puzzle_key'],
            'input' => $data['input'],
            'is_correct' => $isCorrect
        ]);

        if ($isCorrect) {
            $session->update(['status' => 'success']);
            $this->updateLearningProgress($session, $puzzle);
            $this->updateCollaborationScore($session);
        }

        return response()->json([
            'attempt' => $attempt,
            'session' => $this->formatSessionData($session->fresh())
        ]);
    }

    /**
     * Validate attempt based on puzzle type
     */
    private function validateAttempt($session, $puzzle, $data)
    {
        $seed = crc32($session->team_code . $session->id);

        switch ($puzzle['type'] ?? 'symbol_mapping') {
            case 'pattern_analysis':
                mt_srand($seed);
                $sequences = $puzzle['sequences'];
                $selectedSequence = $sequences[mt_rand(0, count($sequences) - 1)];
                return intval($data['input']) === $selectedSequence['answer'];

            case 'navigation_challenge':
                mt_srand($seed);
                $challenges = $puzzle['challenges'];
                $selectedChallenge = $challenges[mt_rand(0, count($challenges) - 1)];
                $inputPath = array_map('trim', explode(',', strtolower($data['input'])));
                return $inputPath === $selectedChallenge['answer'];

            case 'code_analysis':
                $expectedBugLines = array_column($puzzle['bugs'], 'line');
                $foundBugLines = array_map('intval', explode(',', $data['input']));
                sort($expectedBugLines);
                sort($foundBugLines);
                return $expectedBugLines === $foundBugLines;

            default:
                // Original symbol mapping logic
                mt_srand($seed);
                $symbols = $puzzle['symbols'];
                $mapping = $puzzle['mapping'];
                $pick = [];
                $pool = $symbols;

                for ($i = 0; $i < 3; $i++) {
                    if (count($pool) === 0) break;
                    $idx = mt_rand(0, count($pool) - 1);
                    $pick[] = $pool[$idx];
                    array_splice($pool, $idx, 1);
                }

                $answer = implode('', array_map(fn($s) => $mapping[$s], $pick));
                return strtoupper($data['input']) === $answer;
        }
    }

    /**
     * Update learning progress tracking
     */
    private function updateLearningProgress($session, $puzzle)
    {
        $progress = $session->learning_progress ?? [];
        $progress[] = [
            'puzzle_type' => $puzzle['type'] ?? 'symbol_mapping',
            'puzzle_key' => $puzzle['key'],
            'completed_at' => now()->toISOString(),
            'objectives_met' => $session->stage->config['learningObjectives'] ?? [],
            'attempts_count' => $session->attempts()->count()
        ];

        $session->update(['learning_progress' => $progress]);
    }

    /**
     * Update collaboration score based on performance
     */
    private function updateCollaborationScore($session)
    {
        $attempts = $session->attempts()->count();
        $timeUsed = now()->diffInSeconds($session->started_at);
        $timeLimit = $session->stage->config['timeLimit'] ?? 180;

        // Calculate score based on efficiency
        $score = 100;
        if ($attempts > 1) $score -= ($attempts - 1) * 10;
        if ($timeUsed > $timeLimit * 0.8) $score -= 20;

        $score = max(0, min(100, $score));

        $session->update(['collaboration_score' => $score]);
    }

    /**
     * Provide hint to players
     */
    public function provideHint($id, Request $req)
    {
        $session = GameSession::with('stage')->findOrFail($id);

        if ($session->status !== 'running') {
            return response()->json(['message' => 'Session not running'], 400);
        }

        $data = $req->validate([
            'hint_type' => 'required|in:general,specific,debugging'
        ]);

        $cfg = $session->stage->config;
        $puzzle = $cfg['puzzles'][0];
        $hintCount = $session->hint_count + 1;

        $hint = $this->generateHint($puzzle, $data['hint_type'], $hintCount);

        $session->update(['hint_count' => $hintCount]);

        return response()->json([
            'hint' => $hint,
            'hint_count' => $hintCount,
            'max_hints' => 3
        ]);
    }

    /**
     * Generate contextual hints based on puzzle type
     */
    private function generateHint($puzzle, $hintType, $hintCount)
    {
        $puzzleType = $puzzle['type'] ?? 'symbol_mapping';

        switch ($puzzleType) {
            case 'code_analysis':
                $hints = [
                    1 => "Look carefully at loop boundaries and conditions.",
                    2 => "Check the comparison operators - are they correct for the intended sorting order?",
                    3 => "Focus on lines 3 and 4 - there are logical errors there."
                ];
                break;

            case 'pattern_analysis':
                $hints = [
                    1 => "Consider mathematical relationships between consecutive numbers.",
                    2 => "Try operations like multiplication, addition, or exponentials.",
                    3 => "Look for famous number sequences like Fibonacci or geometric progressions."
                ];
                break;

            case 'navigation_challenge':
                $hints = [
                    1 => "Start from the root and think about binary search tree properties.",
                    2 => "Smaller values go left, larger values go right in a BST.",
                    3 => "Trace the path step by step: root -> left/right -> left/right."
                ];
                break;

            default:
                $hints = [
                    1 => "Expert: Use the symbol mapping to guide the defuser.",
                    2 => "Defuser: Describe each symbol clearly to the expert.",
                    3 => "Work together - communication is key!"
                ];
        }

        return $hints[$hintCount] ?? "You've used all available hints. Keep trying!";
    }

    /**
     * Record peer feedback
     */
    public function provideFeedback($id, Request $req)
    {
        $session = GameSession::findOrFail($id);

        $data = $req->validate([
            'feedback_type' => 'required|in:peer_review,learning_reflection,collaboration_rating',
            'content' => 'required|string|max:1000',
            'rating' => 'integer|min:1|max:5|nullable',
            'feedback_from' => 'required|in:defuser,expert,host'
        ]);

        $feedback = $session->peer_feedback ?? [];
        $feedback[] = [
            'type' => $data['feedback_type'],
            'content' => $data['content'],
            'rating' => $data['rating'] ?? null,
            'from' => $data['feedback_from'],
            'timestamp' => now()->toISOString()
        ];

        $session->update(['peer_feedback' => $feedback]);

        return response()->json([
            'message' => 'Feedback recorded successfully',
            'feedback_count' => count($feedback)
        ]);
    }

    /**
     * Get session analytics and learning insights
     */
    public function getAnalytics($id)
    {
        $session = GameSession::with(['attempts', 'stage.mission', 'participants'])->findOrFail($id);

        $analytics = [
            'session_summary' => [
                'duration' => $session->started_at ? now()->diffInSeconds($session->started_at) : 0,
                'attempts' => $session->attempts()->count(),
                'success_rate' => $this->calculateSuccessRate($session),
                'collaboration_score' => $session->collaboration_score,
                'hints_used' => $session->hint_count
            ],
            'learning_progress' => $session->learning_progress ?? [],
            'peer_feedback' => $session->peer_feedback ?? [],
            'recommendations' => $this->generateRecommendations($session)
        ];

        return response()->json($analytics);
    }

    /**
     * Calculate success rate
     */
    private function calculateSuccessRate($session)
    {
        $totalAttempts = $session->attempts()->count();
        $correctAttempts = $session->attempts()->where('is_correct', true)->count();

        return $totalAttempts > 0 ? round(($correctAttempts / $totalAttempts) * 100, 2) : 0;
    }

    /**
     * Generate learning recommendations
     */
    private function generateRecommendations($session)
    {
        $recommendations = [];
        $attempts = $session->attempts()->count();
        $stage = $session->stage;

        if ($attempts > 3) {
            $recommendations[] = "Consider taking more time to analyze the problem before attempting solutions.";
        }

        if ($session->hint_count > 2) {
            $recommendations[] = "Focus on improving pattern recognition and problem-solving strategies.";
        }

        if ($session->collaboration_score < 70) {
            $recommendations[] = "Work on communication and coordination between team members.";
        }

        if ($stage && isset($stage->config['difficulty']) && $stage->config['difficulty'] === 'intermediate') {
            $recommendations[] = "You're ready for more advanced programming challenges!";
        }

        return $recommendations ?: ["Great job! Keep practicing to improve your skills."];
    }

    /**
     * Pause session (Additional utility method)
     */
    public function pauseSession($id)
    {
        $session = GameSession::findOrFail($id);

        if ($session->status !== 'running') {
            return response()->json(['message' => 'Session is not running'], 400);
        }

        $session->update(['status' => 'paused']);

        return response()->json([
            'message' => 'Session paused successfully',
            'session' => $this->formatSessionData($session)
        ]);
    }

    /**
     * Resume session (Additional utility method)
     */
    public function resumeSession($id)
    {
        $session = GameSession::findOrFail($id);

        if ($session->status !== 'paused') {
            return response()->json(['message' => 'Session is not paused'], 400);
        }

        $session->update(['status' => 'running']);

        return response()->json([
            'message' => 'Session resumed successfully',
            'session' => $this->formatSessionData($session)
        ]);
    }

    /**
     * End session (Additional utility method)
     */
    public function endSession($id)
    {
        $session = GameSession::findOrFail($id);

        $session->update(['status' => 'ended']);

        return response()->json([
            'message' => 'Session ended successfully',
            'session' => $this->formatSessionData($session)
        ]);
    }

    /**
     * Get participants (Additional utility method)
     */
    public function getParticipants($id)
    {
        $session = GameSession::with('participants')->findOrFail($id);

        return response()->json([
            'participants' => $session->participants->toArray()
        ]);
    }

    /**
     * Remove participant (Additional utility method)
     */
    public function removeParticipant($sessionId, $participantId)
    {
        $session = GameSession::findOrFail($sessionId);
        $participant = $session->participants()->findOrFail($participantId);

        $participant->delete();

        return response()->json([
            'message' => 'Participant removed successfully',
            'session' => $this->formatSessionData($session->fresh())
        ]);
    }

    /**
     * Get learning progress (Additional utility method)
     */
    public function getLearningProgress($id)
    {
        $session = GameSession::findOrFail($id);

        return response()->json([
            'learning_progress' => $session->learning_progress ?? [],
            'hint_count' => $session->hint_count ?? 0,
            'collaboration_score' => $session->collaboration_score ?? 0
        ]);
    }

    /**
     * Update learning progress (Additional utility method)
     */
    public function updateLearningProgressManual($id, Request $req)
    {
        $session = GameSession::findOrFail($id);

        $data = $req->validate([
            'learning_progress' => 'array',
            'hint_count' => 'integer|min:0',
            'collaboration_score' => 'integer|min:0|max:100'
        ]);

        $session->update($data);

        return response()->json([
            'message' => 'Learning progress updated successfully',
            'session' => $this->formatSessionData($session)
        ]);
    }
}
