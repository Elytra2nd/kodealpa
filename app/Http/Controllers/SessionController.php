<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\GameSession;
use App\Models\GameAttempt;
use App\Models\GameParticipant;
use Carbon\Carbon;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Services\JournalWriter;

class SessionController extends Controller
{
    private $stageConfigurations = [
        1 => [
            'title' => 'Stage 1: Pattern Analysis',
            'type' => 'pattern_analysis',
            'maxAttempts' => 3,
            'timeLimit' => 300,
        ],
        2 => [
            'title' => 'Stage 2: Code Analysis',
            'type' => 'code_analysis',
            'maxAttempts' => 3,
            'timeLimit' => 400,
        ],
        3 => [
            'title' => 'Stage 3: Navigation Challenge',
            'type' => 'navigation_challenge',
            'maxAttempts' => 2,
            'timeLimit' => 600,
        ]
    ];

    // Puzzle databases remain the same...
    private $patternPuzzles = [
        ['sequence' => [2, 4, 6, 8], 'answer' => '10', 'type' => 'arithmetic', 'rule' => 'Add 2'],
        ['sequence' => [5, 10, 15, 20], 'answer' => '25', 'type' => 'arithmetic', 'rule' => 'Add 5'],
        ['sequence' => [3, 6, 9, 12], 'answer' => '15', 'type' => 'arithmetic', 'rule' => 'Add 3'],
        ['sequence' => [7, 14, 21, 28], 'answer' => '35', 'type' => 'arithmetic', 'rule' => 'Add 7'],
        ['sequence' => [1, 4, 9, 16], 'answer' => '25', 'type' => 'square', 'rule' => 'Perfect squares'],
        ['sequence' => [4, 9, 16, 25], 'answer' => '36', 'type' => 'square', 'rule' => 'Perfect squares starting from 2²'],
        ['sequence' => [2, 6, 18, 54], 'answer' => '162', 'type' => 'multiplication', 'rule' => 'Multiply by 3'],
        ['sequence' => [3, 6, 12, 24], 'answer' => '48', 'type' => 'multiplication', 'rule' => 'Multiply by 2'],
        ['sequence' => [1, 1, 2, 3], 'answer' => '5', 'type' => 'fibonacci', 'rule' => 'Sum of previous two'],
        ['sequence' => [2, 3, 5, 8], 'answer' => '13', 'type' => 'fibonacci', 'rule' => 'Sum of previous two'],
        ['sequence' => [1, 3, 7, 15], 'answer' => '31', 'type' => 'doubling_plus_one', 'rule' => 'Double and add 1'],
        ['sequence' => [10, 8, 6, 4], 'answer' => '2', 'type' => 'decreasing', 'rule' => 'Subtract 2'],
    ];

    private $codePuzzles = [
        ['cipher' => 'KHOOR', 'answer' => 'HELLO', 'shift' => 3, 'type' => 'caesar'],
        ['cipher' => 'ZRUOG', 'answer' => 'WORLD', 'shift' => 3, 'type' => 'caesar'],
        ['cipher' => 'FRGH', 'answer' => 'CODE', 'shift' => 3, 'type' => 'caesar'],
        ['cipher' => 'SXCCOH', 'answer' => 'PUZZLE', 'shift' => 3, 'type' => 'caesar'],
        ['cipher' => 'IFMMP', 'answer' => 'HELLO', 'shift' => 1, 'type' => 'caesar'],
        ['cipher' => 'XPSME', 'answer' => 'WORLD', 'shift' => 1, 'type' => 'caesar'],
        ['cipher' => 'MJQQT', 'answer' => 'HELLO', 'shift' => 5, 'type' => 'caesar'],
        ['cipher' => 'BTWQI', 'answer' => 'WORLD', 'shift' => 5, 'type' => 'caesar'],
        ['cipher' => 'OLLEH', 'answer' => 'HELLO', 'shift' => 0, 'type' => 'reverse'],
        ['cipher' => 'DLROW', 'answer' => 'WORLD', 'shift' => 0, 'type' => 'reverse'],
    ];

