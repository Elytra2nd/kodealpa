import React, { useMemo, useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
import { GameState } from '@/types/game';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';

// Konstanta
const MIN_ATTEMPTS_FOR_RATING = 1;
const EXCELLENT_RATE = 80;
const GOOD_RATE = 60;
const CELEBRATION_DURATION = 3000;

interface Props {
  gameState: GameState;
}

// Helper untuk mendapatkan pesan berdasarkan performa
const getPerformanceMessage = (rate: number, isSuccess: boolean): string => {
  if (!isSuccess) {
    return 'Jangan menyerah! Analisis kesalahan dan coba strategi baru.';
  }

  if (rate >= EXCELLENT_RATE) {
    return 'Luar biasa! Kerja tim yang sempurna! 🌟';
  } else if (rate >= GOOD_RATE) {
    return 'Bagus! Komunikasi tim sudah baik, tingkatkan lagi! 💪';
  } else {
    return 'Berhasil! Ada ruang untuk meningkatkan koordinasi tim. 📈';
  }
};

// Helper untuk mendapatkan grade berdasarkan rate
const getGrade = (rate: number): { grade: string; color: string; icon: string } => {
  if (rate >= 90) return { grade: 'S', color: 'text-yellow-300', icon: '⭐' };
  if (rate >= 80) return { grade: 'A', color: 'text-emerald-300', icon: '🌟' };
  if (rate >= 70) return { grade: 'B', color: 'text-blue-300', icon: '✨' };
  if (rate >= 60) return { grade: 'C', color: 'text-purple-300', icon: '💫' };
  return { grade: 'D', color: 'text-gray-300', icon: '🔷' };
};

// Format durasi
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function GameResult({ gameState }: Props) {
  const { session } = gameState;
  const [showCelebration, setShowCelebration] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);

  const isSuccess = session.status === 'success';
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
  const performanceMessage = useMemo(
    () => getPerformanceMessage(rate, isSuccess),
    [rate, isSuccess]
  );

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
      }, CELEBRATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  useEffect(() => {
    // Tunda tampilan stats untuk efek dramatis
    const timer = setTimeout(() => {
      setStatsVisible(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] max-w-4xl mx-auto px-4">
      <style>{`
        @keyframes torchFlicker {
          0%,100%{opacity:1;filter:brightness(1)}
          25%{opacity:.86;filter:brightness(1.12)}
          50%{opacity:.75;filter:brightness(.95)}
          75%{opacity:.92;filter:brightness(1.05)}
        }
        @keyframes runeFloat {
          0%,100%{transform:translateY(0) scale(1)}
          50%{transform:translateY(-8px) scale(1.05)}
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
        .rune-float { animation: runeFloat 3.2s ease-in-out infinite; }
        .fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .scale-in { animation: scaleIn 0.5s ease-out forwards; }
        .confetti { animation: confetti 3s ease-out forwards; }
      `}</style>

      {/* Efek Konfeti untuk Success */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="confetti absolute text-3xl"
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
        className={`text-center border-4 overflow-hidden relative scale-in ${
          isSuccess
            ? 'bg-gradient-to-br from-stone-900 via-emerald-950 to-stone-900 border-emerald-600 shadow-2xl shadow-emerald-900/50'
            : 'bg-gradient-to-br from-stone-900 via-red-950 to-stone-900 border-red-600 shadow-2xl shadow-red-900/50'
        }`}
      >
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-10 torch-flicker">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent)]" />
        </div>

        <CardContent className="p-8 md:p-12 relative z-10">
          <div className="text-7xl md:text-8xl mb-4 rune-float inline-block">
            {isSuccess ? '🎉' : '💥'}
          </div>

          <h2
            className={`text-3xl md:text-4xl font-extrabold mb-3 ${
              isSuccess ? 'text-emerald-200' : 'text-red-200'
            }`}
          >
            {isSuccess ? 'PERANGKAT DIJINAKKAN!' : 'PERANGKAT MELEDAK!'}
          </h2>

          {/* Grade Badge untuk Success */}
          {isSuccess && totalAttempts >= MIN_ATTEMPTS_FOR_RATING && (
            <div className="inline-flex items-center gap-3 bg-stone-900/70 backdrop-blur-sm px-6 py-3 rounded-full border-2 border-stone-700 mb-4 scale-in">
              <span className="text-3xl">{grade.icon}</span>
              <span className={`text-4xl font-black ${grade.color}`}>
                PERINGKAT {grade.grade}
              </span>
            </div>
          )}

          <p className={`text-base md:text-lg max-w-2xl mx-auto ${
            isSuccess ? 'text-emerald-200' : 'text-red-200'
          }`}>
            {performanceMessage}
          </p>
        </CardContent>
      </Card>

      {/* Statistik Gim dengan Animasi Stagger */}
      {statsVisible && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Percobaan */}
          <Card
            className="border-2 border-stone-700 bg-gradient-to-br from-stone-900 to-stone-800 text-center hover:scale-105 transition-transform duration-300 fade-in"
            style={{ animationDelay: '0.1s' }}
          >
            <CardContent className="p-6">
              <div className="text-4xl mb-2">🎯</div>
              <div className="text-3xl font-bold text-indigo-300 rune-float">
                {totalAttempts}
              </div>
              <div className="text-sm text-stone-400 mt-1">Total Percobaan</div>
            </CardContent>
          </Card>

          {/* Percobaan Benar */}
          <Card
            className="border-2 border-stone-700 bg-gradient-to-br from-stone-900 to-stone-800 text-center hover:scale-105 transition-transform duration-300 fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <CardContent className="p-6">
              <div className="text-4xl mb-2">✅</div>
              <div className="text-3xl font-bold text-emerald-300 rune-float">
                {correctAttempts}
              </div>
              <div className="text-sm text-stone-400 mt-1">Percobaan Benar</div>
            </CardContent>
          </Card>

          {/* Percobaan Salah */}
          <Card
            className="border-2 border-stone-700 bg-gradient-to-br from-stone-900 to-stone-800 text-center hover:scale-105 transition-transform duration-300 fade-in"
            style={{ animationDelay: '0.3s' }}
          >
            <CardContent className="p-6">
              <div className="text-4xl mb-2">❌</div>
              <div className="text-3xl font-bold text-red-300 rune-float">
                {incorrectAttempts}
              </div>
              <div className="text-sm text-stone-400 mt-1">Percobaan Salah</div>
            </CardContent>
          </Card>

          {/* Tingkat Keberhasilan */}
          <Card
            className="border-2 border-stone-700 bg-gradient-to-br from-stone-900 to-stone-800 text-center hover:scale-105 transition-transform duration-300 fade-in"
            style={{ animationDelay: '0.4s' }}
          >
            <CardContent className="p-6">
              <div className="text-4xl mb-2">📊</div>
              <div className={`text-3xl font-bold rune-float ${
                rate >= EXCELLENT_RATE ? 'text-yellow-300' :
                rate >= GOOD_RATE ? 'text-emerald-300' : 'text-amber-300'
              }`}>
                {rate}%
              </div>
              <div className="text-sm text-stone-400 mt-1">Akurasi</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performa Tim - Redesigned */}
      {statsVisible && (
        <Card
          className="border-2 border-stone-700 bg-gradient-to-br from-stone-900 to-stone-800 fade-in"
          style={{ animationDelay: '0.5s' }}
        >
          <CardHeader>
            <CardTitle className="text-stone-200 text-xl flex items-center gap-2">
              <span>🏆</span> Performa Tim
            </CardTitle>
            <CardDescription className="text-stone-400">
              Kontribusi anggota dan detail misi
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            {/* Anggota Tim */}
            <div>
              <h4 className="font-semibold text-stone-200 mb-4 flex items-center gap-2">
                <span>👥</span> Anggota Tim
              </h4>
              <div className="space-y-3">
                {defuser && (
                  <div className="group flex items-center p-4 rounded-xl border-2 border-stone-700 bg-stone-900/60 hover:bg-stone-800/80 hover:border-red-700 transition-all duration-300">
                    <div className="text-3xl mr-3 group-hover:scale-110 transition-transform">💣</div>
                    <div className="flex-1">
                      <div className="font-bold text-stone-200">{defuser.nickname}</div>
                      <div className="text-xs text-stone-400">Penjinak Bom</div>
                    </div>
                    <Badge className="bg-red-800/80 text-red-100 border-red-700 font-semibold">
                      Aktif
                    </Badge>
                  </div>
                )}
                {expert && (
                  <div className="group flex items-center p-4 rounded-xl border-2 border-stone-700 bg-stone-900/60 hover:bg-stone-800/80 hover:border-indigo-700 transition-all duration-300">
                    <div className="text-3xl mr-3 group-hover:scale-110 transition-transform">📖</div>
                    <div className="flex-1">
                      <div className="font-bold text-stone-200">{expert.nickname}</div>
                      <div className="text-xs text-stone-400">Ahli Manual</div>
                    </div>
                    <Badge className="bg-indigo-800/80 text-indigo-100 border-indigo-700 font-semibold">
                      Aktif
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Rincian Misi */}
            <div>
              <h4 className="font-semibold text-stone-200 mb-4 flex items-center gap-2">
                <span>📋</span> Rincian Misi
              </h4>
              {session.stage && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-stone-900/40">
                    <span className="text-stone-400">Tahap:</span>
                    <span className="font-semibold text-stone-100">
                      {session.stage.name}
                    </span>
                  </div>

                  {sessionDuration > 0 && (
                    <div className="flex justify-between items-center p-3 rounded-lg bg-stone-900/40">
                      <span className="text-stone-400">Durasi:</span>
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
                      <div className="text-stone-400 text-xs mb-1">Misi:</div>
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

      {/* Tombol Aksi dengan Icon Animasi */}
      {statsVisible && (
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center fade-in"
          style={{ animationDelay: '0.6s' }}
        >
          <Link href="/game" className="w-full sm:w-auto">
            <Button
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-6 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <span className="mr-2 text-2xl">🎮</span>
              Main Lagi
            </Button>
          </Link>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full border-2 border-stone-600 text-stone-200 hover:bg-stone-800 hover:border-stone-500 font-bold py-6 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <span className="mr-2 text-2xl">🏠</span>
              Kembali ke Dasbor
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
