import React, { useMemo, useState, useCallback, useRef, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/Components/ui/accordion';
import { gsap } from 'gsap';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  TORCH_FLICKER_INTERVAL: 2200,
  RUNE_FLOAT_DURATION: 3200,
  LINE_HOVER_DURATION: 0.3,
  MAX_INPUT_LENGTH: 200,
} as const;

const RUNE_MAP: Record<string, string> = {
  '0': '◇', '1': '†', '2': '♁', '3': '♆', '4': '♄',
  '5': '♃', '6': '☿', '7': '☼', '8': '◈', '9': '★',
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
  const runeRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // Torch flicker animation
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

    // Rune float animation
    runeRefs.current.forEach((rune, index) => {
      if (rune) {
        gsap.to(rune, {
          y: -4,
          duration: CONFIG.RUNE_FLOAT_DURATION / 1000,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: index * 0.2,
        });
      }
    });

    return () => clearInterval(torchInterval);
  }, []);

  const setTorchRef = (index: number) => (el: HTMLDivElement | null) => {
    torchRefs.current[index] = el;
  };

  const setRuneRef = (index: number) => (el: HTMLDivElement | null) => {
    runeRefs.current[index] = el;
  };

  return { setTorchRef, setRuneRef };
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
  <div className="min-h-[180px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-amber-950 border-2 border-amber-700/60 rounded-xl dungeon-card-glow">
    <p className="text-amber-200 font-medium text-lg">Memuat teka-teki...</p>
  </div>
));

LoadingState.displayName = 'LoadingState';

const ErrorState = memo(() => (
  <div className="min-h-[180px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-red-950 border-2 border-red-700/60 rounded-xl dungeon-card-glow-red">
    <p className="text-red-200 font-medium text-lg">Data teka-teki tidak tersedia</p>
  </div>
));

ErrorState.displayName = 'ErrorState';

const RuneLegendBadge = memo(({ num, sym, index }: { num: string; sym: string; index: number }) => {
  const { setRuneRef } = useDungeonAtmosphere();

  return (
    <div ref={setRuneRef(index)}>
      <Badge className="bg-stone-800 text-amber-100 border border-amber-700/50 dungeon-rune-float dungeon-badge-glow">
        {sym} = {num}
      </Badge>
    </div>
  );
});

RuneLegendBadge.displayName = 'RuneLegendBadge';

const CodeLine = memo(({
  line,
  lineNo,
  isDefuser,
  isActive,
  isChosen,
  onClick
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
        'flex items-center px-2 py-1 rounded transition-all duration-300',
        isDefuser ? 'cursor-pointer' : '',
        isActive ? 'ring-2 ring-amber-400 dungeon-line-glow' : '',
        isChosen ? 'bg-red-900/30 border-l-4 border-red-500' : isDefuser ? 'hover:bg-stone-800/60' : '',
      ].filter(Boolean).join(' ')}
      role={isDefuser ? 'button' : undefined}
      tabIndex={isDefuser ? 0 : undefined}
      aria-pressed={isDefuser ? isChosen : undefined}
      onKeyDown={isDefuser ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <span className="text-stone-500 w-10 text-right mr-4 select-none font-mono text-sm">
        {lineNo}
      </span>
      <code className="text-green-300 font-mono text-sm">{line}</code>
    </div>
  );
});

CodeLine.displayName = 'CodeLine';

