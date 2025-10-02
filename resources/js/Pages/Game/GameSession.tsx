import React, { useEffect, useMemo, useState, useCallback, useRef, memo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { GameState } from '@/types/game';
import { gameApi } from '@/services/gameApi';
import Authenticated from '@/Layouts/AuthenticatedLayout';
import { gsap } from 'gsap';

// Komponen internal multi-stage
import StageProgress from '@/Components/Game/StageProgress';
import GamePlay from '@/Components/Game/GamePlay';
import StageTransition from '@/Components/Game/StageTransition';
import VoiceChat from '@/Components/Game/VoiceChat';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  POLLING_INTERVAL: 3000,
  TRANSITION_DURATION: 4000,
  TORCH_FLICKER_INTERVAL: 2200,
  CRYSTAL_GLOW_DURATION: 3000,
  RUNE_FLOAT_DURATION: 3200,
  MAX_PARTICIPANTS: 2,
} as const;

const STATUS_CONFIG = {
  waiting: {
    color: 'text-amber-300',
    bgGradient: 'from-stone-900 to-amber-950',
    borderColor: 'border-amber-700',
    icon: '🗝️',
    title: 'Persiapan Ujian Multi-Tahap'
  },
  running: {
    color: 'text-indigo-300',
    bgGradient: 'from-stone-900 via-stone-800 to-amber-950',
    borderColor: 'border-amber-700',
    icon: '⚔️',
    title: 'Tantangan Berlangsung'
  },
  success: {
    color: 'text-emerald-300',
    bgGradient: 'from-stone-900 to-emerald-950',
    borderColor: 'border-emerald-700',
    icon: '🎉',
    title: 'Misi Tuntas'
  },
  failed: {
    color: 'text-red-300',
    bgGradient: 'from-stone-900 to-red-950',
    borderColor: 'border-red-700',
    icon: '💥',
    title: 'Misi Gagal'
  },
  paused: {
    color: 'text-amber-300',
    bgGradient: 'from-stone-900 to-amber-950',
    borderColor: 'border-amber-700',
    icon: '⏸️',
    title: 'Permainan Dijeda'
  },
  ended: {
    color: 'text-stone-200',
    bgGradient: 'from-stone-900 to-stone-800',
    borderColor: 'border-stone-700',
    icon: '🏁',
    title: 'Sesi Berakhir'
  }
} as const;

