import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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

// ========================================
// TYPES & INTERFACES
// ========================================
interface Props {
  tournamentId: number;
  groupId?: number;
  debug?: {
    tournament_exists: boolean;
    tournament_name: string;
    user_id: number;
    timestamp: string;
  };
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
      role: string;
    }>;
  };
  session: {
    id: number;
    team_code: string;
    status: string;
    participants: any[];
    attempts: any[];
  };
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

// ========================================
// CONSTANTS
// ========================================
const POLLING_INTERVAL = 5000;
const MAX_RETRY_ATTEMPTS = 3;
const MOBILE_BREAKPOINT = 768;

const STATUS_CONFIG = {
  waiting: {
    color: 'bg-gradient-to-r from-gray-600 to-gray-700',
    text: 'Menunggu',
    icon: '⏳',
    glow: false
  },
  ready: {
    color: 'bg-gradient-to-r from-blue-600 to-cyan-600',
    text: 'Siap',
    icon: '✅',
    glow: false
  },
  playing: {
    color: 'bg-gradient-to-r from-yellow-600 to-amber-600',
    text: 'Bermain',
    icon: '⚔️',
    glow: true
  },
  completed: {
    color: 'bg-gradient-to-r from-green-600 to-emerald-600',
    text: 'Selesai',
    icon: '✅',
    glow: false
  },
  eliminated: {
    color: 'bg-gradient-to-r from-red-600 to-rose-600',
    text: 'Tersingkir',
    icon: '💀',
    glow: true
  },
  champion: {
    color: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    text: 'Juara',
    icon: '👑',
    glow: true
  },
} as const;

// ========================================
// CUSTOM HOOKS
// ========================================
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// ========================================
// ANIMATION VARIANTS
// ========================================
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 }
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.08 }
  }
};

