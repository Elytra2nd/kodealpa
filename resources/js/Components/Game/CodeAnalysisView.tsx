import React, { useMemo, useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/Components/ui/accordion';
import { gsap } from 'gsap';
import { toast } from 'sonner';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  TORCH_FLICKER_INTERVAL: 150,
  RUNE_FLOAT_DURATION: 3200,
  LINE_HOVER_DURATION: 0.3,
  MAX_INPUT_LENGTH: 200,
  MAX_CODE_HEIGHT: 420,
  MAX_EXPERT_CONTENT_HEIGHT: 450, // ✅ Increased for table
  MAX_ACCORDION_HEIGHT: 420,
  MOBILE_BREAKPOINT: 768,
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
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < CONFIG.MOBILE_BREAKPOINT);
    checkMobile();
    const handleResize = () => checkMobile();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      torchRefs.current.forEach((torch) => {
        if (torch) {
          gsap.to(torch, {
            opacity: Math.random() * 0.3 + 0.7,
            scale: Math.random() * 0.1 + 0.95,
            duration: 0.15,
            ease: 'power1.inOut',
          });
        }
      });
    }, CONFIG.TORCH_FLICKER_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const setTorchRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      torchRefs.current[index] = el;
    },
    []
  );

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
// ANIMATION VARIANTS
// ============================================
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const scaleIn = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const LoadingState = memo(() => (
  <motion.div variants={scaleIn} initial="initial" animate="animate">
    <div className="min-h-[180px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-amber-950 border-2 border-amber-700/60 rounded-xl">
      <p className="text-amber-200 font-medium text-base sm:text-lg">Memuat teka-teki dari grimoire...</p>
    </div>
  </motion.div>
));

LoadingState.displayName = 'LoadingState';

const ErrorState = memo(() => (
  <motion.div variants={scaleIn} initial="initial" animate="animate">
    <div className="min-h-[180px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-red-950 border-2 border-red-700/60 rounded-xl">
      <p className="text-red-200 font-medium text-base sm:text-lg">Data teka-teki tidak tersedia</p>
    </div>
  </motion.div>
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
    isMobile,
  }: {
    line: string;
    lineNo: number;
    isDefuser: boolean;
    isActive: boolean;
    isChosen: boolean;
    onClick: () => void;
    isMobile: boolean;
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
          'flex items-start px-2 py-1 rounded transition-all duration-300',
          isDefuser ? 'cursor-pointer' : '',
          isActive ? 'ring-2 ring-amber-400 dungeon-line-glow' : '',
          isChosen ? 'bg-red-900/30 border-l-4 border-red-500' : isDefuser ? 'hover:bg-stone-800/60' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role={isDefuser ? 'button' : undefined}
        tabIndex={isDefuser ? 0 : undefined}
        aria-pressed={isDefuser ? isChosen : undefined}
        onKeyDown={isDefuser ? (e) => e.key === 'Enter' && onClick() : undefined}
      >
        <span className={`text-stone-400 ${isMobile ? 'min-w-[1.5rem]' : 'min-w-[2rem]'} text-right mr-2 select-none font-mono text-xs font-semibold`}>
          {lineNo}
        </span>
        <code className="text-green-300 font-mono text-xs flex-1 break-all">{line}</code>
      </div>
    );
  }
);

CodeLine.displayName = 'CodeLine';

