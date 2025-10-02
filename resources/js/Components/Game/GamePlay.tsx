import React, { useEffect, useMemo, useState } from 'react';
import { GameState } from '@/types/game';
import { gameApi } from '@/services/gameApi';
import CodeAnalysisView from './CodeAnalysisView';
import PatternAnalysisView from './PatternAnalysisView';
import NavigationChallengeView from './NavigationChallengeView';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';

interface Props {
  gameState: GameState;
  role?: 'defuser' | 'expert' | 'host';
  onGameStateUpdate: (newState: GameState) => void;
  onSubmitAttempt?: (input: string) => Promise<void>;
  submitting?: boolean;
}

export default function GamePlay({
  gameState,
  role,
  onGameStateUpdate,
  onSubmitAttempt,
  submitting: externalSubmitting
}: Props) {
  const [input, setInput] = useState('');
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentHint, setCurrentHint] = useState<string>('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [notice, setNotice] = useState<{ type: 'info' | 'warn' | 'error'; text: string } | null>(null);

  const submitting = externalSubmitting !== undefined ? externalSubmitting : internalSubmitting;

  const [feedbackData, setFeedbackData] = useState({
    feedback_type: 'learning_reflection' as 'peer_review' | 'learning_reflection' | 'collaboration_rating',
    content: '',
    rating: 5
  });

  // Animasi & tema dungeon
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

  useEffect(() => {
    if (gameState.session.ends_at) {
      const endTime = new Date(gameState.session.ends_at).getTime();
      const updateTimer = () => {
        const now = new Date().getTime();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          setTimeout(() => {
            gameApi.getGameState(gameState.session.id).then(onGameStateUpdate).catch(() => {
              setNotice({ type: 'error', text: 'Gagal menyegarkan status sesi.' });
            });
          }, 1000);
        }
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState.session.ends_at, gameState.session.id, onGameStateUpdate]);

  const handleSubmitAttempt = async (inputValue: string) => {
    if (onSubmitAttempt) {
      try {
        await onSubmitAttempt(inputValue);
        setInput('');
        setNotice({ type: 'info', text: 'Percobaan dikirim.' });
      } catch {
        setNotice({ type: 'error', text: 'Gagal mengirim percobaan.' });
      }
      return;
    }
    if (internalSubmitting) return;
    setInternalSubmitting(true);
    try {
      const result = await gameApi.submitAttempt(
        gameState.session.id,
        gameState.puzzle.key,
        inputValue
      );
      const newGameState = {
        ...gameState,
        session: result.session
      };
      onGameStateUpdate(newGameState);
      setInput('');
      if (result.session.status === 'success') {
        setShowFeedbackForm(true);
      }
      setNotice({ type: 'info', text: 'Percobaan tercatat.' });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.response?.data?.message || 'Gagal mengirim percobaan.' });
    } finally {
      setInternalSubmitting(false);
    }
  };

  const handleGetHint = async (hintType: 'general' | 'specific' | 'debugging' = 'general') => {
    if (hintsUsed >= 3) {
      setNotice({ type: 'warn', text: 'Batas petunjuk tercapai.' });
      return;
    }
    try {
      const response = await gameApi.getHint(gameState.session.id, hintType);
      setCurrentHint(response.hint);
      setHintsUsed(response.hint_count);
      setNotice({ type: 'info', text: `Petunjuk #${response.hint_count} diterima.` });
    } catch {
      setNotice({ type: 'error', text: 'Gagal mengambil petunjuk.' });
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      await gameApi.submitFeedback(gameState.session.id, {
        ...feedbackData,
        feedback_from: role || 'host'
      });
      setShowFeedbackForm(false);
      setFeedbackData({ feedback_type: 'learning_reflection', content: '', rating: 5 });
      setNotice({ type: 'info', text: 'Umpan balik terkirim. Terima kasih.' });
    } catch {
      setNotice({ type: 'error', text: 'Gagal mengirim umpan balik.' });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (seconds: number) => {
    if (seconds <= 30) return 'text-red-300 animate-pulse';
    if (seconds <= 60) return 'text-amber-300';
    return 'text-emerald-300';
  };

  // Tampilan puzzle Symbol Mapping (tema dungeon)
  const renderSymbolMappingView = () => {
    const isDefuser = role === 'defuser';
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        {(isDefuser || role === 'host') && (
          <Card className="border-4 border-red-700 bg-gradient-to-b from-stone-900 to-red-950">
            <CardHeader>
              <CardTitle className="text-center text-red-200 text-xl">💣 Panel Penjinakan</CardTitle>
              <CardDescription className="text-center text-stone-300">Masukkan mantra tiga huruf</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl p-4 border-2 border-stone-700 bg-black">
                <div className="text-red-400 text-sm mb-4 font-mono text-center">DEFUSING MODULE</div>
                <div className="flex justify-center flex-wrap gap-4 mb-4">
                  {gameState.puzzle.symbols?.map((symbol: string, index: number) => (
                    <div
                      key={index}
                      className="w-16 h-16 bg-red-900/60 border-2 border-red-500 rounded flex items-center justify-center text-2xl text-red-200 font-mono rune-float"
                    >
                      {symbol}
                    </div>
                  ))}
                </div>
                {isDefuser && (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSubmitAttempt(input); }}
                    className="flex items-center justify-center gap-3"
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value.toUpperCase().slice(0, 3))}
                      placeholder="ABC"
                      maxLength={3}
                      disabled={submitting}
                      className="w-32 h-12 text-center text-2xl font-mono bg-stone-900 text-emerald-300 border-2 border-emerald-600 rounded focus:outline-none focus:ring-4 focus:ring-emerald-600 crystal-glow"
                    />
                    <Button
                      type="submit"
                      disabled={input.length !== 3 || submitting}
                      className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-stone-700"
                    >
                      {submitting ? 'Mengirim...' : 'Jinakkan'}
                    </Button>
                  </form>
                )}
              </div>
              {isDefuser && (
                <Card className="border border-blue-700 bg-gradient-to-r from-blue-950 to-stone-900">
                  <CardContent className="p-4">
                    <h5 className="text-blue-200 font-medium mb-2">Instruksi Penjinak</h5>
                    <ul className="text-sm text-blue-200/90 space-y-1 list-disc pl-5">
                      <li>Jelaskan simbol yang terlihat kepada Expert secara jelas.</li>
                      <li>Masukkan tiga huruf sesuai arahan Expert.</li>
                      <li>Periksa kembali urutan sebelum menekan Jinakkan.</li>
                    </ul>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}

        {(role === 'expert' || role === 'host') && (
          <Card className="border-4 border-indigo-700 bg-gradient-to-b from-stone-900 to-indigo-950">
            <CardHeader>
              <CardTitle className="text-center text-indigo-200 text-xl">📖 Grimoire Expert</CardTitle>
              <CardDescription className="text-center text-stone-300">Pemetaan simbol ke huruf</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl p-4 border border-stone-700 bg-stone-800/60">
                <h4 className="text-stone-200 font-semibold mb-3">Tabel Pemetaan</h4>
                {gameState.puzzle.mapping && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(gameState.puzzle.mapping).map(([symbol, letter]) => (
                      <div key={symbol} className="flex items-center justify-between p-2 bg-stone-900/60 rounded border border-stone-700">
                        <span className="font-mono text-lg text-stone-200">{symbol}</span>
                        <span className="font-bold text-indigo-300">&rarr; {String(letter)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {role === 'expert' && (
                <Card className="border border-amber-700 bg-gradient-to-r from-amber-900 to-stone-900">
                  <CardContent className="p-4">
                    <h5 className="text-amber-300 font-medium mb-2">Peran Expert</h5>
                    <ul className="text-sm text-amber-200 space-y-1 list-disc pl-5">
                      <li>Dengarkan deskripsi simbol dari Penjinak.</li>
                      <li>Gunakan tabel untuk menerjemahkan simbol ke huruf.</li>
                      <li>Ucapkan urutan tiga huruf dengan jelas dan berurutan.</li>
                    </ul>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderPuzzleView = () => {
    const puzzleType = gameState.puzzle.type || 'symbol_mapping';
    switch (puzzleType) {
      case 'code_analysis':
        // Transform GamePuzzle to Puzzle format for CodeAnalysisView
        const transformedPuzzle = {
          ...gameState.puzzle,
          expertView: gameState.puzzle.expertView ? {
            ...gameState.puzzle.expertView,
            bugs: gameState.puzzle.expertView.bugs?.map(bug => bug.line)
          } : undefined
        };
        return (
          <CodeAnalysisView
            puzzle={transformedPuzzle}
            role={role}
            onSubmitAttempt={handleSubmitAttempt}
            submitting={submitting}
          />
        );
      case 'pattern_analysis':
        return (
          <PatternAnalysisView
            puzzle={gameState.puzzle}
            role={role}
            onSubmitAttempt={handleSubmitAttempt}
            submitting={submitting}
          />
        );
      case 'navigation_challenge':
        return (
          <NavigationChallengeView
            puzzle={gameState.puzzle}
            role={role}
            onSubmitAttempt={handleSubmitAttempt}
            submitting={submitting}
          />
        );
      default:
        return renderSymbolMappingView();
    }
  };

  const isDefuser = role === 'defuser';
  const attempts = gameState.session.attempts || [];
  const recentAttempts = attempts.slice(-5).reverse();
  const puzzleType = gameState.puzzle.type || 'symbol_mapping';

  return (
    <div className="space-y-6">
      <DungeonCSS />

      {/* Banner notifikasi */}
      {notice && (
        <Card
          className={[
            'border',
            notice.type === 'info' ? 'border-emerald-700 bg-emerald-900/40' :
            notice.type === 'warn' ? 'border-amber-700 bg-amber-900/40' :
            'border-red-700 bg-red-900/40'
          ].join(' ')}
        >
          <CardContent className="p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {notice.type === 'info' ? '✨' : notice.type === 'warn' ? '⚠️' : '❌'}
              </span>
              <span className="text-stone-100">{notice.text}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informasi waktu, percobaan, petunjuk */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 text-center">
          <CardContent className="p-6">
            <div className="text-stone-300 text-sm mb-2">Sisa Waktu</div>
            <div className={`text-4xl font-mono font-bold ${getTimeColor(timeLeft)}`}>
              {formatTime(timeLeft)}
            </div>
            {timeLeft <= 30 && (
              <div className="text-red-300 text-sm mt-2 torch-flicker">
                ⚠️ Zona Kritis
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 text-center">
          <CardContent className="p-6">
            <div className="text-stone-300 text-sm mb-2">Jumlah Percobaan</div>
            <div className="text-4xl font-bold text-indigo-300">{attempts.length}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 text-center">
          <CardContent className="p-6">
            <div className="text-stone-300 text-sm mb-2">Petunjuk Terpakai</div>
            <div className="text-4xl font-bold text-purple-300">{hintsUsed}/3</div>
          </CardContent>
        </Card>
      </div>

      {/* Petunjuk aktif */}
      {currentHint && (
        <Card className="border-2 border-amber-700 bg-gradient-to-r from-amber-900 to-stone-900">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div>
                <h4 className="text-amber-300 font-medium mb-1">Petunjuk #{hintsUsed}</h4>
                <p className="text-amber-200">{currentHint}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Antarmuka puzzle utama */}
      <Card className="border-4 border-emerald-700 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-emerald-300 text-xl">🎯 Antarmuka Ujian</CardTitle>
          <CardDescription className="text-stone-300">
            Menyiapkan tampilan untuk jenis teka-teki: <span className="text-emerald-200 font-medium">{puzzleType}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {renderPuzzleView()}
        </CardContent>
      </Card>

      {/* Sistem petunjuk (disembunyikan pada mode eksternal) */}
      {!onSubmitAttempt && (
        <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-stone-200 text-lg">Butuh Bantuan?</CardTitle>
              <CardDescription className="text-stone-300">Sisa Petunjuk: {3 - hintsUsed}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-3">
              <Button
                onClick={() => handleGetHint('general')}
                disabled={hintsUsed >= 3}
                className="bg-indigo-700 hover:bg-indigo-600 disabled:bg-stone-700"
              >
                Petunjuk Umum
              </Button>
              {puzzleType !== 'symbol_mapping' && (
                <>
                  <Button
                    onClick={() => handleGetHint('specific')}
                    disabled={hintsUsed >= 3}
                    className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-stone-700"
                  >
                    Petunjuk Spesifik
                  </Button>
                  <Button
                    onClick={() => handleGetHint('debugging')}
                    disabled={hintsUsed >= 3}
                    className="bg-purple-700 hover:bg-purple-600 disabled:bg-stone-700"
                  >
                    Petunjuk Debug
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Riwayat percobaan */}
      {attempts.length > 0 && (
        <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
          <CardHeader>
            <CardTitle className="text-stone-200 text-lg">Riwayat Percobaan ({attempts.length} total)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className={[
                  'flex items-center justify-between p-3 rounded-md border',
                  attempt.is_correct
                    ? 'bg-emerald-900/40 border-emerald-700 text-emerald-200'
                    : 'bg-red-900/40 border-red-700 text-red-200'
                ].join(' ')}
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-lg font-bold">{attempt.input}</span>
                  <span className="text-sm opacity-80">
                    {new Date(attempt.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center">
                  {attempt.is_correct ? (
                    <span className="text-emerald-300">✅ Benar</span>
                  ) : (
                    <span className="text-red-300">❌ Salah</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tips komunikasi kolaborasi */}
      <Card className="border-2 border-purple-700 bg-gradient-to-b from-stone-900 to-purple-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-purple-300 text-lg">💬 Tips Komunikasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl border-2 border-amber-700 bg-stone-800/60">
              <h5 className="text-amber-300 font-semibold mb-2">
                {role === 'defuser' ? 'Untuk Penjinak' : 'Untuk Expert'}
              </h5>
              <ul className="text-stone-200 space-y-1 list-disc pl-5">
                {role === 'defuser' ? (
                  <>
                    <li>Jelaskan apa yang terlihat secara tepat dan ringkas.</li>
                    <li>Ajukan pertanyaan saat ragu, pastikan instruksi dipahami.</li>
                    <li>Konfirmasi sebelum mengeksekusi langkah.</li>
                    <li>Jaga ketenangan saat waktu menipis.</li>
                  </>
                ) : (
                  <>
                    <li>Dengarkan deskripsi dengan saksama dan ulangi poin penting.</li>
                    <li>Berikan instruksi bertahap, jelas, dan terukur.</li>
                    <li>Verifikasi pemahaman sebelum lanjut.</li>
                    <li>Bangun suasana kolaboratif yang mendukung.</li>
                  </>
                )}
              </ul>
            </div>
            <div className="p-4 rounded-xl border-2 border-blue-700 bg-stone-800/60">
              <h5 className="text-blue-300 font-semibold mb-2">Kunci Kolaborasi</h5>
              <ul className="text-stone-200 space-y-1 list-disc pl-5">
                <li>Gunakan bahasa yang spesifik dan tidak ambigu.</li>
                <li>Ulangi informasi penting untuk menghindari salah paham.</li>
                <li>Minta konfirmasi saat berpindah langkah.</li>
                <li>Berpikir sebagai tim, bukan individu.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sasaran pembelajaran (disembunyikan pada symbol_mapping) */}
      {puzzleType !== 'symbol_mapping' && gameState.puzzle.learningObjectives && (
        <Card className="border-2 border-indigo-700 bg-gradient-to-b from-stone-900 to-indigo-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-indigo-300 text-lg">🎓 Tujuan Pembelajaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-stone-700 bg-stone-800/60">
                <h5 className="text-indigo-200 font-medium mb-2">Fokus Materi</h5>
                <ul className="text-sm text-stone-200 space-y-1 list-disc pl-5">
                  {gameState.puzzle.learningObjectives.map((objective: string, index: number) => (
                    <li key={index}>• {objective}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-xl border border-stone-700 bg-stone-800/60">
                <h5 className="text-indigo-200 font-medium mb-2">Tips Belajar Rekan</h5>
                <ul className="text-sm text-stone-200 space-y-1 list-disc pl-5">
                  <li>Jelaskan alasan langkah, bukan hanya hasil.</li>
                  <li>Ajukan pertanyaan "mengapa" dan "bagaimana".</li>
                  <li>Bandingkan pendekatan untuk memperkaya strategi.</li>
                  <li>Pelajari sudut pandang rekan untuk memperluas wawasan.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tombol buka formulir umpan balik (disembunyikan pada mode eksternal) */}
      {!onSubmitAttempt && (
        <div className="text-center">
          <Button onClick={() => setShowFeedbackForm(true)} className="bg-amber-700 hover:bg-amber-600">
            💬 Beri Umpan Balik
          </Button>
        </div>
      )}

      {/* Modal Umpan Balik */}
      {showFeedbackForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <Card className="w-full max-w-md border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 mx-4">
            <CardHeader>
              <CardTitle className="text-stone-200">Bagikan Pengalaman</CardTitle>
              <CardDescription className="text-stone-300">Apa yang dipelajari dan bagaimana kolaborasinya</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm text-stone-300 mb-2">Jenis Umpan Balik</label>
                <select
                  value={feedbackData.feedback_type}
                  onChange={(e) => setFeedbackData({ ...feedbackData, feedback_type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-700 rounded focus:outline-none focus:ring-4 focus:ring-amber-600"
                >
                  <option value="learning_reflection">Refleksi Pembelajaran</option>
                  <option value="peer_review">Ulasan Rekan</option>
                  <option value="collaboration_rating">Penilaian Kolaborasi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-stone-300 mb-2">Umpan Balik</label>
                <textarea
                  value={feedbackData.content}
                  onChange={(e) => setFeedbackData({ ...feedbackData, content: e.target.value })}
                  placeholder="Bagikan hal yang dipelajari, cara kolaborasi, atau saran perbaikan..."
                  rows={4}
                  className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-700 rounded focus:outline-none focus:ring-4 focus:ring-amber-600"
                />
              </div>

              {feedbackData.feedback_type === 'collaboration_rating' && (
                <div>
                  <label className="block text-sm text-stone-300 mb-2">Penilaian Kolaborasi (1-5)</label>
                  <select
                    value={feedbackData.rating}
                    onChange={(e) => setFeedbackData({ ...feedbackData, rating: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-700 rounded focus:outline-none focus:ring-4 focus:ring-amber-600"
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} - {['Kurang', 'Cukup', 'Baik', 'Sangat Baik', 'Istimewa'][rating - 1]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={!feedbackData.content.trim()}
                  className="flex-1 bg-indigo-700 hover:bg-indigo-600 disabled:bg-stone-700"
                >
                  Kirim
                </Button>
                <Button
                  onClick={() => setShowFeedbackForm(false)}
                  variant="outline"
                  className="flex-1 border-stone-700 text-stone-200 hover:bg-stone-800/60"
                >
                  Batal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
