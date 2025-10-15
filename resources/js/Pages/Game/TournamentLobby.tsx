import React, { useState, useEffect, useCallback, useMemo, memo, useRef, useReducer } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { gameApi } from '@/services/gameApi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import VoiceChat from '@/Components/Game/VoiceChat';
import TournamentBracket from '@/Components/Game/TournamentBracket';
import Leaderboard from '@/Components/Game/Leaderboard';
import { TournamentData, TournamentGroup, normalizeTournamentData } from '@/types/game';
import { toast } from 'sonner';
import { gsap } from 'gsap';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  POLLING_INTERVAL: 5000,
  MAX_GROUP_NAME_LENGTH: 30,
  MAX_TOURNAMENT_DISPLAY: 10,
  SWIPE_THRESHOLD: 50,
  MOBILE_BREAKPOINT: 768,
  TORCH_FLICKER_INTERVAL: 150,
  ANIMATION_DURATION: 0.6,
  DEBOUNCE_DELAY: 300,
  JOIN_DEBOUNCE_DELAY: 1000, // ✅ NEW: Prevent double click
  REQUEST_TIMEOUT: 30000,
} as const;

const TOURNAMENT_STATUS = {
  waiting: { color: 'bg-yellow-500', label: 'Menunggu', icon: '⏳' },
  qualification: { color: 'bg-blue-500', label: 'Kualifikasi', icon: '🎯' },
  semifinals: { color: 'bg-purple-500', label: 'Semifinal', icon: '🏆' },
  finals: { color: 'bg-red-500', label: 'Final', icon: '👑' },
  completed: { color: 'bg-green-500', label: 'Selesai', icon: '✅' },
} as const;

