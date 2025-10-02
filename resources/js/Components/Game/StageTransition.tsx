import React, { useEffect, useRef, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { gsap } from 'gsap';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  TORCH_FLICKER_INTERVAL: 2200,
  ENTRANCE_DURATION: 0.8,
  RUNE_FLOAT_DURATION: 3200,
  COUNTDOWN_DURATION: 3,
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================
interface Props {
  result: {
    stageComplete?: boolean;
    gameComplete?: boolean;
    nextStage?: number;
    stageScore?: number;
    finalScore?: number;
    message?: string;
  };
  currentStage?: number;
  totalStages?: number;
}

// ============================================
// CUSTOM HOOKS
// ============================================
const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const runeRef = useRef<HTMLDivElement>(null);

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

    // Container entrance animation
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        {
          opacity: 0,
        },
        {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
        }
      );
    }

    // Card entrance animation
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        {
          opacity: 0,
          scale: 0.8,
          y: 30,
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: CONFIG.ENTRANCE_DURATION,
          ease: 'back.out(1.7)',
          delay: 0.2,
        }
      );
    }

    // Rune float animation
    if (runeRef.current) {
      gsap.to(runeRef.current, {
        y: -6,
        duration: CONFIG.RUNE_FLOAT_DURATION / 1000,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    return () => clearInterval(torchInterval);
  }, []);

  const setTorchRef = (index: number) => (el: HTMLSpanElement | null) => {
    torchRefs.current[index] = el;
  };

  return { containerRef, cardRef, runeRef, setTorchRef };
};

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const ScoreCard = memo(
  ({
    value,
    label,
    borderColor,
    bgColor,
    textColor,
  }: {
    value: number | string;
    label: string;
    borderColor: string;
    bgColor: string;
    textColor: string;
  }) => (
    <div className={`rounded-xl p-3 sm:p-4 border-2 ${borderColor} ${bgColor} backdrop-blur-sm`}>
      <div className={`text-xl sm:text-2xl font-bold ${textColor} dungeon-rune-float`}>{value}</div>
      <div className="text-xs sm:text-sm text-stone-300 mt-1">{label}</div>
    </div>
  )
);

ScoreCard.displayName = 'ScoreCard';

