import React, { useState, useCallback, useEffect } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { gameApi } from '@/services/gameApi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import VoiceChat from '@/Components/Game/VoiceChat';

// Konstanta untuk konfigurasi
const TEAM_CODE_LENGTH = 6;
const ERROR_DISPLAY_DURATION = 5000;

// Tipe untuk Props
interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface PageProps {
  auth: {
    user: AuthUser;
  };
}

type GameMode = 'select' | 'normal' | 'tournament';
type ActiveTab = 'create' | 'join';
type Role = 'defuser' | 'expert';

export default function GameLobby() {
  const { auth } = usePage().props as PageProps;

  // State Management
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('defuser');
  const [activeTab, setActiveTab] = useState<ActiveTab>('create');
  const [gameMode, setGameMode] = useState<GameMode>('select');
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [voiceChatMinimized, setVoiceChatMinimized] = useState(false);

  // Temporary session data for voice chat preview (using 0 as temporary ID for lobby)
  const [tempSessionId] = useState<number>(0);

  // Auto-clear error setelah beberapa detik
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), ERROR_DISPLAY_DURATION);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handler untuk membuat sesi baru
  const handleCreateSession = useCallback(async () => {
    if (creating) return;

    setCreating(true);
    setError('');

    try {
      await gameApi.initialize();
      const response = await gameApi.createSession(1);

      if (!response?.session?.id) {
        throw new Error('Respons sesi tidak valid dari server');
      }

      const sessionId = response.session.id;

      router.visit(`/game/session/${sessionId}`, {
        method: 'get',
        data: {
          role: 'host',
          participantId: auth.user.id,
        },
        onError: (errors) => {
          console.error('❌ Gagal redirect:', errors);
          setError('Gagal mengakses sesi. Silakan coba lagi.');
          setCreating(false);
        },
      });
    } catch (error: any) {
      console.error('❌ Error membuat sesi:', error);

      let errorMessage = 'Gagal membuat sesi. Silakan coba lagi.';

      if (error.response?.status === 429) {
        errorMessage = 'Terlalu banyak permintaan. Mohon tunggu sebentar.';
      } else if (error.response?.status === 503) {
        errorMessage = 'Server sedang sibuk. Silakan coba lagi nanti.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setCreating(false);
    }
  }, [creating, auth.user.id]);

  // Handler untuk bergabung ke sesi
  const handleJoinSession = useCallback(async () => {
    const trimmedCode = teamCode.trim().toUpperCase();

    if (!trimmedCode || joining) return;

    if (trimmedCode.length !== TEAM_CODE_LENGTH) {
      setError(`Kode guild harus ${TEAM_CODE_LENGTH} karakter`);
      return;
    }

    setJoining(true);
    setError('');

    try {
      await gameApi.initialize();

      const result = await gameApi.joinSession(
        trimmedCode,
        selectedRole,
        auth.user.name
      );

      if (!result?.session?.id) {
        throw new Error('Respons join sesi tidak valid');
      }

      router.visit(`/game/session/${result.session.id}`, {
        data: {
          role: selectedRole,
          participantId: result.participant.id,
        },
      });
    } catch (error: any) {
      console.error('❌ Error join sesi:', error);

      let errorMessage = 'Gagal bergabung ke sesi. Periksa kode guild Anda.';

      if (error.response?.status === 404) {
        errorMessage = 'Kode guild tidak ditemukan atau sudah kadaluarsa.';
      } else if (error.response?.status === 409) {
        errorMessage = 'Sesi sudah penuh atau peran sudah diambil.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setError(errorMessage);
      setJoining(false);
    }
  }, [teamCode, joining, selectedRole, auth.user.name]);

  // Handler untuk mode turnamen
  const handleTournamentMode = useCallback(() => {
    router.visit('/game/tournament');
  }, []);

  // Handler untuk kembali ke pemilihan mode
  const handleBackToModeSelection = useCallback(() => {
    setGameMode('select');
    setError('');
    setTeamCode('');
  }, []);

  // Handler untuk toggle voice chat
  const handleToggleVoiceChat = useCallback(() => {
    setShowVoiceChat(prev => !prev);
    if (showVoiceChat) {
      setVoiceChatMinimized(false);
    }
  }, [showVoiceChat]);

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
            ⚔️ Ruang Persiapan Guild - CodeAlpha Dungeon
          </h2>
          {gameMode !== 'select' && (
            <Button
              onClick={handleBackToModeSelection}
              className="bg-stone-600 hover:bg-stone-700 text-stone-200"
              disabled={creating || joining}
            >
              ← Kembali ke Pemilihan Mode
            </Button>
          )}
        </div>
      }
    >
      <Head title="Game Lobby" />

      {/* Background Animations */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 text-6xl animate-pulse">🔥</div>
        <div className="absolute top-40 right-20 text-5xl animate-bounce">⚔️</div>
        <div className="absolute bottom-20 left-20 text-4xl animate-spin-slow">✨</div>
      </div>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mode Selection Screen */}
          {gameMode === 'select' && (
            <div className="space-y-8">
              {/* Welcome Section */}
              <Card className="bg-gradient-to-br from-stone-800 to-stone-900 border-4 border-amber-600">
                <CardContent className="p-8">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center gap-4 text-4xl mb-4">
                      <span className="animate-pulse">🔥</span>
                      <span className="animate-pulse delay-100">🔥</span>
                      <span className="animate-bounce">🕯️</span>
                      <span className="animate-bounce delay-100">🕯️</span>
                    </div>
                    <div className="space-y-2">
                      <h1 className="text-4xl font-bold text-amber-400 flex items-center justify-center gap-3">
                        ⚔️ Selamat Datang di Ruang Guild, {auth.user.name}!
                      </h1>
                      <p className="text-xl text-stone-300 max-w-3xl mx-auto">
                        Pilih mode petualangan yang ingin Anda jalani di kedalaman CodeAlpha Dungeon.
                        Setiap mode menawarkan tantangan dan pengalaman yang berbeda!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mode Selection Cards */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* Normal Mode */}
                <Card
                  className="bg-gradient-to-br from-green-900/50 to-stone-900 border-4 border-green-600 hover:border-green-400 transition-all duration-300 cursor-pointer transform hover:scale-105"
                  onClick={() => setGameMode('normal')}
                >
                  <CardHeader>
                    <div className="text-center space-y-2">
                      <div className="text-6xl mb-4">🏰</div>
                      <CardTitle className="text-3xl text-green-400">
                        Mode Eksplorasi Biasa
                      </CardTitle>
                      <CardDescription className="text-stone-300 text-base">
                        Bergabunglah dengan guild kecil dan jelajahi dungeon bersama partner Anda.
                        Mode santai untuk belajar dan berlatih keterampilan koordinasi tim.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-stone-800/50 rounded-lg p-3 text-center">
                        <div className="text-2xl mb-1">👥</div>
                        <div className="text-sm font-semibold text-stone-200">2 Pemain</div>
                        <div className="text-xs text-stone-400">Duo Partnership</div>
                      </div>
                      <div className="bg-stone-800/50 rounded-lg p-3 text-center">
                        <div className="text-2xl mb-1">🎯</div>
                        <div className="text-sm font-semibold text-stone-200">Kooperatif</div>
                        <div className="text-xs text-stone-400">Team Learning</div>
                      </div>
                      <div className="bg-stone-800/50 rounded-lg p-3 text-center">
                        <div className="text-2xl mb-1">⏱️</div>
                        <div className="text-sm font-semibold text-stone-200">Santai</div>
                        <div className="text-xs text-stone-400">No Pressure</div>
                      </div>
                      <div className="bg-stone-800/50 rounded-lg p-3 text-center">
                        <div className="text-2xl mb-1">🎙️</div>
                        <div className="text-sm font-semibold text-stone-200">Voice Chat</div>
                        <div className="text-xs text-stone-400">Coordination</div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Badge variant="outline" className="bg-green-900/50 text-green-300 border-green-600">
                        Friendly
                      </Badge>
                      <Badge variant="outline" className="bg-green-900/50 text-green-300 border-green-600">
                        Cooperative
                      </Badge>
                      <Badge variant="outline" className="bg-green-900/50 text-green-300 border-green-600">
                        Learning
                      </Badge>
                    </div>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-lg">
                      🚀 Mulai Mode Eksplorasi
                    </Button>
                  </CardContent>
                </Card>

                {/* Tournament Mode */}
                <Card
                  className="bg-gradient-to-br from-purple-900/50 to-stone-900 border-4 border-purple-600 hover:border-purple-400 transition-all duration-300 cursor-pointer transform hover:scale-105"
                  onClick={handleTournamentMode}
                >
                  <CardHeader>
                    <div className="text-center space-y-2">
                      <div className="text-6xl mb-4">🏆</div>
                      <CardTitle className="text-3xl text-purple-400">
                        Mode Tournament Arena
                      </CardTitle>
                      <CardDescription className="text-stone-300 text-base">
                        Masuki arena kompetisi epik! 4 guild bertarung dalam sistem eliminasi berbasis kecepatan.
                        Hanya yang terbaik yang akan menjadi champion!
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-stone-800/50 rounded-lg p-3 text-center">
                        <div className="text-2xl mb-1">⚔️</div>
                        <div className="text-sm font-semibold text-stone-200">8 Pemain</div>
                        <div className="text-xs text-stone-400">4 Guild Battle</div>
                      </div>
                      <div className="bg-stone-800/50 rounded-lg p-3 text-center">
                        <div className="text-2xl mb-1">🔥</div>
                        <div className="text-sm font-semibold text-stone-200">Kompetitif</div>
                        <div className="text-xs text-stone-400">High Stakes</div>
                      </div>
                      <div className="bg-stone-800/50 rounded-lg p-3 text-center">
                        <div className="text-2xl mb-1">⚡</div>
                        <div className="text-sm font-semibold text-stone-200">Speed-Based</div>
                        <div className="text-xs text-stone-400">Time Pressure</div>
                      </div>
                      <div className="bg-stone-800/50 rounded-lg p-3 text-center">
                        <div className="text-2xl mb-1">👑</div>
                        <div className="text-sm font-semibold text-stone-200">Eliminasi</div>
                        <div className="text-xs text-stone-400">Survival Mode</div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Badge variant="outline" className="bg-purple-900/50 text-purple-300 border-purple-600">
                        Competitive
                      </Badge>
                      <Badge variant="outline" className="bg-purple-900/50 text-purple-300 border-purple-600">
                        Elite
                      </Badge>
                      <Badge variant="outline" className="bg-purple-900/50 text-purple-300 border-purple-600">
                        Championship
                      </Badge>
                    </div>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 text-lg">
                      ⚡ Masuki Tournament Arena
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Comparison Table */}
              <Card className="bg-gradient-to-br from-stone-800 to-stone-900 border-4 border-amber-600">
                <CardHeader>
                  <CardTitle className="text-2xl text-amber-400 text-center">
                    ⚖️ Perbandingan Mode Permainan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-lg font-semibold text-green-400">
                        <span>🏰</span>
                        <span>Mode Eksplorasi Biasa</span>
                      </div>
                      <ul className="space-y-2 text-stone-300">
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">✓</span>
                          <span>Perfect untuk pemain baru</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">✓</span>
                          <span>Fokus pada pembelajaran dan koordinasi</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">✓</span>
                          <span>Tidak ada tekanan waktu</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">✓</span>
                          <span>Bisa bergabung kapan saja</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">✓</span>
                          <span>Voice chat untuk komunikasi</span>
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-lg font-semibold text-purple-400">
                        <span>🏆</span>
                        <span>Mode Tournament Arena</span>
                      </div>
                      <ul className="space-y-2 text-stone-300">
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 mt-1">⚡</span>
                          <span>High-skill competitive gameplay</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 mt-1">⚡</span>
                          <span>Real-time ranking dan leaderboard</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 mt-1">⚡</span>
                          <span>Sistem eliminasi berbasis kecepatan</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 mt-1">⚡</span>
                          <span>Championship rewards</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 mt-1">⚡</span>
                          <span>Enhanced voice chat untuk strategi</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Normal Mode Interface */}
          {gameMode === 'normal' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <Card className="bg-gradient-to-br from-stone-800 to-stone-900 border-4 border-amber-600">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center gap-4 text-3xl">
                      <span className="animate-pulse">🔥</span>
                      <span className="animate-pulse delay-100">🔥</span>
                      <span className="animate-bounce">🕯️</span>
                      <span className="animate-bounce delay-100">🕯️</span>
                    </div>
                    <div className="space-y-2">
                      <h1 className="text-3xl font-bold text-amber-400 flex items-center justify-center gap-3">
                        🏰 Mode Eksplorasi - Guild Partnership
                      </h1>
                      <p className="text-stone-300 max-w-2xl mx-auto">
                        Bergabunglah dengan partner terpercaya untuk menjelajahi dungeon secara kooperatif.
                        Fokus pada pembelajaran, koordinasi tim, dan pengalaman yang menyenangkan!
                      </p>
                      <div className="flex gap-3 justify-center flex-wrap mt-4">
                        <Badge className="bg-green-900/50 text-green-300 border-green-600 px-3 py-1">
                          🏰 Cooperative Mode
                        </Badge>
                        <Badge className="bg-blue-900/50 text-blue-300 border-blue-600 px-3 py-1">
                          👥 2-Player Partnership
                        </Badge>
                        <Badge className="bg-purple-900/50 text-purple-300 border-purple-600 px-3 py-1">
                          ⚡ Multi-Stage Challenge
                        </Badge>
                        {showVoiceChat && (
                          <Badge className="bg-yellow-900/50 text-yellow-300 border-yellow-600 px-3 py-1 animate-pulse">
                            🎙️ Voice Chat Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Error Display */}
              {error && (
                <Card className="bg-red-900/50 border-4 border-red-600 animate-shake">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">⚠️</span>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-red-300 mb-1">
                          Peringatan Dungeon!
                        </h3>
                        <p className="text-red-200">{error}</p>
                      </div>
                      <Button
                        onClick={() => setError('')}
                        className="bg-red-700 hover:bg-red-800 text-red-100"
                        size="sm"
                      >
                        ✕
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Panel - Takes 2 columns */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Tab Navigation */}
                  <div className="flex gap-4">
                    <Button
                      onClick={() => setActiveTab('create')}
                      disabled={creating || joining}
                      className={`flex-1 py-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                        activeTab === 'create'
                          ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-stone-900 shadow-2xl scale-105'
                          : 'bg-gradient-to-r from-stone-700 to-stone-800 text-stone-300 hover:from-stone-600 hover:to-stone-700'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span>👑</span>
                        <span>Buat Guild Baru</span>
                      </span>
                    </Button>
                    <Button
                      onClick={() => setActiveTab('join')}
                      disabled={creating || joining}
                      className={`flex-1 py-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                        activeTab === 'join'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl scale-105'
                          : 'bg-gradient-to-r from-stone-700 to-stone-800 text-stone-300 hover:from-stone-600 hover:to-stone-700'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span>⚔️</span>
                        <span>Bergabung ke Guild</span>
                      </span>
                    </Button>
                  </div>

                  {/* Tab Content */}
                  <Card className="bg-gradient-to-br from-stone-800 to-stone-900 border-4 border-amber-600">
                    <CardContent className="p-6">
                      {activeTab === 'create' ? (
                        <div className="space-y-6">
                          {/* Host Info */}
                          <Card className="bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border-2 border-amber-500">
                            <CardContent className="p-6">
                              <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-4xl">👑</span>
                                  <div className="flex-1">
                                    <h3 className="text-xl font-bold text-amber-300">
                                      Anda akan menjadi Guild Master
                                    </h3>
                                    <p className="text-stone-300 text-sm mt-1">
                                      Sebagai pemimpin guild, Anda memiliki otoritas penuh untuk mengelola sesi ekspedisi.
                                      Anda dapat memulai petualangan ketika kedua penjelajah telah bergabung.
                                    </p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <Badge className="bg-amber-900/50 text-amber-300 border-amber-600 justify-center py-2">
                                    🎯 Kontrol Penuh
                                  </Badge>
                                  <Badge className="bg-amber-900/50 text-amber-300 border-amber-600 justify-center py-2">
                                    👥 Manajemen Tim
                                  </Badge>
                                  <Badge className="bg-amber-900/50 text-amber-300 border-amber-600 justify-center py-2">
                                    🚀 Start Authority
                                  </Badge>
                                  {showVoiceChat && (
                                    <Badge className="bg-yellow-900/50 text-yellow-300 border-yellow-600 justify-center py-2 animate-pulse">
                                      🎙️ Voice Master
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Voice Preparation */}
                          {showVoiceChat && (
                            <Card className="bg-green-900/20 border-2 border-green-600">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">🎙️</span>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-green-300">Voice Chat Ready</h4>
                                    <p className="text-stone-300 text-sm">
                                      Channel voice guild Anda telah siap. Sebagai Guild Master, Anda dapat mengelola
                                      pengaturan voice dan memastikan komunikasi lancar selama ekspedisi.
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Create Button */}
                          <Button
                            onClick={handleCreateSession}
                            disabled={creating}
                            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-stone-900 font-bold text-lg py-6 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300"
                          >
                            {creating ? (
                              <span className="flex items-center justify-center gap-3">
                                <span className="animate-spin">⚙️</span>
                                <span>Mempersiapkan Guild...</span>
                                <span className="animate-pulse">🔥</span>
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-3">
                                <span>👑</span>
                                <span>Dirikan Guild Baru sebagai Master</span>
                                <span>⚔️</span>
                              </span>
                            )}
                          </Button>

                          <p className="text-center text-stone-400 text-sm">
                            Klik tombol di atas untuk langsung menciptakan guild baru dan menjadi Guild Master!
                            {showVoiceChat && (
                              <span className="block mt-1 text-green-400">
                                🎙️ Voice chat akan otomatis diaktifkan untuk anggota guild Anda.
                              </span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <h3 className="text-2xl font-bold text-center text-blue-400">
                            🏰 Bergabung ke Guild yang Sudah Ada
                          </h3>

                          {/* Team Code Input */}
                          <div className="space-y-3">
                            <label className="block text-center text-lg font-semibold text-stone-200">
                              🗝️ Kode Akses Guild
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={teamCode}
                                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                                placeholder="MASUKKAN KODE 6 DIGIT"
                                className="w-full px-6 py-4 bg-gradient-to-r from-stone-800 to-stone-700 border-4 border-amber-600 rounded-xl text-center text-2xl font-mono tracking-widest text-amber-300 placeholder-amber-600/50 focus:outline-none focus:ring-4 focus:ring-amber-500 transition-all duration-300"
                                maxLength={TEAM_CODE_LENGTH}
                                disabled={joining}
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-3xl pointer-events-none">
                                🔑
                              </span>
                            </div>
                          </div>

                          {/* Role Selection */}
                          <div className="space-y-4">
                            <h4 className="text-center text-lg font-semibold text-stone-200">
                              ⚔️ Pilih Peran Ekspedisi Anda
                            </h4>
                            <div className="grid md:grid-cols-2 gap-4">
                              {/* Defuser Role */}
                              <Card
                                className={`cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                                  selectedRole === 'defuser'
                                    ? 'bg-gradient-to-br from-red-900/50 to-orange-900/50 border-4 border-red-500 shadow-2xl'
                                    : 'bg-gradient-to-br from-stone-800 to-stone-900 border-2 border-stone-600 hover:border-red-500'
                                }`}
                                onClick={() => !joining && setSelectedRole('defuser')}
                              >
                                <CardContent className="p-6 space-y-4">
                                  <div className="text-center">
                                    <div className="text-5xl mb-3">💣</div>
                                    <h5 className="text-xl font-bold text-red-300 mb-2">
                                      Bomb Defuser
                                    </h5>
                                    <p className="text-stone-300 text-sm">
                                      Anda akan melihat perangkat berbahaya dan mendeskripsikannya kepada Expert
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                      selectedRole === 'defuser'
                                        ? 'bg-red-600 border-red-400'
                                        : 'bg-stone-700 border-stone-500'
                                    }`}>
                                      {selectedRole === 'defuser' && (
                                        <span className="text-white text-xs">✓</span>
                                      )}
                                    </div>
                                    {selectedRole === 'defuser' && (
                                      <div className="flex gap-2">
                                        <Badge className="bg-red-900/50 text-red-300 border-red-600">
                                          ✅ Terpilih
                                        </Badge>
                                        {showVoiceChat && (
                                          <Badge className="bg-yellow-900/50 text-yellow-300 border-yellow-600 animate-pulse">
                                            🎙️ Voice Ready
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Expert Role */}
                              <Card
                                className={`cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                                  selectedRole === 'expert'
                                    ? 'bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-4 border-blue-500 shadow-2xl'
                                    : 'bg-gradient-to-br from-stone-800 to-stone-900 border-2 border-stone-600 hover:border-blue-500'
                                }`}
                                onClick={() => !joining && setSelectedRole('expert')}
                              >
                                <CardContent className="p-6 space-y-4">
                                  <div className="text-center">
                                    <div className="text-5xl mb-3">📖</div>
                                    <h5 className="text-xl font-bold text-blue-300 mb-2">
                                      Manual Expert
                                    </h5>
                                    <p className="text-stone-300 text-sm">
                                      Anda akan memiliki grimoire berisi panduan untuk menavigasi proses penjinakan
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                      selectedRole === 'expert'
                                        ? 'bg-blue-600 border-blue-400'
                                        : 'bg-stone-700 border-stone-500'
                                    }`}>
                                      {selectedRole === 'expert' && (
                                        <span className="text-white text-xs">✓</span>
                                      )}
                                    </div>
                                    {selectedRole === 'expert' && (
                                      <div className="flex gap-2">
                                        <Badge className="bg-blue-900/50 text-blue-300 border-blue-600">
                                          ✅ Terpilih
                                        </Badge>
                                        {showVoiceChat && (
                                          <Badge className="bg-yellow-900/50 text-yellow-300 border-yellow-600 animate-pulse">
                                            🎙️ Voice Ready
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>

                          {/* Role Information */}
                          <Card className="bg-blue-900/20 border-2 border-blue-600">
                            <CardContent className="p-4 space-y-2">
                              <p className="text-stone-300 text-sm text-center">
                                <strong className="text-blue-300">Peran Terpilih:</strong> Anda akan bergabung sebagai{' '}
                                <strong className="text-blue-300">
                                  {selectedRole === 'defuser' ? 'Bomb Defuser' : 'Manual Expert'}
                                </strong>
                                .{' '}
                                {selectedRole === 'defuser'
                                  ? 'Anda akan melihat perangkat berbahaya dan menjelaskannya kepada rekan tim Anda.'
                                  : 'Anda akan memiliki grimoire panduan dan mengarahkan Defuser melalui proses penjinakan yang berbahaya.'}
                              </p>
                              {showVoiceChat && (
                                <p className="text-green-300 text-sm text-center">
                                  🎙️ <strong>Komunikasi Voice:</strong> Voice chat diaktifkan untuk meningkatkan koordinasi dengan partner guild Anda.
                                </p>
                              )}
                            </CardContent>
                          </Card>

                          {/* Join Button */}
                          <Button
                            onClick={handleJoinSession}
                            disabled={!teamCode.trim() || joining}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg py-6 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          >
                            {joining ? (
                              <span className="flex items-center justify-center gap-3">
                                <span className="animate-spin">⚙️</span>
                                <span>Memanggil Guild...</span>
                                <span className="animate-pulse">✨</span>
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-3">
                                <span>⚔️</span>
                                <span>Bergabung sebagai {selectedRole === 'defuser' ? 'Bomb Defuser' : 'Manual Expert'}</span>
                                <span>📜</span>
                              </span>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Voice Chat Sidebar - Takes 1 column */}
                <div className="lg:col-span-1">
                  <Card className="bg-gradient-to-br from-stone-800 to-stone-900 border-4 border-yellow-600 sticky top-6">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl text-yellow-400 flex items-center gap-2">
                          <span>🎙️</span>
                          <span>Guild Voice Channel</span>
                        </CardTitle>
                      </div>
                      <CardDescription className="text-stone-300">
                        {showVoiceChat
                          ? 'Voice chat is ready for guild coordination'
                          : 'Enable voice chat to communicate with your guild members'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Voice Toggle Button */}
                      <Button
                        onClick={handleToggleVoiceChat}
                        className={`w-full font-medium py-4 rounded-lg transition-all duration-300 ${
                          showVoiceChat
                            ? 'bg-red-600 hover:bg-red-700 text-red-100'
                            : 'bg-green-600 hover:bg-green-700 text-green-100 shadow-lg'
                        }`}
                      >
                        {showVoiceChat ? '🔇 Nonaktifkan Voice' : '🎙️ Aktifkan Voice Chat'}
                      </Button>

                      {showVoiceChat && (
                        <>
                          {/* Voice Component */}
                          <div className="bg-stone-900/50 rounded-lg p-4 border-2 border-yellow-600">
                            <VoiceChat
                              sessionId={tempSessionId}
                              userId={auth.user.id}
                              nickname={auth.user.name}
                              role={selectedRole}
                              participants={[
                                {
                                  id: auth.user.id,
                                  user_id: auth.user.id,
                                  nickname: auth.user.name,
                                  role: selectedRole,
                                }
                              ]}
                            />
                          </div>

                          {/* Voice Tips */}
                          <Card className="bg-yellow-900/20 border-2 border-yellow-600">
                            <CardHeader>
                              <CardTitle className="text-sm text-yellow-300 flex items-center gap-2">
                                <span>💡</span>
                                <span>Tips Voice Chat Lobby</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-xs text-stone-300">
                              <p className="flex items-start gap-2">
                                <span className="text-yellow-400">•</span>
                                <span>Tes mikrofon dan speaker Anda</span>
                              </p>
                              <p className="flex items-start gap-2">
                                <span className="text-yellow-400">•</span>
                                <span>Sesuaikan level volume sebelum bergabung</span>
                              </p>
                              <p className="flex items-start gap-2">
                                <span className="text-yellow-400">•</span>
                                <span>Voice chat akan berlanjut di sesi guild</span>
                              </p>
                              <p className="flex items-start gap-2">
                                <span className="text-yellow-400">•</span>
                                <span>Gunakan push-to-talk jika di lingkungan ramai</span>
                              </p>
                            </CardContent>
                          </Card>

                          {/* Voice Status */}
                          <div className="bg-green-900/20 rounded-lg p-3 border-2 border-green-600">
                            <div className="flex items-center gap-2 text-green-300 text-sm">
                              <span className="animate-pulse">🟢</span>
                              <span className="font-medium">Voice chat siap digunakan</span>
                            </div>
                            <p className="text-stone-400 text-xs mt-1">
                              Tes mikrofon Anda sebelum bergabung ke guild
                            </p>
                          </div>
                        </>
                      )}

                      {!showVoiceChat && (
                        <Card className="bg-stone-900/50 border-2 border-stone-600">
                          <CardContent className="p-4 text-center space-y-3">
                            <div className="text-4xl">🔇</div>
                            <p className="text-stone-400 text-sm">
                              Voice chat tidak aktif. Aktifkan untuk berkomunikasi dengan anggota guild Anda saat bermain.
                            </p>
                            <p className="text-stone-500 text-xs">
                              Komunikasi voice sangat direkomendasikan untuk koordinasi tim yang lebih baik!
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Quick Voice Button (Mobile) */}
      {gameMode === 'normal' && !showVoiceChat && (
        <button
          onClick={handleToggleVoiceChat}
          className="fixed bottom-6 right-6 lg:hidden bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-2xl transform hover:scale-110 transition-all duration-300 z-50"
          title="Aktifkan Voice Chat"
        >
          <span className="text-2xl">🎙️</span>
        </button>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .delay-100 {
          animation-delay: 0.1s;
        }

        .crystal-glow {
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
        }
      `}</style>
    </AuthenticatedLayout>
  );
}
