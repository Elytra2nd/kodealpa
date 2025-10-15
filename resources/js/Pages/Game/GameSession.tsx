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
  TAB_CLOSE_DETECTION_DELAY: 300,
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
      title: string;
      timeLimit: number;
      maxAttempts: number;
      maxHints?: number;
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
      learningObjectives?: string[];
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

    const copyTeamCode = useCallback(() => {
      navigator.clipboard.writeText(session.team_code);
      toast.success('Kode tim berhasil disalin! 📋');
    }, [session.team_code]);

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

            <div className="text-center sm:text-left space-y-2 pt-8 sm:pt-0">
              <CardTitle className="text-amber-300 text-lg sm:text-2xl md:text-3xl dungeon-glow-text">
                🎮 Game Session
              </CardTitle>

              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 bg-stone-900/60 p-3 sm:p-4 rounded-lg border-2 border-amber-600 dungeon-crystal-glow">
                <div className="flex-1 text-center sm:text-left">
                  <div className="text-xs sm:text-sm text-stone-400 mb-1">Kode Tim:</div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-300 font-mono tracking-wider dungeon-glow-text">
                    {session.team_code}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={copyTeamCode}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold rounded-lg transition-all duration-200 flex items-center gap-2 touch-manipulation"
                  title="Salin Kode Tim"
                  type="button"
                >
                  <span>📋</span>
                  <span className="text-sm">Salin</span>
                </motion.button>
              </div>
            </div>

            <CardDescription className="text-stone-300 text-center sm:text-left text-xs sm:text-sm mt-2">
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
  const [retryCount, setRetryCount] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Finalization state
  const [isFinalized, setIsFinalized] = useState(false);
  const finalizeRef = useRef(false);

  // ============================================
  // MEMOIZED VALUES WITH SESSIONSTORAGE
  // ============================================
  const getCurrentRole = useCallback((): 'defuser' | 'expert' | 'host' | 'observer' => {
    const storageKey = `game_role_${sessionId}`;
    const storedRole = sessionStorage.getItem(storageKey);

    if (storedRole && ['defuser', 'expert', 'host'].includes(storedRole)) {
      console.log('✅ Role restored from sessionStorage:', storedRole);
      return storedRole as 'defuser' | 'expert' | 'host';
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlRole = urlParams.get('role');
    if (urlRole && ['defuser', 'expert', 'host'].includes(urlRole)) {
      sessionStorage.setItem(storageKey, urlRole);
      return urlRole as 'defuser' | 'expert' | 'host';
    }
    if (propRole && ['defuser', 'expert', 'host'].includes(propRole)) {
      sessionStorage.setItem(storageKey, propRole);
      return propRole;
    }
    const participants = gameState?.session?.participants || [];
    const userParticipant = participants.find((p) => p.user_id === auth?.user?.id);
    if (userParticipant?.role) {
      sessionStorage.setItem(storageKey, userParticipant.role);
      return userParticipant.role as 'defuser' | 'expert' | 'host';
    }
    return 'observer';
  }, [auth?.user?.id, gameState?.session?.participants, propRole, sessionId]);

  const currentRole = useMemo(() => getCurrentRole(), [getCurrentRole]);
  const participants = useMemo(() => gameState?.session?.participants || [], [gameState?.session?.participants]);
  const isValidSessionId = useMemo(() => sessionId && !isNaN(Number(sessionId)), [sessionId]);

  useEffect(() => {
    if (currentRole && currentRole !== 'observer') {
      const storageKey = `game_role_${sessionId}`;
      sessionStorage.setItem(storageKey, currentRole);
      console.log('✅ Role persisted to sessionStorage:', currentRole);
    }
  }, [currentRole, sessionId]);

  // ============================================
  // FINALIZE SESSION FUNCTION
  // ============================================
  const finalizeSession = useCallback(async () => {
    if (finalizeRef.current || !gameState?.session?.id) {
      console.log('⚠️ Finalize skipped - already finalized or no session');
      return;
    }

    finalizeRef.current = true;

    try {
      console.log('🏁 Finalizing session:', gameState.session.id);
      await gameApi.endSession(gameState.session.id);
      setIsFinalized(true);
      console.log('✅ Session finalized and history saved');
      toast.success('Riwayat permainan berhasil disimpan!');

      const storageKey = `game_role_${sessionId}`;
      sessionStorage.removeItem(storageKey);
    } catch (error: any) {
      console.error('❌ Failed to finalize session:', error);

      if (![404, 403].includes(error.response?.status)) {
        toast.error('Gagal menyimpan riwayat. Mencoba lagi...', {
          action: {
            label: 'Coba Lagi',
            onClick: () => {
              finalizeRef.current = false;
              finalizeSession();
            }
          },
          duration: 10000,
        });
      } else {
        setIsFinalized(true);
      }
    }
  }, [gameState?.session?.id, sessionId]);

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
      toast.success('Sesi dimulai! ⚔️');
      setTimeout(loadGameState, 1000);
    } catch (err: any) {
      console.error('❌ Gagal memulai sesi:', err);
      const errorMessage = err?.response?.data?.message || 'Gagal memulai sesi';
      toast.error(errorMessage);
      setError(errorMessage);
    }
  }, [sessionId, loadGameState]);

  // ✅ SOLUTION 1: UPDATED handleAttemptSubmit with Toast Notification
  const handleAttemptSubmit = useCallback(
    async (inputValue: string) => {
      if (!gameState) return;

      try {
        const result = await gameApi.submitAttempt(gameState.session.id, gameState.puzzle.key, inputValue);

        // Check if stage or game complete
        if (result.stageComplete || result.gameComplete) {
          setStageResult(result);
          setShowTransition(true);

          if (result.gameComplete && !isFinalized) {
            console.log('🎮 Game completed, triggering finalization...');
            await finalizeSession();
          }

          setTimeout(() => {
            setShowTransition(false);
            setStageResult(null);
            loadGameState();
          }, CONFIG.TRANSITION_DURATION);
        } else {
          // Update game state with new attempts
          setGameState({
            ...gameState,
            session: {
              ...gameState.session,
              attempts: result.session?.attempts || gameState.session.attempts,
            },
          });

          // ✅ NEW: Show toast feedback for correct/incorrect answer
          const lastAttempt = result.session?.attempts?.[result.session.attempts.length - 1];

          if (lastAttempt) {
            if (lastAttempt.is_correct) {
              // Jawaban benar
              toast.success('✅ Jawaban Benar!', {
                description: 'Percobaan berhasil. Lanjutkan ke tahap selanjutnya!',
                duration: 3000,
              });
            } else {
              // Jawaban salah - hitung sisa percobaan
              const maxAttempts = gameState.stage?.config?.maxAttempts || 10;
              const currentAttempts = gameState.session.attempts.length;
              const attemptsRemaining = result.attemptsRemaining ?? (maxAttempts - currentAttempts);

              if (attemptsRemaining > 0) {
                toast.error('❌ Jawaban Salah!', {
                  description: `Coba lagi! Sisa percobaan: ${attemptsRemaining}`,
                  duration: 4000,
                });
              } else {
                toast.error('💥 Jawaban Salah!', {
                  description: 'Ini percobaan terakhir Anda. Berhati-hatilah!',
                  duration: 5000,
                });
              }
            }
          }
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
    [gameState, loadGameState, finalizeSession, isFinalized]
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

  const getValidRole = useCallback((): 'defuser' | 'expert' | 'host' => {
    return currentRole === 'observer' ? 'host' : currentRole;
  }, [currentRole]);

  const getValidParticipants = useCallback(() => {
    return participants.filter((p): p is typeof p & { user_id: number } =>
      p.user_id !== undefined
    );
  }, [participants]);

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

  // VISIBILITYCHANGE + BEFOREUNLOAD
  useEffect(() => {
    let tabClosing = false;
    let closeTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        tabClosing = true;
        console.log('👁️ Tab hidden - potential close detected');

        closeTimeout = setTimeout(() => {
          tabClosing = false;
          console.log('✅ Tab still alive - was just a refresh or tab switch');
        }, CONFIG.TAB_CLOSE_DETECTION_DELAY);
      } else if (document.visibilityState === 'visible') {
        tabClosing = false;
        if (closeTimeout) {
          clearTimeout(closeTimeout);
          closeTimeout = null;
        }
        console.log('✅ Tab visible again - continuing session');
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (
        gameState?.session?.status === 'running' &&
        !isFinalized &&
        gameState?.session?.id &&
        tabClosing
      ) {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `/api/sessions/${gameState.session.id}/end`, false);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('Accept', 'application/json');

          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
          if (csrfToken) {
            xhr.setRequestHeader('X-CSRF-TOKEN', csrfToken);
          }

          xhr.send();
          console.log('🚪 Session finalized on page close');
        } catch (err) {
          console.error('❌ Failed to finalize on beforeunload:', err);
        }
      }

      if (gameState?.session?.status === 'running') {
        e.preventDefault();
        e.returnValue = 'Permainan sedang berlangsung. Yakin ingin keluar?';
        return e.returnValue;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameState?.session?.status, gameState?.session?.id, isFinalized]);

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
  // RENDER CONDITIONS & FUNCTIONS
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

  if (showTransition && stageResult) {
    return (
      <Authenticated>
        <Head title="Peralihan Tahap" />
        <StageTransition result={stageResult} currentStage={stage?.current} totalStages={stage?.total} />
      </Authenticated>
    );
  }

  const renderWaiting = () => (
    <motion.div variants={scaleIn} initial="initial" animate="animate" className="py-4 sm:py-6">
      <Card className="border-2 sm:border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-amber-950 dungeon-card-glow">
        <CardContent className="p-6 sm:p-8 text-center">
          <motion.div
            ref={setRuneRef(0)}
            className="text-5xl sm:text-6xl mb-4 dungeon-icon-glow mx-auto inline-block"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            aria-hidden="true"
          >
            🎲
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-200 mb-4 dungeon-glow-text">Menunggu Pemain</h2>
          <p className="text-amber-100 mb-6 text-sm sm:text-base md:text-lg">
            {participants.length < CONFIG.MAX_PARTICIPANTS
              ? 'Menunggu pemain lain bergabung...'
              : 'Tim lengkap! Menunggu permainan dimulai...'}
          </p>

          {participants.length < CONFIG.MAX_PARTICIPANTS && (
            <Card className="bg-indigo-900/40 border-2 border-indigo-600 max-w-lg mx-auto mb-6 dungeon-card-glow">
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-indigo-200 mb-3 dungeon-glow-text">
                  📢 Cara Bergabung
                </h3>
                <div className="text-indigo-100 text-sm sm:text-base text-left space-y-2">
                  <p>Bagikan <strong>kode tim</strong> di atas kepada teman Anda:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Buka halaman <strong>Game Lobby</strong></li>
                    <li>Klik tombol <strong>"Gabung Sesi"</strong></li>
                    <li>Masukkan kode tim: <span className="font-mono text-amber-300 font-bold text-lg">{session.team_code}</span></li>
                    <li>Pilih role dan bergabung!</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {currentRole === 'host' && participants.length >= CONFIG.MAX_PARTICIPANTS && (
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleStartSession}
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-900 font-bold dungeon-button-glow touch-manipulation text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4"
              >
                ⚔️ Mulai Tantangan
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderRunning = () => (
    <motion.div variants={scaleIn} initial="initial" animate="animate" className="py-4 sm:py-6">
      <GamePlay
        gameState={{
          session,
          puzzle,
          stage,
          serverTime: gameState.serverTime
        }}
        role={getValidRole()}
        onGameStateUpdate={handleGameStateUpdate}
        onSubmitAttempt={handleAttemptSubmit}
        submitting={false}
      />
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
                onClick={async () => {
                  await finalizeSession();
                  router.visit('/game', { preserveState: false });
                }}
                className="w-full sm:w-auto bg-indigo-700 hover:bg-indigo-600 touch-manipulation"
              >
                🎮 Main Lagi
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={async () => {
                  await finalizeSession();
                  router.visit('/dashboard', { preserveState: false });
                }}
                variant="outline"
                className="w-full sm:w-auto border-stone-600 text-stone-200 hover:bg-stone-800/60 touch-manipulation"
              >
                📊 Lihat Riwayat
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
                onClick={async () => {
                  await finalizeSession();
                  router.visit('/game', { preserveState: false });
                }}
                className="w-full sm:w-auto bg-indigo-700 hover:bg-indigo-600 touch-manipulation"
              >
                🔄 Coba Lagi
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={async () => {
                  await finalizeSession();
                  router.visit('/dashboard', { preserveState: false });
                }}
                variant="outline"
                className="w-full sm:w-auto border-stone-600 text-stone-200 hover:bg-stone-800/60 touch-manipulation"
              >
                📊 Kembali ke Dasbor
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderPaused = () => (
    <motion.div variants={scaleIn} initial="initial" animate="animate" className="py-4 sm:py-6">
      <Card className="border-2 sm:border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-amber-950 dungeon-card-glow">
        <CardContent className="p-6 sm:p-8 text-center">
          <motion.div
            ref={setRuneRef(2)}
            className="text-5xl sm:text-6xl mb-4 mx-auto inline-block"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            aria-hidden="true"
          >
            ⏸️
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-200 mb-4 dungeon-glow-text">Permainan Dijeda</h2>
          <p className="text-amber-100 mb-6 text-sm sm:text-base md:text-lg">
            Sesi sedang dijeda. Menunggu untuk dilanjutkan...
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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

  const renderEnded = () => (
    <motion.div variants={scaleIn} initial="initial" animate="animate" className="py-4 sm:py-6">
      <Card className="border-2 sm:border-4 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 dungeon-card-glow">
        <CardContent className="p-6 sm:p-8 text-center">
          <motion.div
            ref={setRuneRef(3)}
            className="text-5xl sm:text-6xl mb-4 mx-auto inline-block"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            aria-hidden="true"
          >
            🏁
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-200 mb-4 dungeon-glow-text">Sesi Berakhir</h2>
          <p className="text-stone-300 mb-6 text-sm sm:text-base md:text-lg">
            Sesi permainan telah berakhir.
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={async () => {
                  await finalizeSession();
                  router.visit('/game', { preserveState: false });
                }}
                className="w-full sm:w-auto bg-indigo-700 hover:bg-indigo-600 touch-manipulation"
              >
                Mulai Sesi Baru
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={async () => {
                  await finalizeSession();
                  router.visit('/dashboard', { preserveState: false });
                }}
                variant="outline"
                className="w-full sm:w-auto border-stone-600 text-stone-200 hover:bg-stone-800/60 touch-manipulation"
              >
                📊 Kembali ke Dasbor
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderUnknown = () => (
    <motion.div variants={scaleIn} initial="initial" animate="animate" className="py-4 sm:py-6">
      <Card className="border-2 sm:border-4 border-purple-700 bg-gradient-to-b from-stone-900 to-purple-950 dungeon-card-glow">
        <CardContent className="p-6 sm:p-8 text-center">
          <motion.div
            ref={setTorchRef(3)}
            className="text-5xl sm:text-6xl mb-4 mx-auto inline-block"
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            aria-hidden="true"
          >
            ❓
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold text-purple-200 mb-4 dungeon-glow-text">Status Tidak Dikenal</h2>
          <p className="text-purple-100 mb-6 text-sm sm:text-base md:text-lg">
            Status sesi: <span className="font-bold">{session.status}</span>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleRetry}
                className="w-full sm:w-auto bg-purple-700 hover:bg-purple-600 touch-manipulation"
              >
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

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <Authenticated>
      <Head title={`Tantangan Multi-Tahap - ${session.team_code}`} />
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-4 sm:py-6 md:py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-4 sm:space-y-6"
          >
            <SessionHeader
              session={session}
              currentRole={currentRole}
              participants={participants}
              showVoiceChat={showVoiceChat}
              isMobile={isMobile}
            />

            {session.status === 'waiting' && (
              <motion.div variants={fadeInUp}>
                <Card className="border-2 sm:border-4 border-stone-700 bg-gradient-to-br from-stone-900/80 to-stone-800/60">
                  <CardHeader>
                    <CardTitle className="text-amber-300 text-base sm:text-lg md:text-xl dungeon-glow-text">
                      Anggota Tim
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {participants.length === 0 ? (
                      <p className="text-stone-400 text-center py-4 text-sm sm:text-base">Belum ada pemain yang bergabung</p>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {participants.map((participant) => (
                          <ParticipantCard
                            key={participant.id}
                            participant={participant}
                            currentRole={currentRole}
                            isCurrentUser={participant.user_id === auth?.user?.id}
                          />
                        ))}
                      </AnimatePresence>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {renderGameContent()}

            {showVoiceChat && session.status === 'running' && (
              <motion.div
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                className={isMobile ? 'fixed bottom-0 left-0 right-0 z-50' : ''}
              >
                <VoiceChat
                  sessionId={session.id}
                  participants={getValidParticipants()}
                  role={getValidRole()}
                  userId={auth?.user?.id}
                  nickname={auth?.user?.name}
                />
              </motion.div>
            )}

            {isMobile && !showVoiceChat && session.status === 'running' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="fixed bottom-4 right-4 z-40"
              >
                <Button
                  onClick={handleToggleVoiceChat}
                  className="rounded-full w-14 h-14 bg-indigo-700 hover:bg-indigo-600 shadow-lg"
                  aria-label="Toggle Voice Chat"
                >
                  🎙️
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </Authenticated>
  );
}
