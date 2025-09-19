import React, { useMemo } from 'react';
import { Link } from '@inertiajs/react';
import { GameState } from '@/types/game';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';

interface Props {
  gameState: GameState;
}

export default function GameResult({ gameState }: Props) {
  const { session } = gameState;
  const isSuccess = session.status === 'success';
  const attempts = session.attempts || [];
  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.is_correct).length;

  const participants = session.participants || [];
  const defuser = participants.find((p) => p.role === 'defuser');
  const expert = participants.find((p) => p.role === 'expert');

  const rate = useMemo(
    () => (totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0),
    [correctAttempts, totalAttempts]
  );

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes torchFlicker { 0%,100%{opacity:1;filter:brightness(1)} 25%{opacity:.86;filter:brightness(1.12)} 50%{opacity:.75;filter:brightness(.95)} 75%{opacity:.92;filter:brightness(1.05)} }
        @keyframes runeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
        .rune-float { animation: runeFloat 3.2s ease-in-out infinite; }
      `}</style>

      {/* Header Hasil */}
      <Card
        className={[
          'text-center border-4',
          isSuccess
            ? 'bg-gradient-to-b from-stone-900 to-emerald-950 border-emerald-700'
            : 'bg-gradient-to-b from-stone-900 to-red-950 border-red-700',
        ].join(' ')}
      >
        <CardContent className="p-8">
          <div className="text-6xl mb-4 rune-float">{isSuccess ? '🎉' : '💥'}</div>
          <h2
            className={[
              'text-3xl font-extrabold mb-2',
              isSuccess ? 'text-emerald-200' : 'text-red-200',
            ].join(' ')}
          >
            {isSuccess ? 'PERANGKAT DIJINAKKAN!' : 'PERANGKAT MELEDAK!'}
          </h2>
          <p className={isSuccess ? 'text-emerald-200' : 'text-red-200'}>
            {isSuccess
              ? 'Selamat! Cobaan dungeon berhasil ditaklukkan.'
              : 'Belum berhasil kali ini. Asah strategi dan coba lagi.'}
          </p>
        </CardContent>
      </Card>

      {/* Statistik Gim */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-300 rune-float">{totalAttempts}</div>
            <div className="text-sm text-stone-300">Jumlah Percobaan</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-300 rune-float">{correctAttempts}</div>
            <div className="text-sm text-stone-300">Percobaan Benar</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-300 rune-float">{rate}%</div>
            <div className="text-sm text-stone-300">Tingkat Keberhasilan</div>
          </CardContent>
        </Card>
      </div>

      {/* Performa Tim */}
      <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
        <CardHeader>
          <CardTitle className="text-stone-200 text-lg">Performa Tim</CardTitle>
          <CardDescription className="text-stone-300">
            Kontribusi anggota dan rincian misi
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-stone-200 mb-3">Anggota Tim</h4>
            <div className="space-y-2">
              {defuser && (
                <div className="flex items-center p-3 rounded-md border border-stone-700 bg-stone-900/60">
                  <span className="text-2xl mr-3">💣</span>
                  <div>
                    <div className="font-medium text-stone-200">{defuser.nickname}</div>
                    <div className="text-sm text-stone-400">Penjinak</div>
                  </div>
                  <Badge className="ml-auto bg-red-800 text-red-100 border-red-700">Aktif</Badge>
                </div>
              )}
              {expert && (
                <div className="flex items-center p-3 rounded-md border border-stone-700 bg-stone-900/60">
                  <span className="text-2xl mr-3">📖</span>
                  <div>
                    <div className="font-medium text-stone-200">{expert.nickname}</div>
                    <div className="text-sm text-stone-400">Pemandu</div>
                  </div>
                  <Badge className="ml-auto bg-indigo-800 text-indigo-100 border-indigo-700">Aktif</Badge>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-stone-200 mb-3">Rincian Misi</h4>
            {session.stage && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-300">Tahap:</span>
                  <span className="font-medium text-stone-100">{session.stage.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-300">Batas Waktu:</span>
                  <span className="font-medium text-stone-100">
                    {session.stage.config?.timeLimit || 180}s
                  </span>
                </div>
                {session.stage.mission && (
                  <div className="flex justify-between">
                    <span className="text-stone-300">Misi:</span>
                    <span className="font-medium text-stone-100">{session.stage.mission.title}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tombol Aksi */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/game" className="w-full sm:w-auto">
          <Button className="w-full bg-indigo-700 hover:bg-indigo-600">
            🎮 Main Lagi
          </Button>
        </Link>
        <Link href="/dashboard" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full border-stone-700 text-stone-200 hover:bg-stone-800/60">
            🏠 Kembali ke Dasbor
          </Button>
        </Link>
      </div>
    </div>
  );
}
