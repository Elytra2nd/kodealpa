import React, { useEffect, useMemo, useState, useRef, useCallback, memo } from 'react';
import { GameState } from '@/types/game';
import { gameApi } from '@/services/gameApi';
import CodeAnalysisView from './CodeAnalysisView';
import PatternAnalysisView from './PatternAnalysisView';
import NavigationChallengeView from './NavigationChallengeView';
import { gsap } from 'gsap';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  MAX_HINTS: 3,
  CRITICAL_TIME_THRESHOLD: 30,
  WARNING_TIME_THRESHOLD: 60,
  TIMER_UPDATE_INTERVAL: 1000,
  RECENT_ATTEMPTS_LIMIT: 5,
  TORCH_FLICKER_INTERVAL: 2200,
  NOTICE_AUTO_DISMISS: 5000,
} as const;

const FEEDBACK_TYPES = {
  LEARNING_REFLECTION: 'learning_reflection',
  PEER_REVIEW: 'peer_review',
  COLLABORATION_RATING: 'collaboration_rating',
} as const;

const HINT_TYPES = {
  GENERAL: 'general',
  SPECIFIC: 'specific',
  DEBUGGING: 'debugging',
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================
interface Props {
  gameState: GameState;
  role?: 'defuser' | 'expert' | 'host';
  onGameStateUpdate: (newState: GameState) => void;
  onSubmitAttempt?: (input: string) => Promise<void>;
  submitting?: boolean;
}

type NoticeType = 'info' | 'warn' | 'error';

interface Notice {
  type: NoticeType;
  text: string;
}

type FeedbackType = typeof FEEDBACK_TYPES[keyof typeof FEEDBACK_TYPES];

interface FeedbackData {
  feedback_type: FeedbackType;
  content: string;
  rating: number;
}

type HintType = typeof HINT_TYPES[keyof typeof HINT_TYPES];

// ============================================
// CUSTOM HOOKS
// ============================================
const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
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

    return () => clearInterval(torchInterval);
  }, []);

  const setTorchRef = (index: number) => (el: HTMLSpanElement | null) => {
    torchRefs.current[index] = el;
  };

  return { setTorchRef };
};

