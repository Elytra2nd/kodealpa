import React, { useState, useEffect } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { gameApi } from '@/services/gameApi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import VoiceChat from '@/Components/Game/VoiceChat';

// Import types from centralized location
import type {
  TournamentData,
  TournamentGroup,
  TournamentSessionData,
  GameSession,
  GameState
} from '@/types/game';

// Helper function untuk normalisasi data
const normalizeTournamentGroup = (group: any): TournamentGroup => ({
  ...group,
  completion_time: group.completion_time === null ? undefined : group.completion_time,
  rank: group.rank === null ? undefined : group.rank,
  participants: Array.isArray(group.participants) ? group.participants : []
});

const normalizeTournamentData = (tournament: any): TournamentData => ({
  ...tournament,
  groups: Array.isArray(tournament.groups)
    ? tournament.groups.map(normalizeTournamentGroup)
    : []
});

export default function TournamentSession() {
  const { auth, tournamentId, groupId } = usePage().props as any;
  const [tournamentData, setTournamentData] = useState<TournamentSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [gameStarted, setGameStarted] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);

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
    .champion-glow { animation: championGlow 3s ease-in-out infinite; }
    .elimination-pulse { animation: eliminationPulse 2s ease-in-out infinite; }
    .battle-ready { animation: battleReady 2s ease-in-out infinite; }
  `;

  useEffect(() => {
    loadTournamentSession();
    const interval = setInterval(loadTournamentSession, 3000);
    return () => clearInterval(interval);
  }, [tournamentId, groupId]);

  const loadTournamentSession = async () => {
    try {
      const response = await gameApi.getTournamentSession(tournamentId, groupId);

      // SOLUSI: Normalisasi data untuk mengatasi type incompatibility
      const normalizedData: TournamentSessionData = {
        tournament: normalizeTournamentData(response.tournament),
        group: normalizeTournamentGroup(response.group),
        session: {
          ...response.session,
          participants: Array.isArray(response.session.participants) ? response.session.participants : [],
          attempts: Array.isArray(response.session.attempts) ? response.session.attempts : []
        },
        gameState: response.gameState,
        leaderboard: Array.isArray(response.leaderboard)
          ? response.leaderboard.map(normalizeTournamentGroup)
          : []
      };

      setTournamentData(normalizedData);
      setLoading(false);
    } catch (error: any) {
      console.error('Failed to load tournament session:', error);
      setError('Failed to load tournament session data');
      setLoading(false);
    }
  };

  const startGame = async () => {
    if (!tournamentData) return;

    try {
      setGameStarted(true);
      await gameApi.startSession(tournamentData.session.id);
      await loadTournamentSession();
    } catch (error: any) {
      setError('Failed to start game session');
      setGameStarted(false);
    }
  };

  const completeSession = async () => {
    if (!tournamentData) return;

    try {
      await gameApi.completeTournamentSession(tournamentData.session.id);
      await loadTournamentSession();

      // Redirect to leaderboard or tournament lobby
      router.visit(`/game/tournament/${tournamentId}/leaderboard`);
    } catch (error: any) {
      setError('Failed to complete session');
    }
  };

  const leaveTournament = async () => {
    if (!tournamentData) return;

    try {
      await gameApi.leaveTournament(tournamentData.tournament.id);
      router.visit('/game/tournaments');
    } catch (error: any) {
      setError('Failed to leave tournament');
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-amber-300">🏆 Tournament Session</h2>}>
        <Head title="Tournament Session" />
        <div className="py-12">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <Card className="bg-white shadow-sm sm:rounded-lg p-6 text-center">
              <CardContent className="p-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-500 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-700">Loading Tournament Session...</h3>
                <p className="text-gray-500 mt-2">Preparing your battle arena...</p>
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
            <Card className="border-4 border-red-600 bg-red-900/30">
              <CardContent className="p-6 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-red-200 mb-4">Tournament Session Error</h3>
                <p className="text-red-300 mb-6">{error || 'Failed to load tournament data'}</p>
                <div className="space-x-4">
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => router.visit('/game/tournaments')}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg"
                  >
                    Return to Tournament Lobby
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  const { tournament, group, session, gameState, leaderboard } = tournamentData;

  return (
    <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-amber-300">🏆 {tournament.name} - {group.name}</h2>}>
      <Head title={`Tournament: ${tournament.name}`} />

      <style>{tournamentStyles}</style>

      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-purple-900 to-amber-900 py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-6">

            {/* Main Tournament Content */}
            <div className={`${showVoiceChat ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-6`}>

              {/* Tournament Header */}
              <Card className="border-4 border-amber-600 bg-gradient-to-br from-amber-900/30 to-stone-900 champion-glow">
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

              {/* Game Session Controls */}
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
                          onClick={() => router.visit(`/game/${session.id}`)}
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

              {/* Team Members */}
              <Card className="border-4 border-blue-600 bg-blue-900/20">
                <CardHeader>
                  <CardTitle className="text-blue-300 text-xl">👥 Guild Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {group.participants.map((participant, index) => (
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
                    ))}

                    {/* Empty slots */}
                    {Array.from({ length: 2 - group.participants.length }, (_, index) => (
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
              {leaderboard.length > 0 && (
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
                                  {team.participants.length} players
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
                        onClick={() => router.visit('/game/tournaments')}
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
                      sessionId={session.id}
                      userId={auth.user.id}
                      nickname={auth.user.name}
                      role={group.participants.find(p => p.user_id === auth?.user?.id)?.role || 'defuser'}
                      participants={group.participants}
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
