import React, { useState, useEffect, useCallback, useMemo, memo, useRef, useReducer } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { gameApi } from '@/services/gameApi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { TournamentData, normalizeTournamentData } from '@/types/game';
import { toast } from 'sonner';
import { gsap } from 'gsap';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  POLLING_INTERVAL: 5000,
  MAX_GROUP_NAME_LENGTH: 30,
  MAX_TOURNAMENT_DISPLAY: 10,
  MOBILE_BREAKPOINT: 768,
  ANIMATION_DURATION: 0.6,
  DEBOUNCE_DELAY: 300,
  JOIN_DEBOUNCE_DELAY: 1000,
  REQUEST_TIMEOUT: 30000,
} as const;

const TOURNAMENT_STATUS = {
  waiting: { color: 'bg-yellow-500', label: 'Menunggu', icon: '⏳', gradient: 'from-yellow-600 to-amber-600' },
  qualification: { color: 'bg-blue-500', label: 'Kualifikasi', icon: '🎯', gradient: 'from-blue-600 to-cyan-600' },
  semifinals: { color: 'bg-purple-500', label: 'Semifinal', icon: '🏆', gradient: 'from-purple-600 to-pink-600' },
  finals: { color: 'bg-red-500', label: 'Final', icon: '👑', gradient: 'from-red-600 to-rose-600' },
  completed: { color: 'bg-green-500', label: 'Selesai', icon: '✅', gradient: 'from-green-600 to-emerald-600' },
} as const;