    private $navigationPuzzles = [
        ['start' => 'A1', 'end' => 'C3', 'grid_size' => '3x3', 'answer' => 'C3', 'moves' => 4],
        ['start' => 'B2', 'end' => 'D4', 'grid_size' => '4x4', 'answer' => 'D4', 'moves' => 4],
        ['start' => 'A1', 'end' => 'E5', 'grid_size' => '5x5', 'answer' => 'E5', 'moves' => 8],
        ['start' => 'C1', 'end' => 'A3', 'grid_size' => '3x3', 'answer' => 'A3', 'moves' => 4],
        ['start' => '(0,0)', 'end' => '(3,2)', 'grid_size' => '4x3', 'answer' => '(3,2)', 'moves' => 5],
        ['start' => '(1,1)', 'end' => '(4,4)', 'grid_size' => '5x5', 'answer' => '(4,4)', 'moves' => 6],
        ['start' => 'CENTER', 'end' => 'NORTH-EAST', 'grid_size' => '3x3', 'answer' => 'NE', 'moves' => 2],
        ['start' => 'SOUTH-WEST', 'end' => 'NORTH-EAST', 'grid_size' => '3x3', 'answer' => 'NE', 'moves' => 4],
    ];

    /**
     * Create new session
     */
    public function create(Request $request)
    {
        try {
            $request->validate([
                'stage_id' => 'nullable|integer|min:1|max:3'
            ]);

            $stageId = $request->input('stage_id', 1);
            if (!isset($this->stageConfigurations[$stageId])) {
                $stageId = 1;
            }

            do {
                $teamCode = strtoupper(Str::random(6));
            } while (GameSession::where('team_code', $teamCode)->exists());

            $seed = rand(10000, 99999);

            $session = GameSession::create([
                'team_code' => $teamCode,
                'status' => 'waiting',
                'stage_id' => $stageId,
                'current_stage' => $stageId,
                'seed' => $seed,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Log session creation
            activity()
                ->causedBy(auth()->id())
                ->performedOn($session)
                ->withProperties([
                    'scope' => 'session_create',
                    'session_id' => $session->id,
                    'team_code' => $teamCode,
                    'stage_id' => $stageId,
                ])
                ->log('session_created');

            Log::info('Session created successfully', [
                'session_id' => $session->id,
                'team_code' => $teamCode,
                'user_id' => auth()->id(),
                'stage_id' => $stageId
            ]);

            return response()->json([
                'success' => true,
                'session' => $session,
                'team_code' => $teamCode,
                'message' => 'Session created successfully'
            ], 201);
        } catch (\Exception $e) {
            Log::error('Session creation failed: ' . $e->getMessage(), [
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create session: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Join existing session
     */
    public function join(Request $request)
    {
        try {
            $request->validate([
                'team_code' => 'required|string|size:6',
                'role' => 'required|in:defuser,expert',
                'nickname' => 'required|string|max:50'
            ]);

            $teamCode = strtoupper(trim($request->team_code));

            $session = GameSession::where('team_code', $teamCode)
                                 ->where('status', 'waiting')
                                 ->first();

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found or not available to join'
                ], 404);
            }

            $existingParticipant = GameParticipant::where('game_session_id', $session->id)
                                                 ->where('role', $request->role)
                                                 ->first();

            if ($existingParticipant) {
                return response()->json([
                    'success' => false,
                    'message' => "Role '{$request->role}' is already taken in this session"
                ], 400);
            }

            $userParticipant = GameParticipant::where('game_session_id', $session->id)
                                             ->where('user_id', auth()->id())
                                             ->first();

            if ($userParticipant) {
                return response()->json([
                    'success' => false,
                    'message' => 'You have already joined this session'
                ], 400);
            }

            $participant = GameParticipant::create([
                'game_session_id' => $session->id,
                'user_id' => auth()->id(),
                'role' => $request->role,
                'nickname' => $request->nickname,
                'joined_at' => now()
            ]);

            // Log participant join
            activity()
                ->causedBy(auth()->id())
                ->performedOn($session)
                ->withProperties([
                    'scope' => 'session_join',
                    'session_id' => $session->id,
                    'participant_id' => $participant->id,
                    'role' => $request->role,
                    'nickname' => $request->nickname,
                ])
                ->log('participant_joined');

            Log::info('User joined session', [
                'session_id' => $session->id,
                'user_id' => auth()->id(),
                'role' => $request->role,
                'team_code' => $teamCode
            ]);

            return response()->json([
                'success' => true,
                'session' => $session->fresh(['participants']),
                'participant' => $participant,
                'message' => 'Successfully joined the session'
            ]);
        } catch (\Exception $e) {
            Log::error('Session join failed: ' . $e->getMessage(), [
                'user_id' => auth()->id(),
                'team_code' => $request->team_code ?? null,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to join session: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get session participants
     */
    public function getParticipants($sessionId)
    {
        try {
            $session = GameSession::findOrFail($sessionId);
            $participants = GameParticipant::where('game_session_id', $sessionId)
                                         ->with('user:id,name,email')
                                         ->get();

            return response()->json([
                'session' => $session,
                'participants' => $participants,
                'total_participants' => $participants->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get participants'
            ], 500);
        }
    }

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

        $attempt = GameAttempt::create([
            'game_session_id' => $sessionId,
            'stage' => $currentStage,
            'input' => $request->input,
            'is_correct' => $isCorrect,
            'puzzle_key' => $request->puzzle_key ?? $puzzle['key'] ?? "stage_{$currentStage}",
        ]);

        // Log attempt activity
        activity()
            ->causedBy(auth()->id())
            ->performedOn($session)
            ->withProperties([
                'scope' => 'game_attempt',
                'session_id' => $sessionId,
                'attempt_id' => $attempt->id,
                'stage' => $currentStage,
                'is_correct' => $isCorrect,
                'input' => $request->input,
            ])
            ->log($isCorrect ? 'attempt_correct' : 'attempt_incorrect');

        if ($isCorrect) {
            return $this->handleStageCompletion($session, $currentStage);
        }

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
            'ends_at' => now()->addMinutes(30)
        ]);

        // Log activity: session_started
        activity()
            ->causedBy(auth()->id())
            ->performedOn($session)
            ->withProperties([
                'scope' => 'session_start',
                'session_id' => $session->id,
                'started_at' => now()->toISOString(),
            ])
            ->log('session_started');

        return response()->json([
            'session' => $session->fresh(),
            'message' => 'Session started successfully'
        ]);
    }

    /**
     * Force end/close a session
     */
    public function endSession($id)
    {
        $session = GameSession::with('attempts')->findOrFail($id);

        if (in_array($session->status, ['success','failed','ended'])) {
            return response()->json([
                'session' => $session,
                'message' => 'Session already finalized'
            ]);
        }

        $session->update([
            'status' => 'ended',
            'completed_at' => now(),
        ]);

        // FIX: Use fresh() dengan relation
        $this->finalizeAndJournal($session->fresh('attempts'), 'ended', $session->failed_stage);

        return response()->json([
            'session' => $session->fresh(),
            'message' => 'Session ended'
        ]);
    }

    /**
     * Private: finalize and write journal + activity in a transaction
     */
    private function finalizeAndJournal(GameSession $session, string $status, ?int $failedStage = null): void
    {
        DB::transaction(function () use ($session, $status, $failedStage) {
            $attempts = $session->attempts()->get();
            $totalAttempts = $attempts->count();
            $correctAttempts = $attempts->where('is_correct', true)->count();
            $accuracy = $totalAttempts > 0 ? round(($correctAttempts / max(1, $totalAttempts)) * 100, 2) : null;

            $started = $session->started_at ?? $session->created_at ?? now();
            $completed = $session->completed_at ?? now();
            $timeTaken = $started instanceof Carbon && $completed instanceof Carbon
                ? $started->diffInSeconds($completed)
                : null;

            $meta = [
                'stages_completed' => $session->stages_completed ?? [],
                'failed_stage' => $failedStage,
                'total_attempts' => $totalAttempts,
                'correct_attempts' => $correctAttempts,
                'ended_by' => auth()->id(),
            ];

            // Write to journal
            JournalWriter::logSessionComplete([
                'user_id'    => auth()->id(),
                'session_id' => $session->id,
                'title'      => 'Dungeon Run #'.$session->id,
                'status'     => $status,
                'score'      => $session->total_score ?? null,
                'time_taken' => $timeTaken,
                'accuracy'   => $accuracy,
                'hints_used' => null,
                'meta'       => $meta,
            ]);

            // Log finalization activity
            activity()
                ->causedBy(auth()->id())
                ->performedOn($session)
                ->withProperties([
                    'scope' => 'session_finalize',
                    'session_id' => $session->id,
                    'status' => $status,
                    'time_taken' => $timeTaken,
                    'accuracy' => $accuracy,
                    'failed_stage' => $failedStage,
                    'total_score' => $session->total_score,
                ])
                ->log('session_finalized');
        });
    }

    /**
     * Generate puzzle data for a specific stage with randomization
     */
    private function generatePuzzleForStage($stage, $seed = null)
    {
        $stageSeed = $seed ? ($seed + $stage * 1000) : time() + $stage;
        mt_srand($stageSeed);

        return match($stage) {
            1 => $this->generatePatternAnalysisPuzzle(),
            2 => $this->generateCodeAnalysisPuzzle(),
            3 => $this->generateNavigationPuzzle(),
            default => $this->generatePatternAnalysisPuzzle()
        };
    }

    private function generatePatternAnalysisPuzzle()
    {
        $selectedPuzzle = $this->patternPuzzles[array_rand($this->patternPuzzles)];
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

    private function generateCodeAnalysisPuzzle()
    {
        $selectedPuzzle = $this->codePuzzles[array_rand($this->codePuzzles)];

        return [
            'key' => 'code_' . md5(json_encode($selectedPuzzle) . time()),
            'title' => 'Temukan Kesalahan',
            'description' => 'Ada yang salah dengan kode ini. Bisakah kamu membantu menemukannya?',
            'type' => 'code_analysis',
            'defuserView' => [
                'cipher' => $selectedPuzzle['cipher'],
                'cipherText' => $selectedPuzzle['cipher'],
                'codeLines' => [$selectedPuzzle['cipher']],
                'hints' => $this->generateCodeHints($selectedPuzzle),
                'cipherId' => md5(json_encode($selectedPuzzle))
            ],
            'expertView' => [
                'cipher_type' => $selectedPuzzle['type'],
                'shift' => $selectedPuzzle['shift'],
                'answer' => $selectedPuzzle['answer'],
                'explanation' => $this->generateCodeExplanation($selectedPuzzle),
                'solution' => $selectedPuzzle['answer']
            ],
            'learningObjectives' => [
                'Memahami konsep enkripsi sederhana',
                'Berpikir logis untuk memecahkan kode',
                'Berkolaborasi dalam pemecahan masalah'
            ],
            'answer' => $selectedPuzzle['answer']
        ];
    }

    private function getSolutionMethod($puzzle)
    {
        switch ($puzzle['type']) {
            case 'caesar':
                return "Sandi Caesar: Geser setiap huruf mundur {$puzzle['shift']} posisi dalam alfabet";
            case 'reverse':
                return "Teks Terbalik: Baca dari kanan ke kiri";
            default:
                return "Metode dekripsi tidak diketahui";
        }
    }

    private function getDecryptionSteps($puzzle)
    {
        switch ($puzzle['type']) {
            case 'caesar':
                return [
                    "1. Identifikasi ini adalah sandi Caesar dengan pergeseran {$puzzle['shift']}",
                    "2. Untuk setiap huruf, geser mundur {$puzzle['shift']} posisi",
                    "3. Contoh: " . $puzzle['cipher'][0] . " → " . $puzzle['answer'][0],
                    "4. Hasil akhir: {$puzzle['answer']}"
                ];
            case 'reverse':
                return [
                    "1. Identifikasi bahwa teks ini dibalik",
                    "2. Baca karakter dari kanan ke kiri",
                    "3. {$puzzle['cipher']} dibaca terbalik menjadi {$puzzle['answer']}"
                ];
            default:
                return ["Langkah dekripsi tidak tersedia"];
        }
    }

    private function getExpertHints($puzzle)
    {
        return [
            "Bantu Defuser dengan memberikan petunjuk bertahap",
            "Jangan langsung berikan jawaban",
            "Tanyakan apa yang dilihat Defuser",
            "Jelaskan konsep enkripsi sederhana"
        ];
    }

    private function generateNavigationPuzzle()
    {
        $selectedPuzzle = $this->navigationPuzzles[array_rand($this->navigationPuzzles)];
        $targetValue = rand(1, 20);
        $correctPath = ['ROOT', 'LEFT', 'RIGHT'];

        return [
            'key' => 'nav_' . md5(json_encode($selectedPuzzle) . time()),
            'title' => 'Navigasi Tantangan',
            'description' => 'Temukan jalan dalam struktur tree!',
            'type' => 'navigation_challenge',
            'defuserView' => [
                'task' => "Navigate through the tree to find the target value: {$targetValue}",
                'traversalOptions' => ['LEFT', 'RIGHT', 'UP', 'DOWN'],
                'startPosition' => 'ROOT',
                'targetValue' => $targetValue,
                'hints' => [
                    'Start from the root node',
                    'Use LEFT to go to left child',
                    'Use RIGHT to go to right child',
                    'Ask Expert for tree structure guidance'
                ]
            ],
            'expertView' => [
                'tree' => [
                    'root' => [
                        'value' => 10,
                        'left' => [
                            'value' => 5,
                            'left' => ['value' => 3, 'left' => null, 'right' => null],
                            'right' => ['value' => 7, 'left' => null, 'right' => null]
                        ],
                        'right' => [
                            'value' => 15,
                            'left' => ['value' => 12, 'left' => null, 'right' => null],
                            'right' => ['value' => 20, 'left' => null, 'right' => null]
                        ]
                    ]
                ],
                'answer' => $correctPath,
                'explanation' => "To find {$targetValue}, follow path: " . implode(' → ', $correctPath),
                'traversalMethods' => [
                    'inorder' => [3, 5, 7, 10, 12, 15, 20],
                    'preorder' => [10, 5, 3, 7, 15, 12, 20],
                    'postorder' => [3, 7, 5, 12, 20, 15, 10]
                ],
                'hints' => [
                    'Guide the Defuser through tree navigation',
                    'Explain binary search tree properties',
                    'Help them understand left/right decisions'
                ]
            ],
            'learningObjectives' => [
                'Memahami struktur data tree',
                'Belajar navigasi binary search tree',
                'Berkolaborasi dalam problem solving'
            ],
            'answer' => implode(',', $correctPath)
        ];
    }

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

        // Finalize + journal dengan fresh
        $this->finalizeAndJournal($session->fresh('attempts'), 'failed', $stage);

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

        // Log stage completion
        activity()
            ->causedBy(auth()->id())
            ->performedOn($session)
            ->withProperties([
                'scope' => 'stage_complete',
                'session_id' => $session->id,
                'stage' => $completedStage,
                'stage_score' => $stageScore,
                'total_score' => $totalScore,
            ])
            ->log('stage_completed');

        if ($completedStage >= count($this->stageConfigurations)) {
            // All stages completed - Game success
            $session->update([
                'status' => 'success',
                'completed_at' => now(),
                'stages_completed' => $stagesCompleted,
                'total_score' => $totalScore,
                'collaboration_score' => $this->calculateCollaborationScore($session)
            ]);

            // Finalize + journal
            $this->finalizeAndJournal($session->fresh('attempts'), 'success', null);

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
        if ($totalTime < 20) {
            $collaborationScore += 25;
        }

        return max(0, $collaborationScore);
    }
}
