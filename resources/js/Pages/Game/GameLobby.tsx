import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { gameApi } from '@/services/gameApi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';

export default function GameLobby() {
  const { auth } = usePage().props as {
    auth: {
      user: {
        id: number;
        name: string;
        email: string;
      };
    };
  };

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>('');
  const [joining, setJoining] = useState(false);
  const [teamCode, setTeamCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<'defuser' | 'expert'>('defuser');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  // Create session with proper response handling
  const handleCreateSession = async () => {
    if (creating) return;

    setCreating(true);
    setError('');

    try {
      await gameApi.initialize();
      const response = await gameApi.createSession(1);

      if (!response?.session?.id) {
        throw new Error('Invalid session response from API');
      }

      const sessionId = response.session.id;

      router.visit(`/game/session/${sessionId}`, {
        method: 'get',
        data: {
          role: 'host',
          participantId: auth.user.id
        },
        onError: (errors) => {
          console.error('❌ Redirect failed:', errors);
          setError('Failed to access session. Please try again.');
          setCreating(false);
        }
      });

    } catch (error: any) {
      console.error('❌ Error creating session:', error);

      let errorMessage = 'Failed to create session. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setCreating(false);
    }
  };

  const handleJoinSession = async () => {
    if (!teamCode.trim() || joining) return;

    setJoining(true);
    setError('');

    try {
      await gameApi.initialize();

      const result = await gameApi.joinSession(
        teamCode.trim().toUpperCase(),
        selectedRole,
        auth.user.name
      );

      if (!result?.session?.id) {
        throw new Error('Invalid join session response');
      }

      router.visit(`/game/session/${result.session.id}`, {
        data: {
          role: selectedRole,
          participantId: result.participant.id
        }
      });

    } catch (error: any) {
      console.error('❌ Join session error:', error);
      setError(error.response?.data?.message || 'Failed to join session. Please check the team code.');
      setJoining(false);
    }
  };

  return (
    <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-xl text-amber-300 leading-tight">
          ⚔️ Ruang Persiapan Guild - CodeAlpha Dungeon
        </h2>
      }
    >
      <Head title="Guild Preparation - CodeAlpha Dungeon" />

      {/* Enhanced Dungeon Animations */}
      <style>{`
        @keyframes torchFlicker {
          0%, 100% { opacity: 1; filter: brightness(1); }
          25% { opacity: 0.8; filter: brightness(1.2); }
          50% { opacity: 0.7; filter: brightness(0.9); }
          75% { opacity: 0.9; filter: brightness(1.1); }
        }
        @keyframes crystalGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(139, 69, 19, 0.6), 0 0 40px rgba(251, 191, 36, 0.3); }
          50% { box-shadow: 0 0 30px rgba(139, 69, 19, 0.8), 0 0 60px rgba(251, 191, 36, 0.5); }
        }
        @keyframes runeFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-8px) rotate(2deg); }
          66% { transform: translateY(-4px) rotate(-1deg); }
        }
        @keyframes shadowPulse {
          0%, 100% { box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.8); }
          50% { box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.9), 0 0 20px rgba(139, 69, 19, 0.4); }
        }
        @keyframes mysticalBorder {
          0%, 100% { border-color: rgb(180, 83, 9); }
          25% { border-color: rgb(217, 119, 6); }
          50% { border-color: rgb(251, 191, 36); }
          75% { border-color: rgb(180, 83, 9); }
        }
        .torch-flicker { animation: torchFlicker 2s ease-in-out infinite; }
        .crystal-glow { animation: crystalGlow 3s ease-in-out infinite; }
        .rune-float { animation: runeFloat 4s ease-in-out infinite; }
        .shadow-pulse { animation: shadowPulse 2.5s ease-in-out infinite; }
        .mystical-border { animation: mysticalBorder 4s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 py-12">
        <div className="absolute inset-0 opacity-5 bg-repeat" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d97706' fill-opacity='0.3'%3E%3Cpath d='M0 0h80v80H0V0zm20 20v40h40V20H20zm20 35a15 15 0 1 1 0-30 15 15 0 0 1 0 30z'/%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        <div className="relative max-w-4xl mx-auto sm:px-6 lg:px-8">
          {/* Welcome Section */}
          <Card className="overflow-hidden border-4 mystical-border shadow-pulse bg-gradient-to-br from-stone-800 via-amber-900 to-stone-900 mb-8">
            <div className="relative p-8 text-center">
              <div className="absolute top-4 left-4 torch-flicker text-4xl">🔥</div>
              <div className="absolute top-4 right-4 torch-flicker text-4xl">🔥</div>
              <div className="absolute bottom-4 left-4 torch-flicker text-3xl">🕯️</div>
              <div className="absolute bottom-4 right-4 torch-flicker text-3xl">🕯️</div>

              <div className="space-y-4">
                <div className="rune-float text-6xl mb-4">⚔️</div>
                <h1 className="text-4xl font-bold text-amber-300 mb-3">
                  Selamat Datang di Ruang Guild, {auth.user.name}!
                </h1>
                <p className="text-amber-200 text-lg leading-relaxed max-w-2xl mx-auto">
                  Bersiaplah untuk bergabung dalam ekspedisi berbahaya di kedalaman CodeAlpha Dungeon.
                  Pilih peran Anda dan bentuk tim yang kuat!
                </p>
                <div className="flex justify-center items-center space-x-4 pt-4">
                  <Badge className="bg-amber-700 text-amber-100 border-amber-600 crystal-glow">
                    🏰 Guild Assembly Hall
                  </Badge>
                  <Badge className="bg-stone-700 text-stone-100 border-stone-600">
                    ⚡ Multi-Stage Challenge
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-4 border-stone-600 bg-gradient-to-br from-stone-900 to-amber-950 shadow-2xl">
            <CardContent className="p-8">
              {/* Tab Navigation */}
              <div className="flex space-x-2 mb-8">
                <button
                  onClick={() => setActiveTab('create')}
                  className={`flex-1 px-8 py-6 rounded-xl font-bold text-lg transition-all duration-300 transform ${
                    activeTab === 'create'
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-stone-900 shadow-2xl crystal-glow scale-105'
                      : 'bg-gradient-to-r from-stone-700 to-stone-800 text-stone-300 hover:from-stone-600 hover:to-stone-700 border-2 border-stone-600'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-3">
                    <span className="text-2xl">👑</span>
                    <span>Buat Guild Baru</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('join')}
                  className={`flex-1 px-8 py-6 rounded-xl font-bold text-lg transition-all duration-300 transform ${
                    activeTab === 'join'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl crystal-glow scale-105'
                      : 'bg-gradient-to-r from-stone-700 to-stone-800 text-stone-300 hover:from-stone-600 hover:to-stone-700 border-2 border-stone-600'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-3">
                    <span className="text-2xl">⚔️</span>
                    <span>Bergabung ke Guild</span>
                  </div>
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <Card className="mb-8 border-4 border-red-600 bg-gradient-to-r from-red-900 to-red-800">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <span className="text-red-400 text-3xl mr-4 torch-flicker">⚠️</span>
                      <div>
                        <h3 className="text-red-200 font-bold text-lg">Peringatan Dungeon!</h3>
                        <p className="text-red-300">{error}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tab Content */}
              {activeTab === 'create' ? (
                <div className="text-center space-y-8">
                  {/* Host Info */}
                  <Card className="border-4 border-amber-600 bg-gradient-to-br from-amber-900 to-stone-800 crystal-glow">
                    <CardContent className="p-8">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="rune-float text-6xl">👑</div>
                        <h3 className="text-amber-300 font-bold text-2xl">Anda akan menjadi Guild Master</h3>
                        <p className="text-amber-200 leading-relaxed max-w-2xl">
                          Sebagai pemimpin guild, Anda memiliki otoritas penuh untuk mengelola sesi ekspedisi.
                          Anda dapat memulai petualangan ketika kedua penjelajah (Bomb Defuser dan Manual Expert) telah bergabung.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 pt-4">
                          <Badge className="bg-amber-700 text-amber-100 border-amber-600">
                            🎯 Kontrol Penuh
                          </Badge>
                          <Badge className="bg-stone-700 text-stone-100 border-stone-600">
                            👥 Manajemen Tim
                          </Badge>
                          <Badge className="bg-emerald-700 text-emerald-100 border-emerald-600">
                            🚀 Start Authority
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Create Button */}
                  <Button
                    onClick={handleCreateSession}
                    disabled={creating}
                    className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 text-2xl font-bold py-8 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed crystal-glow"
                  >
                    {creating ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-stone-900 mr-4"></div>
                        <span>Mempersiapkan Guild...</span>
                        <span className="ml-3 torch-flicker">🔥</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <span className="mr-3 rune-float">👑</span>
                        <span>Dirikan Guild Baru sebagai Master</span>
                        <span className="ml-3 torch-flicker">⚔️</span>
                      </div>
                    )}
                  </Button>

                  <p className="text-stone-400 italic">
                    Klik tombol di atas untuk langsung menciptakan guild baru dan menjadi Guild Master!
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  <h3 className="text-2xl font-bold text-center text-amber-300 mb-6">
                    🏰 Bergabung ke Guild yang Sudah Ada
                  </h3>

                  <div className="space-y-8">
                    {/* Team Code Input */}
                    <div>
                      <label htmlFor="teamCode" className="block text-lg font-bold text-amber-300 mb-4 text-center">
                        🗝️ Kode Akses Guild
                      </label>
                      <div className="relative">
                        <input
                          id="teamCode"
                          type="text"
                          value={teamCode}
                          onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                          placeholder="MASUKKAN KODE 6 DIGIT"
                          className="w-full px-6 py-4 bg-gradient-to-r from-stone-800 to-stone-700 border-4 border-amber-600 rounded-xl text-center text-2xl font-mono tracking-widest text-amber-300 placeholder-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-500 crystal-glow"
                          maxLength={6}
                          disabled={joining}
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-2xl torch-flicker">🔑</div>
                      </div>
                    </div>

                    {/* Role Selection */}
                    <div>
                      <label className="block text-lg font-bold text-amber-300 mb-6 text-center">
                        ⚔️ Pilih Peran Ekspedisi Anda
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Defuser Role */}
                        <Card
                          className={`cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                            selectedRole === 'defuser'
                              ? 'border-4 border-red-500 bg-gradient-to-br from-red-900 to-stone-800 crystal-glow scale-105'
                              : 'border-3 border-stone-600 bg-gradient-to-br from-stone-800 to-stone-900 hover:border-red-400'
                          }`}
                          onClick={() => setSelectedRole('defuser')}
                        >
                          <CardContent className="p-8 text-center">
                            <div className="rune-float text-6xl mb-4">💣</div>
                            <h4 className="font-bold text-2xl text-red-300 mb-3">Bomb Defuser</h4>
                            <p className="text-red-200 leading-relaxed mb-4">
                              Anda akan melihat perangkat berbahaya dan mendeskripsikannya kepada Expert
                            </p>
                            <div className="flex justify-center">
                              <input
                                type="radio"
                                id="defuser"
                                name="role"
                                value="defuser"
                                checked={selectedRole === 'defuser'}
                                onChange={() => setSelectedRole('defuser')}
                                className="w-6 h-6 text-red-600"
                              />
                            </div>
                            {selectedRole === 'defuser' && (
                              <Badge className="mt-3 bg-red-700 text-red-100 border-red-600">
                                ✅ Terpilih
                              </Badge>
                            )}
                          </CardContent>
                        </Card>

                        {/* Expert Role */}
                        <Card
                          className={`cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                            selectedRole === 'expert'
                              ? 'border-4 border-blue-500 bg-gradient-to-br from-blue-900 to-stone-800 crystal-glow scale-105'
                              : 'border-3 border-stone-600 bg-gradient-to-br from-stone-800 to-stone-900 hover:border-blue-400'
                          }`}
                          onClick={() => setSelectedRole('expert')}
                        >
                          <CardContent className="p-8 text-center">
                            <div className="rune-float text-6xl mb-4">📖</div>
                            <h4 className="font-bold text-2xl text-blue-300 mb-3">Manual Expert</h4>
                            <p className="text-blue-200 leading-relaxed mb-4">
                              Anda akan memiliki grimoire berisi panduan untuk menavigasi proses penjinakan
                            </p>
                            <div className="flex justify-center">
                              <input
                                type="radio"
                                id="expert"
                                name="role"
                                value="expert"
                                checked={selectedRole === 'expert'}
                                onChange={() => setSelectedRole('expert')}
                                className="w-6 h-6 text-blue-600"
                              />
                            </div>
                            {selectedRole === 'expert' && (
                              <Badge className="mt-3 bg-blue-700 text-blue-100 border-blue-600">
                                ✅ Terpilih
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Enhanced Role Information (✅ FIXED) */}
                    <Card className="border-3 border-purple-600 bg-gradient-to-br from-purple-900 to-stone-800">
                      <CardContent className="p-6">
                        <p className="text-purple-200 leading-relaxed">
                          <strong className="text-purple-300">Peran Terpilih:</strong> Anda akan bergabung sebagai <strong className="text-amber-300">{selectedRole === 'defuser' ? 'Bomb Defuser' : 'Manual Expert'}</strong>.
                          {selectedRole === 'defuser'
                            ? ' Anda akan melihat perangkat berbahaya dan menjelaskannya kepada rekan tim Anda.'
                            : ' Anda akan memiliki grimoire panduan dan mengarahkan Defuser melalui proses penjinakan yang berbahaya.'
                          }
                        </p>
                      </CardContent>
                    </Card>

                    {/* Join Button */}
                    <Button
                      onClick={handleJoinSession}
                      disabled={!teamCode || joining}
                      className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 hover:from-blue-500 hover:via-purple-500 hover:to-indigo-600 text-white text-2xl font-bold py-8 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed crystal-glow"
                    >
                      {joining ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-white mr-4"></div>
                          <span>Memanggil Guild...</span>
                          <span className="ml-3 torch-flicker">✨</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <span className="mr-3 rune-float">⚔️</span>
                          <span>Bergabung sebagai {selectedRole === 'defuser' ? 'Bomb Defuser' : 'Manual Expert'}</span>
                          <span className="ml-3 torch-flicker">📜</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
