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
  RUNE_FLOAT_DURATION: 3600,
  PATTERN_ENTRANCE_DURATION: 0.6,
  PATTERN_STAGGER: 0.1,
  MAX_INPUT_LENGTH: 20,
} as const;

const RUNE_MAP: Record<string, string> = {
  '0': '◇', '1': '†', '2': '♁', '3': '♆', '4': '♄',
  '5': '♃', '6': '☿', '7': '☼', '8': '◈', '9': '★',
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
  return obfuscateText(`Petuah lorong: ${base}. Jangan ujarkan angka final; temukan bentuk ritusnya dahulu.`);
};

// ============================================
// CUSTOM HOOKS
// ============================================
const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const runeRefs = useRef<(HTMLElement | null)[]>([]);
  const patternRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // Torch flicker animation
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

    // Rune float animation
    runeRefs.current.forEach((rune, index) => {
      if (rune) {
        gsap.to(rune, {
          y: -6,
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

  useEffect(() => {
    // Pattern entrance animation
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

  const setRuneRef = (index: number) => (el: HTMLDivElement | null) => {
    runeRefs.current[index] = el;
  };

  const setPatternRef = (index: number) => (el: HTMLDivElement | null) => {
    patternRefs.current[index] = el;
  };

  return { setTorchRef, setRuneRef, setPatternRef };
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
      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-lg sm:text-xl font-extrabold border shadow-lg transition-all duration-300 hover:scale-110 ${
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
  <Badge className="bg-stone-800 text-amber-100 border border-amber-700/60 dungeon-badge-glow dungeon-rune-float">
    {sym} = {num}
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
  const { setTorchRef, setRuneRef, setPatternRef } = useDungeonAtmosphere();

  const [jawaban, setJawaban] = useState('');

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';
  const isHost = role === 'host';

  const runeLegend = useMemo(
    () => Object.entries(RUNE_MAP).map(([num, sym]) => ({ num, sym })),
    []
  );

  const transformedHints = useMemo(() => {
    const base = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];
    const extra = [
      'Amati selisih yang tidak selalu tetap; terkadang ia berulang dalam siklus kabur.',
      'Jejak perubahan bisa bertumpuk: selisih dari selisih kerap membisikkan pola.',
      'Cermati lonjakan drastis; itu bisa pertanda ritual penggandaan terselubung.',
      'Bila aturan tampak tersembunyi, periksa residu ketika dipecah oleh bilangan kecil.',
    ];
    return [...base, ...extra].map(obfuscateText);
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
    <div className="space-y-4 sm:space-y-6 relative">
      <Card className="overflow-hidden border-2 border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 shadow-2xl dungeon-card-glow">
        <CardHeader className="relative p-4 sm:p-6">
          <div ref={setTorchRef(0)} className="absolute top-3 left-3 text-xl sm:text-2xl dungeon-torch-flicker">
            🔥
          </div>
          <div ref={setTorchRef(1)} className="absolute top-3 right-3 text-xl sm:text-2xl dungeon-torch-flicker">
            🔥
          </div>
          <CardTitle className="text-amber-300 text-xl sm:text-2xl text-center sm:text-left dungeon-glow-text relative z-10">
            {puzzle.title}
          </CardTitle>
          <CardDescription className="text-stone-300 text-sm sm:text-base text-center sm:text-left relative z-10">
            {puzzle.description}
          </CardDescription>
          <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start relative z-10">
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
                Kategori: {String(puzzle.expertView.category)}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {/* FULL-WIDTH: Petuah Lorong */}
          {(isExpert || isHost) && puzzle.expertView?.rule && (
            <Card className="border-2 border-stone-700/40 bg-stone-800/40 backdrop-blur-sm">
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="text-stone-200 text-sm sm:text-base dungeon-glow-text">
                  📜 Petuah Lorong
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <p className="text-stone-300 italic text-xs sm:text-sm leading-relaxed">
                  "{dungeonizeRule(puzzle.expertView.rule)}"
                </p>
              </CardContent>
            </Card>
          )}

          {/* GRID UTAMA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* DEFUSER */}
            {(isDefuser || isHost) && (
              <Card className="h-full border-2 border-amber-600/40 bg-gradient-to-b from-stone-900/70 to-stone-800/40 flex flex-col backdrop-blur-sm dungeon-card-glow-blue">
                <CardHeader className="pb-2 p-3 sm:p-4">
                  <CardTitle className="text-sm sm:text-base text-amber-300 text-center dungeon-glow-text">
                    🔢 Urutan Pola Mistis
                  </CardTitle>
                  <CardDescription className="text-center text-stone-300 text-xs sm:text-sm">
                    Lengkapi urutan berikut untuk membuka segel
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-3 sm:p-4">
                  {Array.isArray(puzzle.defuserView?.pattern) ? (
                    <div>
                      <div className="flex justify-center items-center flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-5">
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
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-lg sm:text-xl font-extrabold border-2 border-red-600 bg-gradient-to-br from-red-900/40 to-red-950/60 text-red-200 dungeon-pulse dungeon-card-glow-red shadow-lg"
                          title="Angka hilang yang harus ditemukan"
                          aria-label="Angka hilang"
                        >
                          ?
                        </div>
                      </div>

                      {isDefuser && (
                        <form onSubmit={handleSubmit} className="space-y-3 text-center">
                          <input
                            type="number"
                            value={jawaban}
                            onChange={handleInputChange}
                            placeholder="Masukkan angka hilang"
                            className="w-full sm:w-56 h-11 text-center text-lg font-bold bg-stone-900/70 border-2 border-amber-600/60 rounded-xl text-amber-200 placeholder-amber-500/50 focus:outline-none focus:ring-4 focus:ring-amber-500 transition-all"
                            disabled={submitting}
                            maxLength={CONFIG.MAX_INPUT_LENGTH}
                            aria-label="Input angka hilang"
                          />
                          <div className="flex justify-between text-xs text-stone-400 px-2">
                            <span>{jawaban.length}/{CONFIG.MAX_INPUT_LENGTH} karakter</span>
                          </div>
                          <Button
                            type="submit"
                            disabled={!jawaban.trim() || submitting}
                            className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-semibold py-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 dungeon-button-glow"
                            aria-label="Kirim jawaban"
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
                        </form>
                      )}

                      {/* Hints Defuser */}
                      {isDefuser && transformedHints.length > 0 && (
                        <Accordion type="single" collapsible className="mt-4">
                          <AccordionItem value="defuser-hints">
                            <AccordionTrigger className="text-blue-200 text-xs sm:text-sm hover:text-blue-300 transition-colors">
                              💡 Petunjuk Terselubung
                            </AccordionTrigger>
                            <AccordionContent className="p-3 rounded-xl border border-blue-700/30 bg-gradient-to-r from-blue-950/40 to-stone-900/30 backdrop-blur-sm">
                              <ul className="text-xs text-blue-200/90 space-y-1.5 list-disc pl-5">
                                {transformedHints.map((hint, i) => (
                                  <li key={i} className="leading-relaxed">
                                    {hint}
                                  </li>
                                ))}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border-2 border-red-700/40 bg-gradient-to-r from-red-950/40 to-stone-900/30 text-red-200 text-center">
                      <p className="text-sm">Data urutan bilangan tidak ditemukan di naskah kuno</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* PANEL EXPERT: melebar 2 kolom */}
            {(isExpert || isHost) && puzzle.expertView && (
              <div className="md:col-span-2">
                <Card className="min-h-[200px] border-2 border-emerald-700/40 bg-gradient-to-b from-stone-900/70 to-emerald-950/40 flex flex-col backdrop-blur-sm dungeon-card-glow-green">
                  <CardHeader className="pb-2 p-3 sm:p-4">
                    <CardTitle className="text-sm sm:text-base text-emerald-300 text-center dungeon-glow-text">
                      📚 Panel Expert - Grimoire Pola
                    </CardTitle>
                    <CardDescription className="text-center text-stone-300 text-xs sm:text-sm">
                      Bimbingan konseptual tanpa membuka solusi final
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 p-3 sm:p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Kolom kiri */}
                      <Accordion type="multiple" className="space-y-2">
                        <AccordionItem value="runes">
                          <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                            ✨ Legenda Simbol Runik (0–9)
                          </AccordionTrigger>
                          <AccordionContent className="p-3 rounded-xl border border-amber-700/40 bg-gradient-to-r from-amber-950/40 to-stone-900/30 backdrop-blur-sm">
                            <p className="text-amber-200/90 text-xs mb-3 leading-relaxed">
                              Pulihkan digit dari rune sebelum menimbang aritmetika, selisih, atau rasio agar tafsir tetap akurat.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {runeLegend.map(({ num, sym }) => (
                                <RuneLegendBadge key={num} num={num} sym={sym} />
                              ))}
                            </div>
                            <ul className="mt-3 text-xs text-amber-200/90 space-y-1.5 list-disc pl-5">
                              <li>Pakai pemetaan ini saat petunjuk menyamarkan digit.</li>
                              <li>Validasi hipotesis pada 2–3 suku terlebih dahulu.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="deteksi">
                          <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                            🔍 Deteksi Pola
                          </AccordionTrigger>
                          <AccordionContent className="p-3 rounded-xl border border-stone-700/40 bg-stone-900/40 backdrop-blur-sm">
                            <ul className="text-xs text-stone-300 space-y-1.5 list-disc pl-5">
                              <li>Selisih konstan → aritmetika; rasio konstan → geometri.</li>
                              <li>Jika tidak konstan, coba selisih tingkat-2 atau pola hibrida.</li>
                              <li>Uji cepat pada beberapa suku berturut-turut.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      {/* Kolom kanan */}
                      <Accordion type="multiple" className="space-y-2">
                        <AccordionItem value="alat-bantu">
                          <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                            🛠️ Alat Bantu
                          </AccordionTrigger>
                          <AccordionContent className="p-3 rounded-xl border border-stone-700/40 bg-stone-900/40 backdrop-blur-sm">
                            <ul className="text-xs text-stone-300 space-y-1.5 list-disc pl-5">
                              <li>Uji modulo kecil (2, 3, 5) untuk deteksi siklus.</li>
                              <li>Lonjakan tajam bisa menandakan penggandaan/pangkat.</li>
                              <li>Validasi dengan suku berikutnya, bukan satu suku.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        {isExpert && (
                          <AccordionItem value="peran-expert">
                            <AccordionTrigger className="text-stone-200 text-xs sm:text-sm hover:text-amber-300 transition-colors">
                              🎭 Peran Expert
                            </AccordionTrigger>
                            <AccordionContent className="p-3 rounded-xl border border-amber-700/40 bg-gradient-to-r from-amber-900/40 to-stone-900/30 backdrop-blur-sm">
                              <ul className="text-xs text-amber-200 space-y-1.5 list-disc pl-5">
                                <li>Pandu Defuser pada bentuk transformasi, bukan angka akhir.</li>
                                <li>Minta hipotesis dan verifikasi pada 2–3 langkah.</li>
                                <li>Jaga ritme bimbingan: amati → analisis → validasi.</li>
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </Accordion>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* FULL-WIDTH: Taktik Analisis Pola */}
          <Card className="border-2 border-purple-700/40 bg-gradient-to-br from-stone-900/70 to-purple-950/40 backdrop-blur-sm dungeon-card-glow-purple">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardTitle className="text-purple-300 text-sm sm:text-base dungeon-glow-text">
                💡 Taktik Analisis Pola Dungeon
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <Accordion type="multiple" className="space-y-2">
                <AccordionItem value="tips-defuser">
                  <AccordionTrigger className="text-amber-300 text-xs sm:text-sm hover:text-amber-400 transition-colors">
                    ⚔️ Untuk Defuser
                  </AccordionTrigger>
                  <AccordionContent className="p-3 rounded-xl border border-amber-700/30 bg-stone-800/40 backdrop-blur-sm">
                    <ul className="text-stone-200 space-y-1.5 list-disc pl-5 text-xs">
                      <li>Telusuri selisih dan selisih tingkat-2 untuk pola turunan.</li>
                      <li>Uji progresi aritmetika vs geometri sebelum hipotesis lanjutan.</li>
                      <li>Periksa modulo kecil untuk siklus tersembunyi.</li>
                      <li>Minta validasi Expert tanpa mengungkap angka akhir.</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tips-expert">
                  <AccordionTrigger className="text-blue-300 text-xs sm:text-sm hover:text-blue-400 transition-colors">
                    📖 Untuk Expert
                  </AccordionTrigger>
                  <AccordionContent className="p-3 rounded-xl border border-blue-700/30 bg-stone-800/40 backdrop-blur-sm">
                    <ul className="text-stone-200 space-y-1.5 list-disc pl-5 text-xs">
                      <li>Mulai observasi kualitatif (naik/turun, konstan/berubah) sebelum hitung.</li>
                      <li>Batasi petunjuk pada bentuk transformasi; biarkan simpulan diambil Defuser.</li>
                      <li>Gunakan contoh sejenis yang tidak identik agar non-spoiler.</li>
                      <li>Iterasi: satu hipotesis → satu verifikasi → lanjut.</li>
                    </ul>
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
        /* Torch Flicker */
        .dungeon-torch-flicker {
          display: inline-block;
        }

        /* Rune Float */
        .dungeon-rune-float {
          display: inline-block;
          animation: runeFloat 3.6s ease-in-out infinite;
        }

        @keyframes runeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        /* Card Glows */
        .dungeon-card-glow {
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.2);
        }

        .dungeon-card-glow-blue {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2);
        }

        .dungeon-card-glow-green {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2);
        }

        .dungeon-card-glow-purple {
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2);
        }

        .dungeon-card-glow-red {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2);
        }

        /* Badge Glow */
        .dungeon-badge-glow {
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
        }

        /* Text Glow */
        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4);
        }

        /* Button Glow */
        .dungeon-button-glow:hover:not(:disabled) {
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.5), 0 0 40px rgba(251, 191, 36, 0.3);
        }

        /* Pulse Animation */
        .dungeon-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .dungeon-card-glow,
          .dungeon-card-glow-blue,
          .dungeon-card-glow-green,
          .dungeon-card-glow-purple,
          .dungeon-card-glow-red {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.3), 0 0 30px rgba(251, 191, 36, 0.15);
          }
        }
      `}</style>
    </div>
  );
}
