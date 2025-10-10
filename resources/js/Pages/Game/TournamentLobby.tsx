import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
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
import {
  TournamentData,
  TournamentGroup,
  normalizeTournamentData,
} from '@/types/game';
import { toast } from 'sonner';
import { gsap } from 'gsap';

// ========================================
// CONSTANTS & CONFIGURATIONS
// ========================================
const CONFIG = {
  POLLING_INTERVAL: 5000,
  MAX_GROUP_NAME_LENGTH: 30,
  MAX_TOURNAMENT_DISPLAY: 10,
  SWIPE_THRESHOLD: 50,
  MOBILE_BREAKPOINT: 768,
  TORCH_FLICKER_INTERVAL: 150,
  ANIMATION_DURATION: 0.6,
  DEBOUNCE_DELAY: 300,
} as const;

const TOURNAMENT_STATUS = {
  waiting: {
    color: 'bg-gradient-to-r from-yellow-500 to-amber-600',
    text: 'Menunggu Petualang',
    icon: '⏳',
    description: 'Ruang Guild terbuka untuk pendaftaran',
  },
  qualification: {
    color: 'bg-gradient-to-r from-blue-500 to-cyan-600',
    text: 'Kualifikasi Dungeon',
    icon: '🎯',
    description: 'Tahap penyaringan petualang',
  },
  semifinals: {
    color: 'bg-gradient-to-r from-purple-500 to-pink-600',
    text: 'Pertempuran Semi Final',
    icon: '⚔️',
    description: 'Clash guild elit',
  },
  finals: {
    color: 'bg-gradient-to-r from-red-500 to-rose-600',
    text: 'Pertempuran Final',
    icon: '👑',
    description: 'Duel untuk supremasi',
  },
  completed: {
    color: 'bg-gradient-to-r from-green-500 to-emerald-600',
    text: 'Legenda Terukir',
    icon: '🏆',
    description: 'Penaklukan dungeon selesai',
  },
} as const;

const ROLE_CONFIG = {
  defuser: {
    icon: '💣',
    title: 'Penjinakkan Bom',
    color: 'red',
    description: 'Menangani perangkat berbahaya di kedalaman dungeon',
    gradient: 'from-red-500 to-orange-600',
  },
  expert: {
    icon: '📖',
    title: 'Ahli Grimoire',
    color: 'blue',
    description: 'Membimbing dengan pengetahuan arkana kuno',
    gradient: 'from-blue-500 to-cyan-600',
  },
} as const;

// ========================================
// CUSTOM HOOKS
// ========================================
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < CONFIG.MOBILE_BREAKPOINT);
    };

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
  const backgroundRef = useRef<HTMLDivElement>(null);
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

    // Floating particles
    if (backgroundRef.current) {
      const particles = backgroundRef.current.querySelectorAll('.dungeon-particle');
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

  return { backgroundRef, setTorchRef };
};

// ========================================
// UTILITY FUNCTIONS
// ========================================
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// ========================================
// ANIMATION VARIANTS
// ========================================
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
    transition: {
      staggerChildren: 0.08,
    },
  },
};

// ========================================
// LOADING SKELETON COMPONENT
// ========================================
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
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-pulse h-8 bg-stone-700 rounded-full w-24" />
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="space-y-3 sm:space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-2 border-purple-600 bg-gradient-to-r from-purple-900/30 to-stone-900">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="skeleton-pulse h-24 bg-stone-700 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';

// ========================================
// SWIPEABLE CARD COMPONENT
// ========================================
interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

const SwipeableCard = memo(({ children, onSwipeLeft, onSwipeRight, className = '' }: SwipeableCardProps) => {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x > CONFIG.SWIPE_THRESHOLD && onSwipeRight) {
        onSwipeRight();
      } else if (info.offset.x < -CONFIG.SWIPE_THRESHOLD && onSwipeLeft) {
        onSwipeLeft();
      }
    },
    [onSwipeLeft, onSwipeRight]
  );

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      style={{ x, opacity, scale }}
      className={`cursor-grab active:cursor-grabbing touch-pan-y ${className}`}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
});

SwipeableCard.displayName = 'SwipeableCard';

// ========================================
// BOTTOM SHEET COMPONENT (Mobile)
// ========================================
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

const BottomSheet = memo(({ isOpen, onClose, children, title }: BottomSheetProps) => {
  const y = useMotionValue(0);
  const isMobile = useIsMobile();

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 100) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isMobile) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            style={{ y }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-b from-stone-800 to-stone-900 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden border-t-4 border-amber-600"
          >
            <div className="flex justify-center pt-3 pb-2">
              <motion.div className="w-12 h-1.5 bg-amber-600 rounded-full" whileTap={{ scale: 1.2 }} />
            </div>

            {title && (
              <div className="px-6 py-4 border-b border-gray-700">
                <h3 className="text-xl font-bold text-amber-300 dungeon-glow-text">{title}</h3>
              </div>
            )}

            <div className="overflow-y-auto max-h-[calc(90vh-80px)] overscroll-contain">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

BottomSheet.displayName = 'BottomSheet';

// ========================================
// MOBILE-OPTIMIZED COMPONENTS
// ========================================
const StatusBadge = memo(({ status }: { status: string }) => {
  const config = TOURNAMENT_STATUS[status as keyof typeof TOURNAMENT_STATUS] || TOURNAMENT_STATUS.waiting;
  const isMobile = useIsMobile();

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileTap={{ scale: 0.95 }}
      className={isMobile ? 'flex-shrink-0' : ''}
    >
      <Badge
        className={`${config.color} text-white flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 shadow-lg text-xs sm:text-sm font-bold`}
      >
        <span className="text-sm sm:text-base" aria-hidden="true">
          {config.icon}
        </span>
        <span className="whitespace-nowrap">{config.text}</span>
      </Badge>
    </motion.div>
  );
});

