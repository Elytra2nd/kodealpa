import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { gameApi } from '@/services/gameApi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
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
  MODE_TRANSITION_DURATION: 0.8,
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
// LOADING SKELETON COMPONENT
// ============================================
const LoadingSkeleton: React.FC<{ mode: 'select' | 'normal' }> = ({ mode }) => {
  const skeletonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (skeletonRef.current) {
      gsap.fromTo(
        skeletonRef.current.querySelectorAll('.skeleton-pulse'),
        { opacity: 0.4 },
        {
          opacity: 1,
          duration: 1,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
          stagger: 0.2,
        }
      );
    }
  }, []);

  if (mode === 'select') {
    return (
      <div ref={skeletonRef} className="space-y-6">
        <Card className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 border-4 border-amber-600">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="skeleton-pulse h-12 bg-stone-700 rounded-lg w-3/4 mx-auto" />
              <div className="skeleton-pulse h-6 bg-stone-700 rounded-lg w-1/2 mx-auto" />
            </div>
          </CardContent>
        </Card>
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 border-4 border-stone-600">
              <CardContent className="p-6 space-y-4">
                <div className="skeleton-pulse h-16 bg-stone-700 rounded-full w-16 mx-auto" />
                <div className="skeleton-pulse h-8 bg-stone-700 rounded-lg w-3/4 mx-auto" />
                <div className="skeleton-pulse h-20 bg-stone-700 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={skeletonRef} className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="skeleton-pulse h-16 bg-stone-700 rounded-xl" />
          <Card className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 border-4 border-amber-600">
            <CardContent className="p-6 space-y-4">
              <div className="skeleton-pulse h-32 bg-stone-700 rounded-lg" />
              <div className="skeleton-pulse h-12 bg-stone-700 rounded-xl" />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 border-4 border-yellow-600">
            <CardContent className="p-6 space-y-4">
              <div className="skeleton-pulse h-8 bg-stone-700 rounded-lg" />
              <div className="skeleton-pulse h-12 bg-stone-700 rounded-xl" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ERROR BOUNDARY COMPONENT
// ============================================
const ErrorDisplay: React.FC<{ error: string; onDismiss: () => void }> = ({ error, onDismiss }) => {
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errorRef.current) {
      gsap.fromTo(
        errorRef.current,
        { x: 100, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }
      );
    }
  }, [error]);

  return (
    <Card
      ref={errorRef}
      className="bg-red-900/90 border-4 border-red-600 backdrop-blur-sm"
      role="alert"
      aria-live="assertive"
    >
      <CardContent className="p-4 flex items-start gap-3">
        <span className="text-3xl animate-pulse" aria-hidden="true">
          ⚠️
        </span>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-red-300 mb-1">Peringatan!</h3>
          <p className="text-red-200">{error}</p>
        </div>
        <Button
          onClick={onDismiss}
          size="sm"
          variant="ghost"
          className="hover:bg-red-800"
          aria-label="Tutup peringatan"
        >
          ✕
        </Button>
      </CardContent>
    </Card>
  );
};

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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);

  // REFS UNTUK ANIMASI
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const setTorchRef = useCallback(
    (index: number) => (el: HTMLSpanElement | null) => {
      torchRefs.current[index] = el;
    },
    []
  );

  const setCardRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      cardRefs.current[index] = el;
    },
    []
  );

  // MEMOIZED VALUES
  const isLoading = useMemo(() => creating || joining || isTransitioning, [creating, joining, isTransitioning]);
  const isInteractionDisabled = useMemo(() => creating || joining, [creating, joining]);

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
    if (isTransitioning) return;

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
  }, [gameMode, isTransitioning]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), CONFIG.ERROR_DISPLAY_DURATION);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // MODE TRANSITION HANDLER
  const handleModeTransition = useCallback(
    async (newMode: GameMode) => {
      if (isTransitioning) return;

      setIsTransitioning(true);

      // Fade out current content
      if (contentRef.current) {
        await gsap.to(contentRef.current, {
          opacity: 0,
          y: -30,
          duration: CONFIG.MODE_TRANSITION_DURATION * 0.5,
          ease: 'power2.in',
        });
      }

      // Change mode
      setGameMode(newMode);

      // Small delay for loading skeleton to appear
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Fade in new content
      if (contentRef.current) {
        await gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: CONFIG.MODE_TRANSITION_DURATION * 0.5,
            ease: 'power2.out',
          }
        );
      }

      setIsTransitioning(false);
    },
    [isTransitioning]
  );

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
        preserveState: false,
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
        preserveState: false,
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
    router.visit('/game/tournament', { preserveState: false });
  }, []);

  const handleBackToModeSelection = useCallback(() => {
    handleModeTransition('select');
    setError('');
    setTeamCode('');
  }, [handleModeTransition]);

  const handleToggleVoiceChat = useCallback(() => {
    setShowVoiceChat((prev) => !prev);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isInteractionDisabled) return;

      if (e.key === 'Escape' && gameMode !== 'select') {
        handleBackToModeSelection();
      }

      if (e.key === 'Enter' && activeTab === 'join' && teamCode.length === CONFIG.TEAM_CODE_LENGTH) {
        handleJoinSession();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameMode, activeTab, teamCode, isInteractionDisabled, handleBackToModeSelection, handleJoinSession]);

  // RENDER
  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>⚔️</span> Ruang Persiapan Guild
          </span>
          {gameMode !== 'select' && !isTransitioning && (
            <Button
              onClick={handleBackToModeSelection}
              size="sm"
              variant="outline"
              className="border-stone-600 hover:bg-stone-700"
              disabled={isInteractionDisabled}
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

        <div className="particle absolute top-1/4 left-1/3 text-2xl opacity-30">✨</div>
        <div className="particle absolute top-1/3 right-1/4 text-xl opacity-20">⭐</div>
        <div className="particle absolute bottom-1/3 left-1/2 text-3xl opacity-25">💫</div>
        <div className="particle absolute top-2/3 right-1/3 text-xl opacity-30">✨</div>

        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/40 via-transparent to-stone-950/60 pointer-events-none" />
      </div>

      <div ref={contentRef} className="relative z-10 space-y-6">
        {/* LOADING STATE */}
        {isTransitioning && <LoadingSkeleton mode={gameMode === 'select' ? 'select' : 'normal'} />}

        {/* MODE SELECTION SCREEN */}
        {!isTransitioning && gameMode === 'select' && (
          <div className="space-y-6">
            {/* Welcome Banner */}
            <Card
              ref={setCardRef(0)}
              className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 border-4 border-amber-600 backdrop-blur-sm shadow-2xl"
            >
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
                onClick={() => handleModeTransition('normal')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleModeTransition('normal')}
                aria-label="Pilih Mode Eksplorasi Biasa"
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
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleTournamentMode()}
                aria-label="Pilih Mode Tournament Arena"
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
        {!isTransitioning && gameMode === 'normal' && (
          <div className="space-y-6">
            {/* Error Display */}
            {error && <ErrorDisplay error={error} onDismiss={() => setError('')} />}

            {/* Main Content */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Tab Navigation */}
                <div className="flex gap-4" role="tablist">
                  <Button
                    onClick={() => setActiveTab('create')}
                    disabled={isInteractionDisabled}
                    role="tab"
                    aria-selected={activeTab === 'create'}
                    aria-controls="create-panel"
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
                    disabled={isInteractionDisabled}
                    role="tab"
                    aria-selected={activeTab === 'join'}
                    aria-controls="join-panel"
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
                      <div id="create-panel" role="tabpanel" className="space-y-6">
                        <Card className="bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border-2 border-amber-500">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                              <span className="text-4xl" aria-hidden="true">
                                👑
                              </span>
                              <div>
                                <h3 className="text-xl font-bold text-amber-300">Guild Master</h3>
                                <p className="text-stone-300 text-sm">Anda akan memimpin ekspedisi guild</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Button
                          onClick={handleCreateSession}
                          disabled={creating}
                          className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-stone-900 font-bold text-lg py-6 rounded-xl shadow-amber-glow disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-busy={creating}
                        >
                          {creating ? (
                            <span className="flex items-center justify-center gap-3">
                              <span className="animate-spin" aria-hidden="true">
                                ⚙️
                              </span>
                              <span>Mempersiapkan Guild...</span>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-3">
                              <span aria-hidden="true">👑</span> Dirikan Guild Baru
                            </span>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div id="join-panel" role="tabpanel" className="space-y-6">
                        <h3 className="text-2xl font-bold text-center text-blue-400">🏰 Bergabung ke Guild</h3>

                        {/* Code Input */}
                        <div>
                          <label htmlFor="team-code" className="sr-only">
                            Kode Guild
                          </label>
                          <input
                            id="team-code"
                            type="text"
                            value={teamCode}
                            onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                            placeholder="KODE 6 DIGIT"
                            className="w-full px-6 py-4 bg-gradient-to-r from-stone-800 to-stone-700 border-4 border-amber-600 rounded-xl text-center text-2xl font-mono text-amber-300 placeholder-amber-600/50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                            maxLength={CONFIG.TEAM_CODE_LENGTH}
                            disabled={joining}
                            autoComplete="off"
                            aria-describedby="team-code-help"
                          />
                          <p id="team-code-help" className="sr-only">
                            Masukkan kode guild 6 karakter yang Anda terima dari guild master
                          </p>
                        </div>

                        {/* Role Selection */}
                        <fieldset className="grid md:grid-cols-2 gap-4">
                          <legend className="sr-only">Pilih Peran</legend>
                          <Card
                            className={`cursor-pointer transition-all duration-300 ${
                              selectedRole === 'defuser'
                                ? 'bg-gradient-to-br from-red-900/60 to-orange-900/60 border-4 border-red-500 ring-2 ring-red-400'
                                : 'bg-gradient-to-br from-stone-800/80 to-stone-900/80 border-2 border-stone-600'
                            }`}
                            onClick={() => setSelectedRole('defuser')}
                            role="radio"
                            aria-checked={selectedRole === 'defuser'}
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && setSelectedRole('defuser')}
                          >
                            <CardContent className="p-6 text-center">
                              <div className="text-5xl mb-3" aria-hidden="true">
                                💣
                              </div>
                              <h5 className="text-xl font-bold text-red-300">Bomb Defuser</h5>
                            </CardContent>
                          </Card>

                          <Card
                            className={`cursor-pointer transition-all duration-300 ${
                              selectedRole === 'expert'
                                ? 'bg-gradient-to-br from-blue-900/60 to-purple-900/60 border-4 border-blue-500 ring-2 ring-blue-400'
                                : 'bg-gradient-to-br from-stone-800/80 to-stone-900/80 border-2 border-stone-600'
                            }`}
                            onClick={() => setSelectedRole('expert')}
                            role="radio"
                            aria-checked={selectedRole === 'expert'}
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && setSelectedRole('expert')}
                          >
                            <CardContent className="p-6 text-center">
                              <div className="text-5xl mb-3" aria-hidden="true">
                                📖
                              </div>
                              <h5 className="text-xl font-bold text-blue-300">Manual Expert</h5>
                            </CardContent>
                          </Card>
                        </fieldset>

                        <Button
                          onClick={handleJoinSession}
                          disabled={!teamCode.trim() || joining || teamCode.length !== CONFIG.TEAM_CODE_LENGTH}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg py-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-busy={joining}
                        >
                          {joining ? (
                            <span className="flex items-center justify-center gap-3">
                              <span className="animate-spin" aria-hidden="true">
                                ⚙️
                              </span>
                              <span>Bergabung...</span>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-3">
                              <span aria-hidden="true">⚔️</span> Bergabung ke Guild
                            </span>
                          )}
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
                      className={`w-full py-4 transition-all duration-300 ${
                        showVoiceChat ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                      }`}
                      aria-pressed={showVoiceChat}
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
      {gameMode === 'normal' && !showVoiceChat && !isTransitioning && (
        <button
          onClick={handleToggleVoiceChat}
          className="fixed bottom-6 right-6 lg:hidden bg-green-600 p-4 rounded-full shadow-green-glow z-50 hover:bg-green-700 transition-colors"
          aria-label="Aktifkan voice chat"
        >
          <span className="text-2xl" aria-hidden="true">
            🎙️
          </span>
        </button>
      )}

      {/* Styles */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-50px) rotate(180deg); opacity: 0.8; }
        }

        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        .particle { animation: float 4s ease-in-out infinite; }

        .torch-glow {
          filter: drop-shadow(0 0 8px rgba(251, 146, 60, 0.6)) drop-shadow(0 0 15px rgba(251, 146, 60, 0.4));
        }

        .drop-shadow-glow {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4);
        }

        .shadow-amber-glow {
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.2);
        }

        .shadow-green-glow {
          box-shadow: 0 0 30px rgba(34, 197, 94, 0.4), 0 0 60px rgba(34, 197, 94, 0.2);
        }

        .shadow-blue-glow {
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.4), 0 0 60px rgba(59, 130, 246, 0.2);
        }

        .shadow-purple-glow {
          box-shadow: 0 0 30px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.2);
        }

        /* Loading skeleton pulse animation */
        .skeleton-pulse {
          animation: skeleton-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes skeleton-pulse {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }

        /* Smooth transitions */
        * {
          transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Focus styles for accessibility */
        *:focus-visible {
          outline: 2px solid rgba(251, 191, 36, 0.8);
          outline-offset: 2px;
        }
      `}</style>
    </AuthenticatedLayout>
  );
}
