import React, { useEffect, useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { GameState } from '@/types/game';
import { gameApi } from '@/services/gameApi';
import Authenticated from '@/Layouts/AuthenticatedLayout';

// Tetap gunakan komponen internal multi-stage
import StageProgress from '@/Components/Game/StageProgress';
import GamePlay from '@/Components/Game/GamePlay';
import StageTransition from '@/Components/Game/StageTransition';
import VoiceChat from '@/Components/Game/VoiceChat';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';

interface Props {
  sessionId: number;
  role?: 'defuser' | 'expert' | 'host';
}

interface StageResult {
  stageComplete?: boolean;
  gameComplete?: boolean;
  nextStage?: number;
  stageScore?: number;
  finalScore?: number;
  message?: string;
  attemptsRemaining?: number;
}

interface MultiStageGameState {
  session: GameState['session'];
  puzzle: GameState['puzzle'];
  stage?: {
    current?: number;
    total?: number;
    config?: {
      title?: string;
      timeLimit?: number;
      maxAttempts?: number;
    };
    progress?: {
      completed?: number[];
      totalScore?: number;
    };
  };
  serverTime?: string;
}

export default function GameSession({ sessionId, role: propRole }: Props) {
  const { auth } = usePage().props as any;
  const [gameState, setGameState] = useState<MultiStageGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showTransition, setShowTransition] = useState(false);
  const [stageResult, setStageResult] = useState<StageResult | null>(null);

  // Voice Chat states
  const [showVoiceChat, setShowVoiceChat] = useState(true);
  const [isVoiceChatCollapsed, setIsVoiceChatCollapsed] = useState(false);

  // CSS tema dungeon + animasi ringan
  const DungeonCSS = () => (
    <style>{`
      @keyframes torchFlicker { 0%,100%{opacity:1;filter:brightness(1)} 25%{opacity:.86;filter:brightness(1.12)} 50%{opacity:.75;filter:brightness(.95)} 75%{opacity:.92;filter:brightness(1.05)} }
      @keyframes crystalGlow { 0%,100%{box-shadow:0 0 20px rgba(180,83,9,.6),0 0 40px rgba(251,191,36,.25)} 50%{box-shadow:0 0 28px rgba(180,83,9,.8),0 0 60px rgba(251,191,36,.45)} }
      @keyframes runeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
      .crystal-glow { animation: crystalGlow 3s ease-in-out infinite; }
      .rune-float { animation: runeFloat 3.2s ease-in-out infinite; }
    `}</style>
  );

  // Deteksi peran dengan prioritas URL > prop > peserta > observer
  const getCurrentRole = useMemo(() => {
    return (): 'defuser' | 'expert' | 'host' | 'observer' => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlRole = urlParams.get('role');
      if (urlRole && ['defuser', 'expert', 'host'].includes(urlRole)) return urlRole as any;
      if (propRole && ['defuser', 'expert', 'host'].includes(propRole)) return propRole;
      const participants = gameState?.session?.participants || [];
      const userParticipant = participants.find((p) => p.user_id === auth?.user?.id);
      if (userParticipant?.role) return userParticipant.role as any;
      return 'observer';
    };
  }, [auth?.user?.id, gameState?.session?.participants, propRole]);

  const currentRole = getCurrentRole();

  // Muat state permainan periodik
  useEffect(() => {
    if (!sessionId) {
      setError('ID sesi diperlukan');
      setLoading(false);
      return;
    }
    const loadGameState = async () => {
      try {
        const state = await gameApi.getGameState(sessionId);
        if (state && state.session) {
          const safeState: MultiStageGameState = {
            session: {
              ...state.session,
              participants: Array.isArray(state.session.participants) ? state.session.participants : [],
              attempts: Array.isArray(state.session.attempts) ? state.session.attempts : [],
            },
            puzzle: state.puzzle,
            stage: state.stage,
            serverTime: state.serverTime,
          };
          setGameState(safeState);
          setError('');
        } else {
          setError('Data sesi tidak valid');
        }
      } catch (err: any) {
        setError(err?.message || 'Gagal memuat data permainan');
      } finally {
        setLoading(false);
      }
    };
    loadGameState();
    const interval = setInterval(loadGameState, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleStartSession = async () => {
    try {
      await gameApi.startSession(sessionId);
      setTimeout(async () => {
        try {
          const state = await gameApi.getGameState(sessionId);
          if (state) {
            const safeState: MultiStageGameState = {
              session: {
                ...state.session,
                participants: Array.isArray(state.session.participants) ? state.session.participants : [],
                attempts: Array.isArray(state.session.attempts) ? state.session.attempts : [],
              },
              puzzle: state.puzzle,
              stage: state.stage,
              serverTime: state.serverTime,
            };
            setGameState(safeState);
          }
        } catch {
          // diam
        }
      }, 1000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memulai sesi');
    }
  };

  const handleAttemptSubmit = async (inputValue: string) => {
    if (!gameState) return;
    try {
      const result = await gameApi.submitAttempt(gameState.session.id, gameState.puzzle.key, inputValue);
      if (result.stageComplete || result.gameComplete) {
        setStageResult(result);
        setShowTransition(true);
        setTimeout(async () => {
          setShowTransition(false);
          setStageResult(null);
          try {
            const state = await gameApi.getGameState(sessionId);
            if (state) {
              const safeState: MultiStageGameState = {
                session: {
                  ...state.session,
                  participants: Array.isArray(state.session.participants) ? state.session.participants : [],
                  attempts: Array.isArray(state.session.attempts) ? state.session.attempts : [],
                },
                puzzle: state.puzzle,
                stage: state.stage,
                serverTime: state.serverTime,
              };
              setGameState(safeState);
            }
          } catch {
            // diam
          }
        }, 4000);
      } else {
        setGameState({
          ...gameState,
          session: {
            ...gameState.session,
            attempts: result.session?.attempts || gameState.session.attempts,
          },
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal mengirim percobaan');
    }
  };

  const handleGameStateUpdate = (updatedState: GameState) => {
    const convertedState: MultiStageGameState = {
      session: updatedState.session,
      puzzle: updatedState.puzzle,
      stage: updatedState.stage as any,
      serverTime: updatedState.serverTime,
    };
    setGameState(convertedState);
  };

  if (loading) {
    return (
      <Authenticated>
        <Head title="Memuat Tantangan Multi-Tahap..." />
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-12">
          <DungeonCSS />
          <div className="max-w-4xl mx-auto px-4">
            <Card className="border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-stone-800">
              <CardContent className="p-10 text-center">
                <div className="rune-float text-6xl mb-6">🕯️</div>
                <h3 className="text-2xl font-bold text-amber-300 mb-2">Menyiapkan Arena Dungeon</h3>
                <p className="text-stone-300">Mohon tunggu, lantai-lantai ujian sedang dibangunkan...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Authenticated>
    );
  }

  if (error || !gameState) {
    return (
      <Authenticated>
        <Head title="Kesalahan" />
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-12">
          <DungeonCSS />
          <div className="max-w-4xl mx-auto px-4">
            <Card className="border-4 border-red-700 bg-gradient-to-b from-stone-900 to-red-950">
              <CardContent className="p-10 text-center">
                <div className="torch-flicker text-6xl mb-6">⚠️</div>
                <h3 className="text-3xl font-bold text-red-200 mb-3">Ritual Terputus</h3>
                <p className="text-red-200/90 mb-6">{error || 'Gagal memuat data permainan'}</p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-bold"
                  >
                    Coba Muat Ulang
                  </Button>
                  <Button
                    onClick={() => (window.location.href = '/game')}
                    variant="outline"
                    className="border-stone-600 text-stone-200 hover:bg-stone-800/60"
                  >
                    Kembali ke Lobi
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Authenticated>
    );
  }

  const { session, puzzle, stage } = gameState;
  const participants = session.participants || [];

  if (showTransition && stageResult) {
    return (
      <Authenticated>
        <Head title="Peralihan Tahap" />
        <StageTransition result={stageResult} currentStage={stage?.current} totalStages={stage?.total} />
      </Authenticated>
    );
  }

  const renderWaiting = () => (
    <div className="grid lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <Card className="border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-stone-800">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="rune-float text-6xl mb-4">🗝️</div>
              <h2 className="text-2xl font-semibold text-amber-300 mb-4">Persiapan Ujian Multi-Tahap</h2>
              {participants.length < 2 ? (
                <div>
                  <p className="text-stone-300 mb-8 text-lg">
                    Menunggu rekan seperjuangan bergabung... ({participants.length}/2)
                  </p>
                  <Card className="max-w-md mx-auto border-2 border-blue-700 bg-gradient-to-b from-stone-900 to-blue-950">
                    <CardContent className="p-6">
                      <p className="text-blue-200 font-medium mb-3">Ajak teman untuk menembus dungeon ini!</p>
                      <div className="rounded-xl p-3 border border-blue-700 bg-stone-950 text-center">
                        <p className="text-sm text-blue-300 mb-1">Kode guild:</p>
                        <p className="font-mono font-bold text-lg text-blue-200">{session.team_code}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div>
                  <p className="text-stone-300 mb-8 text-lg">
                    Tim lengkap! Saatnya memulai ujian 3 tahap. ({participants.length}/2)
                  </p>
                  <Card className="max-w-2xl mx-auto mb-6 border-2 border-emerald-700 bg-gradient-to-b from-stone-900 to-emerald-950">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-emerald-300">Gambaran Misi</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="bg-emerald-900/40 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 border border-emerald-700">
                          <span className="font-bold text-emerald-300">1</span>
                        </div>
                        <p className="font-medium text-emerald-200">Analisis Pola</p>
                      </div>
                      <div className="text-center">
                        <div className="bg-emerald-900/40 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 border border-emerald-700">
                          <span className="font-bold text-emerald-300">2</span>
                        </div>
                        <p className="font-medium text-emerald-200">Analisis Kode</p>
                      </div>
                      <div className="text-center">
                        <div className="bg-emerald-900/40 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 border border-emerald-700">
                          <span className="font-bold text-emerald-300">3</span>
                        </div>
                        <p className="font-medium text-emerald-200">Navigasi Pohon</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Button
                    onClick={handleStartSession}
                    className="bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-bold py-4 px-12 text-lg crystal-glow"
                  >
                    ⚔️ Mulai Ujian Multi-Tahap
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar Voice Chat */}
      <div className="lg:col-span-1">
        <div className="space-y-4">
          <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
            <CardContent className="p-4">
              <Button
                onClick={() => setShowVoiceChat(!showVoiceChat)}
                className={
                  showVoiceChat
                    ? 'w-full bg-emerald-700 hover:bg-emerald-600'
                    : 'w-full bg-indigo-700 hover:bg-indigo-600'
                }
              >
                🎙️ {showVoiceChat ? 'Sembunyikan Voice Chat' : 'Tampilkan Voice Chat'}
              </Button>
            </CardContent>
          </Card>

          {showVoiceChat && (
            <VoiceChat
              sessionId={sessionId}
              userId={auth?.user?.id}
              nickname={auth?.user?.name || 'Unknown'}
              role={currentRole as 'defuser' | 'expert' | 'host'}
              participants={participants.map((p: any) => ({
                id: p.id,
                user_id: p.user_id ?? 0,
                nickname: p.nickname,
                role: p.role,
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );

  const renderRunning = () => (
    <div className="space-y-6">
      {stage && (
        <StageProgress
          current={stage.current || 1}
          total={stage.total || 3}
          completed={stage.progress?.completed || []}
          totalScore={stage.progress?.totalScore || 0}
        />
      )}

      <Card className="border-4 border-amber-700 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950">
        <CardContent className="p-6 text-center">
          <h1 className="text-3xl font-bold text-amber-300 mb-3">
            {stage?.config?.title || puzzle?.title || 'Tahap Saat Ini'}
          </h1>
          <div className="flex justify-center gap-6 text-sm text-stone-200">
            <span className="flex items-center">
              <span className="mr-2">⏱️</span>
              Batas Waktu: {Math.floor((stage?.config?.timeLimit || 0) / 60)} menit
            </span>
            <span className="flex items-center">
              <span className="mr-2">🎯</span>
              Upaya Maks: {stage?.config?.maxAttempts || 'N/A'}
            </span>
            <span className="flex items-center">
              <span className="mr-2">📊</span>
              Tahap: {stage?.current || 1}/{stage?.total || 3}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className={`transition-all duration-300 ${showVoiceChat && !isVoiceChatCollapsed ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
            <CardContent className="p-6">
              <GamePlay
                gameState={gameState as GameState}
                role={['defuser', 'expert', 'host'].includes(currentRole) ? (currentRole as 'defuser' | 'expert' | 'host') : undefined}
                onGameStateUpdate={handleGameStateUpdate}
                onSubmitAttempt={handleAttemptSubmit}
              />
            </CardContent>
          </Card>
        </div>

        {showVoiceChat && !isVoiceChatCollapsed && (
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <VoiceChat
                sessionId={sessionId}
                userId={auth?.user?.id}
                nickname={auth?.user?.name || 'Unknown'}
                role={currentRole as 'defuser' | 'expert' | 'host'}
                participants={participants.map((p: any) => ({
                  id: p.id,
                  user_id: p.user_id ?? 0,
                  nickname: p.nickname,
                  role: p.role,
                }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Kontrol mengambang Voice Chat */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        {!showVoiceChat && (
          <Button
            onClick={() => setShowVoiceChat(true)}
            className="bg-indigo-700 hover:bg-indigo-600 rounded-full p-3 shadow-lg"
            title="Tampilkan Voice Chat"
          >
            🎙️
          </Button>
        )}
        {showVoiceChat && (
          <>
            <Button
              onClick={() => setIsVoiceChatCollapsed(!isVoiceChatCollapsed)}
              variant="outline"
              className="border-stone-600 text-stone-200 hover:bg-stone-800/60 rounded-full p-2 shadow-lg"
              title={isVoiceChatCollapsed ? 'Perluas Voice Chat' : 'Ciutkan Voice Chat'}
            >
              {isVoiceChatCollapsed ? '📱' : '📵'}
            </Button>
            <Button
              onClick={() => setShowVoiceChat(false)}
              className="bg-red-700 hover:bg-red-600 rounded-full p-2 shadow-lg"
              title="Sembunyikan Voice Chat"
            >
              ✕
            </Button>
          </>
        )}
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="py-6">
      <Card className="border-4 border-emerald-700 bg-gradient-to-b from-stone-900 to-emerald-950">
        <CardContent className="p-8 text-center">
          <div className="rune-float text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-emerald-200 mb-4">Misi Tuntas!</h2>
          <p className="text-emerald-100 mb-6 text-lg">Selamat, seluruh tahap berhasil dilalui dengan gemilang.</p>
          {stage && (
            <div className="mb-6">
              <StageProgress
                current={stage.current || 1}
                total={stage.total || 3}
                completed={stage.progress?.completed || []}
                totalScore={stage.progress?.totalScore || 0}
              />
            </div>
          )}
          <Card className="bg-emerald-900/40 border border-emerald-700 max-w-md mx-auto mb-6">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-emerald-200 mb-3">Hasil Akhir</h3>
              <div className="grid grid-cols-2 gap-4 text-emerald-100">
                <div>
                  <div className="text-2xl font-bold">{stage?.progress?.totalScore || 0}</div>
                  <div className="text-sm opacity-80">Skor Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{stage?.progress?.completed?.length || 0}/{stage?.total || 3}</div>
                  <div className="text-sm opacity-80">Tahap Tuntas</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => (window.location.href = '/game')} className="bg-indigo-700 hover:bg-indigo-600">
              Main Lagi
            </Button>
            <Button onClick={() => (window.location.href = '/dashboard')} variant="outline" className="border-stone-600 text-stone-200 hover:bg-stone-800/60">
              Kembali ke Dasbor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFailed = () => (
    <div className="py-6">
      <Card className="border-4 border-red-700 bg-gradient-to-b from-stone-900 to-red-950">
        <CardContent className="p-8 text-center">
          <div className="torch-flicker text-6xl mb-4">💥</div>
          <h2 className="text-3xl font-bold text-red-200 mb-4">Misi Gagal</h2>
          <p className="text-red-100 mb-6 text-lg">Cobaan tak terselesaikan dalam syarat yang ditetapkan.</p>
          {stage && (
            <div className="mb-6">
              <StageProgress
                current={stage.current || 1}
                total={stage.total || 3}
                completed={stage.progress?.completed || []}
                totalScore={stage.progress?.totalScore || 0}
              />
            </div>
          )}
          <Card className="bg-red-900/40 border border-red-700 max-w-md mx-auto mb-6">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-red-200 mb-3">Jejak Pencapaian</h3>
              <div className="grid grid-cols-2 gap-4 text-red-100">
                <div>
                  <div className="text-2xl font-bold">{stage?.progress?.totalScore || 0}</div>
                  <div className="text-sm opacity-80">Skor Terkumpul</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{stage?.progress?.completed?.length || 0}/{stage?.total || 3}</div>
                  <div className="text-sm opacity-80">Tahap Tuntas</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => (window.location.href = '/game')} className="bg-indigo-700 hover:bg-indigo-600">
              Coba Lagi
            </Button>
            <Button onClick={() => (window.location.href = '/dashboard')} variant="outline" className="border-stone-600 text-stone-200 hover:bg-stone-800/60">
              Kembali ke Dasbor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPaused = () => (
    <Card className="border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-amber-950">
      <CardContent className="p-8 text-center">
        <div className="text-4xl mb-4">⏸️</div>
        <h2 className="text-2xl font-bold text-amber-300 mb-4">Permainan Dijeda</h2>
        <p className="text-stone-300 mb-6">Sesi dijeda sementara, tunggu hingga dilanjutkan kembali.</p>
        <Button onClick={() => window.location.reload()} className="bg-amber-700 hover:bg-amber-600">
          Segarkan Status
        </Button>
      </CardContent>
    </Card>
  );

  const renderEnded = () => (
    <Card className="border-4 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
      <CardContent className="p-8 text-center">
        <div className="text-4xl mb-4">🏁</div>
        <h2 className="text-2xl font-bold text-stone-200 mb-4">Sesi Berakhir</h2>
        <p className="text-stone-300 mb-6">Terima kasih telah berpartisipasi di ujian dungeon ini.</p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => (window.location.href = '/game')} className="bg-indigo-700 hover:bg-indigo-600">
            Ujian Baru
          </Button>
          <Button onClick={() => (window.location.href = '/dashboard')} variant="outline" className="border-stone-600 text-stone-200 hover:bg-stone-800/60">
            Dasbor
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderUnknown = () => (
    <Card className="border-4 border-red-700 bg-gradient-to-b from-stone-900 to-red-950">
      <CardContent className="p-8 text-center">
        <div className="text-4xl mb-4">❓</div>
        <h2 className="text-xl font-bold text-red-200 mb-4">Status Tidak Dikenal</h2>
        <p className="text-red-100 mb-6">
          Status: <code className="bg-red-900/40 px-2 py-1 rounded border border-red-700">{session.status}</code>
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => window.location.reload()} className="bg-red-700 hover:bg-red-600">
            Muat Ulang
          </Button>
          <Button onClick={() => (window.location.href = '/game')} variant="outline" className="border-stone-600 text-stone-200 hover:bg-stone-800/60">
            Kembali ke Lobi
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderGameContent = () => {
    switch (session.status) {
      case 'waiting':
        return renderWaiting();
      case 'running':
        return renderRunning();
      case 'success':
        return renderSuccess();
      case 'failed':
        return renderFailed();
      case 'paused':
        return renderPaused();
      case 'ended':
        return renderEnded();
      default:
        return renderUnknown();
    }
  };

  return (
    <Authenticated>
      <Head title={`Tantangan Multi-Tahap - ${session.team_code}`} />
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-8">
        <DungeonCSS />
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          {/* Header Sesi */}
          <Card className="border-4 border-amber-700 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 relative overflow-hidden">
            <CardHeader>
              <div className="absolute top-3 left-3 text-2xl torch-flicker">🔥</div>
              <div className="absolute top-3 right-3 text-2xl torch-flicker">🔥</div>
              <CardTitle className="text-amber-300 text-3xl">Sesi: {session.team_code}</CardTitle>
              <CardDescription className="text-stone-300">
                Status:{' '}
                <span
                  className={[
                    'font-semibold',
                    session.status === 'waiting'
                      ? 'text-amber-300'
                      : session.status === 'running'
                      ? 'text-indigo-300'
                      : session.status === 'success'
                      ? 'text-emerald-300'
                      : session.status === 'failed'
                      ? 'text-red-300'
                      : session.status === 'paused'
                      ? 'text-amber-300'
                      : 'text-stone-300',
                  ].join(' ')}
                >
                  {String(session.status).toUpperCase()}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-purple-800 text-purple-100 border-purple-700">
                  🎭 Peran: {currentRole}
                </Badge>
                {currentRole === 'expert' && (
                  <Badge className="bg-indigo-800 text-indigo-100 border-indigo-700">📖 Penjaga Manual</Badge>
                )}
                {currentRole === 'defuser' && (
                  <Badge className="bg-red-800 text-red-100 border-red-700">💣 Penjinak Perangkat</Badge>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-200">
                  {participants.length}/2
                </div>
                <div className="text-sm text-stone-300">Pemain Siap</div>
                {showVoiceChat && (
                  <div className="flex items-center mt-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-xs text-emerald-300">Voice Chat Aktif</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Konten utama */}
          {renderGameContent()}

          {/* Daftar peserta */}
          {!['success', 'failed', 'ended'].includes(session.status) && (
            <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
              <CardHeader>
                <CardTitle className="text-stone-200 text-lg flex items-center gap-2">
                  👥 Anggota Tim ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {participants.map((participant: any, index: number) => (
                    <div
                      key={participant.id || index}
                      className="flex items-center justify-between p-4 bg-stone-900/60 rounded-lg border border-stone-700"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={[
                            'w-3.5 h-3.5 rounded-full',
                            participant.role === 'defuser'
                              ? 'bg-red-500'
                              : participant.role === 'expert'
                              ? 'bg-indigo-500'
                              : 'bg-emerald-500',
                          ].join(' ')}
                        />
                        <div>
                          <span className="font-medium text-stone-200">{participant.nickname}</span>
                          <div className="text-sm text-stone-400 capitalize">
                            {participant.role === 'defuser'
                              ? '💣 Penjinak'
                              : participant.role === 'expert'
                              ? '📖 Pemandu'
                              : '👑 Host'}
                          </div>
                        </div>
                      </div>
                      {participant.role === currentRole && (
                        <Badge className="bg-emerald-800 text-emerald-100 border-emerald-700">Aktif</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Authenticated>
  );
}