StatusBadge.displayName = 'StatusBadge';

const LoadingSpinner = memo(() => (
  <motion.div className="flex items-center justify-center space-x-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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

const RoleSelectionCard = memo(
  ({
    role,
    selected,
    onSelect,
  }: {
    role: 'defuser' | 'expert';
    selected: boolean;
    onSelect: () => void;
  }) => {
    const config = ROLE_CONFIG[role];
    const isMobile = useIsMobile();

    return (
      <motion.div whileTap={{ scale: 0.95 }} onClick={onSelect} className="cursor-pointer touch-manipulation">
        <Card
          className={`
          transition-all duration-300 overflow-hidden
          ${
            selected
              ? `border-4 border-${config.color}-500 bg-gradient-to-br from-${config.color}-900/60 to-stone-900 shadow-2xl dungeon-card-glow-${config.color}`
              : 'border-2 border-gray-700 bg-stone-900/50 hover:border-gray-500'
          }
        `}
        >
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'} text-center relative`}>
            {selected && (
              <motion.div
                className="absolute top-2 right-2"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <span className="text-xl sm:text-2xl text-amber-400">✓</span>
              </motion.div>
            )}
            <motion.div
              className={`${isMobile ? 'text-3xl' : 'text-4xl sm:text-5xl'} mb-2 sm:mb-3 dungeon-icon-glow`}
              animate={selected ? { rotate: [0, -10, 10, 0] } : {}}
              transition={{ duration: 0.5 }}
              aria-hidden="true"
            >
              {config.icon}
            </motion.div>
            <h4 className={`font-bold ${isMobile ? 'text-base' : 'text-lg'} mb-1 sm:mb-2 text-${config.color}-300`}>
              {config.title}
            </h4>
            <p className={`text-${config.color}-200 ${isMobile ? 'text-xs' : 'text-sm'} leading-relaxed`}>
              {config.description}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
);

RoleSelectionCard.displayName = 'RoleSelectionCard';

// ========================================
// FLOATING ACTION BUTTON
// ========================================
const FloatingActionButton = memo(
  ({
    onClick,
    icon,
    label,
    variant = 'primary',
  }: {
    onClick: () => void;
    icon: string;
    label: string;
    variant?: 'primary' | 'success';
  }) => {
    const isMobile = useIsMobile();

    return (
      <motion.button
        onClick={onClick}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`
        fixed ${isMobile ? 'bottom-20 right-4' : 'bottom-8 right-8'} z-50
        ${
          variant === 'primary'
            ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700'
            : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
        }
        text-white ${isMobile ? 'p-4' : 'p-5'} rounded-full shadow-2xl
        flex items-center gap-2 min-w-[56px] min-h-[56px]
        touch-manipulation dungeon-fab-glow
      `}
        title={label}
        aria-label={label}
      >
        <motion.span
          className={isMobile ? 'text-2xl' : 'text-3xl'}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          aria-hidden="true"
        >
          {icon}
        </motion.span>
      </motion.button>
    );
  }
);

FloatingActionButton.displayName = 'FloatingActionButton';

// ========================================
// JOIN TOURNAMENT FORM COMPONENT
// ========================================
interface JoinTournamentFormProps {
  groupName: string;
  setGroupName: (name: string) => void;
  selectedRole: 'defuser' | 'expert';
  setSelectedRole: (role: 'defuser' | 'expert') => void;
  onJoin: () => void;
  onCancel: () => void;
  joining: boolean;
  isMobile: boolean;
}

const JoinTournamentForm = memo(
  ({
    groupName,
    setGroupName,
    selectedRole,
    setSelectedRole,
    onJoin,
    onCancel,
    joining,
    isMobile,
  }: JoinTournamentFormProps) => {
    const handleSubmit = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        if (groupName.trim() && !joining) {
          onJoin();
        }
      },
      [groupName, joining, onJoin]
    );

    return (
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <label htmlFor="group-name" className="block text-base sm:text-lg font-bold text-green-300 mb-2 sm:mb-3 dungeon-glow-text">
            🏰 Nama Guild Anda
          </label>
          <input
            id="group-name"
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Masukkan nama guild legendaris"
            className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-stone-800 border-2 border-green-600 rounded-lg sm:rounded-xl text-green-300 placeholder-green-500/50 focus:outline-none focus:ring-4 focus:ring-green-500/50 transition-all text-sm sm:text-base touch-manipulation font-semibold"
            maxLength={CONFIG.MAX_GROUP_NAME_LENGTH}
            disabled={joining}
            autoComplete="off"
            aria-describedby="group-name-help"
          />
          <p id="group-name-help" className="text-green-400 text-xs sm:text-sm mt-2">
            {groupName.length}/{CONFIG.MAX_GROUP_NAME_LENGTH} karakter
          </p>
        </motion.div>

        <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <fieldset>
            <legend className="block text-base sm:text-lg font-bold text-green-300 mb-2 sm:mb-3 dungeon-glow-text">
              ⚔️ Peran dalam Ekspedisi
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <RoleSelectionCard role="defuser" selected={selectedRole === 'defuser'} onSelect={() => setSelectedRole('defuser')} />
              <RoleSelectionCard role="expert" selected={selectedRole === 'expert'} onSelect={() => setSelectedRole('expert')} />
            </div>
          </fieldset>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="border-2 sm:border-3 border-purple-600 bg-gradient-to-br from-purple-900/40 to-stone-800 overflow-hidden dungeon-card-glow-purple">
            <CardContent className="p-4 sm:p-6">
              <p className="text-purple-200 leading-relaxed text-xs sm:text-sm md:text-base">
                <strong className="text-purple-300">Peran Terpilih:</strong> Guild Anda akan bertempur sebagai{' '}
                <strong className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-300 dungeon-glow-text">
                  {ROLE_CONFIG[selectedRole].title}
                </strong>
                . {ROLE_CONFIG[selectedRole].description}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4"
        >
          <motion.div className="flex-1" whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              disabled={!groupName.trim() || joining}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 sm:py-4 text-base sm:text-lg font-bold rounded-lg sm:rounded-xl shadow-xl touch-manipulation dungeon-button-glow disabled:opacity-50 disabled:cursor-not-allowed"
              aria-busy={joining}
            >
              {joining ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner />
                  <span className="ml-2 sm:ml-3">Memasuki Arena...</span>
                </div>
              ) : (
                <>
                  <span className="mr-2 sm:mr-3" aria-hidden="true">
                    ⚔️
                  </span>
                  Masuki Dungeon
                </>
              )}
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.98 }} className={isMobile ? 'w-full' : ''}>
            <Button
              type="button"
              onClick={onCancel}
              disabled={joining}
              className={`${isMobile ? 'w-full' : ''} bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-3 sm:py-4 px-6 sm:px-8 rounded-lg sm:rounded-xl shadow-xl touch-manipulation text-base sm:text-lg font-semibold disabled:opacity-50`}
            >
              Batalkan
            </Button>
          </motion.div>
        </motion.div>
      </form>
    );
  }
);

