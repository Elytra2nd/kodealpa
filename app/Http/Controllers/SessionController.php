<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Controller;
use App\Models\GameSession;
use App\Models\GameAttempt;
use Carbon\Carbon;

class SessionController extends Controller
{
    private $stageConfigurations = [
        1 => [
            'title' => 'Stage 1: Pattern Analysis',
            'type' => 'pattern_analysis',
            'maxAttempts' => 3,
            'timeLimit' => 300, // 5 minutes
        ],
        2 => [
            'title' => 'Stage 2: Code Analysis',
            'type' => 'code_analysis',
            'maxAttempts' => 3,
            'timeLimit' => 400, // 6.67 minutes
        ],
        3 => [
            'title' => 'Stage 3: Navigation Challenge',
            'type' => 'navigation_challenge',
            'maxAttempts' => 2,
            'timeLimit' => 600, // 10 minutes
        ]
    ];

    public function state($sessionId)
    {
        $session = GameSession::with(['participants', 'attempts'])->findOrFail($sessionId);

        $currentStage = $session->current_stage ?? 1;
        $stageConfig = $this->stageConfigurations[$currentStage];

        if ($session->status === 'running') {
            $puzzle = $this->generatePuzzleForStage($currentStage, $session->seed);

            return response()->json([
                'session' => $session,
                'puzzle' => $puzzle,
                'stage' => [
                    'current' => $currentStage,
                    'total' => count($this->stageConfigurations),
                    'config' => $stageConfig,
                    'progress' => [
                        'completed' => $session->stages_completed ?? [],
                        'totalScore' => $session->total_score ?? 0,
                    ]
                ],
                'serverTime' => now()->toISOString()
            ]);
        }

        return response()->json([
            'session' => $session,
            'stage' => [
                'current' => $currentStage,
                'total' => count($this->stageConfigurations),
                'config' => $stageConfig,
            ],
            'serverTime' => now()->toISOString()
        ]);
    }

    public function attempt(Request $request, $sessionId)
    {
        $session = GameSession::findOrFail($sessionId);

        if ($session->status !== 'running') {
            return response()->json(['message' => 'Session is not active'], 400);
        }

        $currentStage = $session->current_stage ?? 1;
        $puzzle = $this->generatePuzzleForStage($currentStage, $session->seed);

        $isCorrect = $this->validateAnswer($puzzle, $request->input);

        // Record attempt
        $attempt = GameAttempt::create([
            'game_session_id' => $sessionId,
            'stage' => $currentStage,
            'input' => $request->input,
            'is_correct' => $isCorrect,
            'puzzle_key' => $puzzle['key'] ?? "stage_{$currentStage}",
        ]);

        if ($isCorrect) {
            return $this->handleStageCompletion($session, $currentStage);
        }

        // Check max attempts for current stage
        $stageAttempts = $session->attempts()->where('stage', $currentStage)->count();
        $maxAttempts = $this->stageConfigurations[$currentStage]['maxAttempts'];

        if ($stageAttempts >= $maxAttempts) {
            return $this->handleStageFailed($session, $currentStage);
        }

        return response()->json([
            'session' => $session->fresh(),
            'correct' => false,
            'attemptsRemaining' => $maxAttempts - $stageAttempts
        ]);
    }

    /**
     * Generate puzzle data for a specific stage
     */
    private function generatePuzzleForStage($stage, $seed = null)
    {
        // Use seed for consistent puzzle generation
        if ($seed) {
            mt_srand($seed);
        }

        switch ($stage) {
            case 1:
                return $this->generatePatternAnalysisPuzzle();
            case 2:
                return $this->generateCodeAnalysisPuzzle();
            case 3:
                return $this->generateNavigationPuzzle();
            default:
                return $this->generatePatternAnalysisPuzzle();
        }
    }

    /**
     * Generate pattern analysis puzzle
     */
    private function generatePatternAnalysisPuzzle()
    {
        $patterns = [
            ['sequence' => [2, 4, 6, 8, '?'], 'answer' => '10', 'type' => 'arithmetic'],
            ['sequence' => [1, 4, 9, 16, '?'], 'answer' => '25', 'type' => 'square'],
            ['sequence' => [5, 10, 15, 20, '?'], 'answer' => '25', 'type' => 'multiple'],
        ];

        $puzzle = $patterns[array_rand($patterns)];

        return [
            'key' => 'pattern_' . md5(json_encode($puzzle['sequence'])),
            'title' => 'Pattern Analysis Challenge',
            'type' => 'pattern_analysis',
            'data' => $puzzle,
            'instruction' => 'Find the missing number in the sequence',
            'answer' => $puzzle['answer']
        ];
    }

