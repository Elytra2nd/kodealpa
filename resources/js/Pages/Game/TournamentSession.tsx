import React, { useState, useEffect, useCallback, useMemo, memo, useRef, useReducer } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { gameApi } from '@/services/gameApi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import VoiceChat from '@/Components/Game/VoiceChat';
import GamePlay from '@/Components/Game/GamePlay';
import { toast } from 'sonner';
import { gsap } from 'gsap';

// ============================================
// TYPES & INTERFACES
// ============================================
interface Props {
  tournamentId: number;
  groupId?: number;
}

interface TournamentSessionData {
  tournament: {
    id: number;
    name: string;
    status: string;
    current_round: number;
  };
  group: {
    id: number;
    name: string;
    status: string;
    completion_time?: number;
    rank?: number;
    participants: Array<{
      id: number;
      user_id: number;
      nickname: string;
      role: 'defuser' | 'expert';
    }>;
  };
  session: {
    id: number;
    team_code: string;
    status: string;
    participants: any[];
    attempts: any[];
  } | null;
  gameState: any;
  leaderboard: Array<{
    id: number;
    name: string;
    status: string;
    completion_time?: number;
    rank?: number;
    score: number;
    participants: Array<{
      nickname: string;
      role: string;
    }>;
  }>;
}

interface TournamentSessionResponse {
  success?: boolean;
  tournament?: any;
  group?: any;
  session?: any;
  gameState?: any;
  leaderboard?: any[];
}

type SessionAction =
  | { type: 'SET_DATA'; payload: TournamentSessionData }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'UPDATE_GAME_STATE'; payload: any }
  | { type: 'INCREMENT_RETRY' }
  | { type: 'RESET_RETRY' }
  | { type: 'RESET_ERROR' };

interface SessionState {
  tournamentData: TournamentSessionData | null;
  loading: boolean;
  error: string;
  retryCount: number;
}

const sessionReducer = (state: SessionState, action: SessionAction): SessionState => {
  switch (action.type) {
    case 'SET_DATA':
      return {
        ...state,
        tournamentData: action.payload,
        loading: false,
        error: '',
        retryCount: 0,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'UPDATE_GAME_STATE':
      return state.tournamentData
        ? { ...state, tournamentData: { ...state.tournamentData, gameState: action.payload } }
        : state;
    case 'INCREMENT_RETRY':
      return { ...state, retryCount: state.retryCount + 1 };
    case 'RESET_RETRY':
      return { ...state, retryCount: 0 };
    case 'RESET_ERROR':
      return { ...state, error: '' };
    default:
      return state;
  }
};

// ============================================
// CONSTANTS
// ============================================
const CONFIG = {
  POLLING_INTERVAL: 5000,
  MAX_RETRY_ATTEMPTS: 3,
  MOBILE_BREAKPOINT: 768,
  DEBOUNCE_DELAY: 300,
  ERROR_DISPLAY_DURATION: 5000,
  REQUEST_TIMEOUT: 30000,
} as const;

const STATUS_CONFIG = {
  waiting: { color: 'bg-gradient-to-r from-gray-600 to-gray-700', text: 'Menunggu', icon: '⏳', glow: false },
  ready: { color: 'bg-gradient-to-r from-blue-600 to-cyan-600', text: 'Siap', icon: '✅', glow: false },
  playing: { color: 'bg-gradient-to-r from-yellow-600 to-amber-600', text: 'Bermain', icon: '⚔️', glow: true },
  completed: { color: 'bg-gradient-to-r from-green-600 to-emerald-600', text: 'Selesai', icon: '🏁', glow: false },
  eliminated: { color: 'bg-gradient-to-r from-red-600 to-rose-600', text: 'Tersingkir', icon: '❌', glow: true },
  champion: { color: 'bg-gradient-to-r from-yellow-500 to-amber-500', text: 'Juara', icon: '👑', glow: true },
} as const;

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

const formatTime = (seconds?: number): string => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

// ============================================
// CUSTOM HOOKS
// ============================================
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= CONFIG.MOBILE_BREAKPOINT);
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

