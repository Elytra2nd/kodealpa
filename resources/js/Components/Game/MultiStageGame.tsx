// resources/js/Components/Game/MultiStageGame.tsx

import React, { useState, useEffect } from 'react';
import { GameState } from '@/types/game';
import { gameApi } from '@/services/gameApi';
import StageProgress from './StageProgress';
import GamePlay from './GamePlay';
import StageTransition from './StageTransition';
// Remove the import for GameComplete as it doesn't exist
// import GameComplete from './GameComplete';

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

  const handleGameStateUpdate = (updatedState: ExtendedGameState) => {
    setGameState(updatedState);
  };

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

        // Auto-hide transition after 3 seconds and load new state
        setTimeout(() => {
          setShowTransition(false);
          setStageResult(null);
          loadGameState();
        }, 3000);
      } else {
        // Update state for incorrect attempt
        setGameState({
          ...gameState,
          session: { ...gameState.session, attempts: [...gameState.session.attempts, result] }
        });
      }
    } catch (error: any) {
      console.error('Error submitting attempt:', error);
      alert(error.response?.data?.message || 'Failed to submit attempt');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-lg">Loading game...</span>
      </div>
    );
  }

  if (error || !gameState) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
        <p className="text-red-600 mb-4">{error || 'No game data available'}</p>
        <button
          onClick={loadGameState}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Retry
        </button>
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

  // Show game completion screen - Replace GameComplete component with inline implementation
  if (gameState.session.status === 'success' || gameState.session.status === 'completed') {
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
        <h2 className="text-2xl font-bold text-red-800 mb-4">💥 Mission Failed</h2>
        <p className="text-red-600 mb-6">
          The challenge could not be completed. Better luck next time!
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

        <button
          onClick={() => window.location.href = '/game'}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

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
          <span>⏱️ Time Limit: {Math.floor((gameState.stage?.config?.timeLimit || 0) / 60)} minutes</span>
          <span>🎯 Max Attempts: {gameState.stage?.config?.maxAttempts || 'N/A'}</span>
        </div>
      </div>

      {/* Main Game Interface - Remove onSubmitAttempt prop if not supported by GamePlay */}
      <GamePlay
        onGameStateUpdate={handleGameStateUpdate}
        gameState={gameState}
        role={role}
      />

      {/* Alternative: If you need to pass the submit handler, you might need to modify GamePlay component or use a different approach */}
      {/* For now, I'm commenting this out to fix the TypeScript error */}
      {/*
      <GamePlay
        gameState={gameState}
        role={role}
        onSubmitAttempt={handleAttemptSubmit}
      />
      */}
    </div>
  );
}
