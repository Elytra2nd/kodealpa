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
  PATTERN_ENTRANCE_DURATION: 0.6,
  PATTERN_STAGGER: 0.08,
  MAX_INPUT_LENGTH: 20,
  PATTERN_DISPLAY_MIN_HEIGHT: 200,
  MOBILE_BREAKPOINT: 768,
} as const;



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
  const patternRefs = useRef<(HTMLElement | null)[]>([]);
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



  useEffect(() => {
    const validPatterns = patternRefs.current.filter((p): p is HTMLElement => p !== null);
    if (validPatterns.length > 0) {
      gsap.fromTo(
        validPatterns,
        { opacity: 0, scale: 0.5, rotateY: 180 },
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
  });



  const setTorchRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    torchRefs.current[index] = el;
  }, []);



  const setPatternRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    patternRefs.current[index] = el;
  }, []);



  return { setTorchRef, setPatternRef };
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
const PatternBox = memo(
  ({
    item,
    index,
    isEmpty,
    setPatternRef,
    isMobile,
  }: {
    item: any;
    index: number;
    isEmpty: boolean;
    setPatternRef: (index: number) => (el: HTMLDivElement | null) => void;
    isMobile: boolean;
  }) => (
    <motion.div
      ref={setPatternRef(index)}
      variants={fadeInUp}
      whileHover={{ scale: 1.1, rotate: isEmpty ? [0, -5, 5, 0] : 0 }}
      whileTap={{ scale: 0.95 }}
      className={`${
        isMobile ? 'w-12 h-12 text-lg' : 'w-14 h-14 sm:w-16 sm:h-16 text-xl sm:text-2xl'
      } flex-shrink-0 rounded-xl flex items-center justify-center font-extrabold border-2 shadow-lg transition-all duration-300 cursor-default ${
        isEmpty
          ? 'border-red-600/60 bg-gradient-to-br from-red-900/40 to-red-950/60 text-red-200 dungeon-pulse dungeon-card-glow-red'
          : 'border-blue-600/60 bg-gradient-to-br from-blue-900/40 to-blue-950/60 text-blue-200 dungeon-card-glow-blue'
      }`}
      title={isEmpty ? 'Angka yang hilang' : `Angka ke-${index + 1}: ${item}`}
      aria-label={isEmpty ? 'Angka yang hilang' : `Angka ${item}`}
    >
      {isEmpty ? '?' : item}
    </motion.div>
  )
);



PatternBox.displayName = 'PatternBox';



const LoadingState = memo(() => (
  <motion.div variants={scaleIn} initial="initial" animate="animate">
    <Card className="min-h-[200px] flex items-center justify-center border-4 border-red-600 bg-gradient-to-br from-stone-900 to-red-950 dungeon-card-glow-red">
      <CardContent className="text-center p-6">
        <motion.div
          className="text-5xl mb-4"
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          aria-hidden="true"
        >
          ⚠️
        </motion.div>
        <p className="text-red-200 font-medium text-base sm:text-lg">Data teka-teki tidak tersedia</p>
      </CardContent>
    </Card>
  </motion.div>
));



LoadingState.displayName = 'LoadingState';



