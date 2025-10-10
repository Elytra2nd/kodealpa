import React, { useEffect, useRef, memo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { gsap } from 'gsap';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  TORCH_FLICKER_INTERVAL: 150,
  ENTRANCE_DURATION: 0.8,
  RUNE_FLOAT_DURATION: 3200,
  COUNTDOWN_DURATION: 3,
  MOBILE_BREAKPOINT: 768,
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
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

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
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const runeRef = useRef<HTMLDivElement>(null);
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

    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
        }
      );
    }

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

    if (runeRef.current) {
      gsap.to(runeRef.current, {
        y: -6,
        duration: CONFIG.RUNE_FLOAT_DURATION / 1000,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
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

  return { containerRef, cardRef, runeRef, setTorchRef };
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
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.08 },
  },
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
    isMobile,
  }: {
    value: number | string;
    label: string;
    borderColor: string;
    bgColor: string;
    textColor: string;
    isMobile: boolean;
  }) => (
    <motion.div variants={fadeInUp} className={`rounded-xl ${isMobile ? 'p-3' : 'p-3 sm:p-4'} border-2 ${borderColor} ${bgColor} backdrop-blur-sm`}>
      <div className={`${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'} font-bold ${textColor} dungeon-rune-float`}>{value}</div>
      <div className={`${isMobile ? 'text-xs' : 'text-xs sm:text-sm'} text-stone-300 mt-1`}>{label}</div>
    </motion.div>
  )
);

ScoreCard.displayName = 'ScoreCard';

const Confetti = memo(() => {
  const confettiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (confettiRef.current) {
      const confettiElements = confettiRef.current.querySelectorAll('.confetti-piece');
      confettiElements.forEach((piece, index) => {
        gsap.to(piece, {
          y: 100,
          x: (index % 2 === 0 ? 1 : -1) * (Math.random() * 100 + 50),
          rotation: Math.random() * 360,
          opacity: 0,
          duration: 2 + Math.random(),
          delay: Math.random() * 0.5,
          repeat: -1,
          ease: 'power1.out',
        });
      });
    }
  }, []);

  return (
    <div ref={confettiRef} className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          className="confetti-piece absolute top-0"
          style={{
            left: `${Math.random() * 100}%`,
            fontSize: `${Math.random() * 10 + 15}px`,
          }}
        >
          {['🎉', '✨', '⭐', '🏆', '👑'][Math.floor(Math.random() * 5)]}
        </div>
      ))}
    </div>
  );
});

Confetti.displayName = 'Confetti';

