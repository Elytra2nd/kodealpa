import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/Components/ui/accordion';

interface Props {
  puzzle: any;
  role?: 'defuser' | 'expert' | 'host';
  onSubmitAttempt: (input: string) => void;
  submitting: boolean;
}

export default function PatternAnalysisView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const [jawaban, setJawaban] = useState('');

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';

  // Rune map untuk menyamarkan digit pada hint
  const runeMap: Record<string, string> = {
    '0': '◇','1': '†','2': '♁','3': '♆','4': '♄','5': '♃','6': '☿','7': '☼','8': '◈','9': '★',
  };

  const obfuscateHint = (text: string) =>
    text.replace(/\d/g, (d) => runeMap[d] ?? d)
      .replace(/\b(kali|perkalian)\b/gi, 'ritual penggandaan')
      .replace(/\b(tambah|penjumlahan)\b/gi, 'ritus penambahan')
      .replace(/\b(kurang|pengurangan)\b/gi, 'pemotongan runik')
      .replace(/\b(bagi|pembagian)\b/gi, 'pemisahan sigil')
      .replace(/\b(pangkat|eksponen)\b/gi, 'sigil eksponensial');

  // Gaya dungeon untuk rule pola
  const dungeonizeRule = (rule?: string) => {
    const base = rule ? String(rule) : 'Jejak perubahan antar-suku menuntun peziarah angka';
    return obfuscateHint(`Petuah lorong: ${base}. Jangan ujarkan angka final; temukan bentuk ritusnya dahulu.`);
  };

  // Legenda rune untuk panel Expert
  const runeLegend = useMemo(
    () => Object.entries(runeMap).map(([num, sym]) => ({ num, sym })),
    []
  );

  const transformedHints: string[] = useMemo(() => {
    const base = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];
    const extra = [
      'Amati selisih yang tidak selalu tetap; terkadang ia berulang dalam siklus kabur.',
      'Jejak perubahan bisa bertumpuk: selisih dari selisih kerap membisikkan pola.',
      'Cermati lonjakan drastis; itu bisa pertanda ritual penggandaan terselubung.',
      'Bila aturan tampak tersembunyi, periksa residu ketika dipecah oleh bilangan kecil.',
    ];
    return [...base, ...extra].map(obfuscateHint);
  }, [puzzle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jawaban.trim()) return;
    onSubmitAttempt(jawaban.trim());
    setJawaban('');
  };

  if (!puzzle) {
    return (
      <div className="min-h-[200px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-red-950 border border-red-700/60 rounded-xl">
        <p className="text-red-200 font-medium">Data teka-teki tidak tersedia</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Animasi & tema dungeon (ringkas) */}
      <style>{`
        @keyframes torchFlicker { 0%,100%{opacity:1} 25%{opacity:.85} 50%{opacity:.75} 75%{opacity:.9} }
        @keyframes runeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
        .rune-float { animation: runeFloat 3.6s ease-in-out infinite; }
      `}</style>

      <Card className="overflow-hidden border border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
        <CardHeader className="relative">
          <div className="absolute top-3 left-3 text-2xl torch-flicker">🔥</div>
          <div className="absolute top-3 right-3 text-2xl torch-flicker">🔥</div>
          <CardTitle className="text-amber-300 text-2xl">{puzzle.title}</CardTitle>
          <CardDescription className="text-stone-300">{puzzle.description}</CardDescription>
          <div className="pt-2 flex flex-wrap gap-2">
            <Badge className="bg-amber-800 text-amber-100 border border-amber-700/50">🏰 Mode Dungeon</Badge>
            <Badge className="bg-stone-700 text-stone-200 border border-stone-600/50">🧩 Analisis Pola</Badge>
            {role && <Badge className="bg-purple-800 text-purple-100 border border-purple-700/50">🎭 Peran: {role}</Badge>}
            {puzzle?.expertView?.category && (
              <Badge className="bg-emerald-800 text-emerald-100 border border-emerald-700/50">
                Kategori: {String(puzzle.expertView.category)}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* FULL-WIDTH: Petuah Lorong (statis) */}
          {(isExpert || role === 'host') && puzzle.expertView?.rule && (
            <Card className="border border-stone-700/40 bg-stone-800/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-stone-200 text-base">Petuah Lorong</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-stone-300 italic text-sm">
                  “{dungeonizeRule(puzzle.expertView.rule)}”
                </p>
              </CardContent>
            </Card>
          )}

          {/* GRID UTAMA: items-stretch agar sejajar, Panel Expert melebar 2 kolom */}
          <div className="grid md:grid-cols-2 gap-4 items-stretch">
            {/* DEFUSER */}
            {(isDefuser || role === 'host') && (
              <Card className="h-full border border-amber-600/40 bg-gradient-to-b from-stone-900/70 to-stone-800/40 flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-amber-300 text-center">🔢 Urutan Pola</CardTitle>
                  <CardDescription className="text-center text-stone-300">Lengkapi urutan berikut</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  {Array.isArray(puzzle.defuserView?.pattern) ? (
                    <div>
                      <div className="flex justify-center items-center flex-wrap gap-3 mb-5">
                        {puzzle.defuserView.pattern.map((item: any, idx: number) => {
                          const kosong = item === '?' || item == null;
                          return (
                            <div
                              key={idx}
                              className={[
                                'w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-lg sm:text-xl font-extrabold',
                                'border',
                                kosong
                                  ? 'border-red-600/60 bg-red-900/40 text-red-200'
                                  : 'border-blue-600/60 bg-blue-900/40 text-blue-200',
                                'rune-float',
                              ].join(' ')}
                            >
                              {kosong ? '?' : item}
                            </div>
                          );
                        })}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-lg sm:text-xl font-extrabold border border-red-600/60 bg-red-900/40 text-red-200 torch-flicker">
                          ?
                        </div>
                      </div>

                      {isDefuser && (
                        <form onSubmit={handleSubmit} className="space-y-3 text-center">
                          <input
                            type="number"
                            value={jawaban}
                            onChange={(e) => setJawaban(e.target.value)}
                            placeholder="Masukkan angka hilang"
                            className="w-56 h-11 text-center text-lg font-bold bg-stone-900/70 border border-amber-600/60 rounded-xl text-amber-200 placeholder-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500"
                            disabled={submitting}
                          />
                          <Button
                            type="submit"
                            disabled={!jawaban.trim() || submitting}
                            className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-semibold py-2.5 rounded-xl"
                          >
                            {submitting ? 'Mengirim...' : 'Kirim Jawaban'}
                          </Button>
                        </form>
                      )}

                      {/* Hints Defuser (dropdown) */}
                      {isDefuser && transformedHints.length > 0 && (
                        <Accordion type="single" collapsible className="mt-4">
                          <AccordionItem value="defuser-hints">
                            <AccordionTrigger className="text-blue-200 text-sm">Petunjuk Terselubung</AccordionTrigger>
                            <AccordionContent className="p-3 rounded-xl border border-blue-700/30 bg-gradient-to-r from-blue-950/40 to-stone-900/30">
                              <ul className="text-xs text-blue-200/90 space-y-1 list-disc pl-5">
                                {transformedHints.map((hint, i) => (
                                  <li key={i}>{hint}</li>
                                ))}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-red-700/40 bg-gradient-to-r from-red-950/40 to-stone-900/30 text-red-200">
                      Data urutan bilangan tidak ditemukan
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* SPACER agar Panel Expert turun ke baris penuh */}
            <div className="hidden md:block" />

            {/* PANEL EXPERT: melebar 2 kolom dan dipanjangkan */}
            {(isExpert || role === 'host') && puzzle.expertView && (
              <div className="md:col-span-2">
                <Card className="min-h-[200px] border border-emerald-700/40 bg-gradient-to-b from-stone-900/70 to-emerald-950/40 flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-emerald-300 text-center">📚 Panel Expert</CardTitle>
                    <CardDescription className="text-center text-stone-300">
                      Bimbingan konseptual tanpa membuka solusi
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="grid md:grid-cols-2 gap-3">
                      {/* Kolom kiri */}
                      <Accordion type="multiple" className="space-y-2">
                        <AccordionItem value="runes">
                          <AccordionTrigger className="text-stone-200 text-sm">Legenda Simbol Runik (0–9)</AccordionTrigger>
                          <AccordionContent className="p-3 rounded-xl border border-amber-700/40 bg-gradient-to-r from-amber-950/40 to-stone-900/30">
                            <p className="text-amber-200/90 text-xs mb-2">
                              Pulihkan digit dari rune sebelum menimbang aritmetika, selisih, atau rasio agar tafsir tetap akurat.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {runeLegend.map(({ num, sym }) => (
                                <Badge key={num} className="bg-stone-800 text-amber-100 border border-amber-700/60">
                                  {sym} = {num}
                                </Badge>
                              ))}
                            </div>
                            <ul className="mt-3 text-xs text-amber-200/90 space-y-1 list-disc pl-5">
                              <li>Pakai pemetaan ini saat petunjuk menyamarkan digit.</li>
                              <li>Validasi hipotesis pada 2–3 suku terlebih dahulu.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="deteksi">
                          <AccordionTrigger className="text-stone-200 text-sm">Deteksi Pola</AccordionTrigger>
                          <AccordionContent className="p-3 rounded-xl border border-stone-700/40 bg-stone-900/40">
                            <ul className="text-xs text-stone-300 space-y-1 list-disc pl-5">
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
                          <AccordionTrigger className="text-stone-200 text-sm">Alat Bantu</AccordionTrigger>
                          <AccordionContent className="p-3 rounded-xl border border-stone-700/40 bg-stone-900/40">
                            <ul className="text-xs text-stone-300 space-y-1 list-disc pl-5">
                              <li>Uji modulo kecil (2, 3, 5) untuk deteksi siklus.</li>
                              <li>Lonjakan tajam bisa menandakan penggandaan/pangkat.</li>
                              <li>Validasi dengan suku berikutnya, bukan satu suku.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        {isExpert && (
                          <AccordionItem value="peran-expert">
                            <AccordionTrigger className="text-stone-200 text-sm">Peran Expert</AccordionTrigger>
                            <AccordionContent className="p-3 rounded-xl border border-amber-700/40 bg-gradient-to-r from-amber-900/40 to-stone-900/30">
                              <ul className="text-xs text-amber-200 space-y-1 list-disc pl-5">
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
          <Card className="border border-purple-700/40 bg-gradient-to-br from-stone-900/70 to-purple-950/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-purple-300 text-base">💡 Taktik Analisis Pola</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                <AccordionItem value="tips-defuser">
                  <AccordionTrigger className="text-amber-300 text-sm">Untuk Defuser</AccordionTrigger>
                  <AccordionContent className="p-3 rounded-xl border border-amber-700/30 bg-stone-800/40">
                    <ul className="text-stone-200 space-y-1 list-disc pl-5 text-xs">
                      <li>Telusuri selisih dan selisih tingkat-2 untuk pola turunan.</li>
                      <li>Uji progresi aritmetika vs geometri sebelum hipotesis lanjutan.</li>
                      <li>Periksa modulo kecil untuk siklus tersembunyi.</li>
                      <li>Minta validasi Expert tanpa mengungkap angka akhir.</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tips-expert">
                  <AccordionTrigger className="text-blue-300 text-sm">Untuk Expert</AccordionTrigger>
                  <AccordionContent className="p-3 rounded-xl border border-blue-700/30 bg-stone-800/40">
                    <ul className="text-stone-200 space-y-1 list-disc pl-5 text-xs">
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
    </div>
  );
}
