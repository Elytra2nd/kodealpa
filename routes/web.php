<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StageController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\VoiceChatController;
use App\Http\Controllers\TournamentController;
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
| Admin Routes (Enhanced)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified', 'can:admin'])->prefix('admin')->group(function () {
    // Admin dashboard
    Route::get('/dashboard', function () {
        return Inertia::render('Admin/Dashboard');
    })->name('admin.dashboard');

    // Stage management
    Route::resource('stages', StageController::class)
        ->names([
            'index' => 'admin.stages.index',
            'create' => 'admin.stages.create',
            'store' => 'admin.stages.store',
            'show' => 'admin.stages.show',
            'edit' => 'admin.stages.edit',
            'update' => 'admin.stages.update',
            'destroy' => 'admin.stages.destroy',
        ]);

    // Game sessions monitoring
    Route::get('/sessions', [SessionController::class, 'adminIndex'])->name('admin.sessions.index');
    Route::get('/sessions/{id}', [SessionController::class, 'adminShow'])->name('admin.sessions.show');
    Route::delete('/sessions/{id}', [SessionController::class, 'adminDestroy'])->name('admin.sessions.destroy');

    // Tournament Admin Routes
    Route::prefix('tournaments')->name('admin.tournaments.')->group(function () {
        // Tournament management dashboard
        Route::get('/', [TournamentController::class, 'adminIndex'])->name('index');
        Route::get('/{id}', [TournamentController::class, 'adminShow'])->name('show');

        // Tournament moderation
        Route::post('/{id}/force-start', [TournamentController::class, 'adminForceStart'])->name('force-start');
        Route::post('/{id}/force-complete', [TournamentController::class, 'adminForceComplete'])->name('force-complete');
        Route::post('/{id}/disqualify/{groupId}', [TournamentController::class, 'adminDisqualifyGroup'])->name('disqualify');

        // Tournament analytics
        Route::get('/analytics/overview', [TournamentController::class, 'adminAnalyticsOverview'])->name('analytics.overview');
        Route::get('/{id}/analytics', [TournamentController::class, 'adminAnalytics'])->name('analytics');

        // Tournament settings
        Route::get('/settings', [TournamentController::class, 'adminSettings'])->name('settings');
        Route::post('/settings', [TournamentController::class, 'updateAdminSettings'])->name('settings.update');
    });

    // Voice Chat Admin Routes
    Route::prefix('voice')->name('admin.voice.')->group(function () {
        // Voice chat monitoring dashboard
        Route::get('/dashboard', [VoiceChatController::class, 'adminDashboard'])->name('dashboard');

        // Active voice sessions
        Route::get('/sessions', [VoiceChatController::class, 'adminSessions'])->name('sessions');
        Route::get('/sessions/{id}', [VoiceChatController::class, 'adminSessionDetail'])->name('sessions.detail');

        // Voice chat analytics
        Route::get('/analytics', [VoiceChatController::class, 'adminAnalytics'])->name('analytics');
        Route::get('/reports', [VoiceChatController::class, 'adminReports'])->name('reports');

        // Voice chat settings management
        Route::get('/settings', [VoiceChatController::class, 'adminSettings'])->name('settings');
        Route::post('/settings', [VoiceChatController::class, 'updateAdminSettings'])->name('settings.update');

        // Voice server management
        Route::get('/servers', [VoiceChatController::class, 'adminServers'])->name('servers');
        Route::post('/servers', [VoiceChatController::class, 'addVoiceServer'])->name('servers.add');
        Route::delete('/servers/{id}', [VoiceChatController::class, 'removeVoiceServer'])->name('servers.remove');

        // Voice chat moderation
        Route::get('/moderation', [VoiceChatController::class, 'adminModeration'])->name('moderation');
        Route::post('/moderation/ban/{userId}', [VoiceChatController::class, 'banFromVoice'])->name('moderation.ban');
        Route::post('/moderation/unban/{userId}', [VoiceChatController::class, 'unbanFromVoice'])->name('moderation.unban');
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

require __DIR__.'/auth.php';