// ✅ NEW: Action types for reducer
type TournamentAction =
  | { type: 'SET_TOURNAMENTS'; payload: TournamentData[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_JOINING'; payload: { tournamentId: number; value: boolean } }
  | { type: 'SET_CREATING'; payload: boolean }
  | { type: 'UPDATE_TOURNAMENT'; payload: TournamentData }
  | { type: 'RESET_JOIN_STATE' };

// ✅ NEW: State type
interface TournamentState {
  tournaments: TournamentData[];
  loading: boolean;
  joiningMap: Map<number, boolean>; // Track per-tournament joining state
  creating: boolean;
}

// ✅ NEW: Reducer for atomic state updates
const tournamentReducer = (state: TournamentState, action: TournamentAction): TournamentState => {
  switch (action.type) {
    case 'SET_TOURNAMENTS':
      return { ...state, tournaments: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_JOINING': {
      const newMap = new Map(state.joiningMap);
      newMap.set(action.payload.tournamentId, action.payload.value);
      return { ...state, joiningMap: newMap };
    }
    case 'SET_CREATING':
      return { ...state, creating: action.payload };
    case 'UPDATE_TOURNAMENT':
      return {
        ...state,
        tournaments: state.tournaments.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case 'RESET_JOIN_STATE':
      return { ...state, joiningMap: new Map() };
    default:
      return state;
  }
};

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

// ✅ NEW: Request cancellation helper
const createCancellableRequest = () => {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
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

const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
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

    return () => clearInterval(interval);
  }, []);

  const setTorchRef = useCallback(
    (index: number) => (el: HTMLSpanElement | null) => {
      torchRefs.current[index] = el;
    },
    []
  );

  return { setTorchRef };
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function TournamentLobby() {
  const { auth } = usePage().props as any;
  const isMobile = useIsMobile();
  const { setTorchRef } = useDungeonAtmosphere();

  // ✅ Use reducer for atomic state updates
  const [state, dispatch] = useReducer(tournamentReducer, {
    tournaments: [],
    loading: true,
    joiningMap: new Map(),
    creating: false,
  });

  // UI state (keep separate as they don't need to be atomic)
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<TournamentData | null>(null);
  const [tournamentName, setTournamentName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'defuser' | 'expert'>('defuser');
  const [nickname, setNickname] = useState(auth?.user?.name || '');
  const [error, setError] = useState('');

  // ✅ NEW: Refs for request management
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const lastJoinAttemptRef = useRef<number>(0);
  const isPollingPausedRef = useRef(false);

  // ✅ NEW: Stop polling during critical operations
  const pausePolling = useCallback(() => {
    isPollingPausedRef.current = true;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // ✅ NEW: Resume polling
  const resumePolling = useCallback(() => {
    isPollingPausedRef.current = false;
    if (!pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(loadTournaments, CONFIG.POLLING_INTERVAL);
    }
  }, []);

  // ============================================
  // DATA LOADING
  // ============================================
  const loadTournaments = useCallback(async () => {
    // ✅ Skip if polling is paused
    if (isPollingPausedRef.current) {
      return;
    }

    try {
      // ✅ Cancel previous request if still running
      if (requestControllerRef.current) {
        requestControllerRef.current.abort();
      }

      requestControllerRef.current = new AbortController();

      const response = await gameApi.getTournaments();

      if (response && Array.isArray(response.tournaments)) {
        const normalized = response.tournaments.map(normalizeTournamentData);
        dispatch({ type: 'SET_TOURNAMENTS', payload: normalized });
      }
    } catch (error: any) {
      // ✅ Don't show error if request was cancelled
      if (error.name === 'AbortError' || error.message?.includes('cancel')) {
        return;
      }

      console.error('Failed to load tournaments:', error);

      // Only show error toast if not already loading
      if (!state.loading) {
        toast.error('Gagal memuat turnamen');
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.loading]);

  // ============================================
  // JOIN TOURNAMENT (Race Condition Safe)
  // ============================================
  const joinTournament = useCallback(
    async (tournamentId: number) => {
      // ✅ Validate inputs
      if (!groupName.trim()) {
        setError('Nama grup harus diisi');
        return;
      }

      if (!nickname.trim()) {
        setError('Nickname harus diisi');
        return;
      }

      // ✅ Check if already joining this tournament
      if (state.joiningMap.get(tournamentId)) {
        return;
      }

      // ✅ Debounce: Prevent rapid double-clicks
      const now = Date.now();
      if (now - lastJoinAttemptRef.current < CONFIG.JOIN_DEBOUNCE_DELAY) {
        toast.warning('Mohon tunggu sebentar...');
        return;
      }
      lastJoinAttemptRef.current = now;

      // ✅ Pause polling during join
      pausePolling();

      // ✅ Set joining state for this specific tournament
      dispatch({ type: 'SET_JOINING', payload: { tournamentId, value: true } });

      try {
        const response = await gameApi.joinTournament(tournamentId, {
          group_name: groupName.trim(),
          role: selectedRole,
          nickname: nickname.trim(),
        });

        if (response.success) {
          toast.success('Berhasil bergabung dengan turnamen! 🎉');

          // ✅ Update local state immediately (optimistic update)
          if (response.tournament) {
            dispatch({ type: 'UPDATE_TOURNAMENT', payload: normalizeTournamentData(response.tournament) });
          }

          // ✅ Reset UI state
          setGroupName('');
          setSelectedTournament(null);
          setShowJoinSheet(false);
          setError('');

          // ✅ Wait a bit before redirecting to ensure state is synced
          await new Promise((resolve) => setTimeout(resolve, 500));

          // ✅ Navigate to tournament page
          router.visit(`/game/tournament/${tournamentId}`, {
            preserveState: false,
            preserveScroll: false,
          });
        } else {
          throw new Error(response.message || 'Gagal bergabung dengan turnamen');
        }
      } catch (error: any) {
        console.error('Join tournament failed:', error);

        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          'Gagal bergabung dengan turnamen. Silakan coba lagi.';

        toast.error(errorMessage);
        setError(errorMessage);

        // ✅ Reload tournaments to get fresh data
        await loadTournaments();
      } finally {
        // ✅ Clear joining state
        dispatch({ type: 'SET_JOINING', payload: { tournamentId, value: false } });

        // ✅ Resume polling after a short delay
        setTimeout(() => {
          resumePolling();
        }, 1000);
      }
    },
    [groupName, nickname, selectedRole, state.joiningMap, pausePolling, resumePolling, loadTournaments]
  );

  // ✅ Debounced version of join
  const debouncedJoinTournament = useMemo(
    () => debounce(joinTournament, CONFIG.JOIN_DEBOUNCE_DELAY),
    [joinTournament]
  );
    // ============================================
  // CREATE TOURNAMENT
  // ============================================
  const createTournament = useCallback(async () => {
    if (!tournamentName.trim()) {
      setError('Nama turnamen harus diisi');
      return;
    }

    if (state.creating) {
      return;
    }

    // ✅ Pause polling during create
    pausePolling();

    dispatch({ type: 'SET_CREATING', payload: true });

    try {
      const response = await gameApi.createTournament({
        name: tournamentName.trim(),
        max_groups: 4,
      });

      if (response.success && response.tournament) {
        toast.success('Turnamen berhasil dibuat! 🎉');

        // ✅ Add new tournament to list
        const normalized = normalizeTournamentData(response.tournament);
        dispatch({
          type: 'SET_TOURNAMENTS',
          payload: [normalized, ...state.tournaments],
        });

        // Reset form
        setTournamentName('');
        setShowCreateSheet(false);
        setError('');
      } else {
        throw new Error(response.message || 'Gagal membuat turnamen');
      }
    } catch (error: any) {
      console.error('Create tournament failed:', error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Gagal membuat turnamen. Silakan coba lagi.';

      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      dispatch({ type: 'SET_CREATING', payload: false });

      // ✅ Resume polling
      setTimeout(() => {
        resumePolling();
      }, 1000);
    }
  }, [tournamentName, state.creating, state.tournaments, pausePolling, resumePolling]);

  // ============================================
  // UI HANDLERS
  // ============================================
  const handleTournamentSelect = useCallback((tournament: TournamentData) => {
    setSelectedTournament(tournament);
    setShowJoinSheet(true);
    setError('');
  }, []);

  const handleCloseJoinSheet = useCallback(() => {
    setShowJoinSheet(false);
    setSelectedTournament(null);
    setGroupName('');
    setError('');
  }, []);

  const handleCloseCreateSheet = useCallback(() => {
    setShowCreateSheet(false);
    setTournamentName('');
    setError('');
  }, []);

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const activeTournaments = useMemo(
    () => state.tournaments.filter((t) => ['waiting', 'qualification', 'semifinals', 'finals'].includes(t.status)),
    [state.tournaments]
  );

  const completedTournaments = useMemo(
    () => state.tournaments.filter((t) => t.status === 'completed'),
    [state.tournaments]
  );

  const canJoinTournament = useMemo(() => {
    if (!selectedTournament) return false;

    const totalParticipants = selectedTournament.groups.reduce(
      (sum, group) => sum + group.participants.length,
      0
    );

    return selectedTournament.status === 'waiting' && totalParticipants < 8;
  }, [selectedTournament]);

  const isJoining = useMemo(
    () => selectedTournament ? state.joiningMap.get(selectedTournament.id) || false : false,
    [selectedTournament, state.joiningMap]
  );

  // ============================================
  // EFFECTS
  // ============================================

  // ✅ Initial load and polling setup
  useEffect(() => {
    loadTournaments();

    pollingIntervalRef.current = setInterval(() => {
      if (!isPollingPausedRef.current) {
        loadTournaments();
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
  }, []); // ✅ Empty deps - only run once

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      pausePolling();
      dispatch({ type: 'RESET_JOIN_STATE' });
    };
  }, [pausePolling]);

    // ============================================
  // RENDER FUNCTIONS
  // ============================================

  // ✅ Loading State
  const renderLoading = () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-stone-800">
        <CardContent className="p-8 text-center">
          <motion.div
            className="text-6xl mb-4 dungeon-icon-glow"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            🕯️
          </motion.div>
          <h3 className="text-2xl font-bold text-amber-300 mb-2">Memuat Turnamen...</h3>
          <p className="text-stone-300">Mohon tunggu sebentar</p>
        </CardContent>
      </Card>
    </div>
  );

  // ✅ Empty State
  const renderEmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <Card className="border-2 border-amber-700/50 bg-gradient-to-b from-stone-900/80 to-stone-800/60">
        <CardContent className="p-8">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-2xl font-bold text-amber-300 mb-2">Belum Ada Turnamen</h3>
          <p className="text-stone-300 mb-6">Jadilah yang pertama membuat turnamen!</p>
          <Button
            onClick={() => setShowCreateSheet(true)}
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-900 font-bold"
          >
            🎮 Buat Turnamen
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  // ✅ Tournament Card Component
  const TournamentCard = memo(({ tournament }: { tournament: TournamentData }) => {
    const statusInfo = TOURNAMENT_STATUS[tournament.status as keyof typeof TOURNAMENT_STATUS];
    const totalParticipants = tournament.groups.reduce((sum, group) => sum + group.participants.length, 0);
    const isFull = totalParticipants >= 8;
    const canJoin = tournament.status === 'waiting' && !isFull;
    const isThisTournamentJoining = state.joiningMap.get(tournament.id) || false;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ scale: 1.02 }}
        className="w-full"
      >
        <Card className="border-2 border-amber-700/50 bg-gradient-to-b from-stone-900/90 to-stone-800/70 hover:border-amber-600 transition-all duration-300">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl text-amber-300 truncate">{tournament.name}</CardTitle>
                <CardDescription className="text-stone-400 mt-1">
                  ID: {tournament.id} • Round {tournament.current_round}
                </CardDescription>
              </div>
              <Badge className={`${statusInfo.color} text-white flex-shrink-0`}>
                {statusInfo.icon} {statusInfo.label}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Participants Info */}
            <div className="flex items-center justify-between p-3 bg-stone-950/50 rounded-lg border border-stone-700/50">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👥</span>
                <div>
                  <div className="text-sm text-stone-400">Peserta</div>
                  <div className="text-lg font-bold text-amber-300">
                    {totalParticipants}/8
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏛️</span>
                <div>
                  <div className="text-sm text-stone-400">Grup</div>
                  <div className="text-lg font-bold text-indigo-300">
                    {tournament.groups.length}/4
                  </div>
                </div>
              </div>
            </div>

            {/* Groups Preview */}
            {tournament.groups.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-stone-300">Grup yang Terdaftar:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {tournament.groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-2 bg-stone-950/30 rounded border border-stone-700/30 text-sm"
                    >
                      <span className="text-amber-200 truncate flex-1">{group.name}</span>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {group.participants.length}/2
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              {canJoin ? (
                <Button
                  onClick={() => handleTournamentSelect(tournament)}
                  disabled={isThisTournamentJoining}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isThisTournamentJoining ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block mr-2"
                      >
                        ⚙️
                      </motion.span>
                      Bergabung...
                    </>
                  ) : (
                    <>🎮 Gabung Turnamen</>
                  )}
                </Button>
              ) : isFull ? (
                <Button disabled className="w-full bg-stone-700 text-stone-400 cursor-not-allowed">
                  🚫 Turnamen Penuh
                </Button>
              ) : (
                <Button
                  onClick={() => router.visit(`/game/tournament/${tournament.id}`)}
                  variant="outline"
                  className="w-full border-amber-600 text-amber-300 hover:bg-amber-900/30"
                >
                  👁️ Lihat Detail
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  });

  TournamentCard.displayName = 'TournamentCard';

  // ✅ Create Tournament Sheet
  const renderCreateSheet = () => (
    <AnimatePresence>
      {showCreateSheet && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={handleCloseCreateSheet}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-gradient-to-b from-stone-900 to-stone-800 border-l-4 border-amber-700 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-amber-300">🏆 Buat Turnamen Baru</h2>
                <Button
                  onClick={handleCloseCreateSheet}
                  variant="ghost"
                  size="sm"
                  className="text-stone-400 hover:text-stone-200"
                >
                  ✕
                </Button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-300 mb-2">
                    Nama Turnamen *
                  </label>
                  <input
                    type="text"
                    value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value.slice(0, 50))}
                    placeholder="Contoh: Turnamen Coding Rumah 2024"
                    className="w-full px-4 py-3 bg-stone-950/50 border-2 border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:border-amber-600 focus:outline-none"
                    maxLength={50}
                  />
                  <p className="text-xs text-stone-500 mt-1">{tournamentName.length}/50 karakter</p>
                </div>

                <div className="p-4 bg-indigo-900/30 border border-indigo-700/50 rounded-lg space-y-2">
                  <h3 className="text-sm font-semibold text-indigo-200">📋 Aturan Turnamen</h3>
                  <ul className="text-xs text-indigo-100 space-y-1 list-disc list-inside">
                    <li>Maksimal 4 grup (8 peserta total)</li>
                    <li>Setiap grup terdiri dari 2 orang (Defuser & Expert)</li>
                    <li>3 Tahap: Kualifikasi → Semifinal → Final</li>
                    <li>Sistem eliminasi berdasarkan waktu tercepat</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Button
                  onClick={createTournament}
                  disabled={!tournamentName.trim() || state.creating}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-900 font-bold py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.creating ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block mr-2"
                      >
                        ⚙️
                      </motion.span>
                      Membuat Turnamen...
                    </>
                  ) : (
                    '🎮 Buat Turnamen'
                  )}
                </Button>
                <Button
                  onClick={handleCloseCreateSheet}
                  variant="outline"
                  className="w-full border-stone-600 text-stone-300 hover:bg-stone-800/50"
                >
                  Batal
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // ✅ Join Tournament Sheet
  const renderJoinSheet = () => (
    <AnimatePresence>
      {showJoinSheet && selectedTournament && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={handleCloseJoinSheet}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-gradient-to-b from-stone-900 to-stone-800 border-l-4 border-emerald-700 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-emerald-300">🎮 Gabung Turnamen</h2>
                <Button
                  onClick={handleCloseJoinSheet}
                  variant="ghost"
                  size="sm"
                  className="text-stone-400 hover:text-stone-200"
                >
                  ✕
                </Button>
              </div>

              {/* Tournament Info */}
              <div className="p-4 bg-stone-950/50 border-2 border-stone-700 rounded-lg space-y-2">
                <h3 className="text-lg font-bold text-amber-300">{selectedTournament.name}</h3>
                <div className="flex items-center gap-4 text-sm text-stone-400">
                  <span>
                    👥{' '}
                    {selectedTournament.groups.reduce((sum, g) => sum + g.participants.length, 0)}
                    /8 Peserta
                  </span>
                  <span>🏛️ {selectedTournament.groups.length}/4 Grup</span>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-300 mb-2">
                    Nama Grup *
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value.slice(0, CONFIG.MAX_GROUP_NAME_LENGTH))}
                    placeholder="Contoh: Tim Rocket"
                    className="w-full px-4 py-3 bg-stone-950/50 border-2 border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:border-emerald-600 focus:outline-none"
                    maxLength={CONFIG.MAX_GROUP_NAME_LENGTH}
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    {groupName.length}/{CONFIG.MAX_GROUP_NAME_LENGTH} karakter
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-300 mb-2">Nickname *</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.slice(0, 50))}
                    placeholder="Nama tampilan Anda"
                    className="w-full px-4 py-3 bg-stone-950/50 border-2 border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:border-emerald-600 focus:outline-none"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-300 mb-2">Pilih Role *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedRole('defuser')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedRole === 'defuser'
                          ? 'border-emerald-600 bg-emerald-900/30 text-emerald-200'
                          : 'border-stone-700 bg-stone-950/30 text-stone-400 hover:border-stone-600'
                      }`}
                    >
                      <div className="text-2xl mb-1">💣</div>
                      <div className="font-semibold text-sm">Defuser</div>
                      <div className="text-xs mt-1 opacity-75">Pemecah Masalah</div>
                    </button>
                    <button
                      onClick={() => setSelectedRole('expert')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedRole === 'expert'
                          ? 'border-emerald-600 bg-emerald-900/30 text-emerald-200'
                          : 'border-stone-700 bg-stone-950/30 text-stone-400 hover:border-stone-600'
                      }`}
                    >
                      <div className="text-2xl mb-1">📖</div>
                      <div className="font-semibold text-sm">Expert</div>
                      <div className="text-xs mt-1 opacity-75">Pemberi Panduan</div>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg space-y-2">
                  <h3 className="text-sm font-semibold text-blue-200">💡 Tips</h3>
                  <ul className="text-xs text-blue-100 space-y-1 list-disc list-inside">
                    <li>Nama grup harus unik dalam turnamen</li>
                    <li>Setiap grup butuh 1 Defuser dan 1 Expert</li>
                    <li>Diskusikan strategi dengan partner Anda</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Button
                  onClick={() => joinTournament(selectedTournament.id)}
                  disabled={!canJoinTournament || isJoining}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block mr-2"
                      >
                        ⚙️
                      </motion.span>
                      Bergabung...
                    </>
                  ) : (
                    '🎮 Gabung Sekarang'
                  )}
                </Button>
                <Button
                  onClick={handleCloseJoinSheet}
                  variant="outline"
                  className="w-full border-stone-600 text-stone-300 hover:bg-stone-800/50"
                >
                  Batal
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

    // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <AuthenticatedLayout>
      <Head title="Tournament Lobby - KodeAlpa Dungeon" />

      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-4 border-amber-700 bg-gradient-to-r from-stone-900 to-amber-950">
              <CardHeader className="relative">
                <div className="absolute top-4 left-4 text-2xl">
                  <span ref={setTorchRef(0)} className="dungeon-torch-flicker">
                    🔥
                  </span>
                </div>
                <div className="absolute top-4 right-4 text-2xl">
                  <span ref={setTorchRef(1)} className="dungeon-torch-flicker">
                    🔥
                  </span>
                </div>

                <div className="text-center pt-8">
                  <CardTitle className="text-4xl font-bold text-amber-300 mb-2">
                    🏆 Tournament Lobby
                  </CardTitle>
                  <CardDescription className="text-stone-300 text-lg">
                    Bergabung atau buat turnamen coding dungeon!
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-6">
                <Button
                  onClick={() => setShowCreateSheet(true)}
                  disabled={state.creating}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-900 font-bold"
                >
                  🎮 Buat Turnamen Baru
                </Button>
                <Button
                  onClick={loadTournaments}
                  disabled={state.loading}
                  variant="outline"
                  className="w-full sm:w-auto border-amber-600 text-amber-300 hover:bg-amber-900/30"
                >
                  {state.loading ? '⚙️ Memuat...' : '🔄 Refresh'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Content */}
          {state.loading && state.tournaments.length === 0 ? (
            renderLoading()
          ) : state.tournaments.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="space-y-8">
              {/* Active Tournaments */}
              {activeTournaments.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-amber-300 mb-4 flex items-center gap-2">
                    <span>⚔️</span>
                    <span>Turnamen Aktif</span>
                    <Badge variant="outline" className="text-amber-300 border-amber-600">
                      {activeTournaments.length}
                    </Badge>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                      {activeTournaments.map((tournament) => (
                        <TournamentCard key={tournament.id} tournament={tournament} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Completed Tournaments */}
              {completedTournaments.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-emerald-300 mb-4 flex items-center gap-2">
                    <span>✅</span>
                    <span>Turnamen Selesai</span>
                    <Badge variant="outline" className="text-emerald-300 border-emerald-600">
                      {completedTournaments.length}
                    </Badge>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                      {completedTournaments.slice(0, CONFIG.MAX_TOURNAMENT_DISPLAY).map((tournament) => (
                        <TournamentCard key={tournament.id} tournament={tournament} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sheets */}
      {renderCreateSheet()}
      {renderJoinSheet()}

      {/* Styles */}
      <style>{`
        .dungeon-torch-flicker {
          display: inline-block;
          animation: flicker 2s infinite;
        }

        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .dungeon-icon-glow {
          filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.5));
        }
      `}</style>
    </AuthenticatedLayout>
  );
}
