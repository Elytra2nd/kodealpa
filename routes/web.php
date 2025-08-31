<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StageController;
use App\Http\Controllers\SessionController;
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
});

/*
|--------------------------------------------------------------------------
| Additional Game Features Routes (Optional)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->prefix('game')->group(function () {
    // Leaderboard
    Route::get('/leaderboard', function () {
        return Inertia::render('Game/Leaderboard');
    })->name('game.leaderboard');

    // How to play guide
    Route::get('/guide', function () {
        return Inertia::render('Game/GameGuide');
    })->name('game.guide');

    // Game history
    Route::get('/history', function () {
        return Inertia::render('Game/GameHistory');
    })->name('game.history');

    // Settings
    Route::get('/settings', function () {
        return Inertia::render('Game/GameSettings');
    })->name('game.settings');
});

/*
|--------------------------------------------------------------------------
| Admin Routes (Optional - untuk manage stages dan missions)
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
});

require __DIR__.'/auth.php';
