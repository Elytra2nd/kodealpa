import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';

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

  // Obfuscation: sembunyikan angka eksplisit di hint agar lebih samar (mengganti digit dengan simbol rune)
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

  const transformedHints: string[] = useMemo(() => {
    const base = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];
    // Tambah lapisan kerumitan generatif ringan (tanpa menyingkap jawaban)
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
      <div className="min-h-[200px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-red-950 border-2 border-red-700 rounded-xl">
        <p className="text-red-200 font-medium">Data teka-teki tidak tersedia</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Animasi & tema dungeon */}
      <style>{`
        @keyframes torchFlicker { 0%,100%{opacity:1;filter:brightness(1)} 25%{opacity:.85;filter:brightness(1.15)} 50%{opacity:.75;filter:brightness(.95)} 75%{opacity:.9;filter:brightness(1.05)} }
        @keyframes crystalGlow { 0%,100%{box-shadow:0 0 20px rgba(180,83,9,.6),0 0 40px rgba(251,191,36,.25)} 50%{box-shadow:0 0 28px rgba(180,83,9,.8),0 0 60px rgba(251,191,36,.45)} }
        @keyframes runeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
        .crystal-glow { animation: crystalGlow 3s ease-in-out infinite; }
        .rune-float { animation: runeFloat 3.6s ease-in-out infinite; }
      `}</style>

      <Card className="overflow-hidden border-4 border-amber-700 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
        <CardHeader className="relative">
          <div className="absolute top-3 left-3 text-2xl torch-flicker">🔥</div>
          <div className="absolute top-3 right-3 text-2xl torch-flicker">🔥</div>
          <CardTitle className="text-amber-300 text-2xl">{puzzle.title}</CardTitle>
          <CardDescription className="text-stone-300">
            {puzzle.description}
          </CardDescription>
          <div className="pt-2 flex flex-wrap gap-2">
            <Badge className="bg-amber-800 text-amber-100 border-amber-600">🏰 Mode Dungeon</Badge>
            <Badge className="bg-stone-700 text-stone-200 border-stone-600">🧩 Analisis Pola</Badge>
            {role && <Badge className="bg-purple-800 text-purple-100 border-purple-700">🎭 Peran: {role}</Badge>}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tujuan Pembelajaran (opsional) */}
          {Array.isArray(puzzle.learningObjectives) && puzzle.learningObjectives.length > 0 && (
            <div className="p-4 rounded-xl border-2 border-amber-700 bg-gradient-to-r from-stone-800 to-stone-700">
              <h4 className="text-amber-300 font-semibold mb-2">Tujuan Pembelajaran</h4>
              <ul className="text-sm text-stone-200 space-y-1 list-disc pl-5">
                {puzzle.learningObjectives.map((objective: string, i: number) => (
                  <li key={i}>{objective}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* DEFUSER VIEW */}
            {(isDefuser || role === 'host') && (
              <Card className="border-4 border-amber-600 bg-gradient-to-b from-stone-900 to-stone-800">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-300 text-center">🔢 Urutan Pola</CardTitle>
                  <CardDescription className="text-center text-stone-300">Lengkapi urutan berikut</CardDescription>
                </CardHeader>
                <CardContent>
                  {Array.isArray(puzzle.defuserView?.pattern) ? (
                    <div>
                      <div className="flex justify-center items-center flex-wrap gap-3 mb-6">
                        {puzzle.defuserView.pattern.map((item: any, idx: number) => {
                          const kosong = item === '?' || item === null || item === undefined;
                          return (
                            <div
                              key={idx}
                              className={[
                                'w-16 h-16 rounded-xl flex items-center justify-center text-xl font-extrabold',
                                'border-2',
                                kosong
                                  ? 'border-red-600 bg-red-900/40 text-red-200'
                                  : 'border-blue-600 bg-blue-900/40 text-blue-200',
                                'rune-float',
                              ].join(' ')}
                            >
                              {kosong ? '?' : item}
                            </div>
                          );
                        })}
                        {/* Slot pertanyaan tambahan */}
                        <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-extrabold border-2 border-red-600 bg-red-900/40 text-red-200 torch-flicker">
                          ?
                        </div>
                      </div>

                      {isDefuser && (
                        <form onSubmit={handleSubmit} className="space-y-4 text-center">
                          <input
                            type="number"
                            value={jawaban}
                            onChange={(e) => setJawaban(e.target.value)}
                            placeholder="Masukkan angka hilang"
                            className="w-56 h-12 text-center text-lg font-bold bg-stone-900/70 border-2 border-amber-600 rounded-xl text-amber-200 placeholder-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500 crystal-glow"
                            disabled={submitting}
                          />
                          <Button
                            type="submit"
                            disabled={!jawaban.trim() || submitting}
                            className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-bold py-3 rounded-xl"
                          >
                            {submitting ? 'Mengirim...' : 'Kirim Jawaban'}
                          </Button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border-2 border-red-700 bg-gradient-to-r from-red-950 to-stone-900 text-red-200">
                      Data urutan bilangan tidak ditemukan
                    </div>
                  )}

                  {/* Petunjuk untuk Defuser (dibuat lebih rumit/tersamar) */}
                  {isDefuser && transformedHints.length > 0 && (
                    <div className="mt-6 p-4 rounded-xl border-2 border-blue-700 bg-gradient-to-r from-blue-950 to-stone-900">
                      <h5 className="text-blue-200 font-medium mb-2">Petunjuk Terselubung</h5>
                      <ul className="text-sm text-blue-200/90 space-y-1 list-disc pl-5">
                        {transformedHints.map((hint, i) => (
                          <li key={i}>{hint}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* EXPERT VIEW (tanpa jawaban benar) */}
            {(isExpert || role === 'host') && puzzle.expertView && (
              <Card className="border-4 border-emerald-700 bg-gradient-to-b from-stone-900 to-emerald-950">
                <CardHeader>
                  <CardTitle className="text-lg text-emerald-300 text-center">📚 Prinsip Pola</CardTitle>
                  <CardDescription className="text-center text-stone-300">
                    Bimbingan konseptual tanpa membuka solusi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {puzzle.expertView.rule && (
                    <div className="p-4 rounded-xl border-2 border-stone-700 bg-stone-800/60">
                      <h5 className="text-stone-200 font-semibold mb-2">Prinsip Umum</h5>
                      <p className="text-stone-300 italic">
                        “{obfuscateHint(String(puzzle.expertView.rule))}”
                      </p>
                    </div>
                  )}

                  {/* Jawaban benar disembunyikan dari Expert UI */}
                  {puzzle.expertView.category && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-800 text-emerald-100 border-emerald-700">
                        Kategori: {String(puzzle.expertView.category)}
                      </Badge>
                    </div>
                  )}

                  {isExpert && (
                    <div className="p-4 rounded-xl border-2 border-amber-700 bg-gradient-to-r from-amber-900 to-stone-900">
                      <h5 className="text-amber-300 font-medium mb-2">Peran Expert</h5>
                      <ul className="text-sm text-amber-200 space-y-1 list-disc pl-5">
                        <li>Pandu Defuser mengenali pola secara bertahap tanpa menyebutkan angka akhir.</li>
                        <li>Gunakan pertanyaan penuntun dan verifikasi setiap hipotesis sebelum melangkah.</li>
                        <li>Fokus pada transformasi antar-suku (selisih, rasio, atau perubahan bertingkat) tanpa menyebut nilai eksplisit.</li>
                        <li>Sambungkan konsep ke analogi komputasional (iterasi, rekursi, atau state perubahan) secara konseptual.</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tips Analisis Pola (umum) */}
          <Card className="border-4 border-purple-700 bg-gradient-to-br from-stone-900 to-purple-950">
            <CardHeader>
              <CardTitle className="text-purple-300 text-lg">💡 Taktik Analisis Pola</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl border-2 border-amber-700 bg-stone-800/60">
                  <h6 className="text-amber-300 font-semibold mb-2">Untuk Defuser</h6>
                  <ul className="text-stone-200 space-y-1 list-disc pl-5">
                    <li>Telusuri selisih berurutan dan selisih dari selisih untuk menemukan pola turunan.</li>
                    <li>Uji kemungkinan progresi (aritmetika, geometri, berpangkat, atau campuran berjenjang).</li>
                    <li>Perhatikan modul kecil (2, 3, 5) untuk mengendus siklus tersembunyi.</li>
                    <li>Minta Expert memvalidasi arah pendekatan tanpa mengungkap angka akhir.</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl border-2 border-blue-700 bg-stone-800/60">
                  <h6 className="text-blue-300 font-semibold mb-2">Untuk Expert</h6>
                  <ul className="text-stone-200 space-y-1 list-disc pl-5">
                    <li>Mulai dari observasi kualitatif (naik/turun, stabil/berubah) sebelum formalitas numerik.</li>
                    <li>Batasi petunjuk pada bentuk transformasi, bukan nilai; dorong Defuser menyimpulkan sendiri.</li>
                    <li>Gunakan contoh setara yang tidak identik agar tidak membeberkan solusi.</li>
                    <li>Jaga ritme bimbingan: satu hipotesis, satu verifikasi, lalu iterasi.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
