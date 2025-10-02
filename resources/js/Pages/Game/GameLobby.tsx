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

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('defuser');
  const [activeTab, setActiveTab] = useState<ActiveTab>('create');
  const [gameMode, setGameMode] = useState<GameMode>('select');
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [voiceChatMinimized, setVoiceChatMinimized] = useState(false);

  // ============================================
  // REFS UNTUK ANIMASI - FIXED TYPE
  // ============================================
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const backgroundRef = useRef<HTMLDivElement>(null);

  // Helper function untuk set torch refs
  const setTorchRef = (index: number) => (el: HTMLSpanElement | null) => {
    torchRefs.current[index] = el;
  };

  // Helper function untuk set card refs
  const setCardRef = (index: number) => (el: HTMLDivElement | null) => {
    cardRefs.current[index] = el;
  };

  // ============================================
  // EFEK ANIMASI DUNGEON
  // ============================================
  useEffect(() => {
    // Animasi torch flicker effect
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

    // Animasi floating particles
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

  // Animasi entrance untuk cards
  useEffect(() => {
    const validCards = cardRefs.current.filter((card): card is HTMLDivElement => card !== null);
    if (validCards.length > 0) {
      gsap.fromTo(
        validCards,
        {
          opacity: 0,
          y: 50,
          scale: 0.9,
        },
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

  // ============================================
  // AUTO-CLEAR ERROR
  // ============================================
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), CONFIG.ERROR_DISPLAY_DURATION);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ============================================
  // HANDLER FUNCTIONS
  // ============================================
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
        data: {
          role: selectedRole,
          participantId: result.participant.id,
        },
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
    if (showVoiceChat) {
      setVoiceChatMinimized(false);
    }
  }, [showVoiceChat]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
            <span className="dungeon-glow">⚔️</span> Ruang Persiapan Guild - CodeAlpha Dungeon
          </h2>
          {gameMode !== 'select' && (
            <Button
              onClick={handleBackToModeSelection}
              className="bg-stone-600 hover:bg-stone-700 text-stone-200 transition-all duration-300 hover:scale-105"
              disabled={creating || joining}
              aria-label="Kembali ke pemilihan mode"
            >
              ← Kembali ke Pemilihan Mode
            </Button>
          )}
        </div>
      }
    >
      <Head title="Lobi Permainan - CodeAlpha Dungeon" />

      {/* Background Dungeon Atmosphere */}
      <div ref={backgroundRef} className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Animated Torches */}
        <div ref={setTorchRef(0)} className="absolute top-20 left-10 text-6xl torch-glow">
          🔥
        </div>
        <div ref={setTorchRef(1)} className="absolute top-40 right-20 text-5xl torch-glow">
          🔥
        </div>
        <div ref={setTorchRef(2)} className="absolute bottom-32 left-1/4 text-4xl torch-glow">
          🕯️
        </div>
        <div ref={setTorchRef(3)} className="absolute bottom-20 right-1/3 text-4xl torch-glow">
          🕯️
        </div>

        {/* Floating Mystical Particles */}
        <div className="particle absolute top-1/4 left-1/3 text-2xl opacity-30">✨</div>
        <div className="particle absolute top-1/3 right-1/4 text-xl opacity-20">⭐</div>
        <div className="particle absolute bottom-1/3 left-1/2 text-3xl opacity-25">💫</div>
        <div className="particle absolute top-2/3 right-1/3 text-xl opacity-30">✨</div>

        {/* Stone Wall Texture Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/40 via-transparent to-stone-950/60 pointer-events-none" />
      </div>

      <div className="py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ============================================ */}
          {/* MODE SELECTION SCREEN */}
          {/* ============================================ */}
          {gameMode === 'select' && (
            <div className="space-y-8">
              {/* Welcome Banner */}
              <Card ref={setCardRef(0)} className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 border-4 border-amber-600 backdrop-blur-sm shadow-2xl">
                <CardContent className="p-8">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center gap-4 text-4xl mb-4">
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
                    <div className="space-y-2">
                      <h1 className="text-4xl font-bold text-amber-400 flex items-center justify-center gap-3 drop-shadow-glow">
                        ⚔️ Selamat Datang di Ruang Guild, {auth.user.name}!
                      </h1>
                      <p className="text-xl text-stone-300 max-w-3xl mx-auto leading-relaxed">
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
                  ref={setCardRef(1)}
                  className="bg-gradient-to-br from-green-900/80 to-stone-900/80 border-4 border-green-600 hover:border-green-400 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:shadow-green-glow backdrop-blur-sm"
                  onClick={() => setGameMode('normal')}
                  role="button"
                  tabIndex={0}
                  aria-label="Mode Eksplorasi Biasa"
                >
                  <CardHeader>
                    <div className="text-center space-y-2">
                      <div className="text-6xl mb-4 animate-bounce-slow">🏰</div>
                      <CardTitle className="text-3xl text-green-400 drop-shadow-glow">
                        Mode Eksplorasi Biasa
                      </CardTitle>
                      <CardDescription className="text-stone-300 text-base leading-relaxed">
                        Bergabunglah dengan guild kecil dan jelajahi dungeon bersama partner Anda.
                        Mode santai untuk belajar dan berlatih keterampilan koordinasi tim.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: '👥', title: '2 Pemain', subtitle: 'Duo Partnership' },
                        { icon: '🎯', title: 'Kooperatif', subtitle: 'Team Learning' },
                        { icon: '⏱️', title: 'Santai', subtitle: 'No Pressure' },
                        { icon: '🎙️', title: 'Voice Chat', subtitle: 'Coordination' },
                      ].map((feature, idx) => (
                        <div
                          key={idx}
                          className="bg-stone-800/70 rounded-lg p-3 text-center hover:bg-stone-700/70 transition-colors duration-300"
                        >
                          <div className="text-2xl mb-1">{feature.icon}</div>
                          <div className="text-sm font-semibold text-stone-200">{feature.title}</div>
                          <div className="text-xs text-stone-400">{feature.subtitle}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {['Ramah', 'Kooperatif', 'Pembelajaran'].map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="bg-green-900/50 text-green-300 border-green-600"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-lg transition-all duration-300 hover:scale-105 shadow-lg">
                      🚀 Mulai Mode Eksplorasi
                    </Button>
                  </CardContent>
                </Card>

                {/* Tournament Mode */}
                <Card
                  ref={setCardRef(2)}
                  className="bg-gradient-to-br from-purple-900/80 to-stone-900/80 border-4 border-purple-600 hover:border-purple-400 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:shadow-purple-glow backdrop-blur-sm"
                  onClick={handleTournamentMode}
                  role="button"
                  tabIndex={0}
                  aria-label="Mode Tournament Arena"
                >
                  <CardHeader>
                    <div className="text-center space-y-2">
                      <div className="text-6xl mb-4 animate-bounce-slow" style={{ animationDelay: '0.2s' }}>
                        🏆
                      </div>
                      <CardTitle className="text-3xl text-purple-400 drop-shadow-glow">
                        Mode Tournament Arena
                      </CardTitle>
                      <CardDescription className="text-stone-300 text-base leading-relaxed">
                        Masuki arena kompetisi epik! 4 guild bertarung dalam sistem eliminasi berbasis kecepatan.
                        Hanya yang terbaik yang akan menjadi champion!
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: '⚔️', title: '8 Pemain', subtitle: '4 Guild Battle' },
                        { icon: '🔥', title: 'Kompetitif', subtitle: 'High Stakes' },
                        { icon: '⚡', title: 'Speed-Based', subtitle: 'Time Pressure' },
                        { icon: '👑', title: 'Eliminasi', subtitle: 'Survival Mode' },
                      ].map((feature, idx) => (
                        <div
                          key={idx}
                          className="bg-stone-800/70 rounded-lg p-3 text-center hover:bg-stone-700/70 transition-colors duration-300"
                        >
                          <div className="text-2xl mb-1">{feature.icon}</div>
                          <div className="text-sm font-semibold text-stone-200">{feature.title}</div>
                          <div className="text-xs text-stone-400">{feature.subtitle}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {['Kompetitif', 'Elite', 'Championship'].map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="bg-purple-900/50 text-purple-300 border-purple-600"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 text-lg transition-all duration-300 hover:scale-105 shadow-lg">
                      ⚡ Masuki Tournament Arena
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Comparison Section */}
              <Card
                ref={setCardRef(3)}
                className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 border-4 border-amber-600 backdrop-blur-sm shadow-2xl"
              >
                <CardHeader>
                  <CardTitle className="text-2xl text-amber-400 text-center drop-shadow-glow">
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
                        {[
                          'Sempurna untuk pemain baru',
                          'Fokus pada pembelajaran dan koordinasi',
                          'Tidak ada tekanan waktu',
                          'Bisa bergabung kapan saja',
                          'Voice chat untuk komunikasi',
                        ].map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-400 mt-1">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-lg font-semibold text-purple-400">
                        <span>🏆</span>
                        <span>Mode Tournament Arena</span>
                      </div>
                      <ul className="space-y-2 text-stone-300">
                        {[
                          'Gameplay kompetitif tingkat tinggi',
                          'Real-time ranking dan leaderboard',
                          'Sistem eliminasi berbasis kecepatan',
                          'Championship rewards',
                          'Enhanced voice chat untuk strategi',
                        ].map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-purple-400 mt-1">⚡</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ============================================ */}
          {/* NORMAL MODE INTERFACE */}
          {/* ============================================ */}
          {gameMode === 'normal' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <Card className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 border-4 border-amber-600 backdrop-blur-sm shadow-2xl">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center gap-4 text-3xl">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          ref={setTorchRef(i + 8)}
                          className="torch-glow animate-pulse"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        >
                          {i % 2 === 0 ? '🔥' : '🕯️'}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <h1 className="text-3xl font-bold text-amber-400 flex items-center justify-center gap-3 drop-shadow-glow">
                        🏰 Mode Eksplorasi - Guild Partnership
                      </h1>
                      <p className="text-stone-300 max-w-2xl mx-auto leading-relaxed">
                        Bergabunglah dengan partner terpercaya untuk menjelajahi dungeon secara kooperatif.
                        Fokus pada pembelajaran, koordinasi tim, dan pengalaman yang menyenangkan!
                      </p>
                      <div className="flex gap-3 justify-center flex-wrap mt-4">
                        <Badge className="bg-green-900/50 text-green-300 border-green-600 px-3 py-1">
                          🏰 Mode Kooperatif
                        </Badge>
                        <Badge className="bg-blue-900/50 text-blue-300 border-blue-600 px-3 py-1">
                          👥 Partnership 2-Pemain
                        </Badge>
                        <Badge className="bg-purple-900/50 text-purple-300 border-purple-600 px-3 py-1">
                          ⚡ Multi-Stage Challenge
                        </Badge>
                        {showVoiceChat && (
                          <Badge className="bg-yellow-900/50 text-yellow-300 border-yellow-600 px-3 py-1 animate-pulse">
                            🎙️ Voice Chat Aktif
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Error Display */}
              {error && (
                <Card className="bg-red-900/80 border-4 border-red-600 animate-shake backdrop-blur-sm shadow-red-glow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl animate-pulse">⚠️</span>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-red-300 mb-1">Peringatan Dungeon!</h3>
                        <p className="text-red-200">{error}</p>
                      </div>
                      <Button
                        onClick={() => setError('')}
                        className="bg-red-700 hover:bg-red-800 text-red-100 transition-all duration-300"
                        size="sm"
                        aria-label="Tutup peringatan"
                      >
                        ✕
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Panel - 2 kolom */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Tab Navigation */}
                  <div className="flex gap-4" role="tablist">
                    <Button
                      onClick={() => setActiveTab('create')}
                      disabled={creating || joining}
                      role="tab"
                      aria-selected={activeTab === 'create'}
                      className={`flex-1 py-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                        activeTab === 'create'
                          ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-stone-900 shadow-amber-glow scale-105'
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
                      role="tab"
                      aria-selected={activeTab === 'join'}
                      className={`flex-1 py-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                        activeTab === 'join'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-blue-glow scale-105'
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
                  <Card className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 border-4 border-amber-600 backdrop-blur-sm shadow-2xl">
                    <CardContent className="p-6">
                      {activeTab === 'create' ? (
                        <div className="space-y-6">
                          {/* Host Info */}
                          <Card className="bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border-2 border-amber-500 backdrop-blur-sm">
                            <CardContent className="p-6">
                              <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-4xl dungeon-glow">👑</span>
                                  <div className="flex-1">
                                    <h3 className="text-xl font-bold text-amber-300 drop-shadow-glow">
                                      Anda akan menjadi Guild Master
                                    </h3>
                                    <p className="text-stone-300 text-sm mt-1 leading-relaxed">
                                      Sebagai pemimpin guild, Anda memiliki otoritas penuh untuk mengelola sesi ekspedisi.
                                      Anda dapat memulai petualangan ketika kedua penjelajah telah bergabung.
                                    </p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {[
                                    { icon: '🎯', text: 'Kontrol Penuh' },
                                    { icon: '👥', text: 'Manajemen Tim' },
                                    { icon: '🚀', text: 'Start Authority' },
                                    { icon: '🎙️', text: 'Voice Master', condition: showVoiceChat },
                                  ].map(
                                    (badge, idx) =>
                                      (badge.condition === undefined || badge.condition) && (
                                        <Badge
                                          key={idx}
                                          className={`${
                                            badge.icon === '🎙️'
                                              ? 'bg-yellow-900/50 text-yellow-300 border-yellow-600 animate-pulse'
                                              : 'bg-amber-900/50 text-amber-300 border-amber-600'
                                          } justify-center py-2`}
                                        >
                                          {badge.icon} {badge.text}
                                        </Badge>
                                      )
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Voice Preparation */}
                          {showVoiceChat && (
                            <Card className="bg-green-900/30 border-2 border-green-600 backdrop-blur-sm">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl animate-pulse">🎙️</span>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-green-300">Voice Chat Siap</h4>
                                    <p className="text-stone-300 text-sm leading-relaxed">
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
                            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-stone-900 font-bold text-lg py-6 rounded-xl shadow-amber-glow transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Dirikan guild baru"
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

                          <p className="text-center text-stone-400 text-sm leading-relaxed">
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
                          <h3 className="text-2xl font-bold text-center text-blue-400 drop-shadow-glow">
                            🏰 Bergabung ke Guild yang Sudah Ada
                          </h3>

                          {/* Team Code Input */}
                          <div className="space-y-3">
                            <label
                              htmlFor="teamCode"
                              className="block text-center text-lg font-semibold text-stone-200"
                            >
                              🗝️ Kode Akses Guild
                            </label>
                            <div className="relative">
                              <input
                                id="teamCode"
                                type="text"
                                value={teamCode}
                                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                                placeholder="MASUKKAN KODE 6 DIGIT"
                                className="w-full px-6 py-4 bg-gradient-to-r from-stone-800 to-stone-700 border-4 border-amber-600 rounded-xl text-center text-2xl font-mono tracking-widest text-amber-300 placeholder-amber-600/50 focus:outline-none focus:ring-4 focus:ring-amber-500 transition-all duration-300"
                                maxLength={CONFIG.TEAM_CODE_LENGTH}
                                disabled={joining}
                                aria-label="Kode guild"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-3xl pointer-events-none dungeon-glow">
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
                                    ? 'bg-gradient-to-br from-red-900/60 to-orange-900/60 border-4 border-red-500 shadow-red-glow'
                                    : 'bg-gradient-to-br from-stone-800/80 to-stone-900/80 border-2 border-stone-600 hover:border-red-500'
                                } backdrop-blur-sm`}
                                onClick={() => !joining && setSelectedRole('defuser')}
                                role="button"
                                tabIndex={0}
                                aria-label="Pilih peran Bomb Defuser"
                              >
                                <CardContent className="p-6 space-y-4">
                                  <div className="text-center">
                                    <div className="text-5xl mb-3 dungeon-glow">💣</div>
                                    <h5 className="text-xl font-bold text-red-300 mb-2">Bomb Defuser</h5>
                                    <p className="text-stone-300 text-sm leading-relaxed">
                                      Anda akan melihat perangkat berbahaya dan mendeskripsikannya kepada Expert
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-center gap-3">
                                    <div
                                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                        selectedRole === 'defuser'
                                          ? 'bg-red-600 border-red-400'
                                          : 'bg-stone-700 border-stone-500'
                                      }`}
                                    >
                                      {selectedRole === 'defuser' && <span className="text-white text-xs">✓</span>}
                                    </div>
                                    {selectedRole === 'defuser' && (
                                      <div className="flex gap-2">
                                        <Badge className="bg-red-900/50 text-red-300 border-red-600">✅ Terpilih</Badge>
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
                                    ? 'bg-gradient-to-br from-blue-900/60 to-purple-900/60 border-4 border-blue-500 shadow-blue-glow'
                                    : 'bg-gradient-to-br from-stone-800/80 to-stone-900/80 border-2 border-stone-600 hover:border-blue-500'
                                } backdrop-blur-sm`}
                                onClick={() => !joining && setSelectedRole('expert')}
                                role="button"
                                tabIndex={0}
                                aria-label="Pilih peran Manual Expert"
                              >
                                <CardContent className="p-6 space-y-4">
                                  <div className="text-center">
                                    <div className="text-5xl mb-3 dungeon-glow">📖</div>
                                    <h5 className="text-xl font-bold text-blue-300 mb-2">Manual Expert</h5>
                                    <p className="text-stone-300 text-sm leading-relaxed">
                                      Anda akan memiliki grimoire berisi panduan untuk menavigasi proses penjinakan
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-center gap-3">
                                    <div
                                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                        selectedRole === 'expert'
                                          ? 'bg-blue-600 border-blue-400'
                                          : 'bg-stone-700 border-stone-500'
                                      }`}
                                    >
                                      {selectedRole === 'expert' && <span className="text-white text-xs">✓</span>}
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
                          <Card className="bg-blue-900/30 border-2 border-blue-600 backdrop-blur-sm">
                            <CardContent className="p-4 space-y-2">
                              <p className="text-stone-300 text-sm text-center leading-relaxed">
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
                                <p className="text-green-300 text-sm text-center leading-relaxed">
                                  🎙️ <strong>Komunikasi Voice:</strong> Voice chat diaktifkan untuk meningkatkan koordinasi
                                  dengan partner guild Anda.
                                </p>
                              )}
                            </CardContent>
                          </Card>

                          {/* Join Button */}
                          <Button
                            onClick={handleJoinSession}
                            disabled={!teamCode.trim() || joining}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg py-6 rounded-xl shadow-blue-glow transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            aria-label={`Bergabung sebagai ${selectedRole === 'defuser' ? 'Bomb Defuser' : 'Manual Expert'}`}
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
                                <span>
                                  Bergabung sebagai {selectedRole === 'defuser' ? 'Bomb Defuser' : 'Manual Expert'}
                                </span>
                                <span>📜</span>
                              </span>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Voice Chat Sidebar - 1 kolom */}
                <div className="lg:col-span-1">
                  <Card className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 border-4 border-yellow-600 sticky top-6 backdrop-blur-sm shadow-2xl">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl text-yellow-400 flex items-center gap-2 drop-shadow-glow">
                          <span className="dungeon-glow">🎙️</span>
                          <span>Guild Voice Channel</span>
                        </CardTitle>
                      </div>
                      <CardDescription className="text-stone-300 leading-relaxed">
                        {showVoiceChat
                          ? 'Voice chat siap untuk koordinasi guild'
                          : 'Aktifkan voice chat untuk berkomunikasi dengan anggota guild Anda'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Voice Toggle Button */}
                      <Button
                        onClick={handleToggleVoiceChat}
                        className={`w-full font-medium py-4 rounded-lg transition-all duration-300 ${
                          showVoiceChat
                            ? 'bg-red-600 hover:bg-red-700 text-red-100 shadow-red-glow'
                            : 'bg-green-600 hover:bg-green-700 text-green-100 shadow-green-glow'
                        }`}
                        aria-label={showVoiceChat ? 'Nonaktifkan voice chat' : 'Aktifkan voice chat'}
                      >
                        {showVoiceChat ? '🔇 Nonaktifkan Voice' : '🎙️ Aktifkan Voice Chat'}
                      </Button>

                      {showVoiceChat && (
                        <>
                          {/* Voice Component */}
                          <div className="bg-stone-900/70 rounded-lg p-4 border-2 border-yellow-600 backdrop-blur-sm">
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

                          {/* Voice Tips */}
                          <Card className="bg-yellow-900/30 border-2 border-yellow-600 backdrop-blur-sm">
                            <CardHeader>
                              <CardTitle className="text-sm text-yellow-300 flex items-center gap-2">
                                <span className="dungeon-glow">💡</span>
                                <span>Tips Voice Chat Lobby</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-xs text-stone-300">
                              {[
                                'Tes mikrofon dan speaker Anda',
                                'Sesuaikan level volume sebelum bergabung',
                                'Voice chat akan berlanjut di sesi guild',
                                'Gunakan push-to-talk jika di lingkungan ramai',
                              ].map((tip, idx) => (
                                <p key={idx} className="flex items-start gap-2">
                                  <span className="text-yellow-400">•</span>
                                  <span>{tip}</span>
                                </p>
                              ))}
                            </CardContent>
                          </Card>

                          {/* Voice Status */}
                          <div className="bg-green-900/30 rounded-lg p-3 border-2 border-green-600 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-green-300 text-sm">
                              <span className="animate-pulse">🟢</span>
                              <span className="font-medium">Voice chat siap digunakan</span>
                            </div>
                            <p className="text-stone-400 text-xs mt-1">Tes mikrofon Anda sebelum bergabung ke guild</p>
                          </div>
                        </>
                      )}

                      {!showVoiceChat && (
                        <Card className="bg-stone-900/70 border-2 border-stone-600 backdrop-blur-sm">
                          <CardContent className="p-4 text-center space-y-3">
                            <div className="text-4xl opacity-50">🔇</div>
                            <p className="text-stone-400 text-sm leading-relaxed">
                              Voice chat tidak aktif. Aktifkan untuk berkomunikasi dengan anggota guild Anda saat bermain.
                            </p>
                            <p className="text-stone-500 text-xs leading-relaxed">
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
          className="fixed bottom-6 right-6 lg:hidden bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-green-glow transform hover:scale-110 transition-all duration-300 z-50"
          title="Aktifkan Voice Chat"
          aria-label="Aktifkan voice chat"
        >
          <span className="text-2xl dungeon-glow">🎙️</span>
        </button>
      )}

      {/* ============================================ */}
      {/* CUSTOM STYLES */}
      {/* ============================================ */}
      <style>{`
        /* Shake Animation */
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        /* Slow Bounce Animation */
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }

        /* Torch Glow Effect */
        .torch-glow {
          filter: drop-shadow(0 0 8px rgba(251, 146, 60, 0.6))
                  drop-shadow(0 0 15px rgba(251, 146, 60, 0.4));
          transition: filter 0.3s ease-in-out;
        }

        /* Dungeon Element Glow */
        .dungeon-glow {
          filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.5))
                  drop-shadow(0 0 12px rgba(251, 191, 36, 0.3));
        }

        /* Text Drop Shadow Glow */
        .drop-shadow-glow {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6),
                       0 0 40px rgba(251, 191, 36, 0.4);
        }

        /* Custom Shadow Glows */
        .shadow-amber-glow {
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.4),
                      0 0 60px rgba(251, 191, 36, 0.2);
        }

        .shadow-green-glow {
          box-shadow: 0 0 30px rgba(34, 197, 94, 0.4),
                      0 0 60px rgba(34, 197, 94, 0.2);
        }

        .shadow-blue-glow {
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.4),
                      0 0 60px rgba(59, 130, 246, 0.2);
        }

        .shadow-purple-glow {
          box-shadow: 0 0 30px rgba(168, 85, 247, 0.4),
                      0 0 60px rgba(168, 85, 247, 0.2);
        }

        .shadow-red-glow {
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.4),
                      0 0 60px rgba(239, 68, 68, 0.2);
        }

        /* Particle Floating Animation */
        .particle {
          animation: float 4s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-50px) rotate(180deg); opacity: 0.8; }
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .torch-glow {
            filter: drop-shadow(0 0 5px rgba(251, 146, 60, 0.5));
          }
        }

        /* Smooth Transitions */
        * {
          transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Focus Visible for Accessibility */
        button:focus-visible,
        input:focus-visible {
          outline: 2px solid rgba(251, 191, 36, 0.8);
          outline-offset: 2px;
        }
      `}</style>
    </AuthenticatedLayout>
  );
}