JoinTournamentForm.displayName = 'JoinTournamentForm';

// ========================================
// MAIN COMPONENT
// ========================================
export default function TournamentLobby() {
  const { auth } = usePage().props as any;
  const isMobile = useIsMobile();
  useTouchOptimized();
  const { backgroundRef, setTorchRef } = useDungeonAtmosphere();

  // State Management
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [activeTournament, setActiveTournament] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [joining, setJoining] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<'defuser' | 'expert'>('defuser');
  const [groupName, setGroupName] = useState<string>('');
  const [showVoiceChat, setShowVoiceChat] = useState<boolean>(false);
  const [selectedTournament, setSelectedTournament] = useState<TournamentData | null>(null);
  const [showJoinSheet, setShowJoinSheet] = useState<boolean>(false);

  // Memoized Values
  const currentUserTeamId = useMemo(() => {
    if (!activeTournament || !Array.isArray(activeTournament.groups)) {
      return undefined;
    }
    const userGroup = activeTournament.groups.find(
      (group: TournamentGroup) =>
        Array.isArray(group.participants) && group.participants.some((p: any) => p.user_id === auth?.user?.id)
    );
    return userGroup?.id;
  }, [activeTournament, auth?.user?.id]);

  const globalLeaderboard = useMemo(
    () =>
      tournaments
        .flatMap((t) => t.groups || [])
        .filter((g) => typeof g.rank === 'number' && g.rank <= CONFIG.MAX_TOURNAMENT_DISPLAY)
        .sort((a, b) => (a.rank || 999) - (b.rank || 999))
        .map((group) => ({
          id: group.id,
          name: group.name,
          rank: group.rank,
          score: group.score,
          status: group.status,
          completion_time: group.completion_time,
          participants: group.participants,
        })),
    [tournaments]
  );

  const isActionDisabled = useMemo(() => creating || joining, [creating, joining]);

  // Callbacks
  const loadTournaments = useCallback(async (): Promise<void> => {
    try {
      const response = await gameApi.getTournaments();
      const normalized: TournamentData[] = (response.tournaments || []).map((t: any) => ({
        ...normalizeTournamentData(t),
        bracket: Array.isArray(t.bracket) ? t.bracket : [],
      }));

      setTournaments(normalized);

      const userTournament = normalized.find(
        (t: TournamentData) =>
          Array.isArray(t.groups) &&
          t.groups.some(
            (g: TournamentGroup) =>
              Array.isArray(g.participants) && g.participants.some((p: any) => p.user_id === auth?.user?.id)
          )
      );

      setActiveTournament(userTournament || null);
    } catch (error: any) {
      console.error('❌ Gagal memuat turnamen:', error);
      toast.error('Gagal memuat data turnamen');
    } finally {
      setLoading(false);
    }
  }, [auth?.user?.id]);

  const createTournament = useCallback(async (): Promise<void> => {
    if (creating) return;

    setCreating(true);
    try {
      const newTournamentName = `Arena Dungeon ${new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })}`;

      const response = await gameApi.createTournament({
        name: newTournamentName,
        max_groups: 4,
      });

      if (response.success) {
        toast.success('Arena turnamen berhasil dibuka!');
        await loadTournaments();
      } else {
        throw new Error(response.message || 'Gagal membuat turnamen');
      }
    } catch (error: any) {
      console.error('❌ Pembuatan turnamen gagal:', error);
      const errorMessage =
        error.response?.status === 429
          ? 'Terlalu banyak permintaan. Mohon tunggu sebentar.'
          : error.response?.status === 503
          ? 'Server sedang sibuk. Silakan coba lagi nanti.'
          : error.response?.data?.message || 'Gagal membuat turnamen';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  }, [creating, loadTournaments]);

  const joinTournament = useCallback(
    async (tournamentId: number): Promise<void> => {
      if (!groupName.trim() || joining) return;

      setJoining(true);
      try {
        const response = await gameApi.joinTournament(tournamentId, {
          group_name: groupName.trim(),
          role: selectedRole,
          nickname: auth.user.name,
        });

        if (response.success) {
          toast.success(`Guild ${groupName} berhasil memasuki arena sebagai ${ROLE_CONFIG[selectedRole].title}!`);
          await loadTournaments();
          setGroupName('');
          setSelectedTournament(null);
          setShowJoinSheet(false);

          if (tournamentId && response.group?.id) {
            router.visit(`/game/tournament/${tournamentId}`, {
              method: 'get',
              data: { groupId: response.group.id },
              preserveState: false,
              onError: (errors) => {
                console.error('❌ Redirect turnamen gagal:', errors);
                toast.error('Gagal masuk ke sesi turnamen');
              },
            });
          }
        }
      } catch (error: any) {
        console.error('❌ Gagal bergabung turnamen:', error);
        const errorMessage =
          error.response?.status === 404
            ? 'Turnamen tidak ditemukan atau sudah kedaluwarsa.'
            : error.response?.status === 409
            ? 'Turnamen sudah penuh atau nama guild sudah digunakan.'
            : error.response?.data?.message || 'Gagal bergabung turnamen';
        toast.error(errorMessage);
      } finally {
        setJoining(false);
      }
    },
    [groupName, joining, selectedRole, auth.user.name, loadTournaments]
  );

  const handleTournamentSelect = useCallback(
    (tournament: TournamentData) => {
      setSelectedTournament(tournament);
      if (isMobile) {
        setShowJoinSheet(true);
      }
    },
    [isMobile]
  );

  const handleToggleVoiceChat = useCallback(() => {
    setShowVoiceChat((prev) => !prev);
  }, []);

  const handleCancelJoin = useCallback(() => {
    setShowJoinSheet(false);
    setSelectedTournament(null);
    setGroupName('');
  }, []);

  // Effects
  useEffect(() => {
    loadTournaments();
    const interval = setInterval(loadTournaments, CONFIG.POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [loadTournaments]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isActionDisabled) return;

      if (e.key === 'Escape' && (showJoinSheet || selectedTournament)) {
        handleCancelJoin();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isActionDisabled, showJoinSheet, selectedTournament, handleCancelJoin]);

  // Loading State
  if (loading) {
    return (
      <AuthenticatedLayout
        header={<h2 className="font-semibold text-lg sm:text-xl text-amber-300">🏆 Arena Turnamen Dungeon</h2>}
      >
        <Head title="Arena Turnamen" />
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-purple-900 to-amber-900 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full max-w-md">
            <Card className="bg-gradient-to-br from-stone-800 to-stone-900 border-4 border-amber-600 p-6 sm:p-12 shadow-2xl dungeon-card-glow">
              <CardContent>
                <LoadingSpinner />
                <motion.h3
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl sm:text-2xl font-bold text-amber-300 mt-6 mb-2 dungeon-glow-text"
                >
                  Membuka Portal Arena...
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm sm:text-base text-amber-200"
                >
                  Menyiapkan medan pertempuran epik
                </motion.p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </AuthenticatedLayout>
    );
  }

  // Main Render
  return (
    <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-base sm:text-lg md:text-xl text-amber-300 truncate dungeon-glow-text">
          🏆 Arena Turnamen Dungeon
        </h2>
      }
    >
      <Head title="Arena Turnamen" />

      {/* Dungeon Background Atmosphere */}
      <div ref={backgroundRef} className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Animated Torches */}
        <div ref={setTorchRef(0)} className="absolute top-20 left-10 text-4xl sm:text-6xl dungeon-torch-glow">
          🔥
        </div>
        <div ref={setTorchRef(1)} className="absolute top-40 right-20 text-3xl sm:text-5xl dungeon-torch-glow">
          🔥
        </div>
        <div ref={setTorchRef(2)} className="absolute bottom-32 left-1/4 text-3xl sm:text-4xl dungeon-torch-glow">
          🕯️
        </div>
        <div ref={setTorchRef(3)} className="absolute bottom-20 right-1/3 text-3xl sm:text-4xl dungeon-torch-glow">
          🕯️
        </div>

        {/* Floating Mystical Particles */}
        <div className="dungeon-particle absolute top-1/4 left-1/3 text-2xl opacity-30">✨</div>
        <div className="dungeon-particle absolute top-1/3 right-1/4 text-xl opacity-20">⭐</div>
        <div className="dungeon-particle absolute bottom-1/3 left-1/2 text-3xl opacity-25">💫</div>
        <div className="dungeon-particle absolute top-2/3 right-1/3 text-xl opacity-30">✨</div>

        {/* Stone Wall Texture Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/40 via-transparent to-stone-950/60 pointer-events-none" />
      </div>

      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-purple-900 to-amber-900 py-4 sm:py-8 md:py-12 pb-24 sm:pb-12 relative z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4 sm:space-y-6">
            {/* Header Turnamen */}
            <motion.div variants={fadeInUp}>
              <Card className="border-2 sm:border-4 border-amber-600 bg-gradient-to-br from-amber-900/30 to-stone-900 overflow-hidden shadow-xl sm:shadow-2xl dungeon-card-glow">
                <CardContent className="p-4 sm:p-6 md:p-8 text-center relative">
                  <motion.div
                    className="text-4xl sm:text-5xl md:text-7xl mb-3 sm:mb-4 dungeon-icon-glow"
                    animate={{
                      rotate: [0, -5, 5, -5, 0],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    aria-hidden="true"
                  >
                    ⚔️
                  </motion.div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-300 mb-2 sm:mb-4 dungeon-glow-text">
                    🏆 Arena Turnamen Dungeon
                  </h1>
                  <p className="text-amber-200 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed max-w-3xl mx-auto mb-3 sm:mb-6 px-2">
                    Masuki kompetisi legendaris di mana 4 guild elit bertarung menembus kegelapan dungeon untuk merebut supremasi ultimate!
                  </p>

                  <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide snap-x snap-mandatory md:flex-wrap md:justify-center md:overflow-visible">
                    {[
                      { icon: '🎯', text: 'Arena 4 Guild', color: 'purple' },
                      { icon: '⏱️', text: 'Dungeon Race', color: 'red' },
                      { icon: '👥', text: 'Koordinasi Mistis', color: 'blue' },
                      { icon: '🏆', text: 'Warisan Juara', color: 'green' },
                    ].map((badge, index) => (
                      <motion.div
                        key={badge.text}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="snap-center flex-shrink-0"
                      >
                        <Badge
                          className={`bg-gradient-to-r from-${badge.color}-600 to-${badge.color}-700 text-${badge.color}-100 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm font-semibold shadow-lg whitespace-nowrap dungeon-badge-glow`}
                        >
                          <span className="mr-1 sm:mr-2" aria-hidden="true">
                            {badge.icon}
                          </span>
                          <span className="hidden sm:inline">{badge.text}</span>
                          <span className="sm:hidden">{badge.text.split(' ')[0]}</span>
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Content - Active Tournament or Tournament List */}
            <AnimatePresence mode="wait">
              {activeTournament ? (
                <motion.div key="active-tournament" variants={fadeInUp} initial="initial" animate="animate" exit="exit" className="space-y-4 sm:space-y-6">
                  <Card className="border-2 sm:border-4 border-green-600 bg-gradient-to-br from-green-900/30 to-stone-900 shadow-xl sm:shadow-2xl dungeon-card-glow-green">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="text-green-300 text-center text-xl sm:text-2xl md:text-3xl flex items-center justify-center gap-2 sm:gap-3 dungeon-glow-text">
                        <motion.span
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          className="text-2xl sm:text-3xl"
                          aria-hidden="true"
                        >
                          🎯
                        </motion.span>
                        <span className="text-lg sm:text-2xl md:text-3xl">Ekspedisi Guild Aktif</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4 sm:space-y-6 p-4 sm:p-6">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-green-200 px-2">{activeTournament.name}</h3>

                      <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-4">
                        <StatusBadge status={activeTournament.status} />
                        <motion.div whileTap={{ scale: 0.95 }}>
                          <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-3 sm:px-4 py-2 text-sm sm:text-base w-full sm:w-auto font-bold">
                            Tahap {activeTournament.current_round}/3
                          </Badge>
                        </motion.div>
                        <motion.div whileTap={{ scale: 0.95 }}>
                          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 sm:px-4 py-2 text-sm sm:text-base w-full sm:w-auto font-bold">
                            {Array.isArray(activeTournament.groups)
                              ? activeTournament.groups.filter((g) => g.status !== 'eliminated').length
                              : 0}{' '}
                            Guild Bertahan
                          </Badge>
                        </motion.div>
                      </div>

                      <motion.div whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={() => router.visit(`/game/tournament/${activeTournament.id}`)}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 sm:px-8 md:px-10 py-4 sm:py-5 md:py-6 text-base sm:text-lg md:text-xl font-bold rounded-xl sm:rounded-2xl shadow-2xl w-full sm:w-auto touch-manipulation dungeon-button-glow"
                        >
                          <span className="mr-2 sm:mr-3 text-xl sm:text-2xl" aria-hidden="true">
                            🚀
                          </span>
                          Masuki Medan Pertempuran
                        </Button>
                      </motion.div>
                    </CardContent>
                  </Card>

                  {/* Tournament Bracket - Desktop only */}
                  {activeTournament.bracket && Array.isArray(activeTournament.bracket) && activeTournament.bracket.length > 0 && (
                    <motion.div variants={fadeInUp} className="hidden sm:block">
                      <TournamentBracket tournament={activeTournament} groups={activeTournament.groups || []} loading={false} />
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="tournament-list" variants={staggerContainer} initial="initial" animate="animate" className="space-y-4 sm:space-y-6">
                  <motion.div variants={fadeInUp}>
                    <Card className="border-2 sm:border-4 border-blue-600 bg-gradient-to-br from-blue-900/30 to-stone-900 shadow-xl sm:shadow-2xl dungeon-card-glow-blue">
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-blue-300 text-center text-xl sm:text-2xl md:text-3xl flex items-center justify-center gap-2 sm:gap-3 dungeon-glow-text">
                          <motion.span
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="text-2xl sm:text-3xl"
                            aria-hidden="true"
                          >
                            📋
                          </motion.span>
                          <span className="text-lg sm:text-2xl md:text-3xl">Arena Tersedia untuk Ditaklukkan</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6">
                        <AnimatePresence mode="wait">
                          {tournaments.length === 0 ? (
                            <motion.div key="no-tournaments" variants={scaleIn} initial="initial" animate="animate" exit="exit" className="text-center py-8 sm:py-12 px-4">
                              <motion.div
                                className="text-6xl sm:text-7xl md:text-8xl mb-4 sm:mb-6 dungeon-icon-glow"
                                animate={{
                                  scale: [1, 1.1, 1],
                                  rotate: [0, -10, 10, 0],
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: Infinity,
                                }}
                                aria-hidden="true"
                              >
                                🏟️
                              </motion.div>
                              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-200 mb-3 sm:mb-4 dungeon-glow-text">
                                Dungeon Sunyi... Belum Ada Arena
                              </h3>
                              <p className="text-blue-300 mb-6 sm:mb-8 text-sm sm:text-base md:text-lg px-4">
                                Jadilah perintis pertama yang membuka gerbang arena baru!
                              </p>
                              <motion.div whileTap={{ scale: 0.95 }}>
                                <Button
                                  onClick={createTournament}
                                  disabled={creating}
                                  className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 sm:px-8 md:px-10 py-4 sm:py-5 md:py-6 text-base sm:text-lg md:text-xl font-bold rounded-xl sm:rounded-2xl shadow-2xl w-full sm:w-auto touch-manipulation dungeon-button-glow disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-busy={creating}
                                >
                                  {creating ? (
                                    <div className="flex items-center justify-center">
                                      <LoadingSpinner />
                                      <span className="ml-3">Membuka Portal...</span>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="mr-2 sm:mr-3 text-xl sm:text-2xl" aria-hidden="true">
                                        🏆
                                      </span>
                                      <span className="hidden sm:inline">Buka Arena Baru</span>
                                      <span className="sm:hidden">Buka Arena</span>
                                    </>
                                  )}
                                </Button>
                              </motion.div>
                            </motion.div>
                          ) : (
                            <div className="space-y-3 sm:space-y-4">
                              {tournaments.map((tournament: TournamentData, index: number) => (
                                <SwipeableCard
                                  key={tournament.id}
                                  onSwipeRight={() => {
                                    if (
                                      Array.isArray(tournament.groups) &&
                                      tournament.groups.length < tournament.max_groups &&
                                      tournament.status === 'waiting' &&
                                      !isActionDisabled
                                    ) {
                                      handleTournamentSelect(tournament);
                                    }
                                  }}
                                  className="w-full"
                                >
                                  <motion.div variants={fadeInUp} custom={index}>
                                    <Card className="border-2 border-purple-600 bg-gradient-to-r from-purple-900/30 to-stone-900 hover:border-purple-400 transition-all duration-300 overflow-hidden shadow-lg dungeon-card-glow-purple">
                                      <CardContent className="p-3 sm:p-4 md:p-6">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
                                          <div className="flex-1 min-w-0">
                                            <h4 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-purple-300 mb-2 sm:mb-3 truncate dungeon-glow-text">
                                              {tournament.name}
                                            </h4>

                                            <div className="flex flex-wrap gap-2 mb-2 sm:mb-3">
                                              <StatusBadge status={tournament.status} />
                                              <Badge className="bg-gradient-to-r from-gray-700 to-gray-800 text-gray-200 px-2 sm:px-3 py-1 text-xs sm:text-sm flex-shrink-0 font-semibold">
                                                Guild: {Array.isArray(tournament.groups) ? tournament.groups.length : 0}/{tournament.max_groups}
                                              </Badge>
                                              <Badge className="bg-gradient-to-r from-indigo-700 to-indigo-800 text-indigo-200 px-2 sm:px-3 py-1 text-xs sm:text-sm flex-shrink-0 font-semibold">
                                                Tahap: {tournament.current_round}/3
                                              </Badge>
                                            </div>

                                            {Array.isArray(tournament.groups) && tournament.groups.length > 0 && (
                                              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                                {tournament.groups.slice(0, isMobile ? 2 : 3).map((group: TournamentGroup) => (
                                                  <motion.div
                                                    key={group.id}
                                                    initial={{ opacity: 0, scale: 0 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="flex-shrink-0"
                                                  >
                                                    <Badge className="bg-gradient-to-r from-gray-700 to-gray-800 text-gray-200 text-xs px-2 py-0.5 sm:py-1">
                                                      {group.name}
                                                    </Badge>
                                                  </motion.div>
                                                ))}
                                                {tournament.groups.length > (isMobile ? 2 : 3) && (
                                                  <Badge className="bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300 text-xs px-2 py-0.5 sm:py-1 flex-shrink-0">
                                                    +{tournament.groups.length - (isMobile ? 2 : 3)}
                                                  </Badge>
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                                            {Array.isArray(tournament.groups) &&
                                            tournament.groups.length < tournament.max_groups &&
                                            tournament.status === 'waiting' ? (
                                              <motion.div whileTap={{ scale: 0.95 }} className="flex-1 sm:flex-initial">
                                                <Button
                                                  onClick={() => handleTournamentSelect(tournament)}
                                                  disabled={isActionDisabled}
                                                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold shadow-lg w-full touch-manipulation text-sm sm:text-base dungeon-button-glow disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                  <span className="mr-1 sm:mr-2" aria-hidden="true">
                                                    ⚔️
                                                  </span>
                                                  <span className="hidden sm:inline">Gabung Guild</span>
                                                  <span className="sm:hidden">Gabung</span>
                                                </Button>
                                              </motion.div>
                                            ) : (
                                              <>
                                                <Badge className="bg-gradient-to-r from-gray-700 to-gray-800 text-gray-300 flex-1 sm:flex-initial justify-center py-2 font-semibold">
                                                  {tournament.status === 'waiting' ? 'Ruang Penuh' : 'Pertarungan Aktif'}
                                                </Badge>
                                                <motion.div whileTap={{ scale: 0.95 }} className="flex-1 sm:flex-initial">
                                                  <Button
                                                    onClick={() => router.visit(`/game/tournament/${tournament.id}`)}
                                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg shadow-lg w-full touch-manipulation font-semibold"
                                                  >
                                                    <span className="mr-1 sm:mr-2" aria-hidden="true">
                                                      👁️
                                                    </span>
                                                    Saksikan
                                                  </Button>
                                                </motion.div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </motion.div>
                                </SwipeableCard>
                              ))}

                              {/* Create New Tournament Button */}
                              <motion.div variants={fadeInUp} whileTap={{ scale: 0.98 }}>
                                <Card className="border-2 border-dashed border-amber-600 bg-gradient-to-r from-amber-900/10 to-yellow-900/10 hover:from-amber-900/20 hover:to-yellow-900/20 transition-all duration-300">
                                  <CardContent className="p-3 sm:p-4 md:p-6 text-center">
                                    <Button
                                      onClick={createTournament}
                                      disabled={creating}
                                      className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 sm:py-4 text-base sm:text-lg font-bold rounded-lg sm:rounded-xl shadow-xl touch-manipulation dungeon-button-glow disabled:opacity-50 disabled:cursor-not-allowed"
                                      aria-busy={creating}
                                    >
                                      {creating ? (
                                        <div className="flex items-center justify-center">
                                          <LoadingSpinner />
                                          <span className="ml-2 sm:ml-3">Membuka Portal...</span>
                                        </div>
                                      ) : (
                                        <>
                                          <span className="mr-2 sm:mr-3 text-xl" aria-hidden="true">
                                            🏆
                                          </span>
                                          <span className="hidden sm:inline">Buka Arena Baru</span>
                                          <span className="sm:hidden">Buka Arena</span>
                                        </>
                                      )}
                                    </Button>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            </div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Desktop: Join Form */}
                  {!isMobile && selectedTournament && (
                    <AnimatePresence>
                      <motion.div key="join-form-desktop" variants={scaleIn} initial="initial" animate="animate" exit="exit">
                        <Card className="border-4 border-green-600 bg-gradient-to-br from-green-900/30 to-stone-900 shadow-2xl dungeon-card-glow-green">
                          <CardHeader>
                            <CardTitle className="text-green-300 text-center text-2xl md:text-3xl flex items-center justify-center gap-3 dungeon-glow-text">
                              <motion.span animate={{ rotate: [0, -15, 15, 0] }} transition={{ duration: 1, repeat: Infinity }} aria-hidden="true">
                                ⚔️
                              </motion.span>
                              Bergabung ke {selectedTournament.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6 p-6">
                            <JoinTournamentForm
                              groupName={groupName}
                              setGroupName={setGroupName}
                              selectedRole={selectedRole}
                              setSelectedRole={setSelectedRole}
                              onJoin={() => joinTournament(selectedTournament.id)}
                              onCancel={handleCancelJoin}
                              joining={joining}
                              isMobile={false}
                            />
                          </CardContent>
                        </Card>
                      </motion.div>
                    </AnimatePresence>
                  )}

                  {/* Global Leaderboard - Desktop only */}
                  {tournaments.length > 0 && globalLeaderboard.length > 0 && (
                    <motion.div variants={fadeInUp} className={isMobile ? 'hidden' : 'block'}>
                      <Card className="border-4 border-purple-600 bg-gradient-to-br from-purple-900/30 to-stone-900 shadow-2xl dungeon-card-glow-purple">
                        <CardHeader>
                          <CardTitle className="text-purple-300 text-center text-2xl md:text-3xl flex items-center justify-center gap-3 dungeon-glow-text">
                            <motion.span
                              animate={{
                                rotate: [0, 360],
                                scale: [1, 1.2, 1],
                              }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                              }}
                              aria-hidden="true"
                            >
                              🏆
                            </motion.span>
                            Papan Kehormatan Dungeon
                          </CardTitle>
                          <CardDescription className="text-purple-200 text-center text-base md:text-lg">
                            Legenda guild penakluk dungeon terkuat
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Leaderboard
                            teams={globalLeaderboard}
                            currentUserTeamId={currentUserTeamId}
                            title="Peringkat Legendaris"
                            showParticipants={true}
                            maxTeams={CONFIG.MAX_TOURNAMENT_DISPLAY}
                          />
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Mobile Bottom Sheet untuk Join Tournament */}
      <BottomSheet
        isOpen={showJoinSheet && isMobile && selectedTournament !== null}
        onClose={handleCancelJoin}
        title={selectedTournament ? `Bergabung ke ${selectedTournament.name}` : ''}
      >
        {selectedTournament && (
          <div className="p-6">
            <JoinTournamentForm
              groupName={groupName}
              setGroupName={setGroupName}
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
              onJoin={() => joinTournament(selectedTournament.id)}
              onCancel={handleCancelJoin}
              joining={joining}
              isMobile={true}
            />
          </div>
        )}
      </BottomSheet>

      {/* Floating Voice Chat Button */}
      {!showVoiceChat && <FloatingActionButton onClick={handleToggleVoiceChat} icon="🎙️" label="Voice Chat Guild" variant="success" />}

      {/* Voice Chat Sidebar/Modal */}
      <AnimatePresence>
        {showVoiceChat &&
          (isMobile ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-stone-900">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                  <h3 className="text-xl font-bold text-green-300 flex items-center gap-2 dungeon-glow-text">
                    <span aria-hidden="true">🎙️</span>
                    Lobi Suara Guild
                  </h3>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowVoiceChat(false)}
                    className="bg-red-600/30 hover:bg-red-600/50 text-red-300 px-4 py-2 rounded-lg touch-manipulation font-semibold"
                    aria-label="Tutup voice chat"
                  >
                    ✕ Tutup
                  </motion.button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <VoiceChat sessionId={0} userId={auth?.user?.id || 0} nickname={auth?.user?.name || 'Petualang'} role="host" participants={[]} />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="fixed top-0 right-0 h-screen w-96 z-50"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <Card className="h-full border-l-4 border-green-600 bg-gradient-to-br from-green-900/30 to-stone-900 shadow-2xl rounded-none dungeon-card-glow-green">
                <CardHeader>
                  <CardTitle className="text-green-300 flex items-center justify-between dungeon-glow-text">
                    <span className="flex items-center gap-2">
                      <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }} aria-hidden="true">
                        🎙️
                      </motion.span>
                      Lobi Suara Guild
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowVoiceChat(false)}
                      className="bg-red-600/30 hover:bg-red-600/50 text-red-300 px-3 py-1 text-sm rounded-lg font-semibold"
                      aria-label="Tutup voice chat"
                    >
                      ✕
                    </motion.button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100vh-100px)] overflow-auto">
                  <VoiceChat sessionId={0} userId={auth?.user?.id || 0} nickname={auth?.user?.name || 'Petualang'} role="host" participants={[]} />
                </CardContent>
              </Card>
            </motion.div>
          ))}
      </AnimatePresence>

      {/* ========================================
          CUSTOM DUNGEON STYLES
          ======================================== */}
      <style>{`
        /* Torch Glow Effect */
        .dungeon-torch-glow {
          filter: drop-shadow(0 0 8px rgba(251, 146, 60, 0.6))
                  drop-shadow(0 0 15px rgba(251, 146, 60, 0.4));
          transition: filter 0.3s ease-in-out;
        }

        /* Icon Glow */
        .dungeon-icon-glow {
          filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.5))
                  drop-shadow(0 0 12px rgba(251, 191, 36, 0.3));
        }

        /* Text Glow */
        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6),
                       0 0 40px rgba(251, 191, 36, 0.4);
        }

        /* Card Glows */
        .dungeon-card-glow {
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.4),
                      0 0 60px rgba(251, 191, 36, 0.2);
        }

        .dungeon-card-glow-green {
          box-shadow: 0 0 30px rgba(34, 197, 94, 0.4),
                      0 0 60px rgba(34, 197, 94, 0.2);
        }

        .dungeon-card-glow-blue {
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.4),
                      0 0 60px rgba(59, 130, 246, 0.2);
        }

        .dungeon-card-glow-purple {
          box-shadow: 0 0 30px rgba(168, 85, 247, 0.4),
                      0 0 60px rgba(168, 85, 247, 0.2);
        }

        .dungeon-card-glow-red {
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.4),
                      0 0 60px rgba(239, 68, 68, 0.2);
        }

        /* Button Glow */
        .dungeon-button-glow:hover {
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.5),
                      0 0 40px rgba(251, 191, 36, 0.3);
        }

        /* FAB Glow */
        .dungeon-fab-glow {
          box-shadow: 0 0 25px rgba(251, 191, 36, 0.5),
                      0 0 50px rgba(251, 191, 36, 0.3);
        }

        /* Badge Glow */
        .dungeon-badge-glow {
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
        }

        /* Particle Animation */
        .dungeon-particle {
          animation: float-dungeon 4s ease-in-out infinite;
        }

        @keyframes float-dungeon {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-50px) rotate(180deg); opacity: 0.8; }
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

        /* Hide Scrollbar */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
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

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .dungeon-torch-glow {
            filter: drop-shadow(0 0 5px rgba(251, 146, 60, 0.5));
          }
        }
      `}</style>
    </AuthenticatedLayout>
  );
}
