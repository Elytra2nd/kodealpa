import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { GameState } from '@/types/game';
import { gameApi } from '@/services/gameApi';
import Authenticated from '@/Layouts/AuthenticatedLayout';

// Import multi-stage components
import StageProgress from '@/Components/Game/StageProgress';
import GamePlay from '@/Components/Game/GamePlay';
import StageTransition from '@/Components/Game/StageTransition';

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

export default function GameSession({ sessionId, role }: Props) {
  const [gameState, setGameState] = useState<ExtendedGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showTransition, setShowTransition] = useState(false);
  const [stageResult, setStageResult] = useState<StageResult | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('Session ID is required');
      setLoading(false);
      return;
    }

    const loadGameState = async () => {
      try {
        const state = await gameApi.getGameState(sessionId);

        if (state && state.session) {
          const safeState: ExtendedGameState = {
            ...state,
            session: {
              ...state.session,
              participants: Array.isArray(state.session.participants) ? state.session.participants : [],
              attempts: Array.isArray(state.session.attempts) ? state.session.attempts : [],
            }
          };

          setGameState(safeState);
          setError('');
        }
      } catch (err: any) {
        console.error('Error loading game state:', err);
        setError(err.message || 'Failed to load game state');
      } finally {
        setLoading(false);
      }
    };

    loadGameState();
    const interval = setInterval(loadGameState, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleStartSession = async () => {
    try {
      console.log('🚀 Starting multi-stage session...');
      await gameApi.startSession(sessionId);

      // Refresh game state after starting
      setTimeout(() => {
        const loadState = async () => {
          const state = await gameApi.getGameState(sessionId);
          if (state) {
            const safeState: ExtendedGameState = {
              ...state,
              session: {
                ...state.session,
                participants: Array.isArray(state.session.participants) ? state.session.participants : [],
                attempts: Array.isArray(state.session.attempts) ? state.session.attempts : [],
              }
            };
            setGameState(safeState);
          }
        };
        loadState();
      }, 1000);
    } catch (error: any) {
      console.error('Error starting session:', error);
      alert(error.response?.data?.message || 'Failed to start session');
    }
  };

  const handleAttemptSubmit = async (inputValue: string) => {
    if (!gameState) return;

    try {
      const result = await gameApi.submitAttempt(
        gameState.session.id,
        gameState.puzzle.key,
        inputValue
      );

      // Check if stage or game completed
      if (result.stageComplete || result.gameComplete) {
        setStageResult(result);
        setShowTransition(true);

        // Auto-hide transition after 4 seconds and reload state
        setTimeout(() => {
          setShowTransition(false);
          setStageResult(null);

          // Reload game state for next stage or completion
          const loadState = async () => {
            const state = await gameApi.getGameState(sessionId);
            if (state) {
              const safeState: ExtendedGameState = {
                ...state,
                session: {
                  ...state.session,
                  participants: Array.isArray(state.session.participants) ? state.session.participants : [],
                  attempts: Array.isArray(state.session.attempts) ? state.session.attempts : [],
                }
              };
              setGameState(safeState);
            }
          };
          loadState();
        }, 4000);
      } else {
        // Update state for incorrect attempt or partial progress
        setGameState({
          ...gameState,
          session: {
            ...gameState.session,
            attempts: result.session?.attempts || gameState.session.attempts
          }
        });

        // Show attempts remaining if provided
        if (result.attemptsRemaining !== undefined) {
          console.log(`Attempts remaining: ${result.attemptsRemaining}`);
        }
      }
    } catch (error: any) {
      console.error('Error submitting attempt:', error);
      alert(error.response?.data?.message || 'Failed to submit attempt');
    }
  };

  // Handle game state updates from GamePlay component
  const handleGameStateUpdate = (updatedState: ExtendedGameState) => {
    setGameState(updatedState);
  };

  if (loading) {
    return (
      <Authenticated>
        <Head title="Loading Multi-Stage Challenge..." />
        <div className="py-12">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="bg-white shadow-sm sm:rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading Multi-Stage Challenge</h3>
              <p className="text-gray-500">Preparing your adventure...</p>
            </div>
          </div>
        </div>
      </Authenticated>
    );
  }

  if (error || !gameState) {
    return (
      <Authenticated>
        <Head title="Error" />
        <div className="py-12">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="text-red-600 text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-red-800 mb-2">Connection Error</h3>
              <p className="text-red-600 mb-6">{error || 'Unable to load game data'}</p>
              <div className="space-x-4">
                <button
                  onClick={() => window.location.reload()}
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
          </div>
        </div>
      </Authenticated>
    );
  }

  const { session, puzzle, stage } = gameState;
  const participants = session.participants || [];

  // Show transition screen between stages
  if (showTransition && stageResult) {
    return (
      <Authenticated>
        <Head title="Stage Transition" />
        <StageTransition
          result={stageResult}
          currentStage={stage?.current}
          totalStages={stage?.total}
        />
      </Authenticated>
    );
  }

  // SOLUTION 4: Switch Statement for Type-Safe Status Handling
  const renderGameContent = () => {
    switch (session.status) {
      case 'waiting':
        return (
          <div className="bg-white shadow-sm sm:rounded-lg p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="text-2xl font-semibold text-yellow-600 mb-6">
                Preparing Multi-Stage Challenge
              </h2>

              {participants.length < 2 ? (
                <div>
                  <p className="text-gray-600 mb-8 text-lg">
                    Waiting for more players to join... ({participants.length}/2)
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
                    <p className="text-blue-800 font-medium mb-3">
                      🎮 Invite a teammate to join this epic challenge!
                    </p>
                    <div className="bg-white border border-blue-300 rounded p-3">
                      <p className="text-sm text-blue-600 mb-1">Share this team code:</p>
                      <p className="font-mono font-bold text-lg text-blue-800">{session.team_code}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-8 text-lg">
                    All players ready! Time to begin the 3-stage challenge. ({participants.length}/2)
                  </p>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 max-w-2xl mx-auto">
                    <h3 className="font-bold text-green-800 mb-3">🎯 Mission Overview</h3>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                          <span className="font-bold text-green-700">1</span>
                        </div>
                        <p className="font-medium text-green-700">Pattern Analysis</p>
                      </div>
                      <div className="text-center">
                        <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                          <span className="font-bold text-green-700">2</span>
                        </div>
                        <p className="font-medium text-green-700">Code Analysis</p>
                      </div>
                      <div className="text-center">
                        <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                          <span className="font-bold text-green-700">3</span>
                        </div>
                        <p className="font-medium text-green-700">Navigation Challenge</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleStartSession}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-4 px-12 rounded-lg text-xl transition-all duration-300 shadow-lg transform hover:scale-105"
                  >
                    🚀 Begin Multi-Stage Challenge
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'running':
        return (
          <div className="space-y-6">
            {/* Stage Progress Header */}
            {stage && (
              <StageProgress
                current={stage.current || 1}
                total={stage.total || 3}
                completed={stage.progress?.completed || []}
                totalScore={stage.progress?.totalScore || 0}
              />
            )}

            {/* Current Stage Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 text-center">
              <h1 className="text-3xl font-bold mb-2">
                {stage?.config?.title || puzzle?.title || 'Current Challenge'}
              </h1>
              <div className="flex justify-center space-x-8 text-sm">
                <span className="flex items-center">
                  <span className="mr-2">⏱️</span>
                  Time Limit: {Math.floor((stage?.config?.timeLimit || 0) / 60)} min
                </span>
                <span className="flex items-center">
                  <span className="mr-2">🎯</span>
                  Max Attempts: {stage?.config?.maxAttempts || 'N/A'}
                </span>
                <span className="flex items-center">
                  <span className="mr-2">📊</span>
                  Stage: {stage?.current || 1}/{stage?.total || 3}
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

      case 'success':
        return (
          <div className="py-12">
            <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-green-800 mb-4">Mission Accomplished!</h2>
                <p className="text-green-600 mb-6 text-lg">
                  Congratulations! You have successfully completed all stages of the challenge.
                </p>

                {/* Show final stage progress */}
                {stage && (
                  <div className="mb-6">
                    <StageProgress
                      current={stage.current || 1}
                      total={stage.total || 3}
                      completed={stage.progress?.completed || []}
                      totalScore={stage.progress?.totalScore || 0}
                    />
                  </div>
                )}

                {/* Final Score Display */}
                <div className="bg-green-100 border border-green-300 rounded-lg p-6 mb-6 max-w-md mx-auto">
                  <h3 className="text-xl font-bold text-green-800 mb-2">Final Results</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-green-700">
                        {stage?.progress?.totalScore || 0}
                      </div>
                      <div className="text-sm text-green-600">Total Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-700">
                        {stage?.progress?.completed?.length || 0}/{stage?.total || 3}
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
            </div>
          </div>
        );

      case 'failed':
        return (
          <div className="py-12">
            <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">💥</div>
                <h2 className="text-3xl font-bold text-red-800 mb-4">Mission Failed</h2>
                <p className="text-red-600 mb-6 text-lg">
                  The challenge could not be completed within the given constraints.
                </p>

                {/* Show stage progress even in failure */}
                {stage && (
                  <div className="mb-6">
                    <StageProgress
                      current={stage.current || 1}
                      total={stage.total || 3}
                      completed={stage.progress?.completed || []}
                      totalScore={stage.progress?.totalScore || 0}
                    />
                  </div>
                )}

                {/* Failure Score Display */}
                <div className="bg-red-100 border border-red-300 rounded-lg p-6 mb-6 max-w-md mx-auto">
                  <h3 className="text-xl font-bold text-red-800 mb-2">Progress Made</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-red-700">
                        {stage?.progress?.totalScore || 0}
                      </div>
                      <div className="text-sm text-red-600">Points Earned</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-700">
                        {stage?.progress?.completed?.length || 0}/{stage?.total || 3}
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
            </div>
          </div>
        );

      case 'paused':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">⏸️</div>
            <h2 className="text-2xl font-bold text-yellow-800 mb-4">Game Paused</h2>
            <p className="text-yellow-600 mb-6">
              The game session has been paused. Please wait for it to resume.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Refresh Status
            </button>
          </div>
        );

      case 'ended':
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🏁</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Ended</h2>
            <p className="text-gray-600 mb-6">
              This game session has ended. Thank you for participating!
            </p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.href = '/game'}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                New Game
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        );

      default:
        // Handle unexpected status with proper typing
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">❓</div>
            <h2 className="text-xl font-bold text-red-800 mb-4">Unknown Game Status</h2>
            <p className="text-red-600 mb-6">
              Game status: <code className="bg-red-100 px-2 py-1 rounded">{session.status}</code>
            </p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/game'}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <Authenticated>
      <Head title={`Multi-Stage Challenge - ${session.team_code}`} />
      <div className="py-8">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

          {/* Session Header with Stage Info */}
          <div className="bg-white shadow-sm sm:rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Session: {session.team_code}
                </h1>
                <p className="text-gray-600 mt-1">
                  Status: <span className={`font-semibold ${
                    session.status === 'waiting' ? 'text-yellow-600' :
                    session.status === 'running' ? 'text-blue-600' :
                    session.status === 'success' ? 'text-green-600' :
                    session.status === 'failed' ? 'text-red-600' :
                    session.status === 'paused' ? 'text-yellow-600' :
                    session.status === 'ended' ? 'text-gray-600' :
                    'text-gray-600'
                  }`}>{session.status.toUpperCase()}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Your role: <span className="font-medium capitalize">{role || 'Observer'}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {participants.length}/2
                </div>
                <div className="text-sm text-gray-500">Players Ready</div>
              </div>
            </div>
          </div>

          {/* Main Game Content - Rendered by Switch Statement */}
          {renderGameContent()}

          {/* Participants List - Always visible when not in terminal states */}
          {!['success', 'failed', 'ended'].includes(session.status) && (
            <div className="bg-white shadow-sm sm:rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2">👥</span>
                Team Members ({participants.length})
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {participants.map((participant, index) => (
                  <div
                    key={participant.id || index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${
                        participant.role === 'defuser' ? 'bg-red-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <span className="font-medium text-gray-800">{participant.nickname}</span>
                        <div className="text-sm text-gray-500 capitalize">
                          {participant.role === 'defuser' ? '💣 Bomb Defuser' : '📖 Expert Guide'}
                        </div>
                      </div>
                    </div>
                    {participant.role === role && (
                      <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                        You
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </Authenticated>
  );
}
