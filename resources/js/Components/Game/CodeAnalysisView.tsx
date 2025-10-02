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
  RUNE_FLOAT_DURATION: 3200,
  LINE_HOVER_DURATION: 0.3,
  MAX_INPUT_LENGTH: 200,
  MAX_CODE_HEIGHT: 450, // Maximum height for code blocks
  MAX_ACCORDION_HEIGHT: 350, // Maximum height for accordion content
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
  { pattern: /\b(shift|geser)\b/gi, replacer: () => 'pergeseran sigil' },
  { pattern: /\b(kunci|key)\b/gi, replacer: () => 'cipher rune' },
  { pattern: /\b(tambah|penjumlahan)\b/gi, replacer: () => 'ritus penambahan' },
  { pattern: /\b(kurang|pengurangan)\b/gi, replacer: () => 'pemotongan runik' },
  { pattern: /\b(kali|perkalian)\b/gi, replacer: () => 'ritual penggandaan' },
  { pattern: /\b(bagi|pembagian)\b/gi, replacer: () => 'pemisahan sigil' },
  { pattern: /\b(pangkat|eksponen)\b/gi, replacer: () => 'sigil eksponensial' },
] as const;

// ============================================
// TYPE DEFINITIONS
// ============================================
interface PuzzleDefuserView {
  cipher?: string;
  hints?: string[];
  codeLines?: string[];
}

interface PuzzleExpertView {
  cipher_type?: string;
  shift?: number;
  category?: string;
  bugs?: number[];
}

interface Puzzle {
  title?: string;
  description?: string;
  defuserView?: PuzzleDefuserView;
  expertView?: PuzzleExpertView;
}

interface Props {
  puzzle: Puzzle | null;
  role?: 'defuser' | 'expert' | 'host';
  onSubmitAttempt: (input: string) => void;
  submitting: boolean;
}

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
            duration: 0.22,
            ease: 'power1.inOut',
          });
        }
      });
    }, CONFIG.TORCH_FLICKER_INTERVAL);

    return () => clearInterval(torchInterval);
  }, []);

  const setTorchRef = (index: number) => (el: HTMLDivElement | null) => {
    torchRefs.current[index] = el;
  };

  return { setTorchRef };
};

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

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const LoadingState = memo(() => (
  <div className="min-h-[180px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-amber-950 border-2 border-amber-700/60 rounded-xl">
    <p className="text-amber-200 font-medium text-lg">Memuat teka-teki dari grimoire...</p>
  </div>
));

LoadingState.displayName = 'LoadingState';

const ErrorState = memo(() => (
  <div className="min-h-[180px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-red-950 border-2 border-red-700/60 rounded-xl">
    <p className="text-red-200 font-medium text-lg">Data teka-teki tidak tersedia</p>
  </div>
));

ErrorState.displayName = 'ErrorState';

const CodeLine = memo(
  ({
    line,
    lineNo,
    isDefuser,
    isActive,
    isChosen,
    onClick,
  }: {
    line: string;
    lineNo: number;
    isDefuser: boolean;
    isActive: boolean;
    isChosen: boolean;
    onClick: () => void;
  }) => {
    const lineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (lineRef.current && isActive) {
        gsap.to(lineRef.current, {
          scale: 1.02,
          duration: CONFIG.LINE_HOVER_DURATION,
          ease: 'power2.out',
        });

        return () => {
          if (lineRef.current) {
            gsap.to(lineRef.current, {
              scale: 1,
              duration: CONFIG.LINE_HOVER_DURATION,
              ease: 'power2.out',
            });
          }
        };
      }
    }, [isActive]);

    return (
      <div
        ref={lineRef}
        onClick={isDefuser ? onClick : undefined}
        className={[
          'flex items-start px-3 py-2 rounded transition-all duration-300',
          isDefuser ? 'cursor-pointer' : '',
          isActive ? 'ring-2 ring-amber-400 dungeon-line-glow' : '',
          isChosen
            ? 'bg-red-900/30 border-l-4 border-red-500'
            : isDefuser
            ? 'hover:bg-stone-800/60'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role={isDefuser ? 'button' : undefined}
        tabIndex={isDefuser ? 0 : undefined}
        aria-pressed={isDefuser ? isChosen : undefined}
        onKeyDown={isDefuser ? (e) => e.key === 'Enter' && onClick() : undefined}
      >
        {/* FIX: Increase line number font size and make it more visible */}
        <span className="text-stone-400 min-w-[2.5rem] text-right mr-4 select-none font-mono text-base font-semibold">
          {lineNo}
        </span>
        <code className="text-green-300 font-mono text-sm sm:text-base flex-1 break-all">{line}</code>
      </div>
    );
  }
);

