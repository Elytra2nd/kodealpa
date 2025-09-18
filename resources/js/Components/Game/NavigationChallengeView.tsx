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

export default function NavigationChallengeView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const [path, setPath] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState('');

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';

  // Util: normalisasi array
  const toArray = (data: any): string[] => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') return [data];
    return [];
  };

  // Obfuscation: buat petunjuk lebih samar dan tematik (hindari angka langsung)
  const runeMap: Record<string, string> = {
    '0': '◇','1': '†','2': '♁','3': '♆','4': '♄','5': '♃','6': '☿','7': '☼','8': '◈','9': '★',
  };
  const obfuscate = (t: string) =>
    String(t)
      .replace(/\d/g, (d) => runeMap[d] ?? d)
      .replace(/\b(akar|root)\b/gi, 'altar')
      .replace(/\b(kiri|left)\b/gi, 'lorong barat')
      .replace(/\b(kanan|right)\b/gi, 'lorong timur')
      .replace(/\b(daun|leaf)\b/gi, 'ruang tak berujung')
      .replace(/\b(preorder|inorder|postorder)\b/gi, 'ritus penelusuran')
      .replace(/\b(jalur|path)\b/gi, 'jejak runik');

  const defuserHints = useMemo(() => {
    const base: string[] = toArray(puzzle?.defuserView?.hints);
    const extra: string[] = [
      'Jejak runik tidak selalu lurus; kadang ia berputar sebelum menghadap altar sejati.',
      'Bandingkan nilai pada tiap persimpangan, namun waspadai fatamorgana keteraturan.',
      'Jika dua lorong tampak setara, telusuri riwayat persimpangan sebelumnya.',
      'Ritus penelusuran berbeda menyalakan nyala obor yang berlainan; pilih yang paling menyingkap makna.',
    ];
    return [...base, ...extra].map(obfuscate);
  }, [puzzle]);

  // Aksi path
  const addToPath = (step: string) => {
    setPath((prev) => [...prev, step]);
    setCurrentStep('');
  };
  const removeLastStep = () => setPath((prev) => prev.slice(0, -1));
  const clearPath = () => setPath([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (path.length === 0) return;
    onSubmitAttempt(path.join(','));
  };

  const renderTreeNode = (node: any, depth = 0): React.ReactNode => {
    if (!node) return null;
    return (
      <div key={`${depth}-${node.value}`} className="font-mono text-sm">
        <div className={depth === 0 ? 'font-bold text-amber-300' : 'text-stone-300'}>
          {Array(depth).fill('│   ').join('')}
          {depth > 0 ? '├─ ' : ''}{node.value}
        </div>
        {node.left && renderTreeNode(node.left, depth + 1)}
        {node.right && renderTreeNode(node.right, depth + 1)}
      </div>
    );
  };

  // Guard puzzle
  if (!puzzle) {
    return (
      <div className="min-h-[180px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-red-950 border-2 border-red-700 rounded-xl">
        <p className="text-red-200 font-medium">Data teka-teki tidak tersedia</p>
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
          <CardTitle className="text-amber-300 text-2xl">{puzzle.title || 'Tantangan Navigasi'}</CardTitle>
          <CardDescription className="text-stone-300">
            {puzzle.description || 'Menelusuri struktur pohon di lorong CodeAlpha Dungeon.'}
          </CardDescription>
          <div className="pt-2 flex flex-wrap gap-2">
            <Badge className="bg-amber-800 text-amber-100 border-amber-600">🏰 Mode Dungeon</Badge>
            <Badge className="bg-stone-700 text-stone-200 border-stone-600">🧭 Navigasi Pohon</Badge>
            {role && <Badge className="bg-purple-800 text-purple-100 border-purple-700">🎭 Peran: {role}</Badge>}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tujuan Pembelajaran */}
          {Array.isArray(puzzle.learningObjectives) && puzzle.learningObjectives.length > 0 && (
            <div className="p-4 rounded-xl border-2 border-amber-700 bg-gradient-to-r from-stone-800 to-stone-700">
              <h4 className="text-amber-300 font-semibold mb-2">Tujuan Pembelajaran</h4>
              <ul className="text-sm text-stone-200 space-y-1 list-disc pl-5">
                {toArray(puzzle.learningObjectives).map((objective, i) => (
                  <li key={i}>{objective}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Defuser View */}
            {(isDefuser || role === 'host') && (
              <Card className="border-4 border-amber-600 bg-gradient-to-b from-stone-900 to-stone-800">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-300 text-center">🗺️ Misi Navigasi</CardTitle>
                  <CardDescription className="text-center text-stone-300">
                    Susun jejak runik langkah demi langkah
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-xl p-4 border-2 border-stone-700 bg-stone-800/60">
                    <h5 className="text-stone-200 font-semibold mb-2">Instruksi Misi</h5>
                    <p className="text-stone-300">
                      {puzzle.defuserView?.task || 'Bangun urutan langkah dari altar menuju ruang tujuan tanpa menyingkap mantra tersembunyi.'}
                    </p>
                  </div>

                  {/* Opsi traversal */}
                  <div>
                    <h5 className="text-stone-200 font-semibold mb-2">Bangun Jejak</h5>
                    <div className="flex flex-wrap gap-2">
                      {toArray(puzzle.defuserView?.traversalOptions).map((opt) => (
                        <Button
                          key={opt}
                          onClick={() => addToPath(opt)}
                          disabled={submitting}
                          variant="secondary"
                          className="bg-indigo-800 text-indigo-100 hover:bg-indigo-700 border border-indigo-600"
                        >
                          {opt}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Jejak saat ini */}
                  <div>
                    <h5 className="text-stone-200 font-semibold mb-2">Jejak Saat Ini</h5>
                    <div className="min-h-[44px] rounded-xl p-3 border-2 border-amber-700 bg-stone-900/70 flex items-center">
                      {path.length > 0 ? (
                        <span className="font-mono text-amber-300 rune-float">{path.join(' → ')}</span>
                      ) : (
                        <span className="text-stone-400 italic">Belum ada jejak</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={removeLastStep}
                        disabled={path.length === 0 || submitting}
                        variant="outline"
                        className="border-amber-600 text-amber-300 hover:bg-amber-900/30"
                      >
                        Hapus Terakhir
                      </Button>
                      <Button
                        onClick={clearPath}
                        disabled={path.length === 0 || submitting}
                        variant="outline"
                        className="border-red-600 text-red-300 hover:bg-red-900/30"
                      >
                        Bersihkan
                      </Button>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <Button
                      type="submit"
                      disabled={path.length === 0 || submitting}
                      className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-bold py-3 rounded-xl crystal-glow"
                    >
                      {submitting ? 'Mengirim...' : 'Kirim Jejak'}
                    </Button>
                  </form>

                  {/* Petunjuk Defuser (obfuscated) */}
                  {defuserHints.length > 0 && (
                    <div className="p-4 rounded-xl border-2 border-blue-700 bg-gradient-to-r from-blue-950 to-stone-900">
                      <h5 className="text-blue-200 font-medium mb-2">Bisik-bisik Lorong</h5>
                      <ul className="text-sm text-blue-200/90 space-y-1 list-disc pl-5">
                        {defuserHints.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Expert View (tanpa jawaban benar) */}
            {(isExpert || role === 'host') && (
              <Card className="border-4 border-emerald-700 bg-gradient-to-b from-stone-900 to-emerald-950">
                <CardHeader>
                  <CardTitle className="text-lg text-emerald-300 text-center">🌳 Struktur Pohon</CardTitle>
                  <CardDescription className="text-center text-stone-300">
                    Bimbingan konseptual tanpa membuka solusi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Pohon untuk Expert */}
                  {puzzle.expertView?.tree?.root ? (
                    <div className="rounded-xl p-4 border-2 border-stone-700 bg-stone-800/60">
                      <h5 className="text-stone-200 font-semibold mb-2">Representasi Biner</h5>
                      <div className="bg-stone-950 rounded-lg p-3 overflow-x-auto border border-stone-700">
                        {renderTreeNode(puzzle.expertView.tree.root)}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl p-4 border-2 border-amber-700 bg-gradient-to-r from-amber-900 to-stone-900">
                      <p className="text-amber-200">Pengetahuan Expert sedang dimuat...</p>
                    </div>
                  )}

                  {/* Prinsip umum, tanpa jawaban/jejak final */}
                  <div className="rounded-xl p-4 border-2 border-stone-700 bg-stone-800/60">
                    <h5 className="text-stone-200 font-semibold mb-2">Prinsip Penelusuran</h5>
                    <ul className="text-sm text-stone-300 space-y-1 list-disc pl-5">
                      <li>Mulai dari altar, bandingkan nilai saat ini sebelum memilih lorong barat atau timur.</li>
                      <li>Validasi hipotesis di tiap simpul; hindari menyebut jejak final secara eksplisit.</li>
                      <li>Ajarkan pola ritus penelusuran tanpa contoh identik yang menyingkap hasil.</li>
                      <li>Gunakan analogi konseptual (orde kunjungan simpul) ketimbang nilai literal.</li>
                    </ul>
                  </div>

                  {/* Traversal methods: tampilkan nama saja, tanpa daftar nilai */}
                  {puzzle.expertView?.traversalMethods && (
                    <div className="rounded-xl p-4 border-2 border-purple-700 bg-gradient-to-r from-purple-950 to-stone-900">
                      <h5 className="text-purple-200 font-medium mb-2">Ritus Penelusuran</h5>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(puzzle.expertView.traversalMethods).map((name) => (
                          <Badge key={name} className="bg-purple-800 text-purple-100 border-purple-700">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Jangan tampilkan jawaban benar / path final / penjelasan yang mengungkap solusi */}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Seksi konsep struktur data */}
          <Card className="border-4 border-purple-700 bg-gradient-to-br from-stone-900 to-purple-950">
            <CardHeader>
              <CardTitle className="text-purple-300 text-lg">📚 Konsep Struktur Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl border-2 border-amber-700 bg-stone-800/60">
                  <h6 className="text-amber-300 font-semibold mb-2">Dasar Pohon Biner</h6>
                  <ul className="text-stone-200 space-y-1 list-disc pl-5">
                    <li>Tiap simpul maksimal memiliki dua cabang.</li>
                    <li>Pada BST: kiri {'<'} induk {'<'} kanan, dalam pengurutan nilai.</li>
                    <li>Altar (root) adalah simpul puncak.</li>
                    <li>Ruang tak berujung (leaf) tidak memiliki cabang lagi.</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl border-2 border-blue-700 bg-stone-800/60">
                  <h6 className="text-blue-300 font-semibold mb-2">Taktik Navigasi</h6>
                  <ul className="text-stone-200 space-y-1 list-disc pl-5">
                    <li>Mulai dari altar, bergerak ke barat/timur sesuai perbandingan.</li>
                    <li>Jejak merekam urutan keputusan; jaga konsistensi langkah.</li>
                    <li>Jika ragu, ulangi validasi dari simpul terakhir yang pasti.</li>
                    <li>Komunikasikan alasan pilihan, bukan hasil akhir.</li>
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
