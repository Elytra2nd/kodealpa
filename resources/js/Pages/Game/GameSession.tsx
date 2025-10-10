import React, { useEffect, useMemo, useState, useCallback, useRef, memo } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '@/types/game';
import { gameApi } from '@/services/gameApi';
import Authenticated from '@/Layouts/AuthenticatedLayout';
import { gsap } from 'gsap';
import { toast } from 'sonner';

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
  TORCH_FLICKER_INTERVAL: 150,
  CRYSTAL_GLOW_DURATION: 3000,
  RUNE_FLOAT_DURATION: 3200,
  MAX_PARTICIPANTS: 2,
  MAX_RETRY_ATTEMPTS: 3,
  MOBILE_BREAKPOINT: 768,
  DEBOUNCE_DELAY: 300,
} as const;

const STATUS_CONFIG = {
  waiting: {
    color: 'text-amber-300',
    bgGradient: 'from-stone-900 to-amber-950',
    borderColor: 'border-amber-700',
    icon: '🗝️',
    title: 'Persiapan Ujian Multi-Tahap',
  },
  running: {
    color: 'text-indigo-300',
    bgGradient: 'from-stone-900 via-stone-800 to-amber-950',
    borderColor: 'border-amber-700',
    icon: '⚔️',
    title: 'Tantangan Berlangsung',
  },
  success: {
    color: 'text-emerald-300',
    bgGradient: 'from-stone-900 to-emerald-950',
    borderColor: 'border-emerald-700',
    icon: '🎉',
    title: 'Misi Tuntas',
  },
  failed: {
    color: 'text-red-300',
    bgGradient: 'from-stone-900 to-red-950',
    borderColor: 'border-red-700',
    icon: '💥',
    title: 'Misi Gagal',
  },
  paused: {
    color: 'text-amber-300',
    bgGradient: 'from-stone-900 to-amber-950',
    borderColor: 'border-amber-700',
    icon: '⏸️',
    title: 'Permainan Dijeda',
  },
  ended: {
    color: 'text-stone-200',
    bgGradient: 'from-stone-900 to-stone-800',
    borderColor: 'border-stone-700',
    icon: '🏁',
    title: 'Sesi Berakhir',
  },
} as const;

const ROLE_CONFIG = {
  defuser: {
    icon: '💣',
    title: 'Penjinak Perangkat',
    color: 'red',
    badge: 'bg-red-800 text-red-100 border-red-700',
  },
  expert: {
    icon: '📖',
    title: 'Penjaga Manual',
    color: 'indigo',
    badge: 'bg-indigo-800 text-indigo-100 border-indigo-700',
  },
  host: {
    icon: '👑',
    title: 'Guild Master',
    color: 'emerald',
    badge: 'bg-emerald-800 text-emerald-100 border-emerald-700',
  },
  observer: {
    icon: '👁️',
    title: 'Pengamat',
    color: 'purple',
    badge: 'bg-purple-800 text-purple-100 border-purple-700',
  },
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
// UTILITY FUNCTIONS
// ============================================
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// ============================================
// CUSTOM HOOKS
// ============================================
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < CONFIG.MOBILE_BREAKPOINT);
    checkMobile();
    const debouncedResize = debounce(checkMobile, CONFIG.DEBOUNCE_DELAY);
    window.addEventListener('resize', debouncedResize);
    return () => window.removeEventListener('resize', debouncedResize);
  }, []);

  return isMobile;
};

const useTouchOptimized = () => {
  useEffect(() => {
    document.body.style.overscrollBehavior = 'contain';
    (document.body.style as any)['-webkit-tap-highlight-color'] = 'transparent';

    let lastTouchEnd = 0;
    const preventZoom = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener('touchend', preventZoom, { passive: false });

    return () => {
      document.body.style.overscrollBehavior = 'auto';
      document.removeEventListener('touchend', preventZoom);
    };
  }, []);
};

