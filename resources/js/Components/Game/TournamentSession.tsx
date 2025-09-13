import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { gameApi } from '@/services/gameApi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import GamePlay from '@/Components/Game/GamePlay';
import VoiceChat from '@/Components/Game/VoiceChat';

interface Props {
  tournamentId: number;
  groupId?: number;
}

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
  session: any;
  gameState: any;
  leaderboard: Array<{
    id: number;
    name: string;
    status: string;
    completion_time?: number;
    rank?: number;
    participants: Array<{
      nickname: string;
      role: string;
    }>;
  }>;
}

export default function TournamentSession({ tournamentId, groupId }: Props) {
  const { auth } = usePage().props as any;
  const [tournamentData, setTournamentData] = useState<TournamentSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showVoiceChat, setShowVoiceChat] = useState(true);

  // Tournament animations
  const tournamentStyles = `
    @keyframes urgentPulse {
      0%, 100% { box-shadow: 0 0 20px rgba(255, 0, 0, 0.6); }
      50% { box-shadow: 0 0 40px rgba(255, 0, 0, 0.9); }
    }
    @keyframes competitiveBorder {
      0%, 100% { border-color: rgb(234, 179, 8); }
      25% { border-color: rgb(249, 115, 22); }
      50% { border-color: rgb(239, 68, 68); }
      75% { border-color: rgb(168, 85, 247); }
    }
    @keyframes championGlow {
      0%, 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.8); }
      50% { box-shadow: 0 0 50px rgba(255, 215, 0, 1); }
    }
    .urgent-pulse { animation: urgentPulse 2s ease-in-out infinite; }
    .competitive-border { animation: competitiveBorder 3s ease-in-out infinite; }
    .champion-glow { animation: championGlow 3s ease-in-out infinite; }
  `;

  useEffect(() => {
    loadTournamentData();
    const interval = setInterval(loadTournamentData, 3000); // Frequent updates for competitive play
    return () => clearInterval(interval);
  }, [tournamentId, groupId]);

  const loadTournamentData = async () => {
    try {
      const response = await gameApi.getTournamentSession(tournamentId, groupId);
      setTournamentData(response);
      setLoading(false);
    } catch (error: any) {
      console.error('Failed to load tournament data:', error);
      setError('Failed to load tournament session');
      setLoading(false);
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
    if (!tournamentData?.session) return;

    try {
      const result = await gameApi.submitAttempt(
        tournamentData.session.id,
        tournamentData.gameState.puzzle.key,
        inputValue
      );

      // Handle tournament completion
      if (result.gameComplete) {
        await gameApi.completeTournamentSession(tournamentData.session.id);
        await loadTournamentData();
      } else {
        handleGameStateUpdate(result.session);
      }
    } catch (error: any) {
      console.error('Tournament attempt failed:', error);
    }
  };

  const getRoundName = (round: number) => {
    switch (round) {
      case 1: return 'Qualification Round';
      case 2: return 'Semifinals';
      case 3: return 'Finals';
      default: return `Round ${round}`;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      waiting: { color: 'bg-yellow-600', text: 'Waiting', icon: '⏳' },
      ready: { color: 'bg-blue-600', text: 'Ready', icon: '✅' },
      playing: { color: 'bg-green-600', text: 'Playing', icon: '⚔️' },
      completed: { color: 'bg-purple-600', text: 'Completed', icon: '🏁' },
      eliminated: { color: 'bg-red-600', text: 'Eliminated', icon: '💀' },
      champion: { color: 'bg-yellow-500', text: 'Champion', icon: '👑' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.waiting;

    return (
      <Badge className={`${config.color} text-white flex items-center space-x-1`}>
        <span>{config.icon}</span>
        <span>{config.text}</span>
      </Badge>
    );
  };

  if (loading) {
    return (
      <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-amber-300">🏆 Tournament Arena</h2>}>
        <Head title="Tournament Session" />
        <div className="py-12">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-700">Loading Tournament Battle...</h3>
            </Card>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error || !tournamentData) {
    return (
      <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-red-300">⚠️ Tournament Error</h2>}>
        <Head title="Tournament Error" />
        <div className="py-12">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <Card className="border-4 border-red-600 bg-red-900/20 p-8 text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-red-300 mb-4">Tournament Access Error</h3>
              <p className="text-red-200 mb-6">{error || 'Unable to access tournament session'}</p>
              <div className="space-x-4">
                <button
                  onClick={() => window.location.reload()}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
                >
                  Retry
                </button>
                <button
                  onClick={() => window.location.href = '/game/tournament'}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
                >
                  Back to Tournament Lobby
                </button>
              </div>
            </Card>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  const { tournament, group, session, gameState, leaderboard } = tournamentData;
  const userRole = group.participants.find(p => p.user_id === auth.user.id)?.role;
  const isEliminated = group.status === 'eliminated';
  const isChampion = group.status === 'champion';

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-amber-300">
            🏆 {tournament.name} - {getRoundName(tournament.current_round)}
          </h2>
          <Badge className="bg-purple-600 text-white text-lg px-4 py-2">
            {group.name}
          </Badge>
        </div>
      }
    >
      <Head title={`Tournament: ${tournament.name}`} />

      <style>{tournamentStyles}</style>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-900 to-amber-900 py-8">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-6">

            {/* Main Tournament Game Area */}
            <div className={`${showVoiceChat ? 'lg:col-span-4' : 'lg:col-span-5'} space-y-6`}>

              {/* Tournament Status Header */}
              <Card className={`border-4 competitive-border ${
                isEliminated ? 'bg-red-900/30 urgent-pulse' :
                isChampion ? 'bg-yellow-900/30 champion-glow' :
                'bg-purple-900/20'
              }`}>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-4 gap-4 text-center">
                    <div>
                      <h3 className="text-amber-300 font-bold text-lg mb-2">Tournament Status</h3>
                      {getStatusBadge(tournament.status)}
                    </div>
                    <div>
                      <h3 className="text-amber-300 font-bold text-lg mb-2">Your Group</h3>
                      {getStatusBadge(group.status)}
                    </div>
                    <div>
                      <h3 className="text-amber-300 font-bold text-lg mb-2">Your Role</h3>
                      <Badge className={`${
                        userRole === 'defuser' ? 'bg-red-600' : 'bg-blue-600'
                      } text-white`}>
                        {userRole === 'defuser' ? '💣 Defuser' : '📖 Expert'}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-amber-300 font-bold text-lg mb-2">Round</h3>
                      <Badge className="bg-purple-600 text-white">
                        {tournament.current_round}/3
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
                      <button
                        onClick={() => window.location.href = '/game/tournament'}
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl text-lg font-bold"
                      >
                        Return to Tournament Lobby
                      </button>
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
                  </CardContent>
                </Card>
              )}

              {/* Active Game Interface */}
              {!isEliminated && !isChampion && group.status === 'playing' && gameState && (
                <Card className="border-4 border-green-600 bg-green-900/10 competitive-border">
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

              {/* Waiting for Next Round */}
              {group.status === 'completed' && tournament.status !== 'completed' && (
                <Card className="border-4 border-blue-600 bg-blue-900/20">
                  <CardContent className="p-8 text-center">
                    <div className="text-6xl mb-4">⏳</div>
                    <h3 className="text-2xl font-bold text-blue-300 mb-4">
                      Round Completed!
                    </h3>
                    <p className="text-blue-200 text-lg mb-6">
                      Waiting for other groups to finish...
                    </p>
                    <div className="bg-blue-800/30 p-4 rounded-lg">
                      <p className="text-blue-100">Your completion time:
                        <strong className="text-blue-300 text-xl ml-2">
                          {Math.floor((group.completion_time || 0) / 60)}:{((group.completion_time || 0) % 60).toString().padStart(2, '0')}
                        </strong>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Tournament Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-6 sticky top-4">

                {/* Live Leaderboard */}
                <Card className="border-3 border-amber-600 bg-amber-900/20">
                  <CardHeader>
                    <CardTitle className="text-amber-300 text-center flex items-center justify-center">
                      <span className="mr-2">🏆</span>
                      Live Rankings
                      <span className="ml-2">⚡</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {leaderboard.map((team, index) => (
                      <div
                        key={team.id}
                        className={`p-3 rounded-lg border-2 transition-all duration-300 ${
                          team.id === group.id
                            ? 'border-yellow-500 bg-yellow-900/30 champion-glow'
                            : team.status === 'eliminated'
                              ? 'border-red-600 bg-red-900/20'
                              : 'border-gray-600 bg-gray-900/20'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className={`font-bold ${
                            team.id === group.id ? 'text-yellow-300' :
                            team.status === 'eliminated' ? 'text-red-300' : 'text-gray-300'
                          }`}>
                            {team.name}
                          </span>
                          {team.rank && (
                            <Badge className={`${
                              team.rank === 1 ? 'bg-yellow-600' :
                              team.rank === 2 ? 'bg-gray-500' :
                              team.rank === 3 ? 'bg-amber-600' :
                              'bg-red-600'
                            } text-white`}>
                              #{team.rank}
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm">
                          {getStatusBadge(team.status)}
                          {team.completion_time && (
                            <div className="mt-2 text-xs text-gray-400">
                              Time: {Math.floor(team.completion_time / 60)}:{(team.completion_time % 60).toString().padStart(2, '0')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Voice Chat */}
                {showVoiceChat && (
                  <Card className="border-3 border-green-600 bg-green-900/20">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-green-300 flex items-center">
                          <span className="mr-2">🎙️</span>
                          Team Comm
                        </CardTitle>
                        <button
                          onClick={() => setShowVoiceChat(false)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Hide
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <VoiceChat
                        sessionId={session?.id || 0}
                        userId={auth.user.id}
                        nickname={auth.user.name}
                        role={userRole as 'defuser' | 'expert'}
                        participants={group.participants}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Tournament Tips */}
                <Card className="border-3 border-purple-600 bg-purple-900/20">
                  <CardHeader>
                    <CardTitle className="text-purple-300 text-center">
                      ⚔️ Tournament Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-purple-200 space-y-2">
                      <li className="flex items-start">
                        <span className="mr-2 text-yellow-400">⚡</span>
                        <span>Speed is crucial - fastest teams advance</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-red-400">💥</span>
                        <span>Minimize wrong attempts - they cost time</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-blue-400">🎙️</span>
                        <span>Clear communication is key</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-green-400">🎯</span>
                        <span>Stay calm under pressure</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Floating Voice Chat Toggle */}
          {!showVoiceChat && (
            <div className="fixed bottom-6 right-6 z-50">
              <button
                onClick={() => setShowVoiceChat(true)}
                className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-2xl competitive-border"
                title="Enable Team Communication"
              >
                <span className="text-2xl">🎙️</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