// ============================================
// MAIN COMPONENT
// ============================================
export default function StageTransition({ result, currentStage, totalStages }: Props) {
  const isMobile = useIsMobile();
  const { containerRef, cardRef, runeRef, setTorchRef } = useDungeonAtmosphere();

  const isGame = !!result.gameComplete;
  const isStage = !!result.stageComplete;

  if (!isGame && !isStage) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70]"
      >
        {/* Latar dungeon dengan gradasi */}
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900/95 via-stone-900/85 to-amber-950/80 backdrop-blur-sm" />

        {/* Confetti untuk game complete */}
        {isGame && <Confetti />}

        {/* Decorative torches */}
        <div className={`absolute ${isMobile ? 'top-2 left-2 text-lg' : 'top-4 left-4 text-xl sm:text-2xl'} select-none`}>
          <span ref={setTorchRef(0)} className="dungeon-torch-flicker">
            🔥
          </span>
        </div>
        <div className={`absolute ${isMobile ? 'top-2 right-2 text-lg' : 'top-4 right-4 text-xl sm:text-2xl'} select-none`}>
          <span ref={setTorchRef(1)} className="dungeon-torch-flicker">
            🔥
          </span>
        </div>

        <div className="relative h-full w-full flex items-center justify-center px-4">
          {/* Game Complete */}
          {isGame && (
            <motion.div ref={cardRef} variants={scaleIn} initial="initial" animate="animate">
              <Card
                className={`max-w-md w-full border-4 border-emerald-700 bg-gradient-to-b from-stone-900 to-emerald-950 text-center overflow-hidden shadow-2xl shadow-emerald-900/50 dungeon-card-glow-green`}
              >
                <CardHeader className={isMobile ? 'p-4' : 'p-6 sm:p-8'}>
                  <motion.div
                    ref={runeRef}
                    className={`${isMobile ? 'text-4xl' : 'text-5xl sm:text-6xl'} mb-4 inline-block`}
                    animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    aria-hidden="true"
                  >
                    🏆
                  </motion.div>
                  <CardTitle className={`text-emerald-200 ${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'} font-extrabold dungeon-glow-text`}>
                    Misi Dungeon Tuntas!
                  </CardTitle>
                  <CardDescription className={`text-stone-300 ${isMobile ? 'text-xs' : 'text-sm sm:text-base'} mt-2 leading-relaxed`}>
                    {result.message || 'Seluruh cobaan telah ditaklukkan. Guild telah menguasai dungeon!'}
                  </CardDescription>
                </CardHeader>
                <CardContent className={`space-y-4 sm:space-y-6 ${isMobile ? 'p-4' : 'p-6 sm:p-8'}`}>
                  <motion.div
                    variants={fadeInUp}
                    className={`rounded-xl ${isMobile ? 'p-4' : 'p-4 sm:p-6'} border-2 border-emerald-700 bg-emerald-900/30 backdrop-blur-sm`}
                  >
                    <div className={`${isMobile ? 'text-3xl' : 'text-4xl sm:text-5xl'} font-extrabold text-emerald-300 dungeon-rune-float mb-2`}>
                      {(result.finalScore ?? 0).toLocaleString()}
                    </div>
                    <div className={`${isMobile ? 'text-xs' : 'text-sm sm:text-base'} text-emerald-200 font-semibold`}>Skor Penaklukan Total</div>
                  </motion.div>

                  <motion.div variants={fadeInUp} className={`bg-stone-800/40 ${isMobile ? 'p-3' : 'p-4'} rounded-xl border border-stone-700 backdrop-blur-sm`}>
                    <p className={`${isMobile ? 'text-xs' : 'text-xs sm:text-sm'} text-stone-300 leading-relaxed`}>
                      Tutup portal ini untuk kembali ke guild hall atau tunggu pemandu melanjutkan ritual berikutnya.
                    </p>
                  </motion.div>

                  <motion.div variants={fadeInUp} className="flex items-center justify-center gap-2 text-emerald-300">
                    <span className={isMobile ? 'text-xl' : 'text-2xl'} aria-hidden="true">
                      🎉
                    </span>
                    <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>Selamat kepada para petualang!</span>
                    <span className={isMobile ? 'text-xl' : 'text-2xl'} aria-hidden="true">
                      🎉
                    </span>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Stage Complete */}
          {isStage && !isGame && (
            <motion.div ref={cardRef} variants={scaleIn} initial="initial" animate="animate">
              <Card
                className={`max-w-md w-full border-4 border-indigo-700 bg-gradient-to-b from-stone-900 to-indigo-950 text-center overflow-hidden shadow-2xl shadow-indigo-900/50 dungeon-card-glow-blue`}
              >
                <CardHeader className={isMobile ? 'p-4' : 'p-6 sm:p-8'}>
                  <motion.div
                    ref={runeRef}
                    className={`${isMobile ? 'text-4xl' : 'text-5xl sm:text-6xl'} mb-4 inline-block`}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    aria-hidden="true"
                  >
                    ✅
                  </motion.div>
                  <CardTitle className={`text-indigo-200 ${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'} font-extrabold dungeon-glow-text`}>
                    Tahap {currentStage ?? '-'} Tuntas
                  </CardTitle>
                  <CardDescription className={`text-stone-300 ${isMobile ? 'text-xs' : 'text-sm sm:text-base'} mt-2 leading-relaxed`}>
                    {result.message || 'Gerbang dungeon berikutnya telah terbuka. Bersiaplah!'}
                  </CardDescription>
                </CardHeader>
                <CardContent className={`space-y-4 sm:space-y-6 ${isMobile ? 'p-4' : 'p-6 sm:p-8'}`}>
                  <motion.div variants={staggerContainer} className="grid grid-cols-2 gap-3 sm:gap-4">
                    <ScoreCard
                      value={(result.stageScore ?? 0).toLocaleString()}
                      label="Skor Tahap Ini"
                      borderColor="border-indigo-700"
                      bgColor="bg-stone-900/60"
                      textColor="text-indigo-200"
                      isMobile={isMobile}
                    />
                    <ScoreCard
                      value={`${result.nextStage ?? (currentStage ?? 0) + 1}${totalStages ? `/${totalStages}` : ''}`}
                      label="Tahap Berikutnya"
                      borderColor="border-amber-700"
                      bgColor="bg-stone-900/60"
                      textColor="text-amber-300"
                      isMobile={isMobile}
                    />
                  </motion.div>

                  <motion.div variants={fadeInUp} className={`bg-stone-800/40 ${isMobile ? 'p-3' : 'p-4'} rounded-xl border border-stone-700 backdrop-blur-sm`}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-amber-300 text-lg sm:text-xl" aria-hidden="true">
                        ⏳
                      </span>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm sm:text-base'} text-stone-300 font-semibold`}>
                        Berpindah dalam {CONFIG.COUNTDOWN_DURATION} detik…
                      </p>
                    </div>
                    <div className="w-full bg-stone-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: CONFIG.COUNTDOWN_DURATION, ease: 'linear' }}
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={fadeInUp} className="flex items-center justify-center gap-2 text-indigo-300">
                    <span className={isMobile ? 'text-xl' : 'text-2xl'} aria-hidden="true">
                      ⚔️
                    </span>
                    <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>Bersiaplah untuk tantangan berikutnya!</span>
                    <span className={isMobile ? 'text-xl' : 'text-2xl'} aria-hidden="true">
                      🛡️
                    </span>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Styles */}
        <style>{`
          .dungeon-torch-flicker { display: inline-block; }
          .dungeon-rune-float { display: inline-block; }
          .dungeon-card-glow-green { box-shadow: 0 0 30px rgba(34, 197, 94, 0.4), 0 0 60px rgba(34, 197, 94, 0.2); }
          .dungeon-card-glow-blue { box-shadow: 0 0 30px rgba(99, 102, 241, 0.4), 0 0 60px rgba(99, 102, 241, 0.2); }
          .dungeon-glow-text { text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4); }
          @media (max-width: 768px) {
            .dungeon-card-glow-green, .dungeon-card-glow-blue {
              box-shadow: 0 0 15px rgba(34, 197, 94, 0.3);
            }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
