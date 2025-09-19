// resources/js/Components/Game/StageProgress.tsx
import React, { useMemo } from 'react';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Progress } from '@/Components/ui/progress';

interface Props {
  current: number;
  total: number;
  completed: number[];
  totalScore: number;
}

export default function StageProgress({ current, total, completed, totalScore }: Props) {
  const percent = useMemo(() => {
    const done = Math.min(completed.length, total);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [completed.length, total]);

  return (
    <Card className="overflow-hidden border-4 border-amber-700 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
      <style>{`
        @keyframes torchFlicker { 0%,100%{opacity:1;filter:brightness(1)} 25%{opacity:.86;filter:brightness(1.12)} 50%{opacity:.75;filter:brightness(.95)} 75%{opacity:.92;filter:brightness(1.05)} }
        @keyframes runeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
        .rune-float { animation: runeFloat 3.2s ease-in-out infinite; }
      `}</style>

      <CardContent className="p-5">
        {/* Header skor dan label */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-amber-300 flex items-center gap-2">
            <span className="torch-flicker">🕯️</span>
            Kemajuan Misi
          </h3>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-emerald-300 rune-float">{totalScore}</div>
            <div className="text-sm text-stone-300">Skor Total</div>
          </div>
        </div>

        {/* Deretan tahap berbentuk batu runik */}
        <div className="flex items-center gap-3 mb-4">
          {Array.from({ length: total }, (_, i) => {
            const stageNumber = i + 1;
            const isCompleted = completed.includes(stageNumber);
            const isCurrent = stageNumber === current;

            return (
              <React.Fragment key={stageNumber}>
                <div
                  className={[
                    'w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold select-none',
                    'shadow-[inset_0_-2px_6px_rgba(0,0,0,.35)]',
                    isCompleted
                      ? 'bg-emerald-900/50 border-emerald-700 text-emerald-200'
                      : isCurrent
                      ? 'bg-indigo-900/50 border-indigo-600 text-indigo-200 rune-float'
                      : 'bg-stone-900/60 border-stone-700 text-stone-300',
                  ].join(' ')}
                  title={isCompleted ? `Tahap ${stageNumber}: Tuntas` : isCurrent ? `Tahap ${stageNumber}: Berjalan` : `Tahap ${stageNumber}: Menanti`}
                >
                  {isCompleted ? '✓' : stageNumber}
                </div>

                {stageNumber < total && (
                  <div
                    className={[
                      'flex-1 h-1.5 rounded',
                      completed.includes(stageNumber) ? 'bg-emerald-700' : 'bg-stone-700',
                    ].join(' ')}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress bar total (shadcn/ui Progress) */}
        <div className="mb-2">
          <Progress value={percent} className="h-2 bg-stone-700">
            {/* Indicator ditangani oleh komponen Progress */}
          </Progress>
        </div>
        <div className="flex items-center justify-between text-xs text-stone-300 mb-4">
          <span>{completed.length} tuntas</span>
          <span>{percent}%</span>
          <span>{Math.max(total - completed.length, 0)} tersisa</span>
        </div>

        {/* Ringkasan status dalam badge */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-emerald-300">{completed.length}</div>
            <Badge className="mt-1 bg-emerald-800 text-emerald-100 border-emerald-700">Tuntas</Badge>
          </div>
          <div>
            <div className="text-lg font-bold text-indigo-300">{current}</div>
            <Badge className="mt-1 bg-indigo-800 text-indigo-100 border-indigo-700">Berjalan</Badge>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-200">{Math.max(total - current, 0)}</div>
            <Badge className="mt-1 bg-stone-700 text-stone-200 border-stone-600">Tersisa</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