// ============================================
// TYPES
// ============================================
type TournamentAction =
  | { type: 'SET_TOURNAMENTS'; payload: TournamentData[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_JOINING'; payload: { tournamentId: number; value: boolean } }
  | { type: 'SET_CREATING'; payload: boolean }
  | { type: 'UPDATE_TOURNAMENT'; payload: TournamentData }
  | { type: 'RESET_JOIN_STATE' };

interface TournamentState {
  tournaments: TournamentData[];
  loading: boolean;
  joiningMap: Map<number, boolean>;
  creating: boolean;
}

// ✅ API Response type
interface TournamentsResponse {
  success?: boolean;
  tournaments?: TournamentData[];
}

// ============================================
// REDUCER
// ============================================
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
    }, 150);

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

  // UI state
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<TournamentData | null>(null);
  const [tournamentName, setTournamentName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'defuser' | 'expert'>('defuser');
  const [nickname, setNickname] = useState(auth?.user?.name || '');
  const [error, setError] = useState('');

  // ✅ Refs for request management
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const lastJoinAttemptRef = useRef<number>(0);
  const isPollingPausedRef = useRef(false);

  // ✅ Pause/Resume polling
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
      pollingIntervalRef.current = setInterval(loadTournaments, CONFIG.POLLING_INTERVAL);
    }
  }, []);

  // ============================================
  // DATA LOADING (Fixed Type Error)
  // ============================================
  const loadTournaments = useCallback(async () => {
    if (isPollingPausedRef.current) {
      return;
    }

    try {
      if (requestControllerRef.current) {
        requestControllerRef.current.abort();
      }

      requestControllerRef.current = new AbortController();

      // ✅ Fixed: Type cast to proper response type
      const response = await gameApi.getTournaments() as TournamentsResponse;

      console.log('🔍 getTournaments response:', response);

      // ✅ Handle multiple response formats
      if (response) {
        // Format 1: { success: true, tournaments: [...] }
        if (response.success && Array.isArray(response.tournaments)) {
          const normalized = response.tournaments.map(normalizeTournamentData);
          dispatch({ type: 'SET_TOURNAMENTS', payload: normalized });
          return;
        }

        // Format 2: { tournaments: [...] } without success field
        if (response.tournaments && Array.isArray(response.tournaments)) {
          const normalized = response.tournaments.map(normalizeTournamentData);
          dispatch({ type: 'SET_TOURNAMENTS', payload: normalized });
          return;
        }

        // Format 3: Direct array (if API returns array directly)
        if (Array.isArray(response)) {
          const normalized = (response as any[]).map(normalizeTournamentData);
          dispatch({ type: 'SET_TOURNAMENTS', payload: normalized });
          return;
        }

        console.warn('⚠️ Unexpected response format:', response);
      }

      dispatch({ type: 'SET_TOURNAMENTS', payload: [] });

    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('cancel')) {
        return;
      }

      console.error('❌ Failed to load tournaments:', error);

      if (!state.loading) {
        toast.error('Gagal memuat turnamen');
      }

      dispatch({ type: 'SET_TOURNAMENTS', payload: [] });

    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.loading]);

  // ============================================
  // JOIN TOURNAMENT
  // ============================================
  const joinTournament = useCallback(
    async (tournamentId: number) => {
      if (!groupName.trim()) {
        setError('Nama grup harus diisi');
        return;
      }

      if (!nickname.trim()) {
        setError('Nickname harus diisi');
        return;
      }

      if (state.joiningMap.get(tournamentId)) {
        return;
      }

      const now = Date.now();
      if (now - lastJoinAttemptRef.current < CONFIG.JOIN_DEBOUNCE_DELAY) {
        toast.warning('Mohon tunggu sebentar...');
        return;
      }
      lastJoinAttemptRef.current = now;

      pausePolling();
      dispatch({ type: 'SET_JOINING', payload: { tournamentId, value: true } });

      try {
        const response = await gameApi.joinTournament(tournamentId, {
          group_name: groupName.trim(),
          role: selectedRole,
          nickname: nickname.trim(),
        });

        if (response.success) {
          toast.success('Berhasil bergabung dengan turnamen! 🎉');

          if (response.tournament) {
            dispatch({ type: 'UPDATE_TOURNAMENT', payload: normalizeTournamentData(response.tournament) });
          }

          setGroupName('');
          setSelectedTournament(null);
          setShowJoinSheet(false);
          setError('');

          await new Promise((resolve) => setTimeout(resolve, 500));

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

        await loadTournaments();
      } finally {
        dispatch({ type: 'SET_JOINING', payload: { tournamentId, value: false } });

        setTimeout(() => {
          resumePolling();
        }, 1000);
      }
    },
    [groupName, nickname, selectedRole, state.joiningMap, pausePolling, resumePolling, loadTournaments]
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

    pausePolling();
    dispatch({ type: 'SET_CREATING', payload: true });

    try {
      const response = await gameApi.createTournament({
        name: tournamentName.trim(),
        max_groups: 4,
      });

      if (response.success && response.tournament) {
        toast.success('Turnamen berhasil dibuat! 🎉');

        const normalized = normalizeTournamentData(response.tournament);
        dispatch({
          type: 'SET_TOURNAMENTS',
          payload: [normalized, ...state.tournaments],
        });

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
  }, []);

  useEffect(() => {
    return () => {
      pausePolling();
      dispatch({ type: 'RESET_JOIN_STATE' });
    };
  }, [pausePolling]);

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderLoading = () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-stone-800 shadow-2xl">
        <CardContent className="p-8 text-center">
          <motion.div
            className="text-6xl mb-4 dungeon-icon-glow"
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{
              rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
              scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            }}
          >
            🕯️
          </motion.div>
          <h3 className="text-2xl font-bold text-amber-300 mb-2">Memuat Turnamen...</h3>
          <p className="text-stone-300">Mohon tunggu sebentar</p>
          <motion.div
            className="mt-4 flex justify-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-amber-500 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );

  const renderEmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <Card className="border-4 border-amber-700/50 bg-gradient-to-br from-stone-900/90 via-amber-950/30 to-stone-800/80 backdrop-blur-sm shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-yellow-500 rounded-full blur-3xl" />
        </div>

        <CardContent className="p-8 sm:p-12 relative z-10">
          <motion.div
            className="text-8xl mb-6"
            animate={{
              y: [0, -10, 0],
              rotate: [0, 5, -5, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            🏆
          </motion.div>
          <h3 className="text-3xl font-bold text-amber-300 mb-3 dungeon-glow-text">
            Belum Ada Turnamen
          </h3>
          <p className="text-stone-300 mb-8 text-lg">
            Jadilah yang pertama membuat turnamen dan buktikan kehebatanmu!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => setShowCreateSheet(true)}
              className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-900 font-bold text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <span className="text-2xl mr-2">⚔️</span>
              Buat Turnamen Baru
            </Button>

            <Button
              onClick={loadTournaments}
              variant="outline"
              className="border-2 border-amber-600 text-amber-300 hover:bg-amber-900/30 font-semibold px-6 py-6"
            >
              🔄 Refresh
            </Button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="p-4 bg-stone-950/50 rounded-lg border border-amber-700/30">
              <div className="text-2xl mb-1">👥</div>
              <div className="text-sm text-stone-400">Max Peserta</div>
              <div className="text-xl font-bold text-amber-300">8</div>
            </div>
            <div className="p-4 bg-stone-950/50 rounded-lg border border-amber-700/30">
              <div className="text-2xl mb-1">🏛️</div>
              <div className="text-sm text-stone-400">Max Grup</div>
              <div className="text-xl font-bold text-amber-300">4</div>
            </div>
            <div className="p-4 bg-stone-950/50 rounded-lg border border-amber-700/30">
              <div className="text-2xl mb-1">🎮</div>
              <div className="text-sm text-stone-400">Per Grup</div>
              <div className="text-xl font-bold text-amber-300">2</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const TournamentCard = memo(({ tournament }: { tournament: TournamentData }) => {
    const statusInfo = TOURNAMENT_STATUS[tournament.status as keyof typeof TOURNAMENT_STATUS];
    const totalParticipants = tournament.groups.reduce((sum, group) => sum + group.participants.length, 0);
    const isFull = totalParticipants >= 8;
    const canJoin = tournament.status === 'waiting' && !isFull;
    const isThisTournamentJoining = state.joiningMap.get(tournament.id) || false;
    const participantPercentage = (totalParticipants / 8) * 100;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: 1.03, y: -5 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <Card className="border-2 border-amber-700/50 bg-gradient-to-br from-stone-900/95 via-amber-950/20 to-stone-800/90 hover:border-amber-600 hover:shadow-2xl hover:shadow-amber-900/50 transition-all duration-300 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/20 to-transparent rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-amber-500/20 to-transparent rounded-tr-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <CardHeader className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl sm:text-2xl text-amber-300 truncate font-bold flex items-center gap-2">
                  <span className="text-2xl">⚔️</span>
                  {tournament.name}
                </CardTitle>
                {/* ✅ Fixed: Removed 'block' class */}
                <CardDescription className="text-stone-400 mt-1 flex items-center gap-2 text-sm">
                  <span className="text-amber-500">#{tournament.id}</span>
                  <span>•</span>
                  <span>Round {tournament.current_round}</span>
                </CardDescription>
              </div>
              <Badge className={`bg-gradient-to-r ${statusInfo.gradient} text-white flex-shrink-0 px-3 py-1 shadow-lg`}>
                {statusInfo.icon} {statusInfo.label}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Progress Peserta</span>
                <span className="text-amber-300 font-bold">{totalParticipants}/8</span>
              </div>
              <div className="h-3 bg-stone-950/50 rounded-full overflow-hidden border border-stone-700/50">
                <motion.div
                  className={`h-full ${
                    participantPercentage === 100
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${participantPercentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-stone-950/50 rounded-lg border border-stone-700/50 hover:border-amber-700/50 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">👥</span>
                  <span className="text-xs text-stone-400">Peserta</span>
                </div>
                <div className="text-xl font-bold text-amber-300">
                  {totalParticipants}<span className="text-sm text-stone-500">/8</span>
                </div>
              </div>

              <div className="p-3 bg-stone-950/50 rounded-lg border border-stone-700/50 hover:border-indigo-700/50 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🏛️</span>
                  <span className="text-xs text-stone-400">Grup</span>
                </div>
                <div className="text-xl font-bold text-indigo-300">
                  {tournament.groups.length}<span className="text-sm text-stone-500">/4</span>
                </div>
              </div>
            </div>

            {tournament.groups.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-stone-300 flex items-center gap-2">
                  <span>📋</span>
                  <span>Grup Terdaftar</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {tournament.groups.map((group, index) => (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-2.5 bg-gradient-to-r from-stone-950/50 to-stone-900/30 rounded-lg border border-stone-700/30 hover:border-amber-700/50 transition-all group/item"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-amber-400">🛡️</span>
                        <span className="text-amber-200 truncate font-medium">{group.name}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs flex-shrink-0 ${
                          group.participants.length === 2
                            ? 'border-green-600 text-green-300 bg-green-950/30'
                            : 'border-yellow-600 text-yellow-300 bg-yellow-950/30'
                        }`}
                      >
                        {group.participants.length}/2
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              {canJoin ? (
                <Button
                  onClick={() => handleTournamentSelect(tournament)}
                  disabled={isThisTournamentJoining}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-base py-6 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <>
                      <span className="text-xl mr-2">🎮</span>
                      Gabung Turnamen
                    </>
                  )}
                </Button>
              ) : isFull ? (
                <Button
                  disabled
                  className="w-full bg-stone-700 text-stone-400 cursor-not-allowed font-bold text-base py-6"
                >
                  <span className="text-xl mr-2">🚫</span>
                  Turnamen Penuh
                </Button>
              ) : (
                <Button
                  onClick={() => router.visit(`/game/tournament/${tournament.id}`)}
                  variant="outline"
                  className="w-full border-2 border-amber-600 text-amber-300 hover:bg-amber-900/30 font-bold text-base py-6 transition-all duration-300"
                >
                  <span className="text-xl mr-2">👁️</span>
                  Lihat Detail
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  });

  TournamentCard.displayName = 'TournamentCard';

    // ============================================
  // CREATE TOURNAMENT SHEET (Enhanced UI)
  // ============================================
  const renderCreateSheet = () => (
    <AnimatePresence>
      {showCreateSheet && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
            onClick={handleCloseCreateSheet}
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-gradient-to-br from-stone-900 via-amber-950/30 to-stone-800 border-l-4 border-amber-700 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between sticky top-0 bg-stone-900/95 backdrop-blur-sm py-3 -mx-6 px-6 border-b border-amber-700/30">
                <motion.h2
                  className="text-2xl sm:text-3xl font-bold text-amber-300 flex items-center gap-2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                >
                  <span className="text-3xl">🏆</span>
                  Buat Turnamen Baru
                </motion.h2>
                <Button
                  onClick={handleCloseCreateSheet}
                  variant="ghost"
                  size="sm"
                  className="text-stone-400 hover:text-stone-200 hover:bg-stone-800/50"
                >
                  <span className="text-2xl">✕</span>
                </Button>
              </div>

              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-900/50 border-2 border-red-700 rounded-lg text-red-200 text-sm flex items-start gap-3"
                >
                  <span className="text-xl">⚠️</span>
                  <span className="flex-1">{error}</span>
                </motion.div>
              )}

              {/* Form */}
              <div className="space-y-5">
                {/* Tournament Name Input */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <label className="text-sm font-semibold text-stone-300 mb-2 flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    Nama Turnamen <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value.slice(0, 50))}
                    placeholder="Contoh: Turnamen Coding Rumah 2025"
                    className="w-full px-4 py-3 bg-stone-950/50 border-2 border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20 transition-all"
                    maxLength={50}
                    autoFocus
                  />
                  <p className="text-xs text-stone-500 mt-2 flex items-center justify-between">
                    <span>Min. 5 karakter, maks. 50 karakter</span>
                    <span className={tournamentName.length > 45 ? 'text-amber-400' : ''}>{tournamentName.length}/50</span>
                  </p>
                </motion.div>

                {/* Tournament Rules Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-5 bg-gradient-to-br from-indigo-900/40 to-purple-900/30 border-2 border-indigo-700/50 rounded-lg space-y-3"
                >
                  <h3 className="text-base font-semibold text-indigo-200 flex items-center gap-2">
                    <span className="text-xl">📋</span>
                    Aturan Turnamen
                  </h3>
                  <ul className="text-sm text-indigo-100 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">⚔️</span>
                      <span>Maksimal <strong className="text-amber-300">4 grup</strong> dengan total <strong className="text-amber-300">8 peserta</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">👥</span>
                      <span>Setiap grup terdiri dari <strong className="text-amber-300">2 orang</strong> (Defuser & Expert)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">🎯</span>
                      <span><strong className="text-amber-300">3 Tahap</strong>: Kualifikasi → Semifinal → Final</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">⏱️</span>
                      <span>Sistem eliminasi berdasarkan <strong className="text-amber-300">waktu tercepat</strong></span>
                    </li>
                  </ul>
                </motion.div>

                {/* Tournament Stats Preview */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-3 gap-3"
                >
                  <div className="p-4 bg-stone-950/50 rounded-lg border border-amber-700/30 text-center">
                    <div className="text-3xl mb-2">👥</div>
                    <div className="text-xs text-stone-400 mb-1">Max Peserta</div>
                    <div className="text-2xl font-bold text-amber-300">8</div>
                  </div>
                  <div className="p-4 bg-stone-950/50 rounded-lg border border-amber-700/30 text-center">
                    <div className="text-3xl mb-2">🏛️</div>
                    <div className="text-xs text-stone-400 mb-1">Max Grup</div>
                    <div className="text-2xl font-bold text-amber-300">4</div>
                  </div>
                  <div className="p-4 bg-stone-950/50 rounded-lg border border-amber-700/30 text-center">
                    <div className="text-3xl mb-2">⏱️</div>
                    <div className="text-xs text-stone-400 mb-1">Waktu</div>
                    <div className="text-2xl font-bold text-amber-300">30m</div>
                  </div>
                </motion.div>
              </div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3 pt-4 sticky bottom-0 bg-stone-900/95 backdrop-blur-sm py-4 -mx-6 px-6 border-t border-amber-700/30"
              >
                <Button
                  onClick={createTournament}
                  disabled={!tournamentName.trim() || tournamentName.trim().length < 5 || state.creating}
                  className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-900 font-bold py-4 text-base shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.creating ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block mr-2 text-xl"
                      >
                        ⚙️
                      </motion.span>
                      Membuat Turnamen...
                    </>
                  ) : (
                    <>
                      <span className="text-xl mr-2">🎮</span>
                      Buat Turnamen
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCloseCreateSheet}
                  variant="outline"
                  className="w-full border-2 border-stone-600 text-stone-300 hover:bg-stone-800/50 font-semibold py-4"
                >
                  Batal
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // ============================================
  // JOIN TOURNAMENT SHEET (Enhanced UI)
  // ============================================
  const renderJoinSheet = () => (
    <AnimatePresence>
      {showJoinSheet && selectedTournament && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
            onClick={handleCloseJoinSheet}
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-gradient-to-br from-stone-900 via-emerald-950/30 to-stone-800 border-l-4 border-emerald-700 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between sticky top-0 bg-stone-900/95 backdrop-blur-sm py-3 -mx-6 px-6 border-b border-emerald-700/30">
                <motion.h2
                  className="text-2xl sm:text-3xl font-bold text-emerald-300 flex items-center gap-2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                >
                  <span className="text-3xl">🎮</span>
                  Gabung Turnamen
                </motion.h2>
                <Button
                  onClick={handleCloseJoinSheet}
                  variant="ghost"
                  size="sm"
                  className="text-stone-400 hover:text-stone-200 hover:bg-stone-800/50"
                >
                  <span className="text-2xl">✕</span>
                </Button>
              </div>

              {/* Tournament Info Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-gradient-to-br from-stone-950/70 to-amber-950/30 border-2 border-amber-700/50 rounded-lg space-y-3"
              >
                <h3 className="text-xl font-bold text-amber-300 flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  {selectedTournament.name}
                </h3>
                <div className="flex items-center gap-6 text-sm text-stone-400">
                  <span className="flex items-center gap-1">
                    <span className="text-lg">👥</span>
                    {selectedTournament.groups.reduce((sum, g) => sum + g.participants.length, 0)}/8 Peserta
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-lg">🏛️</span>
                    {selectedTournament.groups.length}/4 Grup
                  </span>
                </div>
              </motion.div>

              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-900/50 border-2 border-red-700 rounded-lg text-red-200 text-sm flex items-start gap-3"
                >
                  <span className="text-xl">⚠️</span>
                  <span className="flex-1">{error}</span>
                </motion.div>
              )}

              {/* Form */}
              <div className="space-y-5">
                {/* Group Name Input */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <label className="text-sm font-semibold text-stone-300 mb-2 flex items-center gap-2">
                    <span className="text-lg">🛡️</span>
                    Nama Grup <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value.slice(0, CONFIG.MAX_GROUP_NAME_LENGTH))}
                    placeholder="Contoh: Tim Rocket"
                    className="w-full px-4 py-3 bg-stone-950/50 border-2 border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all"
                    maxLength={CONFIG.MAX_GROUP_NAME_LENGTH}
                    autoFocus
                  />
                  <p className="text-xs text-stone-500 mt-2 flex items-center justify-between">
                    <span>Buat grup baru atau join grup yang ada</span>
                    <span className={groupName.length > 25 ? 'text-amber-400' : ''}>{groupName.length}/{CONFIG.MAX_GROUP_NAME_LENGTH}</span>
                  </p>
                </motion.div>

                {/* Nickname Input */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="text-sm font-semibold text-stone-300 mb-2 flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    Nickname <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.slice(0, 50))}
                    placeholder="Nama tampilan Anda"
                    className="w-full px-4 py-3 bg-stone-950/50 border-2 border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all"
                    maxLength={50}
                  />
                </motion.div>

                {/* Role Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <label className="text-sm font-semibold text-stone-300 mb-3 flex items-center gap-2">
                    <span className="text-lg">🎭</span>
                    Pilih Role <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setSelectedRole('defuser')}
                      className={`p-5 rounded-xl border-2 transition-all duration-300 ${
                        selectedRole === 'defuser'
                          ? 'border-emerald-600 bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 text-emerald-100 shadow-lg shadow-emerald-900/50 scale-105'
                          : 'border-stone-700 bg-stone-950/30 text-stone-400 hover:border-stone-600 hover:bg-stone-900/50'
                      }`}
                    >
                      <div className="text-4xl mb-2">💣</div>
                      <div className="font-bold text-base mb-1">Defuser</div>
                      <div className="text-xs opacity-80">Pemecah Masalah</div>
                    </button>

                    <button
                      onClick={() => setSelectedRole('expert')}
                      className={`p-5 rounded-xl border-2 transition-all duration-300 ${
                        selectedRole === 'expert'
                          ? 'border-emerald-600 bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 text-emerald-100 shadow-lg shadow-emerald-900/50 scale-105'
                          : 'border-stone-700 bg-stone-950/30 text-stone-400 hover:border-stone-600 hover:bg-stone-900/50'
                      }`}
                    >
                      <div className="text-4xl mb-2">📖</div>
                      <div className="font-bold text-base mb-1">Expert</div>
                      <div className="text-xs opacity-80">Pemberi Panduan</div>
                    </button>
                  </div>
                </motion.div>

                {/* Tips Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-4 bg-gradient-to-br from-blue-900/40 to-cyan-900/30 border-2 border-blue-700/50 rounded-lg space-y-2"
                >
                  <h3 className="text-sm font-semibold text-blue-200 flex items-center gap-2">
                    <span className="text-lg">💡</span>
                    Tips
                  </h3>
                  <ul className="text-xs text-blue-100 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>Nama grup harus <strong>unik</strong> dalam turnamen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>Setiap grup butuh <strong>1 Defuser dan 1 Expert</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>Diskusikan strategi dengan partner Anda</span>
                    </li>
                  </ul>
                </motion.div>
              </div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3 pt-4 sticky bottom-0 bg-stone-900/95 backdrop-blur-sm py-4 -mx-6 px-6 border-t border-emerald-700/30"
              >
                <Button
                  onClick={() => joinTournament(selectedTournament.id)}
                  disabled={!canJoinTournament || isJoining}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold py-4 text-base shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block mr-2 text-xl"
                      >
                        ⚙️
                      </motion.span>
                      Bergabung...
                    </>
                  ) : (
                    <>
                      <span className="text-xl mr-2">🎮</span>
                      Gabung Sekarang
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCloseJoinSheet}
                  variant="outline"
                  className="w-full border-2 border-stone-600 text-stone-300 hover:bg-stone-800/50 font-semibold py-4"
                >
                  Batal
                </Button>
              </motion.div>
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

      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-8 px-4 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-600/3 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <Card className="border-4 border-amber-700 bg-gradient-to-r from-stone-900/95 via-amber-950/50 to-stone-900/95 backdrop-blur-sm shadow-2xl overflow-hidden relative">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(251, 191, 36, 0.15) 1px, transparent 0)',
                  backgroundSize: '40px 40px'
                }} />
              </div>

              <CardHeader className="relative z-10">
                {/* Torches */}
                <div className="absolute top-4 left-4 text-3xl">
                  <span ref={setTorchRef(0)} className="dungeon-torch-flicker drop-shadow-lg">
                    🔥
                  </span>
                </div>
                <div className="absolute top-4 right-4 text-3xl">
                  <span ref={setTorchRef(1)} className="dungeon-torch-flicker drop-shadow-lg">
                    🔥
                  </span>
                </div>

                <div className="text-center pt-8 pb-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    className="text-6xl mb-4"
                  >
                    ⚔️
                  </motion.div>
                  <CardTitle className="text-4xl sm:text-5xl font-bold text-amber-300 mb-3 dungeon-glow-text">
                    Tournament Lobby
                  </CardTitle>
                  <CardDescription className="text-stone-300 text-lg sm:text-xl">
                    Bergabung atau buat turnamen coding dungeon!
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-8">
                <Button
                  onClick={() => setShowCreateSheet(true)}
                  disabled={state.creating}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-900 font-bold text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <span className="text-xl mr-2">⚔️</span>
                  Buat Turnamen Baru
                </Button>
                <Button
                  onClick={loadTournaments}
                  disabled={state.loading}
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-amber-600 text-amber-300 hover:bg-amber-900/30 font-semibold px-8 py-6"
                >
                  {state.loading ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block mr-2"
                      >
                        ⚙️
                      </motion.span>
                      Memuat...
                    </>
                  ) : (
                    <>🔄 Refresh</>
                  )}
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
            <div className="space-y-10">
              {/* Active Tournaments */}
              {activeTournaments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <motion.h2
                      className="text-3xl font-bold text-amber-300 flex items-center gap-3"
                      initial={{ x: -20 }}
                      animate={{ x: 0 }}
                    >
                      <span className="text-4xl">⚔️</span>
                      <span>Turnamen Aktif</span>
                    </motion.h2>
                    <Badge
                      variant="outline"
                      className="text-amber-300 border-amber-600 bg-amber-950/30 text-lg px-4 py-1"
                    >
                      {activeTournaments.length}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                      {activeTournaments.map((tournament) => (
                        <TournamentCard key={tournament.id} tournament={tournament} />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* Completed Tournaments */}
              {completedTournaments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <motion.h2
                      className="text-3xl font-bold text-emerald-300 flex items-center gap-3"
                      initial={{ x: -20 }}
                      animate={{ x: 0 }}
                    >
                      <span className="text-4xl">✅</span>
                      <span>Turnamen Selesai</span>
                    </motion.h2>
                    <Badge
                      variant="outline"
                      className="text-emerald-300 border-emerald-600 bg-emerald-950/30 text-lg px-4 py-1"
                    >
                      {completedTournaments.length}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                      {completedTournaments.slice(0, CONFIG.MAX_TOURNAMENT_DISPLAY).map((tournament) => (
                        <TournamentCard key={tournament.id} tournament={tournament} />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sheets */}
      {renderCreateSheet()}
      {renderJoinSheet()}

      {/* Custom Styles */}
      <style>{`
        /* Torch Flicker Animation */
        .dungeon-torch-flicker {
          display: inline-block;
          animation: torch-flicker 2s infinite;
          filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.5));
        }

        @keyframes torch-flicker {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          25% {
            opacity: 0.85;
            transform: scale(0.98);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.02);
          }
          75% {
            opacity: 0.95;
            transform: scale(0.99);
          }
        }

        /* Glow Text Animation */
        .dungeon-glow-text {
          text-shadow:
            0 0 10px rgba(251, 191, 36, 0.5),
            0 0 20px rgba(251, 191, 36, 0.3),
            0 0 30px rgba(251, 191, 36, 0.2);
          animation: text-glow 3s ease-in-out infinite;
        }

        @keyframes text-glow {
          0%, 100% {
            text-shadow:
              0 0 10px rgba(251, 191, 36, 0.5),
              0 0 20px rgba(251, 191, 36, 0.3),
              0 0 30px rgba(251, 191, 36, 0.2);
          }
          50% {
            text-shadow:
              0 0 15px rgba(251, 191, 36, 0.7),
              0 0 30px rgba(251, 191, 36, 0.5),
              0 0 45px rgba(251, 191, 36, 0.3);
          }
        }

        /* Icon Glow */
        .dungeon-icon-glow {
          filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.6));
        }

        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.5);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(251, 191, 36, 0.5);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(251, 191, 36, 0.7);
        }

        /* Smooth transitions for all interactive elements */
        button, input, a {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Focus ring styling */
        *:focus-visible {
          outline: 2px solid rgba(251, 191, 36, 0.5);
          outline-offset: 2px;
        }

        /* Mobile touch optimization */
        @media (hover: none) and (pointer: coarse) {
          button:active {
            transform: scale(0.97);
          }
        }

        /* Loading animation dots */
        @keyframes loading-dots {
          0%, 20% {
            color: rgba(251, 191, 36, 0.3);
            text-shadow: 0 0 0 rgba(251, 191, 36, 0);
          }
          40% {
            color: rgba(251, 191, 36, 1);
            text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
          }
          60%, 100% {
            color: rgba(251, 191, 36, 0.3);
            text-shadow: 0 0 0 rgba(251, 191, 36, 0);
          }
        }
      `}</style>
    </AuthenticatedLayout>
  );
}



  // ... (renderCreateSheet dan renderJoinSheet sama seperti Part 4, tidak ada perubahan)