CodeLine.displayName = 'CodeLine';

const HintSection = memo(
  ({
    hints,
    title,
    colorScheme,
  }: {
    hints: string[];
    title: string;
    colorScheme: 'blue' | 'purple';
  }) => {
    if (hints.length === 0) return null;

    const colors = {
      blue: {
        border: 'border-blue-700/40',
        bg: 'from-blue-950/40 to-stone-900/40',
        text: 'text-blue-200',
      },
      purple: {
        border: 'border-purple-700/40',
        bg: 'from-purple-950/40 to-stone-900/40',
        text: 'text-purple-200',
      },
    };

    const scheme = colors[colorScheme];

    return (
      <div
        className={`p-4 rounded-xl border-2 ${scheme.border} bg-gradient-to-r ${scheme.bg} backdrop-blur-sm`}
      >
        <h5 className={`${scheme.text} font-semibold mb-3 text-sm flex items-center gap-2`}>
          <span>💡</span>
          <span>{title}</span>
        </h5>
        <ul className={`text-xs ${scheme.text}/90 space-y-2 list-disc pl-5`}>
          {hints.slice(0, 4).map((hint, i) => (
            <li key={i} className="leading-relaxed">
              {hint}
            </li>
          ))}
        </ul>
      </div>
    );
  }
);

HintSection.displayName = 'HintSection';

