import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { gameApi } from '@/services/gameApi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import VoiceChat from '@/Components/Game/VoiceChat';
import { gsap } from 'gsap';

// ============================================
// KONSTANTA KONFIGURASI
// ============================================
const CONFIG = {
  TEAM_CODE_LENGTH: 6,
  ERROR_DISPLAY_DURATION: 5000,
  ANIMATION_DURATION: 0.6,
  TORCH_FLICKER_INTERVAL: 150,
} as const;

// ============================================
// TIPE DEFINISI
// ============================================
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

// ============================================
// KOMPONEN UTAMA
// ============================================
export default function GameLobby() {
  const { auth } = usePage().props as PageProps;

  // STATE MANAGEMENT
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('defuser');
  const [activeTab, setActiveTab] = useState<ActiveTab>('create');
  const [gameMode, setGameMode] = useState<GameMode>('select');
  const [showVoiceChat, setShowVoiceChat] = useState(false);

  // REFS UNTUK ANIMASI
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const backgroundRef = useRef<HTMLDivElement>(null);

  const setTorchRef = (index: number) => (el: HTMLSpanElement | null) => {
    torchRefs.current[index] = el;
  };

  const setCardRef = (index: number) => (el: HTMLDivElement | null) => {
    cardRefs.current[index] = el;
  };

  // EFEK ANIMASI DUNGEON
  useEffect(() => {
    const torchInterval = setInterval(() => {
      torchRefs.current.forEach((torch) => {
        if (torch) {
          gsap.to(torch, {
            opacity: Math.random() * 0.3 + 0.7,
            scale: Math.random() * 0.1 + 0.95,
            duration: 0.15,
            ease: 'power1.inOut',
          });
        }
      });
    }, CONFIG.TORCH_FLICKER_INTERVAL);

    if (backgroundRef.current) {
      const particles = backgroundRef.current.querySelectorAll('.particle');
      particles.forEach((particle, index) => {
        gsap.to(particle, {
          y: -50,
          opacity: 0.8,
          duration: 3 + index * 0.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: index * 0.3,
        });
      });
    }

    return () => clearInterval(torchInterval);
  }, []);

  useEffect(() => {
    const validCards = cardRefs.current.filter((card): card is HTMLDivElement => card !== null);
    if (validCards.length > 0) {
      gsap.fromTo(
        validCards,
        { opacity: 0, y: 50, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: CONFIG.ANIMATION_DURATION,
          stagger: 0.15,
          ease: 'back.out(1.4)',
        }
      );
    }
  }, [gameMode]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), CONFIG.ERROR_DISPLAY_DURATION);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // HANDLER FUNCTIONS
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

      router.visit(`/game/session/${response.session.id}`, {
        method: 'get',
        data: { role: 'host', participantId: auth.user.id },
        onError: (errors) => {
          console.error('❌ Gagal redirect:', errors);
          setError('Gagal mengakses sesi. Silakan coba lagi.');
          setCreating(false);
        },
      });
    } catch (error: any) {
      console.error('❌ Error membuat sesi:', error);
      const errorMessage =
        error.response?.status === 429
          ? 'Terlalu banyak permintaan. Mohon tunggu sebentar.'
          : error.response?.status === 503
          ? 'Server sedang sibuk. Silakan coba lagi nanti.'
          : error.response?.data?.message || error.message || 'Gagal membuat sesi. Silakan coba lagi.';
      setError(errorMessage);
      setCreating(false);
    }
  }, [creating, auth.user.id]);

  const handleJoinSession = useCallback(async () => {
    const trimmedCode = teamCode.trim().toUpperCase();
    if (!trimmedCode || joining) return;

    if (trimmedCode.length !== CONFIG.TEAM_CODE_LENGTH) {
      setError(`Kode guild harus ${CONFIG.TEAM_CODE_LENGTH} karakter`);
      return;
    }

    setJoining(true);
    setError('');

    try {
      await gameApi.initialize();
      const result = await gameApi.joinSession(trimmedCode, selectedRole, auth.user.name);

      if (!result?.session?.id) {
        throw new Error('Respons bergabung sesi tidak valid');
      }

      router.visit(`/game/session/${result.session.id}`, {
        data: { role: selectedRole, participantId: result.participant.id },
      });
    } catch (error: any) {
      console.error('❌ Error bergabung sesi:', error);
      const errorMessage =
        error.response?.status === 404
          ? 'Kode guild tidak ditemukan atau sudah kedaluwarsa.'
          : error.response?.status === 409
          ? 'Sesi sudah penuh atau peran sudah diambil.'
          : error.response?.data?.message || 'Gagal bergabung ke sesi. Periksa kode guild Anda.';
      setError(errorMessage);
      setJoining(false);
    }
  }, [teamCode, joining, selectedRole, auth.user.name]);

  const handleTournamentMode = useCallback(() => {
    router.visit('/game/tournament');
  }, []);

  const handleBackToModeSelection = useCallback(() => {
    setGameMode('select');
    setError('');
    setTeamCode('');
  }, []);

  const handleToggleVoiceChat = useCallback(() => {
    setShowVoiceChat((prev) => !prev);
  }, []);

  // RENDER
  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>⚔️</span> Ruang Persiapan Guild
          </span>
          {gameMode !== 'select' && (
            <Button
              onClick={handleBackToModeSelection}
              size="sm"
              variant="outline"
              className="border-stone-600 hover:bg-stone-700"
              disabled={creating || joining}
            >
              ← Kembali
            </Button>
          )}
        </div>
      }
    >
      <Head title="Lobi Permainan - CodeAlpha Dungeon" />

      {/* Background Dungeon Atmosphere */}
      <div ref={backgroundRef} className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div ref={setTorchRef(0)} className="absolute top-20 left-10 text-6xl torch-glow">🔥</div>
        <div ref={setTorchRef(1)} className="absolute top-40 right-20 text-5xl torch-glow">🔥</div>
        <div ref={setTorchRef(2)} className="absolute bottom-32 left-1/4 text-4xl torch-glow">🕯️</div>
        <div ref={setTorchRef(3)} className="absolute bottom-20 right-1/3 text-4xl torch-glow">🕯️</div>

        <div className="particle absolute top-1/4 left-1/3 text-2xl opacity-30">✨</div>
        <div className="particle absolute top-1/3 right-1/4 text-xl opacity-20">⭐</div>
        <div className="particle absolute bottom-1/3 left-1/2 text-3xl opacity-25">💫</div>
        <div className="particle absolute top-2/3 right-1/3 text-xl opacity-30">✨</div>

        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/40 via-transparent to-stone-950/60 pointer-events-none" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* MODE SELECTION SCREEN */}
        {gameMode === 'select' && (
          <div className="space-y-6">
            {/* Welcome Banner */}
            <Card ref={setCardRef(0)} className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 border-4 border-amber-600 backdrop-blur-sm shadow-2xl">
              <CardContent className="p-6 sm:p-8">
                <div className="text-center space-y-4">
                  <div className="flex justify-center gap-3 text-3xl sm:text-4xl mb-4">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        ref={setTorchRef(i + 4)}
                        className="torch-glow animate-pulse"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      >
                        {i % 2 === 0 ? '🔥' : '🕯️'}
                      </span>
                    ))}
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-400 drop-shadow-glow">
                    ⚔️ Selamat Datang, {auth.user.name}!
                  </h1>
                  <p className="text-base sm:text-lg text-stone-300 max-w-3xl mx-auto leading-relaxed">
                    Pilih mode petualangan yang ingin Anda jalani di kedalaman CodeAlpha Dungeon.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Mode Selection Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Normal Mode */}
              <Card
                ref={setCardRef(1)}
                className="bg-gradient-to-br from-green-900/80 to-stone-900/80 border-4 border-green-600 hover:border-green-400 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:shadow-green-glow backdrop-blur-sm"
                onClick={() => setGameMode('normal')}
              >
                <CardHeader>
                  <div className="text-center space-y-2">
                    <div className="text-5xl sm:text-6xl mb-4 animate-bounce-slow">🏰</div>
                    <CardTitle className="text-2xl sm:text-3xl text-green-400 drop-shadow-glow">
                      Mode Eksplorasi Biasa
                    </CardTitle>
                    <CardDescription className="text-stone-300 text-sm leading-relaxed">
                      Mode santai untuk belajar dan berlatih keterampilan koordinasi tim
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: '👥', title: '2 Pemain' },
                      { icon: '🎯', title: 'Kooperatif' },
                      { icon: '⏱️', title: 'Santai' },
                      { icon: '🎙️', title: 'Voice Chat' },
                    ].map((feature, idx) => (
                      <div key={idx} className="bg-stone-800/70 rounded-lg p-3 text-center">
                        <div className="text-2xl mb-1">{feature.icon}</div>
                        <div className="text-sm font-semibold text-stone-200">{feature.title}</div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3">
                    🚀 Mulai Mode Eksplorasi
                  </Button>
                </CardContent>
              </Card>

              {/* Tournament Mode */}
              <Card
                ref={setCardRef(2)}
                className="bg-gradient-to-br from-purple-900/80 to-stone-900/80 border-4 border-purple-600 hover:border-purple-400 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:shadow-purple-glow backdrop-blur-sm"
                onClick={handleTournamentMode}
              >
                <CardHeader>
                  <div className="text-center space-y-2">
                    <div className="text-5xl sm:text-6xl mb-4 animate-bounce-slow" style={{ animationDelay: '0.2s' }}>
                      🏆
                    </div>
                    <CardTitle className="text-2xl sm:text-3xl text-purple-400 drop-shadow-glow">
                      Mode Tournament Arena
                    </CardTitle>
                    <CardDescription className="text-stone-300 text-sm leading-relaxed">
                      Masuki arena kompetisi epik! 4 guild bertarung dalam sistem eliminasi
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: '⚔️', title: '8 Pemain' },
                      { icon: '🔥', title: 'Kompetitif' },
                      { icon: '⚡', title: 'Speed-Based' },
                      { icon: '👑', title: 'Eliminasi' },
                    ].map((feature, idx) => (
                      <div key={idx} className="bg-stone-800/70 rounded-lg p-3 text-center">
                        <div className="text-2xl mb-1">{feature.icon}</div>
                        <div className="text-sm font-semibold text-stone-200">{feature.title}</div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3">
                    ⚡ Masuki Tournament Arena
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* NORMAL MODE INTERFACE */}
        {gameMode === 'normal' && (
          <div className="space-y-6">
            {/* Error Display */}
            {error && (
              <Card className="bg-red-900/80 border-4 border-red-600 animate-shake backdrop-blur-sm">
                <CardContent className="p-4 flex items-start gap-3">
                  <span className="text-3xl animate-pulse">⚠️</span>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-red-300 mb-1">Peringatan!</h3>
                    <p className="text-red-200">{error}</p>
                  </div>
                  <Button onClick={() => setError('')} size="sm" variant="ghost" className="hover:bg-red-800">
                    ✕
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Main Content */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Tab Navigation */}
                <div className="flex gap-4">
                  <Button
                    onClick={() => setActiveTab('create')}
                    disabled={creating || joining}
                    className={`flex-1 py-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                      activeTab === 'create'
                        ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-stone-900 shadow-amber-glow'
                        : 'bg-gradient-to-r from-stone-700 to-stone-800 text-stone-300'
                    }`}
                  >
                    👑 Buat Guild
                  </Button>
                  <Button
                    onClick={() => setActiveTab('join')}
                    disabled={creating || joining}
                    className={`flex-1 py-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                      activeTab === 'join'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-blue-glow'
                        : 'bg-gradient-to-r from-stone-700 to-stone-800 text-stone-300'
                    }`}
                  >
                    ⚔️ Bergabung
                  </Button>
                </div>

                {/* Tab Content */}
                <Card className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 border-4 border-amber-600 backdrop-blur-sm">
                  <CardContent className="p-6">
                    {activeTab === 'create' ? (
                      <div className="space-y-6">
                        <Card className="bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border-2 border-amber-500">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                              <span className="text-4xl">👑</span>
                              <div>
                                <h3 className="text-xl font-bold text-amber-300">Guild Master</h3>
                                <p className="text-stone-300 text-sm">
                                  Anda akan memimpin ekspedisi guild
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Button
                          onClick={handleCreateSession}
                          disabled={creating}
                          className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-stone-900 font-bold text-lg py-6 rounded-xl shadow-amber-glow"
                        >
                          {creating ? (
                            <span className="flex items-center gap-3">
                              <span className="animate-spin">⚙️</span>
                              Mempersiapkan...
                            </span>
                          ) : (
                            <span className="flex items-center gap-3">
                              <span>👑</span> Dirikan Guild Baru
                            </span>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-center text-blue-400">
                          🏰 Bergabung ke Guild
                        </h3>

                        {/* Code Input */}
                        <input
                          type="text"
                          value={teamCode}
                          onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                          placeholder="KODE 6 DIGIT"
                          className="w-full px-6 py-4 bg-gradient-to-r from-stone-800 to-stone-700 border-4 border-amber-600 rounded-xl text-center text-2xl font-mono text-amber-300 placeholder-amber-600/50"
                          maxLength={CONFIG.TEAM_CODE_LENGTH}
                          disabled={joining}
                        />

                        {/* Role Selection */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <Card
                            className={`cursor-pointer ${
                              selectedRole === 'defuser'
                                ? 'bg-gradient-to-br from-red-900/60 to-orange-900/60 border-4 border-red-500'
                                : 'bg-gradient-to-br from-stone-800/80 to-stone-900/80 border-2 border-stone-600'
                            }`}
                            onClick={() => setSelectedRole('defuser')}
                          >
                            <CardContent className="p-6 text-center">
                              <div className="text-5xl mb-3">💣</div>
                              <h5 className="text-xl font-bold text-red-300">Bomb Defuser</h5>
                            </CardContent>
                          </Card>

                          <Card
                            className={`cursor-pointer ${
                              selectedRole === 'expert'
                                ? 'bg-gradient-to-br from-blue-900/60 to-purple-900/60 border-4 border-blue-500'
                                : 'bg-gradient-to-br from-stone-800/80 to-stone-900/80 border-2 border-stone-600'
                            }`}
                            onClick={() => setSelectedRole('expert')}
                          >
                            <CardContent className="p-6 text-center">
                              <div className="text-5xl mb-3">📖</div>
                              <h5 className="text-xl font-bold text-blue-300">Manual Expert</h5>
                            </CardContent>
                          </Card>
                        </div>

                        <Button
                          onClick={handleJoinSession}
                          disabled={!teamCode.trim() || joining}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg py-6 rounded-xl"
                        >
                          {joining ? '⚙️ Bergabung...' : '⚔️ Bergabung ke Guild'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Voice Chat Sidebar */}
              <div className="lg:col-span-1">
                <Card className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 border-4 border-yellow-600 sticky top-6">
                  <CardHeader>
                    <CardTitle className="text-xl text-yellow-400">🎙️ Voice Chat</CardTitle>
                    <CardDescription className="text-stone-300">
                      {showVoiceChat ? 'Voice chat aktif' : 'Aktifkan voice chat'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={handleToggleVoiceChat}
                      className={`w-full py-4 ${
                        showVoiceChat ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {showVoiceChat ? '🔇 Nonaktifkan' : '🎙️ Aktifkan Voice'}
                    </Button>

                    {showVoiceChat && (
                      <div className="bg-stone-900/70 rounded-lg p-4 border-2 border-yellow-600">
                        <VoiceChat
                          sessionId={0}
                          userId={auth.user.id}
                          nickname={auth.user.name}
                          role={selectedRole}
                          participants={[
                            {
                              id: auth.user.id,
                              user_id: auth.user.id,
                              nickname: auth.user.name,
                              role: selectedRole,
                            },
                          ]}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Voice Button (Mobile) */}
      {gameMode === 'normal' && !showVoiceChat && (
        <button
          onClick={handleToggleVoiceChat}
          className="fixed bottom-6 right-6 lg:hidden bg-green-600 p-4 rounded-full shadow-green-glow z-50"
        >
          <span className="text-2xl">🎙️</span>
        </button>
      )}

      {/* Styles */}
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; } 50% { transform: translateY(-50px) rotate(180deg); opacity: 0.8; } }

        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        .particle { animation: float 4s ease-in-out infinite; }

        .torch-glow { filter: drop-shadow(0 0 8px rgba(251, 146, 60, 0.6)) drop-shadow(0 0 15px rgba(251, 146, 60, 0.4)); }
        .drop-shadow-glow { text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4); }

        .shadow-amber-glow { box-shadow: 0 0 30px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.2); }
        .shadow-green-glow { box-shadow: 0 0 30px rgba(34, 197, 94, 0.4), 0 0 60px rgba(34, 197, 94, 0.2); }
        .shadow-blue-glow { box-shadow: 0 0 30px rgba(59, 130, 246, 0.4), 0 0 60px rgba(59, 130, 246, 0.2); }
        .shadow-purple-glow { box-shadow: 0 0 30px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.2); }
      `}</style>
    </AuthenticatedLayout>
  );
}
