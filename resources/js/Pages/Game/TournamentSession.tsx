import React, { useState, useEffect } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { gameApi } from '@/services/gameApi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import VoiceChat from '@/Components/Game/VoiceChat';
import GamePlay from '@/Components/Game/GamePlay';

// Props interface for this page component
interface Props {
  tournamentId: number;
  groupId?: number;
  debug?: {
    tournament_exists: boolean;
    tournament_name: string;
    user_id: number;
    timestamp: string;
  };
}

// Tournament session data interface
interface TournamentSessionData {
  tournament: {
    id: number;
    name: string;
    status: string;
    current_round: number;
  };
  group: {
    id: number;
    name: string;
    status: string;
    completion_time?: number;
    rank?: number;
    participants: Array<{
      id: number;
      user_id: number;
      nickname: string;
      role: string;
    }>;
  };
  session: {
    id: number;
    team_code: string;
    status: string;
    participants: any[];
    attempts: any[];
  };
  gameState: any;
  leaderboard: Array<{
    id: number;
    name: string;
    status: string;
    completion_time?: number;
    rank?: number;
    score: number;
    participants: Array<{
      nickname: string;
      role: string;
    }>;
  }>;
}

export default function TournamentSession({ tournamentId, groupId, debug }: Props) {
  const { auth } = usePage().props as any;
  const [tournamentData, setTournamentData] = useState<TournamentSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [gameStarted, setGameStarted] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Tournament animations
  const tournamentStyles = `
    @keyframes championGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3); }
      50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.5); }
    }
    @keyframes eliminationPulse {
      0%, 100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.5); }
      50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.8); }
    }
    @keyframes battleReady {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    @keyframes urgentPulse {
      0%, 100% { box-shadow: 0 0 20px rgba(255, 0, 0, 0.6); }
      50% { box-shadow: 0 0 40px rgba(255, 0, 0, 0.9); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .champion-glow { animation: championGlow 3s ease-in-out infinite; }
    .elimination-pulse { animation: eliminationPulse 2s ease-in-out infinite; }
    .battle-ready { animation: battleReady 2s ease-in-out infinite; }
    .urgent-pulse { animation: urgentPulse 2s ease-in-out infinite; }
    .fade-in { animation: fadeIn 0.5s ease-out; }
  `;

  useEffect(() => {
    // ✅ Debug logging for received props
    console.log('🔍 TournamentSession Props Received:', {
      tournamentId,
      groupId,
      typeOfTournamentId: typeof tournamentId,
      isValidTournamentId: !!(tournamentId && !isNaN(Number(tournamentId))),
      debug
    });

    // ✅ Validate props before API call
    if (!tournamentId || isNaN(Number(tournamentId))) {
      console.error('❌ Invalid tournament ID:', tournamentId);
      setError('Invalid tournament ID. Please return to tournament lobby.');
      setLoading(false);
      return;
    }

    loadTournamentSession();
    const interval = setInterval(loadTournamentSession, 5000);
    return () => clearInterval(interval);
  }, [tournamentId, groupId]);

  const loadTournamentSession = async () => {
    // ✅ Double-check before API call
    if (!tournamentId || isNaN(Number(tournamentId))) {
      console.error('❌ Cannot load data: Invalid tournament ID');
      setError('Tournament ID is missing or invalid');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Loading tournament session for ID:', tournamentId, 'Group:', groupId);

      const response = await gameApi.getTournamentSession(Number(tournamentId), groupId);

      if (!response || !response.tournament || !response.group) {
        throw new Error('Invalid tournament data received from server');
      }

      // ✅ Normalize data to prevent type issues
      const normalizedData: TournamentSessionData = {
        tournament: {
          id: response.tournament.id,
          name: response.tournament.name,
          status: response.tournament.status,
          current_round: response.tournament.current_round,
        },
        group: {
          id: response.group.id,
          name: response.group.name,
          status: response.group.status,
          completion_time: response.group.completion_time || undefined,
          rank: response.group.rank || undefined,
          participants: Array.isArray(response.group.participants) ? response.group.participants : [],
        },
        session: {
          id: response.session?.id || 0,
          team_code: response.session?.team_code || '',
          status: response.session?.status || 'waiting',
          participants: Array.isArray(response.session?.participants) ? response.session.participants : [],
          attempts: Array.isArray(response.session?.attempts) ? response.session.attempts : [],
        },
        gameState: response.gameState || null,
        leaderboard: Array.isArray(response.leaderboard) ? response.leaderboard : [],
      };

      console.log('✅ Tournament data loaded and normalized:', normalizedData);
      setTournamentData(normalizedData);
      setError('');
      setRetryCount(0);
      setLoading(false);

    } catch (error: any) {
      console.error('❌ Failed to load tournament data:', error);

      let errorMessage = 'Failed to load tournament session';

      if (error.response?.status === 404) {
        errorMessage = 'Tournament not found or you do not have access to this tournament';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You are not a participant in this tournament';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setLoading(false);

      // ✅ Auto-retry with exponential backoff
      if (retryCount < 3 && error.response?.status !== 404 && error.response?.status !== 403) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          setLoading(true);
          loadTournamentSession();
        }, Math.pow(2, retryCount) * 1000);
      }
    }
  };

  const handleGameStateUpdate = (updatedGameState: any) => {
    if (tournamentData) {
      setTournamentData({
        ...tournamentData,
        gameState: updatedGameState
      });
    }
  };

  const handleAttemptSubmit = async (inputValue: string) => {
    if (!tournamentData?.session?.id) {
      console.error('❌ No session available for attempt');
      return;
    }

    try {
      console.log('🎯 Submitting tournament attempt:', inputValue);

      const result = await gameApi.submitAttempt(
        tournamentData.session.id,
        tournamentData.gameState?.puzzle?.key || '',
        inputValue
      );

      if (result.gameComplete) {
        console.log('🏁 Tournament round completed');
        await gameApi.completeTournamentSession(tournamentData.session.id);
        await loadTournamentSession();
      } else {
        handleGameStateUpdate(result.session);
      }
    } catch (error: any) {
      console.error('❌ Tournament attempt failed:', error);
    }
  };

  const startGame = async () => {
    if (!tournamentData?.session?.id) return;

    try {
      setGameStarted(true);
      await gameApi.startSession(tournamentData.session.id);
      await loadTournamentSession();
    } catch (error: any) {
      console.error('❌ Failed to start game:', error);
      setError('Failed to start game session');
      setGameStarted(false);
    }
  };

  const completeSession = async () => {
    if (!tournamentData?.session?.id) return;

    try {
      await gameApi.completeTournamentSession(tournamentData.session.id);
      await loadTournamentSession();
      router.visit(`/game/tournament/${tournamentId}/leaderboard`);
    } catch (error: any) {
      console.error('❌ Failed to complete session:', error);
      setError('Failed to complete session');
    }
  };

  const leaveTournament = async () => {
    if (!tournamentData?.tournament?.id) return;

    try {
      await gameApi.leaveTournament(tournamentData.tournament.id);
      router.visit('/game/tournament');
    } catch (error: any) {
      console.error('❌ Failed to leave tournament:', error);
      setError('Failed to leave tournament');
    }
  };

  const handleRetry = () => {
    setError('');
    setLoading(true);
    setRetryCount(0);
    loadTournamentSession();
  };

  const handleBackToLobby = () => {
    router.visit('/game/tournament');
  };

  // ✅ Early return if invalid tournament ID
  if (!tournamentId || isNaN(Number(tournamentId))) {
    return (
      <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-red-300">❌ Tournament Error</h2>}>
        <Head title="Tournament Error" />
        <div className="py-12">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <Card className="border-4 border-red-600 bg-red-900/20 p-8 text-center fade-in">
              <div className="text-6xl mb-4">🚫</div>
              <h3 className="text-2xl font-bold text-red-300 mb-4">Invalid Tournament Session</h3>
              <p className="text-red-200 mb-6">Tournament ID is missing or invalid: {String(tournamentId)}</p>
              <Button
                onClick={handleBackToLobby}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg"
              >
                Return to Tournament Lobby
              </Button>
            </Card>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (loading) {
    return (
      <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-amber-300">🏆 Tournament Session</h2>}>
        <Head title="Tournament Session" />
        <div className="py-12">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <Card className="bg-white shadow-sm sm:rounded-lg p-6 text-center fade-in">
              <CardContent className="p-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-500 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-700">Loading Tournament Session...</h3>
                <p className="text-gray-500 mt-2">Preparing your battle arena...</p>
                {retryCount > 0 && (
                  <p className="text-gray-500 text-sm mt-2">
                    Retry attempt {retryCount}/3...
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error || !tournamentData) {
    return (
      <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-red-300">❌ Tournament Error</h2>}>
        <Head title="Tournament Error" />
        <div className="py-12">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <Card className="border-4 border-red-600 bg-red-900/30 fade-in">
              <CardContent className="p-6 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-red-200 mb-4">Tournament Session Error</h3>
                <p className="text-red-300 mb-6">{error || 'Failed to load tournament data'}</p>

                {retryCount > 0 && (
                  <p className="text-red-300 text-sm mb-4">
                    Failed after {retryCount} retry attempts
                  </p>
                )}

                <div className="space-x-4">
                  <Button
                    onClick={handleRetry}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                    disabled={loading}
                  >
                    {loading ? 'Retrying...' : 'Try Again'}
                  </Button>
                  <Button
                    onClick={handleBackToLobby}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg"
                  >
                    Return to Tournament Lobby
                  </Button>
                </div>

                {/* Debug info for development */}
                {process.env.NODE_ENV === 'development' && debug && (
                  <div className="mt-6 p-4 bg-gray-800/50 rounded-lg text-left">
                    <h4 className="text-red-300 font-bold mb-2">Debug Info:</h4>
                    <p className="text-red-200 text-sm">Tournament ID: {tournamentId}</p>
                    <p className="text-red-200 text-sm">Group ID: {groupId || 'Not provided'}</p>
                    <p className="text-red-200 text-sm">User ID: {auth?.user?.id}</p>
                    <p className="text-red-200 text-sm">Tournament Exists: {debug.tournament_exists ? 'Yes' : 'No'}</p>
                    <p className="text-red-200 text-sm">Tournament Name: {debug.tournament_name}</p>
                    <p className="text-red-200 text-sm">Retry Count: {retryCount}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  const { tournament, group, session, gameState, leaderboard } = tournamentData;
  const userRole = group.participants?.find(p => p.user_id === auth?.user?.id)?.role;
  const isEliminated = group.status === 'eliminated';
  const isChampion = group.status === 'champion';
  const isWaitingForGame = group.status === 'ready' || group.status === 'waiting';
  const isPlayingActive = group.status === 'playing' && gameState;

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xl text-amber-300">
            🏆 {tournament.name} - {group.name}
          </h2>
          <div className="flex items-center space-x-4">
            <Badge className="bg-purple-600 text-white text-lg px-4 py-2">
              Round {tournament.current_round}
            </Badge>
            <Button
              onClick={handleBackToLobby}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              ← Tournament Lobby
            </Button>
          </div>
        </div>
      }
    >
      <Head title={`Tournament: ${tournament.name}`} />

      <style>{tournamentStyles}</style>

      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-purple-900 to-amber-900 py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-6">

            {/* Main Tournament Content */}
            <div className={`${showVoiceChat ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-6 fade-in`}>

              {/* Tournament Header */}
              <Card className={`border-4 ${
                isEliminated ? 'border-red-600 bg-red-900/30 urgent-pulse' :
                isChampion ? 'border-yellow-600 bg-yellow-900/30 champion-glow' :
                'border-amber-600 bg-gradient-to-br from-amber-900/30 to-stone-900'
              }`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-3xl font-bold text-amber-300 mb-2">{tournament.name}</h1>
                      <div className="flex space-x-4">
                        <Badge className={`text-lg px-4 py-2 ${
                          tournament.status === 'qualification' ? 'bg-yellow-700 text-yellow-100' :
                          tournament.status === 'semifinals' ? 'bg-blue-700 text-blue-100' :
                          tournament.status === 'finals' ? 'bg-purple-700 text-purple-100' :
                          'bg-gray-700 text-gray-100'
                        }`}>
                          {tournament.status.toUpperCase()}
                        </Badge>
                        <Badge className="bg-green-700 text-green-100 text-lg px-4 py-2">
                          Round {tournament.current_round}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-2xl font-bold text-green-300 mb-2">{group.name}</h2>
                      <Badge className={`text-lg px-4 py-2 ${
                        group.status === 'waiting' ? 'bg-gray-700 text-gray-100' :
                        group.status === 'ready' ? 'bg-blue-700 text-blue-100' :
                        group.status === 'playing' ? 'bg-yellow-700 text-yellow-100 battle-ready' :
                        group.status === 'completed' ? 'bg-green-700 text-green-100' :
                        group.status === 'eliminated' ? 'bg-red-700 text-red-100 elimination-pulse' :
                        'bg-purple-700 text-purple-100 champion-glow'
                      }`}>
                        {group.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Completion Time Display */}
                  {group.completion_time && (
                    <div className="mt-4 text-center">
                      <div className="inline-flex items-center space-x-2 bg-gray-800/50 px-6 py-3 rounded-xl">
                        <span className="text-2xl">⏱️</span>
                        <span className="text-2xl font-bold text-yellow-300">
                          {Math.floor(group.completion_time / 60)}:{(group.completion_time % 60).toString().padStart(2, '0')}
                        </span>
                        {group.rank && (
                          <Badge className="bg-yellow-600 text-white ml-4">
                            Rank #{group.rank}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Error Display */}
              {error && (
                <Card className="border-4 border-red-600 bg-red-900/30">
                  <CardContent className="p-6">
                    <div className="flex items-center text-red-200">
                      <span className="text-3xl mr-4">⚠️</span>
                      <div>
                        <h3 className="font-bold text-lg">Session Error!</h3>
                        <p>{error}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Waiting for Game Start */}
              {isWaitingForGame && (
                <Card className="border-4 border-blue-600 bg-blue-900/20">
                  <CardContent className="p-8 text-center">
                    <div className="text-6xl mb-4">⏳</div>
                    <h3 className="text-2xl font-bold text-blue-300 mb-4">
                      {group.status === 'waiting' ? 'Waiting for Players' : 'Ready to Begin!'}
                    </h3>
                    <p className="text-blue-200 text-lg mb-6">
                      {group.status === 'waiting'
                        ? 'Waiting for all players to join the tournament...'
                        : 'Tournament will begin shortly. Prepare for battle!'
                      }
                    </p>

                    <div className="bg-blue-800/30 p-4 rounded-lg">
                      <h4 className="text-blue-300 font-bold mb-2">Your Team</h4>
                      <div className="space-y-2">
                        {group.participants?.map(participant => (
                          <div key={participant.id} className="flex items-center justify-between">
                            <span className="text-blue-200">{participant.nickname}</span>
                            <Badge className={`${
                              participant.role === 'defuser' ? 'bg-red-600' : 'bg-blue-600'
                            } text-white text-xs`}>
                              {participant.role === 'defuser' ? '💣 Defuser' : '📖 Expert'}
                            </Badge>
                          </div>
                        )) || []}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Active Game Interface */}
              {isPlayingActive && (
                <Card className="border-4 border-green-600 bg-green-900/10 battle-ready">
                  <CardHeader>
                    <CardTitle className="text-green-300 text-center text-2xl">
                      🎯 TOURNAMENT CHALLENGE ACTIVE
                    </CardTitle>
                    <div className="text-center">
                      <Badge className="bg-red-600 text-white text-lg px-4 py-2 urgent-pulse">
                        ⚡ COMPETITIVE MODE ⚡
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <GamePlay
                      gameState={gameState}
                      role={userRole as 'defuser' | 'expert'}
                      onGameStateUpdate={handleGameStateUpdate}
                      onSubmitAttempt={handleAttemptSubmit}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Elimination Warning */}
              {isEliminated && (
                <Card className="border-4 border-red-600 bg-red-900/50 urgent-pulse">
                  <CardContent className="p-8 text-center">
                    <div className="text-8xl mb-4">💀</div>
                    <h2 className="text-4xl font-bold text-red-300 mb-4">ELIMINATED</h2>
                    <p className="text-red-200 text-xl mb-6">
                      Your group has been eliminated from the tournament.
                    </p>
                    <p className="text-red-300">
                      Final Time: <strong>{Math.floor((group.completion_time || 0) / 60)}:{((group.completion_time || 0) % 60).toString().padStart(2, '0')}</strong>
                    </p>
                    <div className="mt-6">
                      <Button
                        onClick={handleBackToLobby}
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl text-lg font-bold"
                      >
                        Return to Tournament Lobby
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Champion Celebration */}
              {isChampion && (
                <Card className="border-4 border-yellow-600 bg-yellow-900/50 champion-glow">
                  <CardContent className="p-8 text-center">
                    <div className="text-8xl mb-4">👑</div>
                    <h2 className="text-4xl font-bold text-yellow-300 mb-4">CHAMPIONS!</h2>
                    <p className="text-yellow-200 text-xl mb-6">
                      Congratulations! Your group has won the tournament!
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 max-w-md mx-auto">
                      <div className="bg-yellow-800/50 p-4 rounded-lg">
                        <p className="text-yellow-100 font-bold">Final Time</p>
                        <p className="text-2xl font-bold text-yellow-300">
                          {Math.floor((group.completion_time || 0) / 60)}:{((group.completion_time || 0) % 60).toString().padStart(2, '0')}
                        </p>
                      </div>
                      <div className="bg-yellow-800/50 p-4 rounded-lg">
                        <p className="text-yellow-100 font-bold">Final Rank</p>
                        <p className="text-2xl font-bold text-yellow-300">#1</p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <Button
                        onClick={handleBackToLobby}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-3 rounded-xl text-lg font-bold"
                      >
                        Return to Tournament Lobby
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Game Session Controls (when session exists) */}
              {session && session.id > 0 && (
                <Card className="border-4 border-green-600 bg-green-900/20">
                  <CardHeader>
                    <CardTitle className="text-green-300 text-xl">🎮 Game Session Control</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-bold text-green-200 mb-3">Session Status</h4>
                        <div className="space-y-2">
                          <p className="text-green-200">
                            Status: <Badge className={`ml-2 ${
                              session.status === 'waiting' ? 'bg-gray-700' :
                              session.status === 'running' ? 'bg-yellow-700' :
                              session.status === 'success' ? 'bg-green-700' :
                              session.status === 'failed' ? 'bg-red-700' :
                              'bg-blue-700'
                            }`}>
                              {session.status.toUpperCase()}
                            </Badge>
                          </p>
                          <p className="text-green-200">
                            Participants: <span className="font-bold">{session.participants.length}/2</span>
                          </p>
                          <p className="text-green-200">
                            Team Code: <span className="font-bold text-amber-300">{session.team_code}</span>
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {session.status === 'waiting' && session.participants.length >= 2 && (
                          <Button
                            onClick={startGame}
                            disabled={gameStarted}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-bold rounded-xl"
                          >
                            {gameStarted ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                                Starting Game...
                              </div>
                            ) : (
                              <>🚀 Start Battle</>
                            )}
                          </Button>
                        )}

                        {session.status === 'waiting' && session.participants.length < 2 && (
                          <div className="text-center p-4 bg-yellow-900/30 border-2 border-yellow-600 rounded-lg">
                            <p className="text-yellow-200 font-bold">⏳ Waiting for Partner</p>
                            <p className="text-yellow-300 text-sm">Share team code: <span className="font-bold">{session.team_code}</span></p>
                          </div>
                        )}

                        {session.status === 'running' && (
                          <Button
                            onClick={() => router.visit(`/game/session/${session.id}`)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-bold rounded-xl"
                          >
                            🎯 Enter Game
                          </Button>
                        )}

                        {session.status === 'success' && (
                          <Button
                            onClick={completeSession}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 text-lg font-bold rounded-xl champion-glow"
                          >
                            ✅ Complete Session
                          </Button>
                        )}

                        {session.status === 'failed' && (
                          <div className="text-center p-4 bg-red-900/30 border-2 border-red-600 rounded-lg">
                            <p className="text-red-200 font-bold">💀 Mission Failed</p>
                            <p className="text-red-300 text-sm">Better luck next time!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Team Members */}
              <Card className="border-4 border-blue-600 bg-blue-900/20">
                <CardHeader>
                  <CardTitle className="text-blue-300 text-xl">👥 Guild Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {group.participants?.map((participant, index) => (
                      <Card
                        key={participant.id}
                        className={`border-3 ${
                          participant.user_id === auth?.user?.id
                            ? 'border-green-500 bg-green-900/30'
                            : 'border-gray-600 bg-gray-900/30'
                        }`}
                      >
                        <CardContent className="p-6 text-center">
                          <div className="text-4xl mb-3">
                            {participant.role === 'defuser' ? '💣' : '📖'}
                          </div>
                          <h4 className="font-bold text-xl text-white mb-2">
                            {participant.nickname}
                            {participant.user_id === auth?.user?.id && (
                              <span className="text-green-300 text-sm ml-2">(You)</span>
                            )}
                          </h4>
                          <Badge className={`text-lg px-4 py-2 ${
                            participant.role === 'defuser' ? 'bg-red-700 text-red-100' : 'bg-blue-700 text-blue-100'
                          }`}>
                            {participant.role === 'defuser' ? 'Bomb Defuser' : 'Manual Expert'}
                          </Badge>
                          <div className="mt-3 text-sm text-gray-300">
                            {participant.role === 'defuser'
                              ? 'Handles dangerous devices and describes them to the expert'
                              : 'Guides the defuser through the manual instructions'
                            }
                          </div>
                        </CardContent>
                      </Card>
                    )) || []}

                    {/* Empty slots */}
                    {Array.from({ length: Math.max(0, 2 - (group.participants?.length || 0)) }, (_, index) => (
                      <Card key={`empty-${index}`} className="border-2 border-dashed border-gray-600 bg-gray-900/10">
                        <CardContent className="p-6 text-center">
                          <div className="text-4xl mb-3 opacity-50">❓</div>
                          <h4 className="font-bold text-lg text-gray-400 mb-2">Waiting for Player</h4>
                          <p className="text-gray-500 text-sm">Share team code to invite</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tournament Leaderboard */}
              {leaderboard && leaderboard.length > 0 && (
                <Card className="border-4 border-purple-600 bg-purple-900/20">
                  <CardHeader>
                    <CardTitle className="text-purple-300 text-xl">🏆 Live Tournament Standings</CardTitle>
                    <CardDescription className="text-purple-200">
                      Current rankings for {tournament.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {leaderboard.map((team, index) => (
                        <div
                          key={team.id}
                          className={`flex justify-between items-center p-4 rounded-lg transition-all duration-300 ${
                            team.id === group.id ? 'bg-green-800/50 border-3 border-green-600 champion-glow' :
                            team.status === 'eliminated' ? 'bg-red-800/30 border-2 border-red-600' :
                            team.status === 'champion' ? 'bg-yellow-800/50 border-3 border-yellow-600 champion-glow' :
                            'bg-gray-800/30 border-2 border-gray-600'
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <span className="text-3xl">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎖️'}
                            </span>
                            <div>
                              <h4 className="font-bold text-white text-lg flex items-center">
                                {team.name}
                                {team.id === group.id && (
                                  <Badge className="ml-2 bg-green-700 text-green-100">Your Team</Badge>
                                )}
                              </h4>
                              <div className="flex space-x-2">
                                <Badge className={`text-sm ${
                                  team.status === 'completed' ? 'bg-green-700' :
                                  team.status === 'playing' ? 'bg-yellow-700' :
                                  team.status === 'eliminated' ? 'bg-red-700' :
                                  team.status === 'champion' ? 'bg-purple-700' :
                                  'bg-gray-700'
                                }`}>
                                  {team.status.toUpperCase()}
                                </Badge>
                                <span className="text-sm text-gray-400">
                                  {team.participants?.length || 0} players
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {team.completion_time && (
                              <p className="text-green-300 font-bold text-lg">
                                {Math.floor(team.completion_time / 60)}:{(team.completion_time % 60).toString().padStart(2, '0')}
                              </p>
                            )}
                            <p className="text-gray-300">Score: <span className="font-bold">{team.score}</span></p>
                            {team.rank && (
                              <p className="text-gray-400 text-sm">Rank #{team.rank}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation Controls */}
              <Card className="border-3 border-gray-600 bg-gray-900/20">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div className="space-x-4">
                      <Button
                        onClick={handleBackToLobby}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg"
                      >
                        🏠 Tournament Lobby
                      </Button>
                      <Button
                        onClick={() => setShowVoiceChat(!showVoiceChat)}
                        className={`px-6 py-3 rounded-lg ${
                          showVoiceChat
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        🎙️ {showVoiceChat ? 'Hide' : 'Show'} Voice Chat
                      </Button>
                    </div>
                    <div>
                      <Button
                        onClick={leaveTournament}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg"
                      >
                        🚪 Leave Tournament
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Voice Chat Sidebar */}
            {showVoiceChat && (
              <div className="lg:col-span-1">
                <Card className="border-3 border-green-600 bg-green-900/20 sticky top-4">
                  <CardHeader>
                    <CardTitle className="text-green-300 flex items-center justify-between">
                      <span>🎙️ Guild Communication</span>
                      <Button
                        onClick={() => setShowVoiceChat(false)}
                        className="bg-red-600/20 hover:bg-red-600/40 text-red-300 px-2 py-1 text-sm"
                      >
                        ✕
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VoiceChat
                      sessionId={session?.id || 0}
                      userId={auth?.user?.id || 0}
                      nickname={auth?.user?.name || 'Player'}
                      role={userRole as 'defuser' | 'expert' || 'defuser'}
                      participants={group.participants || []}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

          </div>

          {/* Floating Voice Chat Toggle */}
          {!showVoiceChat && (
            <div className="fixed bottom-6 right-6 z-50">
              <Button
                onClick={() => setShowVoiceChat(true)}
                className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-2xl champion-glow"
                title="Enable Guild Communication"
              >
                <span className="text-2xl">🎙️</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
