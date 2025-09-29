<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StageController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\VoiceChatController;
use App\Http\Controllers\TournamentController;
use App\Http\Controllers\GrimoireController;
use App\Http\Controllers\JournalController;
use App\Http\Controllers\AchievementsController;
use App\Http\Controllers\Auth\GoogleAuthController;
use Illuminate\Support\Facades\Storage;
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

Route::get('/files/{path}', function ($path) {
    if (!Storage::disk('public')->exists($path)) {
        abort(404);
    }
    return response()->file(storage_path('app/public/' . $path));
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
        Route::get('/', function () {
            return Inertia::render('Game/TournamentLobby');
        })->name('lobby');

        Route::get('/{id}', function ($id) {
            return Inertia::render('Game/TournamentSession', [
                'tournamentId' => (int) $id,
                'groupId' => request('groupId'),
            ]);
        })->name('session')->where('id', '[0-9]+');

        Route::get('/{id}/leaderboard', function ($id) {
            return Inertia::render('Game/TournamentLeaderboard', [
                'tournamentId' => (int) $id,
            ]);
        })->name('leaderboard')->where('id', '[0-9]+');

        Route::get('/{id}/bracket', function ($id) {
            return Inertia::render('Game/TournamentBracket', [
                'tournamentId' => (int) $id,
            ]);
        })->name('bracket')->where('id', '[0-9]+');

        Route::get('/history', function () {
            return Inertia::render('Game/TournamentHistory');
        })->name('history');

        Route::get('/{id}/spectate', function ($id) {
            return Inertia::render('Game/TournamentSpectator', [
                'tournamentId' => (int) $id,
            ]);
        })->name('spectate')->where('id', '[0-9]+');

        Route::get('/{id}/analytics', function ($id) {
            return Inertia::render('Game/TournamentAnalytics', [
                'tournamentId' => (int) $id,
            ]);
        })->name('analytics')->where('id', '[0-9]+');
    });

    // Voice Chat Routes
    Route::prefix('voice')->name('voice.')->group(function () {
        Route::get('/lobby', function () {
            return Inertia::render('Game/VoiceLobby');
        })->name('lobby');

        Route::get('/test', function () {
            return Inertia::render('Game/VoiceTest');
        })->name('test');

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
    Route::get('/', function () {
        return Inertia::render('Grimoire/GrimoirePanel');
    })->name('panel');

    Route::get('/editor', function () {
        return Inertia::render('Grimoire/GrimoireEditor');
    })->middleware('can:admin')->name('editor');

    Route::get('/view/{slug}', function ($slug) {
        return Inertia::render('Grimoire/GrimoireView', ['slug' => $slug]);
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
    Route::get('/journal', function () {
        return Inertia::render('Game/ExplorerJournal');
    })->name('game.journal');

    Route::get('/journal/{id}', function ($id) {
        return Inertia::render('Game/ExplorerJournalDetail', ['id' => (int) $id]);
    })->where('id','[0-9]+')->name('game.journal.detail');

    // ✅ Halaman Achievements
    Route::get('/achievements', function () {
        return Inertia::render('Game/Achievements');
    })->name('game.achievements');
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
        Route::get('/', [TournamentController::class, 'index'])->name('index');
        Route::post('/', [TournamentController::class, 'create'])->name('create');
        Route::get('/{id}', [TournamentController::class, 'show'])->name('show')->where('id', '[0-9]+');

        Route::post('/{id}/join', [TournamentController::class, 'join'])->name('join')->where('id', '[0-9]+');
        Route::delete('/{id}/leave', [TournamentController::class, 'leave'])->name('leave')->where('id', '[0-9]+');

        Route::get('/{id}/session', [TournamentController::class, 'getSession'])->name('session')->where('id', '[0-9]+');
        Route::post('/sessions/{sessionId}/complete', [TournamentController::class, 'sessionCompleted'])->name('session.complete')->where('sessionId', '[0-9]+');

        Route::get('/{id}/leaderboard', [TournamentController::class, 'leaderboard'])->name('leaderboard')->where('id', '[0-9]+');
        Route::get('/{id}/bracket', [TournamentController::class, 'getBracket'])->name('bracket')->where('id', '[0-9]+');
        Route::get('/{id}/status', [TournamentController::class, 'getStatus'])->name('status')->where('id', '[0-9]+');
        Route::get('/{id}/analytics', [TournamentController::class, 'getAnalytics'])->name('analytics')->where('id', '[0-9]+');

        Route::post('/{id}/start', [TournamentController::class, 'startTournament'])->name('start')->where('id', '[0-9]+');
        Route::post('/{id}/pause', [TournamentController::class, 'pauseTournament'])->name('pause')->where('id', '[0-9]+');
        Route::post('/{id}/resume', [TournamentController::class, 'resumeTournament'])->name('resume')->where('id', '[0-9]+');
        Route::delete('/{id}', [TournamentController::class, 'cancelTournament'])->name('cancel')->where('id', '[0-9]+');

        Route::get('/{id}/groups', [TournamentController::class, 'getGroups'])->name('groups')->where('id', '[0-9]+');
        Route::post('/{id}/groups/{groupId}/kick/{participantId}', [TournamentController::class, 'kickParticipant'])
            ->name('groups.kick')->where(['id' => '[0-9]+', 'groupId' => '[0-9]+', 'participantId' => '[0-9]+']);

        Route::get('/{id}/spectate', [TournamentController::class, 'getSpectatorData'])->name('spectate')->where('id', '[0-9]+');
        Route::get('/active', [TournamentController::class, 'getActiveTournaments'])->name('active');
        Route::get('/upcoming', [TournamentController::class, 'getUpcomingTournaments'])->name('upcoming');
        Route::get('/completed', [TournamentController::class, 'getCompletedTournaments'])->name('completed');

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
        Route::get('/categories', [GrimoireController::class, 'categories'])->name('categories');
        Route::get('/entries', [GrimoireController::class, 'index'])->name('entries.index'); // ?category=&q=&role=
        Route::get('/entries/{slug}', [GrimoireController::class, 'show'])->name('entries.show');
        Route::get('/search', [GrimoireController::class, 'search'])->name('search');

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
        Route::get('/', [JournalController::class, 'index'])->name('index');
        Route::get('/stats', [JournalController::class, 'stats'])->name('stats');
        Route::get('/{id}', [JournalController::class, 'show'])->where('id','[0-9]+')->name('show');
    });

    /*
    |--------------------------------------------------------------------------
    | Achievements (master + user state) - API
    |--------------------------------------------------------------------------
    */
    Route::get('/achievements', [AchievementsController::class, 'index'])->name('api.achievements.index');

    /*
    |--------------------------------------------------------------------------
    | Voice Chat API Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('voice')->name('api.voice.')->group(function () {
        Route::get('/token', [VoiceChatController::class, 'getToken'])->name('token');
        Route::get('/lobby/token', [VoiceChatController::class, 'getLobbyToken'])->name('lobby.token');

        Route::get('/{sessionId}/token', [VoiceChatController::class, 'getVoiceToken'])->name('session.token');
        Route::get('/{sessionId}/participants', [VoiceChatController::class, 'getParticipants'])->name('session.participants');
        Route::post('/{sessionId}/join', [VoiceChatController::class, 'joinVoiceSession'])->name('session.join');
        Route::post('/{sessionId}/leave', [VoiceChatController::class, 'leaveVoiceSession'])->name('session.leave');

        Route::get('/{sessionId}/status', [VoiceChatController::class, 'getVoiceStatus'])->name('session.status');
        Route::post('/{sessionId}/mute', [VoiceChatController::class, 'toggleMute'])->name('session.mute');
        Route::post('/{sessionId}/volume', [VoiceChatController::class, 'setVolume'])->name('session.volume');

        Route::get('/{sessionId}/analytics', [VoiceChatController::class, 'getVoiceAnalytics'])->name('session.analytics');
        Route::post('/{sessionId}/report', [VoiceChatController::class, 'reportVoiceIssue'])->name('session.report');

        Route::post('/test/connection', [VoiceChatController::class, 'testConnection'])->name('test.connection');
        Route::post('/test/audio', [VoiceChatController::class, 'testAudio'])->name('test.audio');
        Route::get('/servers', [VoiceChatController::class, 'getVoiceServers'])->name('servers');

        Route::get('/settings', [VoiceChatController::class, 'getVoiceSettings'])->name('settings.get');
        Route::post('/settings', [VoiceChatController::class, 'updateVoiceSettings'])->name('settings.update');

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
        Route::post('/{sessionId}/offer', [VoiceChatController::class, 'handleOffer'])->name('offer');
        Route::post('/{sessionId}/answer', [VoiceChatController::class, 'handleAnswer'])->name('answer');
        Route::post('/{sessionId}/ice-candidate', [VoiceChatController::class, 'handleIceCandidate'])->name('ice-candidate');

        Route::get('/status', [VoiceChatController::class, 'getSignalingStatus'])->name('status');
    });
});

/*
|--------------------------------------------------------------------------
| WebSocket Routes untuk Real-time Updates
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->prefix('ws')->group(function () {
    Route::get('/voice/{sessionId}', [VoiceChatController::class, 'websocketHandler'])
        ->name('ws.voice.session')
        ->where('sessionId', '[0-9]+');

    Route::get('/voice/lobby', [VoiceChatController::class, 'lobbyWebsocketHandler'])
        ->name('ws.voice.lobby');

    Route::get('/voice/{sessionId}/status', [VoiceChatController::class, 'statusWebsocketHandler'])
        ->name('ws.voice.status');

    Route::get('/tournament/{tournamentId}', [TournamentController::class, 'websocketHandler'])
        ->name('ws.tournament.updates')
        ->where('tournamentId', '[0-9]+');

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
    Route::get('/leaderboard', function () {
        return Inertia::render('Game/Leaderboard');
    })->name('game.leaderboard');

    Route::get('/guide', function () {
        return Inertia::render('Game/GameGuide');
    })->name('game.guide');

    Route::get('/history', function () {
        return Inertia::render('Game/GameHistory');
    })->name('game.history');

    Route::get('/settings', function () {
        return Inertia::render('Game/GameSettings');
    })->name('game.settings');

    Route::get('/stats', function () {
        return Inertia::render('Game/GameStats');
    })->name('game.stats');

    Route::prefix('tournament')->name('game.tournament.')->group(function () {
        Route::get('/guide', function () {
            return Inertia::render('Game/TournamentGuide');
        })->name('guide');

        Route::get('/rules', function () {
            return Inertia::render('Game/TournamentRules');
        })->name('rules');

        Route::get('/stats', function () {
            return Inertia::render('Game/TournamentStats');
        })->name('stats');
    });

    Route::prefix('voice')->name('game.voice.')->group(function () {
        Route::get('/tutorial', function () {
            return Inertia::render('Game/VoiceTutorial');
        })->name('tutorial');

        Route::get('/troubleshoot', function () {
            return Inertia::render('Game/VoiceTroubleshoot');
        })->name('troubleshoot');

        Route::get('/feedback', function () {
            return Inertia::render('Game/VoiceFeedback');
        })->name('feedback');

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
    Route::get('/voice', [VoiceChatController::class, 'healthCheck'])->name('voice');

    Route::get('/signaling', [VoiceChatController::class, 'signalingHealthCheck'])->name('signaling');

    Route::get('/voice/servers', [VoiceChatController::class, 'serversHealthCheck'])->name('voice.servers');

    Route::get('/tournaments', [TournamentController::class, 'healthCheck'])->name('tournaments');

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
    Route::get('/voice-api', function () {
        return Inertia::render('Docs/VoiceChatAPI');
    })->name('voice.api');

    Route::get('/webrtc-guide', function () {
        return Inertia::render('Docs/WebRTCGuide');
    })->name('webrtc.guide');

    Route::get('/voice-troubleshoot', function () {
        return Inertia::render('Docs/VoiceTroubleshoot');
    })->name('voice.troubleshoot');

    Route::get('/tournament-api', function () {
        return Inertia::render('Docs/TournamentAPI');
    })->name('tournament.api');

    Route::get('/tournament-guide', function () {
        return Inertia::render('Docs/TournamentGuide');
    })->name('tournament.guide');

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
    Route::get('/tournament/{id}', [TournamentController::class, 'streamTournament'])
         ->name('stream.tournament')
         ->where('id', '[0-9]+');

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
