import React, { useState, useEffect } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { gameApi } from '@/services/gameApi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import VoiceChat from '@/Components/Game/VoiceChat';
import TournamentBracket from '@/Components/Game/TournamentBracket';
import Leaderboard from '@/Components/Game/Leaderboard';
import {
  TournamentData,
  TournamentGroup,
  normalizeTournamentData,
  normalizeBoolean
} from '@/types/game';

export default function TournamentLobby() {
  const { auth } = usePage().props as any;

  // ✅ FIXED: Explicit typing for all state variables
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [activeTournament, setActiveTournament] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [joining, setJoining] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<'defuser' | 'expert'>('defuser');
  const [groupName, setGroupName] = useState<string>('');
  const [showVoiceChat, setShowVoiceChat] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedTournament, setSelectedTournament] = useState<TournamentData | null>(null);

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
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .champion-glow { animation: championGlow 3s ease-in-out infinite; }
    .elimination-pulse { animation: eliminationPulse 2s ease-in-out infinite; }
    .battle-ready { animation: battleReady 2s ease-in-out infinite; }
    .fade-in { animation: fadeIn 0.5s ease-out; }
  `;

  useEffect(() => {
    loadTournaments();
    const interval = setInterval(loadTournaments, 5000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Type guards for extra safety
  const isValidTournamentData = (tournament: any): tournament is TournamentData => {
    return tournament &&
           typeof tournament.id === 'number' &&
           typeof tournament.name === 'string' &&
           Array.isArray(tournament.groups);
  };

  const isValidTournamentGroup = (group: any): group is TournamentGroup => {
    return group &&
           typeof group.id === 'number' &&
           typeof group.name === 'string' &&
           Array.isArray(group.participants);
  };

  // ✅ FIXED: Complete data loading function with proper type handling
  const loadTournaments = async (): Promise<void> => {
    try {
      console.log('🔄 Loading tournaments list...');
      const response = await gameApi.getTournaments();

      // ✅ FIXED: Explicit typing and normalization
      const normalizedTournaments: TournamentData[] = (response.tournaments || []).map((tournament: any) => ({
        ...normalizeTournamentData(tournament),
        // ✅ Ensure bracket is always an array to prevent undefined errors
        bracket: Array.isArray(tournament.bracket) ? tournament.bracket : [],
      }));

      setTournaments(normalizedTournaments);

      // ✅ FIXED: Explicit type annotations to prevent 'never' inference
      const userTournament = normalizedTournaments.find((tournament: TournamentData) =>
        Array.isArray(tournament.groups) && tournament.groups.some((group: TournamentGroup) =>
          Array.isArray(group.participants) && group.participants.some((participant: any) =>
            participant.user_id === auth?.user?.id
          )
        )
      );

      if (userTournament) {
        setActiveTournament(userTournament);
      } else {
        setActiveTournament(null);
      }

      setLoading(false);
      setError('');
    } catch (error: any) {
      console.error('❌ Failed to load tournaments:', error);
      setError(error.response?.data?.message || 'Failed to load tournament data');
      setLoading(false);
    }
  };

  const createTournament = async (): Promise<void> => {
    if (creating) return;

    setCreating(true);
    setError('');

    try {
      console.log('🏆 Creating new tournament...');
      const newTournamentName = `Tournament ${new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })}`;

      const response = await gameApi.createTournament({
        name: newTournamentName,
        max_groups: 4
      });

      if (response.success) {
        await loadTournaments();
      } else {
        throw new Error(response.message || 'Failed to create tournament');
      }

      setCreating(false);
    } catch (error: any) {
      console.error('❌ Tournament creation failed:', error);
      setError(error.response?.data?.message || 'Failed to create tournament');
      setCreating(false);
    }
  };

  const joinTournament = async (tournamentId: number): Promise<void> => {
    if (!groupName.trim() || joining) return;

    setJoining(true);
    setError('');

    try {
      console.log('⚔️ Joining tournament ID:', tournamentId);
      const response = await gameApi.joinTournament(tournamentId, {
        group_name: groupName.trim(),
        role: selectedRole,
        nickname: auth.user.name
      });

      if (response.success) {
        await loadTournaments();
        setGroupName('');
        setSelectedTournament(null);

        // Redirect to tournament session
        if (tournamentId && response.group?.id) {
          console.log('✅ Redirecting to tournament session:', tournamentId, 'group:', response.group.id);
          router.visit(`/game/tournament/${tournamentId}`, {
            method: 'get',
            data: { groupId: response.group.id },
            onSuccess: () => {
              console.log('✅ Successfully navigated to tournament session');
            },
            onError: (errors) => {
              console.error('❌ Tournament redirect failed:', errors);
              setError('Failed to join tournament session');
            }
          });
        } else {
          setError('Invalid tournament or group data received');
        }
      }

      setJoining(false);
    } catch (error: any) {
      console.error('❌ Tournament join failed:', error);
      setError(error.response?.data?.message || 'Failed to join tournament');
      setJoining(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      waiting: { color: 'bg-yellow-600', text: 'Waiting', icon: '⏳' },
      qualification: { color: 'bg-blue-600', text: 'Qualification', icon: '🎯' },
      semifinals: { color: 'bg-purple-600', text: 'Semifinals', icon: '⚔️' },
      finals: { color: 'bg-red-600', text: 'Finals', icon: '👑' },
      completed: { color: 'bg-green-600', text: 'Completed', icon: '🏆' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.waiting;

    return (
      <Badge className={`${config.color} text-white flex items-center space-x-1`}>
        <span>{config.icon}</span>
        <span>{config.text}</span>
      </Badge>
    );
  };

  // ✅ FIXED: Helper function to safely get current user team ID
  const getCurrentUserTeamId = (): number | undefined => {
    if (!activeTournament || !Array.isArray(activeTournament.groups)) {
      return undefined;
    }

    const userGroup = activeTournament.groups.find((group: TournamentGroup) =>
      Array.isArray(group.participants) &&
      group.participants.some((participant: any) =>
        participant.user_id === auth?.user?.id
      )
    );

    return userGroup?.id;
  };

  if (loading) {
    return (
      <AuthenticatedLayout
        header={<h2 className="font-semibold text-xl text-amber-300">🏆 Tournament Arena</h2>}
      >
        <Head title="Tournament Arena" />
        <div className="py-12">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <Card className="bg-white shadow-sm sm:rounded-lg p-6 text-center fade-in">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-700">Loading Tournament Arena...</h3>
              <p className="text-gray-500 mt-2">Preparing your battle arena...</p>
            </Card>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout
      header={<h2 className="font-semibold text-xl text-amber-300">🏆 Tournament Arena - Battle Royale</h2>}
    >
      <Head title="Tournament Arena" />
      <style>{tournamentStyles}</style>

      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-purple-900 to-amber-900 py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Main Tournament Content */}
            <div className={normalizeBoolean(showVoiceChat) ? "lg:col-span-3" : "lg:col-span-4"}>
              <div className="space-y-6 fade-in">
                {/* Tournament Header */}
                <Card className="border-4 border-amber-600 bg-gradient-to-br from-amber-900/30 to-stone-900 champion-glow">
                  <CardContent className="p-8 text-center">
                    <div className="text-6xl mb-4">⚔️</div>
                    <h1 className="text-4xl font-bold text-amber-300 mb-4">
                      🏆 CodeAlpha Tournament Arena
                    </h1>
                    <p className="text-amber-200 text-lg leading-relaxed max-w-3xl mx-auto mb-6">
                      Enter the ultimate competition where 4 elite guilds battle for supremacy!
                      Only the fastest and most coordinated teams will survive the elimination rounds.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                      <Badge className="bg-purple-700 text-purple-100 border-purple-600 px-3 py-2">
                        🎯 4-Guild Tournament
                      </Badge>
                      <Badge className="bg-red-700 text-red-100 border-red-600 px-3 py-2">
                        ⏱️ Speed-Based Elimination
                      </Badge>
                      <Badge className="bg-blue-700 text-blue-100 border-blue-600 px-3 py-2">
                        👥 Team Coordination
                      </Badge>
                      <Badge className="bg-green-700 text-green-100 border-green-600 px-3 py-2">
                        🏆 Championship Glory
                      </Badge>
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
                          <h3 className="font-bold text-lg">Tournament Error!</h3>
                          <p>{error}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Active Tournament Display */}
                {activeTournament ? (
                  <div className="space-y-6">
                    <Card className="border-4 border-green-600 bg-green-900/20">
                      <CardHeader>
                        <CardTitle className="text-green-300 text-center text-2xl">
                          🎯 Your Active Tournament
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-center">
                        <h3 className="text-xl font-bold text-green-200 mb-4">
                          {activeTournament.name}
                        </h3>
                        <div className="grid md:grid-cols-3 gap-4 mb-6">
                          <div>{getStatusBadge(activeTournament.status)}</div>
                          <div>
                            <p className="text-green-200">Round {activeTournament.current_round}/3</p>
                          </div>
                          <div>
                            <p className="text-green-200">
                              {Array.isArray(activeTournament.groups)
                                ? activeTournament.groups.filter((group: TournamentGroup) => group.status !== 'eliminated').length
                                : 0} Groups Active
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => router.visit(`/game/tournament/${activeTournament.id}`)}
                          className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-bold rounded-xl"
                        >
                          🚀 Enter Tournament Arena
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Tournament Bracket Display */}
                    {activeTournament.bracket && Array.isArray(activeTournament.bracket) && activeTournament.bracket.length > 0 && (
                      <TournamentBracket
                        tournament={activeTournament}
                        groups={activeTournament.groups || []}
                        loading={false}
                      />
                    )}
                  </div>
                ) : (
                  /* Join/Create Tournament Interface */
                  <div className="space-y-6">
                    {/* Available Tournaments */}
                    <Card className="border-4 border-blue-600 bg-blue-900/20">
                      <CardHeader>
                        <CardTitle className="text-blue-300 text-center text-2xl">
                          📋 Available Tournaments
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {tournaments.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="text-6xl mb-4">🏟️</div>
                            <h3 className="text-xl font-bold text-blue-200 mb-4">
                              No Active Tournaments
                            </h3>
                            <p className="text-blue-300 mb-6">
                              Be the first to start a new tournament and gather warriors for battle!
                            </p>
                            <Button
                              onClick={createTournament}
                              disabled={creating}
                              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 text-lg font-bold rounded-xl champion-glow"
                            >
                              {creating ? (
                                <div className="flex items-center">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                                  Creating Tournament...
                                </div>
                              ) : (
                                '🏆 Create New Tournament'
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="grid gap-4">
                            {tournaments.filter(isValidTournamentData).map((tournament: TournamentData) => (
                              <Card
                                key={tournament.id}
                                className="border-2 border-purple-600 bg-purple-900/20 hover:border-purple-400 transition-all duration-300"
                              >
                                <CardContent className="p-6">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <h4 className="text-xl font-bold text-purple-300 mb-2">
                                        {tournament.name}
                                      </h4>
                                      <div className="flex space-x-4 text-sm mb-2">
                                        {getStatusBadge(tournament.status)}
                                        <span className="text-purple-200">
                                          Groups: {Array.isArray(tournament.groups) ? tournament.groups.length : 0}/{tournament.max_groups}
                                        </span>
                                        <span className="text-purple-200">
                                          Round: {tournament.current_round}/3
                                        </span>
                                      </div>
                                      {Array.isArray(tournament.groups) && tournament.groups.length > 0 && (
                                        <div className="flex items-center space-x-2">
                                          {tournament.groups.slice(0, 3).map((group: TournamentGroup, index: number) => (
                                            <Badge key={group.id} className="bg-gray-700 text-gray-200 text-xs">
                                              {group.name}
                                            </Badge>
                                          ))}
                                          {tournament.groups.length > 3 && (
                                            <Badge className="bg-gray-600 text-gray-300 text-xs">
                                              +{tournament.groups.length - 3} more
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      {Array.isArray(tournament.groups) && tournament.groups.length < tournament.max_groups && tournament.status === 'waiting' ? (
                                        <Button
                                          onClick={() => setSelectedTournament(tournament)}
                                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                                        >
                                          ⚔️ Join Battle
                                        </Button>
                                      ) : (
                                        <div>
                                          <Badge className="bg-gray-700 text-gray-300 mb-2">
                                            {tournament.status === 'waiting' ? 'Full' : 'In Progress'}
                                          </Badge>
                                          <br />
                                          <Button
                                            onClick={() => router.visit(`/game/tournament/${tournament.id}`)}
                                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm rounded-lg"
                                          >
                                            👁️ Spectate
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}

                            {/* Create New Tournament Button */}
                            <Card className="border-2 border-dashed border-amber-600 bg-amber-900/10 hover:bg-amber-900/20 transition-all duration-300">
                              <CardContent className="p-6 text-center">
                                <Button
                                  onClick={createTournament}
                                  disabled={creating}
                                  className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white py-4 text-lg font-bold rounded-xl"
                                >
                                  {creating ? (
                                    <div className="flex items-center justify-center">
                                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                                      Forging New Arena...
                                    </div>
                                  ) : (
                                    '🏆 Create New Tournament'
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Join Tournament Form */}
                    {selectedTournament && (
                      <Card className="border-4 border-green-600 bg-green-900/20">
                        <CardHeader>
                          <CardTitle className="text-green-300 text-center text-2xl">
                            ⚔️ Join {selectedTournament.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Group Name Input */}
                          <div>
                            <label className="block text-lg font-bold text-green-300 mb-3">
                              🏰 Guild Name
                            </label>
                            <input
                              type="text"
                              value={groupName}
                              onChange={(e) => setGroupName(e.target.value)}
                              placeholder="Enter your guild name"
                              className="w-full px-4 py-3 bg-stone-800 border-2 border-green-600 rounded-xl text-green-300 placeholder-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                              maxLength={30}
                            />
                          </div>

                          {/* Role Selection */}
                          <div>
                            <label className="block text-lg font-bold text-green-300 mb-3">
                              ⚔️ Your Battle Role
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                              <Card
                                className={`cursor-pointer transition-all duration-300 ${
                                  selectedRole === 'defuser'
                                    ? 'border-3 border-red-500 bg-red-900/30 scale-105'
                                    : 'border-2 border-gray-600 bg-gray-900/30 hover:border-red-400'
                                }`}
                                onClick={() => setSelectedRole('defuser')}
                              >
                                <CardContent className="p-6 text-center">
                                  <div className="text-4xl mb-3">💣</div>
                                  <h4 className="font-bold text-lg text-red-300 mb-2">
                                    Bomb Defuser
                                  </h4>
                                  <p className="text-red-200 text-sm">
                                    Handle the dangerous devices
                                  </p>
                                </CardContent>
                              </Card>

                              <Card
                                className={`cursor-pointer transition-all duration-300 ${
                                  selectedRole === 'expert'
                                    ? 'border-3 border-blue-500 bg-blue-900/30 scale-105'
                                    : 'border-2 border-gray-600 bg-gray-900/30 hover:border-blue-400'
                                }`}
                                onClick={() => setSelectedRole('expert')}
                              >
                                <CardContent className="p-6 text-center">
                                  <div className="text-4xl mb-3">📖</div>
                                  <h4 className="font-bold text-lg text-blue-300 mb-2">
                                    Manual Expert
                                  </h4>
                                  <p className="text-blue-200 text-sm">
                                    Guide with knowledge
                                  </p>
                                </CardContent>
                              </Card>
                            </div>
                          </div>

                          {/* Enhanced Role Information */}
                          <Card className="border-3 border-purple-600 bg-gradient-to-br from-purple-900 to-stone-800">
                            <CardContent className="p-6">
                              <p className="text-purple-200 leading-relaxed">
                                <strong className="text-purple-300">Selected Role:</strong> You will join as{' '}
                                <strong className="text-amber-300">
                                  {selectedRole === 'defuser' ? 'Bomb Defuser' : 'Manual Expert'}
                                </strong>.{' '}
                                {selectedRole === 'defuser'
                                  ? 'You will see the dangerous devices and describe them to your teammate.'
                                  : 'You will have the instruction manual and guide the Defuser through the disarming process.'
                                }
                              </p>
                            </CardContent>
                          </Card>

                          {/* Join Button */}
                          <div className="flex space-x-4">
                            <Button
                              onClick={() => joinTournament(selectedTournament.id)}
                              disabled={!groupName.trim() || joining}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-bold rounded-xl"
                            >
                              {joining ? (
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                                  Joining Battle...
                                </div>
                              ) : (
                                '⚔️ Enter Tournament'
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedTournament(null);
                                setGroupName('');
                              }}
                              className="bg-gray-600 hover:bg-gray-700 text-white py-4 px-8 rounded-xl"
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Tournament Leaderboards */}
                    {tournaments.length > 0 && (
                      <Card className="border-4 border-purple-600 bg-purple-900/20">
                        <CardHeader>
                          <CardTitle className="text-purple-300 text-center text-2xl">
                            🏆 Global Tournament Leaderboard
                          </CardTitle>
                          <CardDescription className="text-purple-200 text-center">
                            Top performing guilds across all tournaments
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Leaderboard
                            teams={
                              tournaments.length > 0
                                ? tournaments
                                    .filter(isValidTournamentData)
                                    .flatMap((tournament: TournamentData) =>
                                      Array.isArray(tournament.groups)
                                        ? tournament.groups.filter(isValidTournamentGroup)
                                        : []
                                    )
                                    .filter((group: TournamentGroup) =>
                                      typeof group.rank === 'number' && group.rank <= 10
                                    )
                                    .sort((a: TournamentGroup, b: TournamentGroup) =>
                                      (a.rank || 999) - (b.rank || 999)
                                    )
                                    .map((group: TournamentGroup) => ({
                                      id: group.id,
                                      name: group.name,
                                      rank: group.rank,
                                      score: group.score,
                                      status: group.status,
                                      completion_time: group.completion_time,
                                      participants: group.participants,
                                    }))
                                : []
                            }
                            currentUserTeamId={getCurrentUserTeamId()}
                            title="Global Rankings"
                            showParticipants={true}
                            maxTeams={10}
                          />
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Voice Chat Sidebar */}
            {normalizeBoolean(showVoiceChat) && (
              <div className="lg:col-span-1">
                <Card className="border-3 border-green-600 bg-green-900/20 sticky top-4">
                  <CardHeader>
                    <CardTitle className="text-green-300 flex items-center justify-between">
                      <span>🎙️ Tournament Lobby</span>
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
                      sessionId={0} // Lobby mode - no specific session
                      userId={auth?.user?.id || 0}
                      nickname={auth?.user?.name || 'Player'}
                      role="host"
                      participants={[]}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Floating Voice Chat Toggle */}
          {!normalizeBoolean(showVoiceChat) && (
            <div className="fixed bottom-6 right-6 z-50">
              <Button
                onClick={() => setShowVoiceChat(true)}
                className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-2xl champion-glow"
                title="Enable Tournament Communication"
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
