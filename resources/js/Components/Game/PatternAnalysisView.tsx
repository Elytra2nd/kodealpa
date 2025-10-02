import React, { useMemo, useState, useCallback, useRef, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/Components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { gsap } from 'gsap';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  TORCH_FLICKER_INTERVAL: 2200,
  RUNE_FLOAT_DURATION: 3600,
  PATTERN_ENTRANCE_DURATION: 0.6,
  PATTERN_STAGGER: 0.1,
  MAX_INPUT_LENGTH: 20,
  MAX_ACCORDION_HEIGHT: 300,
} as const;

const RUNE_MAP: Record<string, string> = {
  '0': '◇',
  '1': '†',
  '2': '♁',
  '3': '♆',
  '4': '♄',
  '5': '♃',
  '6': '☿',
  '7': '☼',
  '8': '◈',
  '9': '★',
} as const;

const OBFUSCATION_PATTERNS = [
  { pattern: /\d/g, replacer: (d: string) => RUNE_MAP[d] ?? d },
  { pattern: /\b(kali|perkalian)\b/gi, replacer: () => 'ritual penggandaan' },
  { pattern: /\b(tambah|penjumlahan)\b/gi, replacer: () => 'ritus penambahan' },
  { pattern: /\b(kurang|pengurangan)\b/gi, replacer: () => 'pemotongan runik' },
  { pattern: /\b(bagi|pembagian)\b/gi, replacer: () => 'pemisahan sigil' },
  { pattern: /\b(pangkat|eksponen)\b/gi, replacer: () => 'sigil eksponensial' },
] as const;

// ============================================
// TYPE DEFINITIONS
// ============================================
interface Props {
  puzzle: any;
  role?: 'defuser' | 'expert' | 'host';
  onSubmitAttempt: (input: string) => void;
  submitting: boolean;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
const obfuscateText = (text: string): string => {
  try {
    let result = String(text);
    OBFUSCATION_PATTERNS.forEach(({ pattern, replacer }) => {
      result = result.replace(pattern, replacer as any);
    });
    return result;
  } catch (error) {
    console.error('Error obfuscating text:', error);
    return text;
  }
};

const dungeonizeRule = (rule?: string): string => {
  const base = rule ? String(rule) : 'Jejak perubahan antar-suku menuntun peziarah angka';
  return obfuscateText(`Petuah lorong: ${base}`);
};

// ============================================
// CUSTOM HOOKS
// ============================================
const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const patternRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const torchInterval = setInterval(() => {
      torchRefs.current.forEach((torch) => {
        if (torch) {
          gsap.to(torch, {
            opacity: Math.random() * 0.15 + 0.85,
            duration: 0.22,
            ease: 'power1.inOut',
          });
        }
      });
    }, CONFIG.TORCH_FLICKER_INTERVAL);

