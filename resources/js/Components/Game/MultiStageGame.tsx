import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, StageConfig } from '@/types/game';
import { gameApi } from '@/services/gameApi';
import StageProgress from './StageProgress';
import GamePlay from './GamePlay';
import StageTransition from './StageTransition';

interface Props {
  sessionId: number;
  role?: 'defuser' | 'expert' | 'host';
}

interface StageResult {
  stageComplete?: boolean;
  gameComplete?: boolean;
  nextStage?: number;
  stageScore?: number;
  finalScore?: number;
  message?: string;
  attemptsRemaining?: number;
}

interface ExtendedGameState extends Omit<GameState, 'stage'> {
  stage?: {
    current?: number;
    total?: number;
    config?: Partial<StageConfig>;
    progress?: {
      completed?: number[];
      totalScore?: number;
    };
  };
}

// Konstanta
const POLLING_INTERVAL = 3000;
const TRANSITION_DURATION = 4000;
const MAX_RETRIES = 3;

export default function MultiStageGame({ sessionId, role }: Props) {
  const [gameState, setGameState] = useState<ExtendedGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTransition, setShowTransition] = useState(false);
  const [stageResult, setStageResult] = useState<StageResult | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup pada unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  // Fungsi konversi state
  const toGameState = useCallback((extendedState: ExtendedGameState): GameState => {
    const { stage, ...rest } = extendedState;
    return {
      ...rest,
      stage: stage ? {
        current: stage.current,
        total: stage.total,
        config: stage.config as StageConfig,
        progress: stage.progress
      } : undefined
    } as GameState;
  }, []);

  // Load game state dengan error handling
  const loadGameState = useCallback(async () => {
    try {
      const state = await gameApi.getGameState(sessionId);
      if (isMountedRef.current) {
        setGameState(state as ExtendedGameState);
        setError('');
        setRetryCount(0);
      }
    } catch (err: any) {
      console.error('Kesalahan memuat state game:', err);
      if (isMountedRef.current) {
        const errorMsg = err.message || 'Gagal memuat state game';
        setError(errorMsg);

        // Auto retry dengan exponential backoff
        if (retryCount < MAX_RETRIES) {
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            loadGameState();
          }, backoffDelay);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [sessionId, retryCount]);

  // Setup polling
  useEffect(() => {
    loadGameState();

    pollingIntervalRef.current = setInterval(loadGameState, POLLING_INTERVAL);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [loadGameState]);

  // Handle submit attempt
  const handleAttemptSubmit = useCallback(async (input: string) => {
    if (!gameState) return;

    try {
      const result = await gameApi.submitAttempt(
        gameState.session.id,
        gameState.puzzle.key,
        input
      );

      if (!isMountedRef.current) return;

      if (result.stageComplete || result.gameComplete) {
        setStageResult(result);
        setShowTransition(true);

        // Auto-hide transisi dan reload state
        transitionTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setShowTransition(false);
            setStageResult(null);
            loadGameState();
          }
        }, TRANSITION_DURATION);
      } else {
        // Update state untuk percobaan yang salah
        if (result.session?.attempts) {
          setGameState(prev => prev ? {
            ...prev,
            session: {
              ...prev.session,
              attempts: result.session.attempts
            }
          } : prev);
        }
      }
    } catch (error: any) {
      console.error('Kesalahan mengirim jawaban:', error);
      const errorMessage = error.response?.data?.message || 'Gagal mengirim jawaban';
      alert(errorMessage);
    }
  }, [gameState, loadGameState]);

  // Handle game state update
  const handleGameStateUpdate = useCallback((updatedState: ExtendedGameState) => {
    setGameState(updatedState);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96 animate-fade-in">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-blue-600 absolute top-0 left-0"></div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mt-6 animate-pulse">
            Memuat Tantangan Multi-Tahap
          </h3>
          <p className="text-gray-600 mt-2">Mempersiapkan petualangan Anda...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !gameState) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-2xl p-8 text-center shadow-xl animate-fade-in">
        <div className="text-6xl mb-4 animate-bounce">⚠️</div>
        <h3 className="text-2xl font-bold text-red-800 mb-3">Kesalahan Koneksi</h3>
        <p className="text-red-700 mb-6 text-lg">{error || 'Tidak dapat memuat data game'}</p>
        {retryCount > 0 && retryCount < MAX_RETRIES && (
          <p className="text-red-600 mb-4 text-sm">
            Mencoba lagi... ({retryCount}/{MAX_RETRIES})
          </p>
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={loadGameState}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-3 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
          >
            🔄 Coba Lagi
          </button>
          <button
            onClick={() => window.location.href = '/game'}
            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-8 py-3 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
          >
            🏠 Kembali ke Lobi
          </button>
        </div>
      </div>
    );
  }

  // Transition screen
  if (showTransition && stageResult) {
    return (
      <StageTransition
        result={stageResult}
        currentStage={gameState.stage?.current}
        totalStages={gameState.stage?.total}
      />
    );
  }

  // Success screen
  if (gameState.session.status === 'success') {
    return (
      <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-2 border-green-300 rounded-2xl p-10 text-center shadow-2xl animate-fade-in">
        <div className="text-8xl mb-6 animate-bounce">🎉</div>
        <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
          Misi Selesai!
        </h2>
        <p className="text-green-700 mb-8 text-xl font-medium">
          Selamat! Anda telah berhasil menyelesaikan semua tahap tantangan.
        </p>

        {gameState.stage && (
          <div className="mb-8 animate-slide-up">
            <StageProgress
              current={gameState.stage.current || 1}
              total={gameState.stage.total || 3}
              completed={gameState.stage.progress?.completed || []}
              totalScore={gameState.stage.progress?.totalScore || 0}
            />
          </div>
        )}

        <div className="bg-gradient-to-br from-green-100 to-emerald-100 border-2 border-green-400 rounded-2xl p-8 mb-8 max-w-md mx-auto shadow-lg animate-scale-in">
          <h3 className="text-2xl font-bold text-green-800 mb-4">📊 Hasil Akhir</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-4 shadow-md transform hover:scale-105 transition-transform">
              <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {gameState.stage?.progress?.totalScore || 0}
              </div>
              <div className="text-sm text-green-700 font-medium mt-2">Total Skor</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md transform hover:scale-105 transition-transform">
              <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {gameState.stage?.progress?.completed?.length || 0}/{gameState.stage?.total || 3}
              </div>
              <div className="text-sm text-green-700 font-medium mt-2">Tahap Selesai</div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/game'}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-10 py-4 rounded-xl text-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            🎮 Main Lagi
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-10 py-4 rounded-xl text-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            📋 Ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Failure screen
  if (gameState.session.status === 'failed') {
    return (
      <div className="bg-gradient-to-br from-red-50 via-orange-50 to-red-50 border-2 border-red-300 rounded-2xl p-10 text-center shadow-2xl animate-fade-in">
        <div className="text-8xl mb-6 animate-shake">💥</div>
        <h2 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-4">
          Misi Gagal
        </h2>
        <p className="text-red-700 mb-8 text-xl font-medium">
          Tantangan tidak dapat diselesaikan dalam batasan yang diberikan.
        </p>

        {gameState.stage && (
          <div className="mb-8 animate-slide-up">
            <StageProgress
              current={gameState.stage.current || 1}
              total={gameState.stage.total || 3}
              completed={gameState.stage.progress?.completed || []}
              totalScore={gameState.stage.progress?.totalScore || 0}
            />
          </div>
        )}

        <div className="bg-gradient-to-br from-red-100 to-orange-100 border-2 border-red-400 rounded-2xl p-8 mb-8 max-w-md mx-auto shadow-lg animate-scale-in">
          <h3 className="text-2xl font-bold text-red-800 mb-4">📈 Progress yang Dicapai</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-4 shadow-md transform hover:scale-105 transition-transform">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                {gameState.stage?.progress?.totalScore || 0}
              </div>
              <div className="text-sm text-red-700 font-medium mt-2">Poin Diperoleh</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md transform hover:scale-105 transition-transform">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                {gameState.stage?.progress?.completed?.length || 0}/{gameState.stage?.total || 3}
              </div>
              <div className="text-sm text-red-700 font-medium mt-2">Tahap Selesai</div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/game'}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-10 py-4 rounded-xl text-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            🔄 Coba Lagi
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-10 py-4 rounded-xl text-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            📋 Ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Main game interface
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="animate-slide-down">
        <StageProgress
          current={gameState.stage?.current || 1}
          total={gameState.stage?.total || 3}
          completed={gameState.stage?.progress?.completed || []}
          totalScore={gameState.stage?.progress?.totalScore || 0}
        />
      </div>

      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white rounded-2xl p-8 text-center shadow-xl animate-slide-up">
        <h1 className="text-3xl font-bold mb-4 drop-shadow-lg">
          {gameState.stage?.config?.title || gameState.puzzle?.title || 'Tantangan Saat Ini'}
        </h1>
        <div className="flex justify-center flex-wrap gap-6 text-sm font-medium">
          <span className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
            <span className="mr-2 text-xl">⏱️</span>
            Batas Waktu: {Math.floor((gameState.stage?.config?.timeLimit || 0) / 60)} menit
          </span>
          <span className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
            <span className="mr-2 text-xl">🎯</span>
            Maks Percobaan: {gameState.stage?.config?.maxAttempts || 'N/A'}
          </span>
          <span className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
            <span className="mr-2 text-xl">📊</span>
            Tahap: {gameState.stage?.current || 1}/{gameState.stage?.total || 3}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 animate-scale-in">
        <GamePlay
          gameState={toGameState(gameState)}
          role={role}
          onGameStateUpdate={(state) => handleGameStateUpdate(state as ExtendedGameState)}
          onSubmitAttempt={handleAttemptSubmit}
        />
      </div>
    </div>
  );
}
