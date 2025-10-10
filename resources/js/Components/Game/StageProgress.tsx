import React, { useMemo, useRef, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { gsap } from 'gsap';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  TORCH_FLICKER_INTERVAL: 150,
  RUNE_FLOAT_DURATION: 3200,
  STAGE_ENTRANCE_DURATION: 0.5,
  STAGE_STAGGER: 0.1,
  PROGRESS_DURATION: 1,
  MOBILE_BREAKPOINT: 768,
} as const;

const STAGE_CONFIG = {
  completed: {
    bg: 'bg-emerald-900/50',
    border: 'border-emerald-700',
    text: 'text-emerald-200',
    icon: '✓',
    glow: 'shadow-emerald-500/50',
  },
  current: {
    bg: 'bg-indigo-900/50',
    border: 'border-indigo-600',
    text: 'text-indigo-200',
    icon: '⚔️',
    glow: 'shadow-indigo-500/50',
  },
  pending: {
    bg: 'bg-stone-900/60',
    border: 'border-stone-700',
    text: 'text-stone-300',
    icon: '⏳',
    glow: 'shadow-stone-700/20',
  },
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================
interface Props {
  current: number;
  total: number;
  completed: number[];
  totalScore: number;
}

// ============================================
// CUSTOM HOOKS
// ============================================
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < CONFIG.MOBILE_BREAKPOINT);
    checkMobile();
    const handleResize = () => checkMobile();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const runeRefs = useRef<(HTMLElement | null)[]>([]);
  const stageRefs = useRef<(HTMLElement | null)[]>([]);
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

    runeRefs.current.forEach((rune, index) => {
      if (rune) {
        gsap.to(rune, {
          y: -6,
          duration: CONFIG.RUNE_FLOAT_DURATION / 1000,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: index * 0.3,
        });
      }
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const validStages = stageRefs.current.filter((stage): stage is HTMLElement => stage !== null);
    if (validStages.length > 0) {
      gsap.fromTo(
        validStages,
        {
          opacity: 0,
          scale: 0.5,
          rotateY: 180,
        },
        {
          opacity: 1,
          scale: 1,
          rotateY: 0,
          duration: CONFIG.STAGE_ENTRANCE_DURATION,
          stagger: CONFIG.STAGE_STAGGER,
          ease: 'back.out(1.7)',
        }
      );
    }
  }, []);

  const setTorchRef = useCallback(
    (index: number) => (el: HTMLSpanElement | null) => {
      torchRefs.current[index] = el;
    },
    []
  );

  const setRuneRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      runeRefs.current[index] = el;
    },
    []
  );

  const setStageRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      stageRefs.current[index] = el;
    },
    []
  );

  return { setTorchRef, setRuneRef, setStageRef };
};

// ============================================
// ANIMATION VARIANTS
// ============================================
const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const scaleIn = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const StageIndicator = memo(
  ({
    stageNumber,
    isCompleted,
    isCurrent,
    index,
    setStageRef,
    isMobile,
  }: {
    stageNumber: number;
    isCompleted: boolean;
    isCurrent: boolean;
    index: number;
    setStageRef: (index: number) => (el: HTMLDivElement | null) => void;
    isMobile: boolean;
  }) => {
    const config = isCompleted ? STAGE_CONFIG.completed : isCurrent ? STAGE_CONFIG.current : STAGE_CONFIG.pending;

    return (
      <motion.div
        ref={setStageRef(index)}
        variants={fadeInUp}
        whileHover={{ scale: 1.1, rotate: isCompleted ? 360 : 0 }}
        whileTap={{ scale: 0.95 }}
        className={`${isMobile ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base'} rounded-xl border-2 flex items-center justify-center font-bold select-none shadow-lg transition-all duration-300 cursor-default ${
          config.bg
        } ${config.border} ${config.text} ${config.glow} ${isCurrent ? 'dungeon-rune-float dungeon-pulse' : ''}`}
        title={
          isCompleted
            ? `Tahap ${stageNumber}: Ditaklukkan`
            : isCurrent
            ? `Tahap ${stageNumber}: Pertempuran Aktif`
            : `Tahap ${stageNumber}: Menanti`
        }
        aria-label={
          isCompleted
            ? `Tahap ${stageNumber} selesai`
            : isCurrent
            ? `Tahap ${stageNumber} sedang berlangsung`
            : `Tahap ${stageNumber} menunggu`
        }
      >
        {isCompleted ? STAGE_CONFIG.completed.icon : stageNumber}
      </motion.div>
    );
  }
);

StageIndicator.displayName = 'StageIndicator';