    return () => clearInterval(torchInterval);
  }, []);

  useEffect(() => {
    const validPatterns = patternRefs.current.filter((p): p is HTMLElement => p !== null);
    if (validPatterns.length > 0) {
      gsap.fromTo(
        validPatterns,
        {
          opacity: 0,
          scale: 0.5,
          rotateY: 180,
        },
        {
          opacity: 1,
          scale: 1,
          rotateY: 0,
          duration: CONFIG.PATTERN_ENTRANCE_DURATION,
          stagger: CONFIG.PATTERN_STAGGER,
          ease: 'back.out(1.7)',
        }
      );
    }
  }, []);

  const setTorchRef = (index: number) => (el: HTMLDivElement | null) => {
    torchRefs.current[index] = el;
  };

  const setPatternRef = (index: number) => (el: HTMLDivElement | null) => {
    patternRefs.current[index] = el;
  };

  return { setTorchRef, setPatternRef };
};

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const PatternBox = memo(
  ({
    item,
    index,
    isEmpty,
    setPatternRef,
  }: {
    item: any;
    index: number;
    isEmpty: boolean;
    setPatternRef: (index: number) => (el: HTMLDivElement | null) => void;
  }) => (
    <div
      ref={setPatternRef(index)}
      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-extrabold border-2 shadow-lg transition-all duration-300 hover:scale-110 ${
        isEmpty
          ? 'border-red-600/60 bg-gradient-to-br from-red-900/40 to-red-950/60 text-red-200 dungeon-pulse dungeon-card-glow-red'
          : 'border-blue-600/60 bg-gradient-to-br from-blue-900/40 to-blue-950/60 text-blue-200 dungeon-rune-float dungeon-card-glow-blue'
      }`}
      title={isEmpty ? 'Angka hilang' : `Angka ke-${index + 1}: ${item}`}
      aria-label={isEmpty ? 'Angka hilang' : `Angka ${item}`}
    >
      {isEmpty ? '?' : item}
    </div>
  )
);

PatternBox.displayName = 'PatternBox';

const RuneLegendBadge = memo(({ num, sym }: { num: string; sym: string }) => (
  <Badge className="bg-stone-800 text-amber-100 border border-amber-700/60 dungeon-badge-glow text-xs">
    {sym}={num}
  </Badge>
));

RuneLegendBadge.displayName = 'RuneLegendBadge';

const LoadingState = memo(() => (
  <div className="min-h-[200px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-red-950 border-2 border-red-700/60 rounded-xl dungeon-card-glow-red">
    <p className="text-red-200 font-medium text-lg">Data teka-teki tidak tersedia</p>
  </div>
));

LoadingState.displayName = 'LoadingState';

// ============================================
// MAIN COMPONENT
// ============================================
export default function PatternAnalysisView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const { setTorchRef, setPatternRef } = useDungeonAtmosphere();

  const [jawaban, setJawaban] = useState('');

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';
  const isHost = role === 'host';

  const runeLegend = useMemo(() => Object.entries(RUNE_MAP).map(([num, sym]) => ({ num, sym })), []);

  const transformedHints = useMemo(() => {
    const base = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];
    const extra = [
      'Amati selisih yang tidak selalu tetap; terkadang ia berulang dalam siklus kabur.',
      'Jejak perubahan bisa bertumpuk: selisih dari selisih kerap membisikkan pola.',
      'Cermati lonjakan drastis; itu bisa pertanda ritual penggandaan terselubung.',
      'Bila aturan tampak tersembunyi, periksa residu ketika dipecah oleh bilangan kecil.',
    ];
    return [...base, ...extra].slice(0, 4).map(obfuscateText);
  }, [puzzle]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = jawaban.trim();
      if (!trimmed) return;
      onSubmitAttempt(trimmed);
      setJawaban('');
    },
    [jawaban, onSubmitAttempt]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= CONFIG.MAX_INPUT_LENGTH) {
      setJawaban(value);
    }
  }, []);

  if (!puzzle) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-4 relative">
      <Card className="overflow-hidden border-2 border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 shadow-2xl dungeon-card-glow">
        <CardHeader className="relative p-4">
          <div ref={setTorchRef(0)} className="absolute top-3 left-3 text-xl sm:text-2xl dungeon-torch-flicker">
            🔥
          </div>
          <div ref={setTorchRef(1)} className="absolute top-3 right-3 text-xl sm:text-2xl dungeon-torch-flicker">
            🔥
          </div>
          <CardTitle className="text-amber-300 text-xl sm:text-2xl text-center dungeon-glow-text relative z-10">
            {puzzle.title || 'Analisis Pola Mistis'}
          </CardTitle>
          <CardDescription className="text-stone-300 text-sm text-center relative z-10">
            {puzzle.description || 'Temukan pola tersembunyi dalam urutan angka dungeon'}
          </CardDescription>
          <div className="pt-2 flex flex-wrap gap-2 justify-center relative z-10">
            <Badge className="bg-amber-800 text-amber-100 border border-amber-700/50 dungeon-badge-glow">
              🏰 Mode Dungeon
            </Badge>
            <Badge className="bg-stone-700 text-stone-200 border border-stone-600/50 dungeon-badge-glow">
              🧩 Analisis Pola
            </Badge>
            {role && (
              <Badge className="bg-purple-800 text-purple-100 border border-purple-700/50 dungeon-badge-glow">
                🎭 Peran: {role}
              </Badge>
            )}
            {puzzle?.expertView?.category && (
              <Badge className="bg-emerald-800 text-emerald-100 border border-emerald-700/50 dungeon-badge-glow">
                {String(puzzle.expertView.category)}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          {/* Rule hint for expert/host */}
          {(isExpert || isHost) && puzzle.expertView?.rule && (
            <Card className="border border-stone-700/40 bg-stone-800/40 backdrop-blur-sm">
              <CardContent className="p-3">
                <p className="text-stone-300 italic text-xs sm:text-sm leading-relaxed text-center">
                  "{dungeonizeRule(puzzle.expertView.rule)}"
                </p>
              </CardContent>
            </Card>
          )}

          {/* MAIN GRID - Side by side layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* DEFUSER PANEL */}
            {(isDefuser || isHost) && (
              <Card className="border-2 border-amber-600/40 bg-gradient-to-b from-stone-900/80 to-stone-800/40 backdrop-blur-sm dungeon-card-glow-blue">
                <CardHeader className="pb-2 p-3">
                  <CardTitle className="text-sm text-amber-300 text-center dungeon-glow-text">
                    🔢 Panel Defuser
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {Array.isArray(puzzle.defuserView?.pattern) ? (
                    <>
                      {/* FIX: Pattern boxes - GRID CENTERED */}
                      <div className="grid place-items-center mb-4">
                        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                          {puzzle.defuserView.pattern.map((item: any, idx: number) => {
                            const kosong = item === '?' || item == null;
                            return (
                              <PatternBox
                                key={idx}
                                item={item}
                                index={idx}
                                isEmpty={kosong}
                                setPatternRef={setPatternRef}
                              />
                            );
                          })}
                          <div
                            ref={setPatternRef(puzzle.defuserView.pattern.length)}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-extrabold border-2 border-red-600 bg-gradient-to-br from-red-900/40 to-red-950/60 text-red-200 dungeon-pulse dungeon-card-glow-red shadow-lg"
                            title="Angka hilang yang harus ditemukan"
                            aria-label="Angka hilang"
                          >
                            ?
                          </div>
                        </div>
                      </div>

                      {/* Input form */}
                      {isDefuser && (
                        <form onSubmit={handleSubmit} className="space-y-3">
                          <div className="grid place-items-center">
                            <input
                              type="number"
                              value={jawaban}
                              onChange={handleInputChange}
                              placeholder="Masukkan angka..."
                              className="w-full max-w-xs h-11 text-center text-lg font-bold bg-stone-900/70 border-2 border-amber-600/60 rounded-xl text-amber-200 placeholder-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                              disabled={submitting}
                              maxLength={CONFIG.MAX_INPUT_LENGTH}
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={!jawaban.trim() || submitting}
                            className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-900 font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-all"
                          >
                            {submitting ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin">⚙️</span>
                                Mengirim...
                              </span>
                            ) : (
                              '✨ Kirim Jawaban'
                            )}
                          </Button>

                          {/* Hints accordion */}
                          {transformedHints.length > 0 && (
                            <Accordion type="single" collapsible>
                              <AccordionItem value="hints" className="border-blue-700/40">
                                <AccordionTrigger className="text-blue-200 text-xs hover:text-blue-300 py-2">
                                  💡 Petunjuk Terselubung
                                </AccordionTrigger>
                                <AccordionContent
                                  className="p-2 rounded-lg bg-blue-950/40 max-h-60 overflow-y-auto"
                                  style={{ maxHeight: `${CONFIG.MAX_ACCORDION_HEIGHT}px` }}
                                >
                                  <ul className="text-xs text-blue-200/90 space-y-1.5 list-disc pl-4">
                                    {transformedHints.map((hint, i) => (
                                      <li key={i}>{hint}</li>
                                    ))}
                                  </ul>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          )}
                        </form>
                      )}
                    </>
                  ) : (
                    <div className="p-3 rounded-xl border border-red-700/40 bg-red-950/40 text-red-200 text-center text-sm">
                      Data urutan tidak ditemukan
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* EXPERT PANEL */}
            {(isExpert || isHost) && puzzle.expertView && (
              <Card className="border-2 border-emerald-700/40 bg-gradient-to-b from-stone-900/80 to-emerald-950/40 backdrop-blur-sm dungeon-card-glow-green">
                <CardHeader className="pb-2 p-3">
                  <CardTitle className="text-sm text-emerald-300 text-center dungeon-glow-text">
                    📖 Panel Expert
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <Tabs defaultValue="guide" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-stone-900/60">
                      <TabsTrigger value="guide" className="text-xs">
                        Panduan
                      </TabsTrigger>
                      <TabsTrigger value="tools" className="text-xs">
                        Tools
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="guide" className="space-y-2 mt-2">
                      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                        <Accordion type="single" collapsible className="space-y-2">
                          <AccordionItem value="runes" className="border-stone-700/40">
                            <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-2">
                              ✨ Legenda Rune
                            </AccordionTrigger>
                            <AccordionContent className="p-2 text-xs text-stone-300 space-y-1">
                              <div className="grid place-items-center mb-2">
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {runeLegend.slice(0, 10).map(({ num, sym }) => (
                                    <RuneLegendBadge key={num} num={num} sym={sym} />
                                  ))}
                                </div>
                              </div>
                              <p className="text-center">Pulihkan digit dari rune untuk analisis yang akurat</p>
                            </AccordionContent>
                          </AccordionItem>

                          <AccordionItem value="deteksi" className="border-stone-700/40">
                            <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-2">
                              🔍 Deteksi Pola
                            </AccordionTrigger>
                            <AccordionContent className="p-2 text-xs text-stone-300 space-y-1">
                              <p>• Selisih konstan → aritmetika</p>
                              <p>• Rasio konstan → geometri</p>
                              <p>• Uji selisih tingkat-2 jika tidak konstan</p>
                            </AccordionContent>
                          </AccordionItem>

                          <AccordionItem value="strategi" className="border-stone-700/40">
                            <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-2">
                              🎯 Strategi
                            </AccordionTrigger>
                            <AccordionContent className="p-2 text-xs text-stone-300 space-y-1">
                              <p>• Validasi hipotesis pada 2-3 suku</p>
                              <p>• Bimbing dengan pertanyaan, bukan jawaban</p>
                              <p>• Iterasi: observasi → analisis → validasi</p>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    </TabsContent>

                    <TabsContent value="tools" className="space-y-2 mt-2">
                      <div className="p-2 rounded-lg bg-stone-900/60 border border-stone-700/40">
                        <h6 className="text-xs text-stone-300 mb-2 font-semibold">Alat Bantu</h6>
                        <ul className="text-xs text-stone-300 space-y-1 list-disc pl-4">
                          <li>Uji modulo kecil (2, 3, 5) untuk siklus</li>
                          <li>Lonjakan tajam → penggandaan/pangkat</li>
                          <li>Validasi dengan suku berikutnya</li>
                        </ul>
                      </div>

                      <div className="p-2 rounded-lg bg-stone-900/60 border border-amber-700/40">
                        <h6 className="text-xs text-amber-300 mb-2 font-semibold">Peran Expert</h6>
                        <ul className="text-xs text-stone-300 space-y-1 list-disc pl-4">
                          <li>Pandu pada transformasi, bukan angka</li>
                          <li>Minta hipotesis dan verifikasi</li>
                          <li>Jaga ritme: amati → analisis → validasi</li>
                        </ul>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Collaboration tips - Compact accordion */}
          <Card className="border border-purple-700/40 bg-purple-950/20 backdrop-blur-sm">
            <CardContent className="p-3">
              <Accordion type="single" collapsible>
                <AccordionItem value="tips" className="border-purple-700/40">
                  <AccordionTrigger className="text-purple-300 text-xs hover:text-purple-400 py-2">
                    💡 Tips Kolaborasi
                  </AccordionTrigger>
                  <AccordionContent className="p-2 text-xs text-stone-300 space-y-2">
                    <div>
                      <span className="font-semibold text-amber-300">Defuser:</span> Telusuri selisih, uji
                      progresi, minta validasi tanpa mengungkap final
                    </div>
                    <div>
                      <span className="font-semibold text-blue-300">Expert:</span> Mulai observasi kualitatif,
                      batasi petunjuk pada bentuk transformasi
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* ========================================
          CUSTOM DUNGEON STYLES
          ======================================== */}
      <style>{`
        .dungeon-torch-flicker {
          display: inline-block;
        }

        .dungeon-rune-float {
          display: inline-block;
          animation: runeFloat 3.6s ease-in-out infinite;
        }

        @keyframes runeFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        .dungeon-card-glow {
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.4);
        }

        .dungeon-card-glow-blue {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
        }

        .dungeon-card-glow-green {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
        }

        .dungeon-card-glow-red {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
        }

        .dungeon-badge-glow {
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
        }

        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
        }

        .dungeon-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        /* Custom scrollbar */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.5);
          border-radius: 3px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(180, 83, 9, 0.6);
          border-radius: 3px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(180, 83, 9, 0.8);
        }

        @media (max-width: 768px) {
          .dungeon-card-glow,
          .dungeon-card-glow-blue,
          .dungeon-card-glow-green,
          .dungeon-card-glow-red {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
          }
        }
      `}</style>
    </div>
  );
}
