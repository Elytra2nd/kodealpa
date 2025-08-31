import React, { useState, useEffect } from 'react';
import { GameState } from '@/types/game';
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

// Extended GameState interface to include stage property
interface ExtendedGameState extends GameState {
  stage?: {
    current?: number;
    total?: number;
    config?: {
      title?: string;
      timeLimit?: number;
      maxAttempts?: number;
    };
    progress?: {
      completed?: number[];
      totalScore?: number;
    };
  };
}

export default function MultiStageGame({ sessionId, role }: Props) {
  const [gameState, setGameState] = useState<ExtendedGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTransition, setShowTransition] = useState(false);
  const [stageResult, setStageResult] = useState<StageResult | null>(null);

  useEffect(() => {
    loadGameState();
    const interval = setInterval(loadGameState, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const loadGameState = async () => {
    try {
      const state = await gameApi.getGameState(sessionId);
      setGameState(state);
      setError('');
    } catch (err: any) {
      console.error('Error loading game state:', err);
      setError(err.message || 'Failed to load game state');
    } finally {
      setLoading(false);
    }
  };

  const handleAttemptSubmit = async (input: string) => {
    if (!gameState) return;

    try {
      const result = await gameApi.submitAttempt(
        gameState.session.id,
        gameState.puzzle.key,
        input
      );

      if (result.stageComplete || result.gameComplete) {
        setStageResult(result);
        setShowTransition(true);

        // Auto-hide transition after 4 seconds and load new state
        setTimeout(() => {
          setShowTransition(false);
          setStageResult(null);
          loadGameState();
        }, 4000);
      } else {
        // Update state for incorrect attempt
        const updatedAttempts = [...(gameState.session.attempts || [])];
        if (result.session?.attempts) {
          setGameState({
            ...gameState,
            session: {
              ...gameState.session,
              attempts: result.session.attempts
            }
          });
        }
      }
    } catch (error: any) {
      console.error('Error submitting attempt:', error);
      alert(error.response?.data?.message || 'Failed to submit attempt');
    }
  };

  const handleGameStateUpdate = (updatedState: ExtendedGameState) => {
    setGameState(updatedState);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-gray-700">Loading Multi-Stage Challenge</h3>
          <p className="text-gray-500">Preparing your adventure...</p>
        </div>
      </div>
    );
  }

  if (error || !gameState) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-red-800 mb-2">Connection Error</h3>
        <p className="text-red-600 mb-6">{error || 'Unable to load game data'}</p>
        <div className="space-x-4">
          <button
            onClick={loadGameState}
            className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry Connection
          </button>
          <button
            onClick={() => window.location.href = '/game'}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Show transition screen between stages
  if (showTransition && stageResult) {
    return (
      <StageTransition
        result={stageResult}
        currentStage={gameState.stage?.current}
        totalStages={gameState.stage?.total}
      />
    );
  }

  // Show game completion screen - FIXED: Only check for 'success' status
  if (gameState.session.status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-green-800 mb-4">Mission Accomplished!</h2>
        <p className="text-green-600 mb-6 text-lg">
          Congratulations! You have successfully completed all stages of the challenge.
        </p>

        {/* Show final stage progress */}
        {gameState.stage && (
          <div className="mb-6">
            <StageProgress
              current={gameState.stage.current || 1}
              total={gameState.stage.total || 3}
              completed={gameState.stage.progress?.completed || []}
              totalScore={gameState.stage.progress?.totalScore || 0}
            />
          </div>
        )}

        {/* Final Score Display */}
        <div className="bg-green-100 border border-green-300 rounded-lg p-6 mb-6 max-w-md mx-auto">
          <h3 className="text-xl font-bold text-green-800 mb-2">Final Results</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-green-700">
                {gameState.stage?.progress?.totalScore || 0}
              </div>
              <div className="text-sm text-green-600">Total Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">
                {gameState.stage?.progress?.completed?.length || 0}/{gameState.stage?.total || 3}
              </div>
              <div className="text-sm text-green-600">Stages Completed</div>
            </div>
          </div>
        </div>

        <div className="space-x-4">
          <button
            onClick={() => window.location.href = '/game'}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show game failure screen
  if (gameState.session.status === 'failed') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">💥</div>
        <h2 className="text-3xl font-bold text-red-800 mb-4">Mission Failed</h2>
        <p className="text-red-600 mb-6 text-lg">
          The challenge could not be completed within the given constraints.
        </p>

        {/* Show stage progress even in failure */}
        {gameState.stage && (
          <div className="mb-6">
            <StageProgress
              current={gameState.stage.current || 1}
              total={gameState.stage.total || 3}
              completed={gameState.stage.progress?.completed || []}
              totalScore={gameState.stage.progress?.totalScore || 0}
            />
          </div>
        )}

        {/* Failure Score Display */}
        <div className="bg-red-100 border border-red-300 rounded-lg p-6 mb-6 max-w-md mx-auto">
          <h3 className="text-xl font-bold text-red-800 mb-2">Progress Made</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-red-700">
                {gameState.stage?.progress?.totalScore || 0}
              </div>
              <div className="text-sm text-red-600">Points Earned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-700">
                {gameState.stage?.progress?.completed?.length || 0}/{gameState.stage?.total || 3}
              </div>
              <div className="text-sm text-red-600">Stages Completed</div>
            </div>
          </div>
        </div>

        <div className="space-x-4">
          <button
            onClick={() => window.location.href = '/game'}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Main game interface for running state
  return (
    <div className="space-y-6">
      {/* Stage Progress Header */}
      <StageProgress
        current={gameState.stage?.current || 1}
        total={gameState.stage?.total || 3}
        completed={gameState.stage?.progress?.completed || []}
        totalScore={gameState.stage?.progress?.totalScore || 0}
      />

      {/* Current Stage Title */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">
          {gameState.stage?.config?.title || gameState.puzzle?.title || 'Current Challenge'}
        </h1>
        <div className="flex justify-center space-x-6 text-sm">
          <span className="flex items-center">
            <span className="mr-2">⏱️</span>
            Time Limit: {Math.floor((gameState.stage?.config?.timeLimit || 0) / 60)} min
          </span>
          <span className="flex items-center">
            <span className="mr-2">🎯</span>
            Max Attempts: {gameState.stage?.config?.maxAttempts || 'N/A'}
          </span>
          <span className="flex items-center">
            <span className="mr-2">📊</span>
            Stage: {gameState.stage?.current || 1}/{gameState.stage?.total || 3}
          </span>
        </div>
      </div>

      {/* Main Game Interface */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <GamePlay
          gameState={gameState}
          role={role}
          onGameStateUpdate={handleGameStateUpdate}
          onSubmitAttempt={handleAttemptSubmit}
        />
      </div>
    </div>
  );
}
