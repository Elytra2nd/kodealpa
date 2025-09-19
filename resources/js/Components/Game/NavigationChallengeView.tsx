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

type TreeNode = {
  value: any;
  left?: TreeNode | null;
  right?: TreeNode | null;
};

export default function NavigationChallengeView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const [path, setPath] = useState<string[]>([]);
  const [showNulls, setShowNulls] = useState(false);
  const [hoverNext, setHoverNext] = useState<'left' | 'right' | null>(null);
  const [showSolveHints, setShowSolveHints] = useState(false); // NEW: toggle petunjuk pemecahan

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';

  // Animasi & tema dungeon
  const DungeonCSS = () => (
    <style>{`
      @keyframes torchFlicker { 0%,100%{opacity:1;filter:brightness(1)} 25%{opacity:.86;filter:brightness(1.12)} 50%{opacity:.75;filter:brightness(.95)} 75%{opacity:.92;filter:brightness(1.05)} }
      @keyframes crystalGlow { 0%,100%{box-shadow:0 0 20px rgba(180,83,9,.6),0 0 40px rgba(251,191,36,.25)} 50%{box-shadow:0 0 28px rgba(180,83,9,.8),0 0 60px rgba(251,191,36,.45)} }
      @keyframes runeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
      .crystal-glow { animation: crystalGlow 3s ease-in-out infinite; }
      .rune-float { animation: runeFloat 3.2s ease-in-out infinite; }
    `}</style>
  );

  // Util: normalisasi array
  const toArray = (data: any): string[] => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') return [data];
    return [];
  };

  // Obfuscation istilah
  const runeMap: Record<string, string> = { '0': '◇','1': '†','2': '♁','3': '♆','4': '♄','5': '♃','6': '☿','7': '☼','8': '◈','9': '★' };
  const obfuscate = (t: string) =>
    String(t)
      .replace(/\d/g, (d) => runeMap[d] ?? d)
      .replace(/\b(akar|root)\b/gi, 'altar')
      .replace(/\b(kiri|left)\b/gi, 'lorong barat')
      .replace(/\b(kanan|right)\b/gi, 'lorong timur')
      .replace(/\b(daun|leaf)\b/gi, 'ruang tak berujung')
      .replace(/\b(preorder|inorder|postorder)\b/gi, 'ritus penelusuran')
      .replace(/\b(jalur|path)\b/gi, 'jejak runik');

  // Normalisasi langkah ke 'left'/'right'
  const normalizeStep = (s: string): 'left' | 'right' | null => {
    const x = s.trim().toLowerCase();
    const leftWords = ['left','kiri','lorong barat','l','west','barat'];
    const rightWords = ['right','kanan','lorong timur','r','east','timur'];
    if (leftWords.includes(x)) return 'left';
    if (rightWords.includes(x)) return 'right';
    return null;
  };

  // Pohon dari Expert
  const root: TreeNode | undefined = puzzle?.expertView?.tree?.root;

  // Node saat ini berdasarkan path Defuser
  const currentNode = useMemo(() => {
    let cur: TreeNode | null | undefined = root;
    for (const stepRaw of path) {
      const step = normalizeStep(stepRaw);
      if (!step || !cur) return cur ?? null;
      const next = (cur as any)[step] as TreeNode | null | undefined;
      if (!next) return cur;
      cur = next;
    }
    return cur ?? null;
  }, [root, path]);

  // Opsi yang tersedia pada node saat ini (sinkron dengan pohon)
  const availableDirections = useMemo(() => {
    const dirs: Array<'left' | 'right'> = [];
    if (currentNode && typeof currentNode === 'object') {
      if ((currentNode as TreeNode).left) dirs.push('left');
      if ((currentNode as TreeNode).right) dirs.push('right');
    }
    return dirs;
  }, [currentNode]);

  // Label yang dipakai Defuser
  const traversalOptions = toArray(puzzle?.defuserView?.traversalOptions);
  const pickLabel = (dir: 'left' | 'right') => {
    const candidates = dir === 'left'
      ? ['left','kiri','lorong barat','L','west','barat']
      : ['right','kanan','lorong timur','R','east','timur'];
    const picked = traversalOptions.find(o => candidates.includes(o.toLowerCase()));
    return picked ?? (dir === 'left' ? 'kiri' : 'kanan');
  };

  // Deteksi ketidaksinkronan
  const syncIssue = useMemo(() => {
    if (!currentNode) return root ? null : 'Struktur pohon belum tersedia.';
    const hasLeft = (currentNode as TreeNode).left != null;
    const hasRight = (currentNode as TreeNode).right != null;
    const offered = traversalOptions.map(o => normalizeStep(o)).filter(Boolean) as Array<'left'|'right'>;
    const anyOfferedInvalid = offered.some(d => (d === 'left' && !hasLeft) || (d === 'right' && !hasRight));
    return anyOfferedInvalid ? 'Petunjuk arah pada Defuser tidak cocok dengan cabang yang tersedia.' : null;
  }, [currentNode, traversalOptions, root]);

  // Petunjuk Defuser
  const defuserHints = useMemo(() => {
    const base: string[] = toArray(puzzle?.defuserView?.hints);
    const extra: string[] = [
      'Jejak runik tak selalu lurus; teguk napas di tiap persimpangan dan amati penjaga gerbangnya.',
      'Bandingkan nilai penjaga sebelum memilih barat atau timur; namun jangan terperangkap fatamorgana keseimbangan semu.',
      'Bila dua lorong tampak setara, dengarkan bisik selisih—ia membimbing tanpa menunjuk langsung.',
      'Pilih ritus penelusuran yang menyingkap makna paling banyak, bukan yang terdengar paling nyaring.',
    ];
    return [...base, ...extra].map(obfuscate);
  }, [puzzle]);

  // Petunjuk Expert - bimbingan pedagogis
  const expertGuidanceHints = useMemo(() => {
    return [
      'Bimbing dengan pertanyaan terbuka: "Apa yang kamu lihat di simpul ini?" atau "Bagaimana hubungan nilai ini dengan nilai sebelumnya?"',
      'Jangan langsung memberikan jawaban, tapi arahkan dengan analogi: "Bayangkan seperti mencari buku di perpustakaan yang tersusun rapi"',
      'Gunakan teknik Socratic: biarkan defuser menemukan pola sendiri dengan pertanyaan penuntun yang tepat',
      'Fokus pada proses berpikir, bukan hasil akhir: "Ceritakan alasan di balik pilihan arahmu"',
      'Berikan konfirmasi positif untuk pemikiran yang benar: "Betul, kamu sudah memahami konsep perbandingan"',
      'Saat defuser bingung, kembalikan ke prinsip dasar BST: "Ingat aturan utama pohon pencarian biner"',
      'Hindari memberikan urutan langkah konkret, tapi berikan kerangka berpikir umum',
      'Gunakan visualisasi dengan gestur atau diagram sederhana jika memungkinkan'
    ];
  }, []);

  const expertStrategies = useMemo(() => {
    return [
      {
        title: 'Teknik Bertanya Efektif',
        points: [
          'Mulai dengan pertanyaan observasi: "Apa yang kamu amati di sini?"',
          'Lanjutkan dengan analisis: "Mengapa kamu berpikir demikian?"',
          'Akhiri dengan prediksi: "Apa yang akan terjadi jika kamu pilih arah ini?"'
        ]
      },
      {
        title: 'Strategi Pembimbingan',
        points: [
          'Beri waktu tunggu setelah mengajukan pertanyaan (minimal 3-5 detik)',
          'Parafrase jawaban defuser untuk konfirmasi pemahaman',
          'Berikan petunjuk bertingkat: dari umum ke spesifik'
        ]
      },
      {
        title: 'Respons Terhadap Kesalahan',
        points: [
          'Jangan langsung mengatakan "salah", tapi tanyakan: "Apakah kamu yakin?"',
          'Bantu defuser menganalisis konsekuensi dari pilihan mereka',
          'Arahkan kembali ke konsep fundamental tanpa memberikan jawaban'
        ]
      }
    ];
  }, []);

  // Petunjuk pemecahan Binary Tree/BST
  const solveHintsGeneral = useMemo(() => ([
    'Identifikasi tipe pohon: apakah sekadar Binary Tree umum atau Binary Search Tree (BST). Binary Tree punya ≤2 anak per simpul, sedangkan BST menambahkan aturan urutan nilai.',
    'Tentukan tujuan: cari nilai tertentu, validasi BST, hitung tinggi/daun, atau rekonstruksi dari traversal. Tujuan menentukan strategi penelusuran.'
  ]), []);

  const solveHintsBST = useMemo(() => ([
    'Aturan BST: semua nilai di kiri < nilai akar < semua nilai di kanan pada setiap simpul.',
    'Gunakan inorder (Left-Root-Right) untuk memeriksa apakah barisan nilai terurut naik; jika tidak terurut, struktur bukan BST yang valid.',
    'Mencari nilai X pada BST: bandingkan di setiap simpul; jika X < nilai simpul, pergi ke kiri; jika X > nilai simpul, pergi ke kanan; jika sama, temuan selesai.',
    'Tetapkan kebijakan duplikat secara konsisten (mis. duplikat ke kiri atau kanan) sebelum menelusur agar keputusan selalu deterministik.'
  ]), []);

  const solveHintsTraversal = useMemo(() => ([
    'DFS Inorder: Left-Root-Right, ideal untuk cek urutan/ekstraksi urut pada BST.',
    'DFS Preorder: Root-Left-Right, berguna untuk menyalin/rekonstruksi struktur dan ekspresi.',
    'DFS Postorder: Left-Right-Root, berguna untuk operasi destruktif (hapus) atau evaluasi pohon ekspresi.',
    'BFS (Level-order): telusuri per level memakai antrian; cocok untuk pertanyaan level terdekat/terpendek dan properti per level.'
  ]), []);

  const solveHintsChecks = useMemo(() => ([
    'Validasi BST berbasis rentang: saat turun ke kiri, perbarui batas atas menjadi nilai simpul; saat turun ke kanan, perbarui batas bawah menjadi nilai simpul; pastikan setiap nilai berada dalam rentangnya.',
    'Untuk tugas “terurut atau tidak”, buat daftar hasil inorder dan cek apakah nondecreasing (atau strictly increasing sesuai kebijakan duplikat).',
    'Estimasi kompleksitas: operasi pada BST seimbang cenderung O(log n); pada pohon tidak seimbang bisa mendekati O(n).'
  ]), []);

  const addDir = (dir: 'left' | 'right') => {
    const label = pickLabel(dir);
    setPath(prev => [...prev, label]);
  };
  const removeLastStep = () => setPath(prev => prev.slice(0, -1));
  const clearPath = () => setPath([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (path.length === 0) return;
    onSubmitAttempt(path.join(','));
  };

  // Kumpulan node yang dilalui
  const visitedNodes = useMemo(() => {
    const set = new WeakSet<object>();
    if (!root) return set;
    set.add(root as object);
    let cur: TreeNode | null | undefined = root;
    for (const stepRaw of path) {
      const step = normalizeStep(stepRaw);
      if (!step || !cur) return set;
      const next = (cur as any)[step] as TreeNode | null | undefined;
      if (!next) return set;
      set.add(next as object);
      cur = next;
    }
    if (hoverNext && cur && (cur as any)[hoverNext]) {
      set.add(((cur as any)[hoverNext]) as object);
    }
    return set;
  }, [root, path, hoverNext]);

  // Warna kedalaman
  const depthColor = (depth: number) => {
    const palette = ['text-emerald-300','text-amber-300','text-purple-300','text-indigo-300','text-blue-300','text-rose-300'];
    return palette[depth % palette.length];
  };

  // Renderer pohon ASCII
  const renderNode = (node: TreeNode | null, prefix = '', isLast = true, keyPath = 'root', depth = 0): React.ReactNode => {
    const isNull = node === null;
    const lineConnector = prefix ? (isLast ? '└── ' : '├── ') : '';
    const nextPrefix = prefix + (prefix ? (isLast ? '    ' : '│   ') : '');
    const isVisited = node && visitedNodes.has(node as object);
    return (
      <div key={keyPath} className="font-mono text-sm">
        <div
          className={[
            'whitespace-pre',
            isNull ? 'text-stone-500' : (isVisited ? `font-bold rune-float ${depthColor(depth)}` : 'text-stone-300')
          ].join(' ')}
        >
          {prefix}{lineConnector}{isNull ? '∅' : String((node as TreeNode).value)}
        </div>
        {!isNull && ((node as TreeNode).left !== undefined || (node as TreeNode).right !== undefined) && (
          <div>
            {showNulls || (node as TreeNode).left
              ? renderNode((node as TreeNode).left ?? null, nextPrefix, !(node as TreeNode).right, `${keyPath}-L`, depth + 1)
              : null}
            {showNulls || (node as TreeNode).right
              ? renderNode((node as TreeNode).right ?? null, nextPrefix, true, `${keyPath}-R`, depth + 1)
              : null}
          </div>
        )}
      </div>
    );
  };

  if (!puzzle) {
    return (
      <div className="min-h-[180px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-red-950 border-2 border-red-700 rounded-xl">
        <p className="text-red-200 font-medium">Data teka-teki tidak tersedia</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <DungeonCSS />

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
          {/* Sinkronisasi Defuser ↔ Expert */}
          {(isDefuser || isExpert) && syncIssue && (
            <Card className="border-2 border-amber-700 bg-gradient-to-r from-amber-900 to-stone-900">
              <CardContent className="p-4">
                <p className="text-amber-200">
                  ⚠️ Ketidaksinkronan terdeteksi antara petunjuk Defuser dan cabang pohon saat ini; tombol arah kini menyesuaikan otomatis dengan cabang yang tersedia untuk mencegah kebuntuan.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Defuser */}
            {(isDefuser || role === 'host') && (
              <Card className="border-4 border-amber-600 bg-gradient-to-b from-stone-900 to-stone-800">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-300 text-center">🗺️ Misi Navigasi</CardTitle>
                  <CardDescription className="text-center text-stone-300">Susun jejak runik langkah demi langkah</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-xl p-4 border-2 border-stone-700 bg-stone-800/60">
                    <h5 className="text-stone-200 font-semibold mb-2">Instruksi Misi</h5>
                    <p className="text-stone-300">
                      {obfuscate(puzzle.defuserView?.task || 'Bangun urutan langkah dari altar menuju ruang tujuan tanpa menyingkap mantra tersembunyi.')}
                    </p>
                  </div>

                  {/* Opsi traversal */}
                  <div>
                    <h5 className="text-stone-200 font-semibold mb-2">Bangun Jejak</h5>
                    <div className="flex flex-wrap gap-2">
                      {availableDirections.includes('left') && (
                        <Button
                          onMouseEnter={() => setHoverNext('left')}
                          onMouseLeave={() => setHoverNext(null)}
                          onClick={() => addDir('left')}
                          disabled={submitting}
                          variant="secondary"
                          className="bg-indigo-800 text-indigo-100 hover:bg-indigo-700 border border-indigo-600"
                        >
                          {pickLabel('left')}
                        </Button>
                      )}
                      {availableDirections.includes('right') && (
                        <Button
                          onMouseEnter={() => setHoverNext('right')}
                          onMouseLeave={() => setHoverNext(null)}
                          onClick={() => addDir('right')}
                          disabled={submitting}
                          variant="secondary"
                          className="bg-indigo-800 text-indigo-100 hover:bg-indigo-700 border border-indigo-600"
                        >
                          {pickLabel('right')}
                        </Button>
                      )}
                      {availableDirections.length === 0 && (
                        <Badge className="bg-red-800 text-red-100 border-red-700">Tidak ada cabang di simpul ini</Badge>
                      )}
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
                      <Button onClick={removeLastStep} disabled={path.length === 0 || submitting} variant="outline" className="border-amber-600 text-amber-300 hover:bg-amber-900/30">
                        Hapus Terakhir
                      </Button>
                      <Button onClick={clearPath} disabled={path.length === 0 || submitting} variant="outline" className="border-red-600 text-red-300 hover:bg-red-900/30">
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

                  {/* Petunjuk Defuser */}
                  {defuserHints.length > 0 && (
                    <div className="p-4 rounded-xl border-2 border-blue-700 bg-gradient-to-r from-blue-950 to-stone-900">
                      <h5 className="text-blue-200 font-medium mb-2">Bisik-bisik Lorong</h5>
                      <ul className="text-sm text-blue-200/90 space-y-1 list-disc pl-5">
                        {defuserHints.map((h, i) => <li key={i}>{h}</li>)}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Expert */}
            {(isExpert || role === 'host') && (
              <Card className="border-4 border-emerald-700 bg-gradient-to-b from-stone-900 to-emerald-950">
                <CardHeader>
                  <CardTitle className="text-lg text-emerald-300 text-center">🌳 Struktur Pohon</CardTitle>
                  <CardDescription className="text-center text-stone-300">Bimbingan konseptual tanpa membuka solusi</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button type="button" variant="outline" onClick={() => setShowNulls(x => !x)} className="border-stone-600 text-stone-200 hover:bg-stone-800/60">
                      {showNulls ? 'Sembunyikan Ruang Tak Berujung (∅)' : 'Tampilkan Ruang Tak Berujung (∅)'}
                    </Button>
                    <Badge className="bg-stone-700 text-stone-200 border-stone-600">Jejak Defuser disorot</Badge>
                    <Badge className="bg-emerald-800 text-emerald-100 border-emerald-700">Warna ≈ Kedalaman</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowSolveHints(x => !x)}
                      className="border-emerald-600 text-emerald-200 hover:bg-stone-800/60"
                    >
                      {showSolveHints ? 'Sembunyikan Petunjuk Pemecahan' : 'Tampilkan Petunjuk Pemecahan'}
                    </Button>
                  </div>

                  {/* Pohon */}
                  {root ? (
                    <div className="rounded-xl p-4 border-2 border-stone-700 bg-stone-900">
                      <div className="bg-stone-950 rounded-lg p-3 overflow-x-auto border border-stone-700">
                        {renderNode(root as TreeNode, '', true, 'root', 0)}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl p-4 border-2 border-amber-700 bg-gradient-to-r from-amber-900 to-stone-900">
                      <p className="text-amber-200">Pengetahuan Expert sedang dimuat...</p>
                    </div>
                  )}

                  {/* Petunjuk Pembimbingan Expert */}
                  <div className="rounded-xl p-4 border-2 border-emerald-700 bg-gradient-to-r from-emerald-950 to-stone-900">
                    <h5 className="text-emerald-200 font-medium mb-3">🧭 Panduan Pembimbingan Expert</h5>
                    <div className="text-sm text-emerald-200/90 space-y-2">
                      {expertGuidanceHints.map((hint, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-emerald-400 font-bold mt-0.5">•</span>
                          <span>{hint}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strategi Pembimbingan Detail */}
                  <div className="space-y-4">
                    {expertStrategies.map((strategy, idx) => (
                      <div key={idx} className="rounded-xl p-4 border-2 border-teal-700 bg-gradient-to-r from-teal-950 to-stone-900">
                        <h6 className="text-teal-200 font-semibold mb-2">{strategy.title}</h6>
                        <ul className="text-sm text-teal-200/90 space-y-1">
                          {strategy.points.map((point, pointIdx) => (
                            <li key={pointIdx} className="flex items-start gap-2">
                              <span className="text-teal-400 font-bold mt-0.5">→</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Petunjuk Pemecahan Binary Tree/BST */}
                  {showSolveHints && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="rounded-xl p-4 border-2 border-emerald-700 bg-gradient-to-r from-emerald-950 to-stone-900">
                        <h6 className="text-emerald-200 font-semibold mb-2">Identifikasi & Tujuan</h6>
                        <ul className="text-sm text-emerald-200/90 space-y-1 list-disc pl-5">
                          {solveHintsGeneral.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      </div>

                      <div className="rounded-xl p-4 border-2 border-teal-700 bg-gradient-to-r from-teal-950 to-stone-900">
                        <h6 className="text-teal-200 font-semibold mb-2">Aturan & Navigasi BST</h6>
                        <ul className="text-sm text-teal-200/90 space-y-1 list-disc pl-5">
                          {solveHintsBST.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      </div>

                      <div className="rounded-xl p-4 border-2 border-blue-700 bg-gradient-to-r from-blue-950 to-stone-900">
                        <h6 className="text-blue-200 font-semibold mb-2">Strategi Traversal</h6>
                        <ul className="text-sm text-blue-200/90 space-y-1 list-disc pl-5">
                          {solveHintsTraversal.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      </div>

                      <div className="rounded-xl p-4 border-2 border-purple-700 bg-gradient-to-r from-purple-950 to-stone-900">
                        <h6 className="text-purple-200 font-semibold mb-2">Validasi & Edge Case</h6>
                        <ul className="text-sm text-purple-200/90 space-y-1 list-disc pl-5">
                          {solveHintsChecks.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Prinsip penelusuran */}
                  <div className="rounded-xl p-4 border-2 border-stone-700 bg-stone-800/60">
                    <h5 className="text-stone-200 font-semibold mb-2">Ritus Penelusuran</h5>
                    <ul className="text-sm text-stone-300 space-y-1 list-disc pl-5">
                      <li>Di hadapan altar, timbang nilai sang penjaga; barat bila tamu lebih ringan, timur bila lebih berat, tanpa menyebut angka sakralnya.</li>
                      <li>Ajukan pertanyaan penuntun, pastikan tiap langkah dipahami, dan biarkan jejak berbicara sebelum melangkah lagi.</li>
                      <li>Jangan ucapkan jejak akhir; bimbing hanya bentuk aturan, bukan hasilnya, agar sumpah perjalanan tetap bermakna.</li>
                    </ul>
                  </div>

                  {/* Label ritus */}
                  {puzzle.expertView?.traversalMethods && (
                    <div className="rounded-xl p-4 border-2 border-purple-700 bg-gradient-to-r from-purple-950 to-stone-900">
                      <h5 className="text-purple-200 font-medium mb-2">Bentuk Ritus</h5>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(puzzle.expertView.traversalMethods).map((name) => (
                          <Badge key={name} className="bg-purple-800 text-purple-100 border-purple-700">{name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Lore BST */}
          <Card className="border-4 border-purple-700 bg-gradient-to-br from-stone-900 to-purple-950">
            <CardHeader>
              <CardTitle className="text-purple-300 text-lg">📜 Gulungan Ritus BST</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl border-2 border-amber-700 bg-stone-800/60">
                  <h6 className="text-amber-300 font-semibold mb-2">Hukum Altar</h6>
                  <ul className="text-stone-200 space-y-1 list-disc pl-5">
                    <li>Tiap simpul hanya boleh menurunkan dua lorong, satu ke barat dan satu ke timur.</li>
                    <li>Pada BST: kiri {'<'} induk {'<'} kanan, dalam pengurutan nilai yang dijaga para penjaga gerbang.</li>
                    <li>Altar adalah simpul pertama; ruang tak berujung adalah ujung lorong tanpa cabang lagi.</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl border-2 border-blue-700 bg-stone-800/60">
                  <h6 className="text-blue-300 font-semibold mb-2">Teka-teki Penelusuran</h6>
                  {/* FIX: Hapus <ul> duplikat/terpotong, gunakan satu <ul> yang valid */}
                  <ul className="text-stone-200 space-y-1 list-disc pl-5">
                    <li>Jika nilai tamu lebih kecil dari penjaga, melangkahlah ke barat; jika lebih besar, menujulah ke timur.</li>
                    <li>Jejak yang kau tulis adalah sumpah perjalanan; hapus langkah yang ragu dan jagalah ritmemu.</li>
                    <li>Bila dua lorong menyamar, dengarkan bisik selisih—ia tak pernah berbohong.</li>
                    <li>Jangan terpikat satu ritus; terkadang bentuk kunjungan berbeda menyingkap kisi makna yang tersembunyi.</li>
                    <li>Uji pemahaman di tiap simpul sebelum bergerak; biarkan jejak membuktikan arah, bukan firasat semata.</li>
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