// ============================================
// MAIN COMPONENT
// ============================================
export default function TournamentSession({ tournamentId, groupId }: Props) {
  const { auth } = usePage().props as any;
  const isMobile = useIsMobile();
  useTouchOptimized();

  const [state, dispatch] = useReducer(sessionReducer, {
    tournamentData: null,
    loading: true,
    error: '',
    retryCount: 0,
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const isPollingPausedRef = useRef(false);
  const lastSubmitTimeRef = useRef<number>(0);

  const isValidTournamentId = useMemo(
    () => tournamentId && !isNaN(Number(tournamentId)),
    [tournamentId]
  );

  const pausePolling = useCallback(() => {
    isPollingPausedRef.current = true;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const resumePolling = useCallback(() => {
    isPollingPausedRef.current = false;
    if (!pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(() => {
        if (!isPollingPausedRef.current) {
          loadTournamentSession();
        }
      }, CONFIG.POLLING_INTERVAL);
    }
  }, []);

  const loadTournamentSession = useCallback(async () => {
    if (isPollingPausedRef.current) {
      return;
    }

    if (!isValidTournamentId) {
      dispatch({ type: 'SET_ERROR', payload: 'ID turnamen tidak valid' });
      return;
    }

    try {
      if (requestControllerRef.current) {
        requestControllerRef.current.abort();
      }

      requestControllerRef.current = new AbortController();

      const response: TournamentSessionResponse = await gameApi.getTournamentSession(
        tournamentId,
        groupId
      );

      // ✅ ADD CONSOLE LOG FOR DEBUGGING
      console.log('🎮 Tournament Session Response:', response);
      console.log('   - gameState exists:', !!response.gameState);
      console.log('   - gameState:', response.gameState);

      if (response.success && response.tournament && response.group) {
        const normalizedData: TournamentSessionData = {
          tournament: response.tournament,
          group: response.group,
          session: response.session || null,
          gameState: response.gameState || null,
          leaderboard: response.leaderboard || [],
        };

        dispatch({ type: 'SET_DATA', payload: normalizedData });
      } else {
        throw new Error('Data tidak lengkap');
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('cancel')) {
        return;
      }

      console.error('Failed to load tournament session:', error);

      const errorMessage =
        error.response?.status === 404
          ? 'Turnamen tidak ditemukan'
          : error.response?.status === 403
          ? 'Akses ditolak'
          : error.message || 'Gagal memuat data turnamen';

      dispatch({ type: 'SET_ERROR', payload: errorMessage });

      if (state.retryCount < CONFIG.MAX_RETRY_ATTEMPTS && ![404, 403].includes(error.response?.status)) {
        dispatch({ type: 'INCREMENT_RETRY' });
        const delay = Math.pow(2, state.retryCount) * 1000;
        setTimeout(() => {
          loadTournamentSession();
        }, delay);
      }
    }
  }, [isValidTournamentId, tournamentId, groupId, state.retryCount]);

  const handleGameStateUpdate = useCallback((updatedGameState: any) => {
    dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
  }, []);

  const handleAttemptSubmit = useCallback(
    async (inputValue: string) => {
      if (!state.tournamentData?.session) {
        toast.error('Sesi tidak tersedia');
        return;
      }

      const now = Date.now();
      if (now - lastSubmitTimeRef.current < 1000) {
        toast.warning('Mohon tunggu sebentar...');
        return;
      }
      lastSubmitTimeRef.current = now;

      pausePolling();

      try {
        const result = await gameApi.submitAttempt(
          state.tournamentData.session.id,
          state.tournamentData.gameState?.puzzle?.key,
          inputValue
        );

        if (result.stageComplete || result.gameComplete) {
          if (result.gameComplete) {
            try {
              await gameApi.completeTournamentSession(state.tournamentData.session.id);
              toast.success('🏆 Permainan selesai! Menunggu grup lain...');
            } catch (completionError) {
              console.error('Failed to complete tournament session:', completionError);
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));
          await loadTournamentSession();
        } else {
          if (result.session) {
            handleGameStateUpdate({
              ...state.tournamentData.gameState,
              session: result.session,
            });
          }
        }
      } catch (error: any) {
        console.error('Submit attempt failed:', error);

        const errorMessage =
          error.response?.status === 429
            ? 'Terlalu banyak percobaan. Mohon tunggu sebentar.'
            : error.response?.data?.message || 'Gagal mengirim jawaban';

        toast.error(errorMessage);
        await loadTournamentSession();
      } finally {
        setTimeout(() => {
          resumePolling();
        }, 1000);
      }
    },
    [state.tournamentData, handleGameStateUpdate, loadTournamentSession, pausePolling, resumePolling]
  );

  const handleRetry = useCallback(() => {
    dispatch({ type: 'RESET_ERROR' });
    dispatch({ type: 'RESET_RETRY' });
    dispatch({ type: 'SET_LOADING', payload: true });
    loadTournamentSession();
  }, [loadTournamentSession]);

  useEffect(() => {
    if (!isValidTournamentId) {
      dispatch({ type: 'SET_ERROR', payload: 'ID turnamen tidak valid' });
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    loadTournamentSession();

    pollingIntervalRef.current = setInterval(() => {
      if (!isPollingPausedRef.current) {
        loadTournamentSession();
      }
    }, CONFIG.POLLING_INTERVAL);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (requestControllerRef.current) {
        requestControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      pausePolling();
    };
  }, [pausePolling]);

    // ============================================
  // RENDER COMPONENTS
  // ============================================

  const renderLoading = () => (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 flex items-center justify-center p-4">
      <Card className="border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-stone-800 max-w-md w-full">
        <CardContent className="p-8 text-center">
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            🕯️
          </motion.div>
          <h3 className="text-2xl font-bold text-amber-300 mb-2">Memuat Data Turnamen...</h3>
          <p className="text-stone-300">Mohon tunggu sebentar</p>
          {state.retryCount > 0 && (
            <p className="text-amber-400 text-sm mt-2">
              Percobaan ulang {state.retryCount}/{CONFIG.MAX_RETRY_ATTEMPTS}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderError = () => (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 flex items-center justify-center p-4">
      <Card className="border-4 border-red-700 bg-gradient-to-b from-stone-900 to-red-950 max-w-md w-full">
        <CardContent className="p-8 text-center">
          <motion.div
            className="text-6xl mb-4"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            ⚠️
          </motion.div>
          <h3 className="text-2xl font-bold text-red-200 mb-2">Terjadi Kesalahan</h3>
          <p className="text-red-100 mb-6">{state.error || 'Gagal memuat data turnamen'}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleRetry}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-900 font-bold"
            >
              🔄 Coba Lagi
            </Button>
            <Button
              onClick={() => router.visit('/game/tournament')}
              variant="outline"
              className="border-stone-600 text-stone-200 hover:bg-stone-800/60"
            >
              ← Kembali ke Lobby
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const TournamentHeader = memo(() => {
    if (!state.tournamentData) return null;

    const { tournament, group } = state.tournamentData;
    const statusInfo = STATUS_CONFIG[group.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.waiting;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="border-4 border-amber-700 bg-gradient-to-r from-stone-900 to-amber-950">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl sm:text-3xl text-amber-300 mb-2">
                  🏆 {tournament.name}
                </CardTitle>
                <CardDescription className="text-stone-300">
                  Round {tournament.current_round} • Grup: {group.name}
                </CardDescription>
              </div>
              <Badge className={`${statusInfo.color} text-white text-base px-4 py-2 ${statusInfo.glow ? 'animate-pulse' : ''}`}>
                {statusInfo.icon} {statusInfo.text}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-stone-950/50 rounded-lg border border-stone-700/50">
                <div className="text-sm text-stone-400">Status Turnamen</div>
                <div className="text-lg font-bold text-amber-300 capitalize">
                  {tournament.status.replace('_', ' ')}
                </div>
              </div>

              {group.rank && (
                <div className="p-3 bg-stone-950/50 rounded-lg border border-stone-700/50">
                  <div className="text-sm text-stone-400">Peringkat</div>
                  <div className="text-lg font-bold text-amber-300">#{group.rank}</div>
                </div>
              )}

              {group.completion_time && (
                <div className="p-3 bg-stone-950/50 rounded-lg border border-stone-700/50">
                  <div className="text-sm text-stone-400">Waktu Selesai</div>
                  <div className="text-lg font-bold text-emerald-300">
                    {formatTime(group.completion_time)}
                  </div>
                </div>
              )}

              <div className="p-3 bg-stone-950/50 rounded-lg border border-stone-700/50">
                <div className="text-sm text-stone-400">Anggota Tim</div>
                <div className="text-lg font-bold text-indigo-300">
                  {group.participants.length}/2
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`p-3 rounded-lg border ${
                    participant.user_id === auth?.user?.id
                      ? 'bg-emerald-900/30 border-emerald-600'
                      : 'bg-stone-950/30 border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {participant.role === 'defuser' ? '💣' : '📖'}
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-stone-200">
                        {participant.nickname}
                        {participant.user_id === auth?.user?.id && (
                          <span className="text-emerald-300 text-xs ml-2">(Anda)</span>
                        )}
                      </div>
                      <div className="text-xs text-stone-400 capitalize">{participant.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  });

  TournamentHeader.displayName = 'TournamentHeader';

  const LeaderboardPanel = memo(() => {
    if (!state.tournamentData?.leaderboard || state.tournamentData.leaderboard.length === 0) {
      return null;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6"
      >
        <Card className="border-2 border-indigo-700/50 bg-gradient-to-b from-stone-900/90 to-stone-800/70">
          <CardHeader>
            <CardTitle className="text-xl text-indigo-300">📊 Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {state.tournamentData.leaderboard.map((entry, index) => {
                const statusInfo = STATUS_CONFIG[entry.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.waiting;
                const isCurrentGroup = entry.id === state.tournamentData?.group.id;

                return (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isCurrentGroup
                        ? 'bg-emerald-900/30 border-emerald-600 ring-2 ring-emerald-500/50'
                        : 'bg-stone-950/30 border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-2xl font-bold text-amber-300">
                          {entry.rank ? `#${entry.rank}` : `#${index + 1}`}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-stone-200">
                            {entry.name}
                            {isCurrentGroup && <span className="text-emerald-300 text-xs ml-2">(Tim Anda)</span>}
                          </div>
                          <div className="text-xs text-stone-400 mt-1">
                            {entry.participants.map((p) => p.nickname).join(' & ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {entry.completion_time && (
                          <div className="text-right">
                            <div className="text-sm text-stone-400">Waktu</div>
                            <div className="text-base font-bold text-emerald-300">
                              {formatTime(entry.completion_time)}
                            </div>
                          </div>
                        )}
                        <Badge className={`${statusInfo.color} text-white`}>
                          {statusInfo.icon}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  });

  LeaderboardPanel.displayName = 'LeaderboardPanel';

  // ============================================
  // MAIN RENDER
  // ============================================

  if (!isValidTournamentId) {
    return (
      <AuthenticatedLayout>
        <Head title="Error - Tournament" />
        {renderError()}
      </AuthenticatedLayout>
    );
  }

  if (state.loading && !state.tournamentData) {
    return (
      <AuthenticatedLayout>
        <Head title="Loading Tournament..." />
        {renderLoading()}
      </AuthenticatedLayout>
    );
  }

  if (state.error && !state.tournamentData) {
    return (
      <AuthenticatedLayout>
        <Head title="Error - Tournament" />
        {renderError()}
      </AuthenticatedLayout>
    );
  }

  if (!state.tournamentData) {
    return (
      <AuthenticatedLayout>
        <Head title="Loading Tournament..." />
        {renderLoading()}
      </AuthenticatedLayout>
    );
  }

  const { tournament, group, session, gameState } = state.tournamentData;

  const userParticipant = group.participants.find((p) => p.user_id === auth?.user?.id);
  const userRole: 'defuser' | 'expert' | 'host' | undefined = userParticipant?.role;

  return (
    <AuthenticatedLayout>
      <Head title={`${tournament.name} - ${group.name}`} />

      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <TournamentHeader />

          {/* ✅ CONDITION CHECK - Remove after debugging */}
          <Card className="border-2 border-yellow-700 bg-stone-900 mb-4">
            <CardContent className="p-4">
              <h3 className="text-yellow-300 font-bold mb-2">🔍 Debug - Condition Check:</h3>
              <pre className="text-xs bg-black/50 p-2 rounded overflow-auto">
                {JSON.stringify({
                  has_session: !!session,
                  has_gameState: !!gameState,
                  group_status: group.status,
                  condition_met: !!(session && gameState && group.status === 'playing'),
                }, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Game Session */}
          {session && gameState && group.status === 'playing' ? (
            <>
              {/* ✅ DEBUG PANEL - Remove after fixing */}
              <Card className="border-2 border-purple-700 bg-gradient-to-b from-stone-900 to-purple-950 mb-4">
                <CardHeader>
                  <CardTitle className="text-purple-300">🔍 Debug Info (Remove in Production)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <h4 className="text-purple-300 font-bold mb-2">Session Info</h4>
                      <pre className="bg-black/50 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify({
                          session_id: session?.id,
                          session_status: session?.status,
                          team_code: session?.team_code,
                        }, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-purple-300 font-bold mb-2">GameState Check</h4>
                      <pre className="bg-black/50 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify({
                          gameState_exists: !!gameState,
                          gameState_type: typeof gameState,
                          gameState_is_null: gameState === null,
                          gameState_keys: gameState ? Object.keys(gameState) : [],
                        }, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-purple-300 font-bold mb-2">Puzzle Check</h4>
                      <pre className="bg-black/50 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify({
                          puzzle_exists: !!gameState?.puzzle,
                          puzzle_type: gameState?.puzzle?.type,
                          puzzle_keys: gameState?.puzzle ? Object.keys(gameState.puzzle) : [],
                          has_defuserView: !!gameState?.puzzle?.defuserView,
                          has_expertView: !!gameState?.puzzle?.expertView,
                        }, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-purple-300 font-bold mb-2">Full Puzzle Data</h4>
                      <pre className="bg-black/50 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(gameState?.puzzle || null, null, 2)}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GamePlay
                  gameState={gameState}
                  role={userRole}
                  onGameStateUpdate={handleGameStateUpdate}
                  onSubmitAttempt={handleAttemptSubmit}
                  submitting={false}
                />
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-2 border-amber-700/50 bg-gradient-to-b from-stone-900/90 to-stone-800/70">
                <CardContent className="p-8 text-center">
                  <div className="text-6xl mb-4">
                    {group.status === 'completed' ? '🏁' : group.status === 'eliminated' ? '❌' : group.status === 'champion' ? '👑' : '⏳'}
                  </div>
                  <h3 className="text-2xl font-bold text-amber-300 mb-2">
                    {group.status === 'completed'
                      ? 'Permainan Selesai!'
                      : group.status === 'eliminated'
                      ? 'Tim Tersingkir'
                      : group.status === 'champion'
                      ? 'Juara Turnamen!'
                      : 'Menunggu Permainan Dimulai...'}
                  </h3>
                  <p className="text-stone-300 mb-6">
                    {group.status === 'completed'
                      ? 'Menunggu grup lain menyelesaikan permainan...'
                      : group.status === 'eliminated'
                      ? 'Tim Anda tidak lolos ke babak selanjutnya.'
                      : group.status === 'champion'
                      ? 'Selamat! Tim Anda menjadi juara turnamen!'
                      : 'Turnamen akan segera dimulai. Bersiaplah!'}
                  </p>
                  <Button
                    onClick={() => router.visit('/game/tournament')}
                    variant="outline"
                    className="border-amber-600 text-amber-300 hover:bg-amber-900/30"
                  >
                    ← Kembali ke Lobby
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <LeaderboardPanel />
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </AuthenticatedLayout>
  );
}