const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const crystalRefs = useRef<(HTMLElement | null)[]>([]);
  const runeRefs = useRef<(HTMLElement | null)[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Torch flicker animation
    intervalRef.current = setInterval(() => {
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

    // Crystal glow animation
    crystalRefs.current.forEach((crystal, index) => {
      if (crystal) {
        gsap.to(crystal, {
          boxShadow: '0 0 28px rgba(180,83,9,0.8), 0 0 60px rgba(251,191,36,0.45)',
          duration: CONFIG.CRYSTAL_GLOW_DURATION / 1000,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: index * 0.3,
        });
      }
    });

    // Rune float animation
    runeRefs.current.forEach((rune, index) => {
      if (rune) {
        gsap.to(rune, {
          y: -6,
          duration: CONFIG.RUNE_FLOAT_DURATION / 1000,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: index * 0.2,
        });
      }
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const setTorchRef = useCallback(
    (index: number) => (el: HTMLSpanElement | null) => {
      torchRefs.current[index] = el;
    },
    []
  );

  const setCrystalRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      crystalRefs.current[index] = el;
    },
    []
  );

  const setRuneRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      runeRefs.current[index] = el;
    },
    []
  );

  return { setTorchRef, setCrystalRef, setRuneRef };
};

// ============================================
// ANIMATION VARIANTS
// ============================================
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.08 },
  },
};