// ============================================
// MAIN COMPONENT
// ============================================
export default function CodeAnalysisView({ puzzle, role = 'defuser', onSubmitAttempt, submitting }: Props) {
  const { setTorchRef } = useDungeonAtmosphere();

  // State Management
  const [foundBugs, setFoundBugs] = useState<number[]>([]);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [input, setInput] = useState('');

  // Memoized Values
  const isCipherPuzzle = useMemo(
    () => !!(puzzle?.defuserView?.cipher || puzzle?.expertView?.cipher_type),
    [puzzle]
  );

  const isBugPuzzle = useMemo(
    () => !!(puzzle?.expertView?.bugs || puzzle?.defuserView?.codeLines),
    [puzzle]
  );

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';
  const isHost = role === 'host';

  const runeLegend = useMemo(() => Object.entries(RUNE_MAP).map(([num, sym]) => ({ num, sym })), []);

  const cipherType = puzzle?.expertView?.cipher_type;
  const isCaesarCipher = cipherType === 'caesar';

  const numericShift = useMemo(() => {
    if (!isCaesarCipher || typeof puzzle?.expertView?.shift !== 'number') {
      return null;
    }
    return Math.abs(puzzle.expertView.shift % 26);
  }, [isCaesarCipher, puzzle?.expertView?.shift]);

  const caesarRuneHint = useMemo(() => {
    if (numericShift == null) return null;
    const digits = String(numericShift).split('');
    return digits.map((d) => RUNE_MAP[d] ?? d).join('');
  }, [numericShift]);

  const alphabet = useMemo(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), []);

  const rotated = useMemo(() => {
    if (numericShift == null) return alphabet;
    const k = numericShift % 26;
    return alphabet.map((_, i) => alphabet[(i + k) % 26]);
  }, [alphabet, numericShift]);

  const defuserHintsCipher = useMemo(() => {
    if (!isCipherPuzzle) return [];

    const base = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];

    const extra = [
      'Cari pola pergeseran yang tidak seragam dalam siklus.',
      'Uji pemetaan huruf dengan frekuensi bahasa.',
      'Frekuensi simbol membisikkan arah transformasi.',
      'Jejak aturan bisa bertingkat dan berlapis.',
    ];

    return [...base, ...extra].slice(0, 4).map(obfuscateText);
  }, [isCipherPuzzle, puzzle?.defuserView?.hints]);

  const defuserHintsBug = useMemo(() => {
    if (!isBugPuzzle) return [];

    const base = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];

    const extra = [
      'Perhatikan variabel yang berubah sebelum digunakan.',
      'Mantra cabang sering menyembunyikan kutukan tersembunyi.',
      'Fokus pada mantra yang aktif berjalan.',
      'Perhatikan resource yang tidak ditutup.',
    ];

    return [...base, ...extra].slice(0, 4).map(obfuscateText);
  }, [isBugPuzzle, puzzle?.defuserView?.hints]);

  // Handlers
  const handleSubmit = useCallback(() => {
    try {
      if (isCipherPuzzle) {
        const trimmedInput = input.trim().toUpperCase();
        if (!trimmedInput) return;
        onSubmitAttempt(trimmedInput);
        setInput('');
      } else if (isBugPuzzle) {
        if (foundBugs.length === 0) return;
        const bugInput = [...foundBugs].sort((a, b) => a - b).join(',');
        onSubmitAttempt(bugInput);
        setFoundBugs([]);
        setSelectedLine(null);
      }
    } catch (error) {
      console.error('Error saat submit:', error);
    }
  }, [isCipherPuzzle, isBugPuzzle, input, foundBugs, onSubmitAttempt]);

  const handleLineClick = useCallback(
    (lineNumber: number) => {
      if (!isDefuser || !isBugPuzzle) return;

      try {
        setSelectedLine(lineNumber);
        setFoundBugs((prev) =>
          prev.includes(lineNumber) ? prev.filter((n) => n !== lineNumber) : [...prev, lineNumber]
        );
      } catch (error) {
        console.error('Error saat memilih baris:', error);
      }
    },
    [isDefuser, isBugPuzzle]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const value = e.target.value.toUpperCase();
      if (value.length <= CONFIG.MAX_INPUT_LENGTH) {
        setInput(value);
      }
    } catch (error) {
      console.error('Error saat mengubah input:', error);
    }
  }, []);

  // Loading & Error States
  if (!puzzle) {
    return <ErrorState />;
  }

  if (!puzzle.defuserView && !puzzle.expertView) {
    return <LoadingState />;
  }

  // Main Render
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-2 border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
        <CardHeader className="relative p-4">
          <div ref={setTorchRef(0)} className="absolute top-3 left-3 text-2xl dungeon-torch-flicker" aria-hidden="true">
            🔥
          </div>
          <div
            ref={setTorchRef(1)}
            className="absolute top-3 right-3 text-2xl dungeon-torch-flicker"
            aria-hidden="true"
          >
            🔥
          </div>
          <CardTitle className="text-amber-300 text-xl sm:text-2xl text-center dungeon-glow-text">
            {puzzle.title || 'Tantangan Analisis Kode'}
          </CardTitle>
          <CardDescription className="text-stone-300 text-sm text-center">
            {puzzle.description || 'Selesaikan teka-teki di lorong CodeAlpha Dungeon.'}
          </CardDescription>

          {/* Info chips */}
          {(isExpert || isHost) && puzzle.expertView && (
            <div className="pt-3 flex flex-wrap gap-2 justify-center">
              <Badge className="bg-stone-800 text-stone-200 border border-stone-700/60">
                Jenis: {(cipherType || '—').toUpperCase()}
              </Badge>
              {isCaesarCipher && caesarRuneHint && (
                <Badge className="bg-stone-800 text-amber-200 border border-amber-700/60 text-base">
                  Sigil: {caesarRuneHint}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* CIPHER PUZZLE */}
          {isCipherPuzzle && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Defuser Panel */}
              {(isDefuser || isHost) && (
                <Card className="border-2 border-blue-700/40 bg-gradient-to-b from-stone-900/80 to-blue-950/40">
                  <CardHeader className="pb-2 p-3">
                    <CardTitle className="text-sm text-blue-300 text-center dungeon-glow-text">
                      🔐 Panel Defuser
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-3">
                    {puzzle.defuserView?.cipher && (
                      <div>
                        <h4 className="text-stone-200 font-semibold text-xs mb-2">Naskah Terkunci</h4>
                        <div className="bg-stone-950 rounded-lg p-3 border border-stone-700/60">
                          <code className="text-green-300 text-sm font-mono break-all">
                            {puzzle.defuserView.cipher}
                          </code>
                        </div>
                      </div>
                    )}

                    {isDefuser && (
                      <>
                        <div>
                          <label htmlFor="cipher-input" className="block text-xs font-medium text-blue-200 mb-2">
                            Hasil Dekripsi
                          </label>
                          <input
                            id="cipher-input"
                            type="text"
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Ketik jawaban..."
                            className="w-full px-3 py-2 bg-stone-900/70 border border-stone-700/50 rounded-lg text-amber-200 placeholder-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm font-mono"
                            disabled={submitting}
                            maxLength={CONFIG.MAX_INPUT_LENGTH}
                          />
                        </div>
                        <Button
                          onClick={handleSubmit}
                          disabled={!input.trim() || submitting}
                          className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-900 font-semibold py-2 rounded-lg disabled:opacity-50 transition-all"
                        >
                          {submitting ? 'Mengirim...' : 'Kirim Jawaban'}
                        </Button>

                        <HintSection hints={defuserHintsCipher} title="Petunjuk" colorScheme="blue" />
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Expert Panel */}
              {(isExpert || isHost) && (
                <Card className="border-2 border-emerald-700/40 bg-gradient-to-b from-stone-900/80 to-emerald-950/40">
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

                      <TabsContent value="guide" className="space-y-2 mt-3">
                        <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                          <Accordion type="single" collapsible className="space-y-2">
                            <AccordionItem value="dekripsi" className="border-stone-700/40">
                              <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-2">
                                Panduan Dekripsi
                              </AccordionTrigger>
                              <AccordionContent className="text-xs text-stone-300 p-2 space-y-1">
                                <p>• Deteksi jenis cipher dengan IoC/n-gram</p>
                                <p>• Gunakan analisis frekuensi untuk mono</p>
                                <p>• Estimasi panjang kunci untuk poli</p>
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="caesar" className="border-stone-700/40">
                              <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-2">
                                Teknik Caesar
                              </AccordionTrigger>
                              <AccordionContent className="text-xs text-stone-300 p-2 space-y-1">
                                <p>• Uji setiap shift dengan scoring</p>
                                <p>• Konfirmasi dengan digram umum</p>
                                <p>• Validasi hasil dengan konteks</p>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      </TabsContent>

                      <TabsContent value="tools" className="space-y-2 mt-3">
                        {isCaesarCipher && (
                          <div className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40 max-h-96 overflow-y-auto">
                            <div className="text-xs text-stone-300 space-y-2">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-amber-800/80 text-amber-100 text-base">
                                  {caesarRuneHint || '?'}
                                </Badge>
                                <span className="text-stone-400">← Shift hint</span>
                              </div>
                              <div className="grid grid-cols-13 gap-1">
                                {alphabet.slice(0, 13).map((ch, i) => (
                                  <Badge key={ch} className="bg-stone-800 text-stone-100 text-xs p-1">
                                    {ch}
                                  </Badge>
                                ))}
                              </div>
                              <div className="grid grid-cols-13 gap-1">
                                {rotated.slice(0, 13).map((ch, i) => (
                                  <Badge key={ch} className="bg-stone-900 text-amber-300 text-xs p-1">
                                    {ch}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="p-2 rounded-lg bg-stone-900/60 border border-stone-700/40">
                          <h6 className="text-xs text-stone-300 mb-2">Legenda Rune</h6>
                          <div className="grid grid-cols-5 gap-1">
                            {runeLegend.map(({ num, sym }) => (
                              <Badge key={num} className="bg-stone-800 text-amber-100 text-xs">
                                {sym}={num}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* BUG PUZZLE */}
          {isBugPuzzle && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Defuser Panel */}
              {(isDefuser || isHost) && (
                <Card className="border-2 border-red-700/40 bg-gradient-to-b from-stone-900/80 to-red-950/30">
                  <CardHeader className="pb-2 p-3">
                    <CardTitle className="text-sm text-red-300 text-center dungeon-glow-text">
                      🪓 Panel Defuser
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-3">
                    {Array.isArray(puzzle.defuserView?.codeLines) && (
                      <div>
                        <h4 className="text-stone-200 font-semibold text-xs mb-2">Kode Program</h4>
                        <div
                          className="bg-stone-950 rounded-lg p-2 border border-stone-700/60 overflow-y-auto"
                          style={{ maxHeight: `${CONFIG.MAX_CODE_HEIGHT}px` }}
                        >
                          <pre className="text-xs">
                            {puzzle.defuserView.codeLines.map((line, index) => {
                              const lineNo = index + 1;
                              return (
                                <CodeLine
                                  key={index}
                                  line={line}
                                  lineNo={lineNo}
                                  isDefuser={isDefuser}
                                  isActive={selectedLine === lineNo}
                                  isChosen={foundBugs.includes(lineNo)}
                                  onClick={() => handleLineClick(lineNo)}
                                />
                              );
                            })}
                          </pre>
                        </div>
                        {isDefuser && (
                          <p className="text-xs text-stone-400 mt-2">
                            Bug terpilih:{' '}
                            <span className="text-red-400 font-bold text-base">{foundBugs.length}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {isDefuser && (
                      <>
                        <Button
                          onClick={handleSubmit}
                          disabled={foundBugs.length === 0 || submitting}
                          className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-900 font-semibold py-2 rounded-lg disabled:opacity-50 transition-all"
                        >
                          {submitting ? 'Mengirim...' : `Kirim (${foundBugs.length})`}
                        </Button>

                        <HintSection hints={defuserHintsBug} title="Petunjuk" colorScheme="purple" />
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Expert Panel */}
              {(isExpert || isHost) && (
                <Card className="border-2 border-emerald-700/40 bg-gradient-to-b from-stone-900/80 to-emerald-950/40">
                  <CardHeader className="pb-2 p-3">
                    <CardTitle className="text-sm text-emerald-300 text-center dungeon-glow-text">
                      📖 Panel Expert
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                      <Accordion type="single" collapsible className="space-y-2">
                        <AccordionItem value="arah" className="border-stone-700/40">
                          <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-2">
                            Arah Penelusuran
                          </AccordionTrigger>
                          <AccordionContent className="text-xs text-stone-300 p-2 space-y-1">
                            <p>• Lacak variabel yang berubah di cabang</p>
                            <p>• Cari resource yang tidak ditutup</p>
                            <p>• Perhatikan rekursi tanpa base case</p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="cek" className="border-stone-700/40">
                          <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-2">
                            Daftar Cek
                          </AccordionTrigger>
                          <AccordionContent className="text-xs text-stone-300 p-2 space-y-1">
                            <p>• Null/undefined checks</p>
                            <p>• Resource leaks</p>
                            <p>• Index out of bounds</p>
                            <p>• Type mismatches</p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="sokratik" className="border-stone-700/40">
                          <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-2">
                            Pertanyaan Pemandu
                          </AccordionTrigger>
                          <AccordionContent className="text-xs text-stone-300 p-2 space-y-1">
                            <p>• Apa yang terjadi jika cabang ini tidak dijalankan?</p>
                            <p>• Bagian mana yang bergantung state sebelumnya?</p>
                            <p>• Apa efek pada input ekstrem?</p>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================
          CUSTOM DUNGEON STYLES
          ======================================== */}
      <style>{`
        .dungeon-torch-flicker {
          display: inline-block;
        }

        .dungeon-line-glow {
          box-shadow: 0 0 15px rgba(251, 191, 36, 0.5);
        }

        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
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
      `}</style>
    </div>
  );
}
