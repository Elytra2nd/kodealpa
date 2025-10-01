// resources/js/Components/Game/NavigationChallengeView.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Alert, AlertDescription } from '@/Components/ui/alert';

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

type Direction = 'left' | 'right';

export default function NavigationChallengeView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const [path, setPath] = useState<string[]>([]);
  const [showNulls, setShowNulls] = useState(false);
  const [hoverNext, setHoverNext] = useState<Direction | null>(null);
  const [showSolveHints, setShowSolveHints] = useState(false);

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';

  // Memoized CSS animations
  const DungeonCSS = useMemo(() => (
    <style>{`
      @keyframes torchFlicker { 0%,100%{opacity:1} 25%{opacity:.86} 50%{opacity:.75} 75%{opacity:.92} }
      @keyframes runeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
      .rune-float { animation: runeFloat 3.2s ease-in-out infinite; }
    `}</style>
  ), []);

  // Utility: normalize array
  const toArray = useCallback((data: any): string[] => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') return [data];
    return [];
  }, []);

  // Obfuscation mapping
  const obfuscate = useCallback((text: string): string => {
    const runeMap: Record<string, string> = {
      '0': '◇', '1': '†', '2': '♁', '3': '♆', '4': '♄',
      '5': '♃', '6': '☿', '7': '☼', '8': '◈', '9': '★'
    };

    return String(text)
      .replace(/\d/g, (d) => runeMap[d] ?? d)
      .replace(/\b(akar|root)\b/gi, 'altar')
      .replace(/\b(kiri|left)\b/gi, 'lorong barat')
      .replace(/\b(kanan|right)\b/gi, 'lorong timur')
      .replace(/\b(atas|up|naik)\b/gi, 'tangga menuju puncak')
      .replace(/\b(bawah|down|turun)\b/gi, 'tangga menuju palung')
      .replace(/\b(daun|leaf)\b/gi, 'ruang tak berujung')
      .replace(/\b(preorder|inorder|postorder)\b/gi, 'ritus penelusuran')
      .replace(/\b(jalur|path)\b/gi, 'jejak runik');
  }, []);

  // Normalize step to direction
  const normalizeStep = useCallback((step: string): Direction | null => {
    const normalized = step.trim().toLowerCase();
    const leftWords = ['left', 'kiri', 'lorong barat', 'l', 'west', 'barat'];
    const rightWords = ['right', 'kanan', 'lorong timur', 'r', 'east', 'timur'];

    if (leftWords.includes(normalized)) return 'left';
    if (rightWords.includes(normalized)) return 'right';
    return null;
  }, []);

  // Get tree root
  const root: TreeNode | undefined = puzzle?.expertView?.tree?.root;

  // Current node based on path
  const currentNode = useMemo(() => {
    let current: TreeNode | null | undefined = root;

    for (const stepRaw of path) {
      const step = normalizeStep(stepRaw);
      if (!step || !current) return current ?? null;

      const next = (current as any)[step] as TreeNode | null | undefined;
      if (!next) return current;
      current = next;
    }

    return current ?? null;
  }, [root, path, normalizeStep]);

  // Available directions at current node
  const availableDirections = useMemo((): Direction[] => {
    const dirs: Direction[] = [];
    if (currentNode && typeof currentNode === 'object') {
      if ((currentNode as TreeNode).left) dirs.push('left');
      if ((currentNode as TreeNode).right) dirs.push('right');
    }
    return dirs;
  }, [currentNode]);

  // Get button label for direction
  const pickLabel = useCallback((dir: 'left' | 'right' | 'up' | 'down'): string => {
    const traversalOptions = toArray(puzzle?.defuserView?.traversalOptions);
    const maps: Record<typeof dir, string[]> = {
      left: ['left', 'kiri', 'lorong barat', 'l', 'west', 'barat'],
      right: ['right', 'kanan', 'lorong timur', 'r', 'east', 'timur'],
      up: ['up', 'atas', 'naik', 'u', 'north', 'utara'],
      down: ['down', 'bawah', 'turun', 'd', 'south', 'selatan'],
    };

    const picked = traversalOptions.find(o => maps[dir].includes(o.toLowerCase()));
    if (picked) return picked;

    const defaults = { left: 'Kiri', right: 'Kanan', up: 'Atas', down: 'Bawah' };
    return defaults[dir];
  }, [puzzle, toArray]);

  // Detect synchronization issues
  const syncIssue = useMemo(() => {
    if (!currentNode) return root ? null : 'Struktur pohon belum tersedia.';

    const hasLeft = (currentNode as TreeNode).left != null;
    const hasRight = (currentNode as TreeNode).right != null;
    const traversalOptions = toArray(puzzle?.defuserView?.traversalOptions);
    const offered = traversalOptions.map(o => normalizeStep(o)).filter(Boolean) as Direction[];
    const anyOfferedInvalid = offered.some(d =>
      (d === 'left' && !hasLeft) || (d === 'right' && !hasRight)
    );

    return anyOfferedInvalid
      ? 'Petunjuk arah pada Defuser tidak cocok dengan cabang yang tersedia.'
      : null;
  }, [currentNode, puzzle, root, toArray, normalizeStep]);

  // Defuser hints
  const defuserHints = useMemo(() => {
    const base = toArray(puzzle?.defuserView?.hints);
    const extra = [
      'Jejak runik tak selalu lurus; teguk napas di tiap persimpangan dan amati penjaga gerbangnya.',
      'Bandingkan nilai penjaga sebelum memilih barat atau timur; namun jangan terperangkap fatamorgana keseimbangan semu.',
      'Bila dua lorong tampak setara, dengarkan bisik selisih—ia membimbing tanpa menunjuk langsung.',
      'Pilih ritus penelusuran yang menyingkap makna paling banyak, bukan yang terdengar paling nyaring.',
    ];
    return [...base, ...extra].map(obfuscate);
  }, [puzzle, toArray, obfuscate]);

  // Path management functions
  const addDirection = useCallback((dir: Direction) => {
    const label = pickLabel(dir);
    setPath(prev => [...prev, label]);
  }, [pickLabel]);

  const removeLastStep = useCallback(() => {
    setPath(prev => prev.slice(0, -1));
  }, []);

  const clearPath = useCallback(() => {
    setPath([]);
  }, []);

  const descendOne = useCallback(() => {
    if (availableDirections.length === 1) {
      addDirection(availableDirections[0]);
    }
  }, [availableDirections, addDirection]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (path.length === 0) return;
    onSubmitAttempt(path.join(','));
  }, [path, onSubmitAttempt]);

  // Visited nodes tracking
  const visitedNodes = useMemo(() => {
    const set = new WeakSet<object>();
    if (!root) return set;

    set.add(root as object);
    let current: TreeNode | null | undefined = root;

    for (const stepRaw of path) {
      const step = normalizeStep(stepRaw);
      if (!step || !current) return set;

      const next = (current as any)[step] as TreeNode | null | undefined;
      if (!next) return set;

      set.add(next as object);
      current = next;
    }

    if (hoverNext && current && (current as any)[hoverNext]) {
      set.add(((current as any)[hoverNext]) as object);
    }

    return set;
  }, [root, path, hoverNext, normalizeStep]);

  // Depth color coding
  const depthColor = useCallback((depth: number): string => {
    const palette = [
      'text-emerald-300',
      'text-amber-300',
      'text-purple-300',
      'text-indigo-300',
      'text-blue-300',
      'text-rose-300'
    ];
    return palette[depth % palette.length];
  }, []);

  // Tree renderer with proper typing
  const renderNode = useCallback((
    node: TreeNode | null,
    prefix = '',
    isLast = true,
    keyPath = 'root',
    depth = 0
  ): React.ReactNode => {
    const isNull = node === null;
    const lineConnector = prefix ? (isLast ? '└── ' : '├── ') : '';
    const nextPrefix = prefix + (prefix ? (isLast ? '    ' : '│   ') : '');
    const isVisited = node && visitedNodes.has(node as object);

    const nodeClasses = [
      'whitespace-pre leading-relaxed',
      isNull
        ? 'text-stone-500'
        : isVisited
          ? `font-bold rune-float ${depthColor(depth)}`
          : 'text-stone-300'
    ].join(' ');

    return (
      <div key={keyPath} className="font-mono text-sm">
        <div className={nodeClasses}>
          {prefix}{lineConnector}{isNull ? '∅' : String((node as TreeNode).value)}
        </div>
        {!isNull && ((node as TreeNode).left !== undefined || (node as TreeNode).right !== undefined) && (
          <div>
            {(showNulls || (node as TreeNode).left) &&
              renderNode((node as TreeNode).left ?? null, nextPrefix, !(node as TreeNode).right, `${keyPath}-L`, depth + 1)
            }
            {(showNulls || (node as TreeNode).right) &&
              renderNode((node as TreeNode).right ?? null, nextPrefix, true, `${keyPath}-R`, depth + 1)
            }
          </div>
        )}
      </div>
    );
  }, [showNulls, visitedNodes, depthColor]);

  if (!puzzle) {
    return (
      <Alert variant="destructive" className="min-h-[180px] flex items-center justify-center">
        <AlertDescription>Data teka-teki tidak tersedia</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 relative">
      {DungeonCSS}

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
          {/* Sync Warning */}
          {(isDefuser || isExpert) && syncIssue && (
            <Alert className="border-amber-700/40 bg-gradient-to-r from-amber-900/40 to-stone-900/40">
              <AlertDescription className="text-amber-200">
                ⚠️ {syncIssue} Tombol arah menyesuaikan otomatis dengan cabang tersedia.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* === DEFUSER PANEL === */}
            {(isDefuser || role === 'host') && (
              <Card className="border border-amber-600/40 bg-gradient-to-b from-stone-900/60 to-stone-800/40">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-300 flex items-center gap-2">
                    <span>🗺️</span>
                    <span>Arahan Misi</span>
                  </CardTitle>
                  <CardDescription className="text-stone-300">
                    Susun jejak runik langkah demi langkah
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Mission Description */}
                  <div className="rounded-xl p-4 border border-stone-700/40 bg-stone-800/40">
                    <h5 className="text-stone-200 font-semibold mb-2 text-sm">📜 Arahan Misi</h5>
                    <p className="text-stone-300 text-sm leading-relaxed">
                      {obfuscate(puzzle.defuserView?.task || 'Susun urutan langkah dari altar menuju ruang tujuan tanpa menyingkap mantra tersembunyi.')}
                    </p>
                  </div>

                  {/* Navigation Controls */}
                  <div>
                    <h5 className="text-stone-200 font-semibold mb-3 text-sm">🧭 Kontrol Navigasi</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Up - Undo */}
                      <Button
                        onClick={removeLastStep}
                        disabled={path.length === 0 || submitting}
                        variant="outline"
                        size="sm"
                        className="border-stone-600/60 text-stone-200 hover:bg-stone-800/60"
                        title="Naik satu tingkat (undo langkah terakhir)"
                      >
                        ⬆️ {pickLabel('up')}
                      </Button>

                      {/* Down - Auto descend */}
                      <Button
                        onClick={descendOne}
                        disabled={submitting || availableDirections.length !== 1}
                        variant="outline"
                        size="sm"
                        className="border-stone-600/60 text-stone-200 hover:bg-stone-800/60 disabled:opacity-50"
                        title="Turun otomatis bila hanya satu cabang"
                      >
                        ⬇️ {pickLabel('down')}
                      </Button>

                      {/* Left */}
                      {availableDirections.includes('left') && (
                        <Button
                          onMouseEnter={() => setHoverNext('left')}
                          onMouseLeave={() => setHoverNext(null)}
                          onClick={() => addDirection('left')}
                          disabled={submitting}
                          size="sm"
                          className="bg-indigo-800 text-indigo-100 hover:bg-indigo-700 border border-indigo-600/60"
                        >
                          ⬅️ {pickLabel('left')}
                        </Button>
                      )}

                      {/* Right */}
                      {availableDirections.includes('right') && (
                        <Button
                          onMouseEnter={() => setHoverNext('right')}
                          onMouseLeave={() => setHoverNext(null)}
                          onClick={() => addDirection('right')}
                          disabled={submitting}
                          size="sm"
                          className="bg-indigo-800 text-indigo-100 hover:bg-indigo-700 border border-indigo-600/60"
                        >
                          ➡️ {pickLabel('right')}
                        </Button>
                      )}
                    </div>

                    {availableDirections.length === 0 && (
                      <Badge className="bg-red-800 text-red-100 border border-red-700/60 mt-2">
                        Tidak ada cabang di simpul ini
                      </Badge>
                    )}
                  </div>

                  {/* Current Path Display */}
                  <div>
                    <h5 className="text-stone-200 font-semibold mb-2 text-sm">🛤️ Jejak Saat Ini</h5>
                    <div className="min-h-[60px] rounded-xl p-4 border border-amber-700/50 bg-stone-900/70 flex items-center">
                      {path.length > 0 ? (
                        <span className="font-mono text-sm text-amber-300 rune-float break-all">
                          {path.join(' → ')}
                        </span>
                      ) : (
                        <span className="text-stone-400 italic text-sm">Belum ada jejak</span>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={removeLastStep}
                        disabled={path.length === 0 || submitting}
                        variant="outline"
                        size="sm"
                        className="border-amber-600/60 text-amber-300 hover:bg-amber-900/30"
                      >
                        Hapus Terakhir
                      </Button>
                      <Button
                        onClick={clearPath}
                        disabled={path.length === 0 || submitting}
                        variant="outline"
                        size="sm"
                        className="border-red-600/60 text-red-300 hover:bg-red-900/30"
                      >
                        Bersihkan
                      </Button>
                    </div>
                  </div>

                  {/* Submit */}
                  <form onSubmit={handleSubmit}>
                    <Button
                      type="submit"
                      disabled={path.length === 0 || submitting}
                      className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 hover:from-amber-500 hover:via-amber-600 hover:to-red-500 text-stone-900 font-semibold"
                    >
                      {submitting ? 'Mengirim...' : '✨ Kirim Jejak'}
                    </Button>
                  </form>

                  {/* Defuser Hints */}
                  {defuserHints.length > 0 && (
                    <div className="p-4 rounded-xl border border-blue-700/40 bg-gradient-to-r from-blue-950/40 to-stone-900/30">
                      <h5 className="text-blue-200 font-medium mb-2 text-sm flex items-center gap-2">
                        <span>💡</span>
                        <span>Bisik-bisik Lorong</span>
                      </h5>
                      <ul className="text-xs text-blue-200/90 space-y-1.5 list-disc pl-5">
                        {defuserHints.map((h, i) => <li key={i}>{h}</li>)}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* === EXPERT PANEL === */}
            {(isExpert || role === 'host') && (
              <Card className="border border-emerald-700/40 bg-gradient-to-b from-stone-900/60 to-emerald-950/40">
                <CardHeader>
                  <CardTitle className="text-lg text-emerald-300 flex items-center gap-2">
                    <span>🌳</span>
                    <span>Panel Expert</span>
                  </CardTitle>
                  <CardDescription className="text-stone-300">
                    Struktur pohon & panduan pembimbingan
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Tree Controls */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNulls(x => !x)}
                      className="border-stone-600/60 text-stone-200 hover:bg-stone-800/60 text-xs"
                    >
                      {showNulls ? '👁️ Sembunyikan ∅' : '👁️‍🗨️ Tampilkan ∅'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSolveHints(x => !x)}
                      className="border-emerald-600/60 text-emerald-200 hover:bg-emerald-900/30 text-xs"
                    >
                      {showSolveHints ? '📕 Sembunyikan Petunjuk' : '📗 Tampilkan Petunjuk'}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-stone-700 text-stone-200 border border-stone-600/50 text-xs">
                      Jejak disorot
                    </Badge>
                    <Badge className="bg-emerald-800 text-emerald-100 border border-emerald-700/50 text-xs">
                      Warna = Kedalaman
                    </Badge>
                  </div>

                  {/* Binary Tree Visualization */}
                  <div className="space-y-3">
                    <h5 className="text-emerald-200 font-semibold text-sm flex items-center gap-2">
                      <span>🎄</span>
                      <span>Visualisasi Pohon</span>
                    </h5>

                    {root ? (
                      <div className="rounded-xl p-4 border-2 border-emerald-700/50 bg-stone-950">
                        <div className="bg-stone-900 rounded-lg p-4 overflow-x-auto border border-stone-700/50 max-h-[500px] overflow-y-auto">
                          {renderNode(root as TreeNode, '', true, 'root', 0)}
                        </div>

                        {/* Legend */}
                        <div className="mt-3 pt-3 border-t border-stone-700/50">
                          <p className="text-xs text-stone-400 mb-2">Legenda:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-300 font-bold">█</span>
                              <span className="text-stone-300">Node tersorot (jejak aktif)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-stone-500">∅</span>
                              <span className="text-stone-300">Null node</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-stone-300">└── ├──</span>
                              <span className="text-stone-300">Koneksi cabang</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-amber-300">█</span>
                              <span className="text-stone-300">Warna berbeda per level</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Alert className="border-amber-700/50 bg-gradient-to-r from-amber-900/40 to-stone-900/30">
                        <AlertDescription className="text-amber-200 text-sm">
                          Struktur pohon sedang dimuat...
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Guidance Principles */}
                  <div className="rounded-xl p-4 border-2 border-emerald-700/50 bg-gradient-to-r from-emerald-950/40 to-stone-900/30">
                    <h5 className="text-emerald-200 font-semibold mb-3 text-sm flex items-center gap-2">
                      <span>🧭</span>
                      <span>Prinsip Pembimbingan</span>
                    </h5>
                    <ul className="text-sm text-emerald-200/90 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold mt-0.5">→</span>
                        <span>Ajukan pertanyaan terbuka untuk memancing analisis Defuser</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold mt-0.5">→</span>
                        <span>Gunakan metode Socratic: biarkan mereka menemukan pola sendiri</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold mt-0.5">→</span>
                        <span>Fokus pada proses berpikir, bukan jawaban langsung</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold mt-0.5">→</span>
                        <span>Berikan petunjuk bertingkat: umum → spesifik</span>
                      </li>
                    </ul>
                  </div>

                  {/* Solve Hints (Collapsible) */}
                  {showSolveHints && (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <div className="rounded-xl p-4 border border-blue-700/50 bg-gradient-to-r from-blue-950/40 to-stone-900/30">
                        <h6 className="text-blue-200 font-semibold mb-2 text-sm">📚 Konsep Binary Tree</h6>
                        <ul className="text-xs text-blue-200/90 space-y-1 list-disc pl-5">
                          <li>Binary Tree: setiap node maksimal 2 anak (left & right)</li>
                          <li>BST: left {'<'} parent {'<'} right untuk setiap subtree</li>
                          <li>Leaf node: tidak memiliki anak (endpoint)</li>
                        </ul>
                      </div>

                      <div className="rounded-xl p-4 border border-purple-700/50 bg-gradient-to-r from-purple-950/40 to-stone-900/30">
                        <h6 className="text-purple-200 font-semibold mb-2 text-sm">🔍 Strategi Traversal</h6>
                        <ul className="text-xs text-purple-200/90 space-y-1 list-disc pl-5">
                          <li><strong>Inorder</strong> (Left-Root-Right): urutan terurut pada BST</li>
                          <li><strong>Preorder</strong> (Root-Left-Right): copy struktur pohon</li>
                          <li><strong>Postorder</strong> (Left-Right-Root): evaluasi bottom-up</li>
                          <li><strong>Level-order</strong>: BFS per level untuk jarak minimum</li>
                        </ul>
                      </div>

                      <div className="rounded-xl p-4 border border-teal-700/50 bg-gradient-to-r from-teal-950/40 to-stone-900/30">
                        <h6 className="text-teal-200 font-semibold mb-2 text-sm">✅ Validasi BST</h6>
                        <ul className="text-xs text-teal-200/90 space-y-1 list-disc pl-5">
                          <li>Inorder traversal harus menghasilkan urutan menaik</li>
                          <li>Gunakan range checking: update min/max saat turun</li>
                          <li>Kompleksitas: O(log n) balanced, O(n) worst case</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Traversal Methods */}
                  {puzzle.expertView?.traversalMethods && (
                    <div className="rounded-xl p-4 border border-purple-700/50 bg-gradient-to-r from-purple-950/40 to-stone-900/30">
                      <h5 className="text-purple-200 font-medium mb-2 text-sm">🔮 Metode Traversal Tersedia</h5>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(puzzle.expertView.traversalMethods).map((name) => (
                          <Badge key={name} className="bg-purple-800 text-purple-100 border border-purple-700/60 text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* BST Lore Section - Shared Knowledge */}
          <Card className="border border-purple-700/40 bg-gradient-to-br from-stone-900/60 to-purple-950/30">
            <CardHeader>
              <CardTitle className="text-purple-300 text-base flex items-center gap-2">
                <span>📜</span>
                <span>Gulungan Pengetahuan BST</span>
              </CardTitle>
              <CardDescription className="text-stone-300 text-sm">
                Referensi konsep untuk semua peran
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Left Column - Structure Rules */}
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-amber-700/40 bg-stone-800/40">
                    <h6 className="text-amber-300 font-semibold mb-2 text-sm flex items-center gap-2">
                      <span>🏛️</span>
                      <span>Hukum Struktur</span>
                    </h6>
                    <ul className="text-stone-200 space-y-1.5 text-xs leading-relaxed list-disc pl-5">
                      <li>Setiap simpul maksimal memiliki 2 anak (kiri & kanan)</li>
                      <li>Pada BST: semua nilai kiri {'<'} parent {'<'} semua nilai kanan</li>
                      <li>Leaf node (daun): simpul tanpa anak, endpoint struktur</li>
                      <li>Root (akar): simpul tertinggi, titik mulai penelusuran</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-blue-700/40 bg-stone-800/40">
                    <h6 className="text-blue-300 font-semibold mb-2 text-sm flex items-center gap-2">
                      <span>🧩</span>
                      <span>Strategi Navigasi</span>
                    </h6>
                    <ul className="text-stone-200 space-y-1.5 text-xs leading-relaxed list-disc pl-5">
                      <li>Bandingkan nilai target dengan nilai simpul saat ini</li>
                      <li>Jika target {'<'} simpul → pilih cabang kiri</li>
                      <li>Jika target {'>'} simpul → pilih cabang kanan</li>
                      <li>Jika sama → target ditemukan, catat jalur</li>
                    </ul>
                  </div>
                </div>

                {/* Right Column - Practical Tips */}
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-emerald-700/40 bg-stone-800/40">
                    <h6 className="text-emerald-300 font-semibold mb-2 text-sm flex items-center gap-2">
                      <span>💡</span>
                      <span>Tips Kolaborasi</span>
                    </h6>
                    <ul className="text-stone-200 space-y-1.5 text-xs leading-relaxed list-disc pl-5">
                      <li>Expert membimbing dengan pertanyaan, bukan jawaban langsung</li>
                      <li>Defuser menjelaskan alasan setiap pilihan arah</li>
                      <li>Diskusikan pola yang ditemukan di setiap level</li>
                      <li>Verifikasi pemahaman sebelum melanjutkan ke level berikutnya</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-rose-700/40 bg-stone-800/40">
                    <h6 className="text-rose-300 font-semibold mb-2 text-sm flex items-center gap-2">
                      <span>⚠️</span>
                      <span>Peringatan Umum</span>
                    </h6>
                    <ul className="text-stone-200 space-y-1.5 text-xs leading-relaxed list-disc pl-5">
                      <li>Pohon tidak seimbang dapat memiliki jalur sangat panjang</li>
                      <li>Null node (∅) menandakan tidak ada cabang ke arah tersebut</li>
                      <li>Traversal berbeda menghasilkan urutan nilai berbeda</li>
                      <li>Pastikan jejak dicatat dengan benar sebelum submit</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Quick Reference */}
              <div className="mt-4 p-4 rounded-xl border border-indigo-700/40 bg-gradient-to-r from-indigo-950/40 to-stone-900/30">
                <h6 className="text-indigo-200 font-semibold mb-2 text-sm flex items-center gap-2">
                  <span>📖</span>
                  <span>Referensi Cepat</span>
                </h6>
                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="text-stone-300">
                    <span className="font-semibold text-indigo-300">Inorder:</span> L-Root-R → urutan terurut
                  </div>
                  <div className="text-stone-300">
                    <span className="font-semibold text-indigo-300">Preorder:</span> Root-L-R → copy struktur
                  </div>
                  <div className="text-stone-300">
                    <span className="font-semibold text-indigo-300">Postorder:</span> L-R-Root → delete/eval
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
