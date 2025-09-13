import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
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

// SOLUTION: Create completely separate interface instead of extending GameState
interface MultiStageGameState {
  session: GameState['session'];
  puzzle: GameState['puzzle'];
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
  serverTime?: string;
}

export default function GameSession({ sessionId, role: propRole }: Props) {
  const { auth } = usePage().props as any;
  const [gameState, setGameState] = useState<MultiStageGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showTransition, setShowTransition] = useState(false);
  const [stageResult, setStageResult] = useState<StageResult | null>(null);

  // ENHANCED: Better role detection with multiple sources
  const getCurrentRole = (): 'defuser' | 'expert' | 'host' | 'observer' => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlRole = urlParams.get('role');

    // Priority: URL params > props > participant lookup > default
    if (urlRole && ['defuser', 'expert', 'host'].includes(urlRole)) {
      return urlRole as 'defuser' | 'expert' | 'host';
    }

    if (propRole && ['defuser', 'expert', 'host'].includes(propRole)) {
      return propRole;
    }

    // Check if user is a participant with a specific role
    const participants = gameState?.session?.participants || [];
    const userParticipant = participants.find(p => p.user_id === auth?.user?.id);
    if (userParticipant?.role) {
      return userParticipant.role as 'defuser' | 'expert' | 'host';
    }

    return 'observer';
  };

  const currentRole = getCurrentRole();

  // ENHANCED: Better logging and error handling
  useEffect(() => {
    console.log('🔍 GameSession mounted:', {
      sessionId,
      propRole,
      urlRole: new URLSearchParams(window.location.search).get('role'),
      currentRole,
      userId: auth?.user?.id
    });

    if (!sessionId) {
      setError('Session ID is required');
      setLoading(false);
      return;
    }

    const loadGameState = async () => {
      try {
        console.log('🔄 Loading game state for session:', sessionId);
        const state = await gameApi.getGameState(sessionId);

        console.log('🔍 Raw API response:', state);

        if (state && state.session) {
          const safeState: MultiStageGameState = {
            session: {
              ...state.session,
              participants: Array.isArray(state.session.participants) ? state.session.participants : [],
              attempts: Array.isArray(state.session.attempts) ? state.session.attempts : [],
            },
            puzzle: state.puzzle,
            stage: state.stage,
            serverTime: state.serverTime
          };

          console.log('🔍 Processed game state:', safeState);
          console.log('🔍 Puzzle exists:', !!safeState.puzzle);
          console.log('🔍 Expert view exists:', !!safeState.puzzle?.expertView);
          console.log('🔍 Expert view data:', safeState.puzzle?.expertView);

          setGameState(safeState);
          setError('');
        } else {
          console.warn('⚠️ Invalid game state response');
          setError('Invalid game state received');
        }
      } catch (err: any) {
        console.error('❌ Error loading game state:', err);
        setError(err.message || 'Failed to load game state');
      } finally {
        setLoading(false);
      }
    };

    loadGameState();
    const interval = setInterval(loadGameState, 3000);
    return () => clearInterval(interval);
  }, [sessionId, auth?.user?.id]);

  const handleStartSession = async () => {
    try {
      console.log('🚀 Starting multi-stage session...');
      await gameApi.startSession(sessionId);

      // Refresh game state after starting
      setTimeout(async () => {
        try {
          const state = await gameApi.getGameState(sessionId);
          if (state) {
            const safeState: MultiStageGameState = {
              session: {
                ...state.session,
                participants: Array.isArray(state.session.participants) ? state.session.participants : [],
                attempts: Array.isArray(state.session.attempts) ? state.session.attempts : [],
              },
              puzzle: state.puzzle,
              stage: state.stage,
              serverTime: state.serverTime
            };
            setGameState(safeState);
          }
        } catch (error) {
          console.error('Error reloading state after start:', error);
        }
      }, 1000);
    } catch (error: any) {
      console.error('Error starting session:', error);
      alert(error.response?.data?.message || 'Failed to start session');
    }
  };

  const handleAttemptSubmit = async (inputValue: string) => {
    if (!gameState) return;

    try {
      console.log('🎯 Submitting attempt:', inputValue);
      const result = await gameApi.submitAttempt(
        gameState.session.id,
        gameState.puzzle.key,
        inputValue
      );

      console.log('🔍 Submit result:', result);

      // Check if stage or game completed
      if (result.stageComplete || result.gameComplete) {
        setStageResult(result);
        setShowTransition(true);

        // Auto-hide transition after 4 seconds and reload state
        setTimeout(async () => {
          setShowTransition(false);
          setStageResult(null);

          try {
            const state = await gameApi.getGameState(sessionId);
            if (state) {
              const safeState: MultiStageGameState = {
                session: {
                  ...state.session,
                  participants: Array.isArray(state.session.participants) ? state.session.participants : [],
                  attempts: Array.isArray(state.session.attempts) ? state.session.attempts : [],
                },
                puzzle: state.puzzle,
                stage: state.stage,
                serverTime: state.serverTime
              };
              setGameState(safeState);
            }
          } catch (error) {
            console.error('Error reloading state after completion:', error);
          }
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
  const handleGameStateUpdate = (updatedState: GameState) => {
    console.log('🔄 Game state update received:', updatedState);
    const convertedState: MultiStageGameState = {
      session: updatedState.session,
      puzzle: updatedState.puzzle,
      stage: updatedState.stage as any,
      serverTime: updatedState.serverTime
    };
    setGameState(convertedState);
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
            {/* DEBUG PANEL - TEMPORARY FOR TROUBLESHOOTING */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-bold text-purple-800 mb-2">🐛 Debug Panel:</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-purple-700">
                  <div>
                    <p><strong>Session ID:</strong> {sessionId}</p>
                    <p><strong>Prop Role:</strong> {propRole || 'None'}</p>
                    <p><strong>URL Role:</strong> {new URLSearchParams(window.location.search).get('role') || 'None'}</p>
                    <p><strong>Current Role:</strong> {currentRole}</p>
                    <p><strong>User ID:</strong> {auth?.user?.id}</p>
                  </div>
                  <div>
                    <p><strong>Session Status:</strong> {session.status}</p>
                    <p><strong>Has Puzzle:</strong> {!!puzzle ? 'Yes' : 'No'}</p>
                    <p><strong>Puzzle Type:</strong> {puzzle?.type || 'None'}</p>
                    <p><strong>Has Expert View:</strong> {!!puzzle?.expertView ? 'Yes' : 'No'}</p>
                    <p><strong>Participants:</strong> {participants.length}</p>
                  </div>
                </div>
                {puzzle?.expertView && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium text-purple-800">Expert View Data</summary>
                    <pre className="text-xs mt-2 bg-white p-2 rounded overflow-auto max-h-40 border">
                      {JSON.stringify(puzzle.expertView, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}

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
                gameState={gameState as GameState}
                role={['defuser', 'expert', 'host'].includes(currentRole) ? currentRole as 'defuser' | 'expert' | 'host' : undefined}
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

          {/* Enhanced Session Header with Role Display */}
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
                  Your role: <span className="font-medium capitalize">{currentRole}</span>
                  {currentRole === 'expert' && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      📖 Manual Holder
                    </span>
                  )}
                  {currentRole === 'defuser' && (
                    <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                      💣 Bomb Handler
                    </span>
                  )}
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

          {/* Enhanced Participants List - Always visible when not in terminal states */}
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
                        participant.role === 'defuser' ? 'bg-red-500' :
                        participant.role === 'expert' ? 'bg-blue-500' : 'bg-green-500'
                      }`}></div>
                      <div>
                        <span className="font-medium text-gray-800">{participant.nickname}</span>
                        <div className="text-sm text-gray-500 capitalize">
                          {participant.role === 'defuser' ? '💣 Bomb Defuser' :
                           participant.role === 'expert' ? '📖 Expert Guide' : '👑 Host'}
                        </div>
                      </div>
                    </div>
                    {participant.role === currentRole && (
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