// ============================================
// MAIN COMPONENT
// ============================================
export default function CodeAnalysisView({ puzzle, role = 'defuser', onSubmitAttempt, submitting }: Props) {
  const isMobile = useIsMobile();
  const { setTorchRef } = useDungeonAtmosphere();

  const [foundBugs, setFoundBugs] = useState<number[]>([]);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const isCipherPuzzle = useMemo(() => !!(puzzle?.defuserView?.cipher || puzzle?.expertView?.cipher_type), [puzzle]);
  const isBugPuzzle = useMemo(() => !!(puzzle?.expertView?.bugs || puzzle?.defuserView?.codeLines), [puzzle]);

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';
  const isHost = role === 'host';

  const runeLegend = useMemo(() => Object.entries(RUNE_MAP).map(([num, sym]) => ({ num, sym })), []);

  const cipherType = puzzle?.expertView?.cipher_type;
  const isCaesarCipher = cipherType === 'caesar';

  const numericShift = useMemo(() => {
    if (!isCaesarCipher || typeof puzzle?.expertView?.shift !== 'number') return null;
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
    ];
    return [...base, ...extra].slice(0, 3).map(obfuscateText);
  }, [isCipherPuzzle, puzzle?.defuserView?.hints]);

  const defuserHintsBug = useMemo(() => {
    if (!isBugPuzzle) return [];
    const base = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];
    const extra = [
      'Perhatikan variabel yang berubah sebelum digunakan.',
      'Mantra cabang sering menyembunyikan kutukan tersembunyi.',
      'Fokus pada mantra yang aktif berjalan.',
    ];
    return [...base, ...extra].slice(0, 3).map(obfuscateText);
  }, [isBugPuzzle, puzzle?.defuserView?.hints]);

  // ============================================
  // CALLBACKS
  // ============================================
  const handleSubmit = useCallback(() => {
    try {
      if (isCipherPuzzle) {
        const trimmedInput = input.trim().toUpperCase();
        if (!trimmedInput) {
          toast.error('Mohon masukkan jawaban');
          return;
        }
        onSubmitAttempt(trimmedInput);
        setInput('');
        toast.info('Jawaban dikirim');
      } else if (isBugPuzzle) {
        if (foundBugs.length === 0) {
          toast.error('Pilih minimal satu baris bug');
          return;
        }
        const bugInput = [...foundBugs].sort((a, b) => a - b).join(',');
        onSubmitAttempt(bugInput);
        setFoundBugs([]);
        setSelectedLine(null);
        toast.info('Bug report dikirim');
      }
    } catch (error) {
      console.error('Error saat submit:', error);
      toast.error('Gagal mengirim jawaban');
    }
  }, [isCipherPuzzle, isBugPuzzle, input, foundBugs, onSubmitAttempt]);

  const handleLineClick = useCallback(
    (lineNumber: number) => {
      if (!isDefuser || !isBugPuzzle) return;
      try {
        setSelectedLine(lineNumber);
        setFoundBugs((prev) => (prev.includes(lineNumber) ? prev.filter((n) => n !== lineNumber) : [...prev, lineNumber]));
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

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (!isMobile && inputRef.current && isDefuser && isCipherPuzzle) {
      inputRef.current.focus();
    }
  }, [isMobile, isDefuser, isCipherPuzzle]);

  // ============================================
  // RENDER CONDITIONS
  // ============================================
  if (!puzzle) {
    return <ErrorState />;
  }

  if (!puzzle.defuserView && !puzzle.expertView) {
    return <LoadingState />;
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
      <motion.div variants={fadeInUp}>
        <Card className="overflow-hidden border-2 border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
          <CardHeader className={`relative ${isMobile ? 'p-3' : 'p-4'}`}>
            <div ref={setTorchRef(0)} className={`absolute ${isMobile ? 'top-2 left-2 text-lg' : 'top-2 left-2 text-xl'} dungeon-torch-flicker`}>
              🔥
            </div>
            <div ref={setTorchRef(1)} className={`absolute ${isMobile ? 'top-2 right-2 text-lg' : 'top-2 right-2 text-xl'} dungeon-torch-flicker`}>
              🔥
            </div>
            <CardTitle className={`text-amber-300 ${isMobile ? 'text-base' : 'text-lg sm:text-xl'} text-center dungeon-glow-text`}>
              {puzzle.title || 'Tantangan Analisis Kode'}
            </CardTitle>
            <CardDescription className={`text-stone-300 ${isMobile ? 'text-xs' : 'text-xs sm:text-sm'} text-center`}>
              {puzzle.description || 'Selesaikan teka-teki di lorong CodeAlpha Dungeon.'}
            </CardDescription>

            {(isExpert || isHost) && puzzle.expertView && (
              <div className="pt-2 flex flex-wrap gap-1 justify-center">
                <Badge className="bg-stone-800 text-stone-200 border border-stone-700/60 text-xs">{(cipherType || '—').toUpperCase()}</Badge>
              </div>
            )}
          </CardHeader>

          <CardContent className={isMobile ? 'p-3 space-y-3' : 'p-4 space-y-3'}>
            {/* CIPHER PUZZLE */}
            {isCipherPuzzle && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Defuser Panel */}
                {(isDefuser || isHost) && (
                  <motion.div variants={fadeInUp}>
                    <Card className="border-2 border-blue-700/40 bg-gradient-to-b from-stone-900/80 to-blue-950/40">
                      <CardHeader className={`pb-2 ${isMobile ? 'p-2' : 'p-3'}`}>
                        <CardTitle className="text-xs text-blue-300 text-center dungeon-glow-text">🔐 Panel Defuser</CardTitle>
                      </CardHeader>
                      <CardContent className={`space-y-2 ${isMobile ? 'p-2' : 'p-3'}`}>
                        {puzzle.defuserView?.cipher && (
                          <div>
                            <h4 className="text-stone-200 font-semibold text-xs mb-1">Naskah Terkunci</h4>
                            <div
                              className="bg-stone-950 rounded-lg p-2 border border-stone-700/60 overflow-y-auto"
                              style={{ maxHeight: `${CONFIG.MAX_CODE_HEIGHT}px`, minHeight: '200px' }}
                            >
                              <code className="text-green-300 text-xs font-mono break-all leading-relaxed">{puzzle.defuserView.cipher}</code>
                            </div>
                          </div>
                        )}

                        {/* ✅ FIX: SHIFT HINT - Only show once */}
                        {isDefuser && isCaesarCipher && caesarRuneHint && (
                          <div className="p-2 rounded-lg bg-amber-900/30 border border-amber-700/50">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-amber-200">Pergeseran Sigil:</span>
                              <Badge className="bg-amber-800 text-amber-100 text-sm font-bold">{caesarRuneHint}</Badge>
                            </div>
                          </div>
                        )}

                        {isDefuser && (
                          <>
                            <div>
                              <label htmlFor="cipher-input" className="block text-xs font-medium text-blue-200 mb-1">
                                Hasil Dekripsi
                              </label>
                              <input
                                ref={inputRef}
                                id="cipher-input"
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Ketik jawaban..."
                                className="w-full px-2 py-1.5 bg-stone-900/70 border border-stone-700/50 rounded-lg text-amber-200 placeholder-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-xs font-mono touch-manipulation"
                                disabled={submitting}
                                maxLength={CONFIG.MAX_INPUT_LENGTH}
                                autoComplete="off"
                              />
                            </div>
                            <motion.div whileTap={{ scale: 0.98 }}>
                              <Button
                                onClick={handleSubmit}
                                disabled={!input.trim() || submitting}
                                className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-900 font-semibold py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs touch-manipulation"
                              >
                                {submitting ? 'Mengirim...' : '✨ Kirim Jawaban'}
                              </Button>
                            </motion.div>

                            {/* ✅ FIX: Hints Accordion - Only show once */}
                            {defuserHintsCipher.length > 0 && (
                              <Accordion type="single" collapsible>
                                <AccordionItem value="hints" className="border-blue-700/40">
                                  <AccordionTrigger className="text-blue-200 text-xs hover:text-blue-300 py-2">
                                    💡 Petunjuk Terselubung
                                  </AccordionTrigger>
                                  <AccordionContent
                                    className="p-2 rounded-lg bg-blue-950/40 overflow-y-auto"
                                    style={{ maxHeight: `${CONFIG.MAX_ACCORDION_HEIGHT}px` }}
                                  >
                                    <ul className="text-xs text-blue-200/90 space-y-1 list-disc pl-3">
                                      {defuserHintsCipher.map((hint, i) => (
                                        <li key={i}>{hint}</li>
                                      ))}
                                    </ul>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* ✅ Expert Panel with Caesar Table */}
                {(isExpert || isHost) && (
                  <motion.div variants={fadeInUp}>
                    <Card className="border-2 border-emerald-700/40 bg-gradient-to-b from-stone-900/80 to-emerald-950/40">
                      <CardHeader className={`pb-2 ${isMobile ? 'p-2' : 'p-3'}`}>
                        <CardTitle className="text-xs text-emerald-300 text-center dungeon-glow-text">📖 Panel Expert</CardTitle>
                      </CardHeader>
                      <CardContent className={isMobile ? 'p-2' : 'p-3'}>
                        <Tabs defaultValue="table" className="w-full">
                          <TabsList className="grid w-full grid-cols-3 bg-stone-900/60 h-7">
                            <TabsTrigger value="table" className="text-xs py-1">
                              🔑 Table
                            </TabsTrigger>
                            <TabsTrigger value="runes" className="text-xs py-1">
                              ✨ Runes
                            </TabsTrigger>
                            <TabsTrigger value="hints" className="text-xs py-1">
                              💡 Hints
                            </TabsTrigger>
                          </TabsList>

                          {/* ✅ NEW: Caesar Table Tab */}
                          <TabsContent value="table" className="mt-2">
                            <div className="overflow-y-auto" style={{ maxHeight: `${CONFIG.MAX_EXPERT_CONTENT_HEIGHT}px` }}>
                              {isCaesarCipher && (
                                <div className="p-2 rounded-lg bg-stone-900/60 border border-stone-700/40">
                                  <h6 className="text-xs text-amber-300 mb-2 font-semibold text-center">
                                    Caesar Cipher Mapping (Shift: {numericShift})
                                  </h6>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-stone-800/80">
                                          <th className="border border-stone-700/60 px-1 py-1 text-amber-200 font-semibold text-[10px]">Plain</th>
                                          {alphabet.map((ch) => (
                                            <th key={ch} className="border border-stone-700/60 px-1 py-1 text-stone-100 font-mono text-[10px]">
                                              {ch}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="bg-stone-900/80">
                                          <td className="border border-stone-700/60 px-1 py-1 text-amber-200 font-semibold text-[10px]">Cipher</td>
                                          {rotated.map((ch, idx) => (
                                            <td key={idx} className="border border-stone-700/60 px-1 py-1 text-amber-300 font-mono text-[10px] text-center bg-amber-950/30">
                                              {ch}
                                            </td>
                                          ))}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                  <p className="text-xs text-stone-400 mt-2 text-center italic">
                                    Gunakan tabel untuk decode: Plain → Cipher
                                  </p>
                                </div>
                              )}
                            </div>
                          </TabsContent>

                          {/* Rune Legend Tab */}
                          <TabsContent value="runes" className="mt-2">
                            <div className="overflow-y-auto" style={{ maxHeight: `${CONFIG.MAX_EXPERT_CONTENT_HEIGHT}px` }}>
                              <div className="p-2 rounded-lg bg-stone-900/60 border border-stone-700/40">
                                <h6 className="text-xs text-stone-300 mb-2 font-semibold text-center">Rune Legend</h6>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-stone-800/80">
                                        <th className="border border-stone-700/60 px-2 py-1 text-amber-200">Rune</th>
                                        <th className="border border-stone-700/60 px-2 py-1 text-amber-200">Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {runeLegend.map(({ num, sym }) => (
                                        <tr key={num} className="hover:bg-stone-800/40 transition-colors">
                                          <td className="border border-stone-700/60 px-2 py-1 text-center text-amber-100 font-bold">{sym}</td>
                                          <td className="border border-stone-700/60 px-2 py-1 text-center text-stone-300">{num}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          {/* Hints Tab */}
                          <TabsContent value="hints" className="mt-2">
                            <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-700/40 overflow-y-auto" style={{ maxHeight: `${CONFIG.MAX_EXPERT_CONTENT_HEIGHT}px` }}>
                              <ul className="text-xs text-blue-200/90 space-y-1 list-disc pl-3">
                                <li>Defuser akan melihat shift dalam bentuk rune</li>
                                <li>Bantu mereka decode rune ke angka menggunakan legend</li>
                                <li>Jelaskan konsep Caesar cipher dengan shift</li>
                                <li>Gunakan tabel untuk verifikasi bersama</li>
                              </ul>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            )}

            {/* BUG PUZZLE - Keep existing implementation */}
            {isBugPuzzle && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Defuser Panel */}
                {(isDefuser || isHost) && (
                  <motion.div variants={fadeInUp}>
                    <Card className="border-2 border-red-700/40 bg-gradient-to-b from-stone-900/80 to-red-950/30">
                      <CardHeader className={`pb-2 ${isMobile ? 'p-2' : 'p-3'}`}>
                        <CardTitle className="text-xs text-red-300 text-center dungeon-glow-text">🪓 Panel Defuser</CardTitle>
                      </CardHeader>
                      <CardContent className={`space-y-2 ${isMobile ? 'p-2' : 'p-3'}`}>
                        {Array.isArray(puzzle.defuserView?.codeLines) && (
                          <>
                            <div className="bg-stone-950 rounded-lg p-1 border border-stone-700/60 overflow-y-auto" style={{ maxHeight: `${CONFIG.MAX_CODE_HEIGHT}px` }}>
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
                                      isMobile={isMobile}
                                    />
                                  );
                                })}
                              </pre>
                            </div>

                            {isDefuser && (
                              <>
                                <motion.div whileTap={{ scale: 0.98 }}>
                                  <Button
                                    onClick={handleSubmit}
                                    disabled={foundBugs.length === 0 || submitting}
                                    className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-900 font-semibold py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs touch-manipulation"
                                  >
                                    {submitting ? 'Mengirim...' : `✨ Kirim (${foundBugs.length})`}
                                  </Button>
                                </motion.div>

                                {defuserHintsBug.length > 0 && (
                                  <Accordion type="single" collapsible>
                                    <AccordionItem value="hints" className="border-red-700/40">
                                      <AccordionTrigger className="text-red-200 text-xs hover:text-red-300 py-2">
                                        💡 Petunjuk Terselubung
                                      </AccordionTrigger>
                                      <AccordionContent
                                        className="p-2 rounded-lg bg-red-950/40 overflow-y-auto"
                                        style={{ maxHeight: `${CONFIG.MAX_ACCORDION_HEIGHT}px` }}
                                      >
                                        <ul className="text-xs text-red-200/90 space-y-1 list-disc pl-3">
                                          {defuserHintsBug.map((hint, i) => (
                                            <li key={i}>{hint}</li>
                                          ))}
                                        </ul>
                                      </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Expert Panel */}
                {(isExpert || isHost) && (
                  <motion.div variants={fadeInUp}>
                    <Card className="border-2 border-emerald-700/40 bg-gradient-to-b from-stone-900/80 to-emerald-950/40">
                      <CardHeader className={`pb-2 ${isMobile ? 'p-2' : 'p-3'}`}>
                        <CardTitle className="text-xs text-emerald-300 text-center dungeon-glow-text">📖 Panel Expert</CardTitle>
                      </CardHeader>
                      <CardContent className={isMobile ? 'p-2' : 'p-3'}>
                        <Tabs defaultValue="hints" className="w-full">
                          <TabsList className="grid w-full grid-cols-2 bg-stone-900/60 h-7">
                            <TabsTrigger value="hints" className="text-xs py-1">
                              💡 Petunjuk
                            </TabsTrigger>
                            <TabsTrigger value="guide" className="text-xs py-1">
                              📚 Panduan
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="hints" className="mt-2">
                            <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-700/40 overflow-y-auto" style={{ maxHeight: `${CONFIG.MAX_EXPERT_CONTENT_HEIGHT}px` }}>
                              <ul className="text-xs text-purple-200/90 space-y-1 list-disc pl-3">
                                <li>Pandu defuser untuk trace execution flow</li>
                                <li>Tanyakan tentang edge cases dan boundary conditions</li>
                                <li>Diskusikan variable lifecycle dan scope</li>
                                <li>Bantu identifikasi resource leaks</li>
                              </ul>
                            </div>
                          </TabsContent>

                          <TabsContent value="guide" className="mt-2">
                            <div className="space-y-1 overflow-y-auto" style={{ maxHeight: `${CONFIG.MAX_EXPERT_CONTENT_HEIGHT}px` }}>
                              <div className="p-2 rounded-lg bg-stone-900/60 border border-stone-700/40">
                                <h6 className="text-xs text-emerald-300 font-semibold mb-1">Checklist</h6>
                                <ul className="text-xs text-stone-300 space-y-0.5 list-disc pl-3">
                                  <li>Null/undefined checks</li>
                                  <li>Resource leaks</li>
                                  <li>Index out of bounds</li>
                                  <li>Type mismatches</li>
                                </ul>
                              </div>

                              <div className="p-2 rounded-lg bg-stone-900/60 border border-stone-700/40">
                                <h6 className="text-xs text-amber-300 font-semibold mb-1">Strategi</h6>
                                <ul className="text-xs text-stone-300 space-y-0.5 list-disc pl-3">
                                  <li>Lacak variabel yang berubah</li>
                                  <li>Cari resource leak</li>
                                  <li>Rekursi tanpa base case</li>
                                </ul>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <style>{`
        .dungeon-torch-flicker { display: inline-block; }
        .dungeon-line-glow { box-shadow: 0 0 15px rgba(251, 191, 36, 0.5); }
        .dungeon-glow-text { text-shadow: 0 0 20px rgba(251, 191, 36, 0.6); }
        .overflow-y-auto::-webkit-scrollbar { width: 4px; }
        .overflow-y-auto::-webkit-scrollbar-track { background: rgba(28, 25, 23, 0.5); border-radius: 2px; }
        .overflow-y-auto::-webkit-scrollbar-thumb { background: rgba(180, 83, 9, 0.6); border-radius: 2px; }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: rgba(180, 83, 9, 0.8); }
        .overflow-x-auto::-webkit-scrollbar { height: 4px; }
        .overflow-x-auto::-webkit-scrollbar-track { background: rgba(28, 25, 23, 0.5); border-radius: 2px; }
        .overflow-x-auto::-webkit-scrollbar-thumb { background: rgba(180, 83, 9, 0.6); border-radius: 2px; }
        .touch-manipulation { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        *:focus-visible { outline: 2px solid rgba(251, 191, 36, 0.8); outline-offset: 2px; }
      `}</style>
    </motion.div>
  );
}
