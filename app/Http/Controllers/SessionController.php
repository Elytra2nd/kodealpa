<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
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

    // Expanded puzzle databases for randomization
    private $patternPuzzles = [
        // Arithmetic sequences
        ['sequence' => [2, 4, 6, 8], 'answer' => '10', 'type' => 'arithmetic', 'rule' => 'Add 2'],
        ['sequence' => [5, 10, 15, 20], 'answer' => '25', 'type' => 'arithmetic', 'rule' => 'Add 5'],
        ['sequence' => [3, 6, 9, 12], 'answer' => '15', 'type' => 'arithmetic', 'rule' => 'Add 3'],
        ['sequence' => [7, 14, 21, 28], 'answer' => '35', 'type' => 'arithmetic', 'rule' => 'Add 7'],

        // Square sequences
        ['sequence' => [1, 4, 9, 16], 'answer' => '25', 'type' => 'square', 'rule' => 'Perfect squares'],
        ['sequence' => [4, 9, 16, 25], 'answer' => '36', 'type' => 'square', 'rule' => 'Perfect squares starting from 2²'],

        // Multiplication sequences
        ['sequence' => [2, 6, 18, 54], 'answer' => '162', 'type' => 'multiplication', 'rule' => 'Multiply by 3'],
        ['sequence' => [3, 6, 12, 24], 'answer' => '48', 'type' => 'multiplication', 'rule' => 'Multiply by 2'],
        ['sequence' => [5, 10, 20, 40], 'answer' => '80', 'type' => 'multiplication', 'rule' => 'Multiply by 2'],

        // Fibonacci-like sequences
        ['sequence' => [1, 1, 2, 3], 'answer' => '5', 'type' => 'fibonacci', 'rule' => 'Sum of previous two'],
        ['sequence' => [2, 3, 5, 8], 'answer' => '13', 'type' => 'fibonacci', 'rule' => 'Sum of previous two'],

        // Mixed patterns
        ['sequence' => [1, 3, 7, 15], 'answer' => '31', 'type' => 'doubling_plus_one', 'rule' => 'Double and add 1'],
        ['sequence' => [10, 8, 6, 4], 'answer' => '2', 'type' => 'decreasing', 'rule' => 'Subtract 2'],
    ];

    private $codePuzzles = [
        // Caesar ciphers with different shifts
        ['cipher' => 'KHOOR', 'answer' => 'HELLO', 'shift' => 3, 'type' => 'caesar'],
        ['cipher' => 'ZRUOG', 'answer' => 'WORLD', 'shift' => 3, 'type' => 'caesar'],
        ['cipher' => 'FRGH', 'answer' => 'CODE', 'shift' => 3, 'type' => 'caesar'],
        ['cipher' => 'SXCCOH', 'answer' => 'PUZZLE', 'shift' => 3, 'type' => 'caesar'],

        // Caesar with shift 1
        ['cipher' => 'IFMMP', 'answer' => 'HELLO', 'shift' => 1, 'type' => 'caesar'],
        ['cipher' => 'XPSME', 'answer' => 'WORLD', 'shift' => 1, 'type' => 'caesar'],

        // Caesar with shift 5
        ['cipher' => 'MJQQT', 'answer' => 'HELLO', 'shift' => 5, 'type' => 'caesar'],
        ['cipher' => 'BTWQI', 'answer' => 'WORLD', 'shift' => 5, 'type' => 'caesar'],

        // Simple substitution
        ['cipher' => 'OLLEH', 'answer' => 'HELLO', 'shift' => 0, 'type' => 'reverse'],
        ['cipher' => 'DLROW', 'answer' => 'WORLD', 'shift' => 0, 'type' => 'reverse'],
    ];

    private $navigationPuzzles = [
        // Grid navigation challenges
        ['start' => 'A1', 'end' => 'C3', 'grid_size' => '3x3', 'answer' => 'C3', 'moves' => 4],
        ['start' => 'B2', 'end' => 'D4', 'grid_size' => '4x4', 'answer' => 'D4', 'moves' => 4],
        ['start' => 'A1', 'end' => 'E5', 'grid_size' => '5x5', 'answer' => 'E5', 'moves' => 8],
        ['start' => 'C1', 'end' => 'A3', 'grid_size' => '3x3', 'answer' => 'A3', 'moves' => 4],

        // Coordinate-based challenges
        ['start' => '(0,0)', 'end' => '(3,2)', 'grid_size' => '4x3', 'answer' => '(3,2)', 'moves' => 5],
        ['start' => '(1,1)', 'end' => '(4,4)', 'grid_size' => '5x5', 'answer' => '(4,4)', 'moves' => 6],

        // Direction-based puzzles
        ['start' => 'CENTER', 'end' => 'NORTH-EAST', 'grid_size' => '3x3', 'answer' => 'NE', 'moves' => 2],
        ['start' => 'SOUTH-WEST', 'end' => 'NORTH-EAST', 'grid_size' => '3x3', 'answer' => 'NE', 'moves' => 4],
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
        $request->validate([
            'input' => 'required|string|max:255',
            'puzzle_key' => 'nullable|string'
        ]);

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
            'puzzle_key' => $request->puzzle_key ?? $puzzle['key'] ?? "stage_{$currentStage}",
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
     * Start a new session
     */
    public function start(Request $request, $sessionId)
    {
        $session = GameSession::findOrFail($sessionId);

        if ($session->status !== 'waiting') {
            return response()->json(['message' => 'Session cannot be started'], 400);
        }

        $session->update([
            'status' => 'running',
            'started_at' => now(),
            'stage_started_at' => now(),
            'current_stage' => 1,
            'ends_at' => now()->addMinutes(30) // 30 minutes total time limit
        ]);

        return response()->json([
            'session' => $session->fresh(),
            'message' => 'Session started successfully'
        ]);
    }

    /**
     * Generate puzzle data for a specific stage with randomization
     */
    private function generatePuzzleForStage($stage, $seed = null)
    {
        // Use session seed + stage for consistent puzzles per session
        // But different puzzles across different sessions
        $stageSeed = $seed ? ($seed + $stage * 1000) : time() + $stage;
        mt_srand($stageSeed);

        return match($stage) {
            1 => $this->generatePatternAnalysisPuzzle(),
            2 => $this->generateCodeAnalysisPuzzle(),
            3 => $this->generateNavigationPuzzle(),
            default => $this->generatePatternAnalysisPuzzle()
        };
    }

    /**
     * Generate randomized pattern analysis puzzle
     */
    private function generatePatternAnalysisPuzzle()
    {
        // Randomly select a pattern puzzle
        $selectedPuzzle = $this->patternPuzzles[array_rand($this->patternPuzzles)];

        // Add question mark to sequence
        $pattern = $selectedPuzzle['sequence'];
        $pattern[] = '?';

        return [
            'key' => 'pattern_' . md5(json_encode($selectedPuzzle) . time()),
            'title' => 'Angka Apa Selanjutnya?',
            'description' => 'Lihat deret angka ini. Kamu bisa menebak angka selanjutnya?',
            'type' => 'pattern_analysis',
            'defuserView' => [
                'pattern' => $pattern,
                'hints' => $this->generatePatternHints($selectedPuzzle),
                'sequenceId' => md5(json_encode($selectedPuzzle))
            ],
            'expertView' => [
                'rule' => $selectedPuzzle['rule'],
                'answer' => $selectedPuzzle['answer'],
                'category' => $selectedPuzzle['type'],
                'explanation' => $this->generatePatternExplanation($selectedPuzzle)
            ],
            'learningObjectives' => [
                'Menemukan pola angka yang sederhana',
                'Berpikir tentang angka selanjutnya',
                'Bekerja sama dengan teman untuk memecahkan teka-teki'
            ],
            'answer' => $selectedPuzzle['answer']
        ];
    }

    /**
     * Generate randomized code analysis puzzle
     */
    private function generateCodeAnalysisPuzzle()
    {
        // Randomly select a code puzzle
        $selectedPuzzle = $this->codePuzzles[array_rand($this->codePuzzles)];

        return [
            'key' => 'code_' . md5(json_encode($selectedPuzzle) . time()),
            'title' => 'Temukan Kesalahan',
            'description' => 'Ada yang salah dengan kode ini. Bisakah kamu membantu menemukannya?',
            'type' => 'code_analysis',
            'defuserView' => [
                'cipher' => $selectedPuzzle['cipher'],
                'hints' => $this->generateCodeHints($selectedPuzzle),
                'cipherId' => md5(json_encode($selectedPuzzle))
            ],
            'expertView' => [
                'cipher_type' => $selectedPuzzle['type'],
                'shift' => $selectedPuzzle['shift'],
                'answer' => $selectedPuzzle['answer'],
                'explanation' => $this->generateCodeExplanation($selectedPuzzle)
            ],
            'learningObjectives' => [
                'Memahami konsep enkripsi sederhana',
                'Berpikir logis untuk memecahkan kode',
                'Berkolaborasi dalam pemecahan masalah'
            ],
            'answer' => $selectedPuzzle['answer']
        ];
    }

    /**
     * Generate randomized navigation puzzle
     */
    private function generateNavigationPuzzle()
    {
        // Randomly select a navigation puzzle
        $selectedPuzzle = $this->navigationPuzzles[array_rand($this->navigationPuzzles)];

        return [
            'key' => 'nav_' . md5(json_encode($selectedPuzzle) . time()),
            'title' => 'Navigasi Tantangan',
            'description' => 'Temukan jalan keluar dari maze ini!',
            'type' => 'navigation_challenge',
            'defuserView' => [
                'start_position' => $selectedPuzzle['start'],
                'grid_size' => $selectedPuzzle['grid_size'],
                'max_moves' => $selectedPuzzle['moves'],
                'hints' => $this->generateNavigationHints($selectedPuzzle)
            ],
            'expertView' => [
                'optimal_path' => $this->generateOptimalPath($selectedPuzzle),
                'answer' => $selectedPuzzle['answer'],
                'grid_layout' => $this->generateGridLayout($selectedPuzzle)
            ],
            'learningObjectives' => [
                'Memahami koordinat dan navigasi',
                'Berpikir strategis untuk mencari jalan',
                'Komunikasi yang efektif dalam memberikan petunjuk arah'
            ],
            'answer' => $selectedPuzzle['answer']
        ];
    }

    // Helper methods untuk generate hints, explanations, dll
    private function generatePatternHints($puzzle)
    {
        $hints = [
            'arithmetic' => [
                'Perhatikan selisih antara angka-angka berurutan',
                'Apakah ada pola penambahan yang konsisten?',
                'Coba hitung: angka kedua - angka pertama'
            ],
            'square' => [
                'Apakah angka-angka ini adalah hasil kuadrat?',
                'Coba pikirkan: 1², 2², 3², 4²...',
                'Pola ini berkaitan dengan bilangan kuadrat sempurna'
            ],
            'multiplication' => [
                'Perhatikan rasio antara angka berurutan',
                'Apakah setiap angka dikalikan dengan bilangan yang sama?',
                'Coba bagi angka kedua dengan angka pertama'
            ],
            'fibonacci' => [
                'Coba jumlahkan dua angka sebelumnya',
                'Pola ini seperti deret Fibonacci',
                'Setiap angka adalah hasil penjumlahan dua angka sebelumnya'
            ]
        ];

        return $hints[$puzzle['type']] ?? ['Perhatikan pola dalam deret angka ini'];
    }

    private function generateCodeHints($puzzle)
    {
        $hints = [
            'caesar' => [
                'Ini adalah sandi Caesar',
                "Setiap huruf digeser {$puzzle['shift']} posisi dalam alfabet",
                'Coba geser huruf mundur untuk mendecode'
            ],
            'reverse' => [
                'Kata ini dibalik',
                'Coba baca dari kanan ke kiri',
                'Pola ini adalah kebalikan dari kata asli'
            ]
        ];

        return $hints[$puzzle['type']] ?? ['Ini adalah sandi sederhana'];
    }

    private function generateNavigationHints($puzzle)
    {
        return [
            "Mulai dari posisi {$puzzle['start']}",
            "Target akhir adalah {$puzzle['end']}",
            "Maksimal {$puzzle['moves']} langkah untuk mencapai tujuan",
            "Gunakan koordinat grid {$puzzle['grid_size']}"
        ];
    }

    private function generatePatternExplanation($puzzle)
    {
        $explanations = [
            'arithmetic' => "Ini adalah deret aritmatika dengan pola: {$puzzle['rule']}",
            'square' => "Ini adalah deret bilangan kuadrat: {$puzzle['rule']}",
            'multiplication' => "Ini adalah deret geometri dengan pola: {$puzzle['rule']}",
            'fibonacci' => "Ini adalah deret Fibonacci: {$puzzle['rule']}"
        ];

        return $explanations[$puzzle['type']] ?? "Pola: {$puzzle['rule']}";
    }

    private function generateCodeExplanation($puzzle)
    {
        $explanations = [
            'caesar' => "Sandi Caesar dengan pergeseran {$puzzle['shift']} huruf",
            'reverse' => "Kata yang dibalik dari kata asli"
        ];

        return $explanations[$puzzle['type']] ?? "Metode enkripsi sederhana";
    }

    private function generateOptimalPath($puzzle)
    {
        return "Jalan optimal dari {$puzzle['start']} ke {$puzzle['end']}";
    }

    private function generateGridLayout($puzzle)
    {
        return [
            'size' => $puzzle['grid_size'],
            'start' => $puzzle['start'],
            'end' => $puzzle['end']
        ];
    }

    private function validateAnswer($puzzle, $userInput)
    {
        return strtoupper(trim($userInput)) === strtoupper(trim($puzzle['answer']));
    }

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

    private function calculateCollaborationScore($session)
    {
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
