import React, { useMemo } from 'react';
import { GameState } from '@/types/game';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { Button } from '@/Components/ui/button';

interface Props {
  gameState: GameState;
  role?: 'defuser' | 'expert' | 'host';
  onStartSession: () => void;
}

export default function SessionWaiting({ gameState, role, onStartSession }: Props) {
  const { session } = gameState;
  const participants = session.participants || [];
  const defuser = participants.find((p) => p.role === 'defuser');
  const expert = participants.find((p) => p.role === 'expert');
  const canStart = !!defuser && !!expert;
  const isHost = role === 'host';

  const DungeonCSS = useMemo(() => (
    <style>{`
      @keyframes torchFlicker { 0%,100%{opacity:1;filter:brightness(1)} 25%{opacity:.86;filter:brightness(1.12)} 50%{opacity:.75;filter:brightness(.95)} 75%{opacity:.92;filter:brightness(1.05)} }
      @keyframes runeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
      .rune-float { animation: runeFloat 3.2s ease-in-out infinite; }
    `}</style>
  ), []);

  return (
    <div className="space-y-6">
      {DungeonCSS}

      {/* Kode Tim */}
      <Card className="border-4 border-amber-700 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
        <CardHeader className="text-center relative">
          <div className="absolute top-3 left-3 text-xl torch-flicker">🔥</div>
          <div className="absolute top-3 right-3 text-xl torch-flicker">🔥</div>
          <CardTitle className="text-amber-300">Bagikan Kode Tim</CardTitle>
          <CardDescription className="text-stone-300">Gunakan kode ini untuk bergabung ke sesi</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-4xl font-mono font-extrabold text-emerald-300 tracking-widest rune-float">
            {session.team_code}
          </div>
          <div className="mt-2">
            <Badge className="bg-stone-700 text-stone-200 border-stone-600">Siapkan tim minimal 2 peran</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Info Sesi */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Peserta */}
        <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
          <CardHeader>
            <CardTitle className="text-stone-200 text-lg">
              Pemain ({participants.length}/2)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className={[
                'p-3 rounded-md border flex items-center justify-between',
                defuser ? 'bg-emerald-900/40 border-emerald-700' : 'bg-stone-900/40 border-stone-700',
              ].join(' ')}
            >
              <div className="flex items-center">
                <span className="text-2xl mr-2">💣</span>
                <span className="font-medium text-stone-200">Penjinak (Defuser)</span>
              </div>
              {defuser ? (
                <span className="text-emerald-300 font-medium">{defuser.nickname}</span>
              ) : (
                <span className="text-stone-400 text-sm">Menunggu...</span>
              )}
            </div>

            <div
              className={[
                'p-3 rounded-md border flex items-center justify-between',
                expert ? 'bg-emerald-900/40 border-emerald-700' : 'bg-stone-900/40 border-stone-700',
              ].join(' ')}
            >
              <div className="flex items-center">
                <span className="text-2xl mr-2">📖</span>
                <span className="font-medium text-stone-200">Pemandu (Expert)</span>
              </div>
              {expert ? (
                <span className="text-emerald-300 font-medium">{expert.nickname}</span>
              ) : (
                <span className="text-stone-400 text-sm">Menunggu...</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detail Tahap */}
        <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
          <CardHeader>
            <CardTitle className="text-stone-200 text-lg">Informasi Gim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {session.stage ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-300">Tahap:</span>
                  <span className="font-medium text-stone-100">{session.stage.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-300">Batas Waktu:</span>
                  <span className="font-medium text-stone-100">{session.stage.config?.timeLimit || 180}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-300">Jumlah Tantangan:</span>
                  <span className="font-medium text-stone-100">
                    {(session.stage.config as any)?.puzzles?.length ||
                      (session.stage as any)?.puzzles?.length ||
                      'Beberapa'}
                  </span>
                </div>

                {session.stage.mission && (
                  <div className="pt-3 border-t border-stone-700">
                    <span className="text-stone-300">Misi:</span>
                    <p className="text-stone-100 font-medium mt-1">{session.stage.mission.title}</p>
                    <p className="text-stone-400 text-xs mt-1">{session.stage.mission.description}</p>
                  </div>
                )}
              </div>
            ) : (
              <Alert className="border-amber-700 bg-amber-900/40">
                <AlertTitle className="text-amber-300">Tahap belum disetel</AlertTitle>
                <AlertDescription className="text-amber-200">
                  Atur konfigurasi tahap sebelum memulai.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instruksi */}
      <Card className="border-2 border-purple-700 bg-gradient-to-b from-stone-900 to-purple-950">
        <CardHeader>
          <CardTitle className="text-purple-300 text-lg">🎯 Sebelum Memulai</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="text-stone-200 font-semibold mb-2">Untuk Penjinak:</h5>
              <ul className="text-stone-300 space-y-1 list-disc pl-5 text-xs">
                <li>Akan melihat panel perangkat; jelaskan yang terlihat dengan jelas.</li>
                <li>Ikuti instruksi Pemandu langkah demi langkah.</li>
                <li>Jangan menebak; tanyakan bila ragu.</li>
                <li>Konfirmasi sebelum mengeksekusi.</li>
              </ul>
            </div>
            <div>
              <h5 className="text-stone-200 font-semibold mb-2">Untuk Pemandu:</h5>
              <ul className="text-stone-300 space-y-1 list-disc pl-5 text-xs">
                <li>Akan melihat manual dan pemetaan.</li>
                <li>Dengarkan deskripsi Penjinak dengan saksama.</li>
                <li>Berikan instruksi yang jelas dan bertahap.</li>
                <li>Periksa kembali sebelum mengiyakan.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tombol Mulai */}
      <div className="text-center">
        {!canStart ? (
          <Alert className="inline-block text-left border-stone-700 bg-stone-900/60 max-w-xl">
            <AlertTitle className="text-stone-200">Menunggu pemain…</AlertTitle>
            <AlertDescription className="text-stone-300">
              Peran Penjinak dan Pemandu harus terisi sebelum memulai.
            </AlertDescription>
          </Alert>
        ) : isHost ? (
          <Button
            onClick={onStartSession}
            className="bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-bold py-3 px-8 text-lg rune-float"
          >
            🚀 Mulai Gim
          </Button>
        ) : (
          <Alert className="inline-block text-left border-emerald-700 bg-emerald-900/40 max-w-xl">
            <AlertTitle className="text-emerald-300">Siap memulai!</AlertTitle>
            <AlertDescription className="text-emerald-200">
              Menunggu Host untuk memulai permainan…
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
