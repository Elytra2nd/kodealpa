<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StageController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\VoiceChatController;
use App\Http\Controllers\TournamentController;
use App\Http\Controllers\GrimoireController;
use App\Http\Controllers\JournalController; // ✅ Explorer Journal
use App\Http\Controllers\Auth\GoogleAuthController; // ✅ Google OAuth
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// Halaman Welcome default
Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Halaman Dashboard
Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

// Profile routes
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

/*
|--------------------------------------------------------------------------
| Game Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->group(function () {
    // Game lobby
    Route::get('/game', function () {
        return Inertia::render('Game/GameLobby');
    })->name('game.lobby');

    // Game session
    Route::get('/game/session/{id}', function ($id) {
        return Inertia::render('Game/GameSession', [
            'sessionId' => (int) $id,
            'role' => request('role'),
            'participantId' => request('participantId'),
        ]);
    })->name('game.session');

    // Game analytics page
    Route::get('/game/analytics/{id}', function ($id) {
        return Inertia::render('Game/GameAnalytics', [
            'sessionId' => (int) $id,
        ]);
    })->name('game.analytics');

    // Game results/summary page
    Route::get('/game/results/{id}', function ($id) {
        return Inertia::render('Game/GameResults', [
            'sessionId' => (int) $id,
        ]);
    })->name('game.results');

    /*
    |--------------------------------------------------------------------------
    | Tournament Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('game/tournament')->name('game.tournament.')->group(function () {
        // Tournament lobby - Main tournament interface
        Route::get('/', function () {
            return Inertia::render('Game/TournamentLobby');
        })->name('lobby');

        // Tournament session - Active tournament gameplay
        Route::get('/{id}', function ($id) {
            return Inertia::render('Game/TournamentSession', [
                'tournamentId' => (int) $id,
                'groupId' => request('groupId'),
            ]);
        })->name('session')->where('id', '[0-9]+');

        // Tournament leaderboard - Real-time rankings
        Route::get('/{id}/leaderboard', function ($id) {
            return Inertia::render('Game/TournamentLeaderboard', [
                'tournamentId' => (int) $id,
            ]);
        })->name('leaderboard')->where('id', '[0-9]+');

        // Tournament bracket - Tournament structure view
        Route::get('/{id}/bracket', function ($id) {
            return Inertia::render('Game/TournamentBracket', [
                'tournamentId' => (int) $id,
            ]);
        })->name('bracket')->where('id', '[0-9]+');

        // Tournament history - Past tournaments
        Route::get('/history', function () {
            return Inertia::render('Game/TournamentHistory');
        })->name('history');

        // Tournament spectator mode
        Route::get('/{id}/spectate', function ($id) {
            return Inertia::render('Game/TournamentSpectator', [
                'tournamentId' => (int) $id,
            ]);
        })->name('spectate')->where('id', '[0-9]+');

        // Tournament analytics
        Route::get('/{id}/analytics', function ($id) {
            return Inertia::render('Game/TournamentAnalytics', [
                'tournamentId' => (int) $id,
            ]);
        })->name('analytics')->where('id', '[0-9]+');
    });

    // Voice Chat Routes
    Route::prefix('voice')->name('voice.')->group(function () {
        // Voice chat lobby (for testing microphone before joining session)
        Route::get('/lobby', function () {
            return Inertia::render('Game/VoiceLobby');
        })->name('lobby');

        // Voice chat test page
        Route::get('/test', function () {
            return Inertia::render('Game/VoiceTest');
        })->name('test');

        // Voice chat settings
        Route::get('/settings', function () {
            return Inertia::render('Game/VoiceSettings');
        })->name('settings');
    });
});

// Legacy route untuk backward compatibility
Route::get('/stage1', function () {
    return redirect()->route('game.lobby');
})->middleware(['auth', 'verified'])->name('stage1');

/*
|--------------------------------------------------------------------------
| Grimoire Pedoman - Web Routes (Inertia)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->prefix('grimoire')->name('grimoire.')->group(function () {
    // Panel utama Grimoire
    Route::get('/', function () {
        return Inertia::render('Grimoire/GrimoirePanel'); // resources/js/Pages/Grimoire/GrimoirePanel.tsx
    })->name('panel');

    // Editor (admin only)
    Route::get('/editor', function () {
        return Inertia::render('Grimoire/GrimoireEditor'); // resources/js/Pages/Grimoire/GrimoireEditor.tsx
    })->middleware('can:admin')->name('editor');

    // Viewer langsung per slug
    Route::get('/view/{slug}', function ($slug) {
        return Inertia::render('Grimoire/GrimoireView', [
            'slug' => $slug,
        ]);
    })->name('view');
});

// Integrasi ke menu Game → Grimoire
Route::middleware(['auth', 'verified'])->get('/game/grimoire', function () {
    return Inertia::render('Grimoire/GrimoirePanel');
})->name('game.grimoire');

/*
|--------------------------------------------------------------------------
| Catatan Penjelajah - Web Routes (Inertia)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth','verified'])->prefix('game')->group(function () {
    // Halaman riwayat utama
    Route::get('/journal', function () {
        return Inertia::render('Game/ExplorerJournal'); // resources/js/Pages/Game/ExplorerJournal.tsx
    })->name('game.journal');

    // Halaman detail (opsional)
    Route::get('/journal/{id}', function ($id) {
        return Inertia::render('Game/ExplorerJournalDetail', [
            'id' => (int) $id,
        ]);
    })->where('id','[0-9]+')->name('game.journal.detail');
});

/*
|--------------------------------------------------------------------------
| API Routes untuk Game
|--------------------------------------------------------------------------
*/
Route::prefix('api')->middleware(['auth', 'verified'])->group(function () {
    // Stage management
    Route::get('/stages', [StageController::class, 'index'])->name('api.stages.index');
    Route::get('/stages/{id}', [StageController::class, 'show'])->name('api.stages.show');

    // Session management
    Route::post('/sessions', [SessionController::class, 'create'])->name('api.sessions.create');
    Route::post('/sessions/join', [SessionController::class, 'join'])->name('api.sessions.join');
    Route::post('/sessions/{id}/start', [SessionController::class, 'start'])->name('api.sessions.start');
    Route::get('/sessions/{id}/state', [SessionController::class, 'state'])->name('api.sessions.state');
    Route::post('/sessions/{id}/attempt', [SessionController::class, 'attempt'])->name('api.sessions.attempt');

    // Stage 2 new features
    Route::post('/sessions/{id}/hint', [SessionController::class, 'provideHint'])->name('api.sessions.hint');
    Route::post('/sessions/{id}/feedback', [SessionController::class, 'provideFeedback'])->name('api.sessions.feedback');
    Route::get('/sessions/{id}/analytics', [SessionController::class, 'getAnalytics'])->name('api.sessions.analytics');

    // Session management actions
    Route::patch('/sessions/{id}/pause', [SessionController::class, 'pauseSession'])->name('api.sessions.pause');
    Route::patch('/sessions/{id}/resume', [SessionController::class, 'resumeSession'])->name('api.sessions.resume');
    Route::delete('/sessions/{id}', [SessionController::class, 'endSession'])->name('api.sessions.end');

    // Participant management
    Route::get('/sessions/{id}/participants', [SessionController::class, 'getParticipants'])->name('api.sessions.participants');
    Route::delete('/sessions/{sessionId}/participants/{participantId}', [SessionController::class, 'removeParticipant'])->name('api.sessions.participants.remove');

    // Learning progress tracking
    Route::get('/sessions/{id}/progress', [SessionController::class, 'getLearningProgress'])->name('api.sessions.progress');
    Route::post('/sessions/{id}/progress', [SessionController::class, 'updateLearningProgress'])->name('api.sessions.progress.update');

    /*
    |--------------------------------------------------------------------------
    | Tournament API Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('tournaments')->name('api.tournaments.')->group(function () {
        // Core tournament management
        Route::get('/', [TournamentController::class, 'index'])->name('index');
        Route::post('/', [TournamentController::class, 'create'])->name('create');
        Route::get('/{id}', [TournamentController::class, 'show'])->name('show')->where('id', '[0-9]+');

        // Tournament participation
        Route::post('/{id}/join', [TournamentController::class, 'join'])->name('join')->where('id', '[0-9]+');
        Route::delete('/{id}/leave', [TournamentController::class, 'leave'])->name('leave')->where('id', '[0-9]+');

        // Tournament session management
        Route::get('/{id}/session', [TournamentController::class, 'getSession'])->name('session')->where('id', '[0-9]+');
        Route::post('/sessions/{sessionId}/complete', [TournamentController::class, 'sessionCompleted'])->name('session.complete')->where('sessionId', '[0-9]+');

        // Tournament data and analytics
        Route::get('/{id}/leaderboard', [TournamentController::class, 'leaderboard'])->name('leaderboard')->where('id', '[0-9]+');
        Route::get('/{id}/bracket', [TournamentController::class, 'getBracket'])->name('bracket')->where('id', '[0-9]+');
        Route::get('/{id}/status', [TournamentController::class, 'getStatus'])->name('status')->where('id', '[0-9]+');
        Route::get('/{id}/analytics', [TournamentController::class, 'getAnalytics'])->name('analytics')->where('id', '[0-9]+');

        // Tournament administration (for hosts/admins)
        Route::post('/{id}/start', [TournamentController::class, 'startTournament'])->name('start')->where('id', '[0-9]+');
        Route::post('/{id}/pause', [TournamentController::class, 'pauseTournament'])->name('pause')->where('id', '[0-9]+');
        Route::post('/{id}/resume', [TournamentController::class, 'resumeTournament'])->name('resume')->where('id', '[0-9]+');
        Route::delete('/{id}', [TournamentController::class, 'cancelTournament'])->name('cancel')->where('id', '[0-9]+');

        // Tournament group management
        Route::get('/{id}/groups', [TournamentController::class, 'getGroups'])->name('groups')->where('id', '[0-9]+');
        Route::post('/{id}/groups/{groupId}/kick/{participantId}', [TournamentController::class, 'kickParticipant'])
            ->name('groups.kick')->where(['id' => '[0-9]+', 'groupId' => '[0-9]+', 'participantId' => '[0-9]+']);

        // Tournament spectator features
        Route::get('/{id}/spectate', [TournamentController::class, 'getSpectatorData'])->name('spectate')->where('id', '[0-9]+');
        Route::get('/active', [TournamentController::class, 'getActiveTournaments'])->name('active');
        Route::get('/upcoming', [TournamentController::class, 'getUpcomingTournaments'])->name('upcoming');
        Route::get('/completed', [TournamentController::class, 'getCompletedTournaments'])->name('completed');

        // Tournament statistics and history
        Route::get('/stats/global', [TournamentController::class, 'getGlobalStats'])->name('stats.global');
        Route::get('/stats/user/{userId}', [TournamentController::class, 'getUserStats'])->name('stats.user')->where('userId', '[0-9]+');
        Route::get('/history/user', [TournamentController::class, 'getUserHistory'])->name('history.user');
    });

    /*
    |--------------------------------------------------------------------------
    | Grimoire Pedoman - API Routes (JSON)
    |--------------------------------------------------------------------------
    */
    Route::prefix('grimoire')->name('api.grimoire.')->group(function () {
        // Publik (read-only) untuk user login (parent sudah auth+verified)
        Route::get('/categories', [GrimoireController::class, 'categories'])->name('categories');
        Route::get('/entries', [GrimoireController::class, 'index'])->name('entries.index'); // ?category=&q=&role=
        Route::get('/entries/{slug}', [GrimoireController::class, 'show'])->name('entries.show');
        Route::get('/search', [GrimoireController::class, 'search'])->name('search');

        // Admin-only CRUD
        Route::middleware('can:admin')->group(function () {
            Route::post('/entries', [GrimoireController::class, 'store'])->name('entries.store');
            Route::put('/entries/{id}', [GrimoireController::class, 'update'])->name('entries.update');
            Route::delete('/entries/{id}', [GrimoireController::class, 'destroy'])->name('entries.destroy');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Catatan Penjelajah (Explorer Journal) - API Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('journal')->name('api.journal.')->group(function () {
        Route::get('/', [JournalController::class, 'index'])->name('index'); // list + filter + paginate
        Route::get('/stats', [JournalController::class, 'stats'])->name('stats'); // ringkasan
        Route::get('/{id}', [JournalController::class, 'show'])->where('id','[0-9]+')->name('show'); // detail
    });

    /*
    |--------------------------------------------------------------------------
    | Voice Chat API Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('voice')->name('api.voice.')->group(function () {
        // Voice chat authentication and tokens
        Route::get('/token', [VoiceChatController::class, 'getToken'])->name('token');
        Route::get('/lobby/token', [VoiceChatController::class, 'getLobbyToken'])->name('lobby.token');

        // Session-specific voice chat
        Route::get('/{sessionId}/token', [VoiceChatController::class, 'getVoiceToken'])->name('session.token');
        Route::get('/{sessionId}/participants', [VoiceChatController::class, 'getParticipants'])->name('session.participants');
        Route::post('/{sessionId}/join', [VoiceChatController::class, 'joinVoiceSession'])->name('session.join');
        Route::post('/{sessionId}/leave', [VoiceChatController::class, 'leaveVoiceSession'])->name('session.leave');

        // Voice chat status and management
        Route::get('/{sessionId}/status', [VoiceChatController::class, 'getVoiceStatus'])->name('session.status');
        Route::post('/{sessionId}/mute', [VoiceChatController::class, 'toggleMute'])->name('session.mute');
        Route::post('/{sessionId}/volume', [VoiceChatController::class, 'setVolume'])->name('session.volume');

        // Voice chat analytics
        Route::get('/{sessionId}/analytics', [VoiceChatController::class, 'getVoiceAnalytics'])->name('session.analytics');
        Route::post('/{sessionId}/report', [VoiceChatController::class, 'reportVoiceIssue'])->name('session.report');

        // Voice quality and testing
        Route::post('/test/connection', [VoiceChatController::class, 'testConnection'])->name('test.connection');
        Route::post('/test/audio', [VoiceChatController::class, 'testAudio'])->name('test.audio');
        Route::get('/servers', [VoiceChatController::class, 'getVoiceServers'])->name('servers');

        // Voice chat settings
        Route::get('/settings', [VoiceChatController::class, 'getVoiceSettings'])->name('settings.get');
        Route::post('/settings', [VoiceChatController::class, 'updateVoiceSettings'])->name('settings.update');

        // Voice chat moderation (for hosts)
        Route::post('/{sessionId}/kick/{userId}', [VoiceChatController::class, 'kickFromVoice'])->name('session.kick');
        Route::post('/{sessionId}/mute/{userId}', [VoiceChatController::class, 'muteUser'])->name('session.mute.user');
        Route::post('/{sessionId}/unmute/{userId}', [VoiceChatController::class, 'unmuteUser'])->name('session.unmute.user');
    });

    /*
    |--------------------------------------------------------------------------
    | WebRTC Signaling API Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('signaling')->name('api.signaling.')->group(function () {
        // WebRTC signaling endpoints
        Route::post('/{sessionId}/offer', [VoiceChatController::class, 'handleOffer'])->name('offer');
        Route::post('/{sessionId}/answer', [VoiceChatController::class, 'handleAnswer'])->name('answer');
        Route::post('/{sessionId}/ice-candidate', [VoiceChatController::class, 'handleIceCandidate'])->name('ice-candidate');

        // Signaling server status
        Route::get('/status', [VoiceChatController::class, 'getSignalingStatus'])->name('status');
    });
});

/*
|--------------------------------------------------------------------------
| WebSocket Routes untuk Real-time Updates
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->prefix('ws')->group(function () {
    // WebSocket endpoint untuk voice chat signaling
    Route::get('/voice/{sessionId}', [VoiceChatController::class, 'websocketHandler'])
        ->name('ws.voice.session')
        ->where('sessionId', '[0-9]+');

    // WebSocket untuk lobby voice chat
    Route::get('/voice/lobby', [VoiceChatController::class, 'lobbyWebsocketHandler'])
        ->name('ws.voice.lobby');

    // WebSocket untuk voice chat status updates
    Route::get('/voice/{sessionId}/status', [VoiceChatController::class, 'statusWebsocketHandler'])
        ->name('ws.voice.status');

    // Tournament real-time updates
    Route::get('/tournament/{tournamentId}', [TournamentController::class, 'websocketHandler'])
        ->name('ws.tournament.updates')
        ->where('tournamentId', '[0-9]+');

    // Tournament leaderboard real-time updates
    Route::get('/tournament/{tournamentId}/leaderboard', [TournamentController::class, 'leaderboardWebsocketHandler'])
        ->name('ws.tournament.leaderboard')
        ->where('tournamentId', '[0-9]+');
});

/*
|--------------------------------------------------------------------------
| Additional Game Features Routes (Enhanced)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->prefix('game')->group(function () {
    // Leaderboard (Enhanced dengan tournament rankings)
    Route::get('/leaderboard', function () {
        return Inertia::render('Game/Leaderboard');
    })->name('game.leaderboard');

    // How to play guide (dengan tournament dan voice chat guide)
    Route::get('/guide', function () {
        return Inertia::render('Game/GameGuide');
    })->name('game.guide');

    // Game history (dengan tournament history dan voice chat statistics)
    Route::get('/history', function () {
        return Inertia::render('Game/GameHistory');
    })->name('game.history');

    // Enhanced settings dengan tournament dan voice chat options
    Route::get('/settings', function () {
        return Inertia::render('Game/GameSettings');
    })->name('game.settings');

    // Statistics dashboard
    Route::get('/stats', function () {
        return Inertia::render('Game/GameStats');
    })->name('game.stats');

    // Tournament specific features
    Route::prefix('tournament')->name('game.tournament.')->group(function () {
        // Tournament guide dan tutorial
        Route::get('/guide', function () {
            return Inertia::render('Game/TournamentGuide');
        })->name('guide');

        // Tournament rules dan regulations
        Route::get('/rules', function () {
            return Inertia::render('Game/TournamentRules');
        })->name('rules');

        // Tournament statistics
        Route::get('/stats', function () {
            return Inertia::render('Game/TournamentStats');
        })->name('stats');
    });

    // Voice Chat specific features
    Route::prefix('voice')->name('game.voice.')->group(function () {
        // Voice chat tutorial
        Route::get('/tutorial', function () {
            return Inertia::render('Game/VoiceTutorial');
        })->name('tutorial');

        // Voice chat troubleshooting
        Route::get('/troubleshoot', function () {
            return Inertia::render('Game/VoiceTroubleshoot');
        })->name('troubleshoot');

        // Voice chat feedback
        Route::get('/feedback', function () {
            return Inertia::render('Game/VoiceFeedback');
        })->name('feedback');

        // Voice chat analytics dashboard
        Route::get('/analytics', function () {
            return Inertia::render('Game/VoiceAnalytics');
        })->name('analytics');
    });
});

/*
|--------------------------------------------------------------------------
| Health Check Routes
|--------------------------------------------------------------------------
*/
Route::prefix('health')->name('health.')->group(function () {
    // Voice chat system health check
    Route::get('/voice', [VoiceChatController::class, 'healthCheck'])->name('voice');

    // WebRTC signaling server health
    Route::get('/signaling', [VoiceChatController::class, 'signalingHealthCheck'])->name('signaling');

    // Voice server connectivity check
    Route::get('/voice/servers', [VoiceChatController::class, 'serversHealthCheck'])->name('voice.servers');

    // Tournament system health check
    Route::get('/tournaments', [TournamentController::class, 'healthCheck'])->name('tournaments');

    // Overall system health
    Route::get('/system', function () {
        return response()->json([
            'status' => 'healthy',
            'timestamp' => now()->toISOString(),
            'services' => [
                'database' => 'online',
                'voice_chat' => 'online',
                'tournaments' => 'online',
                'signaling' => 'online',
            ]
        ]);
    })->name('system');
});

/*
|--------------------------------------------------------------------------
| API Documentation Routes
|--------------------------------------------------------------------------
*/
Route::prefix('docs')->name('docs.')->group(function () {
    // Voice chat API documentation
    Route::get('/voice-api', function () {
        return Inertia::render('Docs/VoiceChatAPI');
    })->name('voice.api');

    // WebRTC implementation guide
    Route::get('/webrtc-guide', function () {
        return Inertia::render('Docs/WebRTCGuide');
    })->name('webrtc.guide');

    // Voice chat troubleshooting guide
    Route::get('/voice-troubleshoot', function () {
        return Inertia::render('Docs/VoiceTroubleshoot');
    })->name('voice.troubleshoot');

    // Tournament API documentation
    Route::get('/tournament-api', function () {
        return Inertia::render('Docs/TournamentAPI');
    })->name('tournament.api');

    // Tournament rules and format guide
    Route::get('/tournament-guide', function () {
        return Inertia::render('Docs/TournamentGuide');
    })->name('tournament.guide');

    // Complete API documentation
    Route::get('/api', function () {
        return Inertia::render('Docs/APIDocumentation');
    })->name('api');
});

/*
|--------------------------------------------------------------------------
| Real-time Streaming Routes (untuk Spectator Mode)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->prefix('stream')->group(function () {
    // Tournament live stream
    Route::get('/tournament/{id}', [TournamentController::class, 'streamTournament'])
         ->name('stream.tournament')
         ->where('id', '[0-9]+');

    // Session live stream (untuk spectators)
    Route::get('/session/{id}', [SessionController::class, 'streamSession'])
         ->name('stream.session')
         ->where('id', '[0-9]+');
});

/*
|--------------------------------------------------------------------------
| Google Authentication Routes
|--------------------------------------------------------------------------
*/
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('google.callback');

require __DIR__.'/auth.php';
