import React, { useMemo, useRef, useEffect, memo } from 'react';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Progress } from '@/Components/ui/progress';
import { gsap } from 'gsap';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  TORCH_FLICKER_INTERVAL: 2200,
  RUNE_FLOAT_DURATION: 3200,
  STAGE_ENTRANCE_DURATION: 0.5,
  STAGE_STAGGER: 0.1,
  PROGRESS_DURATION: 1,
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
    icon: '', // Add icon property for consistency
    glow: 'shadow-indigo-500/50',
  },
  pending: {
    bg: 'bg-stone-900/60',
    border: 'border-stone-700',
    text: 'text-stone-300',
    icon: '', // Add icon property for consistency
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
const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const runeRefs = useRef<(HTMLElement | null)[]>([]);
  const stageRefs = useRef<(HTMLElement | null)[]>([]);

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

    // Rune float animation
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

    return () => clearInterval(torchInterval);
  }, []);

  useEffect(() => {
    // Stage entrance animation
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

  const setTorchRef = (index: number) => (el: HTMLSpanElement | null) => {
    torchRefs.current[index] = el;
  };

  const setRuneRef = (index: number) => (el: HTMLDivElement | null) => {
    runeRefs.current[index] = el;
  };

  const setStageRef = (index: number) => (el: HTMLDivElement | null) => {
    stageRefs.current[index] = el;
  };

  return { setTorchRef, setRuneRef, setStageRef };
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
  }: {
    stageNumber: number;
    isCompleted: boolean;
    isCurrent: boolean;
    index: number;
    setStageRef: (index: number) => (el: HTMLDivElement | null) => void;
  }) => {
    const config = isCompleted
      ? STAGE_CONFIG.completed
      : isCurrent
      ? STAGE_CONFIG.current
      : STAGE_CONFIG.pending;

    return (
      <div
        ref={setStageRef(index)}
        className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold select-none shadow-lg transition-all duration-300 hover:scale-110 ${config.bg} ${config.border} ${config.text} ${config.glow} ${
          isCurrent ? 'dungeon-rune-float dungeon-pulse' : ''
        }`}
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
      </div>
    );
  }
);

StageIndicator.displayName = 'StageIndicator';

const StageConnector = memo(({ isCompleted }: { isCompleted: boolean }) => (
  <div
    className={`flex-1 h-1.5 rounded transition-all duration-500 ${
      isCompleted
        ? 'bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 shadow-lg shadow-emerald-500/30'
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
    index,
    setRuneRef,
  }: {
    value: number;
    label: string;
    badgeColor: string;
    badgeText: string;
    badgeBorder: string;
    index: number;
    setRuneRef: (index: number) => (el: HTMLDivElement | null) => void;
  }) => (
    <div className="text-center">
      <div
        ref={setRuneRef(index)}
        className={`text-lg font-bold dungeon-rune-float ${badgeText}`}
      >
        {value}
      </div>
      <Badge
        className={`mt-1 ${badgeColor} ${badgeText} ${badgeBorder} shadow-md dungeon-badge-glow`}
      >
        {label}
      </Badge>
    </div>
  )
);

StatCard.displayName = 'StatCard';