    /**
     * Generate code analysis puzzle
     */
    private function generateCodeAnalysisPuzzle()
    {
        $codes = [
            ['cipher' => 'KHOOR', 'key' => 3, 'answer' => 'HELLO', 'type' => 'caesar'],
            ['cipher' => 'ZRUOG', 'key' => 3, 'answer' => 'WORLD', 'type' => 'caesar'],
        ];

        $puzzle = $codes[array_rand($codes)];

        return [
            'key' => 'code_' . md5($puzzle['cipher']),
            'title' => 'Code Analysis Challenge',
            'type' => 'code_analysis',
            'data' => $puzzle,
            'instruction' => 'Decode this Caesar cipher (shift by 3)',
            'answer' => $puzzle['answer']
        ];
    }

    /**
     * Generate navigation puzzle
     */
    private function generateNavigationPuzzle()
    {
        $mazes = [
            ['start' => 'A1', 'end' => 'C3', 'path' => 'RIGHT,DOWN,RIGHT,DOWN', 'answer' => 'C3'],
            ['start' => 'B2', 'end' => 'D4', 'path' => 'RIGHT,RIGHT,DOWN,DOWN', 'answer' => 'D4'],
        ];

        $puzzle = $mazes[array_rand($mazes)];

        return [
            'key' => 'nav_' . md5($puzzle['start'] . $puzzle['end']),
            'title' => 'Navigation Challenge',
            'type' => 'navigation',
            'data' => $puzzle,
            'instruction' => 'Find the exit coordinates',
            'answer' => $puzzle['answer']
        ];
    }

    /**
     * Validate answer against puzzle
     */
    private function validateAnswer($puzzle, $userInput)
    {
        return strtoupper(trim($userInput)) === strtoupper(trim($puzzle['answer']));
    }

    /**
     * Handle stage failure
     */
    private function handleStageFailed($session, $stage)
    {
        $session->update([
            'status' => 'failed',
            'completed_at' => now(),
            'failed_stage' => $stage
        ]);

        return response()->json([
            'session' => $session->fresh(),
            'stageFailed' => true,
            'gameComplete' => true,
            'message' => "Stage {$stage} failed. Maximum attempts exceeded."
        ]);
    }

    private function handleStageCompletion($session, $completedStage)
    {
        $stagesCompleted = $session->stages_completed ?? [];
        $stagesCompleted[] = $completedStage;

        $stageScore = $this->calculateStageScore($session, $completedStage);
        $totalScore = ($session->total_score ?? 0) + $stageScore;

        if ($completedStage >= count($this->stageConfigurations)) {
            // All stages completed - Game success
            $session->update([
                'status' => 'success',
                'completed_at' => now(),
                'stages_completed' => $stagesCompleted,
                'total_score' => $totalScore,
                'collaboration_score' => $this->calculateCollaborationScore($session)
            ]);

            return response()->json([
                'session' => $session->fresh(),
                'gameComplete' => true,
                'finalScore' => $totalScore,
                'message' => 'Congratulations! All stages completed!'
            ]);
        }

        // Move to next stage
        $nextStage = $completedStage + 1;
        $session->update([
            'current_stage' => $nextStage,
            'stages_completed' => $stagesCompleted,
            'total_score' => $totalScore,
            'stage_started_at' => now()
        ]);

        return response()->json([
            'session' => $session->fresh(),
            'stageComplete' => true,
            'nextStage' => $nextStage,
            'stageScore' => $stageScore,
            'message' => "Stage {$completedStage} completed! Moving to Stage {$nextStage}"
        ]);
    }

    private function calculateStageScore($session, $stage)
    {
        $attempts = $session->attempts()->where('stage', $stage)->count();
        $timeBonus = $this->calculateTimeBonus($session, $stage);

        $baseScore = 100;
        $attemptPenalty = ($attempts - 1) * 20;

        return max(0, $baseScore - $attemptPenalty + $timeBonus);
    }

    /**
     * Calculate time bonus for stage completion
     */
    private function calculateTimeBonus($session, $stage)
    {
        $stageStarted = $session->stage_started_at ?? $session->started_at;
        $stageCompleted = now();
        $timeTaken = $stageStarted->diffInSeconds($stageCompleted);

        $timeLimit = $this->stageConfigurations[$stage]['timeLimit'];
        $timeRemaining = max(0, $timeLimit - $timeTaken);

        // Bonus: 1 point per 10 seconds remaining
        return floor($timeRemaining / 10);
    }

    /**
     * Calculate collaboration score based on team performance
     */
    private function calculateCollaborationScore($session)
    {
        $participants = $session->participants;
        $totalAttempts = $session->attempts()->count();

        // Base collaboration score
        $collaborationScore = 50;

        // Penalty for too many attempts (indicates poor communication)
        if ($totalAttempts > 10) {
            $collaborationScore -= ($totalAttempts - 10) * 2;
        }

        // Bonus for completing in reasonable time
        $totalTime = $session->started_at->diffInMinutes($session->completed_at ?? now());
        if ($totalTime < 20) { // Less than 20 minutes
            $collaborationScore += 25;
        }

        return max(0, $collaborationScore);
    }
}