// ============================================
// LOADING SKELETON COMPONENT
// ============================================
const LoadingSkeleton = memo(() => {
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

  return (
    <div ref={skeletonRef} className="space-y-4 sm:space-y-6">
      <Card className="border-2 sm:border-4 border-amber-600 bg-gradient-to-br from-amber-900/30 to-stone-900">
        <CardContent className="p-4 sm:p-6 md:p-8 space-y-4">
          <div className="skeleton-pulse h-16 bg-stone-700 rounded-lg w-3/4 mx-auto" />
          <div className="skeleton-pulse h-8 bg-stone-700 rounded-lg w-1/2 mx-auto" />
        </CardContent>
      </Card>
    </div>
  );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const LoadingCard = memo(() => {
  const { setRuneRef } = useDungeonAtmosphere();

  return (
    <motion.div variants={scaleIn} initial="initial" animate="animate">
      <Card className="border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-stone-800 dungeon-card-glow">
        <CardContent className="p-8 sm:p-10 text-center">
          <motion.div
            ref={setRuneRef(0)}
            className="text-5xl sm:text-6xl mb-4 sm:mb-6 dungeon-icon-glow"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            aria-hidden="true"
          >
            🕯️
          </motion.div>
          <h3 className="text-xl sm:text-2xl font-bold text-amber-300 mb-2 dungeon-glow-text">Menyiapkan Arena Dungeon</h3>
          <p className="text-stone-300 text-sm sm:text-base">Mohon tunggu, lantai-lantai ujian sedang dibangunkan...</p>
        </CardContent>
      </Card>
    </motion.div>
  );
});

LoadingCard.displayName = 'LoadingCard';

const ErrorCard = memo(({ error, onRetry }: { error: string; onRetry: () => void }) => {
  const { setTorchRef } = useDungeonAtmosphere();

  return (
    <motion.div variants={scaleIn} initial="initial" animate="animate">
      <Card className="border-4 border-red-700 bg-gradient-to-b from-stone-900 to-red-950 dungeon-card-glow-red">
        <CardContent className="p-8 sm:p-10 text-center">
          <motion.div
            ref={setTorchRef(0)}
            className="text-5xl sm:text-6xl mb-4 sm:mb-6"
            animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            aria-hidden="true"
          >
            ⚠️
          </motion.div>
          <h3 className="text-2xl sm:text-3xl font-bold text-red-200 mb-3 dungeon-glow-text">Ritual Terputus</h3>
          <p className="text-red-200/90 mb-6 text-sm sm:text-base">{error || 'Gagal memuat data permainan'}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={onRetry}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-bold dungeon-button-glow touch-manipulation"
              >
                Coba Muat Ulang
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => router.visit('/game', { preserveState: false })}
                variant="outline"
                className="w-full sm:w-auto border-stone-600 text-stone-200 hover:bg-stone-800/60 touch-manipulation"
              >
                Kembali ke Lobi
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

ErrorCard.displayName = 'ErrorCard';

const SessionHeader = memo(
  ({
    session,
    currentRole,
    participants,
    showVoiceChat,
    isMobile,
  }: {
    session: any;
    currentRole: string;
    participants: any[];
    showVoiceChat: boolean;
    isMobile: boolean;
  }) => {
    const { setTorchRef } = useDungeonAtmosphere();
    const statusConfig = STATUS_CONFIG[session.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.waiting;
    const roleConfig = ROLE_CONFIG[currentRole as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.observer;

    return (
      <motion.div variants={fadeInUp}>
        <Card
          className={`border-2 sm:border-4 ${statusConfig.borderColor} bg-gradient-to-r ${statusConfig.bgGradient} relative overflow-hidden dungeon-card-glow`}
        >
          <CardHeader className="relative">
            <div className="absolute top-3 left-3 text-xl sm:text-2xl">
              <span ref={setTorchRef(0)} className="dungeon-torch-flicker">
                🔥
              </span>
            </div>
            <div className="absolute top-3 right-3 text-xl sm:text-2xl">
              <span ref={setTorchRef(1)} className="dungeon-torch-flicker">
                🔥
              </span>
            </div>
            <CardTitle className="text-amber-300 text-lg sm:text-2xl md:text-3xl text-center sm:text-left dungeon-glow-text">
              Sesi: {session.team_code}
            </CardTitle>
            <CardDescription className="text-stone-300 text-center sm:text-left text-xs sm:text-sm">
              Status: <span className={`font-semibold ${statusConfig.color}`}>{String(session.status).toUpperCase()}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 sm:pb-6">
            <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
              <Badge className={`${roleConfig.badge} font-bold text-xs sm:text-sm`}>
                <span className="mr-1" aria-hidden="true">
                  {roleConfig.icon}
                </span>
                {isMobile ? roleConfig.title.split(' ')[0] : `Peran: ${roleConfig.title}`}
              </Badge>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-xl sm:text-2xl font-bold text-indigo-200">
                {participants.length}/{CONFIG.MAX_PARTICIPANTS}
              </div>
              <div className="text-xs sm:text-sm text-stone-300">Pemain Siap</div>
              {showVoiceChat && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center sm:justify-end mt-1"
                >
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse dungeon-pulse" />
                  <span className="text-xs text-emerald-300">Voice Chat Aktif</span>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
);

SessionHeader.displayName = 'SessionHeader';

const ParticipantCard = memo(
  ({ participant, currentRole, isCurrentUser }: { participant: any; currentRole: string; isCurrentUser: boolean }) => {
    const roleConfig = ROLE_CONFIG[participant.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.observer;

    return (
      <motion.div variants={fadeInUp} whileHover={{ scale: 1.02, x: 5 }} whileTap={{ scale: 0.98 }}>
        <div
          className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border transition-all duration-300 ${
            isCurrentUser
              ? 'bg-emerald-900/40 border-emerald-600 dungeon-card-glow-green'
              : 'bg-stone-900/60 border-stone-700 hover:border-amber-700'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <motion.div
              className={`w-3 sm:w-3.5 h-3 sm:h-3.5 rounded-full bg-${roleConfig.color}-500 flex-shrink-0`}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div className="min-w-0 flex-1">
              <span className="font-medium text-stone-200 text-sm sm:text-base truncate block">
                {participant.nickname}
                {isCurrentUser && <span className="text-emerald-300 text-xs ml-2">(Anda)</span>}
              </span>
              <div className="text-xs sm:text-sm text-stone-400">
                <span className="mr-1" aria-hidden="true">
                  {roleConfig.icon}
                </span>
                {roleConfig.title}
              </div>
            </div>
          </div>
          {participant.role === currentRole && (
            <Badge className="bg-emerald-800 text-emerald-100 border-emerald-700 text-xs flex-shrink-0 ml-2">Aktif</Badge>
          )}
        </div>
      </motion.div>
    );
  }
);

ParticipantCard.displayName = 'ParticipantCard';

// ============================================
// MAIN COMPONENT
// ============================================
export default function GameSession({ sessionId, role: propRole }: Props) {
  const { auth } = usePage().props as any;
  const isMobile = useIsMobile();
  useTouchOptimized();
  const { setTorchRef, setCrystalRef, setRuneRef } = useDungeonAtmosphere();

  // State Management
  const [gameState, setGameState] = useState<MultiStageGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showTransition, setShowTransition] = useState(false);
  const [stageResult, setStageResult] = useState<StageResult | null>(null);
  const [showVoiceChat, setShowVoiceChat] = useState(!isMobile);
  const [isVoiceChatCollapsed, setIsVoiceChatCollapsed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // MEMOIZED VALUES
  // ============================================
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

  const currentRole = useMemo(() => getCurrentRole(), [getCurrentRole]);

  const participants = useMemo(() => gameState?.session?.participants || [], [gameState?.session?.participants]);

  const isValidSessionId = useMemo(() => sessionId && !isNaN(Number(sessionId)), [sessionId]);

  // ============================================
  // CALLBACKS
  // ============================================
  const loadGameState = useCallback(async () => {
    if (!isValidSessionId) {
      setError('ID sesi tidak valid');
      setLoading(false);
      return;
    }

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
        setRetryCount(0);
      } else {
        setError('Data sesi tidak valid');
      }
    } catch (err: any) {
      console.error('❌ Gagal memuat game state:', err);

      let errorMessage = 'Gagal memuat data permainan';

      if (err.response?.status === 404) {
        errorMessage = 'Sesi tidak ditemukan atau sudah berakhir';
      } else if (err.response?.status === 403) {
        errorMessage = 'Akses ditolak. Anda tidak memiliki izin untuk sesi ini';
      } else if (err.response?.status === 429) {
        errorMessage = 'Terlalu banyak permintaan. Mohon tunggu sebentar.';
      } else if (err.response?.status === 503) {
        errorMessage = 'Server sedang sibuk. Silakan coba lagi nanti.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      // Auto-retry dengan exponential backoff
      if (retryCount < CONFIG.MAX_RETRY_ATTEMPTS && ![404, 403].includes(err.response?.status)) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          loadGameState();
        }, delay);
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, retryCount, isValidSessionId]);

  const handleStartSession = useCallback(async () => {
    try {
      await gameApi.startSession(sessionId);
      toast.success('Sesi dimulai!');
      setTimeout(loadGameState, 1000);
    } catch (err: any) {
      console.error('❌ Gagal memulai sesi:', err);
      const errorMessage = err?.response?.data?.message || 'Gagal memulai sesi';
      toast.error(errorMessage);
      setError(errorMessage);
    }
  }, [sessionId, loadGameState]);

  const handleAttemptSubmit = useCallback(
    async (inputValue: string) => {
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
        console.error('❌ Gagal mengirim percobaan:', err);
        const errorMessage =
          err.response?.status === 429
            ? 'Terlalu banyak permintaan. Mohon tunggu sebentar.'
            : err?.response?.data?.message || 'Gagal mengirim percobaan';
        toast.error(errorMessage);
        setError(errorMessage);
      }
    },
    [gameState, loadGameState]
  );

  const handleGameStateUpdate = useCallback((updatedState: GameState) => {
    const convertedState: MultiStageGameState = {
      session: updatedState.session,
      puzzle: updatedState.puzzle,
      stage: updatedState.stage as any,
      serverTime: updatedState.serverTime,
    };
    setGameState(convertedState);
  }, []);

  const handleRetry = useCallback(() => {
    setError('');
    setLoading(true);
    setRetryCount(0);
    loadGameState();
  }, [loadGameState]);

  const handleToggleVoiceChat = useCallback(() => {
    setShowVoiceChat((prev) => !prev);
  }, []);

  const handleToggleVoiceChatCollapse = useCallback(() => {
    setIsVoiceChatCollapsed((prev) => !prev);
  }, []);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (!isValidSessionId) {
      setError('ID sesi diperlukan');
      setLoading(false);
      return;
    }

    loadGameState();
    pollingRef.current = setInterval(loadGameState, CONFIG.POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [loadGameState, isValidSessionId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showVoiceChat && isMobile) {
        handleToggleVoiceChat();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showVoiceChat, isMobile, handleToggleVoiceChat]);

  // ============================================
  // RENDER CONDITIONS
  // ============================================
  if (!isValidSessionId) {
    return (
      <Authenticated>
        <Head title="Kesalahan" />
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-8 sm:py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <ErrorCard error="ID sesi tidak valid" onRetry={handleRetry} />
          </div>
        </div>
      </Authenticated>
    );
  }

  // Loading State
  if (loading) {
    return (
      <Authenticated>
        <Head title="Memuat Tantangan Multi-Tahap..." />
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-8 sm:py-12 px-4 flex items-center justify-center">
          <div className="max-w-4xl w-full">
            <LoadingCard />
            {retryCount > 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-amber-300 text-sm text-center mt-4">
                Percobaan ulang {retryCount}/{CONFIG.MAX_RETRY_ATTEMPTS}...
              </motion.p>
            )}
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
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-8 sm:py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <ErrorCard error={error} onRetry={handleRetry} />
          </div>
        </div>
      </Authenticated>
    );
  }

  const { session, puzzle, stage } = gameState;

  // Transition State
  if (showTransition && stageResult) {
    return (
      <Authenticated>
        <Head title="Peralihan Tahap" />
        <StageTransition result={stageResult} currentStage={stage?.current} totalStages={stage?.total} />
      </Authenticated>
    );
  }

  // ============================================
  // RENDER FUNCTIONS
  // ============================================
  const renderWaiting = () => (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid lg:grid-cols-4 gap-4 sm:gap-6">
      <div className="lg:col-span-3">
        <motion.div variants={fadeInUp}>
          <Card className="border-2 sm:border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-stone-800 dungeon-card-glow">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <div className="text-center">
                <motion.div
                  ref={setRuneRef(0)}
                  className="text-5xl sm:text-6xl mb-4 dungeon-icon-glow mx-auto inline-block"
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  aria-hidden="true"
                >
                  🗝️
                </motion.div>
                <h2 className="text-xl sm:text-2xl font-semibold text-amber-300 mb-4 dungeon-glow-text">Persiapan Ujian Multi-Tahap</h2>
                {participants.length < CONFIG.MAX_PARTICIPANTS ? (
                  <motion.div variants={fadeInUp}>
                    <p className="text-stone-300 mb-6 sm:mb-8 text-sm sm:text-base md:text-lg">
                      Menunggu rekan seperjuangan bergabung... ({participants.length}/{CONFIG.MAX_PARTICIPANTS})
                    </p>
                    <Card className="max-w-md mx-auto border-2 border-blue-700 bg-gradient-to-b from-stone-900 to-blue-950 dungeon-card-glow-blue">
                      <CardContent className="p-4 sm:p-6">
                        <p className="text-blue-200 font-medium mb-3 text-sm sm:text-base">Ajak teman untuk menembus dungeon ini!</p>
                        <div className="rounded-xl p-3 border border-blue-700 bg-stone-950 text-center">
                          <p className="text-xs sm:text-sm text-blue-300 mb-1">Kode guild:</p>
                          <p className="font-mono font-bold text-base sm:text-lg text-blue-200">{session.team_code}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div variants={fadeInUp}>
                    <p className="text-stone-300 mb-6 sm:mb-8 text-sm sm:text-base md:text-lg">
                      Tim lengkap! Saatnya memulai ujian 3 tahap. ({participants.length}/{CONFIG.MAX_PARTICIPANTS})
                    </p>
                    <Card className="max-w-2xl mx-auto mb-6 border-2 border-emerald-700 bg-gradient-to-b from-stone-900 to-emerald-950 dungeon-card-glow-green">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-emerald-300 dungeon-glow-text text-base sm:text-lg">Gambaran Misi</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                        {[
                          { stage: 1, title: 'Analisis Pola' },
                          { stage: 2, title: 'Analisis Kode' },
                          { stage: 3, title: 'Navigasi Pohon' },
                        ].map(({ stage, title }) => (
                          <motion.div key={stage} variants={fadeInUp} className="text-center">
                            <motion.div
                              ref={setCrystalRef(stage - 1)}
                              className="bg-emerald-900/40 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mx-auto mb-2 border border-emerald-700 dungeon-crystal-glow"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <span className="font-bold text-emerald-300">{stage}</span>
                            </motion.div>
                            <p className="font-medium text-emerald-200">{title}</p>
                          </motion.div>
                        ))}
                      </CardContent>
                    </Card>
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={handleStartSession}
                        className="bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-bold py-3 sm:py-4 px-6 sm:px-8 md:px-12 text-sm sm:text-base md:text-lg dungeon-button-glow touch-manipulation"
                      >
                        <span className="mr-2" aria-hidden="true">
                          ⚔️
                        </span>
                        Mulai Ujian Multi-Tahap
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Sidebar Voice Chat */}
      {!isMobile && (
        <AnimatePresence>
          {showVoiceChat && (
            <motion.div
              className="lg:col-span-1"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="space-y-4 sticky top-4">
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
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );

  const renderRunning = () => (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4 sm:space-y-6">
      {stage && (
        <motion.div variants={fadeInUp}>
          <StageProgress
            current={stage.current || 1}
            total={stage.total || 3}
            completed={stage.progress?.completed || []}
            totalScore={stage.progress?.totalScore || 0}
          />
        </motion.div>
      )}

      <motion.div variants={fadeInUp}>
        <Card className="border-2 sm:border-4 border-amber-700 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 dungeon-card-glow">
          <CardContent className="p-4 sm:p-6 text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-300 mb-3 dungeon-glow-text">
              {stage?.config?.title || puzzle?.title || 'Tahap Saat Ini'}
            </h1>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm text-stone-200">
              <span className="flex items-center">
                <span className="mr-1 sm:mr-2" aria-hidden="true">
                  ⏱️
                </span>
                Batas: {Math.floor((stage?.config?.timeLimit || 0) / 60)}m
              </span>
              <span className="flex items-center">
                <span className="mr-1 sm:mr-2" aria-hidden="true">
                  🎯
                </span>
                Max: {stage?.config?.maxAttempts || 'N/A'}
              </span>
              <span className="flex items-center">
                <span className="mr-1 sm:mr-2" aria-hidden="true">
                  📊
                </span>
                Tahap: {stage?.current || 1}/{stage?.total || 3}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-4 gap-4 sm:gap-6">
        <motion.div
          variants={fadeInUp}
          className={`transition-all duration-300 ${showVoiceChat && !isVoiceChatCollapsed && !isMobile ? 'lg:col-span-3' : 'lg:col-span-4'}`}
        >
          <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <GamePlay
                gameState={gameState as GameState}
                role={['defuser', 'expert', 'host'].includes(currentRole) ? (currentRole as 'defuser' | 'expert' | 'host') : undefined}
                onGameStateUpdate={handleGameStateUpdate}
                onSubmitAttempt={handleAttemptSubmit}
              />
            </CardContent>
          </Card>
        </motion.div>

        <AnimatePresence>
          {showVoiceChat && !isVoiceChatCollapsed && !isMobile && (
            <motion.div
              className="lg:col-span-1"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Voice Chat FAB */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        {!showVoiceChat && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9 }}>
            <Button
              onClick={handleToggleVoiceChat}
              className="bg-indigo-700 hover:bg-indigo-600 rounded-full p-3 shadow-lg dungeon-button-glow touch-manipulation"
              title="Tampilkan Voice Chat"
              aria-label="Tampilkan Voice Chat"
            >
              <span className="text-xl" aria-hidden="true">
                🎙️
              </span>
            </Button>
          </motion.div>
        )}
        {showVoiceChat && !isMobile && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9 }}>
            <Button
              onClick={handleToggleVoiceChatCollapse}
              variant="outline"
              className="border-stone-600 text-stone-200 hover:bg-stone-800/60 rounded-full p-2 shadow-lg touch-manipulation"
              title={isVoiceChatCollapsed ? 'Perluas Voice Chat' : 'Ciutkan Voice Chat'}
              aria-label={isVoiceChatCollapsed ? 'Perluas Voice Chat' : 'Ciutkan Voice Chat'}
            >
              <span className="text-base" aria-hidden="true">
                {isVoiceChatCollapsed ? '📱' : '📵'}
              </span>
            </Button>
          </motion.div>
        )}
        {showVoiceChat && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9 }}>
            <Button
              onClick={handleToggleVoiceChat}
              className="bg-red-700 hover:bg-red-600 rounded-full p-2 shadow-lg touch-manipulation"
              title="Sembunyikan Voice Chat"
              aria-label="Sembunyikan Voice Chat"
            >
              <span className="text-base" aria-hidden="true">
                ✕
              </span>
            </Button>
          </motion.div>
        )}
      </div>

      {/* Mobile Voice Chat Modal */}
      <AnimatePresence>
        {showVoiceChat && isMobile && (
          <motion.div className="fixed inset-0 z-50 bg-stone-900" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-xl font-bold text-green-300 flex items-center gap-2 dungeon-glow-text">
                  <span aria-hidden="true">🎙️</span>
                  Voice Chat
                </h3>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleToggleVoiceChat}
                  className="bg-red-600/30 hover:bg-red-600/50 text-red-300 px-4 py-2 rounded-lg touch-manipulation font-semibold"
                  aria-label="Tutup voice chat"
                >
                  ✕ Tutup
                </motion.button>
              </div>
              <div className="flex-1 overflow-auto p-4">
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderSuccess = () => (
    <motion.div variants={scaleIn} initial="initial" animate="animate" className="py-4 sm:py-6">
      <Card className="border-2 sm:border-4 border-emerald-700 bg-gradient-to-b from-stone-900 to-emerald-950 dungeon-card-glow-green">
        <CardContent className="p-6 sm:p-8 text-center">
          <motion.div
            ref={setRuneRef(1)}
            className="text-5xl sm:text-6xl mb-4 dungeon-icon-glow mx-auto inline-block"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 360, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            aria-hidden="true"
          >
            🎉
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold text-emerald-200 mb-4 dungeon-glow-text">Misi Tuntas!</h2>
          <p className="text-emerald-100 mb-6 text-sm sm:text-base md:text-lg">Selamat, seluruh tahap berhasil dilalui dengan gemilang.</p>
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
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-emerald-200 mb-3">Hasil Akhir</h3>
              <div className="grid grid-cols-2 gap-4 text-emerald-100">
                <div>
                  <div className="text-xl sm:text-2xl font-bold">{stage?.progress?.totalScore || 0}</div>
                  <div className="text-xs sm:text-sm opacity-80">Skor Total</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold">
                    {stage?.progress?.completed?.length || 0}/{stage?.total || 3}
                  </div>
                  <div className="text-xs sm:text-sm opacity-80">Tahap Tuntas</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => router.visit('/game', { preserveState: false })}
                className="w-full sm:w-auto bg-indigo-700 hover:bg-indigo-600 touch-manipulation"
              >
                Main Lagi
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => router.visit('/dashboard', { preserveState: false })}
                variant="outline"
                className="w-full sm:w-auto border-stone-600 text-stone-200 hover:bg-stone-800/60 touch-manipulation"
              >
                Kembali ke Dasbor
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderFailed = () => (
    <motion.div variants={scaleIn} initial="initial" animate="animate" className="py-4 sm:py-6">
      <Card className="border-2 sm:border-4 border-red-700 bg-gradient-to-b from-stone-900 to-red-950 dungeon-card-glow-red">
        <CardContent className="p-6 sm:p-8 text-center">
          <motion.div
            ref={setTorchRef(2)}
            className="text-5xl sm:text-6xl mb-4 mx-auto inline-block"
            animate={{ scale: [1, 1.1, 1], rotate: [0, -10, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            aria-hidden="true"
          >
            💥
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold text-red-200 mb-4 dungeon-glow-text">Misi Gagal</h2>
          <p className="text-red-100 mb-6 text-sm sm:text-base md:text-lg">Cobaan tak terselesaikan dalam syarat yang ditetapkan.</p>
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
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-red-200 mb-3">Jejak Pencapaian</h3>
              <div className="grid grid-cols-2 gap-4 text-red-100">
                <div>
                  <div className="text-xl sm:text-2xl font-bold">{stage?.progress?.totalScore || 0}</div>
                  <div className="text-xs sm:text-sm opacity-80">Skor Terkumpul</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold">
                    {stage?.progress?.completed?.length || 0}/{stage?.total || 3}
                  </div>
                  <div className="text-xs sm:text-sm opacity-80">Tahap Tuntas</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => router.visit('/game', { preserveState: false })}
                className="w-full sm:w-auto bg-indigo-700 hover:bg-indigo-600 touch-manipulation"
              >
                Coba Lagi
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => router.visit('/dashboard', { preserveState: false })}
                variant="outline"
                className="w-full sm:w-auto border-stone-600 text-stone-200 hover:bg-stone-800/60 touch-manipulation"
              >
                Kembali ke Dasbor
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderPaused = () => (
    <motion.div variants={scaleIn} initial="initial" animate="animate">
      <Card className="border-2 sm:border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-amber-950 dungeon-card-glow">
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="text-4xl sm:text-5xl mb-4" aria-hidden="true">
            ⏸️
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-amber-300 mb-4 dungeon-glow-text">Permainan Dijeda</h2>
          <p className="text-stone-300 mb-6 text-sm sm:text-base">Sesi dijeda sementara, tunggu hingga dilanjutkan kembali.</p>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button onClick={() => window.location.reload()} className="bg-amber-700 hover:bg-amber-600 touch-manipulation">
              Segarkan Status
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderEnded = () => (
    <motion.div variants={scaleIn} initial="initial" animate="animate">
      <Card className="border-2 sm:border-4 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="text-4xl sm:text-5xl mb-4" aria-hidden="true">
            🏁
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-200 mb-4 dungeon-glow-text">Sesi Berakhir</h2>
          <p className="text-stone-300 mb-6 text-sm sm:text-base">Terima kasih telah berpartisipasi di ujian dungeon ini.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => router.visit('/game', { preserveState: false })}
                className="w-full sm:w-auto bg-indigo-700 hover:bg-indigo-600 touch-manipulation"
              >
                Ujian Baru
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => router.visit('/dashboard', { preserveState: false })}
                variant="outline"
                className="w-full sm:w-auto border-stone-600 text-stone-200 hover:bg-stone-800/60 touch-manipulation"
              >
                Dasbor
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderUnknown = () => (
    <motion.div variants={scaleIn} initial="initial" animate="animate">
      <Card className="border-2 sm:border-4 border-red-700 bg-gradient-to-b from-stone-900 to-red-950 dungeon-card-glow-red">
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="text-4xl sm:text-5xl mb-4" aria-hidden="true">
            ❓
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-red-200 mb-4 dungeon-glow-text">Status Tidak Dikenal</h2>
          <p className="text-red-100 mb-6 text-sm sm:text-base">
            Status: <code className="bg-red-900/40 px-2 py-1 rounded border border-red-700 text-xs sm:text-sm">{session.status}</code>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button onClick={() => window.location.reload()} className="w-full sm:w-auto bg-red-700 hover:bg-red-600 touch-manipulation">
                Muat Ulang
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => router.visit('/game', { preserveState: false })}
                variant="outline"
                className="w-full sm:w-auto border-stone-600 text-stone-200 hover:bg-stone-800/60 touch-manipulation"
              >
                Kembali ke Lobi
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
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
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-4 sm:py-6 md:py-8 pb-20 sm:pb-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6">
          {/* Header Sesi */}
          <SessionHeader session={session} currentRole={currentRole} participants={participants} showVoiceChat={showVoiceChat} isMobile={isMobile} />

          {/* Konten utama */}
          {renderGameContent()}

          {/* Daftar peserta */}
          {!['success', 'failed', 'ended'].includes(session.status) && (
            <motion.div variants={fadeInUp}>
              <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
                <CardHeader>
                  <CardTitle className="text-stone-200 text-sm sm:text-base md:text-lg flex items-center gap-2">
                    <span aria-hidden="true">👥</span> Anggota Tim ({participants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {participants.map((participant: any, index: number) => (
                      <ParticipantCard
                        key={participant.id || index}
                        participant={participant}
                        currentRole={currentRole}
                        isCurrentUser={participant.user_id === auth?.user?.id}
                      />
                    ))}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Styles */}
      <style>{`
        /* Icon Glow */
        .dungeon-icon-glow {
          filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.5))
                  drop-shadow(0 0 12px rgba(251, 191, 36, 0.3));
        }

        /* Torch Flicker */
        .dungeon-torch-flicker {
          display: inline-block;
        }

        /* Crystal Glow */
        .dungeon-crystal-glow {
          box-shadow: 0 0 20px rgba(180,83,9,0.6), 0 0 40px rgba(251,191,36,0.25);
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

        /* Loading skeleton pulse */
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

        /* Focus styles */
        *:focus-visible {
          outline: 2px solid rgba(251, 191, 36, 0.8);
          outline-offset: 2px;
        }

        /* Touch optimization */
        .touch-manipulation {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
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
