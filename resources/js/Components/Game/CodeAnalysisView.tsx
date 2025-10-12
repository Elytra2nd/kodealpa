import React, { useMemo, useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/Components/ui/accordion';
import { gsap } from 'gsap';
import { toast } from 'sonner';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  TORCH_FLICKER_INTERVAL: 150,
  LINE_HOVER_DURATION: 0.3,
  MAX_INPUT_LENGTH: 200,
  MAX_CODE_HEIGHT: 420,
  MAX_CODE_HEIGHT_MOBILE: 300,
  MOBILE_BREAKPOINT: 768,
} as const;

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
    const checkMobile = () => setIsMobile(window.innerWidth <= CONFIG.MOBILE_BREAKPOINT);
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
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const setTorchRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    torchRefs.current[index] = el;
  }, []);

  return { setTorchRef };
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
      <p className="text-amber-200 font-medium text-base sm:text-lg">Memuat teka-teki...</p>
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

  const cipherType = puzzle?.expertView?.cipher_type;
  const isCaesarCipher = cipherType === 'caesar';

  const numericShift = useMemo(() => {
    if (!isCaesarCipher || typeof puzzle?.expertView?.shift !== 'number') return null;
    return Math.abs(puzzle.expertView.shift % 26);
  }, [isCaesarCipher, puzzle?.expertView?.shift]);

  const alphabet = useMemo(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), []);

  const rotated = useMemo(() => {
    if (numericShift == null) return alphabet;
    const k = numericShift % 26;
    return alphabet.map((_, i) => alphabet[(i + k) % 26]);
  }, [alphabet, numericShift]);

  const defuserHintsCipher = useMemo(() => {
    if (!isCipherPuzzle) return [];
    const base = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];
    return base;
  }, [isCipherPuzzle, puzzle?.defuserView?.hints]);

  const defuserHintsBug = useMemo(() => {
    if (!isBugPuzzle) return [];
    const base = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];
    return base;
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

  const maxCodeHeight = isMobile ? CONFIG.MAX_CODE_HEIGHT_MOBILE : CONFIG.MAX_CODE_HEIGHT;

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3 w-full mx-auto px-2 sm:px-4">
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
              {puzzle.description || 'Pecahkan teka-teki kode di CodeAlpha Dungeon'}
            </CardDescription>

            {(isExpert || isHost) && puzzle.expertView && (
              <div className="pt-2 flex flex-wrap gap-1 justify-center">
                <Badge className={`bg-stone-800 text-stone-200 border border-stone-700/60 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {(cipherType || 'code').toUpperCase()}
                </Badge>
              </div>
            )}
          </CardHeader>

          <CardContent className={isMobile ? 'p-3 space-y-3' : 'p-4 space-y-3'}>
            {/* CIPHER PUZZLE */}
            {isCipherPuzzle && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                {/* Defuser Panel - 4 cols */}
                {(isDefuser || isHost) && (
                  <motion.div variants={fadeInUp} className="lg:col-span-4">
                    <Card className="border-2 border-blue-700/40 bg-gradient-to-b from-stone-900/80 to-blue-950/40 h-full">
                      <CardHeader className={`pb-2 ${isMobile ? 'p-2' : 'p-3'}`}>
                        <CardTitle className={`${isMobile ? 'text-sm' : 'text-base'} text-blue-300 text-center dungeon-glow-text`}>
                          🔐 Panel Pemain
                        </CardTitle>
                      </CardHeader>
                      <CardContent className={`space-y-3 ${isMobile ? 'p-2' : 'p-3'}`}>
                        {puzzle.defuserView?.cipher && (
                          <div>
                            <h4 className={`text-stone-200 font-semibold ${isMobile ? 'text-xs' : 'text-sm'} mb-1`}>Teks Terenkripsi</h4>
                            <div
                              className="bg-stone-950 rounded-lg p-2 border border-stone-700/60 overflow-y-auto"
                              style={{ maxHeight: `${maxCodeHeight}px`, minHeight: isMobile ? '150px' : '200px' }}
                            >
                              <code className={`text-green-300 ${isMobile ? 'text-xs' : 'text-sm'} font-mono break-all leading-relaxed`}>
                                {puzzle.defuserView.cipher}
                              </code>
                            </div>
                          </div>
                        )}

                        {isDefuser && isCaesarCipher && numericShift != null && (
                          <div className="p-2 rounded-lg bg-amber-900/30 border border-amber-700/50">
                            <div className="flex items-center gap-2">
                              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-amber-200`}>Pergeseran:</span>
                              <Badge className={`bg-amber-800 text-amber-100 ${isMobile ? 'text-sm' : 'text-base'} font-bold`}>
                                {numericShift}
                              </Badge>
                            </div>
                          </div>
                        )}

                        {isDefuser && (
                          <>
                            <div>
                              <label htmlFor="cipher-input" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-blue-200 mb-1`}>
                                Hasil Dekripsi
                              </label>
                              <input
                                ref={inputRef}
                                id="cipher-input"
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Ketik jawaban..."
                                className={`w-full px-2 ${isMobile ? 'py-1.5 text-xs' : 'py-2 text-sm'} bg-stone-900/70 border border-stone-700/50 rounded-lg text-amber-200 placeholder-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono touch-manipulation`}
                                disabled={submitting}
                                maxLength={CONFIG.MAX_INPUT_LENGTH}
                                autoComplete="off"
                              />
                            </div>
                            <motion.div whileTap={{ scale: 0.98 }}>
                              <Button
                                onClick={handleSubmit}
                                disabled={!input.trim() || submitting}
                                className={`w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-900 font-semibold ${isMobile ? 'py-2 text-sm' : 'py-2.5 text-base'} rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation`}
                              >
                                {submitting ? '⚙️ Mengirim...' : '✨ Kirim Jawaban'}
                              </Button>
                            </motion.div>

                            {defuserHintsCipher.length > 0 && (
                              <Accordion type="single" collapsible>
                                <AccordionItem value="hints" className="border-blue-700/40">
                                  <AccordionTrigger className={`text-blue-200 ${isMobile ? 'text-xs' : 'text-sm'} hover:text-blue-300 py-2`}>
                                    💡 Petunjuk
                                  </AccordionTrigger>
                                  <AccordionContent className="p-2 rounded-lg bg-blue-950/40 max-h-[300px] overflow-y-auto">
                                    <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90 space-y-1 list-disc pl-4`}>
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

                {/* Expert Panel - 8 cols, responsive grid inside */}
                {(isExpert || isHost) && (
                  <motion.div variants={fadeInUp} className="lg:col-span-8">
                    <div className="grid grid-cols-1 gap-3 h-full">

                      {/* Tabel Caesar Cipher */}
                      {isCaesarCipher && (
                        <Card className={`${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-emerald-700/50 bg-gradient-to-r from-emerald-950/40 to-stone-900/30`}>
                          <h5 className={`text-emerald-200 font-semibold mb-2 ${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2 text-center justify-center`}>
                            <span>🔑</span>
                            <span>Tabel Caesar Cipher (Geser: {numericShift})</span>
                          </h5>
                          <div className="overflow-x-auto">
                            <table className={`w-full ${isMobile ? 'text-xs' : 'text-sm'} border-collapse`}>
                              <thead>
                                <tr className="bg-stone-800/80">
                                  <th className={`border border-stone-700/60 ${isMobile ? 'px-1 py-1' : 'px-2 py-1'} text-amber-200 font-semibold`}>
                                    Asli
                                  </th>
                                  {alphabet.map((ch) => (
                                    <th key={ch} className={`border border-stone-700/60 ${isMobile ? 'px-0.5 py-1' : 'px-1 py-1'} text-stone-100 font-mono`}>
                                      {ch}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="bg-stone-900/80">
                                  <td className={`border border-stone-700/60 ${isMobile ? 'px-1 py-1' : 'px-2 py-1'} text-amber-200 font-semibold`}>
                                    Enkripsi
                                  </td>
                                  {rotated.map((ch, idx) => (
                                    <td key={idx} className={`border border-stone-700/60 ${isMobile ? 'px-0.5 py-1' : 'px-1 py-1'} text-amber-300 font-mono text-center bg-amber-950/30`}>
                                      {ch}
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-stone-400 mt-2 text-center italic`}>
                            Gunakan tabel untuk decode: Cari huruf enkripsi, lihat huruf asli di atasnya
                          </p>
                        </Card>
                      )}

                      {/* Cara Memecahkan Cipher */}
                      <Card className={`${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-purple-700/50 bg-gradient-to-r from-purple-950/40 to-stone-900/30`}>
                        <h5 className={`text-purple-200 font-semibold mb-2 ${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
                          <span>🧭</span>
                          <span>Cara Membimbing Pemain</span>
                        </h5>
                        <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-purple-200/90 space-y-1.5 list-disc pl-5`}>
                          <li>Jelaskan bahwa setiap huruf digeser sejumlah posisi tertentu</li>
                          <li>Minta mereka menggunakan tabel untuk mencocokkan huruf</li>
                          <li>Bimbing mereka mencoba beberapa huruf pertama sebagai contoh</li>
                          <li>Validasi proses berpikir, bukan langsung memberi jawaban</li>
                        </ul>
                      </Card>

                      {/* Tentang Caesar Cipher */}
                      <Card className={`${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-blue-700/50 bg-gradient-to-r from-blue-950/40 to-stone-900/30`}>
                        <h5 className={`text-blue-200 font-semibold mb-2 ${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
                          <span>📚</span>
                          <span>Tentang Caesar Cipher</span>
                        </h5>
                        <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90 space-y-1.5`}>
                          <p><span className="font-semibold">Caesar Cipher</span> adalah metode enkripsi sederhana yang menggeser setiap huruf dalam alfabet.</p>
                          <p>Contoh: Jika geser = 3, maka A → D, B → E, C → F, dan seterusnya.</p>
                          <p>Untuk dekripsi, geser ke arah sebaliknya: D → A, E → B, F → C.</p>
                        </div>
                      </Card>

                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* BUG PUZZLE */}
            {isBugPuzzle && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                {/* Defuser Panel - 5 cols */}
                {(isDefuser || isHost) && (
                  <motion.div variants={fadeInUp} className="lg:col-span-5">
                    <Card className="border-2 border-red-700/40 bg-gradient-to-b from-stone-900/80 to-red-950/30 h-full">
                      <CardHeader className={`pb-2 ${isMobile ? 'p-2' : 'p-3'}`}>
                        <CardTitle className={`${isMobile ? 'text-sm' : 'text-base'} text-red-300 text-center dungeon-glow-text`}>
                          🪓 Panel Pemain
                        </CardTitle>
                      </CardHeader>
                      <CardContent className={`space-y-2 ${isMobile ? 'p-2' : 'p-3'}`}>
                        {Array.isArray(puzzle.defuserView?.codeLines) && (
                          <>
                            <div>
                              <h4 className={`text-stone-200 font-semibold ${isMobile ? 'text-xs' : 'text-sm'} mb-1`}>
                                Klik baris yang ada bug
                              </h4>
                              <div className="bg-stone-950 rounded-lg p-1 border border-stone-700/60 overflow-y-auto" style={{ maxHeight: `${maxCodeHeight}px` }}>
                                <pre className={isMobile ? 'text-xs' : 'text-sm'}>
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
                            </div>

                            {isDefuser && (
                              <>
                                <motion.div whileTap={{ scale: 0.98 }}>
                                  <Button
                                    onClick={handleSubmit}
                                    disabled={foundBugs.length === 0 || submitting}
                                    className={`w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-900 font-semibold ${isMobile ? 'py-2 text-sm' : 'py-2.5 text-base'} rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation`}
                                  >
                                    {submitting ? '⚙️ Mengirim...' : `✨ Kirim Bug (${foundBugs.length})`}
                                  </Button>
                                </motion.div>

                                {defuserHintsBug.length > 0 && (
                                  <Accordion type="single" collapsible>
                                    <AccordionItem value="hints" className="border-red-700/40">
                                      <AccordionTrigger className={`text-red-200 ${isMobile ? 'text-xs' : 'text-sm'} hover:text-red-300 py-2`}>
                                        💡 Petunjuk
                                      </AccordionTrigger>
                                      <AccordionContent className="p-2 rounded-lg bg-red-950/40 max-h-[300px] overflow-y-auto">
                                        <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-red-200/90 space-y-1 list-disc pl-4`}>
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

                {/* Expert Panel - 7 cols */}
                {(isExpert || isHost) && (
                  <motion.div variants={fadeInUp} className="lg:col-span-7">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">

                      {/* Cara Membimbing */}
                      <Card className={`${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-emerald-700/50 bg-gradient-to-r from-emerald-950/40 to-stone-900/30`}>
                        <h5 className={`text-emerald-200 font-semibold mb-2 ${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
                          <span>🧭</span>
                          <span>Cara Membimbing</span>
                        </h5>
                        <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-emerald-200/90 space-y-1.5 list-disc pl-5`}>
                          <li>Minta pemain baca kode baris per baris</li>
                          <li>Tanyakan variabel mana yang digunakan tanpa diisi dulu</li>
                          <li>Diskusikan kondisi if/else yang mungkin salah</li>
                          <li>Bimbing untuk trace execution flow</li>
                        </ul>
                      </Card>

                      {/* Checklist Bug Umum */}
                      <Card className={`${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-purple-700/50 bg-gradient-to-r from-purple-950/40 to-stone-900/30`}>
                        <h5 className={`text-purple-200 font-semibold mb-2 ${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
                          <span>📋</span>
                          <span>Checklist Bug Umum</span>
                        </h5>
                        <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-purple-200/90 space-y-1.5 list-disc pl-5`}>
                          <li>Variabel dipakai sebelum diisi nilainya</li>
                          <li>Index array keluar batas (misalnya index negatif)</li>
                          <li>Pembagian dengan nol</li>
                          <li>Kondisi if yang salah (misalnya = bukan ==)</li>
                          <li>Loop yang tidak pernah berhenti</li>
                        </ul>
                      </Card>

                      {/* Tips Debugging */}
                      <Card className={`md:col-span-2 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-blue-700/50 bg-gradient-to-r from-blue-950/40 to-stone-900/30`}>
                        <h5 className={`text-blue-200 font-semibold mb-2 ${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
                          <span>🔍</span>
                          <span>Tips Debugging</span>
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className={`${isMobile ? 'p-2' : 'p-3'} rounded-lg bg-stone-900/50 border border-stone-700/40`}>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-100 font-semibold mb-1`}>
                              1. Baca dengan Teliti
                            </p>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90`}>
                              Jangan skip baris, baca semuanya
                            </p>
                          </div>
                          <div className={`${isMobile ? 'p-2' : 'p-3'} rounded-lg bg-stone-900/50 border border-stone-700/40`}>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-100 font-semibold mb-1`}>
                              2. Trace Eksekusi
                            </p>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90`}>
                              Ikuti alur program dari awal sampai akhir
                            </p>
                          </div>
                          <div className={`${isMobile ? 'p-2' : 'p-3'} rounded-lg bg-stone-900/50 border border-stone-700/40`}>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-100 font-semibold mb-1`}>
                              3. Cek Variabel
                            </p>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90`}>
                              Pastikan semua variabel sudah diisi sebelum dipakai
                            </p>
                          </div>
                          <div className={`${isMobile ? 'p-2' : 'p-3'} rounded-lg bg-stone-900/50 border border-stone-700/40`}>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-100 font-semibold mb-1`}>
                              4. Perhatikan Kondisi
                            </p>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90`}>
                              Cek logika if/else apakah sudah benar
                            </p>
                          </div>
                        </div>
                      </Card>

                    </div>
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

        .overflow-y-auto::-webkit-scrollbar { width: 6px; }
        .overflow-y-auto::-webkit-scrollbar-track { background: rgba(28, 25, 23, 0.5); border-radius: 3px; }
        .overflow-y-auto::-webkit-scrollbar-thumb { background: rgba(180, 83, 9, 0.6); border-radius: 3px; }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: rgba(180, 83, 9, 0.8); }

        .overflow-x-auto::-webkit-scrollbar { height: 6px; }
        .overflow-x-auto::-webkit-scrollbar-track { background: rgba(28, 25, 23, 0.5); border-radius: 3px; }
        .overflow-x-auto::-webkit-scrollbar-thumb { background: rgba(180, 83, 9, 0.6); border-radius: 3px; }

        .touch-manipulation { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        *:focus-visible { outline: 2px solid rgba(251, 191, 36, 0.8); outline-offset: 2px; }
      `}</style>
    </motion.div>
  );
}
