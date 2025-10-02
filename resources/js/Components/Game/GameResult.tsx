import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Link } from '@inertiajs/react';
import { GameState } from '@/types/game';
import { gsap } from 'gsap';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  MIN_ATTEMPTS_FOR_RATING: 1,
  EXCELLENT_RATE: 80,
  GOOD_RATE: 60,
  CELEBRATION_DURATION: 3000,
  CONFETTI_COUNT: 30,
  STATS_DELAY: 300,
  TORCH_FLICKER_INTERVAL: 2200,
} as const;

const GRADE_CONFIG = {
  S: { grade: 'S', color: 'text-yellow-300', icon: '⭐', minRate: 90 },
  A: { grade: 'A', color: 'text-emerald-300', icon: '🌟', minRate: 80 },
  B: { grade: 'B', color: 'text-blue-300', icon: '✨', minRate: 70 },
  C: { grade: 'C', color: 'text-purple-300', icon: '💫', minRate: 60 },
  D: { grade: 'D', color: 'text-gray-300', icon: '🔷', minRate: 0 },
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================
interface Props {
  gameState: GameState;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
const getPerformanceMessage = (rate: number, isSuccess: boolean): string => {
  if (!isSuccess) {
    return 'Dungeon masih berdiri! Pelajari strategi baru dan tantang kembali kegelapan.';
  }

  if (rate >= CONFIG.EXCELLENT_RATE) {
    return 'Legendaris! Koordinasi guild sempurna menakhlukkan dungeon! 🌟';
  } else if (rate >= CONFIG.GOOD_RATE) {
    return 'Hebat! Komunikasi guild solid, terus tingkatkan strategi! 💪';
  } else {
    return 'Berhasil! Masih ada ruang untuk meningkatkan sinergi guild. 📈';
  }
};

const getGrade = (rate: number): typeof GRADE_CONFIG[keyof typeof GRADE_CONFIG] => {
  if (rate >= 90) return GRADE_CONFIG.S;
  if (rate >= 80) return GRADE_CONFIG.A;
  if (rate >= 70) return GRADE_CONFIG.B;
  if (rate >= 60) return GRADE_CONFIG.C;
  return GRADE_CONFIG.D;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ============================================
// CUSTOM HOOKS
// ============================================
const useDungeonAtmosphere = (isSuccess: boolean) => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const statsRefs = useRef<(HTMLElement | null)[]>([]);

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
          y: 30,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
        }
      );
    }

    return () => clearInterval(torchInterval);
  }, []);

  useEffect(() => {
    // Stats cards stagger animation
    const validStats = statsRefs.current.filter((stat): stat is HTMLElement => stat !== null);
    if (validStats.length > 0) {
      gsap.fromTo(
        validStats,
        {
          opacity: 0,
          y: 20,
          scale: 0.9,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: 'back.out(1.4)',
        }
      );
    }
  }, []);

  const setTorchRef = (index: number) => (el: HTMLSpanElement | null) => {
    torchRefs.current[index] = el;
  };

  const setStatsRef = (index: number) => (el: HTMLDivElement | null) => {
    statsRefs.current[index] = el;
  };

  return { containerRef, setTorchRef, setStatsRef };
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function GameResult({ gameState }: Props) {
  const { session } = gameState;
  const isSuccess = session.status === 'success';

  const { containerRef, setTorchRef, setStatsRef } = useDungeonAtmosphere(isSuccess);

  const [showCelebration, setShowCelebration] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);

  const attempts = session.attempts || [];
  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.is_correct).length;
  const incorrectAttempts = totalAttempts - correctAttempts;

  const participants = session.participants || [];
  const defuser = participants.find((p) => p.role === 'defuser');
  const expert = participants.find((p) => p.role === 'expert');

  // Hitung rate dan grade
  const rate = useMemo(
    () => (totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0),
    [correctAttempts, totalAttempts]
  );

  const grade = useMemo(() => getGrade(rate), [rate]);
  const performanceMessage = useMemo(() => getPerformanceMessage(rate, isSuccess), [rate, isSuccess]);

  // Hitung durasi sesi
  const sessionDuration = useMemo(() => {
    if (session.started_at && session.ends_at) {
      const start = new Date(session.started_at).getTime();
      const end = new Date(session.ends_at).getTime();
      return Math.floor((end - start) / 1000);
    }
    return 0;
  }, [session.started_at, session.ends_at]);

  // Animasi saat komponen dimuat
  useEffect(() => {
    if (isSuccess) {
      setShowCelebration(true);
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, CONFIG.CELEBRATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  useEffect(() => {
    // Tunda tampilan stats untuk efek dramatis
    const timer = setTimeout(() => {
      setStatsVisible(true);
    }, CONFIG.STATS_DELAY);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={containerRef} className="space-y-6 max-w-4xl mx-auto px-4">
      {/* Efek Konfeti untuk Success */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(CONFIG.CONFETTI_COUNT)].map((_, i) => (
            <div
              key={i}
              className="dungeon-confetti absolute text-2xl sm:text-3xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-50px',
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              {['🎉', '✨', '⭐', '🌟', '💫'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      {/* Header Hasil dengan Grade */}
      <Card
        className={`text-center border-4 overflow-hidden relative ${
          isSuccess
            ? 'bg-gradient-to-br from-stone-900 via-emerald-950 to-stone-900 border-emerald-600 shadow-2xl shadow-emerald-900/50 dungeon-card-glow-green'
            : 'bg-gradient-to-br from-stone-900 via-red-950 to-stone-900 border-red-600 shadow-2xl shadow-red-900/50 dungeon-card-glow-red'
        }`}
      >
        {/* Decorative torches */}
        <div className="absolute top-4 left-4 text-xl sm:text-2xl z-10">
          <span ref={setTorchRef(0)} className="dungeon-torch-flicker">
            🔥
          </span>
        </div>
        <div className="absolute top-4 right-4 text-xl sm:text-2xl z-10">
          <span ref={setTorchRef(1)} className="dungeon-torch-flicker">
            🔥
          </span>
        </div>

        {/* Decorative background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent)]" />
        </div>

        <CardContent className="p-6 sm:p-8 md:p-12 relative z-10">
          <div className="text-6xl sm:text-7xl md:text-8xl mb-4 dungeon-rune-float inline-block">
            {isSuccess ? '🏆' : '💥'}
          </div>

          <h2
            className={`text-2xl sm:text-3xl md:text-4xl font-extrabold mb-3 dungeon-glow-text ${
              isSuccess ? 'text-emerald-200' : 'text-red-200'
            }`}
          >
            {isSuccess ? 'DUNGEON DITAKLUKKAN!' : 'GUILD TUMBANG!'}
          </h2>

          {/* Grade Badge untuk Success */}
          {isSuccess && totalAttempts >= CONFIG.MIN_ATTEMPTS_FOR_RATING && (
            <div className="inline-flex items-center gap-3 bg-stone-900/70 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-full border-2 border-stone-700 mb-4">
              <span className="text-2xl sm:text-3xl dungeon-rune-float">{grade.icon}</span>
              <span className={`text-2xl sm:text-3xl md:text-4xl font-black ${grade.color} dungeon-glow-text`}>
                PERINGKAT {grade.grade}
              </span>
            </div>
          )}

          <p
            className={`text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed ${
              isSuccess ? 'text-emerald-200' : 'text-red-200'
            }`}
          >
            {performanceMessage}
          </p>
        </CardContent>
      </Card>

      {/* Statistik Gim dengan Animasi Stagger */}
      {statsVisible && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Percobaan */}
          <div ref={setStatsRef(0)}>
            <Card className="border-2 border-stone-700 bg-gradient-to-br from-stone-900 to-stone-800 text-center hover:scale-105 transition-transform duration-300 dungeon-card-glow">
              <CardContent className="p-4 sm:p-6">
                <div className="text-3xl sm:text-4xl mb-2">🎯</div>
                <div className="text-2xl sm:text-3xl font-bold text-indigo-300 dungeon-rune-float">
                  {totalAttempts}
                </div>
                <div className="text-xs sm:text-sm text-stone-400 mt-1">Total Percobaan</div>
              </CardContent>
            </Card>
          </div>

          {/* Percobaan Benar */}
          <div ref={setStatsRef(1)}>
            <Card className="border-2 border-stone-700 bg-gradient-to-br from-stone-900 to-stone-800 text-center hover:scale-105 transition-transform duration-300 dungeon-card-glow">
              <CardContent className="p-4 sm:p-6">
                <div className="text-3xl sm:text-4xl mb-2">✅</div>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-300 dungeon-rune-float">
                  {correctAttempts}
                </div>
                <div className="text-xs sm:text-sm text-stone-400 mt-1">Percobaan Benar</div>
              </CardContent>
            </Card>
          </div>

          {/* Percobaan Salah */}
          <div ref={setStatsRef(2)}>
            <Card className="border-2 border-stone-700 bg-gradient-to-br from-stone-900 to-stone-800 text-center hover:scale-105 transition-transform duration-300 dungeon-card-glow">
              <CardContent className="p-4 sm:p-6">
                <div className="text-3xl sm:text-4xl mb-2">❌</div>
                <div className="text-2xl sm:text-3xl font-bold text-red-300 dungeon-rune-float">
                  {incorrectAttempts}
                </div>
                <div className="text-xs sm:text-sm text-stone-400 mt-1">Percobaan Salah</div>
              </CardContent>
            </Card>
          </div>

          {/* Tingkat Keberhasilan */}
          <div ref={setStatsRef(3)}>
            <Card className="border-2 border-stone-700 bg-gradient-to-br from-stone-900 to-stone-800 text-center hover:scale-105 transition-transform duration-300 dungeon-card-glow">
              <CardContent className="p-4 sm:p-6">
                <div className="text-3xl sm:text-4xl mb-2">📊</div>
                <div
                  className={`text-2xl sm:text-3xl font-bold dungeon-rune-float ${
                    rate >= CONFIG.EXCELLENT_RATE
                      ? 'text-yellow-300'
                      : rate >= CONFIG.GOOD_RATE
                      ? 'text-emerald-300'
                      : 'text-amber-300'
                  }`}
                >
                  {rate}%
                </div>
                <div className="text-xs sm:text-sm text-stone-400 mt-1">Akurasi Guild</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Performa Tim */}
      {statsVisible && (
        <Card className="border-2 border-stone-700 bg-gradient-to-br from-stone-900 to-stone-800 dungeon-card-glow">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-stone-200 text-lg sm:text-xl flex items-center gap-2 dungeon-glow-text">
              <span>🏆</span> Performa Guild
            </CardTitle>
            <CardDescription className="text-stone-400 text-sm">
              Kontribusi petualang dan detail ekspedisi dungeon
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
            {/* Anggota Tim */}
            <div>
              <h4 className="font-semibold text-stone-200 mb-4 flex items-center gap-2 text-sm sm:text-base">
                <span>👥</span> Anggota Guild
              </h4>
              <div className="space-y-3">
                {defuser && (
                  <div className="group flex items-center p-3 sm:p-4 rounded-xl border-2 border-stone-700 bg-stone-900/60 hover:bg-stone-800/80 hover:border-red-700 transition-all duration-300">
                    <div className="text-2xl sm:text-3xl mr-3 group-hover:scale-110 transition-transform">
                      💣
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-200 text-sm sm:text-base truncate">
                        {defuser.nickname}
                      </div>
                      <div className="text-xs text-stone-400">Penjinakan Bom</div>
                    </div>
                    <Badge className="bg-red-800/80 text-red-100 border-red-700 font-semibold text-xs">
                      Aktif
                    </Badge>
                  </div>
                )}
                {expert && (
                  <div className="group flex items-center p-3 sm:p-4 rounded-xl border-2 border-stone-700 bg-stone-900/60 hover:bg-stone-800/80 hover:border-indigo-700 transition-all duration-300">
                    <div className="text-2xl sm:text-3xl mr-3 group-hover:scale-110 transition-transform">
                      📖
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-200 text-sm sm:text-base truncate">
                        {expert.nickname}
                      </div>
                      <div className="text-xs text-stone-400">Ahli Grimoire</div>
                    </div>
                    <Badge className="bg-indigo-800/80 text-indigo-100 border-indigo-700 font-semibold text-xs">
                      Aktif
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Rincian Misi */}
            <div>
              <h4 className="font-semibold text-stone-200 mb-4 flex items-center gap-2 text-sm sm:text-base">
                <span>📋</span> Rincian Ekspedisi
              </h4>
              {session.stage && (
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-stone-900/40">
                    <span className="text-stone-400">Tahap Dungeon:</span>
                    <span className="font-semibold text-stone-100">{session.stage.name}</span>
                  </div>

                  {sessionDuration > 0 && (
                    <div className="flex justify-between items-center p-3 rounded-lg bg-stone-900/40">
                      <span className="text-stone-400">Durasi Ekspedisi:</span>
                      <span className="font-semibold text-stone-100 font-mono">
                        {formatDuration(sessionDuration)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center p-3 rounded-lg bg-stone-900/40">
                    <span className="text-stone-400">Batas Waktu:</span>
                    <span className="font-semibold text-stone-100">
                      {session.stage.config?.timeLimit || 180} detik
                    </span>
                  </div>

                  {session.stage.mission && (
                    <div className="p-3 rounded-lg bg-stone-900/40">
                      <div className="text-stone-400 text-xs mb-1">Misi Dungeon:</div>
                      <div className="font-semibold text-stone-100">
                        {session.stage.mission.title}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tombol Aksi */}
      {statsVisible && (
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link href="/game" className="w-full sm:w-auto">
            <Button className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-5 sm:py-6 text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 dungeon-button-glow">
              <span className="mr-2 text-xl sm:text-2xl">🎮</span>
              Tantang Dungeon Lagi
            </Button>
          </Link>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full border-2 border-stone-600 text-stone-200 hover:bg-stone-800 hover:border-stone-500 font-bold py-5 sm:py-6 text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <span className="mr-2 text-xl sm:text-2xl">🏠</span>
              Kembali ke Guild Hall
            </Button>
          </Link>
        </div>
      )}

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
          animation: runeFloat 3.2s ease-in-out infinite;
        }

        @keyframes runeFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.05); }
        }

        /* Confetti */
        .dungeon-confetti {
          animation: confetti 3s ease-out forwards;
        }

        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }

        /* Card Glows */
        .dungeon-card-glow {
          box-shadow: 0 0 20px rgba(120, 113, 108, 0.4);
        }

        .dungeon-card-glow-green {
          box-shadow: 0 0 30px rgba(34, 197, 94, 0.4), 0 0 60px rgba(34, 197, 94, 0.2);
        }

        .dungeon-card-glow-red {
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.4), 0 0 60px rgba(239, 68, 68, 0.2);
        }

        /* Button Glow */
        .dungeon-button-glow:hover {
          box-shadow: 0 0 20px rgba(79, 70, 229, 0.5), 0 0 40px rgba(79, 70, 229, 0.3);
        }

        /* Text Glow */
        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4);
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .dungeon-card-glow,
          .dungeon-card-glow-green,
          .dungeon-card-glow-red {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
          }
        }
      `}</style>
    </div>
  );
}