// ============================================
// MAIN COMPONENT
// ============================================
export default function StageTransition({ result, currentStage, totalStages }: Props) {
  const { containerRef, cardRef, runeRef, setTorchRef } = useDungeonAtmosphere();

  const isGame = !!result.gameComplete;
  const isStage = !!result.stageComplete;

  if (!isGame && !isStage) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[70]">
      {/* Latar dungeon dengan gradasi */}
      <div className="absolute inset-0 bg-gradient-to-br from-stone-900/95 via-stone-900/85 to-amber-950/80 backdrop-blur-sm" />

      {/* Decorative torches */}
      <div className="absolute top-4 left-4 text-xl sm:text-2xl select-none">
        <span ref={setTorchRef(0)} className="dungeon-torch-flicker">
          🔥
        </span>
      </div>
      <div className="absolute top-4 right-4 text-xl sm:text-2xl select-none">
        <span ref={setTorchRef(1)} className="dungeon-torch-flicker">
          🔥
        </span>
      </div>

      <div className="relative h-full w-full flex items-center justify-center px-4">
        {/* Game Complete */}
        {isGame && (
          <div ref={cardRef}>
            <Card className="max-w-md w-full border-4 border-emerald-700 bg-gradient-to-b from-stone-900 to-emerald-950 text-center overflow-hidden shadow-2xl shadow-emerald-900/50 dungeon-card-glow-green">
              <CardHeader className="p-6 sm:p-8">
                <div ref={runeRef} className="text-5xl sm:text-6xl mb-4 inline-block">
                  🏆
                </div>
                <CardTitle className="text-emerald-200 text-2xl sm:text-3xl font-extrabold dungeon-glow-text">
                  Misi Dungeon Tuntas!
                </CardTitle>
                <CardDescription className="text-stone-300 text-sm sm:text-base mt-2 leading-relaxed">
                  {result.message || 'Seluruh cobaan telah ditaklukkan. Guild telah menguasai dungeon!'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-6 sm:p-8">
                <div className="rounded-xl p-4 sm:p-6 border-2 border-emerald-700 bg-emerald-900/30 backdrop-blur-sm">
                  <div className="text-4xl sm:text-5xl font-extrabold text-emerald-300 dungeon-rune-float mb-2">
                    {(result.finalScore ?? 0).toLocaleString()}
                  </div>
                  <div className="text-sm sm:text-base text-emerald-200 font-semibold">
                    Skor Penaklukan Total
                  </div>
                </div>

                <div className="bg-stone-800/40 p-4 rounded-xl border border-stone-700 backdrop-blur-sm">
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                    Tutup portal ini untuk kembali ke guild hall atau tunggu pemandu melanjutkan ritual
                    berikutnya.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-emerald-300">
                  <span className="text-2xl">🎉</span>
                  <span className="text-sm font-semibold">Selamat kepada para petualang!</span>
                  <span className="text-2xl">🎉</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stage Complete */}
        {isStage && !isGame && (
          <div ref={cardRef}>
            <Card className="max-w-md w-full border-4 border-indigo-700 bg-gradient-to-b from-stone-900 to-indigo-950 text-center overflow-hidden shadow-2xl shadow-indigo-900/50 dungeon-card-glow-blue">
              <CardHeader className="p-6 sm:p-8">
                <div ref={runeRef} className="text-5xl sm:text-6xl mb-4 inline-block">
                  ✅
                </div>
                <CardTitle className="text-indigo-200 text-2xl sm:text-3xl font-extrabold dungeon-glow-text">
                  Tahap {currentStage ?? '-'} Tuntas
                </CardTitle>
                <CardDescription className="text-stone-300 text-sm sm:text-base mt-2 leading-relaxed">
                  {result.message || 'Gerbang dungeon berikutnya telah terbuka. Bersiaplah!'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-6 sm:p-8">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <ScoreCard
                    value={(result.stageScore ?? 0).toLocaleString()}
                    label="Skor Tahap Ini"
                    borderColor="border-indigo-700"
                    bgColor="bg-stone-900/60"
                    textColor="text-indigo-200"
                  />
                  <ScoreCard
                    value={`${result.nextStage ?? (currentStage ?? 0) + 1}${
                      totalStages ? `/${totalStages}` : ''
                    }`}
                    label="Tahap Berikutnya"
                    borderColor="border-amber-700"
                    bgColor="bg-stone-900/60"
                    textColor="text-amber-300"
                  />
                </div>

                <div className="bg-stone-800/40 p-4 rounded-xl border border-stone-700 backdrop-blur-sm">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-amber-300 text-xl">⏳</span>
                    <p className="text-sm sm:text-base text-stone-300 font-semibold">
                      Berpindah ke tahap berikutnya dalam {CONFIG.COUNTDOWN_DURATION} detik…
                    </p>
                  </div>
                  <div className="w-full bg-stone-700 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full rounded-full animate-[progress_3s_linear]"></div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-indigo-300">
                  <span className="text-2xl">⚔️</span>
                  <span className="text-sm font-semibold">Bersiaplah untuk tantangan berikutnya!</span>
                  <span className="text-2xl">🛡️</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ========================================
          CUSTOM DUNGEON STYLES
          ======================================== */}
      <style>{`
        /* Torch Flicker */
        .dungeon-torch-flicker {
          display: inline-block;
        }

        /* Rune Float */
        .dungeon-rune-float {
          display: inline-block;
        }

        /* Card Glows */
        .dungeon-card-glow-green {
          box-shadow: 0 0 30px rgba(34, 197, 94, 0.4), 0 0 60px rgba(34, 197, 94, 0.2);
        }

        .dungeon-card-glow-blue {
          box-shadow: 0 0 30px rgba(99, 102, 241, 0.4), 0 0 60px rgba(99, 102, 241, 0.2);
        }

        /* Text Glow */
        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4);
        }

        /* Progress Animation */
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .dungeon-card-glow-green,
          .dungeon-card-glow-blue {
            box-shadow: 0 0 15px rgba(34, 197, 94, 0.3);
          }
        }
      `}</style>
    </div>
  );
}
