// resources/js/Components/Game/NavigationChallengeView.tsx
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
  const [showSolveHints, setShowSolveHints] = useState(false);

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';

  // Animasi & tema dungeon (ringkas)
  const DungeonCSS = () => (
    <style>{`
      @keyframes torchFlicker { 0%,100%{opacity:1} 25%{opacity:.86} 50%{opacity:.75} 75%{opacity:.92} }
      @keyframes runeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
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
      .replace(/\b(atas|up|naik)\b/gi, 'tangga menuju puncak')
      .replace(/\b(bawah|down|turun)\b/gi, 'tangga menuju palung')
      .replace(/\b(daun|leaf)\b/gi, 'ruang tak berujung')
      .replace(/\b(preorder|inorder|postorder)\b/gi, 'ritus penelusuran')
      .replace(/\b(jalur|path)\b/gi, 'jejak runik');

  // Normalisasi langkah ke 'left'/'right' (UP/DOWN dipakai sebagai aksi, bukan langkah)
  const normalizeStep = (s: string): 'left' | 'right' | null => {
    const x = s.trim().toLowerCase();
    const leftWords = ['left','kiri','lorong barat','l','west','barat'];
    const rightWords = ['right','kanan','lorong timur','r','east','timur'];
    if (leftWords.includes(x)) return 'left';
    if (rightWords.includes(x)) return 'right';
    // 'up'/'down' tidak memetakan node anak, ditangani sebagai aksi (undo/auto descend)
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

  // Arah yang tersedia pada node saat ini
  const availableDirections = useMemo(() => {
    const dirs: Array<'left' | 'right'> = [];
    if (currentNode && typeof currentNode === 'object') {
      if ((currentNode as TreeNode).left) dirs.push('left');
      if ((currentNode as TreeNode).right) dirs.push('right');
    }
    return dirs;
  }, [currentNode]);

  // Label tombol sesuai opsi Defuser
  const traversalOptions = toArray(puzzle?.defuserView?.traversalOptions);
  const pickLabel = (dir: 'left' | 'right' | 'up' | 'down') => {
    const maps: Record<typeof dir, string[]> = {
      left: ['left','kiri','lorong barat','l','west','barat'],
      right: ['right','kanan','lorong timur','r','east','timur'],
      up: ['up','atas','naik','u','north','utara'],
      down: ['down','bawah','turun','d','south','selatan'],
    };
    const picked = traversalOptions.find(o => maps[dir].includes(o.toLowerCase()));
    if (picked) return picked;
    // Default fallback label
    return dir === 'left' ? 'Kiri' : dir === 'right' ? 'Kanan' : dir === 'up' ? 'Atas' : 'Bawah';
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

  // Petunjuk Expert (pembimbingan)
  const expertGuidanceHints = useMemo(() => ([
    'Bimbing dengan pertanyaan terbuka: "Apa yang kamu lihat di simpul ini?" atau "Bagaimana hubungan nilai ini dengan nilai sebelumnya?"',
    'Jangan langsung memberikan jawaban; gunakan analogi agar defuser membangun intuisi mereka sendiri',
    'Gunakan teknik Socratic: biarkan defuser menemukan pola melalui pertanyaan bertahap',
    'Fokus pada proses berpikir, bukan hasil akhir: minta alasan di balik tiap pilihan',
  ]), []);

  const expertStrategies = useMemo(() => ([
    {
      title: 'Teknik Bertanya Efektif',
      points: [
        'Mulai dengan observasi: "Apa yang kamu amati di sini?"',
        'Lanjut analisis: "Mengapa kamu berpikir demikian?"',
        'Tutup dengan prediksi: "Apa yang terjadi jika pilih arah ini?"',
      ],
    },
    {
      title: 'Strategi Pembimbingan',
      points: [
        'Berikan waktu jeda setelah pertanyaan (3–5 detik)',
        'Parafrase jawaban untuk konfirmasi pemahaman',
        'Berikan petunjuk bertingkat: umum → spesifik',
      ],
    },
  ]), []);

  const solveHintsGeneral = useMemo(() => ([
    'Identifikasi tipe pohon: Binary Tree (≤2 anak) atau Binary Search Tree (BST) dengan aturan urutan nilai.',
    'Tentukan tujuan: mencari nilai, validasi BST, menghitung tinggi/daun, atau rekonstruksi dari traversal.',
  ]), []);

  const solveHintsBST = useMemo(() => ([
    'Aturan BST: semua nilai di kiri < akar < semua nilai di kanan pada setiap simpul.',
    'Gunakan inorder (Left–Root–Right) untuk mengecek urutan naik; jika tidak terurut, struktur bukan BST valid.',
    'Mencari nilai X: jika X < simpul ⇒ kiri; jika X > simpul ⇒ kanan; jika sama ⇒ selesai.',
  ]), []);

  const solveHintsTraversal = useMemo(() => ([
    'Inorder: Left–Root–Right, cocok untuk urutan menaik pada BST.',
    'Preorder: Root–Left–Right, cocok untuk rekonstruksi/penyalinan struktur.',
    'Postorder: Left–Right–Root, cocok untuk evaluasi/pelepasan struktur.',
    'Level-order (BFS): telusuri per level untuk jarak/level terdekat.',
  ]), []);

  const solveHintsChecks = useMemo(() => ([
    'Validasi BST berbasis rentang: perbarui batas saat turun kiri/kanan dan pastikan nilai berada dalam rentangnya.',
    'Untuk cek "terurut atau tidak": hasil inorder harus nondecreasing (atau strictly increasing sesuai kebijakan duplikat).',
    'Estimasi kompleksitas: BST seimbang ~ O(log n); tidak seimbang bisa mendekati O(n).',
  ]), []);

  const addDir = (dir: 'left' | 'right') => {
    const label = pickLabel(dir);
    setPath(prev => [...prev, label]);
  };
  const removeLastStep = () => setPath(prev => prev.slice(0, -1));
  const clearPath = () => setPath([]);

  // Aksi "turun" otomatis: bila hanya satu cabang tersedia, pilih cabang itu; jika dua, biarkan user memilih
  const descendOne = () => {
    if (availableDirections.length === 1) {
      addDir(availableDirections[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (path.length === 0) return;
    onSubmitAttempt(path.join(','));
  };

  // Node yang dilalui (highlight)
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
            isNull ? 'text-stone-500' : (isVisited ? `font-bold rune-float ${depthColor(depth)}` : 'text-stone-300'),
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
      <div className="min-h-[180px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-red-950 border border-red-700/60 rounded-xl">
        <p className="text-red-200 font-medium">Data teka-teki tidak tersedia</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <DungeonCSS />

      <Card className="overflow-hidden border border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
        <CardHeader className="relative">
          <div className="absolute top-3 left-3 text-2xl torch-flicker">🔥</div>
          <div className="absolute top-3 right-3 text-2xl torch-flicker">🔥</div>
          <CardTitle className="text-amber-300 text-2xl">{puzzle.title || 'Tantangan Navigasi'}</CardTitle>
          <CardDescription className="text-stone-300">
            {puzzle.description || 'Menelusuri struktur pohon di lorong CodeAlpha Dungeon.'}
          </CardDescription>
          <div className="pt-2 flex flex-wrap gap-2">
            <Badge className="bg-amber-800 text-amber-100 border border-amber-700/50">🏰 Mode Dungeon</Badge>
            <Badge className="bg-stone-700 text-stone-200 border border-stone-600/50">🧭 Navigasi Pohon</Badge>
            {role && <Badge className="bg-purple-800 text-purple-100 border border-purple-700/50">🎭 Peran: {role}</Badge>}
            {puzzle?.defuserView?.targetValue != null && (
              <Badge className="bg-indigo-800 text-indigo-100 border border-indigo-700/50">
                Target: {obfuscate(String(puzzle.defuserView.targetValue))}
              </Badge>
            )}
            {puzzle?.defuserView?.grid_size && (
              <Badge className="bg-stone-800 text-stone-200 border border-stone-700/50">
                Grid: {String(puzzle.defuserView.grid_size)}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Sinkronisasi Defuser ↔ Expert */}
          {(isDefuser || isExpert) && syncIssue && (
            <Card className="border border-amber-700/40 bg-gradient-to-r from-amber-900/40 to-stone-900/40">
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
              <Card className="border border-amber-600/40 bg-gradient-to-b from-stone-900/60 to-stone-800/40">
                <CardHeader>
                  <CardTitle className="text-base text-amber-300 text-center">🗺️ Arahan Misi</CardTitle>
                  <CardDescription className="text-center text-stone-300">Susun jejak runik langkah demi langkah</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-xl p-4 border border-stone-700/40 bg-stone-800/40">
                    <h5 className="text-stone-200 font-semibold mb-2">Arahan Misi</h5>
                    <p className="text-stone-300">
                      {obfuscate(puzzle.defuserView?.task || 'Susun urutan langkah dari altar menuju ruang tujuan tanpa menyingkap mantra tersembunyi.')}
                    </p>
                  </div>

                  {/* Rangkai Jejak */}
                  <div>
                    <h5 className="text-stone-200 font-semibold mb-2">Rangkai Jejak</h5>
                    <div className="flex flex-wrap gap-2">
                      {/* Atas (naik tingkat = undo) */}
                      <Button
                        onClick={removeLastStep}
                        disabled={path.length === 0 || submitting}
                        variant="outline"
                        className="border-stone-600/60 text-stone-200 hover:bg-stone-800/60"
                        title="Naik satu tingkat (undo langkah terakhir)"
                      >
                        {pickLabel('up')}
                      </Button>

                      {/* Bawah (turun otomatis bila hanya satu cabang tersedia) */}
                      <Button
                        onClick={descendOne}
                        disabled={submitting || availableDirections.length !== 1}
                        variant="outline"
                        className="border-stone-600/60 text-stone-200 hover:bg-stone-800/60 disabled:opacity-60"
                        title="Turun satu tingkat bila hanya satu cabang tersedia"
                      >
                        {pickLabel('down')}
                      </Button>

                      {/* Kiri */}
                      {availableDirections.includes('left') && (
                        <Button
                          onMouseEnter={() => setHoverNext('left')}
                          onMouseLeave={() => setHoverNext(null)}
                          onClick={() => addDir('left')}
                          disabled={submitting}
                          variant="secondary"
                          className="bg-indigo-800 text-indigo-100 hover:bg-indigo-700 border border-indigo-600/60"
                        >
                          {pickLabel('left')}
                        </Button>
                      )}

                      {/* Kanan */}
                      {availableDirections.includes('right') && (
                        <Button
                          onMouseEnter={() => setHoverNext('right')}
                          onMouseLeave={() => setHoverNext(null)}
                          onClick={() => addDir('right')}
                          disabled={submitting}
                          variant="secondary"
                          className="bg-indigo-800 text-indigo-100 hover:bg-indigo-700 border border-indigo-600/60"
                        >
                          {pickLabel('right')}
                        </Button>
                      )}

                      {availableDirections.length === 0 && (
                        <Badge className="bg-red-800 text-red-100 border border-red-700/60">Tidak ada cabang di simpul ini</Badge>
                      )}
                    </div>
                  </div>

                  {/* Jejak saat ini */}
                  <div>
                    <h5 className="text-stone-200 font-semibold mb-2">Jejak Saat Ini</h5>
                    <div className="min-h-[44px] rounded-xl p-3 border border-amber-700/50 bg-stone-900/70 flex items-center">
                      {path.length > 0 ? (
                        <span className="font-mono text-amber-300 rune-float">{path.join(' → ')}</span>
                      ) : (
                        <span className="text-stone-400 italic">Belum ada jejak</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button onClick={removeLastStep} disabled={path.length === 0 || submitting} variant="outline" className="border-amber-600/60 text-amber-300 hover:bg-amber-900/30">
                        Hapus Terakhir
                      </Button>
                      <Button onClick={clearPath} disabled={path.length === 0 || submitting} variant="outline" className="border-red-600/60 text-red-300 hover:bg-red-900/30">
                        Bersihkan
                      </Button>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <Button
                      type="submit"
                      disabled={path.length === 0 || submitting}
                      className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-semibold py-3 rounded-xl"
                    >
                      {submitting ? 'Mengirim...' : 'Kirim Jejak'}
                    </Button>
                  </form>

                  {/* Petunjuk Defuser */}
                  {defuserHints.length > 0 && (
                    <div className="p-4 rounded-xl border border-blue-700/40 bg-gradient-to-r from-blue-950/40 to-stone-900/30">
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
              <Card className="border border-emerald-700/40 bg-gradient-to-b from-stone-900/60 to-emerald-950/40">
                <CardHeader>
                  <CardTitle className="text-base text-emerald-300 text-center">🌳 Struktur Pohon</CardTitle>
                  <CardDescription className="text-center text-stone-300">Bimbingan konseptual tanpa membuka solusi</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button type="button" variant="outline" onClick={() => setShowNulls(x => !x)} className="border-stone-600/60 text-stone-200 hover:bg-stone-800/60">
                      {showNulls ? 'Sembunyikan Ruang Tak Berujung (∅)' : 'Tampilkan Ruang Tak Berujung (∅)'}
                    </Button>
                    <Badge className="bg-stone-700 text-stone-200 border border-stone-600/50">Jejak Defuser disorot</Badge>
                    <Badge className="bg-emerald-800 text-emerald-100 border border-emerald-700/50">Warna ≈ Kedalaman</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowSolveHints(x => !x)}
                      className="border-emerald-600/60 text-emerald-200 hover:bg-stone-800/60"
                    >
                      {showSolveHints ? 'Sembunyikan Petunjuk Pemecahan' : 'Tampilkan Petunjuk Pemecahan'}
                    </Button>
                  </div>

                  {/* Pohon */}
                  {root ? (
                    <div className="rounded-xl p-4 border border-stone-700/50 bg-stone-900">
                      <div className="bg-stone-950 rounded-lg p-3 overflow-x-auto border border-stone-700/50">
                        {renderNode(root as TreeNode, '', true, 'root', 0)}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl p-4 border border-amber-700/50 bg-gradient-to-r from-amber-900/40 to-stone-900/30">
                      <p className="text-amber-200">Pengetahuan Expert sedang dimuat...</p>
                    </div>
                  )}

                  {/* Petunjuk Pembimbingan Expert */}
                  <div className="rounded-xl p-4 border border-emerald-700/50 bg-gradient-to-r from-emerald-950/40 to-stone-900/30">
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

                  {/* Strategi Pembimbingan */}
                  <div className="space-y-4">
                    {expertStrategies.map((strategy, idx) => (
                      <div key={idx} className="rounded-xl p-4 border border-teal-700/50 bg-gradient-to-r from-teal-950/40 to-stone-900/30">
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

                  {/* Petunjuk Pemecahan (opsional) */}
                  {showSolveHints && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="rounded-xl p-4 border border-emerald-700/50 bg-gradient-to-r from-emerald-950/40 to-stone-900/30">
                        <h6 className="text-emerald-200 font-semibold mb-2">Identifikasi & Tujuan</h6>
                        <ul className="text-sm text-emerald-200/90 space-y-1 list-disc pl-5">
                          {solveHintsGeneral.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      </div>

                      <div className="rounded-xl p-4 border border-teal-700/50 bg-gradient-to-r from-teal-950/40 to-stone-900/30">
                        <h6 className="text-teal-200 font-semibold mb-2">Aturan & Navigasi BST</h6>
                        <ul className="text-sm text-teal-200/90 space-y-1 list-disc pl-5">
                          {solveHintsBST.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      </div>

                      <div className="rounded-xl p-4 border border-blue-700/50 bg-gradient-to-r from-blue-950/40 to-stone-900/30">
                        <h6 className="text-blue-200 font-semibold mb-2">Strategi Traversal</h6>
                        <ul className="text-sm text-blue-200/90 space-y-1 list-disc pl-5">
                          {solveHintsTraversal.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      </div>

                      <div className="rounded-xl p-4 border border-purple-700/50 bg-gradient-to-r from-purple-950/40 to-stone-900/30">
                        <h6 className="text-purple-200 font-semibold mb-2">Validasi & Edge Case</h6>
                        <ul className="text-sm text-purple-200/90 space-y-1 list-disc pl-5">
                          {solveHintsChecks.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Prinsip penelusuran */}
                  <div className="rounded-xl p-4 border border-stone-700/50 bg-stone-800/40">
                    <h5 className="text-stone-200 font-semibold mb-2">Ritus Penelusuran</h5>
                    <ul className="text-sm text-stone-300 space-y-1 list-disc pl-5">
                      <li>Di hadapan altar, timbang nilai sang penjaga; barat bila tamu lebih ringan, timur bila lebih berat, tanpa menyebut angka sakralnya.</li>
                      <li>Ajukan pertanyaan penuntun, pastikan tiap langkah dipahami, dan biarkan jejak berbicara sebelum melangkah lagi.</li>
                      <li>Jangan ucapkan jejak akhir; bimbing hanya bentuk aturan, bukan hasilnya, agar sumpah perjalanan tetap bermakna.</li>
                    </ul>
                  </div>

                  {/* Label ritus */}
                  {puzzle.expertView?.traversalMethods && (
                    <div className="rounded-xl p-4 border border-purple-700/50 bg-gradient-to-r from-purple-950/40 to-stone-900/30">
                      <h5 className="text-purple-200 font-medium mb-2">Bentuk Ritus</h5>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(puzzle.expertView.traversalMethods).map((name) => (
                          <Badge key={name} className="bg-purple-800 text-purple-100 border border-purple-700/60">{name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Lore BST */}
          <Card className="border border-purple-700/40 bg-gradient-to-br from-stone-900/60 to-purple-950/30">
            <CardHeader>
              <CardTitle className="text-purple-300 text-base">📜 Gulungan Ritus BST</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl border border-amber-700/40 bg-stone-800/40">
                  <h6 className="text-amber-300 font-semibold mb-2">Hukum Altar</h6>
                  <ul className="text-stone-200 space-y-1 list-disc pl-5">
                    <li>Tiap simpul ≤ 2 lorong: satu ke barat, satu ke timur.</li>
                    <li>Pada BST: kiri {'<'} induk {'<'} kanan, menjaga urutan nilai.</li>
                    <li>Altar = simpul pertama; ruang tak berujung = ujung lorong tanpa cabang.</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl border border-blue-700/40 bg-stone-800/40">
                  <h6 className="text-blue-300 font-semibold mb-2">Teka-teki Penelusuran</h6>
                  <ul className="text-stone-200 space-y-1 list-disc pl-5">
                    <li>Jika tamu {'<'} penjaga ⇒ barat; jika {'>'} penjaga ⇒ timur.</li>
                    <li>Jejak adalah sumpah perjalanan; rapikan langkah ragu dan jaga ritme.</li>
                    <li>Bila dua lorong menyamar, dengarkan bisik selisih—ia tak berbohong.</li>
                    <li>Coba beragam ritus; masing-masing menyingkap kisi makna berbeda.</li>
                    <li>Uji pemahaman di tiap simpul; biarkan jejak membuktikan arah.</li>
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
