// resources/js/Components/Game/StageTransition.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';

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

export default function StageTransition({ result, currentStage, totalStages }: Props) {
  const isGame = !!result.gameComplete;
  const isStage = !!result.stageComplete;

  if (!isGame && !isStage) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Latar dungeon dengan gradasi dan partikel halus */}
      <style>{`
        @keyframes torchFlicker { 0%,100%{opacity:1;filter:brightness(1)} 25%{opacity:.86;filter:brightness(1.12)} 50%{opacity:.75;filter:brightness(.95)} 75%{opacity:.92;filter:brightness(1.05)} }
        @keyframes runeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
        .rune-float { animation: runeFloat 3.2s ease-in-out infinite; }
      `}</style>

      <div className="absolute inset-0 bg-gradient-to-br from-stone-900/95 via-stone-900/85 to-amber-950/80 backdrop-blur-sm" />
      <div className="absolute top-4 left-4 text-2xl torch-flicker select-none">🔥</div>
      <div className="absolute top-4 right-4 text-2xl torch-flicker select-none">🔥</div>

      <div className="relative h-full w-full flex items-center justify-center px-4">
        {/* Game selesai */}
        {isGame && (
          <Card className="max-w-md w-full border-4 border-emerald-700 bg-gradient-to-b from-stone-900 to-emerald-950 text-center overflow-hidden">
            <CardHeader>
              <div className="text-6xl mb-2 rune-float">🎉</div>
              <CardTitle className="text-emerald-200 text-2xl">Misi Tuntas!</CardTitle>
              <CardDescription className="text-stone-300">
                {result.message || 'Seluruh cobaan telah ditaklukkan.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl p-4 border-2 border-emerald-700 bg-emerald-900/30">
                <div className="text-3xl font-extrabold text-emerald-300 rune-float">{result.finalScore ?? 0}</div>
                <div className="text-sm text-emerald-200">Skor Akhir</div>
              </div>
              <p className="text-xs text-stone-400">
                Tutup tabir ini untuk kembali ke ruang utama atau menunggu pemandu melanjutkan ritual.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tahap selesai */}
        {isStage && !isGame && (
          <Card className="max-w-md w-full border-4 border-indigo-700 bg-gradient-to-b from-stone-900 to-indigo-950 text-center overflow-hidden">
            <CardHeader>
              <div className="text-6xl mb-2 rune-float">✅</div>
              <CardTitle className="text-indigo-200 text-2xl">
                Tahap {currentStage ?? '-'} Tuntas
              </CardTitle>
              <CardDescription className="text-stone-300">
                {result.message || 'Gerbang berikutnya telah terbuka.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-3 border-2 border-indigo-700 bg-stone-900/60">
                  <div className="text-xl font-bold text-indigo-200">{result.stageScore ?? 0}</div>
                  <div className="text-xs text-stone-300">Skor Tahap</div>
                </div>
                <div className="rounded-xl p-3 border-2 border-amber-700 bg-stone-900/60">
                  <div className="text-xl font-bold text-amber-300">
                    {result.nextStage ?? (currentStage ?? 0) + 1}{totalStages ? `/${totalStages}` : ''}
                  </div>
                  <div className="text-xs text-stone-300">Tahap Berikut</div>
                </div>
              </div>

              <div className="text-sm text-stone-300">
                Berpindah ke tahap berikut dalam 3 detik…
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