// ============================================
// MAIN COMPONENT
// ============================================
export default function StageProgress({ current, total, completed, totalScore }: Props) {
  const { setTorchRef, setRuneRef, setStageRef } = useDungeonAtmosphere();

  const percent = useMemo(() => {
    const done = Math.min(completed.length, total);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [completed.length, total]);

  const remainingStages = useMemo(() => Math.max(total - current, 0), [total, current]);

  // Animate progress bar when percent changes
  useEffect(() => {
    const progressBar = document.querySelector('[data-progress-bar]');
    if (progressBar) {
      gsap.to(progressBar, {
        width: `${percent}%`,
        duration: CONFIG.PROGRESS_DURATION,
        ease: 'power2.out',
      });
    }
  }, [percent]);

  return (
    <Card className="overflow-hidden border-4 border-amber-700 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 shadow-2xl dungeon-card-glow">
      <CardContent className="p-4 sm:p-5">
        {/* Header skor dan label */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-amber-300 flex items-center gap-2 dungeon-glow-text">
            <span ref={setTorchRef(0)} className="dungeon-torch-flicker text-xl sm:text-2xl">
              🕯️
            </span>
            <span>Kemajuan Ekspedisi Dungeon</span>
          </h3>
          <div className="text-center sm:text-right">
            <div
              ref={setRuneRef(0)}
              className="text-2xl sm:text-3xl font-extrabold text-emerald-300 dungeon-rune-float dungeon-glow-text"
            >
              {totalScore.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-stone-300">Skor Penaklukan</div>
          </div>
        </div>

        {/* Deretan tahap berbentuk batu runik */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-amber-700 scrollbar-track-stone-900">
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
                />

                {stageNumber < total && (
                  <StageConnector isCompleted={completed.includes(stageNumber)} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress bar total */}
        <div className="mb-2">
          <div className="relative w-full h-2 bg-stone-700 rounded-full overflow-hidden shadow-inner">
            <div
              data-progress-bar
              className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 rounded-full transition-all duration-1000 shadow-lg shadow-emerald-500/50 dungeon-progress-glow"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-stone-300 mb-4">
          <span className="flex items-center gap-1">
            <span className="text-emerald-400">✓</span>
            {completed.length} ditaklukkan
          </span>
          <span className="font-bold text-amber-300">{percent}%</span>
          <span className="flex items-center gap-1">
            <span className="text-stone-500">⏳</span>
            {Math.max(total - completed.length, 0)} tersisa
          </span>
        </div>

        {/* Ringkasan status dalam badge */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
          <StatCard
            value={completed.length}
            label="Ditaklukkan"
            badgeColor="bg-emerald-800"
            badgeText="text-emerald-100"
            badgeBorder="border-emerald-700"
            index={1}
            setRuneRef={setRuneRef}
          />
          <StatCard
            value={current}
            label="Pertempuran"
            badgeColor="bg-indigo-800"
            badgeText="text-indigo-100"
            badgeBorder="border-indigo-700"
            index={2}
            setRuneRef={setRuneRef}
          />
          <StatCard
            value={remainingStages}
            label="Menanti"
            badgeColor="bg-stone-700"
            badgeText="text-stone-200"
            badgeBorder="border-stone-600"
            index={3}
            setRuneRef={setRuneRef}
          />
        </div>

        {/* Motivational Message */}
        {percent === 100 ? (
          <div className="mt-4 p-3 bg-gradient-to-r from-emerald-950/40 to-green-950/40 border-2 border-emerald-600 rounded-lg text-center backdrop-blur-sm animate-[fadeIn_0.5s_ease-out] dungeon-card-glow-green">
            <p className="text-sm font-bold text-emerald-300 flex items-center justify-center gap-2 dungeon-glow-text">
              <span className="text-lg">🏆</span>
              Semua tahap berhasil ditaklukkan! Dungeon telah jatuh!
            </p>
          </div>
        ) : percent >= 50 ? (
          <div className="mt-4 p-3 bg-gradient-to-r from-indigo-950/40 to-blue-950/40 border-2 border-indigo-600 rounded-lg text-center backdrop-blur-sm animate-[fadeIn_0.5s_ease-out]">
            <p className="text-sm font-bold text-indigo-300 flex items-center justify-center gap-2">
              <span className="text-lg">⚔️</span>
              Setengah perjalanan telah dilalui! Terus bertarung!
            </p>
          </div>
        ) : null}
      </CardContent>

      {/* ========================================
          CUSTOM DUNGEON STYLES
          ======================================== */}
      <style>{`
        /* Torch Flicker Animation */
        .dungeon-torch-flicker {
          display: inline-block;
        }

        /* Rune Float Animation */
        .dungeon-rune-float {
          display: inline-block;
        }

        /* Card Glow */
        .dungeon-card-glow {
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.2);
        }

        .dungeon-card-glow-green {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2);
        }

        /* Progress Glow */
        .dungeon-progress-glow {
          filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.6));
        }

        /* Badge Glow */
        .dungeon-badge-glow {
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
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
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        /* Fade In Animation */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Scrollbar Styling */
        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.5);
          border-radius: 3px;
        }

        .scrollbar-thumb-amber-700::-webkit-scrollbar-thumb {
          background-color: rgba(180, 83, 9, 0.6);
          border-radius: 3px;
        }

        .scrollbar-thumb-amber-700::-webkit-scrollbar-thumb:hover {
          background-color: rgba(180, 83, 9, 0.8);
        }

        .scrollbar-track-stone-900::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.5);
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .dungeon-card-glow,
          .dungeon-card-glow-green {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.3), 0 0 30px rgba(251, 191, 36, 0.15);
          }
        }
      `}</style>
    </Card>
  );
}
