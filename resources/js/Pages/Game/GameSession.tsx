import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { GameState } from '@/types/game';
import { gameApi } from '@/services/gameApi';
import Authenticated from '@/Layouts/AuthenticatedLayout';

// Import game components
import GamePlay from '@/Components/Game/GamePlay';
import CodeAnalysisView from '@/Components/Game/CodeAnalysisView';

interface Props {
  sessionId: number;
  role?: 'defuser' | 'expert' | 'host';
}

export default function GameSession({ sessionId, role }: Props) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

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
          const safeState: GameState = {
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
      console.log('🚀 Starting session...');
      await gameApi.startSession(sessionId);
      // Refresh game state after starting
      const state = await gameApi.getGameState(sessionId);
      if (state) {
        const safeState: GameState = {
          ...state,
          session: {
            ...state.session,
            participants: Array.isArray(state.session.participants) ? state.session.participants : [],
            attempts: Array.isArray(state.session.attempts) ? state.session.attempts : [],
          }
        };
        setGameState(safeState);
      }
    } catch (error: any) {
      console.error('Error starting session:', error);
      alert(error.response?.data?.message || 'Failed to start session');
    }
  };

  const handleSubmitAttempt = async (inputValue: string) => {
    if (!gameState) return;

    try {
      const result = await gameApi.submitAttempt(
        gameState.session.id,
        gameState.puzzle.key,
        inputValue
      );

      const newGameState = {
        ...gameState,
        session: result.session
      };
      setGameState(newGameState);
    } catch (error: any) {
      console.error('Error submitting attempt:', error);
      alert(error.response?.data?.message || 'Failed to submit attempt');
    }
  };

  if (loading) {
    return (
      <Authenticated>
        <Head title="Loading..." />
        <div className="py-12">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="bg-white shadow-sm sm:rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Loading game session...</p>
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
              <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
              <p className="text-red-600 mb-4">{error || 'No game data available'}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mr-2"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.href = '/game'}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      </Authenticated>
    );
  }

  const { session, puzzle } = gameState;
  const participants = session.participants || [];
  const attempts = session.attempts || [];

  // Debug logging
  console.log('🔍 GameSession render:', {
    sessionStatus: session.status,
    role,
    puzzleType: puzzle?.type,
    participants: participants.length
  });

  return (
    <Authenticated>
      <Head title={`Session ${session.team_code}`} />
      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

          {/* Debug Info - TEMPORARY */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-bold text-yellow-800 mb-2">🐛 GameSession Debug:</h3>
            <p className="text-sm text-yellow-700">SessionId: <strong>{sessionId}</strong></p>
            <p className="text-sm text-yellow-700">Status: <strong>{session.status}</strong></p>
            <p className="text-sm text-yellow-700">Role: <strong>{role || 'undefined'}</strong></p>
            <p className="text-sm text-yellow-700">Puzzle Type: <strong>{puzzle?.type || 'unknown'}</strong></p>
            <p className="text-sm text-yellow-700">Participants: <strong>{participants.length}</strong></p>
            <p className="text-sm text-yellow-700">Has Puzzle Data: <strong>{!!puzzle ? 'YES' : 'NO'}</strong></p>
          </div>

          {/* Session Header */}
          <div className="bg-white shadow-sm sm:rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Session: {session.team_code}
                </h1>
                <p className="text-gray-600">
                  Status: <span className={`font-semibold ${
                    session.status === 'waiting' ? 'text-yellow-600' :
                    session.status === 'running' ? 'text-blue-600' :
                    session.status === 'success' ? 'text-green-600' :
                    'text-red-600'
                  }`}>{session.status}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Your role: <span className="font-medium">{role || 'Observer'}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  {participants.length}/2
                </div>
                <div className="text-sm text-gray-500">Players</div>
              </div>
            </div>
          </div>

          {/* MAIN GAME RENDERING LOGIC */}
          {session.status === 'waiting' && (
            <div className="bg-white shadow-sm sm:rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-yellow-600 mb-4">
                  🕐 Waiting for Game to Start
                </h2>

                {participants.length < 2 ? (
                  <div>
                    <p className="text-gray-600 mb-6">
                      Waiting for more players to join... ({participants.length}/2)
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 font-medium mb-2">
                        Invite a friend to join!
                      </p>
                      <p className="text-sm text-blue-600">
                        Share this team code: <span className="font-mono font-bold">{session.team_code}</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-6">
                      All players ready! ({participants.length}/2)
                    </p>
                    <button
                      onClick={handleStartSession}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors shadow-lg"
                    >
                      🚀 Start Game
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GAME IS RUNNING - RENDER GAMEPLAY COMPONENT */}
          {session.status === 'running' && (
            <div className="space-y-6">
              {/* Game Status Header */}
              <div className="bg-gray-900 text-white rounded-lg p-6 text-center">
                <div className="text-sm text-gray-300 mb-2">GAME IS ACTIVE</div>
                <div className="text-2xl font-bold text-green-400">
                  Challenge: {puzzle?.title || 'Loading...'}
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  Type: {puzzle?.type || 'Unknown'}
                </div>
              </div>

              {/* RENDER GAMEPLAY COMPONENT - THIS IS THE KEY FIX */}
              <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                <h3 className="font-bold text-purple-800 mb-2">🎮 GAME COMPONENT:</h3>
                <p className="text-sm text-purple-700 mb-4">
                  Rendering GamePlay component for puzzle type: <strong>{puzzle?.type}</strong>
                </p>

                <GamePlay
                  gameState={gameState}
                  role={role}
                  onGameStateUpdate={setGameState}
                />
              </div>
            </div>
          )}

          {/* GAME COMPLETED */}
          {(session.status === 'success' || session.status === 'failed') && (
            <div className="bg-white shadow-sm sm:rounded-lg p-6 text-center">
              <h2 className={`text-xl font-semibold mb-4 ${
                session.status === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {session.status === 'success' ? '🎉 Mission Accomplished!' : '💥 Mission Failed'}
              </h2>
              <p className="text-gray-600 mb-6">
                {session.status === 'success'
                  ? 'Congratulations! You successfully completed the challenge.'
                  : 'Better luck next time! The challenge was not completed.'}
              </p>
              <button
                onClick={() => window.location.href = '/game'}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded"
              >
                Back to Lobby
              </button>
            </div>
          )}

          {/* Participants List - Always visible */}
          <div className="bg-white shadow-sm sm:rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              Participants ({participants.length})
            </h2>
            <div className="space-y-3">
              {participants.map((participant, index) => (
                <div
                  key={participant.id || index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      participant.role === 'defuser' ? 'bg-red-500' : 'bg-blue-500'
                    }`}></div>
                    <span className="font-medium">{participant.nickname}</span>
                    <span className="text-sm text-gray-500 capitalize">
                      ({participant.role === 'defuser' ? '💣 Defuser' : '📖 Expert'})
                    </span>
                  </div>
                  {participant.role === role && (
                    <span className="text-sm bg-green-100 text-green-600 px-2 py-1 rounded">
                      You
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </Authenticated>
  );
}