const ROLE_CONFIG = {
  defuser: {
    icon: '💣',
    title: 'Penjinak Perangkat',
    color: 'red',
    badge: 'bg-red-800 text-red-100 border-red-700'
  },
  expert: {
    icon: '📖',
    title: 'Penjaga Manual',
    color: 'indigo',
    badge: 'bg-indigo-800 text-indigo-100 border-indigo-700'
  },
  host: {
    icon: '👑',
    title: 'Guild Master',
    color: 'emerald',
    badge: 'bg-emerald-800 text-emerald-100 border-emerald-700'
  },
  observer: {
    icon: '👁️',
    title: 'Pengamat',
    color: 'purple',
    badge: 'bg-purple-800 text-purple-100 border-purple-700'
  }
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================
interface Props {
  sessionId: number;
  role?: 'defuser' | 'expert' | 'host';
}

interface StageResult {
  stageComplete?: boolean;
  gameComplete?: boolean;
  nextStage?: number;
  stageScore?: number;
  finalScore?: number;
  message?: string;
  attemptsRemaining?: number;
}

interface MultiStageGameState {
  session: GameState['session'];
  puzzle: GameState['puzzle'];
  stage?: {
    current?: number;
    total?: number;
    config?: {
      title?: string;
      timeLimit?: number;
      maxAttempts?: number;
    };
    progress?: {
      completed?: number[];
      totalScore?: number;
    };
  };
  serverTime?: string;
}

// ============================================
// CUSTOM HOOKS
// ============================================
const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const crystalRefs = useRef<(HTMLElement | null)[]>([]);
  const runeRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // Torch flicker animation
    const torchInterval = setInterval(() => {
      torchRefs.current.forEach((torch) => {
        if (torch) {
          gsap.to(torch, {
            opacity: Math.random() * 0.14 + 0.86,
            filter: `brightness(${Math.random() * 0.17 + 0.95})`,
            duration: 0.22,
            ease: 'power1.inOut',
          });
        }
      });
    }, CONFIG.TORCH_FLICKER_INTERVAL);

    // Crystal glow animation
    crystalRefs.current.forEach((crystal) => {
      if (crystal) {
        gsap.to(crystal, {
          boxShadow: '0 0 28px rgba(180,83,9,0.8), 0 0 60px rgba(251,191,36,0.45)',
          duration: CONFIG.CRYSTAL_GLOW_DURATION / 1000,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }
    });

    // Rune float animation
    runeRefs.current.forEach((rune) => {
      if (rune) {
        gsap.to(rune, {
          y: -6,
          duration: CONFIG.RUNE_FLOAT_DURATION / 1000,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }
    });

    return () => clearInterval(torchInterval);
  }, []);

  const setTorchRef = (index: number) => (el: HTMLSpanElement | null) => {
    torchRefs.current[index] = el;
  };

  const setCrystalRef = (index: number) => (el: HTMLDivElement | null) => {
    crystalRefs.current[index] = el;
  };

  const setRuneRef = (index: number) => (el: HTMLDivElement | null) => {
    runeRefs.current[index] = el;
  };

  return { setTorchRef, setCrystalRef, setRuneRef };
};

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const LoadingCard = memo(() => {
  const { setRuneRef } = useDungeonAtmosphere();

  return (
    <Card className="border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-stone-800 dungeon-card-glow">
      <CardContent className="p-10 text-center">
        <div ref={setRuneRef(0)} className="text-6xl mb-6 dungeon-rune-float">
          🕯️
        </div>
        <h3 className="text-2xl font-bold text-amber-300 mb-2 dungeon-glow-text">
          Menyiapkan Arena Dungeon
        </h3>
        <p className="text-stone-300">
          Mohon tunggu, lantai-lantai ujian sedang dibangunkan...
        </p>
      </CardContent>
    </Card>
  );
});

LoadingCard.displayName = 'LoadingCard';

const ErrorCard = memo(({ error }: { error: string }) => {
  const { setTorchRef } = useDungeonAtmosphere();

  return (
    <Card className="border-4 border-red-700 bg-gradient-to-b from-stone-900 to-red-950 dungeon-card-glow-red">
      <CardContent className="p-10 text-center">
        <div ref={setTorchRef(0)} className="text-6xl mb-6 dungeon-torch-flicker">
          ⚠️
        </div>
        <h3 className="text-3xl font-bold text-red-200 mb-3 dungeon-glow-text">
          Ritual Terputus
        </h3>
        <p className="text-red-200/90 mb-6">{error || 'Gagal memuat data permainan'}</p>
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-bold dungeon-button-glow"
          >
            Coba Muat Ulang
          </Button>
          <Button
            onClick={() => (window.location.href = '/game')}
            variant="outline"
            className="border-stone-600 text-stone-200 hover:bg-stone-800/60"
          >
            Kembali ke Lobi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

ErrorCard.displayName = 'ErrorCard';

const SessionHeader = memo(({
  session,
  currentRole,
  participants,
  showVoiceChat
}: {
  session: any;
  currentRole: string;
  participants: any[];
  showVoiceChat: boolean;
}) => {
  const { setTorchRef } = useDungeonAtmosphere();
  const statusConfig = STATUS_CONFIG[session.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.waiting;
  const roleConfig = ROLE_CONFIG[currentRole as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.observer;

  return (
    <Card className={`border-4 ${statusConfig.borderColor} bg-gradient-to-r ${statusConfig.bgGradient} relative overflow-hidden dungeon-card-glow`}>
      <CardHeader>
        <div className="absolute top-3 left-3 text-2xl">
          <span ref={setTorchRef(0)} className="dungeon-torch-flicker">🔥</span>
        </div>
        <div className="absolute top-3 right-3 text-2xl">
          <span ref={setTorchRef(1)} className="dungeon-torch-flicker">🔥</span>
        </div>
        <CardTitle className="text-amber-300 text-2xl sm:text-3xl text-center sm:text-left dungeon-glow-text">
          Sesi: {session.team_code}
        </CardTitle>
        <CardDescription className="text-stone-300 text-center sm:text-left">
          Status:{' '}
          <span className={`font-semibold ${statusConfig.color}`}>
            {String(session.status).toUpperCase()}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
          <Badge className={`${roleConfig.badge} font-bold`}>
            {roleConfig.icon} Peran: {roleConfig.title}
          </Badge>
        </div>
        <div className="text-center sm:text-right">
          <div className="text-2xl font-bold text-indigo-200">
            {participants.length}/{CONFIG.MAX_PARTICIPANTS}
          </div>
          <div className="text-sm text-stone-300">Pemain Siap</div>
          {showVoiceChat && (
            <div className="flex items-center justify-center sm:justify-end mt-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse dungeon-pulse"></div>
              <span className="text-xs text-emerald-300">Voice Chat Aktif</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

SessionHeader.displayName = 'SessionHeader';

const ParticipantCard = memo(({ participant, currentRole }: { participant: any; currentRole: string }) => {
  const roleConfig = ROLE_CONFIG[participant.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.observer;

  return (
    <div className="flex items-center justify-between p-4 bg-stone-900/60 rounded-lg border border-stone-700 hover:border-amber-700 transition-all duration-300 dungeon-card-hover">
      <div className="flex items-center space-x-3">
        <div
          className={`w-3.5 h-3.5 rounded-full bg-${roleConfig.color}-500 dungeon-pulse`}
        />
        <div>
          <span className="font-medium text-stone-200">{participant.nickname}</span>
          <div className="text-sm text-stone-400">
            {roleConfig.icon} {roleConfig.title}
          </div>
        </div>
      </div>
      {participant.role === currentRole && (
        <Badge className="bg-emerald-800 text-emerald-100 border-emerald-700">Aktif</Badge>
      )}
    </div>
  );
});

ParticipantCard.displayName = 'ParticipantCard';

// ============================================
// MAIN COMPONENT
// ============================================
export default function GameSession({ sessionId, role: propRole }: Props) {
  const { auth } = usePage().props as any;
  const { setTorchRef, setCrystalRef, setRuneRef } = useDungeonAtmosphere();

  // State Management
  const [gameState, setGameState] = useState<MultiStageGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showTransition, setShowTransition] = useState(false);
  const [stageResult, setStageResult] = useState<StageResult | null>(null);
  const [showVoiceChat, setShowVoiceChat] = useState(true);
  const [isVoiceChatCollapsed, setIsVoiceChatCollapsed] = useState(false);

  // Deteksi peran dengan prioritas URL > prop > peserta > observer
  const getCurrentRole = useCallback((): 'defuser' | 'expert' | 'host' | 'observer' => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlRole = urlParams.get('role');
    if (urlRole && ['defuser', 'expert', 'host'].includes(urlRole)) {
      return urlRole as 'defuser' | 'expert' | 'host';
    }
    if (propRole && ['defuser', 'expert', 'host'].includes(propRole)) {
      return propRole;
    }
    const participants = gameState?.session?.participants || [];
    const userParticipant = participants.find((p) => p.user_id === auth?.user?.id);
    if (userParticipant?.role) {
      return userParticipant.role as 'defuser' | 'expert' | 'host';
    }
    return 'observer';
  }, [auth?.user?.id, gameState?.session?.participants, propRole]);

  const currentRole = getCurrentRole();

  // Muat state permainan periodik
  const loadGameState = useCallback(async () => {
    try {
      const state = await gameApi.getGameState(sessionId);
      if (state?.session) {
        const safeState: MultiStageGameState = {
          session: {
            ...state.session,
            participants: Array.isArray(state.session.participants) ? state.session.participants : [],
            attempts: Array.isArray(state.session.attempts) ? state.session.attempts : [],
          },
          puzzle: state.puzzle,
          stage: state.stage,
          serverTime: state.serverTime,
        };
        setGameState(safeState);
        setError('');
      } else {
        setError('Data sesi tidak valid');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data permainan');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setError('ID sesi diperlukan');
      setLoading(false);
      return;
    }

    loadGameState();
    const interval = setInterval(loadGameState, CONFIG.POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [sessionId, loadGameState]);

  const handleStartSession = useCallback(async () => {
    try {
      await gameApi.startSession(sessionId);
      setTimeout(loadGameState, 1000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memulai sesi');
    }
  }, [sessionId, loadGameState]);

  const handleAttemptSubmit = useCallback(async (inputValue: string) => {
    if (!gameState) return;
    try {
      const result = await gameApi.submitAttempt(gameState.session.id, gameState.puzzle.key, inputValue);

      if (result.stageComplete || result.gameComplete) {
        setStageResult(result);
        setShowTransition(true);
        setTimeout(() => {
          setShowTransition(false);
          setStageResult(null);
          loadGameState();
        }, CONFIG.TRANSITION_DURATION);
      } else {
        setGameState({
          ...gameState,
          session: {
            ...gameState.session,
            attempts: result.session?.attempts || gameState.session.attempts,
          },
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal mengirim percobaan');
    }
  }, [gameState, loadGameState]);

  const handleGameStateUpdate = useCallback((updatedState: GameState) => {
    const convertedState: MultiStageGameState = {
      session: updatedState.session,
      puzzle: updatedState.puzzle,
      stage: updatedState.stage as any,
      serverTime: updatedState.serverTime,
    };
    setGameState(convertedState);
  }, []);

  // Loading State
  if (loading) {
    return (
      <Authenticated>
        <Head title="Memuat Tantangan Multi-Tahap..." />
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <LoadingCard />
          </div>
        </div>
      </Authenticated>
    );
  }

  // Error State
  if (error || !gameState) {
    return (
      <Authenticated>
        <Head title="Kesalahan" />
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <ErrorCard error={error} />
          </div>
        </div>
      </Authenticated>
    );
  }

  const { session, puzzle, stage } = gameState;
  const participants = session.participants || [];

  // Transition State
  if (showTransition && stageResult) {
    return (
      <Authenticated>
        <Head title="Peralihan Tahap" />
        <StageTransition
          result={stageResult}
          currentStage={stage?.current}
          totalStages={stage?.total}
        />
      </Authenticated>
    );
  }

  // Render Functions
  const renderWaiting = () => (
    <div className="grid lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <Card className="border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-stone-800 dungeon-card-glow">
          <CardContent className="p-6 sm:p-8">
            <div className="text-center">
              <div ref={setRuneRef(0)} className="text-6xl mb-4 dungeon-rune-float">
                🗝️
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-amber-300 mb-4 dungeon-glow-text">
                Persiapan Ujian Multi-Tahap
              </h2>
              {participants.length < CONFIG.MAX_PARTICIPANTS ? (
                <div>
                  <p className="text-stone-300 mb-6 sm:mb-8 text-base sm:text-lg">
                    Menunggu rekan seperjuangan bergabung... ({participants.length}/{CONFIG.MAX_PARTICIPANTS})
                  </p>
                  <Card className="max-w-md mx-auto border-2 border-blue-700 bg-gradient-to-b from-stone-900 to-blue-950 dungeon-card-glow-blue">
                    <CardContent className="p-4 sm:p-6">
                      <p className="text-blue-200 font-medium mb-3">
                        Ajak teman untuk menembus dungeon ini!
                      </p>
                      <div className="rounded-xl p-3 border border-blue-700 bg-stone-950 text-center">
                        <p className="text-sm text-blue-300 mb-1">Kode guild:</p>
                        <p className="font-mono font-bold text-lg text-blue-200">{session.team_code}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div>
                  <p className="text-stone-300 mb-6 sm:mb-8 text-base sm:text-lg">
                    Tim lengkap! Saatnya memulai ujian 3 tahap. ({participants.length}/{CONFIG.MAX_PARTICIPANTS})
                  </p>
                  <Card className="max-w-2xl mx-auto mb-6 border-2 border-emerald-700 bg-gradient-to-b from-stone-900 to-emerald-950 dungeon-card-glow-green">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-emerald-300 dungeon-glow-text">
                        Gambaran Misi
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      {[
                        { stage: 1, title: 'Analisis Pola' },
                        { stage: 2, title: 'Analisis Kode' },
                        { stage: 3, title: 'Navigasi Pohon' }
                      ].map(({ stage, title }) => (
                        <div key={stage} className="text-center">
                          <div ref={setCrystalRef(stage - 1)} className="bg-emerald-900/40 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 border border-emerald-700 dungeon-crystal-glow">
                            <span className="font-bold text-emerald-300">{stage}</span>
                          </div>
                          <p className="font-medium text-emerald-200">{title}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Button
                    onClick={handleStartSession}
                    className="bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-bold py-4 px-8 sm:px-12 text-base sm:text-lg dungeon-button-glow"
                  >
                    ⚔️ Mulai Ujian Multi-Tahap
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar Voice Chat */}
      <div className="lg:col-span-1">
        <div className="space-y-4">
          <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
            <CardContent className="p-4">
              <Button
                onClick={() => setShowVoiceChat(!showVoiceChat)}
                className={
                  showVoiceChat
                    ? 'w-full bg-emerald-700 hover:bg-emerald-600'
                    : 'w-full bg-indigo-700 hover:bg-indigo-600'
                }
              >
                🎙️ {showVoiceChat ? 'Sembunyikan Voice Chat' : 'Tampilkan Voice Chat'}
              </Button>
            </CardContent>
          </Card>

          {showVoiceChat && (
            <VoiceChat
              sessionId={sessionId}
              userId={auth?.user?.id}
              nickname={auth?.user?.name || 'Unknown'}
              role={['defuser', 'expert', 'host'].includes(currentRole) ? (currentRole as 'defuser' | 'expert' | 'host') : 'host'}
              participants={participants.map((p: any) => ({
                id: p.id,
                user_id: p.user_id ?? 0,
                nickname: p.nickname,
                role: p.role,
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );

  const renderRunning = () => (
    <div className="space-y-6">
      {stage && (
        <StageProgress
          current={stage.current || 1}
          total={stage.total || 3}
          completed={stage.progress?.completed || []}
          totalScore={stage.progress?.totalScore || 0}
        />
      )}

      <Card className="border-4 border-amber-700 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 dungeon-card-glow">
        <CardContent className="p-4 sm:p-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-amber-300 mb-3 dungeon-glow-text">
            {stage?.config?.title || puzzle?.title || 'Tahap Saat Ini'}
          </h1>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-stone-200">
            <span className="flex items-center">
              <span className="mr-2">⏱️</span>
              Batas Waktu: {Math.floor((stage?.config?.timeLimit || 0) / 60)} menit
            </span>
            <span className="flex items-center">
              <span className="mr-2">🎯</span>
              Upaya Maks: {stage?.config?.maxAttempts || 'N/A'}
            </span>
            <span className="flex items-center">
              <span className="mr-2">📊</span>
              Tahap: {stage?.current || 1}/{stage?.total || 3}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className={`transition-all duration-300 ${showVoiceChat && !isVoiceChatCollapsed ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
            <CardContent className="p-4 sm:p-6">
              <GamePlay
                gameState={gameState as GameState}
                role={['defuser', 'expert', 'host'].includes(currentRole) ? (currentRole as 'defuser' | 'expert' | 'host') : undefined}
                onGameStateUpdate={handleGameStateUpdate}
                onSubmitAttempt={handleAttemptSubmit}
              />
            </CardContent>
          </Card>
        </div>

        {showVoiceChat && !isVoiceChatCollapsed && (
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <VoiceChat
                sessionId={sessionId}
                userId={auth?.user?.id}
                nickname={auth?.user?.name || 'Unknown'}
                role={['defuser', 'expert', 'host'].includes(currentRole) ? (currentRole as 'defuser' | 'expert' | 'host') : 'host'}
                participants={participants.map((p: any) => ({
                  id: p.id,
                  user_id: p.user_id ?? 0,
                  nickname: p.nickname,
                  role: p.role,
                }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Kontrol mengambang Voice Chat */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        {!showVoiceChat && (
          <Button
            onClick={() => setShowVoiceChat(true)}
            className="bg-indigo-700 hover:bg-indigo-600 rounded-full p-3 shadow-lg dungeon-button-glow"
            title="Tampilkan Voice Chat"
            aria-label="Tampilkan Voice Chat"
          >
            🎙️
          </Button>
        )}
        {showVoiceChat && (
          <>
            <Button
              onClick={() => setIsVoiceChatCollapsed(!isVoiceChatCollapsed)}
              variant="outline"
              className="border-stone-600 text-stone-200 hover:bg-stone-800/60 rounded-full p-2 shadow-lg"
              title={isVoiceChatCollapsed ? 'Perluas Voice Chat' : 'Ciutkan Voice Chat'}
              aria-label={isVoiceChatCollapsed ? 'Perluas Voice Chat' : 'Ciutkan Voice Chat'}
            >
              {isVoiceChatCollapsed ? '📱' : '📵'}
            </Button>
            <Button
              onClick={() => setShowVoiceChat(false)}
              className="bg-red-700 hover:bg-red-600 rounded-full p-2 shadow-lg"
              title="Sembunyikan Voice Chat"
              aria-label="Sembunyikan Voice Chat"
            >
              ✕
            </Button>
          </>
        )}
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="py-6">
      <Card className="border-4 border-emerald-700 bg-gradient-to-b from-stone-900 to-emerald-950 dungeon-card-glow-green">
        <CardContent className="p-6 sm:p-8 text-center">
          <div ref={setRuneRef(1)} className="text-6xl mb-4 dungeon-rune-float">
            🎉
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-emerald-200 mb-4 dungeon-glow-text">
            Misi Tuntas!
          </h2>
          <p className="text-emerald-100 mb-6 text-base sm:text-lg">
            Selamat, seluruh tahap berhasil dilalui dengan gemilang.
          </p>
          {stage && (
            <div className="mb-6">
              <StageProgress
                current={stage.current || 1}
                total={stage.total || 3}
                completed={stage.progress?.completed || []}
                totalScore={stage.progress?.totalScore || 0}
              />
            </div>
          )}
          <Card className="bg-emerald-900/40 border border-emerald-700 max-w-md mx-auto mb-6 dungeon-card-glow-green">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-emerald-200 mb-3">Hasil Akhir</h3>
              <div className="grid grid-cols-2 gap-4 text-emerald-100">
                <div>
                  <div className="text-2xl font-bold">{stage?.progress?.totalScore || 0}</div>
                  <div className="text-sm opacity-80">Skor Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {stage?.progress?.completed?.length || 0}/{stage?.total || 3}
                  </div>
                  <div className="text-sm opacity-80">Tahap Tuntas</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => (window.location.href = '/game')}
              className="w-full sm:w-auto bg-indigo-700 hover:bg-indigo-600"
            >
              Main Lagi
            </Button>
            <Button
              onClick={() => (window.location.href = '/dashboard')}
              variant="outline"
              className="w-full sm:w-auto border-stone-600 text-stone-200 hover:bg-stone-800/60"
            >
              Kembali ke Dasbor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFailed = () => (
    <div className="py-6">
      <Card className="border-4 border-red-700 bg-gradient-to-b from-stone-900 to-red-950 dungeon-card-glow-red">
        <CardContent className="p-6 sm:p-8 text-center">
          <div ref={setTorchRef(2)} className="text-6xl mb-4 dungeon-torch-flicker">
            💥
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-red-200 mb-4 dungeon-glow-text">
            Misi Gagal
          </h2>
          <p className="text-red-100 mb-6 text-base sm:text-lg">
            Cobaan tak terselesaikan dalam syarat yang ditetapkan.
          </p>
          {stage && (
            <div className="mb-6">
              <StageProgress
                current={stage.current || 1}
                total={stage.total || 3}
                completed={stage.progress?.completed || []}
                totalScore={stage.progress?.totalScore || 0}
              />
            </div>
          )}
          <Card className="bg-red-900/40 border border-red-700 max-w-md mx-auto mb-6 dungeon-card-glow-red">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-red-200 mb-3">Jejak Pencapaian</h3>
              <div className="grid grid-cols-2 gap-4 text-red-100">
                <div>
                  <div className="text-2xl font-bold">{stage?.progress?.totalScore || 0}</div>
                  <div className="text-sm opacity-80">Skor Terkumpul</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {stage?.progress?.completed?.length || 0}/{stage?.total || 3}
                  </div>
                  <div className="text-sm opacity-80">Tahap Tuntas</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => (window.location.href = '/game')}
              className="w-full sm:w-auto bg-indigo-700 hover:bg-indigo-600"
            >
              Coba Lagi
            </Button>
            <Button
              onClick={() => (window.location.href = '/dashboard')}
              variant="outline"
              className="w-full sm:w-auto border-stone-600 text-stone-200 hover:bg-stone-800/60"
            >
              Kembali ke Dasbor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPaused = () => (
    <Card className="border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-amber-950 dungeon-card-glow">
      <CardContent className="p-8 text-center">
        <div className="text-4xl mb-4">⏸️</div>
        <h2 className="text-2xl font-bold text-amber-300 mb-4 dungeon-glow-text">
          Permainan Dijeda
        </h2>
        <p className="text-stone-300 mb-6">
          Sesi dijeda sementara, tunggu hingga dilanjutkan kembali.
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-amber-700 hover:bg-amber-600"
        >
          Segarkan Status
        </Button>
      </CardContent>
    </Card>
  );

  const renderEnded = () => (
    <Card className="border-4 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
      <CardContent className="p-8 text-center">
        <div className="text-4xl mb-4">🏁</div>
        <h2 className="text-2xl font-bold text-stone-200 mb-4 dungeon-glow-text">
          Sesi Berakhir
        </h2>
        <p className="text-stone-300 mb-6">
          Terima kasih telah berpartisipasi di ujian dungeon ini.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => (window.location.href = '/game')}
            className="w-full sm:w-auto bg-indigo-700 hover:bg-indigo-600"
          >
            Ujian Baru
          </Button>
          <Button
            onClick={() => (window.location.href = '/dashboard')}
            variant="outline"
            className="w-full sm:w-auto border-stone-600 text-stone-200 hover:bg-stone-800/60"
          >
            Dasbor
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderUnknown = () => (
    <Card className="border-4 border-red-700 bg-gradient-to-b from-stone-900 to-red-950 dungeon-card-glow-red">
      <CardContent className="p-8 text-center">
        <div className="text-4xl mb-4">❓</div>
        <h2 className="text-xl font-bold text-red-200 mb-4 dungeon-glow-text">
          Status Tidak Dikenal
        </h2>
        <p className="text-red-100 mb-6">
          Status:{' '}
          <code className="bg-red-900/40 px-2 py-1 rounded border border-red-700">
            {session.status}
          </code>
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto bg-red-700 hover:bg-red-600"
          >
            Muat Ulang
          </Button>
          <Button
            onClick={() => (window.location.href = '/game')}
            variant="outline"
            className="w-full sm:w-auto border-stone-600 text-stone-200 hover:bg-stone-800/60"
          >
            Kembali ke Lobi
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderGameContent = () => {
    switch (session.status) {
      case 'waiting':
        return renderWaiting();
      case 'running':
        return renderRunning();
      case 'success':
        return renderSuccess();
      case 'failed':
        return renderFailed();
      case 'paused':
        return renderPaused();
      case 'ended':
        return renderEnded();
      default:
        return renderUnknown();
    }
  };

  return (
    <Authenticated>
      <Head title={`Tantangan Multi-Tahap - ${session.team_code}`} />
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6">
          {/* Header Sesi */}
          <SessionHeader
            session={session}
            currentRole={currentRole}
            participants={participants}
            showVoiceChat={showVoiceChat}
          />

          {/* Konten utama */}
          {renderGameContent()}

          {/* Daftar peserta */}
          {!['success', 'failed', 'ended'].includes(session.status) && (
            <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
              <CardHeader>
                <CardTitle className="text-stone-200 text-base sm:text-lg flex items-center gap-2">
                  👥 Anggota Tim ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {participants.map((participant: any, index: number) => (
                    <ParticipantCard
                      key={participant.id || index}
                      participant={participant}
                      currentRole={currentRole}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ========================================
          CUSTOM DUNGEON STYLES
          ======================================== */}
      <style>{`
        /* Torch Flicker Animation */
        .dungeon-torch-flicker {
          display: inline-block;
        }

        /* Crystal Glow Animation */
        .dungeon-crystal-glow {
          box-shadow: 0 0 20px rgba(180,83,9,0.6), 0 0 40px rgba(251,191,36,0.25);
        }

        /* Rune Float Animation */
        .dungeon-rune-float {
          display: inline-block;
        }

        /* Card Glows */
        .dungeon-card-glow {
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.2);
        }

        .dungeon-card-glow-green {
          box-shadow: 0 0 30px rgba(34, 197, 94, 0.4), 0 0 60px rgba(34, 197, 94, 0.2);
        }

        .dungeon-card-glow-blue {
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.4), 0 0 60px rgba(59, 130, 246, 0.2);
        }

        .dungeon-card-glow-red {
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.4), 0 0 60px rgba(239, 68, 68, 0.2);
        }

        /* Card Hover */
        .dungeon-card-hover:hover {
          box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
        }

        /* Button Glow */
        .dungeon-button-glow:hover {
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.5), 0 0 40px rgba(251, 191, 36, 0.3);
        }

        /* Text Glow */
        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4);
        }

        /* Pulse Animation */
        .dungeon-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .dungeon-card-glow,
          .dungeon-card-glow-green,
          .dungeon-card-glow-blue,
          .dungeon-card-glow-red {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.3), 0 0 30px rgba(251, 191, 36, 0.15);
          }
        }
      `}</style>
    </Authenticated>
  );
}
