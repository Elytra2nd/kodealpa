import React, { useState, useEffect } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { gameApi } from '@/services/gameApi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import VoiceChat from '@/Components/Game/VoiceChat';

interface TournamentData {
  id: number;
  name: string;
  status: 'waiting' | 'qualification' | 'semifinals' | 'finals' | 'completed';
  current_round: number;
  max_groups: number;
  groups: TournamentGroup[];
  bracket: TournamentBracket[];
  created_at: string;
  starts_at: string;
}

interface TournamentGroup {
  id: number;
  name: string;
  status: 'waiting' | 'ready' | 'playing' | 'completed' | 'eliminated' | 'champion';
  participants: Array<{
    id: number;
    user_id: number;
    nickname: string;
    role: 'defuser' | 'expert';
  }>;
  completion_time: number | null;
  score: number;
  rank: number | null;
}

interface TournamentBracket {
  round: number;
  matches: Array<{
    id: number;
    group1_id: number;
    group2_id: number;
    winner_group_id: number | null;
    status: 'pending' | 'active' | 'completed';
    completion_times: {
      group1_time: number | null;
      group2_time: number | null;
    };
  }>;
}

export default function TournamentLobby() {
  const { auth } = usePage().props as any;
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [activeTournament, setActiveTournament] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'defuser' | 'expert'>('defuser');
  const [groupName, setGroupName] = useState('');
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [error, setError] = useState<string>('');

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
    loadTournaments();
    const interval = setInterval(loadTournaments, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadTournaments = async () => {
    try {
      const response = await gameApi.getTournaments();
      const tournaments: TournamentData[] = (response.tournaments || []).map((t: any) => ({
        ...t,
        groups: t.groups.map((g: any) => ({
          ...g,
          completion_time: typeof g.completion_time === 'undefined' ? null : g.completion_time,
        })),
        bracket: t.bracket?.map((b: any) => ({
          ...b,
          matches: b.matches.map((m: any) => ({
            ...m,
            completion_times: {
              group1_time: typeof m.completion_times?.group1_time === 'undefined' ? null : m.completion_times?.group1_time,
              group2_time: typeof m.completion_times?.group2_time === 'undefined' ? null : m.completion_times?.group2_time,
            }
          }))
        })) || [],
      }));

      setTournaments(tournaments);

      const userTournament = tournaments.find((t: TournamentData) =>
        t.groups.some(group =>
          group.participants.some(p => p.user_id === auth?.user?.id)
        )
      );

      if (userTournament) {
        setActiveTournament(userTournament);
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Failed to load tournaments:', error);
      setError('Failed to load tournament data');
      setLoading(false);
    }
  };

  const createTournament = async () => {
    if (creating) return;
    setCreating(true);
    setError('');
    try {
      await gameApi.createTournament({
        name: `Tournament ${Date.now()}`,
        max_groups: 4
      });
      await loadTournaments();
      setCreating(false);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create tournament');
      setCreating(false);
    }
  };

  const joinTournament = async (tournamentId: number) => {
    if (!groupName.trim() || joining) return;
    setJoining(true);
    setError('');
    try {
      const response = await gameApi.joinTournament(tournamentId, {
        group_name: groupName.trim(),
        role: selectedRole,
        nickname: auth.user.name
      });
      if (response.success) {
        await loadTournaments();
        setGroupName('');
        router.visit(`/game/tournament/${tournamentId}`, {
          data: { groupId: response.group.id }
        });
      }
      setJoining(false);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to join tournament');
      setJoining(false);
    }
  };

  const renderTournamentBracket = (tournament: TournamentData) => {
    const { groups } = tournament;
    const qualificationGroups = groups.slice(0, 4);

    return (
      <Card className="border-4 border-amber-600 bg-gradient-to-br from-amber-900/20 to-stone-900">
        <CardHeader>
          <CardTitle className="text-amber-300 text-center text-2xl flex items-center justify-center">
            <span className="mr-2">🏆</span>
            Tournament Bracket
            <span className="ml-2">⚔️</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Qualification Round */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-center text-purple-300 mb-6">
              🎯 Qualification Round (Top 3 Advance)
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {qualificationGroups.map((group: TournamentGroup) => (
                <Card
                  key={group.id}
                  className={`transition-all duration-300 ${
                    group.status === 'eliminated'
                      ? 'border-3 border-red-600 bg-red-900/30 elimination-pulse'
                      : group.status === 'completed'
                        ? 'border-3 border-green-600 bg-green-900/30'
                        : group.status === 'playing'
                          ? 'border-3 border-yellow-600 bg-yellow-900/30 battle-ready'
                          : 'border-2 border-gray-600 bg-gray-900/30'
                  }`}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">
                      {group.status === 'eliminated' ? '💀' :
                       group.status === 'completed' ? '✅' :
                       group.status === 'playing' ? '⚔️' : '⏳'}
                    </div>
                    <h4 className="font-bold text-lg mb-2 text-amber-300">
                      {group.name}
                    </h4>
                    <p className="text-sm text-gray-300 mb-2">
                      Players: {group.participants.length}/2
                    </p>

                    {group.completion_time && (
                      <div className="text-center">
                        <Badge className={`${
                          group.status === 'eliminated'
                            ? 'bg-red-700 text-red-100'
                            : 'bg-green-700 text-green-100'
                        }`}>
                          {Math.floor(group.completion_time / 60)}:{(group.completion_time % 60).toString().padStart(2, '0')}
                        </Badge>
                        {group.rank && (
                          <p className="text-xs text-gray-400 mt-1">
                            Rank #{group.rank}
                          </p>
                        )}
                      </div>
                    )}

                    {group.status === 'eliminated' && (
                      <Badge className="mt-2 bg-red-700 text-red-100">
                        ELIMINATED
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Semifinals & Finals */}
          {tournament.status !== 'qualification' && (
            <div className="space-y-8">
              {/* Semifinals */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-blue-300 mb-6">
                  🥊 Semifinals (Best of 3 Groups)
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {tournament.bracket?.filter(b => b.round === 2).map((bracket, index) => (
                    <Card key={index} className="border-3 border-blue-600 bg-blue-900/20">
                      <CardContent className="p-6 text-center">
                        <h4 className="font-bold text-lg text-blue-300 mb-4">
                          Semifinal {index + 1}
                        </h4>
                        <div className="space-y-3">
                          {bracket.matches.map(match => (
                            <div key={match.id} className="bg-blue-800/30 p-3 rounded">
                              <p className="text-blue-200">
                                Group {match.group1_id} vs Group {match.group2_id}
                              </p>
                              {match.winner_group_id && (
                                <Badge className="mt-2 bg-blue-700 text-blue-100">
                                  Winner: Group {match.winner_group_id}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Finals */}
              {tournament.status === 'finals' && (
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-yellow-300 mb-6 champion-glow">
                    👑 CHAMPIONSHIP FINALS 👑
                  </h3>
                  <Card className="border-4 border-yellow-600 bg-gradient-to-br from-yellow-900/30 to-amber-900/30 champion-glow max-w-2xl mx-auto">
                    <CardContent className="p-8">
                      <div className="text-6xl mb-4">🏆</div>
                      <h4 className="text-2xl font-bold text-yellow-300 mb-4">
                        Ultimate Showdown
                      </h4>
                      <div className="bg-yellow-800/30 p-6 rounded-lg">
                        <p className="text-yellow-200 text-lg">
                          Battle for the Championship Title!
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tournament Winner */}
              {tournament.status === 'completed' && (
                <div className="text-center">
                  <Card className="border-4 border-yellow-600 bg-gradient-to-br from-yellow-900/50 to-amber-900/50 champion-glow max-w-2xl mx-auto">
                    <CardContent className="p-8">
                      <div className="text-8xl mb-4">🏆</div>
                      <h3 className="text-3xl font-bold text-yellow-300 mb-4">
                        CHAMPIONS!
                      </h3>
                      <div className="bg-yellow-800/50 p-6 rounded-lg">
                        <h4 className="text-2xl font-bold text-yellow-100 mb-2">
                          Victory Group
                        </h4>
                        <p className="text-yellow-200">
                          Congratulations to the tournament winners!
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-amber-300">⚔️ Tournament Arena</h2>}>
        <Head title="Tournament Arena" />
        <div className="py-12">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="bg-white shadow-sm sm:rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-700">Loading Tournament Arena...</h3>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-amber-300">⚔️ Tournament Arena - Battle Royale</h2>}>
      <Head title="Tournament Arena" />

      <style>{tournamentStyles}</style>

      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-purple-900 to-amber-900 py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-6">

            {/* Main Tournament Content */}
            <div className={`${showVoiceChat ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-6`}>

              {/* Tournament Header */}
              <Card className="border-4 border-amber-600 bg-gradient-to-br from-amber-900/30 to-stone-900 champion-glow">
                <CardContent className="p-8 text-center">
                  <div className="text-6xl mb-4">🏆</div>
                  <h1 className="text-4xl font-bold text-amber-300 mb-4">
                    CodeAlpha Tournament Arena
                  </h1>
                  <p className="text-amber-200 text-lg leading-relaxed max-w-3xl mx-auto mb-6">
                    Enter the ultimate competition where 4 elite guilds battle for supremacy!
                    Only the fastest and most coordinated teams will survive the elimination rounds.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Badge className="bg-purple-700 text-purple-100 border-purple-600">
                      🎯 4-Guild Tournament
                    </Badge>
                    <Badge className="bg-red-700 text-red-100 border-red-600">
                      ⏱️ Speed-Based Elimination
                    </Badge>
                    <Badge className="bg-blue-700 text-blue-100 border-blue-600">
                      👥 Team Coordination
                    </Badge>
                    <Badge className="bg-green-700 text-green-100 border-green-600">
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
                        <div>
                          <Badge className={`text-lg px-4 py-2 ${
                            activeTournament.status === 'qualification' ? 'bg-yellow-700 text-yellow-100' :
                            activeTournament.status === 'semifinals' ? 'bg-blue-700 text-blue-100' :
                            activeTournament.status === 'finals' ? 'bg-purple-700 text-purple-100' :
                            'bg-gray-700 text-gray-100'
                          }`}>
                            {activeTournament.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-green-200">Round {activeTournament.current_round}</p>
                        </div>
                        <div>
                          <p className="text-green-200">
                            {activeTournament.groups.filter(g => g.status !== 'eliminated').length} Groups Active
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

                  {/* Tournament Bracket */}
                  {renderTournamentBracket(activeTournament)}
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
                              <>🏆 Create New Tournament</>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {tournaments.map(tournament => (
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
                                    <div className="flex space-x-4 text-sm">
                                      <span className="text-purple-200">
                                        Status: <Badge className="bg-purple-700">{tournament.status}</Badge>
                                      </span>
                                      <span className="text-purple-200">
                                        Groups: {tournament.groups.length}/{tournament.max_groups}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {tournament.groups.length < tournament.max_groups && tournament.status === 'waiting' ? (
                                      <Button
                                        onClick={() => {
                                          setActiveTournament(tournament);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                                      >
                                        ⚔️ Join Battle
                                      </Button>
                                    ) : (
                                      <Badge className="bg-gray-700 text-gray-300">
                                        {tournament.status === 'waiting' ? 'Full' : 'In Progress'}
                                      </Badge>
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
                                  <>🏆 Create New Tournament</>
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Join Tournament Form */}
                  {activeTournament && activeTournament.groups.length < activeTournament.max_groups && (
                    <Card className="border-4 border-green-600 bg-green-900/20">
                      <CardHeader>
                        <CardTitle className="text-green-300 text-center text-2xl">
                          ⚔️ Join {activeTournament.name}
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
                              <strong className="text-purple-300">Peran Terpilih:</strong> Anda akan bergabung sebagai <strong className="text-amber-300">{selectedRole === 'defuser' ? 'Bomb Defuser' : 'Manual Expert'}</strong>.
                              {selectedRole === 'defuser'
                                ? ' Anda akan melihat perangkat berbahaya dan menjelaskannya kepada rekan tim Anda.'
                                : ' Anda akan memiliki grimoire panduan dan mengarahkan Defuser melalui proses penjinakan yang berbahaya.'
                              }
                            </p>
                            {showVoiceChat && (
                              <p className="text-green-200 mt-2">
                                <strong className="text-green-300">🎙️ Voice Communication:</strong> Voice chat is enabled to enhance coordination with your guild partner.
                              </p>
                            )}
                          </CardContent>
                        </Card>

                        {/* Join Button */}
                        <div className="flex space-x-4">
                          <Button
                            onClick={() => joinTournament(activeTournament.id)}
                            disabled={!groupName.trim() || joining}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-bold rounded-xl"
                          >
                            {joining ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                                Joining Battle...
                              </div>
                            ) : (
                              <>⚔️ Enter Tournament</>
                            )}
                          </Button>
                          <Button
                            onClick={() => setActiveTournament(null)}
                            className="bg-gray-600 hover:bg-gray-700 text-white py-4 px-8 rounded-xl"
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {/* Voice Chat Sidebar */}
            {showVoiceChat && (
              <div className="lg:col-span-1">
                <Card className="border-3 border-green-600 bg-green-900/20 sticky top-4">
                  <CardHeader>
                    <CardTitle className="text-green-300 flex items-center justify-between">
                      <span>🎙️ Tournament Comm</span>
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
                      sessionId={activeTournament?.id || 0}
                      userId={auth.user.id}
                      nickname={auth.user.name}
                      role="host"
                      participants={[]}
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
