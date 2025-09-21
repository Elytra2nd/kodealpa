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

  // Rune map untuk angka (0-9) → simbol
  const runeMap: Record<string, string> = {
    '0': '◇','1': '†','2': '♁','3': '♆','4': '♄','5': '♃','6': '☿','7': '☼','8': '◈','9': '★',
  };

  // Obfuscation istilah (dipakai pada hints Defuser)
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

  // Legend rune untuk ditampilkan
  const runeLegend = useMemo(() => Object.entries(runeMap).map(([num, sym]) => ({ num, sym })), []);

  // Data Caesar dinamis dari controller (puzzle.expertView)
  const cipherType: string | undefined = puzzle?.expertView?.cipher_type;
  const numericShift: number | null =
    cipherType === 'caesar' && typeof puzzle?.expertView?.shift === 'number'
      ? Math.abs(puzzle.expertView.shift % 26)
      : null;

  // Petunjuk kunci dalam rune (tanpa angka)
  const caesarRuneHint = useMemo(() => {
    if (numericShift == null) return null;
    const digits = String(numericShift).split('');
    return digits.map(d => runeMap[d] ?? d).join('');
  }, [numericShift]);

  // Alfabet dan util rotasi untuk tabel Caesar (tanpa menulis angka kunci)
  const alphabet = useMemo(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), []);
  const rotated = useMemo(() => {
    if (numericShift == null) return alphabet;
    const k = numericShift % 26;
    return alphabet.map((_, i) => alphabet[(i + k) % 26]);
  }, [alphabet, numericShift]);

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
      <div className="min-h-[180px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-red-950 border border-red-700/60 rounded-xl">
        <p className="text-red-200 font-medium">Data teka-teki tidak tersedia</p>
      </div>
    );
  }

  if (!puzzle.defuserView && !puzzle.expertView) {
    return (
      <div className="min-h-[180px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-amber-950 border border-amber-700/60 rounded-xl">
        <p className="text-amber-200 font-medium">Memuat teka-teki...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Animasi & tema dungeon (ringkas) */}
      <style>{`
        @keyframes torchFlicker { 0%,100%{opacity:1} 25%{opacity:.86} 50%{opacity:.75} 75%{opacity:.92} }
        .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
        .rune-float { animation: runeFloat 3.2s ease-in-out infinite; }
        @keyframes runeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>

      <Card className="overflow-hidden border border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
        <CardHeader className="relative">
          <div className="absolute top-3 left-3 text-2xl torch-flicker">🔥</div>
          <div className="absolute top-3 right-3 text-2xl torch-flicker">🔥</div>
          <CardTitle className="text-amber-300 text-2xl">{puzzle.title || 'Tantangan Analisis Kode'}</CardTitle>
          <CardDescription className="text-stone-300">
            {puzzle.description || 'Tuntaskan cobaan di lorong CodeAlpha Dungeon ini.'}
          </CardDescription>

          {/* Quick chips ringkas agar tidak scroll */}
          {(isExpert || role === 'host') && puzzle.expertView && (
            <div className="pt-3 flex flex-wrap gap-2">
              <Badge className="bg-stone-800 text-stone-200 border border-stone-700/60">
                Jenis: {(cipherType || '—').toUpperCase()}
              </Badge>
              {cipherType === 'caesar' && (
                <Badge className="bg-stone-800 text-amber-200 border border-amber-700/60">
                  Pergeseran sigil: {caesarRuneHint || '◈?'}
                </Badge>
              )}
              <Badge className="bg-stone-800 text-stone-200 border border-stone-700/60">
                Kategori: {puzzle.expertView.category ?? '—'}
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* CIPHER PUZZLE */}
          {isCipherPuzzle && (
            <Card className="border border-blue-700/30 bg-gradient-to-b from-stone-900/60 to-blue-950/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-blue-300 text-center">🔐 Analisis Sandi</CardTitle>
                <CardDescription className="text-center text-stone-300">
                  Uraikan naskah yang terkungkung sigil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(isDefuser || role === 'host') && (
                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-semibold text-sm">Naskah Terkunci</h4>
                    <div className="bg-stone-950 rounded-lg p-3 overflow-x-auto border border-stone-700/60">
                      <div className="flex items-center">
                        <span className="text-stone-500 w-8 text-right mr-4 select-none">1</span>
                        <code className="text-green-300 text-lg font-mono">{puzzle?.defuserView?.cipher || '...'}</code>
                      </div>
                    </div>
                  </div>
                )}

                {(isExpert || role === 'host') && puzzle.expertView && (
                  <div className="space-y-4">
                    {/* Grid 2 kolom untuk mengurangi scroll */}
                    <div className="grid md:grid-cols-2 gap-3">
                      <Accordion type="multiple" className="space-y-2">
                        <AccordionItem value="dekripsi">
                          <AccordionTrigger className="text-stone-200 text-sm">Panduan Dekripsi Langkah</AccordionTrigger>
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
                          <AccordionTrigger className="text-stone-200 text-sm">Jejak Penalaran</AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                              <li>Mulai dari frekuensi huruf; cocokkan pola bahasa sasaran.</li>
                              <li>Uji hipotesis pada cuplikan kecil; perluas jika koheren.</li>
                              <li>Hentikan sebelum menyebut pemetaan lengkap atau hasil akhir.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Tabel Caesar: aktif hanya untuk type caesar */}
                        {cipherType === 'caesar' && (
                          <AccordionItem value="caesar-table">
                            <AccordionTrigger className="text-stone-200 text-sm">Tabel Caesar (Tanpa Kunci)</AccordionTrigger>
                            <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                              <div className="text-xs text-stone-200/90 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="bg-stone-800 text-amber-200 border border-amber-700/50">
                                    Pergeseran sigil: {caesarRuneHint || '◈?'}
                                  </Badge>
                                  <span className="text-stone-400">(gunakan rune sebagai petunjuk arah geser)</span>
                                </div>
                                <div className="rounded-md border border-stone-700/40 bg-stone-950 p-3">
                                  <div className="text-stone-300 mb-1">Plain:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {alphabet.map((ch) => (
                                      <Badge key={`p-${ch}`} className="bg-stone-800 text-stone-100 border border-stone-700/40">{ch}</Badge>
                                    ))}
                                  </div>
                                  <div className="text-stone-300 mt-2 mb-1">Cipher (geser sesuai rune):</div>
                                  <div className="flex flex-wrap gap-1">
                                    {rotated.map((ch) => (
                                      <Badge key={`c-${ch}`} className="bg-stone-900 text-stone-300 border border-stone-700/40">{ch}</Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="text-stone-400">
                                  Enkripsi \(E_K(x)=(x+K)\bmod 26\), Dekripsi \(D_K(x)=(x-K)\bmod 26\) tanpa menyebut K numerik secara eksplisit.
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}

                        <AccordionItem value="runes">
                          <AccordionTrigger className="text-stone-200 text-sm">Legenda Simbol Runik (0–9)</AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <div className="flex flex-wrap gap-2">
                              {runeLegend.map(({ num, sym }) => (
                                <Badge key={num} className="bg-stone-800 text-amber-100 border border-amber-700/50 rune-float">
                                  {sym} = {num}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-xs text-stone-400 mt-2">
                              Pulihkan digit tersembunyi pada petunjuk/parameter uji sebelum menilai pergeseran atau panjang kunci.
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      {/* Kolom kanan: deteksi & strategi ringkas */}
                      <Accordion type="multiple" className="space-y-2">
                        <AccordionItem value="deteksi">
                          <AccordionTrigger className="text-stone-200 text-sm">Deteksi Jenis</AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                              <li>IoC membantu bedakan mono vs polialfabetik.</li>
                              <li>Pengulangan n-gram mengarah ke panjang kunci (Kasiski).</li>
                              <li>Frekuensi global normal tapi tidak bermakna → curiga transposisi.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="mono">
                          <AccordionTrigger className="text-stone-200 text-sm">Substitusi (Mono)</AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                              <li>Mulai dari frekuensi huruf; cocokkan pola umum.</li>
                              <li>Gunakan penilaian statistik untuk kandidat geser.</li>
                              <li>Konfirmasi via digram/trigram & kata pendek.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="vigenere">
                          <AccordionTrigger className="text-stone-200 text-sm">Polialfabetik (Vigenère)</AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                              <li>Tebak panjang kunci (Kasiski/IoC) lalu pecah kolom.</li>
                              <li>Pecahkan tiap kolom seperti Caesar.</li>
                              <li>Gabungkan dan cek koherensi.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="transposisi">
                          <AccordionTrigger className="text-stone-200 text-sm">Transposisi</AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                              <li>Uji columnar/rail fence secara bertahap.</li>
                              <li>Validasi dengan frasa pendek yang wajar.</li>
                              <li>Jangan ungkap urutan kolom final.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="pantangan">
                          <AccordionTrigger className="text-stone-200 text-sm">Pantangan</AccordionTrigger>
                          <AccordionContent className="p-3 rounded-lg bg-stone-900/60 border border-stone-700/40">
                            <ul className="text-xs text-stone-200/90 space-y-1 list-disc pl-5">
                              <li>Jangan menyebut angka kunci atau kata kunci.</li>
                              <li>Hindari pemetaan lengkap/harga final.</li>
                              <li>Berikan arah verifikasi bertahap saja.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </div>
                )}

                {/* Input Defuser */}
                {isDefuser && (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-blue-200">Masukkan hasil dekripsi</label>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value.toUpperCase())}
                      placeholder="Ketik jawaban..."
                      className="w-full px-3 py-2 bg-stone-900/70 border border-stone-700/50 rounded-lg text-amber-200 placeholder-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500"
                      disabled={submitting}
                    />
                    <Button
                      onClick={handleSubmit}
                      disabled={!input.trim() || submitting}
                      className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-semibold py-2 rounded-lg"
                    >
                      {submitting ? 'Mengirim...' : 'Kirim Jawaban'}
                    </Button>

                    {defuserHintsCipher.length > 0 && (
                      <div className="mt-1 p-3 rounded-lg border border-blue-700/30 bg-gradient-to-r from-blue-950/40 to-stone-900/40">
                        <h5 className="text-blue-200 font-medium mb-1 text-sm">Petunjuk Terselubung</h5>
                        <ul className="text-xs text-blue-200/90 space-y-1 list-disc pl-5">
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
            <Card className="border border-red-700/30 bg-gradient-to-b from-stone-900/60 to-red-950/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-red-300 text-center">🪓 Perburuan Bug</CardTitle>
                <CardDescription className="text-center text-stone-300">
                  Tandai baris yang terkutuk di naskah
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.isArray(puzzle.defuserView?.codeLines) && (
                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-semibold text-sm">Naskah Ditulis</h4>
                    <div className="bg-stone-950 rounded-lg p-3 overflow-x-auto border border-stone-700/60">
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
                                active ? 'ring-2 ring-amber-400' : '',
                                chosen ? 'bg-red-900/30' : 'hover:bg-stone-800/60',
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
                  <div className="grid md:grid-cols-2 gap-3">
                    <Accordion type="multiple" className="space-y-2">
                      <AccordionItem value="arah">
                        <AccordionTrigger className="text-stone-200 text-sm">Arah Penelusuran</AccordionTrigger>
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
                        <AccordionTrigger className="text-stone-200 text-sm">Daftar Cek Non-Spoiler</AccordionTrigger>
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
                        <AccordionTrigger className="text-stone-200 text-sm">Pertanyaan Pemandu</AccordionTrigger>
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
                        <AccordionTrigger className="text-stone-200 text-sm">Pantangan Mengungkap</AccordionTrigger>
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

                {isDefuser && (
                  <div className="space-y-3">
                    <Button
                      onClick={handleSubmit}
                      disabled={foundBugs.length === 0 || submitting}
                      className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-semibold py-2 rounded-lg"
                    >
                      {submitting ? 'Mengirim...' : `Kirim Laporan Bug (${foundBugs.length})`}
                    </Button>

                    {defuserHintsBug.length > 0 && (
                      <div className="p-3 rounded-lg border border-purple-700/30 bg-gradient-to-r from-purple-950/40 to-stone-900/40">
                        <h5 className="text-purple-200 font-medium mb-1 text-sm">Bisik-bisik Lorong</h5>
                        <ul className="text-xs text-purple-200/90 space-y-1 list-disc pl-5">
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