// ========================================
// GLOW WRAPPER COMPONENT
// ========================================
const GlowWrapper = memo(({
  children,
  type = 'default',
  className = ''
}: {
  children: React.ReactNode;
  type?: 'default' | 'urgent';
  className?: string;
}) => {
  const glowVariants = {
    default: {
      boxShadow: [
        '0 0 20px rgba(255, 215, 0, 0.4)',
        '0 0 40px rgba(255, 215, 0, 0.8)',
        '0 0 20px rgba(255, 215, 0, 0.4)'
      ]
    },
    urgent: {
      scale: [1, 1.02, 1],
      boxShadow: [
        '0 0 20px rgba(239, 68, 68, 0.5)',
        '0 0 40px rgba(239, 68, 68, 0.9)',
        '0 0 20px rgba(239, 68, 68, 0.5)'
      ]
    }
  };

  return (
    <motion.div
      animate={glowVariants[type]}
      transition={{
        duration: type === 'urgent' ? 1.5 : 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

GlowWrapper.displayName = 'GlowWrapper';

// ========================================
// MEMOIZED COMPONENTS
// ========================================
const StatusBadge = memo(({ status, className = '' }: { status: string; className?: string }) => {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.waiting;
  const isMobile = useIsMobile();

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileTap={{ scale: 0.95 }}
    >
      <Badge className={`${config.color} text-white flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 shadow-lg ${className}`}>
        <span className={isMobile ? 'text-sm' : 'text-base'}>{config.icon}</span>
        <span className="font-semibold">{config.text}</span>
      </Badge>
    </motion.div>
  );
});

StatusBadge.displayName = 'StatusBadge';

const LoadingSpinner = memo(() => (
  <motion.div className="flex items-center justify-center space-x-2">
    {[0, 0.2, 0.4].map((delay, i) => (
      <motion.div
        key={i}
        className="w-2 h-2 sm:w-3 sm:h-3 bg-amber-500 rounded-full"
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay }}
      />
    ))}
  </motion.div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

const TeamMemberCard = memo(({
  participant,
  isCurrentUser,
  isMobile
}: {
  participant: any;
  isCurrentUser: boolean;
  isMobile: boolean;
}) => (
  <motion.div
    variants={fadeInUp}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <Card
      className={`border-2 transition-all duration-300 ${
        isCurrentUser
          ? 'border-green-500 bg-gradient-to-br from-green-900/40 to-stone-900 shadow-lg'
          : 'border-gray-600 bg-gradient-to-br from-gray-900/40 to-stone-900'
      }`}
    >
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} text-center`}>
        <motion.div
          className={`${isMobile ? 'text-3xl' : 'text-4xl'} mb-2 sm:mb-3`}
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {participant.role === 'defuser' ? '💣' : '📖'}
        </motion.div>
        <h4 className={`font-bold ${isMobile ? 'text-base' : 'text-lg sm:text-xl'} text-white mb-2`}>
          {participant.nickname}
          {isCurrentUser && (
            <span className="text-green-300 text-xs sm:text-sm ml-2">(Anda)</span>
          )}
        </h4>
        <Badge className={`text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 ${
          participant.role === 'defuser'
            ? 'bg-gradient-to-r from-red-600 to-orange-600'
            : 'bg-gradient-to-r from-blue-600 to-cyan-600'
        } text-white`}>
          {participant.role === 'defuser' ? 'Penjinakkan Bom' : 'Ahli Manual'}
        </Badge>
        <p className={`mt-2 sm:mt-3 ${isMobile ? 'text-xs' : 'text-sm'} text-gray-300`}>
          {participant.role === 'defuser'
            ? 'Menangani perangkat berbahaya'
            : 'Membimbing proses penjinakkan'
          }
        </p>
      </CardContent>
    </Card>
  </motion.div>
));

TeamMemberCard.displayName = 'TeamMemberCard';

// ========================================
// MAIN COMPONENT
// ========================================
export default function SesiTurnamen({ tournamentId, groupId, debug }: Props) {
  const { auth } = usePage().props as any;
  const isMobile = useIsMobile();

  // State Management
  const [tournamentData, setTournamentData] = useState<TournamentSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [gameStarted, setGameStarted] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(!isMobile);
  const [retryCount, setRetryCount] = useState(0);

  // ========================================
  // MEMOIZED VALUES
  // ========================================
  const userRole = useMemo(() =>
    tournamentData?.group.participants?.find(p => p.user_id === auth?.user?.id)?.role,
    [tournamentData, auth?.user?.id]
  );

  const groupStatus = useMemo(() => ({
    isEliminated: tournamentData?.group.status === 'eliminated',
    isChampion: tournamentData?.group.status === 'champion',
    isWaiting: ['ready', 'waiting'].includes(tournamentData?.group.status || ''),
    isPlaying: tournamentData?.group.status === 'playing' && tournamentData?.gameState,
  }), [tournamentData]);

  // ========================================
  // CALLBACKS
  // ========================================
  const loadTournamentSession = useCallback(async () => {
    if (!tournamentId || isNaN(Number(tournamentId))) {
      setError('ID turnamen tidak valid');
      setLoading(false);
      return;
    }

    try {
      const response = await gameApi.getTournamentSession(Number(tournamentId), groupId);

      if (!response || !response.tournament || !response.group) {
        throw new Error('Data turnamen tidak valid');
      }

      const normalizedData: TournamentSessionData = {
        tournament: {
          id: response.tournament.id,
          name: response.tournament.name,
          status: response.tournament.status,
          current_round: response.tournament.current_round,
        },
        group: {
          id: response.group.id,
          name: response.group.name,
          status: response.group.status,
          completion_time: response.group.completion_time,
          rank: response.group.rank,
          participants: Array.isArray(response.group.participants) ? response.group.participants : [],
        },
        session: {
          id: response.session?.id || 0,
          team_code: response.session?.team_code || '',
          status: response.session?.status || 'waiting',
          participants: Array.isArray(response.session?.participants) ? response.session.participants : [],
          attempts: Array.isArray(response.session?.attempts) ? response.session.attempts : [],
        },
        gameState: response.gameState || null,
        leaderboard: Array.isArray(response.leaderboard) ? response.leaderboard : [],
      };

      setTournamentData(normalizedData);
      setError('');
      setRetryCount(0);
      setLoading(false);

    } catch (error: any) {
      console.error('❌ Gagal memuat data turnamen:', error);

      let errorMessage = 'Gagal memuat sesi turnamen';

      if (error.response?.status === 404) {
        errorMessage = 'Turnamen tidak ditemukan atau Anda tidak memiliki akses';
      } else if (error.response?.status === 403) {
        errorMessage = 'Akses ditolak. Anda bukan peserta turnamen ini';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setError(errorMessage);
      setLoading(false);

      // Auto-retry dengan exponential backoff
      if (retryCount < MAX_RETRY_ATTEMPTS && ![404, 403].includes(error.response?.status)) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          setLoading(true);
          loadTournamentSession();
        }, Math.pow(2, retryCount) * 1000);
      }
    }
  }, [tournamentId, groupId, retryCount]);

  const handleGameStateUpdate = useCallback((updatedGameState: any) => {
    if (tournamentData) {
      setTournamentData({
        ...tournamentData,
        gameState: updatedGameState
      });
    }
  }, [tournamentData]);

  const handleAttemptSubmit = useCallback(async (inputValue: string) => {
    if (!tournamentData?.session?.id) {
      toast.error('Tidak ada sesi yang tersedia');
      return;
    }

    try {
      const result = await gameApi.submitAttempt(
        tournamentData.session.id,
        tournamentData.gameState?.puzzle?.key || '',
        inputValue
      );

      if (result.gameComplete) {
        toast.success('Ronde turnamen selesai!');
        await gameApi.completeTournamentSession(tournamentData.session.id);
        await loadTournamentSession();
      } else {
        handleGameStateUpdate(result.session);
      }
    } catch (error: any) {
      console.error('❌ Percobaan turnamen gagal:', error);
      toast.error('Gagal mengirim percobaan');
    }
  }, [tournamentData, handleGameStateUpdate, loadTournamentSession]);

  const startGame = useCallback(async () => {
    if (!tournamentData?.session?.id) return;

    try {
      setGameStarted(true);
      await gameApi.startSession(tournamentData.session.id);
      await loadTournamentSession();
      toast.success('Permainan dimulai!');
    } catch (error: any) {
      console.error('❌ Gagal memulai permainan:', error);
      toast.error('Gagal memulai sesi permainan');
      setGameStarted(false);
    }
  }, [tournamentData, loadTournamentSession]);

  const completeSession = useCallback(async () => {
    if (!tournamentData?.session?.id) return;

    try {
      await gameApi.completeTournamentSession(tournamentData.session.id);
      await loadTournamentSession();
      router.visit(`/game/tournament/${tournamentId}/leaderboard`);
    } catch (error: any) {
      console.error('❌ Gagal menyelesaikan sesi:', error);
      toast.error('Gagal menyelesaikan sesi');
    }
  }, [tournamentData, tournamentId, loadTournamentSession]);

  const leaveTournament = useCallback(async () => {
    if (!tournamentData?.tournament?.id) return;

    try {
      await gameApi.leaveTournament(tournamentData.tournament.id);
      toast.success('Berhasil keluar dari turnamen');
      router.visit('/game/tournament');
    } catch (error: any) {
      console.error('❌ Gagal keluar dari turnamen:', error);
      toast.error('Gagal keluar dari turnamen');
    }
  }, [tournamentData]);

  const handleRetry = useCallback(() => {
    setError('');
    setLoading(true);
    setRetryCount(0);
    loadTournamentSession();
  }, [loadTournamentSession]);

  const handleBackToLobby = useCallback(() => {
    router.visit('/game/tournament');
  }, []);

  // ========================================
  // EFFECTS
  // ========================================
  useEffect(() => {
    loadTournamentSession();
    const interval = setInterval(loadTournamentSession, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [loadTournamentSession]);

  useEffect(() => {
    // Prevent pull-to-refresh on mobile
    if (isMobile) {
      document.body.style.overscrollBehavior = 'contain';
      return () => {
        document.body.style.overscrollBehavior = 'auto';
      };
    }
  }, [isMobile]);

  // ========================================
  // ERROR STATES
  // ========================================
  if (!tournamentId || isNaN(Number(tournamentId))) {
    return (
      <AuthenticatedLayout header={<h2 className="text-lg sm:text-xl font-semibold text-red-300">❌ Kesalahan Turnamen</h2>}>
        <Head title="Kesalahan Turnamen" />
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-purple-900 to-amber-900 flex items-center justify-center p-4">
          <motion.div variants={scaleIn} initial="initial" animate="animate">
            <Card className="border-4 border-red-600 bg-red-900/30 max-w-md">
              <CardContent className="p-6 sm:p-8 text-center">
                <motion.div
                  className="text-6xl sm:text-8xl mb-4"
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  🚫
                </motion.div>
                <h3 className="text-xl sm:text-2xl font-bold text-red-300 mb-4">Sesi Tidak Valid</h3>
                <p className="text-red-200 mb-6 text-sm sm:text-base">ID turnamen hilang atau tidak valid</p>
                <Button
                  onClick={handleBackToLobby}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg w-full sm:w-auto touch-manipulation"
                >
                  Kembali ke Lobi
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </AuthenticatedLayout>
    );
  }

  // ========================================
  // LOADING STATE
  // ========================================
  if (loading) {
    return (
      <AuthenticatedLayout header={<h2 className="text-lg sm:text-xl font-semibold text-amber-300">🏆 Sesi Turnamen</h2>}>
        <Head title="Sesi Turnamen" />
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-purple-900 to-amber-900 flex items-center justify-center p-4">
          <motion.div variants={scaleIn} initial="initial" animate="animate">
            <Card className="bg-gradient-to-br from-stone-800 to-stone-900 border-4 border-amber-600 max-w-md w-full">
              <CardContent className="p-6 sm:p-8 text-center">
                <LoadingSpinner />
                <motion.h3
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl sm:text-2xl font-bold text-amber-300 mt-6 mb-2"
                >
                  Memuat Sesi Turnamen...
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm sm:text-base text-amber-200"
                >
                  Menyiapkan arena pertempuran Anda...
                </motion.p>
                {retryCount > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-amber-300 text-sm mt-4"
                  >
                    Percobaan ulang {retryCount}/{MAX_RETRY_ATTEMPTS}...
                  </motion.p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </AuthenticatedLayout>
    );
  }

  // ========================================
  // ERROR STATE
  // ========================================
  if (error || !tournamentData) {
    return (
      <AuthenticatedLayout header={<h2 className="text-lg sm:text-xl font-semibold text-red-300">❌ Kesalahan Turnamen</h2>}>
        <Head title="Kesalahan Turnamen" />
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-purple-900 to-amber-900 flex items-center justify-center p-4">
          <motion.div variants={scaleIn} initial="initial" animate="animate">
            <Card className="border-4 border-red-600 bg-red-900/30 max-w-md w-full">
              <CardContent className="p-6 sm:p-8 text-center">
                <motion.div
                  className="text-6xl sm:text-8xl mb-4"
                  animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ⚠️
                </motion.div>
                <h3 className="text-xl sm:text-2xl font-bold text-red-200 mb-4">Kesalahan Sesi Turnamen</h3>
                <p className="text-red-300 mb-6 text-sm sm:text-base">{error || 'Gagal memuat data turnamen'}</p>

                {retryCount > 0 && (
                  <p className="text-red-300 text-sm mb-4">
                    Gagal setelah {retryCount} percobaan
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    onClick={handleRetry}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg touch-manipulation"
                  >
                    {loading ? 'Mencoba Lagi...' : 'Coba Lagi'}
                  </Button>
                  <Button
                    onClick={handleBackToLobby}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg touch-manipulation"
                  >
                    Kembali ke Lobi
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </AuthenticatedLayout>
    );
  }

  // ========================================
  // MAIN RENDER
  // ========================================
  const { tournament, group, session, gameState, leaderboard } = tournamentData;

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm sm:text-base md:text-xl text-amber-300 truncate">
            🏆 {tournament.name}
          </h2>
          <div className="flex items-center gap-2 sm:gap-4">
            <Badge className="bg-purple-600 text-white text-xs sm:text-sm md:text-base px-2 sm:px-4 py-1 sm:py-2">
              Ronde {tournament.current_round}
            </Badge>
            {!isMobile && (
              <Button
                onClick={handleBackToLobby}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm touch-manipulation"
              >
                ← Lobi
              </Button>
            )}
          </div>
        </div>
      }
    >
      <Head title={`Turnamen: ${tournament.name}`} />

      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-purple-900 to-amber-900 py-4 sm:py-8 md:py-12 pb-24 sm:pb-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className={`grid ${showVoiceChat && !isMobile ? 'lg:grid-cols-4' : 'grid-cols-1'} gap-4 sm:gap-6`}
          >
            {/* Konten Utama */}
            <div className={`${showVoiceChat && !isMobile ? 'lg:col-span-3' : 'col-span-1'} space-y-4 sm:space-y-6`}>

              {/* Header Turnamen dengan Conditional Glow */}
              {groupStatus.isEliminated ? (
                <GlowWrapper type="urgent">
                  <motion.div variants={fadeInUp}>
                    <Card className="border-2 sm:border-4 border-red-600 bg-gradient-to-br from-red-900/40 to-stone-900 overflow-hidden shadow-xl sm:shadow-2xl">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                          <div className="flex-1">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-300 mb-2">{tournament.name}</h1>
                            <div className="flex flex-wrap gap-2 sm:gap-4">
                              <StatusBadge status={tournament.status} />
                              <Badge className="bg-green-700 text-green-100 text-xs sm:text-sm md:text-base px-2 sm:px-4 py-1 sm:py-2">
                                Ronde {tournament.current_round}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-green-300 mb-2">{group.name}</h2>
                            <StatusBadge status={group.status} />
                          </div>
                        </div>

                        {group.completion_time && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mt-4 text-center"
                          >
                            <div className="inline-flex items-center gap-2 bg-gray-800/50 px-4 sm:px-6 py-2 sm:py-3 rounded-xl">
                              <span className="text-xl sm:text-2xl">⏱️</span>
                              <span className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-300">
                                {Math.floor(group.completion_time / 60)}:{(group.completion_time % 60).toString().padStart(2, '0')}
                              </span>
                              {group.rank && (
                                <Badge className="bg-yellow-600 text-white ml-2 sm:ml-4 text-xs sm:text-sm">
                                  Peringkat #{group.rank}
                                </Badge>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </GlowWrapper>
              ) : (groupStatus.isChampion || groupStatus.isPlaying) ? (
                <GlowWrapper type="default">
                  <motion.div variants={fadeInUp}>
                    <Card className="border-2 sm:border-4 border-amber-600 bg-gradient-to-br from-amber-900/30 to-stone-900 overflow-hidden shadow-xl sm:shadow-2xl">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                          <div className="flex-1">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-300 mb-2">{tournament.name}</h1>
                            <div className="flex flex-wrap gap-2 sm:gap-4">
                              <StatusBadge status={tournament.status} />
                              <Badge className="bg-green-700 text-green-100 text-xs sm:text-sm md:text-base px-2 sm:px-4 py-1 sm:py-2">
                                Ronde {tournament.current_round}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-green-300 mb-2">{group.name}</h2>
                            <StatusBadge status={group.status} />
                          </div>
                        </div>

                        {group.completion_time && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mt-4 text-center"
                          >
                            <div className="inline-flex items-center gap-2 bg-gray-800/50 px-4 sm:px-6 py-2 sm:py-3 rounded-xl">
                              <span className="text-xl sm:text-2xl">⏱️</span>
                              <span className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-300">
                                {Math.floor(group.completion_time / 60)}:{(group.completion_time % 60).toString().padStart(2, '0')}
                              </span>
                              {group.rank && (
                                <Badge className="bg-yellow-600 text-white ml-2 sm:ml-4 text-xs sm:text-sm">
                                  Peringkat #{group.rank}
                                </Badge>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </GlowWrapper>
              ) : (
                <motion.div variants={fadeInUp}>
                  <Card className="border-2 sm:border-4 border-amber-600 bg-gradient-to-br from-amber-900/30 to-stone-900 overflow-hidden shadow-xl sm:shadow-2xl">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div className="flex-1">
                          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-300 mb-2">{tournament.name}</h1>
                          <div className="flex flex-wrap gap-2 sm:gap-4">
                            <StatusBadge status={tournament.status} />
                            <Badge className="bg-green-700 text-green-100 text-xs sm:text-sm md:text-base px-2 sm:px-4 py-1 sm:py-2">
                              Ronde {tournament.current_round}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-green-300 mb-2">{group.name}</h2>
                          <StatusBadge status={group.status} />
                        </div>
                      </div>

                      {group.completion_time && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="mt-4 text-center"
                        >
                          <div className="inline-flex items-center gap-2 bg-gray-800/50 px-4 sm:px-6 py-2 sm:py-3 rounded-xl">
                            <span className="text-xl sm:text-2xl">⏱️</span>
                            <span className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-300">
                              {Math.floor(group.completion_time / 60)}:{(group.completion_time % 60).toString().padStart(2, '0')}
                            </span>
                            {group.rank && (
                              <Badge className="bg-yellow-600 text-white ml-2 sm:ml-4 text-xs sm:text-sm">
                                Peringkat #{group.rank}
                              </Badge>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Status Menunggu */}
              <AnimatePresence mode="wait">
                {groupStatus.isWaiting && (
                  <motion.div
                    key="waiting"
                    variants={scaleIn}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Card className="border-2 sm:border-4 border-blue-600 bg-gradient-to-br from-blue-900/30 to-stone-900">
                      <CardContent className="p-6 sm:p-8 text-center">
                        <motion.div
                          className="text-6xl sm:text-8xl mb-4"
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        >
                          ⏳
                        </motion.div>
                        <h3 className="text-xl sm:text-2xl font-bold text-blue-300 mb-4">
                          {group.status === 'waiting' ? 'Menunggu Pemain' : 'Siap Bertarung!'}
                        </h3>
                        <p className="text-blue-200 text-sm sm:text-base md:text-lg mb-6">
                          {group.status === 'waiting'
                            ? 'Menunggu semua pemain bergabung...'
                            : 'Turnamen akan segera dimulai. Bersiaplah!'
                          }
                        </p>

                        <div className="bg-blue-800/30 p-4 rounded-lg max-w-md mx-auto">
                          <h4 className="text-blue-300 font-bold mb-3 text-sm sm:text-base">Tim Anda</h4>
                          <div className="space-y-2">
                            {group.participants?.map(participant => (
                              <div key={participant.id} className="flex items-center justify-between text-xs sm:text-sm">
                                <span className="text-blue-200 truncate">{participant.nickname}</span>
                                <Badge className={`${
                                  participant.role === 'defuser' ? 'bg-red-600' : 'bg-blue-600'
                                } text-white text-xs flex-shrink-0 ml-2`}>
                                  {participant.role === 'defuser' ? '💣' : '📖'}
                                </Badge>
                              </div>
                            )) || []}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Interface Permainan Aktif */}
                {groupStatus.isPlaying && (
                  <GlowWrapper type="default">
                    <motion.div
                      key="playing"
                      variants={scaleIn}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <Card className="border-2 sm:border-4 border-green-600 bg-gradient-to-br from-green-900/20 to-stone-900 overflow-hidden shadow-2xl">
                        <CardHeader className="p-4 sm:p-6">
                          <CardTitle className="text-green-300 text-center text-lg sm:text-xl md:text-2xl flex items-center justify-center gap-2">
                            <motion.span
                              animate={{ rotate: [0, -10, 10, 0] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              🎯
                            </motion.span>
                            TANTANGAN TURNAMEN AKTIF
                          </CardTitle>
                          <div className="text-center">
                            <Badge className="bg-red-600 text-white text-sm sm:text-base md:text-lg px-3 sm:px-4 py-1.5 sm:py-2">
                              ⚡ MODE KOMPETITIF ⚡
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <GamePlay
                            gameState={gameState}
                            role={userRole as 'defuser' | 'expert'}
                            onGameStateUpdate={handleGameStateUpdate}
                            onSubmitAttempt={handleAttemptSubmit}
                          />
                        </CardContent>
                      </Card>
                    </motion.div>
                  </GlowWrapper>
                )}

                {/* Status Tersingkir */}
                {groupStatus.isEliminated && (
                  <GlowWrapper type="urgent">
                    <motion.div
                      key="eliminated"
                      variants={scaleIn}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <Card className="border-2 sm:border-4 border-red-600 bg-gradient-to-br from-red-900/50 to-stone-900 overflow-hidden">
                        <CardContent className="p-6 sm:p-8 text-center">
                          <motion.div
                            className="text-6xl sm:text-8xl mb-4"
                            animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            💀
                          </motion.div>
                          <h2 className="text-3xl sm:text-4xl font-bold text-red-300 mb-4">TERSINGKIR</h2>
                          <p className="text-red-200 text-base sm:text-lg md:text-xl mb-6">
                            Guild Anda telah tersingkir dari turnamen.
                          </p>
                          <p className="text-red-300 text-sm sm:text-base">
                            Waktu Akhir: <strong>{Math.floor((group.completion_time || 0) / 60)}:{((group.completion_time || 0) % 60).toString().padStart(2, '0')}</strong>
                          </p>
                          <div className="mt-6">
                            <Button
                              onClick={handleBackToLobby}
                              className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-3 rounded-xl text-base sm:text-lg font-bold w-full sm:w-auto touch-manipulation"
                            >
                              Kembali ke Lobi Turnamen
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </GlowWrapper>
                )}

                {/* Status Juara */}
                {groupStatus.isChampion && (
                  <GlowWrapper type="default">
                    <motion.div
                      key="champion"
                      variants={scaleIn}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <Card className="border-2 sm:border-4 border-yellow-600 bg-gradient-to-br from-yellow-900/50 to-stone-900 overflow-hidden">
                        <CardContent className="p-6 sm:p-8 text-center">
                          <motion.div
                            className="text-6xl sm:text-8xl mb-4"
                            animate={{
                              scale: [1, 1.2, 1],
                              rotate: [0, -10, 10, 0]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            👑
                          </motion.div>
                          <h2 className="text-3xl sm:text-4xl font-bold text-yellow-300 mb-4">JUARA!</h2>
                          <p className="text-yellow-200 text-base sm:text-lg md:text-xl mb-6">
                            Selamat! Guild Anda telah memenangkan turnamen!
                          </p>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto mb-6">
                            <div className="bg-yellow-800/50 p-3 sm:p-4 rounded-lg">
                              <p className="text-yellow-100 font-bold text-xs sm:text-sm">Waktu Akhir</p>
                              <p className="text-lg sm:text-2xl font-bold text-yellow-300">
                                {Math.floor((group.completion_time || 0) / 60)}:{((group.completion_time || 0) % 60).toString().padStart(2, '0')}
                              </p>
                            </div>
                            <div className="bg-yellow-800/50 p-3 sm:p-4 rounded-lg">
                              <p className="text-yellow-100 font-bold text-xs sm:text-sm">Peringkat</p>
                              <p className="text-lg sm:text-2xl font-bold text-yellow-300">#1</p>
                            </div>
                          </div>
                          <Button
                            onClick={handleBackToLobby}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 sm:px-8 py-3 rounded-xl text-base sm:text-lg font-bold w-full sm:w-auto touch-manipulation"
                          >
                            Kembali ke Lobi
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </GlowWrapper>
                )}
              </AnimatePresence>

              {/* Anggota Tim */}
              <motion.div variants={fadeInUp}>
                <Card className="border-2 sm:border-4 border-blue-600 bg-gradient-to-br from-blue-900/30 to-stone-900">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-blue-300 text-base sm:text-lg md:text-xl">👥 Anggota Guild</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                      {group.participants?.map((participant) => (
                        <TeamMemberCard
                          key={participant.id}
                          participant={participant}
                          isCurrentUser={participant.user_id === auth?.user?.id}
                          isMobile={isMobile}
                        />
                      )) || []}

                      {/* Slot kosong */}
                      {Array.from({ length: Math.max(0, 2 - (group.participants?.length || 0)) }, (_, index) => (
                        <motion.div key={`empty-${index}`} variants={fadeInUp}>
                          <Card className="border-2 border-dashed border-gray-600 bg-gray-900/10">
                            <CardContent className={`${isMobile ? 'p-4' : 'p-6'} text-center`}>
                              <div className={`${isMobile ? 'text-3xl' : 'text-4xl'} mb-2 sm:mb-3 opacity-50`}>❓</div>
                              <h4 className={`font-bold ${isMobile ? 'text-sm' : 'text-base sm:text-lg'} text-gray-400 mb-2`}>
                                Menunggu Pemain
                              </h4>
                              <p className="text-gray-500 text-xs sm:text-sm">Bagikan kode tim</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Papan Peringkat */}
              {leaderboard && leaderboard.length > 0 && (
                <motion.div variants={fadeInUp}>
                  <Card className="border-2 sm:border-4 border-purple-600 bg-gradient-to-br from-purple-900/30 to-stone-900">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="text-purple-300 text-base sm:text-lg md:text-xl">
                        🏆 Peringkat Turnamen Langsung
                      </CardTitle>
                      <CardDescription className="text-purple-200 text-xs sm:text-sm">
                        Peringkat saat ini untuk {tournament.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6">
                      <div className="space-y-2 sm:space-y-3">
                        {leaderboard.map((team, index) => (
                          <motion.div
                            key={team.id}
                            variants={fadeInUp}
                            whileHover={{ scale: 1.02, x: 5 }}
                            whileTap={{ scale: 0.98 }}
                            className={`flex justify-between items-center p-3 sm:p-4 rounded-lg transition-all duration-300 ${
                              team.id === group.id ? 'bg-green-800/50 border-2 sm:border-3 border-green-600' :
                              team.status === 'eliminated' ? 'bg-red-800/30 border-2 border-red-600' :
                              team.status === 'champion' ? 'bg-yellow-800/50 border-2 sm:border-3 border-yellow-600' :
                              'bg-gray-800/30 border-2 border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                              <span className="text-2xl sm:text-3xl flex-shrink-0">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎖️'}
                              </span>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-white text-sm sm:text-base md:text-lg flex items-center gap-2 truncate">
                                  <span className="truncate">{team.name}</span>
                                  {team.id === group.id && (
                                    <Badge className="bg-green-700 text-green-100 text-xs flex-shrink-0">Tim Anda</Badge>
                                  )}
                                </h4>
                                <div className="flex gap-2 flex-wrap">
                                  <StatusBadge status={team.status} className="text-xs" />
                                  <span className="text-xs sm:text-sm text-gray-400">
                                    {team.participants?.length || 0} pemain
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              {team.completion_time && (
                                <p className="text-green-300 font-bold text-sm sm:text-base md:text-lg">
                                  {Math.floor(team.completion_time / 60)}:{(team.completion_time % 60).toString().padStart(2, '0')}
                                </p>
                              )}
                              <p className="text-gray-300 text-xs sm:text-sm">
                                Skor: <span className="font-bold">{team.score}</span>
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Kontrol Navigasi - Mobile Bottom Bar */}
              {isMobile && (
                <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-stone-900 to-stone-900/95 border-t-2 border-gray-700 p-3 z-40 backdrop-blur-lg">
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBackToLobby}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg text-sm touch-manipulation"
                    >
                      🏠 Lobi
                    </Button>
                    <Button
                      onClick={() => setShowVoiceChat(!showVoiceChat)}
                      className={`flex-1 py-3 rounded-lg text-sm touch-manipulation ${
                        showVoiceChat
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      🎙️ {showVoiceChat ? 'Sembunyikan' : 'Tampilkan'}
                    </Button>
                    <Button
                      onClick={leaveTournament}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg text-sm touch-manipulation"
                    >
                      🚪 Keluar
                    </Button>
                  </div>
                </div>
              )}

              {/* Kontrol Navigasi - Desktop */}
              {!isMobile && (
                <motion.div variants={fadeInUp}>
                  <Card className="border-3 border-gray-600 bg-gray-900/20">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-4">
                          <Button
                            onClick={handleBackToLobby}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg touch-manipulation"
                          >
                            🏠 Lobi Turnamen
                          </Button>
                          <Button
                            onClick={() => setShowVoiceChat(!showVoiceChat)}
                            className={`px-6 py-3 rounded-lg touch-manipulation ${
                              showVoiceChat
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            🎙️ {showVoiceChat ? 'Sembunyikan' : 'Tampilkan'} Voice Chat
                          </Button>
                        </div>
                        <Button
                          onClick={leaveTournament}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg touch-manipulation"
                        >
                          🚪 Keluar Turnamen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Voice Chat Sidebar - Desktop */}
            <AnimatePresence>
              {showVoiceChat && !isMobile && (
                <motion.div
                  className="lg:col-span-1"
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 100, opacity: 0 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                >
                  <Card className="border-3 border-green-600 bg-gradient-to-br from-green-900/30 to-stone-900 sticky top-4 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-green-300 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            🎙️
                          </motion.span>
                          Komunikasi Guild
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.1, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setShowVoiceChat(false)}
                          className="bg-red-600/30 hover:bg-red-600/50 text-red-300 px-3 py-1 text-sm rounded-lg"
                        >
                          ✕
                        </motion.button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <VoiceChat
                        sessionId={session?.id || 0}
                        userId={auth?.user?.id || 0}
                        nickname={auth?.user?.name || 'Pemain'}
                        role={userRole as 'defuser' | 'expert' || 'defuser'}
                        participants={group.participants || []}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Voice Chat Modal - Mobile */}
            <AnimatePresence>
              {showVoiceChat && isMobile && (
                <motion.div
                  className="fixed inset-0 z-50 bg-stone-900"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                      <h3 className="text-xl font-bold text-green-300 flex items-center gap-2">
                        <span>🎙️</span>
                        Komunikasi Guild
                      </h3>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowVoiceChat(false)}
                        className="bg-red-600/30 hover:bg-red-600/50 text-red-300 px-4 py-2 rounded-lg touch-manipulation"
                      >
                        ✕ Tutup
                      </motion.button>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                      <VoiceChat
                        sessionId={session?.id || 0}
                        userId={auth?.user?.id || 0}
                        nickname={auth?.user?.name || 'Pemain'}
                        role={userRole as 'defuser' | 'expert' || 'defuser'}
                        participants={group.participants || []}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