const StageConnector = memo(({ isCompleted }: { isCompleted: boolean }) => (
  <motion.div
    initial={{ scaleX: 0 }}
    animate={{ scaleX: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
    className={`flex-1 h-1.5 rounded transition-all duration-500 origin-left ${
      isCompleted
        ? 'bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 shadow-lg shadow-emerald-500/30 dungeon-progress-glow'
        : 'bg-stone-700'
    }`}
    aria-hidden="true"
  />
));

StageConnector.displayName = 'StageConnector';

const StatCard = memo(
  ({
    value,
    label,
    badgeColor,
    badgeText,
    badgeBorder,
    icon,
    index,
    setRuneRef,
    isMobile,
  }: {
    value: number;
    label: string;
    badgeColor: string;
    badgeText: string;
    badgeBorder: string;
    icon: string;
    index: number;
    setRuneRef: (index: number) => (el: HTMLDivElement | null) => void;
    isMobile: boolean;
  }) => (
    <motion.div variants={fadeInUp} className="text-center">
      <div ref={setRuneRef(index)} className={`${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'} font-bold dungeon-rune-float ${badgeText}`}>
        {value}
      </div>
      <Badge className={`mt-1 ${badgeColor} ${badgeText} ${badgeBorder} shadow-md dungeon-badge-glow text-xs`}>
        <span className="mr-1" aria-hidden="true">
          {icon}
        </span>
        {label}
      </Badge>
    </motion.div>
  )
);

StatCard.displayName = 'StatCard';

// ============================================
// MAIN COMPONENT
// ============================================
export default function StageProgress({ current, total, completed, totalScore }: Props) {
  const isMobile = useIsMobile();
  const { setTorchRef, setRuneRef, setStageRef } = useDungeonAtmosphere();
  const progressBarRef = useRef<HTMLDivElement>(null);

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const percent = useMemo(() => {
    const done = Math.min(completed.length, total);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [completed.length, total]);

  const remainingStages = useMemo(() => Math.max(total - completed.length, 0), [total, completed.length]);

  const motivationalMessage = useMemo(() => {
    if (percent === 100) {
      return {
        text: 'Semua tahap berhasil ditaklukkan! Dungeon telah jatuh!',
        icon: '🏆',
        color: 'emerald',
        gradient: 'from-emerald-950/40 to-green-950/40',
        border: 'border-emerald-600',
      };
    }
    if (percent >= 50) {
      return {
        text: 'Setengah perjalanan telah dilalui! Terus bertarung!',
        icon: '⚔️',
        color: 'indigo',
        gradient: 'from-indigo-950/40 to-blue-950/40',
        border: 'border-indigo-600',
      };
    }
    return null;
  }, [percent]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (progressBarRef.current) {
      gsap.to(progressBarRef.current, {
        width: `${percent}%`,
        duration: CONFIG.PROGRESS_DURATION,
        ease: 'power2.out',
      });
    }
  }, [percent]);

  return (
    <motion.div variants={scaleIn} initial="initial" animate="animate">
      <Card className="overflow-hidden border-2 sm:border-4 border-amber-700 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 shadow-2xl dungeon-card-glow">
        <CardContent className={isMobile ? 'p-3' : 'p-4 sm:p-5'}>
          {/* Header skor dan label */}
          <motion.div variants={staggerContainer} className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-3">
            <motion.h3
              variants={fadeInUp}
              className={`${
                isMobile ? 'text-sm' : 'text-base sm:text-lg'
              } font-semibold text-amber-300 flex items-center gap-2 dungeon-glow-text`}
            >
              <span ref={setTorchRef(0)} className={`dungeon-torch-flicker ${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
                🕯️
              </span>
              <span>Kemajuan Ekspedisi</span>
            </motion.h3>
            <motion.div variants={fadeInUp} className="text-center sm:text-right">
              <div
                ref={setRuneRef(0)}
                className={`${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'} font-extrabold text-emerald-300 dungeon-rune-float dungeon-glow-text`}
              >
                {totalScore.toLocaleString()}
              </div>
              <div className="text-xs sm:text-sm text-stone-300">Skor Penaklukan</div>
            </motion.div>
          </motion.div>

          {/* Deretan tahap berbentuk batu runik */}
          <motion.div
            variants={staggerContainer}
            className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-amber-700 scrollbar-track-stone-900"
          >
            {Array.from({ length: total }, (_, i) => {
              const stageNumber = i + 1;
              const isCompleted = completed.includes(stageNumber);
              const isCurrent = stageNumber === current;

              return (
                <React.Fragment key={stageNumber}>
                  <StageIndicator
                    stageNumber={stageNumber}
                    isCompleted={isCompleted}
                    isCurrent={isCurrent}
                    index={i}
                    setStageRef={setStageRef}
                    isMobile={isMobile}
                  />

                  {stageNumber < total && <StageConnector isCompleted={completed.includes(stageNumber)} />}
                </React.Fragment>
              );
            })}
          </motion.div>

          {/* Progress bar total */}
          <motion.div variants={fadeInUp} className="mb-2">
            <div className="relative w-full h-2 bg-stone-700 rounded-full overflow-hidden shadow-inner">
              <div
                ref={progressBarRef}
                className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 rounded-full shadow-lg shadow-emerald-500/50 dungeon-progress-glow"
                style={{ width: '0%' }}
              />
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="flex items-center justify-between text-xs text-stone-300 mb-4">
            <span className="flex items-center gap-1">
              <span className="text-emerald-400" aria-hidden="true">
                ✓
              </span>
              <span className="hidden sm:inline">{completed.length} ditaklukkan</span>
              <span className="sm:hidden">{completed.length}</span>
            </span>
            <span className="font-bold text-amber-300">{percent}%</span>
            <span className="flex items-center gap-1">
              <span className="text-stone-500" aria-hidden="true">
                ⏳
              </span>
              <span className="hidden sm:inline">{remainingStages} tersisa</span>
              <span className="sm:hidden">{remainingStages}</span>
            </span>
          </motion.div>

          {/* Ringkasan status dalam badge */}
          <motion.div variants={staggerContainer} className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <StatCard
              value={completed.length}
              label="Ditaklukkan"
              badgeColor="bg-emerald-800"
              badgeText="text-emerald-100"
              badgeBorder="border-emerald-700"
              icon="✓"
              index={1}
              setRuneRef={setRuneRef}
              isMobile={isMobile}
            />
            <StatCard
              value={current}
              label="Pertempuran"
              badgeColor="bg-indigo-800"
              badgeText="text-indigo-100"
              badgeBorder="border-indigo-700"
              icon="⚔️"
              index={2}
              setRuneRef={setRuneRef}
              isMobile={isMobile}
            />
            <StatCard
              value={remainingStages}
              label="Menanti"
              badgeColor="bg-stone-700"
              badgeText="text-stone-200"
              badgeBorder="border-stone-600"
              icon="⏳"
              index={3}
              setRuneRef={setRuneRef}
              isMobile={isMobile}
            />
          </motion.div>

          {/* Motivational Message */}
          <AnimatePresence>
            {motivationalMessage && (
              <motion.div
                key={motivationalMessage.text}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`mt-4 p-3 bg-gradient-to-r ${motivationalMessage.gradient} border-2 ${motivationalMessage.border} rounded-lg text-center backdrop-blur-sm ${
                  motivationalMessage.color === 'emerald' ? 'dungeon-card-glow-green' : ''
                }`}
              >
                <p
                  className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold text-${
                    motivationalMessage.color
                  }-300 flex items-center justify-center gap-2 dungeon-glow-text`}
                >
                  <span className={isMobile ? 'text-base' : 'text-lg'} aria-hidden="true">
                    {motivationalMessage.icon}
                  </span>
                  <span>{motivationalMessage.text}</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        {/* Styles */}
        <style>{`
          .dungeon-torch-flicker { display: inline-block; }
          .dungeon-rune-float { display: inline-block; }
          .dungeon-card-glow { box-shadow: 0 0 30px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.2); }
          .dungeon-card-glow-green { box-shadow: 0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2); }
          .dungeon-progress-glow { filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.6)); }
          .dungeon-badge-glow { filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4)); }
          .dungeon-glow-text { text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4); }
          .dungeon-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
          .scrollbar-thin::-webkit-scrollbar { height: 6px; }
          .scrollbar-thin::-webkit-scrollbar-track { background: rgba(28, 25, 23, 0.5); border-radius: 3px; }
          .scrollbar-thumb-amber-700::-webkit-scrollbar-thumb { background-color: rgba(180, 83, 9, 0.6); border-radius: 3px; }
          .scrollbar-thumb-amber-700::-webkit-scrollbar-thumb:hover { background-color: rgba(180, 83, 9, 0.8); }
          .scrollbar-track-stone-900::-webkit-scrollbar-track { background: rgba(28, 25, 23, 0.5); }
          @media (max-width: 768px) {
            .dungeon-card-glow, .dungeon-card-glow-green {
              box-shadow: 0 0 15px rgba(251, 191, 36, 0.3), 0 0 30px rgba(251, 191, 36, 0.15);
            }
          }
        `}</style>
      </Card>
    </motion.div>
  );
}