// ============================================
// MAIN COMPONENT
// ============================================
export default function PatternAnalysisView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const isMobile = useIsMobile();
  const { setTorchRef, setPatternRef } = useDungeonAtmosphere();



  const [jawaban, setJawaban] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);



  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const isDefuser = useMemo(() => role === 'defuser', [role]);
  const isExpert = useMemo(() => role === 'expert', [role]);
  const isHost = useMemo(() => role === 'host', [role]);



  const transformedHints = useMemo<string[]>(() => {
    const base = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];
    return base;
  }, [puzzle]);



  const patternData = useMemo(() => {
    if (!Array.isArray(puzzle?.defuserView?.pattern)) return [];
    return puzzle.defuserView.pattern;
  }, [puzzle?.defuserView?.pattern]);



  // ============================================
  // CALLBACKS
  // ============================================
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = jawaban.trim();



      if (!trimmed) {
        toast.error('Mohon masukkan angka');
        return;
      }



      if (isNaN(Number(trimmed))) {
        toast.error('Input harus berupa angka');
        return;
      }



      onSubmitAttempt(trimmed);
      setJawaban('');
      toast.info('Jawaban dikirim');
    },
    [jawaban, onSubmitAttempt]
  );



  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= CONFIG.MAX_INPUT_LENGTH) {
      setJawaban(value);
    }
  }, []);



  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (!isMobile && inputRef.current && isDefuser) {
      inputRef.current.focus();
    }
  }, [isMobile, isDefuser]);



  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !submitting && jawaban.trim() && isDefuser) {
        handleSubmit(e as any);
      }
    };



    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleSubmit, submitting, jawaban, isDefuser]);



  // ============================================
  // RENDER CONDITIONS
  // ============================================
  if (!puzzle) {
    return <LoadingState />;
  }



  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4 relative w-full mx-auto px-2 sm:px-4">
      <motion.div variants={fadeInUp}>
        <Card className="overflow-hidden border-2 sm:border-4 border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 shadow-2xl dungeon-card-glow">
          <CardHeader className={`relative ${isMobile ? 'p-3' : 'p-4 sm:p-6'}`}>
            <div ref={setTorchRef(0)} className={`absolute ${isMobile ? 'top-2 left-2 text-xl' : 'top-3 left-3 text-xl sm:text-2xl'} dungeon-torch-flicker`}>
              🔥
            </div>
            <div ref={setTorchRef(1)} className={`absolute ${isMobile ? 'top-2 right-2 text-xl' : 'top-3 right-3 text-xl sm:text-2xl'} dungeon-torch-flicker`}>
              🔥
            </div>
            <CardTitle className={`text-amber-300 ${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'} text-center dungeon-glow-text relative z-10`}>
              {puzzle.title || 'Teka-teki Pola Angka'}
            </CardTitle>
            <CardDescription className={`text-stone-300 ${isMobile ? 'text-xs' : 'text-sm'} text-center relative z-10`}>
              {puzzle.description || 'Temukan pola dalam urutan angka'}
            </CardDescription>
            <div className="pt-2 flex flex-wrap gap-2 justify-center relative z-10">
              <Badge className={`bg-amber-800 text-amber-100 border border-amber-700/50 dungeon-badge-glow ${isMobile ? 'text-xs' : 'text-sm'}`}>
                🏰 Mode Dungeon
              </Badge>
              <Badge className={`bg-stone-700 text-stone-200 border border-stone-600/50 dungeon-badge-glow ${isMobile ? 'text-xs' : 'text-sm'}`}>
                🧩 Analisis Pola
              </Badge>
              {role && (
                <Badge className={`bg-purple-800 text-purple-100 border border-purple-700/50 dungeon-badge-glow ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  🎭 {role}
                </Badge>
              )}
              {puzzle?.expertView?.category && (
                <Badge className={`bg-emerald-800 text-emerald-100 border border-emerald-700/50 dungeon-badge-glow ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  🎯 {String(puzzle.expertView.category)}
                </Badge>
              )}
            </div>
          </CardHeader>



          <CardContent className={`space-y-4 ${isMobile ? 'p-3' : 'p-4 sm:p-6'}`}>
            {/* Rule hint for expert/host */}
            {(isExpert || isHost) && puzzle.expertView?.rule && (
              <motion.div variants={fadeInUp}>
                <Card className="border border-stone-700/40 bg-stone-800/40 backdrop-blur-sm">
                  <CardContent className={`${isMobile ? 'p-2' : 'p-3'}`}>
                    <p className={`text-stone-300 ${isMobile ? 'text-xs' : 'text-sm'} leading-relaxed text-center`}>
                      💡 Petunjuk: {puzzle.expertView.rule}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}



            {/* RESPONSIVE GRID LAYOUT - ✅ PERLEBAR PANEL PEMAIN */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">



              {/* DEFUSER PANEL - ✅ 6 cols (lebih lebar dari 4) */}
              <AnimatePresence>
                {(isDefuser || isHost) && (
                  <motion.div key="defuser-panel" variants={fadeInUp} initial="initial" animate="animate" exit="exit" className="lg:col-span-6">
                    <Card className="border-2 border-amber-600/40 bg-gradient-to-b from-stone-900/80 to-stone-800/40 backdrop-blur-sm dungeon-card-glow-blue h-full">
                      <CardHeader className={`pb-2 ${isMobile ? 'p-2' : 'p-3'}`}>
                        <CardTitle className={`${isMobile ? 'text-sm' : 'text-base'} text-amber-300 text-center dungeon-glow-text`}>
                          🔢 Panel Pemain
                        </CardTitle>
                      </CardHeader>
                      <CardContent className={`space-y-3 ${isMobile ? 'p-2' : 'p-3'}`}>
                        {patternData.length > 0 ? (
                          <>
                            {/* ✅ Pattern boxes - HORIZONTAL LAYOUT dengan flex-nowrap */}
                            <motion.div
                              variants={staggerContainer}
                              className="flex items-center justify-start mb-4 overflow-x-auto"
                              style={{ minHeight: `${CONFIG.PATTERN_DISPLAY_MIN_HEIGHT}px` }}
                            >
                              <div className="flex flex-row flex-nowrap gap-2 sm:gap-3 items-center">
                                {patternData.map((item: any, idx: number) => {
                                  const kosong = item === '?' || item == null;
                                  return <PatternBox key={idx} item={item} index={idx} isEmpty={kosong} setPatternRef={setPatternRef} isMobile={isMobile} />;
                                })}
                                {/* ✅ Tambahkan box kosong untuk jawaban */}
                                <PatternBox item="?" index={patternData.length} isEmpty={true} setPatternRef={setPatternRef} isMobile={isMobile} />
                              </div>
                            </motion.div>



                            {/* Input form */}
                            {isDefuser && (
                              <motion.form onSubmit={handleSubmit} variants={fadeInUp} className="space-y-3">
                                <div className="flex justify-center">
                                  <input
                                    ref={inputRef}
                                    type="number"
                                    inputMode="numeric"
                                    value={jawaban}
                                    onChange={handleInputChange}
                                    placeholder="Masukkan angka..."
                                    className={`w-full max-w-xs ${
                                      isMobile ? 'h-10 text-base' : 'h-11 text-lg'
                                    } text-center font-bold bg-stone-900/70 border-2 border-amber-600/60 rounded-xl text-amber-200 placeholder-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all touch-manipulation`}
                                    disabled={submitting}
                                    maxLength={CONFIG.MAX_INPUT_LENGTH}
                                    autoComplete="off"
                                    aria-label="Input jawaban"
                                  />
                                </div>
                                <motion.div whileTap={{ scale: 0.98 }}>
                                  <Button
                                    type="submit"
                                    disabled={!jawaban.trim() || submitting}
                                    className={`w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-900 font-semibold ${
                                      isMobile ? 'py-2 text-sm' : 'py-2.5 text-base'
                                    } rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation`}
                                    aria-busy={submitting}
                                  >
                                    {submitting ? (
                                      <span className="flex items-center justify-center gap-2">
                                        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} aria-hidden="true">
                                          ⚙️
                                        </motion.span>
                                        <span>Mengirim...</span>
                                      </span>
                                    ) : (
                                      <span className="flex items-center justify-center gap-2">
                                        <span aria-hidden="true">✨</span>
                                        <span>Kirim Jawaban</span>
                                      </span>
                                    )}
                                  </Button>
                                </motion.div>



                                {/* Hints */}
                                {transformedHints.length > 0 && (
                                  <Accordion type="single" collapsible>
                                    <AccordionItem value="hints" className="border-blue-700/40">
                                      <AccordionTrigger className={`text-blue-200 ${isMobile ? 'text-xs' : 'text-sm'} hover:text-blue-300 py-2`}>
                                        💡 Petunjuk
                                      </AccordionTrigger>
                                      <AccordionContent className="p-2 rounded-lg bg-blue-950/40 max-h-[300px] overflow-y-auto">
                                        <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90 space-y-1.5 list-disc pl-4`}>
                                          {transformedHints.map((hint, i: number) => (
                                            <li key={i}>{hint}</li>
                                          ))}
                                        </ul>
                                      </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                )}
                              </motion.form>
                            )}
                          </>
                        ) : (
                          <div className={`p-3 rounded-xl border border-red-700/40 bg-red-950/40 text-red-200 text-center ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            ⚠️ Data urutan tidak ditemukan
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>



              {/* EXPERT PANEL - ✅ 6 cols (dikurangi dari 8) */}
              <AnimatePresence>
                {(isExpert || isHost) && puzzle.expertView && (
                  <motion.div key="expert-panel" variants={fadeInUp} initial="initial" animate="animate" exit="exit" className="lg:col-span-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">



                      {/* Cara Mendeteksi Pola */}
                      <Card className={`${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-emerald-700/50 bg-gradient-to-r from-emerald-950/40 to-stone-900/30`}>
                        <h5 className={`text-emerald-200 font-semibold mb-2 ${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
                          <span>🔍</span>
                          <span>Cara Mendeteksi Pola</span>
                        </h5>
                        <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-emerald-200/90 space-y-1.5 list-disc pl-5`}>
                          <li>Hitung selisih antar angka berurutan</li>
                          <li>Jika selisih sama → pola tambah/kurang</li>
                          <li>Jika rasio sama → pola kali/bagi</li>
                          <li>Coba lihat pola kuadrat (1, 4, 9, 16...)</li>
                        </ul>
                      </Card>



                      {/* Cara Membimbing */}
                      <Card className={`${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-purple-700/50 bg-gradient-to-r from-purple-950/40 to-stone-900/30`}>
                        <h5 className={`text-purple-200 font-semibold mb-2 ${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
                          <span>🧭</span>
                          <span>Cara Membimbing Pemain</span>
                        </h5>
                        <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-purple-200/90 space-y-1.5 list-disc pl-5`}>
                          <li>Tanyakan apa yang mereka lihat terlebih dahulu</li>
                          <li>Beri petunjuk bertahap, jangan langsung jawaban</li>
                          <li>Minta mereka uji hipotesis pada 2-3 angka</li>
                          <li>Validasi cara berpikir, bukan hasil akhir</li>
                        </ul>
                      </Card>



                      {/* Jenis-jenis Pola */}
                      <Card className={`md:col-span-2 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-blue-700/50 bg-gradient-to-r from-blue-950/40 to-stone-900/30`}>
                        <h5 className={`text-blue-200 font-semibold mb-3 ${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
                          <span>📚</span>
                          <span>Jenis-jenis Pola Angka</span>
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className={`${isMobile ? 'p-2' : 'p-3'} rounded-lg bg-stone-900/50 border border-stone-700/40`}>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-100 font-semibold mb-1`}>Pola Tambah</p>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90`}>Contoh: 2, 4, 6, 8 (tambah 2)</p>
                          </div>
                          <div className={`${isMobile ? 'p-2' : 'p-3'} rounded-lg bg-stone-900/50 border border-stone-700/40`}>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-100 font-semibold mb-1`}>Pola Kali</p>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90`}>Contoh: 2, 6, 18, 54 (kali 3)</p>
                          </div>
                          <div className={`${isMobile ? 'p-2' : 'p-3'} rounded-lg bg-stone-900/50 border border-stone-700/40`}>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-100 font-semibold mb-1`}>Pola Kuadrat</p>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90`}>Contoh: 1, 4, 9, 16 (1², 2², 3², 4²)</p>
                          </div>
                          <div className={`${isMobile ? 'p-2' : 'p-3'} rounded-lg bg-stone-900/50 border border-stone-700/40`}>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-100 font-semibold mb-1`}>Pola Fibonacci</p>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90`}>Contoh: 1, 1, 2, 3, 5 (jumlah 2 angka sebelumnya)</p>
                          </div>
                        </div>
                      </Card>



                      {/* Alat Bantu */}
                      <Card className={`md:col-span-2 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-teal-700/50 bg-gradient-to-r from-teal-950/40 to-stone-900/30`}>
                        <h5 className={`text-teal-200 font-semibold mb-2 ${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
                          <span>🛠️</span>
                          <span>Alat Bantu Analisis</span>
                        </h5>
                        <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-teal-200/90 space-y-1.5 list-disc pl-5`}>
                          <li>Untuk pola tambah/kurang: hitung selisih setiap pasangan angka</li>
                          <li>Untuk pola kali/bagi: bagi angka dengan angka sebelumnya</li>
                          <li>Untuk pola kuadrat: coba akar kuadrat dari setiap angka</li>
                          <li>Jika lonjakan tajam: kemungkinan pola pangkat atau kali</li>
                        </ul>
                      </Card>



                    </div>
                  </motion.div>
                )}
              </AnimatePresence>



            </div>



            {/* Tips Kolaborasi */}
            <motion.div variants={fadeInUp}>
              <Card className="border border-purple-700/40 bg-purple-950/20 backdrop-blur-sm">
                <CardContent className={isMobile ? 'p-3' : 'p-4'}>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="tips" className="border-purple-700/40">
                      <AccordionTrigger className={`text-purple-300 ${isMobile ? 'text-xs' : 'text-sm'} hover:text-purple-400 py-2`}>
                        🤝 Tips Kerjasama
                      </AccordionTrigger>
                      <AccordionContent className={`p-2 ${isMobile ? 'text-xs' : 'text-sm'} text-stone-300 space-y-2`}>
                        <div>
                          <span className="font-semibold text-amber-300">Pemain:</span> Coba hitung selisih atau rasio antar angka, minta validasi dari Expert tanpa minta jawaban langsung
                        </div>
                        <div>
                          <span className="font-semibold text-blue-300">Expert:</span> Mulai dengan pertanyaan terbuka, fokus pada cara berpikir bukan hasil akhir
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>



      {/* Styles */}
      <style>{`
        .dungeon-torch-flicker { display: inline-block; }
        .dungeon-card-glow { box-shadow: 0 0 30px rgba(251, 191, 36, 0.4); }
        .dungeon-card-glow-blue { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
        .dungeon-card-glow-green { box-shadow: 0 0 20px rgba(34, 197, 94, 0.4); }
        .dungeon-card-glow-red { box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); }
        .dungeon-badge-glow { filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4)); }
        .dungeon-glow-text { text-shadow: 0 0 20px rgba(251, 191, 36, 0.6); }
        .dungeon-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }



        .overflow-y-auto::-webkit-scrollbar, .overflow-x-auto::-webkit-scrollbar { width: 6px; height: 6px; }
        .overflow-y-auto::-webkit-scrollbar-track, .overflow-x-auto::-webkit-scrollbar-track { background: rgba(28, 25, 23, 0.5); border-radius: 3px; }
        .overflow-y-auto::-webkit-scrollbar-thumb, .overflow-x-auto::-webkit-scrollbar-thumb { background: rgba(180, 83, 9, 0.6); border-radius: 3px; }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover, .overflow-x-auto::-webkit-scrollbar-thumb:hover { background: rgba(180, 83, 9, 0.8); }



        .touch-manipulation { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        *:focus-visible { outline: 2px solid rgba(251, 191, 36, 0.8); outline-offset: 2px; }



        @media (max-width: 768px) {
          .dungeon-card-glow, .dungeon-card-glow-blue, .dungeon-card-glow-green, .dungeon-card-glow-red {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
          }
        }
      `}</style>
    </motion.div>
  );
}