const HintSection = memo(({ hints, title, colorScheme }: {
  hints: string[];
  title: string;
  colorScheme: 'blue' | 'purple';
}) => {
  if (hints.length === 0) return null;

  const colors = {
    blue: {
      border: 'border-blue-700/30',
      bg: 'from-blue-950/40 to-stone-900/40',
      text: 'text-blue-200',
    },
    purple: {
      border: 'border-purple-700/30',
      bg: 'from-purple-950/40 to-stone-900/40',
      text: 'text-purple-200',
    },
  };

  const scheme = colors[colorScheme];

  return (
    <div className={`mt-4 p-3 sm:p-4 rounded-lg border ${scheme.border} bg-gradient-to-r ${scheme.bg} dungeon-hint-glow`}>
      <h5 className={`${scheme.text} font-medium mb-2 text-sm sm:text-base dungeon-glow-text`}>
        {title}
      </h5>
      <ul className={`text-xs sm:text-sm ${scheme.text}/90 space-y-1 sm:space-y-2 list-disc pl-5`}>
        {hints.map((hint, i) => (
          <li key={i} className="leading-relaxed">{hint}</li>
        ))}
      </ul>
    </div>
  );
});

HintSection.displayName = 'HintSection';

// ============================================
// MAIN COMPONENT
// ============================================
export default function CodeAnalysisView({ puzzle, role = 'defuser', onSubmitAttempt, submitting }: Props) {
  const { setTorchRef, setRuneRef } = useDungeonAtmosphere();

  // State Management
  const [foundBugs, setFoundBugs] = useState<number[]>([]);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [input, setInput] = useState('');

  // Memoized Values
  const isCipherPuzzle = useMemo(() =>
    !!(puzzle?.defuserView?.cipher || puzzle?.expertView?.cipher_type),
    [puzzle]
  );

  const isBugPuzzle = useMemo(() =>
    !!(puzzle?.expertView?.bugs || puzzle?.defuserView?.codeLines),
    [puzzle]
  );

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';
  const isHost = role === 'host';

  const runeLegend = useMemo(() =>
    Object.entries(RUNE_MAP).map(([num, sym]) => ({ num, sym })),
    []
  );

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
    return digits.map(d => RUNE_MAP[d] ?? d).join('');
  }, [numericShift]);

  const alphabet = useMemo(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), []);

  const rotated = useMemo(() => {
    if (numericShift == null) return alphabet;
    const k = numericShift % 26;
    return alphabet.map((_, i) => alphabet[(i + k) % 26]);
  }, [alphabet, numericShift]);

  const defuserHintsCipher = useMemo(() => {
    if (!isCipherPuzzle) return [];

    const base = Array.isArray(puzzle?.defuserView?.hints)
      ? puzzle.defuserView.hints
      : [];

    const extra = [
      'Cari pola pergeseran yang tidak seragam; ia kadang menyelinap maju-mundur dalam siklus kabur.',
      'Uji pemetaan huruf ke huruf lain, namun waspadai ilusi simetri yang menipu.',
      'Frekuensi simbol bisa membisikkan arah; namun tidak semua desahnya bermakna tunggal.',
      'Jejak aturan bisa bertingkat: transformasi kedua kerap membuka kunci pertama.',
    ];

    return [...base, ...extra].map(obfuscateText);
  }, [isCipherPuzzle, puzzle?.defuserView?.hints]);

  const defuserHintsBug = useMemo(() => {
    if (!isBugPuzzle) return [];

    const base = Array.isArray(puzzle?.defuserView?.hints)
      ? puzzle.defuserView.hints
      : [];

    const extra = [
      'Perhatikan bayangan variabel yang berubah rupa sebelum mencapai altar eksekusi.',
      'Mantra cabang sering menyembunyikan kutukan yang jarang terpanggil, namun fatal saat bangkit.',
      'Jejak impor yang tak tersentuh bisa jadi umpan; fokus pada mantra yang benar-benar memutar roda.',
      'Kebocoran esensi (resource) menguap sunyi; perhatikan ritus yang tak pernah ditutup.',
    ];

    return [...base, ...extra].map(obfuscateText);
  }, [isBugPuzzle, puzzle?.defuserView?.hints]);

  // Handlers
  const handleSubmit = useCallback(() => {
    try {
      if (isCipherPuzzle) {
        const trimmedInput = input.trim().toUpperCase();
        if (!trimmedInput) {
          console.warn('Input kosong, tidak dapat mengirim');
          return;
        }
        onSubmitAttempt(trimmedInput);
        setInput('');
      } else if (isBugPuzzle) {
        if (foundBugs.length === 0) {
          console.warn('Belum ada bug yang dipilih');
          return;
        }
        const bugInput = [...foundBugs].sort((a, b) => a - b).join(',');
        onSubmitAttempt(bugInput);
        setFoundBugs([]);
        setSelectedLine(null);
      }
    } catch (error) {
      console.error('Error saat submit:', error);
      alert('Terjadi kesalahan saat mengirim jawaban. Silakan coba lagi.');
    }
  }, [isCipherPuzzle, isBugPuzzle, input, foundBugs, onSubmitAttempt]);

  const handleLineClick = useCallback((lineNumber: number) => {
    if (!isDefuser || !isBugPuzzle) return;

    try {
      setSelectedLine(lineNumber);
      setFoundBugs((prev) =>
        prev.includes(lineNumber)
          ? prev.filter((n) => n !== lineNumber)
          : [...prev, lineNumber]
      );
    } catch (error) {
      console.error('Error saat memilih baris:', error);
    }
  }, [isDefuser, isBugPuzzle]);

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
    <div className="space-y-4 sm:space-y-6 relative">
      <Card className="overflow-hidden border-2 border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 dungeon-card-glow">
        <CardHeader className="relative p-4 sm:p-6">
          <div ref={setTorchRef(0)} className="absolute top-3 left-3 text-xl sm:text-2xl dungeon-torch-flicker" aria-hidden="true">
            🔥
          </div>
          <div ref={setTorchRef(1)} className="absolute top-3 right-3 text-xl sm:text-2xl dungeon-torch-flicker" aria-hidden="true">
            🔥
          </div>
          <CardTitle className="text-amber-300 text-xl sm:text-2xl text-center sm:text-left dungeon-glow-text">
            {puzzle.title || 'Tantangan Analisis Kode'}
          </CardTitle>
          <CardDescription className="text-stone-300 text-sm sm:text-base text-center sm:text-left">
            {puzzle.description || 'Tuntaskan cobaan di lorong CodeAlpha Dungeon ini.'}
          </CardDescription>

          {/* Info chips untuk expert dan host */}
          {(isExpert || isHost) && puzzle.expertView && (
            <div className="pt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
              <Badge className="bg-stone-800 text-stone-200 border border-stone-700/60 dungeon-badge-glow">
                Jenis: {(cipherType || '—').toUpperCase()}
              </Badge>
              {isCaesarCipher && caesarRuneHint && (
                <Badge className="bg-stone-800 text-amber-200 border border-amber-700/60 dungeon-badge-glow">
                  Pergeseran sigil: {caesarRuneHint}
                </Badge>
              )}
              {puzzle.expertView.category && (
                <Badge className="bg-stone-800 text-stone-200 border border-stone-700/60 dungeon-badge-glow">
                  Kategori: {puzzle.expertView.category}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {/* CIPHER PUZZLE */}
          {isCipherPuzzle && (
            <Card className="border-2 border-blue-700/30 bg-gradient-to-b from-stone-900/60 to-blue-950/40 dungeon-card-glow-blue">
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base text-blue-300 text-center dungeon-glow-text">
                  🔐 Analisis Sandi
                </CardTitle>
                <CardDescription className="text-center text-stone-300 text-xs sm:text-sm">
                  Uraikan naskah yang terkungkung sigil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-3 sm:p-4">
                {/* Naskah terkunci */}
                {(isDefuser || isHost) && puzzle.defuserView?.cipher && (
                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-semibold text-xs sm:text-sm">Naskah Terkunci</h4>
                    <div className="bg-stone-950 rounded-lg p-3 overflow-x-auto border border-stone-700/60 dungeon-code-block">
                      <div className="flex items-center">
                        <span className="text-stone-500 w-8 text-right mr-4 select-none font-mono text-xs sm:text-sm" aria-hidden="true">
                          1
                        </span>
                        <code className="text-green-300 text-sm sm:text-base md:text-lg font-mono break-all">
                          {puzzle.defuserView.cipher}
                        </code>
                      </div>
                    </div>
                  </div>
                )}

                {/* Panel expert */}
                {(isExpert || isHost) && puzzle.expertView && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Kolom kiri */}
                      <Accordion type="multiple" className="space-y-2">
                        <AccordionItem value="dekripsi">
                          <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                            Panduan Dekripsi Langkah
                          </AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                              <li>Deteksi jenis: IoC/n-gram untuk mono vs polialfabetik, lalu pilih teknik yang sesuai.</li>
                              <li>Substitusi/Caesar: gunakan frekuensi dan uji statistik untuk kandidat pergeseran, konfirmasi kata umum.</li>
                              <li>Vigenère: estimasi panjang kunci, pecah kolom per posisi, pecahkan per kolom seperti Caesar.</li>
                              <li>Transposisi: uji columnar/rail fence dan validasi frasa pendek yang wajar.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="penalaran">
                          <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                            Jejak Penalaran
                          </AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                              <li>Mulai dari frekuensi huruf; cocokkan pola bahasa sasaran.</li>
                              <li>Uji hipotesis pada cuplikan kecil; perluas jika koheren.</li>
                              <li>Hentikan sebelum menyebut pemetaan lengkap atau hasil akhir.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        {isCaesarCipher && (
                          <AccordionItem value="caesar-table">
                            <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                              Tabel Caesar (Tanpa Kunci)
                            </AccordionTrigger>
                            <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                              <div className="text-xs text-stone-200/90 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="bg-stone-800 text-amber-200 border border-amber-700/50 dungeon-badge-glow">
                                    Pergeseran sigil: {caesarRuneHint || '◈?'}
                                  </Badge>
                                  <span className="text-stone-400 text-xs">
                                    (gunakan rune sebagai petunjuk arah geser)
                                  </span>
                                </div>
                                <div className="rounded-md border border-stone-700/40 bg-stone-950 p-3 overflow-x-auto">
                                  <div className="text-stone-300 mb-1">Plain:</div>
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {alphabet.map((ch) => (
                                      <Badge
                                        key={`p-${ch}`}
                                        className="bg-stone-800 text-stone-100 border border-stone-700/40"
                                      >
                                        {ch}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="text-stone-300 mb-1">
                                    Cipher (geser sesuai rune):
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {rotated.map((ch) => (
                                      <Badge
                                        key={`c-${ch}`}
                                        className="bg-stone-900 text-stone-300 border border-stone-700/40"
                                      >
                                        {ch}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="text-stone-400 text-xs">
                                  Enkripsi E<sub>K</sub>(x) = (x + K) mod 26,
                                  Dekripsi D<sub>K</sub>(x) = (x - K) mod 26
                                  tanpa menyebut K numerik secara eksplisit.
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}

                        <AccordionItem value="runes">
                          <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                            Legenda Simbol Runik (0–9)
                          </AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <div className="flex flex-wrap gap-2">
                              {runeLegend.map(({ num, sym }, idx) => (
                                <RuneLegendBadge key={num} num={num} sym={sym} index={idx} />
                              ))}
                            </div>
                            <div className="text-xs text-stone-400 mt-2">
                              Pulihkan digit tersembunyi pada petunjuk/parameter uji sebelum menilai pergeseran atau panjang kunci.
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      {/* Kolom kanan */}
                      <Accordion type="multiple" className="space-y-2">
                        <AccordionItem value="deteksi">
                          <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                            Deteksi Jenis
                          </AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                              <li>IoC membantu bedakan mono vs polialfabetik.</li>
                              <li>Pengulangan n-gram mengarah ke panjang kunci (Kasiski).</li>
                              <li>Frekuensi global normal tapi tidak bermakna → curiga transposisi.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="mono">
                          <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                            Substitusi (Mono)
                          </AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                              <li>Mulai dari frekuensi huruf; cocokkan pola umum.</li>
                              <li>Gunakan penilaian statistik untuk kandidat geser.</li>
                              <li>Konfirmasi via digram/trigram & kata pendek.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="vigenere">
                          <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                            Polialfabetik (Vigenère)
                          </AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                              <li>Tebak panjang kunci (Kasiski/IoC) lalu pecah kolom.</li>
                              <li>Pecahkan tiap kolom seperti Caesar.</li>
                              <li>Gabungkan dan cek koherensi.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="transposisi">
                          <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                            Transposisi
                          </AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                              <li>Uji columnar/rail fence secara bertahap.</li>
                              <li>Validasi dengan frasa pendek yang wajar.</li>
                              <li>Jangan ungkap urutan kolom final.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="pantangan">
                          <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                            Pantangan
                          </AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                              <li>Jangan menyebut angka kunci atau kata kunci.</li>
                              <li>Hindari pemetaan lengkap/hasil final.</li>
                              <li>Berikan arah verifikasi bertahap saja.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </div>
                )}

                {/* Input area - defuser only */}
                {isDefuser && (
                  <div className="space-y-3">
                    <label htmlFor="cipher-input" className="block text-xs sm:text-sm font-medium text-blue-200">
                      Masukkan hasil dekripsi
                    </label>
                    <input
                      id="cipher-input"
                      type="text"
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Ketik jawaban..."
                      className="w-full px-3 py-2 bg-stone-900/70 border border-stone-700/50 rounded-lg text-amber-200 placeholder-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm sm:text-base font-mono"
                      disabled={submitting}
                      autoComplete="off"
                      maxLength={CONFIG.MAX_INPUT_LENGTH}
                      aria-label="Input hasil dekripsi"
                    />
                    <div className="flex justify-between text-xs text-stone-400">
                      <span>{input.length}/{CONFIG.MAX_INPUT_LENGTH} karakter</span>
                    </div>
                    <Button
                      onClick={handleSubmit}
                      disabled={!input.trim() || submitting}
                      className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-semibold py-2 sm:py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 dungeon-button-glow"
                      aria-label="Kirim jawaban dekripsi"
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⚙️</span>
                          Mengirim...
                        </span>
                      ) : (
                        'Kirim Jawaban'
                      )}
                    </Button>

                    <HintSection
                      hints={defuserHintsCipher}
                      title="Petunjuk Terselubung"
                      colorScheme="blue"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* BUG PUZZLE */}
          {isBugPuzzle && (
            <Card className="border-2 border-red-700/30 bg-gradient-to-b from-stone-900/60 to-red-950/30 dungeon-card-glow-red">
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base text-red-300 text-center dungeon-glow-text">
                  🪓 Perburuan Bug
                </CardTitle>
                <CardDescription className="text-center text-stone-300 text-xs sm:text-sm">
                  Tandai baris yang terkutuk di naskah
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-3 sm:p-4">
                {/* Code lines */}
                {Array.isArray(puzzle.defuserView?.codeLines) && (isDefuser || isHost) && (
                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-semibold text-xs sm:text-sm">Naskah Ditulis</h4>
                    <div className="bg-stone-950 rounded-lg p-3 overflow-x-auto border border-stone-700/60 dungeon-code-block">
                      <pre className="text-xs sm:text-sm">
                        {puzzle.defuserView.codeLines.map((line, index) => {
                          const lineNo = index + 1;
                          const active = selectedLine === lineNo;
                          const chosen = foundBugs.includes(lineNo);
                          return (
                            <CodeLine
                              key={index}
                              line={line}
                              lineNo={lineNo}
                              isDefuser={isDefuser}
                              isActive={active}
                              isChosen={chosen}
                              onClick={() => handleLineClick(lineNo)}
                            />
                          );
                        })}
                      </pre>
                    </div>
                    {isDefuser && (
                      <p className="text-xs text-stone-400 mt-2">
                        Klik baris untuk menandai bug. Baris terpilih: <span className="text-red-400 font-bold">{foundBugs.length}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Panel expert */}
                {(isExpert || isHost) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Accordion type="multiple" className="space-y-2">
                      <AccordionItem value="arah">
                        <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                          Arah Penelusuran
                        </AccordionTrigger>
                        <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                          <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                            <li>Jejakkan mata pada variabel yang berubah makna di cabang.</li>
                            <li>Carilah ritus yang membuka sumber daya namun lupa menutup.</li>
                            <li>Perhatikan rekursi tanpa totem henti.</li>
                            <li>Uji tipe, batas, dan efek samping.</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="cek">
                        <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                          Daftar Cek Non-Spoiler
                        </AccordionTrigger>
                        <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                          <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                            <li>Null/undefined & alur cabang kompleks.</li>
                            <li>Resource tidak ditutup (file/stream/timeout).</li>
                            <li>Duplikasi logika & penamaan gelap.</li>
                            <li>Tepi: indeks, panjang, konversi tipe.</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <Accordion type="multiple" className="space-y-2">
                      <AccordionItem value="sokratik">
                        <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                          Pertanyaan Pemandu
                        </AccordionTrigger>
                        <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                          <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                            <li>Jika cabang ini tidak berjalan, apa yang tetap aktif?</li>
                            <li>Bagian mana yang bergantung state sebelumnya?</li>
                            <li>Apa yang terjadi pada input ekstrem?</li>
                            <li>Apakah nama fungsi sesuai tujuan?</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="larangan">
                        <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                          Pantangan Mengungkap
                        </AccordionTrigger>
                        <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                          <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                            <li>Jangan sebut nomor baris.</li>
                            <li>Jangan beri patch final.</li>
                            <li>Jangan bocorkan nilai antara.</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}

                {/* Input area - defuser only */}
                {isDefuser && (
                  <div className="space-y-3">
                    <Button
                      onClick={handleSubmit}
                      disabled={foundBugs.length === 0 || submitting}
                      className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-semibold py-2 sm:py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 dungeon-button-glow"
                      aria-label={`Kirim laporan ${foundBugs.length} bug`}
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⚙️</span>
                          Mengirim...
                        </span>
                      ) : (
                        `Kirim Laporan Bug (${foundBugs.length})`
                      )}
                    </Button>

                    <HintSection
                      hints={defuserHintsBug}
                      title="Bisik-bisik Lorong"
                      colorScheme="purple"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* ========================================
          CUSTOM DUNGEON STYLES
          ======================================== */}
      <style>{`
        /* Torch Flicker Animation */
        .dungeon-torch-flicker {
          display: inline-block;
        }

        /* Rune Float Animation */
        .dungeon-rune-float {
          display: inline-block;
        }

        /* Card Glows */
        .dungeon-card-glow {
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.2);
        }

        .dungeon-card-glow-blue {
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.4), 0 0 60px rgba(59, 130, 246, 0.2);
        }

        .dungeon-card-glow-red {
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.4), 0 0 60px rgba(239, 68, 68, 0.2);
        }

        /* Line Glow */
        .dungeon-line-glow {
          box-shadow: 0 0 15px rgba(251, 191, 36, 0.5);
        }

        /* Button Glow */
        .dungeon-button-glow:hover:not(:disabled) {
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.5), 0 0 40px rgba(251, 191, 36, 0.3);
        }

        /* Badge Glow */
        .dungeon-badge-glow {
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
        }

        /* Text Glow */
        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4);
        }

        /* Hint Glow */
        .dungeon-hint-glow {
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
        }

        /* Code Block */
        .dungeon-code-block {
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6));
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .dungeon-card-glow,
          .dungeon-card-glow-blue,
          .dungeon-card-glow-red {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.3), 0 0 30px rgba(251, 191, 36, 0.15);
          }
        }
      `}</style>
    </div>
  );
}