const useNoticeManager = () => {
  const [notice, setNotice] = useState<Notice | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showNotice = useCallback((type: NoticeType, text: string) => {
    setNotice({ type, text });

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setNotice(null);
    }, CONFIG.NOTICE_AUTO_DISMISS);
  }, []);

  const dismissNotice = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setNotice(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { notice, showNotice, dismissNotice };
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getTimeColor = (seconds: number): string => {
  if (seconds <= CONFIG.CRITICAL_TIME_THRESHOLD) return 'text-red-300 dungeon-pulse';
  if (seconds <= CONFIG.WARNING_TIME_THRESHOLD) return 'text-amber-300';
  return 'text-emerald-300';
};

const getNoticeConfig = (type: NoticeType) => {
  const configs = {
    info: { border: 'border-emerald-700', bg: 'bg-emerald-950/40', icon: '✨' },
    warn: { border: 'border-amber-700', bg: 'bg-amber-950/40', icon: '⚠️' },
    error: { border: 'border-red-700', bg: 'bg-red-950/40', icon: '❌' },
  };
  return configs[type];
};

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const NoticeCard = memo(({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) => {
  const config = getNoticeConfig(notice.type);

  return (
    <Card className={`border-2 ${config.border} ${config.bg} backdrop-blur-sm animate-[slideIn_0.3s_ease-out] dungeon-card-glow`}>
      <CardContent className="p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <span className="text-stone-100">{notice.text}</span>
          </div>
          <button
            onClick={onDismiss}
            className="text-stone-400 hover:text-stone-200 transition-colors"
            aria-label="Tutup pemberitahuan"
          >
            ✕
          </button>
        </div>
      </CardContent>
    </Card>
  );
});

NoticeCard.displayName = 'NoticeCard';

const StatCard = memo(
  ({
    icon,
    label,
    value,
    valueColor,
    warning,
  }: {
    icon: string;
    label: string;
    value: string | number;
    valueColor: string;
    warning?: React.ReactNode;
  }) => (
    <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 text-center dungeon-card-glow">
      <CardContent className="p-4 sm:p-6">
        <div className="text-2xl sm:text-3xl mb-2 dungeon-rune-float">{icon}</div>
        <div className="text-stone-300 text-xs sm:text-sm mb-2">{label}</div>
        <div className={`text-3xl sm:text-4xl font-mono font-bold ${valueColor}`}>{value}</div>
        {warning && <div className="mt-2">{warning}</div>}
      </CardContent>
    </Card>
  )
);

StatCard.displayName = 'StatCard';

// ============================================
// MAIN COMPONENT
// ============================================
export default function GamePlay({
  gameState,
  role,
  onGameStateUpdate,
  onSubmitAttempt,
  submitting: externalSubmitting,
}: Props) {
  const { setTorchRef } = useDungeonAtmosphere();
  const { notice, showNotice, dismissNotice } = useNoticeManager();

  const [input, setInput] = useState('');
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentHint, setCurrentHint] = useState<string>('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const submitting = externalSubmitting !== undefined ? externalSubmitting : internalSubmitting;

  const [feedbackData, setFeedbackData] = useState<FeedbackData>({
    feedback_type: FEEDBACK_TYPES.LEARNING_REFLECTION,
    content: '',
    rating: 5,
  });

  // Timer effect
  useEffect(() => {
    if (gameState.session.ends_at) {
      const endTime = new Date(gameState.session.ends_at).getTime();
      const updateTimer = () => {
        const now = new Date().getTime();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          setTimeout(() => {
            gameApi
              .getGameState(gameState.session.id)
              .then(onGameStateUpdate)
              .catch(() => {
                showNotice('error', 'Gagal menyegarkan status ekspedisi dungeon.');
              });
          }, 1000);
        }
      };
      updateTimer();
      const interval = setInterval(updateTimer, CONFIG.TIMER_UPDATE_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [gameState.session.ends_at, gameState.session.id, onGameStateUpdate, showNotice]);

  // Handlers
  const handleSubmitAttempt = useCallback(
    async (inputValue: string) => {
      if (onSubmitAttempt) {
        try {
          await onSubmitAttempt(inputValue);
          setInput('');
          showNotice('info', 'Percobaan telah dikirim ke altar dungeon.');
        } catch {
          showNotice('error', 'Gagal mengirim percobaan. Portal mungkin tertutup.');
        }
        return;
      }
      if (internalSubmitting) return;
      setInternalSubmitting(true);
      try {
        const result = await gameApi.submitAttempt(gameState.session.id, gameState.puzzle.key, inputValue);
        const newGameState = {
          ...gameState,
          session: result.session,
        };
        onGameStateUpdate(newGameState);
        setInput('');
        if (result.session.status === 'success') {
          setShowFeedbackForm(true);
          showNotice('info', 'Dungeon berhasil ditaklukkan! Bagikan pengalaman Anda.');
        } else {
          showNotice('info', 'Percobaan tercatat dalam kronik guild.');
        }
      } catch (err: any) {
        showNotice('error', err?.response?.data?.message || 'Gagal mengirim percobaan ke altar.');
      } finally {
        setInternalSubmitting(false);
      }
    },
    [onSubmitAttempt, internalSubmitting, gameState, onGameStateUpdate, showNotice]
  );

  const handleGetHint = useCallback(
    async (hintType: HintType = HINT_TYPES.GENERAL) => {
      if (hintsUsed >= CONFIG.MAX_HINTS) {
        showNotice('warn', 'Batas petunjuk dari grimoire tercapai.');
        return;
      }
      try {
        const response = await gameApi.getHint(gameState.session.id, hintType);
        setCurrentHint(response.hint);
        setHintsUsed(response.hint_count);
        showNotice('info', `Petunjuk dari grimoire #${response.hint_count} telah diterima.`);
      } catch {
        showNotice('error', 'Gagal mengambil petunjuk dari grimoire kuno.');
      }
    },
    [hintsUsed, gameState.session.id, showNotice]
  );

  const handleSubmitFeedback = useCallback(async () => {
    try {
      await gameApi.submitFeedback(gameState.session.id, {
        ...feedbackData,
        feedback_from: role || 'host',
      });
      setShowFeedbackForm(false);
      setFeedbackData({
        feedback_type: FEEDBACK_TYPES.LEARNING_REFLECTION,
        content: '',
        rating: 5,
      });
      showNotice('info', 'Umpan balik terkirim ke arsip guild. Terima kasih petualang!');
    } catch {
      showNotice('error', 'Gagal mengirim umpan balik ke arsip guild.');
    }
  }, [gameState.session.id, feedbackData, role, showNotice]);

  // Computed values
  const isDefuser = role === 'defuser';
  const attempts = gameState.session.attempts || [];
  const recentAttempts = useMemo(
    () => attempts.slice(-CONFIG.RECENT_ATTEMPTS_LIMIT).reverse(),
    [attempts]
  );
  const puzzleType = gameState.puzzle.type || 'symbol_mapping';

  // Symbol mapping view
  const renderSymbolMappingView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {(isDefuser || role === 'host') && (
          <Card className="border-4 border-red-700 bg-gradient-to-b from-stone-900 to-red-950 dungeon-card-glow-red">
            <CardHeader className="p-4 sm:p-6 relative">
              <div className="absolute top-3 left-3 text-xl">
                <span ref={setTorchRef(0)} className="dungeon-torch-flicker">
                  🔥
                </span>
              </div>
              <CardTitle className="text-center text-red-200 text-lg sm:text-xl relative z-10 dungeon-glow-text">
                💣 Panel Penjinakkan Perangkat
              </CardTitle>
              <CardDescription className="text-center text-stone-300 text-sm">
                Masukkan mantra tiga huruf rune
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5 p-4 sm:p-6">
              <div className="rounded-xl p-4 border-2 border-stone-700 bg-black backdrop-blur-sm">
                <div className="text-red-400 text-xs sm:text-sm mb-4 font-mono text-center">
                  DEFUSING MODULE
                </div>
                <div className="flex justify-center flex-wrap gap-3 sm:gap-4 mb-4">
                  {gameState.puzzle.symbols?.map((symbol: string, index: number) => (
                    <div
                      key={index}
                      className="w-14 h-14 sm:w-16 sm:h-16 bg-red-900/60 border-2 border-red-500 rounded flex items-center justify-center text-xl sm:text-2xl text-red-200 font-mono dungeon-rune-float shadow-lg"
                    >
                      {symbol}
                    </div>
                  ))}
                </div>
                {isDefuser && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmitAttempt(input);
                    }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-3"
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value.toUpperCase().slice(0, 3))}
                      placeholder="ABC"
                      maxLength={3}
                      disabled={submitting}
                      className="w-32 h-12 text-center text-2xl font-mono bg-stone-900 text-emerald-300 border-2 border-emerald-600 rounded focus:outline-none focus:ring-4 focus:ring-emerald-600 dungeon-crystal-glow"
                      aria-label="Input mantra tiga huruf"
                    />
                    <Button
                      type="submit"
                      disabled={input.length !== 3 || submitting}
                      className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-stone-700 disabled:cursor-not-allowed font-bold transition-all duration-300"
                    >
                      {submitting ? 'Mengirim...' : '⚡ Jinakkan'}
                    </Button>
                  </form>
                )}
              </div>
              {isDefuser && (
                <Card className="border-2 border-blue-700 bg-gradient-to-r from-blue-950/40 to-stone-900 backdrop-blur-sm">
                  <CardContent className="p-3 sm:p-4">
                    <h5 className="text-blue-200 font-medium mb-2 text-sm sm:text-base">
                      📜 Instruksi Penjinakkan
                    </h5>
                    <ul className="text-xs sm:text-sm text-blue-200/90 space-y-1 list-disc pl-5">
                      <li>Jelaskan simbol yang terlihat kepada Ahli Grimoire secara jelas.</li>
                      <li>Masukkan tiga huruf sesuai arahan Ahli.</li>
                      <li>Periksa kembali urutan sebelum menekan Jinakkan.</li>
                    </ul>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}

        {(role === 'expert' || role === 'host') && (
          <Card className="border-4 border-indigo-700 bg-gradient-to-b from-stone-900 to-indigo-950 dungeon-card-glow-blue">
            <CardHeader className="p-4 sm:p-6 relative">
              <div className="absolute top-3 right-3 text-xl">
                <span ref={setTorchRef(1)} className="dungeon-torch-flicker">
                  🔥
                </span>
              </div>
              <CardTitle className="text-center text-indigo-200 text-lg sm:text-xl relative z-10 dungeon-glow-text">
                📖 Grimoire Expert
              </CardTitle>
              <CardDescription className="text-center text-stone-300 text-sm">
                Pemetaan simbol ke huruf kuno
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="rounded-xl p-4 border border-stone-700 bg-stone-800/60 backdrop-blur-sm">
                <h4 className="text-stone-200 font-semibold mb-3 text-sm sm:text-base">
                  Tabel Pemetaan Rune
                </h4>
                {gameState.puzzle.mapping && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(gameState.puzzle.mapping).map(([symbol, letter]) => (
                      <div
                        key={symbol}
                        className="flex items-center justify-between p-2 bg-stone-900/60 rounded border border-stone-700 hover:border-indigo-700 transition-colors"
                      >
                        <span className="font-mono text-lg text-stone-200">{symbol}</span>
                        <span className="font-bold text-indigo-300">&rarr; {String(letter)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {role === 'expert' && (
                <Card className="border-2 border-amber-700 bg-gradient-to-r from-amber-900/40 to-stone-900 backdrop-blur-sm">
                  <CardContent className="p-3 sm:p-4">
                    <h5 className="text-amber-300 font-medium mb-2 text-sm sm:text-base">
                      ⚔️ Peran Ahli Grimoire
                    </h5>
                    <ul className="text-xs sm:text-sm text-amber-200 space-y-1 list-disc pl-5">
                      <li>Dengarkan deskripsi simbol dari Penjinakkan dengan saksama.</li>
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

  // Render puzzle view
  const renderPuzzleView = useCallback(() => {
    switch (puzzleType) {
      case 'code_analysis': {
        const transformedPuzzle = {
          ...gameState.puzzle,
          expertView: gameState.puzzle.expertView
            ? {
                ...gameState.puzzle.expertView,
                bugs: gameState.puzzle.expertView.bugs?.map((bug: any) => bug.line),
              }
            : undefined,
        };
        return (
          <CodeAnalysisView
            puzzle={transformedPuzzle}
            role={role}
            onSubmitAttempt={handleSubmitAttempt}
            submitting={submitting}
          />
        );
      }
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
  }, [puzzleType, gameState.puzzle, role, handleSubmitAttempt, submitting]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Notice Banner */}
      {notice && <NoticeCard notice={notice} onDismiss={dismissNotice} />}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          icon="⏰"
          label="Sisa Waktu Ekspedisi"
          value={formatTime(timeLeft)}
          valueColor={getTimeColor(timeLeft)}
          warning={
            timeLeft <= CONFIG.CRITICAL_TIME_THRESHOLD && (
              <div className="text-red-300 text-xs sm:text-sm dungeon-torch-flicker">
                ⚠️ Zona Kritis
              </div>
            )
          }
        />

        <StatCard
          icon="🎯"
          label="Jumlah Percobaan"
          value={attempts.length}
          valueColor="text-indigo-300"
        />

        <StatCard
          icon="💡"
          label="Petunjuk Grimoire"
          value={`${hintsUsed}/${CONFIG.MAX_HINTS}`}
          valueColor="text-purple-300"
        />
      </div>

      {/* Current Hint */}
      {currentHint && (
        <Card className="border-2 border-amber-700 bg-gradient-to-r from-amber-950/40 to-stone-900 backdrop-blur-sm dungeon-card-glow animate-[fadeIn_0.3s_ease-out]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl dungeon-rune-float">💡</div>
              <div className="flex-1">
                <h4 className="text-amber-300 font-medium mb-1 text-sm sm:text-base dungeon-glow-text">
                  Petunjuk Grimoire #{hintsUsed}
                </h4>
                <p className="text-amber-200 text-sm sm:text-base leading-relaxed">{currentHint}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Puzzle Interface */}
      <Card className="border-4 border-emerald-700 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 dungeon-card-glow relative overflow-hidden">
        <CardHeader className="pb-2 p-4 sm:p-6">
          <CardTitle className="text-emerald-300 text-lg sm:text-xl dungeon-glow-text">
            🎯 Antarmuka Ujian Dungeon
          </CardTitle>
          <CardDescription className="text-stone-300 text-sm">
            Menyiapkan tampilan untuk jenis teka-teki:{' '}
            <span className="text-emerald-200 font-medium">{puzzleType}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">{renderPuzzleView()}</CardContent>
      </Card>

      {/* Hint System */}
      {!onSubmitAttempt && (
        <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 dungeon-card-glow">
          <CardHeader className="pb-2 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="text-stone-200 text-base sm:text-lg">Butuh Bantuan dari Grimoire?</CardTitle>
              <CardDescription className="text-stone-300 text-sm">
                Sisa Petunjuk: {CONFIG.MAX_HINTS - hintsUsed}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                onClick={() => handleGetHint(HINT_TYPES.GENERAL)}
                disabled={hintsUsed >= CONFIG.MAX_HINTS}
                className="bg-indigo-700 hover:bg-indigo-600 disabled:bg-stone-700 disabled:cursor-not-allowed font-bold transition-all duration-300"
              >
                📘 Petunjuk Umum
              </Button>
              {puzzleType !== 'symbol_mapping' && (
                <>
                  <Button
                    onClick={() => handleGetHint(HINT_TYPES.SPECIFIC)}
                    disabled={hintsUsed >= CONFIG.MAX_HINTS}
                    className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-stone-700 disabled:cursor-not-allowed font-bold transition-all duration-300"
                  >
                    📗 Petunjuk Spesifik
                  </Button>
                  <Button
                    onClick={() => handleGetHint(HINT_TYPES.DEBUGGING)}
                    disabled={hintsUsed >= CONFIG.MAX_HINTS}
                    className="bg-purple-700 hover:bg-purple-600 disabled:bg-stone-700 disabled:cursor-not-allowed font-bold transition-all duration-300"
                  >
                    📙 Petunjuk Debug
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attempt History */}
      {attempts.length > 0 && (
        <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 dungeon-card-glow">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-stone-200 text-base sm:text-lg">
              📜 Kronik Percobaan ({attempts.length} total)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 sm:p-6">
            {recentAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-md border gap-2 ${
                  attempt.is_correct
                    ? 'bg-emerald-900/40 border-emerald-700 text-emerald-200'
                    : 'bg-red-900/40 border-red-700 text-red-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-base sm:text-lg font-bold">{attempt.input}</span>
                  <span className="text-xs sm:text-sm opacity-80">
                    {new Date(attempt.created_at).toLocaleTimeString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center">
                  {attempt.is_correct ? (
                    <span className="text-emerald-300 text-sm">✅ Benar</span>
                  ) : (
                    <span className="text-red-300 text-sm">❌ Salah</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Communication Tips */}
      <Card className="border-2 border-purple-700 bg-gradient-to-b from-stone-900 to-purple-950 dungeon-card-glow">
        <CardHeader className="pb-2 p-4 sm:p-6">
          <CardTitle className="text-purple-300 text-base sm:text-lg dungeon-glow-text">
            💬 Tips Komunikasi Guild
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl border-2 border-amber-700 bg-stone-800/60 backdrop-blur-sm">
              <h5 className="text-amber-300 font-semibold mb-2 text-sm sm:text-base">
                {role === 'defuser' ? 'Untuk Penjinakkan' : 'Untuk Ahli Grimoire'}
              </h5>
              <ul className="text-stone-200 space-y-1 list-disc pl-5 text-xs sm:text-sm">
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
            <div className="p-4 rounded-xl border-2 border-blue-700 bg-stone-800/60 backdrop-blur-sm">
              <h5 className="text-blue-300 font-semibold mb-2 text-sm sm:text-base">
                Kunci Kolaborasi Guild
              </h5>
              <ul className="text-stone-200 space-y-1 list-disc pl-5 text-xs sm:text-sm">
                <li>Gunakan bahasa yang spesifik dan tidak ambigu.</li>
                <li>Ulangi informasi penting untuk menghindari salah paham.</li>
                <li>Minta konfirmasi saat berpindah langkah.</li>
                <li>Berpikir sebagai tim, bukan individu.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Objectives */}
      {puzzleType !== 'symbol_mapping' && gameState.puzzle.learningObjectives && (
        <Card className="border-2 border-indigo-700 bg-gradient-to-b from-stone-900 to-indigo-950 dungeon-card-glow">
          <CardHeader className="pb-2 p-4 sm:p-6">
            <CardTitle className="text-indigo-300 text-base sm:text-lg dungeon-glow-text">
              🎓 Tujuan Pembelajaran Ekspedisi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-stone-700 bg-stone-800/60 backdrop-blur-sm">
                <h5 className="text-indigo-200 font-medium mb-2 text-sm sm:text-base">Fokus Materi</h5>
                <ul className="text-xs sm:text-sm text-stone-200 space-y-1 list-disc pl-5">
                  {gameState.puzzle.learningObjectives.map((objective: string, index: number) => (
                    <li key={index}>{objective}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-xl border border-stone-700 bg-stone-800/60 backdrop-blur-sm">
                <h5 className="text-indigo-200 font-medium mb-2 text-sm sm:text-base">
                  Tips Belajar Bersama
                </h5>
                <ul className="text-xs sm:text-sm text-stone-200 space-y-1 list-disc pl-5">
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

      {/* Feedback Button */}
      {!onSubmitAttempt && (
        <div className="text-center">
          <Button
            onClick={() => setShowFeedbackForm(true)}
            className="bg-amber-700 hover:bg-amber-600 font-bold px-6 py-3 text-base transition-all duration-300"
          >
            💬 Beri Umpan Balik Ekspedisi
          </Button>
        </div>
      )}

      {/* Feedback Form Modal */}
      {showFeedbackForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-stone-200 text-lg sm:text-xl">
                Bagikan Pengalaman Ekspedisi
              </CardTitle>
              <CardDescription className="text-stone-300 text-sm">
                Apa yang dipelajari dan bagaimana kolaborasi guild berjalan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div>
                <label className="block text-sm text-stone-300 mb-2 font-medium">Jenis Umpan Balik</label>
                <select
                  value={feedbackData.feedback_type}
                  onChange={(e) =>
                    setFeedbackData({
                      ...feedbackData,
                      feedback_type: e.target.value as FeedbackType,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-700 rounded focus:outline-none focus:ring-4 focus:ring-amber-600 transition-all"
                >
                  <option value={FEEDBACK_TYPES.LEARNING_REFLECTION}>Refleksi Pembelajaran</option>
                  <option value={FEEDBACK_TYPES.PEER_REVIEW}>Ulasan Rekan</option>
                  <option value={FEEDBACK_TYPES.COLLABORATION_RATING}>Penilaian Kolaborasi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-stone-300 mb-2 font-medium">Umpan Balik</label>
                <textarea
                  value={feedbackData.content}
                  onChange={(e) => setFeedbackData({ ...feedbackData, content: e.target.value })}
                  placeholder="Bagikan hal yang dipelajari, cara kolaborasi, atau saran perbaikan..."
                  rows={4}
                  className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-700 rounded focus:outline-none focus:ring-4 focus:ring-amber-600 resize-none transition-all"
                />
              </div>

              {feedbackData.feedback_type === FEEDBACK_TYPES.COLLABORATION_RATING && (
                <div>
                  <label className="block text-sm text-stone-300 mb-2 font-medium">
                    Penilaian Kolaborasi (1-5)
                  </label>
                  <select
                    value={feedbackData.rating}
                    onChange={(e) =>
                      setFeedbackData({ ...feedbackData, rating: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-700 rounded focus:outline-none focus:ring-4 focus:ring-amber-600 transition-all"
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
                  className="flex-1 bg-indigo-700 hover:bg-indigo-600 disabled:bg-stone-700 disabled:cursor-not-allowed font-bold transition-all duration-300"
                >
                  Kirim Umpan Balik
                </Button>
                <Button
                  onClick={() => setShowFeedbackForm(false)}
                  variant="outline"
                  className="flex-1 border-stone-700 text-stone-200 hover:bg-stone-800/60 font-bold transition-all duration-300"
                >
                  Batal
                </Button>
              </div>
            </CardContent>
          </Card>
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
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        /* Crystal Glow */
        .dungeon-crystal-glow {
          animation: crystalGlow 3s ease-in-out infinite;
        }

        @keyframes crystalGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(180, 83, 9, 0.6), 0 0 40px rgba(251, 191, 36, 0.25); }
          50% { box-shadow: 0 0 28px rgba(180, 83, 9, 0.8), 0 0 60px rgba(251, 191, 36, 0.45); }
        }

        /* Card Glows */
        .dungeon-card-glow {
          box-shadow: 0 0 20px rgba(120, 113, 108, 0.4);
        }

        .dungeon-card-glow-red {
          box-shadow: 0 0 20px rgba(220, 38, 38, 0.4);
        }

        .dungeon-card-glow-blue {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
        }

        /* Text Glow */
        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4);
        }

        /* Pulse Animation */
        .dungeon-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* Slide In */
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Fade In */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .dungeon-card-glow,
          .dungeon-card-glow-red,
          .dungeon-card-glow-blue {
            box-shadow: 0 0 15px rgba(120, 113, 108, 0.3);
          }
        }
      `}</style>
    </div>
  );
}
