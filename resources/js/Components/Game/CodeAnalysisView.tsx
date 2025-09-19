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

export default function CodeAnalysisView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const [foundBugs, setFoundBugs] = useState<number[]>([]);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [input, setInput] = useState('');

  const isCipherPuzzle = !!(puzzle?.defuserView?.cipher || puzzle?.expertView?.cipher_type);
  const isBugPuzzle = !!(puzzle?.expertView?.bugs || puzzle?.defuserView?.codeLines);
  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';

  // Obfuscation untuk petunjuk agar lebih samar
  const runeMap: Record<string, string> = {
    '0': '◇','1': '†','2': '♁','3': '♆','4': '♄','5': '♃','6': '☿','7': '☼','8': '◈','9': '★',
  };
  const obfuscate = (t: string) =>
    String(t)
      .replace(/\d/g, (d) => runeMap[d] ?? d)
      .replace(/\b(shift|geser)\b/gi, 'pergeseran sigil')
      .replace(/\b(kunci|key)\b/gi, 'cipher rune')
      .replace(/\b(tambah|penjumlahan)\b/gi, 'ritus penambahan')
      .replace(/\b(kurang|pengurangan)\b/gi, 'pemotongan runik')
      .replace(/\b(kali|perkalian)\b/gi, 'ritual penggandaan')
      .replace(/\b(bagi|pembagian)\b/gi, 'pemisahan sigil')
      .replace(/\b(pangkat|eksponen)\b/gi, 'sigil eksponensial');

  const defuserHintsCipher: string[] = useMemo(() => {
    const base: string[] = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];
    const extra: string[] = [
      'Cari pola pergeseran yang tidak seragam; ia kadang menyelinap maju-mundur dalam siklus kabur.',
      'Uji pemetaan huruf ke huruf lain, namun waspadai ilusi simetri yang menipu.',
      'Frekuensi simbol bisa membisikkan arah; namun tidak semua desahnya bermakna tunggal.',
      'Jejak aturan bisa bertingkat: transformasi kedua kerap membuka kunci pertama.',
    ];
    return [...base, ...extra].map(obfuscate);
  }, [puzzle]);

  const defuserHintsBug: string[] = useMemo(() => {
    const base: string[] = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];
    const extra: string[] = [
      'Perhatikan bayangan variabel yang berubah rupa sebelum mencapai altar eksekusi.',
      'Mantra cabang sering menyembunyikan kutukan yang jarang terpanggil, namun fatal saat bangkit.',
      'Jejak impor yang tak tersentuh bisa jadi umpan; fokus pada mantra yang benar-benar memutar roda.',
      'Kebocoran esensi (resource) menguap sunyi; perhatikan ritus yang tak pernah ditutup.',
    ];
    return [...base, ...extra].map(obfuscate);
  }, [puzzle]);

  const handleSubmit = () => {
    if (isCipherPuzzle) {
      if (!input.trim()) return;
      onSubmitAttempt(input.trim().toUpperCase());
      setInput('');
    } else if (isBugPuzzle) {
      if (foundBugs.length === 0) return;
      const bugInput = [...foundBugs].sort((a, b) => a - b).join(',');
      onSubmitAttempt(bugInput);
      setFoundBugs([]);
      setSelectedLine(null);
    }
  };

  const handleLineClick = (lineNumber: number) => {
    if (role !== 'defuser' || !isBugPuzzle) return;
    setSelectedLine(lineNumber);
    setFoundBugs((prev) =>
      prev.includes(lineNumber) ? prev.filter((n) => n !== lineNumber) : [...prev, lineNumber]
    );
  };

  if (!puzzle) {
    return (
      <div className="min-h-[180px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-red-950 border-2 border-red-700 rounded-xl">
        <p className="text-red-200 font-medium">Data teka-teki tidak tersedia</p>
      </div>
    );
  }

  if (!puzzle.defuserView && !puzzle.expertView) {
    return (
      <div className="min-h-[180px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-amber-950 border-2 border-amber-700 rounded-xl">
        <p className="text-amber-200 font-medium">Memuat teka-teki...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Animasi & tema dungeon */}
      <style>{`
        @keyframes torchFlicker { 0%,100%{opacity:1;filter:brightness(1)} 25%{opacity:.86;filter:brightness(1.12)} 50%{opacity:.75;filter:brightness(.95)} 75%{opacity:.92;filter:brightness(1.05)} }
        @keyframes crystalGlow { 0%,100%{box-shadow:0 0 20px rgba(180,83,9,.6),0 0 40px rgba(251,191,36,.25)} 50%{box-shadow:0 0 28px rgba(180,83,9,.8),0 0 60px rgba(251,191,36,.45)} }
        @keyframes runeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
        .crystal-glow { animation: crystalGlow 3s ease-in-out infinite; }
        .rune-float { animation: runeFloat 3.2s ease-in-out infinite; }
      `}</style>

      <Card className="overflow-hidden border-4 border-amber-700 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
        <CardHeader className="relative">
          <div className="absolute top-3 left-3 text-2xl torch-flicker">🔥</div>
          <div className="absolute top-3 right-3 text-2xl torch-flicker">🔥</div>
          <CardTitle className="text-amber-300 text-2xl">{puzzle.title || 'Tantangan Analisis Kode'}</CardTitle>
          <CardDescription className="text-stone-300">
            {puzzle.description || 'Tuntaskan cobaan di lorong CodeAlpha Dungeon ini.'}
          </CardDescription>
          <div className="pt-2 flex flex-wrap gap-2">
            <Badge className="bg-amber-800 text-amber-100 border-amber-600">🏰 Mode Dungeon</Badge>
            <Badge className="bg-stone-700 text-stone-200 border-stone-600">🧩 Analisis</Badge>
            {role && <Badge className="bg-purple-800 text-purple-100 border-purple-700">🎭 Peran: {role}</Badge>}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* CIPHER PUZZLE */}
          {isCipherPuzzle && (
            <Card className="border-4 border-blue-700 bg-gradient-to-b from-stone-900 to-blue-950">
              <CardHeader>
                <CardTitle className="text-lg text-blue-300 text-center">🔐 Analisis Sandi</CardTitle>
                <CardDescription className="text-center text-stone-300">
                  Uraikan naskah yang terkungkung sigil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(isDefuser || role === 'host') && (
                  <div className="space-y-3">
                    <h4 className="text-stone-200 font-semibold">Naskah Terkunci</h4>
                    <div className="bg-stone-950 rounded-xl p-4 overflow-x-auto border-2 border-stone-700">
                      <div className="flex items-center">
                        <span className="text-stone-500 w-8 text-right mr-4 select-none">1</span>
                        <code className="text-green-300 text-lg font-mono">{puzzle?.defuserView?.cipher || '...'}</code>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expert Accordion (tanpa mengungkap kunci/jawaban) */}
                {(isExpert || role === 'host') && puzzle.expertView && (
                  <div className="space-y-4">
                    <Accordion type="multiple" className="space-y-3">
                      <AccordionItem value="konsep" className="border-b border-stone-700">
                        <AccordionTrigger className="text-stone-200">Prinsip Umum</AccordionTrigger>
                        <AccordionContent className="p-3 rounded-xl border-2 border-stone-700 bg-stone-800/60">
                          <p className="text-stone-300 italic">“{obfuscate(puzzle.expertView.rule || 'Jejak transformasi tersembunyi memandu arah tanpa menyebutkan runenya.')}”</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="penalaran" className="border-b border-stone-700">
                        <AccordionTrigger className="text-stone-200">Jejak Penalaran</AccordionTrigger>
                        <AccordionContent className="p-3 rounded-xl border-2 border-indigo-700 bg-gradient-to-r from-indigo-950 to-stone-900">
                          <ul className="text-sm text-indigo-100 space-y-1 list-disc pl-5">
                            <li>Amati kerap munculnya simbol tertentu; frekuensi huruf membantu menebak substitusi, khususnya pada monoalfabetik seperti Caesar/substitusi tunggal [web:40][web:75].</li>
                            <li>Uji hipotesis dengan pasangan huruf (digram) dan trigram umum seperti TH, HE, IN, THE, ING pada bahasa Inggris, atau pola lazim bahasa sasaran lain [web:66][web:69].</li>
                            <li>Konfirmasi lokal: terapkan pemetaan pada cuplikan pendek; jika kata mulai masuk akal, perluas bertahap tanpa mengungkapkan pemetaan penuh [web:40].</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      {/* BARU: Deteksi Jenis Sandi */}
                      <AccordionItem value="deteksi" className="border-b border-stone-700">
                        <AccordionTrigger className="text-stone-200">Deteksi Jenis Sandi</AccordionTrigger>
                        <AccordionContent className="p-3 rounded-xl border-2 border-emerald-700 bg-gradient-to-r from-emerald-950 to-stone-900">
                          <ul className="text-sm text-emerald-100 space-y-1 list-disc pl-5">
                            <li>Index of Coincidence (IoC): teks monoalfabetik cenderung mendekati IoC bahasa alami, sementara polialfabetik mendekati seragam; gunakan IoC untuk indikasi awal [web:46][web:49][web:55].</li>
                            <li>Ulangi-ulang n-gram: temuan pengulangan segmen dan jarak antar pengulangan memberi petunjuk kunci Vigenère (panjang kunci) via Kasiski [web:48][web:51][web:54].</li>
                            <li>Frekuensi global terpelihara pada transposisi; jika frekuensi mirip bahasa normal namun teks tak bermakna, pertimbangkan transposisi [web:61][web:63].</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      {/* BARU: Strategi Substitusi (Monoalphabetik) */}
                      <AccordionItem value="mono" className="border-b border-stone-700">
                        <AccordionTrigger className="text-stone-200">Strategi Substitusi (Monoalfabetik)</AccordionTrigger>
                        <AccordionContent className="p-3 rounded-xl border-2 border-blue-700 bg-gradient-to-r from-blue-950 to-stone-900">
                          <ul className="text-sm text-blue-100 space-y-1 list-disc pl-5">
                            <li>Lakukan analisis frekuensi huruf tunggal; cocokkan pola ETAOIN… untuk Inggris atau distribusi bahasa target agar memulai pemetaan [web:40][web:72].</li>
                            <li>Gunakan chi-squared untuk menguji semua pergeseran Caesar dan pilih skor terkecil sebagai kandidat terbaik tanpa menyebut nilai pergeserannya [web:65][web:68][web:71].</li>
                            <li>Validasi dengan digram/trigram dan kata pendek umum; perbaiki pemetaan secara iteratif hingga koheren [web:66][web:40].</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      {/* BARU: Strategi Polialfabetik (Vigenère) */}
                      <AccordionItem value="vigenere" className="border-b border-stone-700">
                        <AccordionTrigger className="text-stone-200">Strategi Polialfabetik (Vigenère)</AccordionTrigger>
                        <AccordionContent className="p-3 rounded-xl border-2 border-purple-700 bg-gradient-to-r from-purple-950 to-stone-900">
                          <ul className="text-sm text-purple-100 space-y-1 list-disc pl-5">
                            <li>Pakai Kasiski: cari pengulangan n-gram, ambil jarak antar kemunculan, faktorkan untuk menebak panjang kunci tanpa mengucap kuncinya [web:48][web:51][web:58].</li>
                            <li>Estimasi panjang kunci juga bisa dibantu IoC: bagi teks menjadi kolom-kolom sesuai panjang kunci, IoC tiap kolom mendekati monoalfabetik [web:46][web:49].</li>
                            <li>Analisis frekuensi per-kolom layaknya Caesar untuk merekonstruksi pola kunci, verifikasi secara bertahap pada cuplikan [web:51][web:68].</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      {/* BARU: Strategi Transposisi */}
                      <AccordionItem value="transposisi" className="border-b border-stone-700">
                        <AccordionTrigger className="text-stone-200">Strategi Transposisi</AccordionTrigger>
                        <AccordionContent className="p-3 rounded-xl border-2 border-teal-700 bg-gradient-to-r from-teal-950 to-stone-900">
                          <ul className="text-sm text-teal-100 space-y-1 list-disc pl-5">
                            <li>Substitusi tidak terjadi; huruf-huruf hanya ditukar posisinya sehingga frekuensi global tetap, telusuri pola baris/kolom atau jalur rute [web:61][web:63].</li>
                            <li>Uji grid/kolom sederhana (columnar, rail fence) pada panjang yang wajar; perhatikan kemunculan kata pendek sebagai sinyal benar [web:63][web:64].</li>
                            <li>Jika teks mendadak bermakna setelah reordering, lanjutkan penyusunan tanpa menyebut urutan kolom yang tepat ke defuser [web:61][web:67].</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="pantangan" className="border-b border-stone-700">
                        <AccordionTrigger className="text-stone-200">Pantangan Mengungkap</AccordionTrigger>
                        <AccordionContent className="p-3 rounded-xl border-2 border-amber-700 bg-gradient-to-r from-amber-900 to-stone-900">
                          <ul className="text-sm text-amber-200 space-y-1 list-disc pl-5">
                            <li>Jangan menyebut alfabet pemetaan, nilai pergeseran, panjang kunci spesifik, atau kata kunci Vigenère [web:48][web:68].</li>
                            <li>Jangan mengucap hasil akhir; berikan arah verifikasi bertahap dan biarkan defuser menyimpulkan [web:40].</li>
                            <li>Berikan hanya kerangka uji (frekuensi, Kasiski, IoC, chi-squared) dan cara memvalidasi parsial [web:46][web:65].</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="kategori" className="border-b border-stone-700">
                        <AccordionTrigger className="text-stone-200">Kategori Sandi</AccordionTrigger>
                        <AccordionContent className="p-3">
                          {puzzle.expertView.category && (
                            <Badge className="bg-indigo-800 text-indigo-100 border-indigo-700">
                              Kategori: {String(puzzle.expertView.category)}
                            </Badge>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}

                {/* Input Defuser */}
                {isDefuser && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-blue-200">Masukkan hasil dekripsi</label>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value.toUpperCase())}
                      placeholder="Ketik jawaban..."
                      className="w-full px-4 py-3 bg-stone-900/70 border-2 border-amber-600 rounded-xl text-amber-200 placeholder-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500 crystal-glow"
                      disabled={submitting}
                    />
                    <Button
                      onClick={handleSubmit}
                      disabled={!input.trim() || submitting}
                      className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-bold py-3 rounded-xl"
                    >
                      {submitting ? 'Mengirim...' : 'Kirim Jawaban'}
                    </Button>

                    {defuserHintsCipher.length > 0 && (
                      <div className="mt-2 p-4 rounded-xl border-2 border-blue-700 bg-gradient-to-r from-blue-950 to-stone-900">
                        <h5 className="text-blue-200 font-medium mb-2">Petunjuk Terselubung</h5>
                        <ul className="text-sm text-blue-200/90 space-y-1 list-disc pl-5">
                          {defuserHintsCipher.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* BUG PUZZLE */}
          {isBugPuzzle && (
            <Card className="border-4 border-red-700 bg-gradient-to-b from-stone-900 to-red-950">
              <CardHeader>
                <CardTitle className="text-lg text-red-300 text-center">🪓 Perburuan Bug</CardTitle>
                <CardDescription className="text-center text-stone-300">
                  Tandai baris yang terkutuk di naskah
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Array.isArray(puzzle.defuserView?.codeLines) && (
                  <div className="space-y-3">
                    <h4 className="text-stone-200 font-semibold">Naskah Ditulis</h4>
                    <div className="bg-stone-950 rounded-xl p-3 overflow-x-auto border-2 border-stone-700">
                      <pre className="text-sm">
                        {puzzle.defuserView.codeLines.map((line: string, index: number) => {
                          const lineNo = index + 1;
                          const active = selectedLine === lineNo;
                          const chosen = foundBugs.includes(lineNo);
                          return (
                            <div
                              key={index}
                              onClick={() => handleLineClick(lineNo)}
                              className={[
                                'flex items-center px-2 py-1 rounded cursor-pointer transition-colors',
                                'hover:bg-stone-800',
                                active ? 'ring-2 ring-amber-400' : '',
                                chosen ? 'bg-red-900/40' : '',
                              ].join(' ')}
                            >
                              <span className="text-stone-500 w-10 text-right mr-4 select-none">{lineNo}</span>
                              <code className="text-green-300">{line}</code>
                            </div>
                          );
                        })}
                      </pre>
                    </div>
                  </div>
                )}

                {(isExpert || role === 'host') && (
                  <Accordion type="multiple" className="space-y-3">
                    <AccordionItem value="arah">
                      <AccordionTrigger className="text-stone-200">Arah Penelusuran</AccordionTrigger>
                      <AccordionContent className="p-4 rounded-xl border-2 border-stone-700 bg-stone-800/60">
                        <ul className="text-sm text-stone-300 space-y-1 list-disc pl-5">
                          <li>Jejakkan mata pada variabel yang berubah makna di lorong-lorong bercabang.</li>
                          <li>Carilah ritus yang membuka sumber daya namun lupa menutup gerbangnya.</li>
                          <li>Perhatikan mantra yang memanggil dirinya sendiri tanpa totem henti.</li>
                          <li>Uji asumsi tipe dan batas; kutukan sering bersembunyi pada tepian.</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="cek">
                      <AccordionTrigger className="text-stone-200">Daftar Cek Non-Spoiler</AccordionTrigger>
                      <AccordionContent className="p-4 rounded-xl border-2 border-indigo-700 bg-gradient-to-r from-indigo-950 to-stone-900">
                        <ul className="text-sm text-indigo-100 space-y-1 list-disc pl-5">
                          <li>Null/undefined dan alur cabang kompleks yang menyamarkan niat. </li>
                          <li>Penggunaan sumber daya tanpa penutupan (file/stream/timeout) yang bocor senyap. </li>
                          <li>Duplikasi logika, penamaan gelap, dan ketergantungan tak terdokumentasi. </li>
                          <li>Cek tepi: indeks, panjang, konversi tipe, dan efek samping tak diharapkan. </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="sokratik">
                      <AccordionTrigger className="text-stone-200">Pertanyaan Pemandu</AccordionTrigger>
                      <AccordionContent className="p-4 rounded-xl border-2 border-amber-700 bg-gradient-to-r from-amber-900 to-stone-900">
                        <ul className="text-sm text-amber-200 space-y-1 list-disc pl-5">
                          <li>Jika cabang ini tidak berjalan, ritual apa yang tetap aktif di belakang layar. </li>
                          <li>Bagian mana yang bergantung pada keadaan sebelumnya dan dapat tersesat. </li>
                          <li>Apa yang terjadi bila masukan kosong, sangat panjang, atau di luar ranah. </li>
                          <li>Apakah nama-nama mantra mencerminkan tujuan sejatinya. </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="larangan">
                      <AccordionTrigger className="text-stone-200">Pantangan Mengungkap</AccordionTrigger>
                      <AccordionContent className="p-4 rounded-xl border-2 border-red-700 bg-gradient-to-r from-red-950 to-stone-900">
                        <ul className="text-sm text-red-200 space-y-1 list-disc pl-5">
                          <li>Jangan sebut nomor baris yang terkutuk. </li>
                          <li>Jangan berikan patch akhir; fokuskan pada arah penyucian. </li>
                          <li>Jangan bocorkan nilai antara, hanya bentuk logikanya. </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {isDefuser && (
                  <div className="space-y-3">
                    <Button
                      onClick={handleSubmit}
                      disabled={foundBugs.length === 0 || submitting}
                      className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-bold py-3 rounded-xl"
                    >
                      {submitting ? 'Mengirim...' : `Kirim Laporan Bug (${foundBugs.length})`}
                    </Button>

                    {defuserHintsBug.length > 0 && (
                      <div className="p-4 rounded-xl border-2 border-purple-700 bg-gradient-to-r from-purple-950 to-stone-900">
                        <h5 className="text-purple-200 font-medium mb-2">Bisik-bisik Lorong</h5>
                        <ul className="text-sm text-purple-200/90 space-y-1 list-disc pl-5">
                          {defuserHintsBug.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
