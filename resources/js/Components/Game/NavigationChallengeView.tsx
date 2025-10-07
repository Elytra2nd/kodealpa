import React, { useMemo, useState, useCallback, useRef, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { gsap } from 'gsap';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  TORCH_FLICKER_INTERVAL: 2200,
  MAX_TREE_HEIGHT: 400,
  NODE_SIZE: 32,
  LEVEL_HEIGHT: 70,
  NODE_SPACING: 45,
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

type TreeNode = {
  value: any;
  left?: TreeNode | null;
  right?: TreeNode | null;
};

type Direction = 'left' | 'right';

// ============================================
// UTILITY FUNCTIONS
// ============================================
const toArray = (data: any): string[] => {
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') return [data];
  return [];
};

const obfuscate = (text: string): string => {
  const runeMap: Record<string, string> = {
    '0': '◇', '1': '†', '2': '♁', '3': '♆', '4': '♄',
    '5': '♃', '6': '☿', '7': '☼', '8': '◈', '9': '★',
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
};

const normalizeStep = (step: string): Direction | null => {
  const normalized = step.trim().toLowerCase();
  const leftWords = ['left', 'kiri', 'lorong barat', 'l', 'west', 'barat'];
  const rightWords = ['right', 'kanan', 'lorong timur', 'r', 'east', 'timur'];

  if (leftWords.includes(normalized)) return 'left';
  if (rightWords.includes(normalized)) return 'right';
  return null;
};

const buildArrayFromTree = (root: TreeNode | null | undefined): any[] => {
  if (!root) return [];
  const result: any[] = [];
  const queue: Array<{ node: TreeNode | null, index: number }> = [{ node: root, index: 0 }];

  while (queue.length > 0) {
    const { node, index } = queue.shift()!;

    while (result.length <= index) {
      result.push(null);
    }

    if (node) {
      result[index] = node.value;
      if (node.left !== undefined) {
        queue.push({ node: node.left || null, index: 2 * index + 1 });
      }
      if (node.right !== undefined) {
        queue.push({ node: node.right || null, index: 2 * index + 2 });
      }
    }
  }

  return result;
};

// ============================================
// CUSTOM HOOKS
// ============================================
const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const torchInterval = setInterval(() => {
      torchRefs.current.forEach((torch) => {
        if (torch) {
          gsap.to(torch, {
            opacity: Math.random() * 0.14 + 0.86,
            duration: 0.22,
            ease: 'power1.inOut',
          });
        }
      });
    }, CONFIG.TORCH_FLICKER_INTERVAL);

    return () => clearInterval(torchInterval);
  }, []);

  const setTorchRef = (index: number) => (el: HTMLSpanElement | null) => {
    torchRefs.current[index] = el;
  };

  return { setTorchRef };
};

// ============================================
// SVG BINARY TREE COMPONENT
// ============================================
const SvgBinaryTree = memo(({ array }: { array: any[] }) => {
  if (!Array.isArray(array) || array.length === 0) {
    return <div className="text-stone-400 italic text-xs text-center p-4">Pohon kosong</div>;
  }

  const levels = Math.ceil(Math.log2(array.length + 1));
  const nodes: Array<{ val: any, x: number, y: number, i: number }> = [];
  const edges: Array<{ x1: number, y1: number, x2: number, y2: number }> = [];

  for (let i = 0; i < array.length; i++) {
    if (array[i] === null || array[i] === undefined) continue;

    const depth = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (Math.pow(2, depth) - 1);
    const levelWidth = Math.pow(2, levels - depth - 1) * CONFIG.NODE_SPACING;

    const x = levelWidth + posInLevel * levelWidth * 2;
    const y = depth * CONFIG.LEVEL_HEIGHT + CONFIG.NODE_SIZE;

    nodes.push({ val: array[i], x, y, i });

    const left = 2 * i + 1;
    if (left < array.length && array[left] != null) {
      const ld = Math.floor(Math.log2(left + 1));
      const lp = left - (Math.pow(2, ld) - 1);
      const lLevelWidth = Math.pow(2, levels - ld - 1) * CONFIG.NODE_SPACING;
      const lx = lLevelWidth + lp * lLevelWidth * 2;
      const ly = ld * CONFIG.LEVEL_HEIGHT + CONFIG.NODE_SIZE;
      edges.push({ x1: x, y1: y, x2: lx, y2: ly });
    }

    const right = 2 * i + 2;
    if (right < array.length && array[right] != null) {
      const rd = Math.floor(Math.log2(right + 1));
      const rp = right - (Math.pow(2, rd) - 1);
      const rLevelWidth = Math.pow(2, levels - rd - 1) * CONFIG.NODE_SPACING;
      const rx = rLevelWidth + rp * rLevelWidth * 2;
      const ry = rd * CONFIG.LEVEL_HEIGHT + CONFIG.NODE_SIZE;
      edges.push({ x1: x, y1: y, x2: rx, y2: ry });
    }
  }

  const svgW = Math.max(300, Math.pow(2, levels) * CONFIG.NODE_SPACING);
  const svgH = levels * CONFIG.LEVEL_HEIGHT + CONFIG.NODE_SIZE * 2;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto"
      >
        {edges.map((e, idx) => (
          <line
            key={`edge-${idx}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="#fbbf24"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ))}
        {nodes.map((n) => (
          <g key={`node-${n.i}`}>
            <rect
              x={n.x - CONFIG.NODE_SIZE / 2}
              y={n.y - CONFIG.NODE_SIZE / 2}
              width={CONFIG.NODE_SIZE}
              height={CONFIG.NODE_SIZE}
              rx={8}
              fill="#042f2e"
              stroke="#14b8a6"
              strokeWidth={2.5}
            />
            <text
              x={n.x}
              y={n.y}
              fontSize="14"
              fontWeight={700}
              fill="#a7f3d0"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {String(n.val)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
});

SvgBinaryTree.displayName = 'SvgBinaryTree';

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const DirectionButton = memo(
  ({
    direction,
    label,
    onClick,
    onMouseEnter,
    onMouseLeave,
    disabled,
    variant = 'primary',
  }: {
    direction: string;
    label: string;
    onClick: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    disabled: boolean;
    variant?: 'primary' | 'outline';
  }) => {
    const icons: Record<string, string> = {
      left: '⬅️',
      right: '➡️',
      up: '⬆️',
      down: '⬇️',
    };

    const classes =
      variant === 'primary'
        ? 'bg-indigo-800 text-indigo-100 hover:bg-indigo-700 border border-indigo-600/60'
        : 'border-stone-600/60 text-stone-200 hover:bg-stone-800/60';

    return (
      <Button
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        disabled={disabled}
        size="sm"
        className={`${classes} transition-all duration-300 text-xs`}
      >
        {icons[direction]} {label}
      </Button>
    );
  }
);

DirectionButton.displayName = 'DirectionButton';

const PathDisplay = memo(({ path }: { path: string[] }) => (
  <div className="min-h-[50px] rounded-lg p-3 border border-amber-700/50 bg-stone-900/70 flex items-center backdrop-blur-sm">
    {path.length > 0 ? (
      <span className="font-mono text-xs text-amber-300 break-all">
        {path.join(' → ')}
      </span>
    ) : (
      <span className="text-stone-400 italic text-xs">Belum ada jejak yang tercatat</span>
    )}
  </div>
));

PathDisplay.displayName = 'PathDisplay';

// ============================================
// MAIN COMPONENT
// ============================================
export default function NavigationChallengeView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const { setTorchRef } = useDungeonAtmosphere();

  const [path, setPath] = useState<string[]>([]);
  const [hoverNext, setHoverNext] = useState<Direction | null>(null);

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';

  const pickLabel = useCallback(
    (dir: 'left' | 'right' | 'up' | 'down'): string => {
      const traversalOptions = toArray(puzzle?.defuserView?.traversalOptions);
      const maps: Record<typeof dir, string[]> = {
        left: ['left', 'kiri', 'lorong barat', 'l', 'west', 'barat'],
        right: ['right', 'kanan', 'lorong timur', 'r', 'east', 'timur'],
        up: ['up', 'atas', 'naik', 'u', 'north', 'utara'],
        down: ['down', 'bawah', 'turun', 'd', 'south', 'selatan'],
      };

      const picked = traversalOptions.find((o) => maps[dir].includes(o.toLowerCase()));
      if (picked) return picked;

      const defaults = { left: 'Kiri', right: 'Kanan', up: 'Atas', down: 'Bawah' };
      return defaults[dir];
    },
    [puzzle]
  );

  const root: TreeNode | undefined = puzzle?.expertView?.tree?.root;

  const treeArray = useMemo(() => {
    if (puzzle?.expertView?.arrayTree) {
      return puzzle.expertView.arrayTree;
    }
    return buildArrayFromTree(root);
  }, [root, puzzle?.expertView?.arrayTree]);

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
  }, [root, path]);

  const availableDirections = useMemo((): Direction[] => {
    const dirs: Direction[] = [];
    if (currentNode && typeof currentNode === 'object') {
      if ((currentNode as TreeNode).left) dirs.push('left');
      if ((currentNode as TreeNode).right) dirs.push('right');
    }
    return dirs;
  }, [currentNode]);

  const syncIssue = useMemo(() => {
    if (!currentNode) return root ? null : 'Struktur pohon belum tersedia dari grimoire.';

    const hasLeft = (currentNode as TreeNode).left != null;
    const hasRight = (currentNode as TreeNode).right != null;
    const traversalOptions = toArray(puzzle?.defuserView?.traversalOptions);
    const offered = traversalOptions.map((o) => normalizeStep(o)).filter(Boolean) as Direction[];
    const anyOfferedInvalid = offered.some(
      (d) => (d === 'left' && !hasLeft) || (d === 'right' && !hasRight)
    );

    return anyOfferedInvalid
      ? 'Petunjuk arah pada Defuser tidak cocok dengan cabang yang tersedia. Tombol disesuaikan otomatis.'
      : null;
  }, [currentNode, puzzle, root]);

  const defuserHints = useMemo(() => {
    const base = toArray(puzzle?.defuserView?.hints);
    const extra = [
      'Jejak runik tak selalu lurus; teguk napas di tiap persimpangan dan amati penjaga gerbangnya.',
      'Bandingkan nilai penjaga sebelum memilih barat atau timur; namun jangan terperangkap fatamorgana keseimbangan semu.',
    ];
    return [...base, ...extra].slice(0, 3).map(obfuscate);
  }, [puzzle]);

  const addDirection = useCallback(
    (dir: Direction) => {
      const label = pickLabel(dir);
      setPath((prev) => [...prev, label]);
    },
    [pickLabel]
  );

  const removeLastStep = useCallback(() => {
    setPath((prev) => prev.slice(0, -1));
  }, []);

  const clearPath = useCallback(() => {
    setPath([]);
  }, []);

  const descendOne = useCallback(() => {
    if (availableDirections.length === 1) {
      addDirection(availableDirections[0]);
    }
  }, [availableDirections, addDirection]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (path.length === 0) return;
      onSubmitAttempt(path.join(','));
    },
    [path, onSubmitAttempt]
  );

  if (!puzzle) {
    return (
      <Alert variant="destructive" className="min-h-[180px] flex items-center justify-center">
        <AlertDescription className="text-center">
          Data teka-teki tidak tersedia dari grimoire kuno
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 relative max-w-[1600px] mx-auto">
      <Card className="overflow-hidden border border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 dungeon-card-glow">
        <CardHeader className="relative p-3 sm:p-4">
          <div className="absolute top-2 left-2 text-lg sm:text-xl">
            <span ref={setTorchRef(0)} className="dungeon-torch-flicker">🔥</span>
          </div>
          <div className="absolute top-2 right-2 text-lg sm:text-xl">
            <span ref={setTorchRef(1)} className="dungeon-torch-flicker">🔥</span>
          </div>
          <CardTitle className="text-amber-300 text-lg sm:text-xl relative z-10 dungeon-glow-text">
            {puzzle.title || 'Navigasi Tantangan'}
          </CardTitle>
          <CardDescription className="text-stone-300 text-xs sm:text-sm relative z-10">
            {puzzle.description || 'Temukan jalan dalam struktur tree!'}
          </CardDescription>

          <div className="pt-2 flex flex-wrap gap-1.5 relative z-10">
            <Badge className="bg-amber-800 text-amber-100 border border-amber-700/50 text-xs">
              🏰 Mode Dungeon
            </Badge>
            <Badge className="bg-stone-700 text-stone-200 border border-stone-600/50 text-xs">
              🧭 Navigasi Pohon
            </Badge>
            {role && (
              <Badge className="bg-purple-800 text-purple-100 border border-purple-700/50 text-xs">
                🎭 {role}
              </Badge>
            )}
            {puzzle?.defuserView?.targetValue != null && (
              <Badge className="bg-indigo-800 text-indigo-100 border border-indigo-700/50 text-xs">
                Target: {obfuscate(String(puzzle.defuserView.targetValue))}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 p-3 sm:p-4">
          {(isDefuser || isExpert) && syncIssue && (
            <Alert className="border-amber-700/40 bg-gradient-to-r from-amber-900/40 to-stone-900/40 backdrop-blur-sm p-2">
              <AlertDescription className="text-amber-200 text-xs">
                ⚠️ {syncIssue}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* DEFUSER PANEL */}
            {(isDefuser || role === 'host') && (
              <Card className="border border-amber-600/40 bg-gradient-to-b from-stone-900/60 to-stone-800/40">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm text-amber-300 flex items-center gap-2">
                    <span>🗺️</span>
                    <span>Panel Defuser</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 p-3">
                  <div className="rounded-lg p-2 border border-stone-700/40 bg-stone-800/40">
                    <h5 className="text-stone-200 font-semibold mb-1 text-xs">📜 Arahan Misi</h5>
                    <p className="text-stone-300 text-[10px] leading-relaxed">
                      {obfuscate(
                        puzzle.defuserView?.task ||
                          'Susun urutan langkah dari altar menuju ruang tujuan.'
                      )}
                    </p>
                  </div>

                  <div>
                    <h5 className="text-stone-200 font-semibold mb-2 text-xs">🧭 Kontrol Navigasi</h5>
                    <div className="grid grid-cols-2 gap-1.5">
                      <DirectionButton
                        direction="up"
                        label={pickLabel('up')}
                        onClick={removeLastStep}
                        disabled={path.length === 0 || submitting}
                        variant="outline"
                      />

                      <DirectionButton
                        direction="down"
                        label={pickLabel('down')}
                        onClick={descendOne}
                        disabled={submitting || availableDirections.length !== 1}
                        variant="outline"
                      />

                      {availableDirections.includes('left') && (
                        <DirectionButton
                          direction="left"
                          label={pickLabel('left')}
                          onClick={() => addDirection('left')}
                          onMouseEnter={() => setHoverNext('left')}
                          onMouseLeave={() => setHoverNext(null)}
                          disabled={submitting}
                        />
                      )}

                      {availableDirections.includes('right') && (
                        <DirectionButton
                          direction="right"
                          label={pickLabel('right')}
                          onClick={() => addDirection('right')}
                          onMouseEnter={() => setHoverNext('right')}
                          onMouseLeave={() => setHoverNext(null)}
                          disabled={submitting}
                        />
                      )}
                    </div>

                    {availableDirections.length === 0 && (
                      <Badge className="bg-red-800 text-red-100 border border-red-700/60 mt-2 text-xs">
                        Tidak ada cabang
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h5 className="text-stone-200 font-semibold mb-1.5 text-xs">🛤️ Jejak Saat Ini</h5>
                    <PathDisplay path={path} />

                    <div className="flex gap-1.5 mt-2">
                      <Button
                        onClick={removeLastStep}
                        disabled={path.length === 0 || submitting}
                        variant="outline"
                        size="sm"
                        className="border-amber-600/60 text-amber-300 hover:bg-amber-900/30 text-xs flex-1"
                      >
                        Hapus
                      </Button>
                      <Button
                        onClick={clearPath}
                        disabled={path.length === 0 || submitting}
                        variant="outline"
                        size="sm"
                        className="border-red-600/60 text-red-300 hover:bg-red-900/30 text-xs flex-1"
                      >
                        Reset
                      </Button>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <Button
                      type="submit"
                      disabled={path.length === 0 || submitting}
                      className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-900 font-semibold text-xs py-2"
                    >
                      {submitting ? '⚙️ Mengirim...' : '✨ Kirim Jejak'}
                    </Button>
                  </form>

                  {defuserHints.length > 0 && (
                    <div className="p-2 rounded-lg border border-blue-700/40 bg-gradient-to-r from-blue-950/40 to-stone-900/30">
                      <h5 className="text-blue-200 font-medium mb-1 text-xs flex items-center gap-1">
                        <span>💡</span>
                        <span>Petunjuk</span>
                      </h5>
                      <ul className="text-[9px] text-blue-200/90 space-y-0.5 list-disc pl-3">
                        {defuserHints.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* EXPERT PANEL - BENTO GRID LAYOUT */}
            {(isExpert || role === 'host') && (
              <div className="bento-grid">
                {/* Tree Visualization - Spans 2 rows, left side */}
                <Card className="bento-tree border border-emerald-700/40 bg-gradient-to-b from-stone-900/60 to-emerald-950/40">
                  <CardHeader className="pb-2 pt-2 px-3">
                    <CardTitle className="text-xs text-emerald-300 flex items-center gap-1.5">
                      <span>🎄</span>
                      <span>Visualisasi Pohon</span>
                    </CardTitle>
                    <CardDescription className="text-stone-400 text-[9px]">
                      Lihat langsung struktur & cabang node
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2">
                    {treeArray && treeArray.length > 0 ? (
                      <div
                        className="rounded-lg p-2 bg-stone-950 border border-stone-700/40 overflow-y-auto"
                        style={{ maxHeight: CONFIG.MAX_TREE_HEIGHT }}
                      >
                        <SvgBinaryTree array={treeArray} />
                      </div>
                    ) : (
                      <div className="text-stone-400 italic text-xs text-center p-3">
                        Data pohon tidak tersedia
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge className="bg-emerald-800 text-emerald-100 border border-emerald-700/40 text-[9px]">
                        Node
                      </Badge>
                      <Badge className="bg-amber-800 text-amber-100 border border-amber-700/40 text-[9px]">
                        Koneksi
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Prinsip Pembimbingan - Top right */}
                <Card className="bento-prinsip p-2.5 rounded-lg border border-emerald-700/50 bg-gradient-to-r from-emerald-950/40 to-stone-900/30">
                  <h5 className="text-emerald-200 font-semibold mb-1.5 text-xs flex items-center gap-1">
                    <span>🧭</span>
                    <span>Prinsip Pembimbingan</span>
                  </h5>
                  <ul className="text-[9px] text-emerald-200/90 space-y-0.5 list-disc pl-3">
                    <li>Ajukan pertanyaan terbuka untuk memancing analisis Defuser</li>
                    <li>Gunakan metode Socratic: biarkan mereka menemukan pola sendiri</li>
                    <li>Fokus pada proses berpikir, bukan jawaban langsung</li>
                  </ul>
                </Card>

                {/* Konsep Binary Tree - Right middle */}
                <Card className="bento-konsep p-2.5 rounded-lg border border-purple-700/50 bg-gradient-to-r from-purple-950/40 to-stone-900/30">
                  <h5 className="text-purple-200 font-semibold mb-1.5 text-xs flex items-center gap-1">
                    <span>📚</span>
                    <span>Konsep Binary Tree</span>
                  </h5>
                  <ul className="text-[9px] text-purple-200/90 space-y-0.5 list-disc pl-3">
                    <li>Binary Tree: setiap node maksimal 2 anak (left & right)</li>
                    <li>BST: left {'<'} parent {'<'} right untuk setiap subtree</li>
                    <li>Leaf node: tidak memiliki anak (endpoint)</li>
                  </ul>
                </Card>

                {/* Strategi Traversal - Bottom left (spans 2 cols) */}
                <Card className="bento-strategi p-2.5 rounded-lg border border-blue-700/50 bg-gradient-to-r from-blue-950/40 to-stone-900/30">
                  <h5 className="text-blue-200 font-semibold mb-1.5 text-xs flex items-center gap-1">
                    <span>🔍</span>
                    <span>Strategi Traversal</span>
                  </h5>
                  <ul className="text-[9px] text-blue-200/90 space-y-0.5 list-disc pl-3">
                    <li><strong>Inorder</strong>: Left-Root-Right (urutan terurut pada BST)</li>
                    <li><strong>Preorder</strong>: Root-Left-Right (copy struktur pohon)</li>
                    <li><strong>Postorder</strong>: Left-Right-Root (evaluasi bottom-up)</li>
                  </ul>
                </Card>

                {/* Validasi BST - Bottom right */}
                <Card className="bento-validasi p-2.5 rounded-lg border border-teal-700/50 bg-gradient-to-r from-teal-950/40 to-stone-900/30">
                  <h5 className="text-teal-200 font-semibold mb-1.5 text-xs flex items-center gap-1">
                    <span>✅</span>
                    <span>Validasi BST</span>
                  </h5>
                  <ul className="text-[9px] text-teal-200/90 space-y-0.5 list-disc pl-3">
                    <li>Inorder traversal harus menghasilkan urutan menaik</li>
                    <li>Gunakan range checking: update min/max saat turun</li>
                  </ul>
                </Card>

                {/* Metode Traversal - Full width at bottom */}
                {puzzle.expertView?.traversalMethods && (
                  <Card className="bento-metode p-2.5 rounded-lg border border-indigo-700/50 bg-gradient-to-r from-indigo-950/40 to-stone-900/30">
                    <h5 className="text-indigo-200 font-semibold mb-1.5 text-xs flex items-center gap-1">
                      <span>🔮</span>
                      <span>Metode Traversal Tersedia</span>
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(puzzle.expertView.traversalMethods).map((name) => (
                        <Badge
                          key={name}
                          className="bg-indigo-800 text-indigo-100 border border-indigo-700/60 text-[9px]"
                        >
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BENTO GRID STYLES */}
      <style>{`
        .dungeon-torch-flicker {
          display: inline-block;
        }

        .dungeon-card-glow {
          box-shadow: 0 0 15px rgba(120, 113, 108, 0.35);
        }

        .dungeon-glow-text {
          text-shadow: 0 0 15px rgba(251, 191, 36, 0.5);
        }

        /* BENTO GRID LAYOUT - Asymmetric Design */
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(3, auto);
          gap: 12px;
        }

        .bento-tree {
          grid-column: 1 / 3;
          grid-row: 1 / 4;
        }

        .bento-prinsip {
          grid-column: 3 / 5;
          grid-row: 1 / 2;
        }

        .bento-konsep {
          grid-column: 3 / 5;
          grid-row: 2 / 3;
        }

        .bento-strategi {
          grid-column: 3 / 5;
          grid-row: 3 / 4;
        }

        .bento-validasi {
          grid-column: 3 / 5;
          grid-row: 4 / 5;
        }

        .bento-metode {
          grid-column: 1 / 5;
          grid-row: 4 / 5;
        }

        /* Responsive Bento Grid */
        @media (max-width: 1024px) {
          .bento-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto;
          }

          .bento-tree,
          .bento-prinsip,
          .bento-konsep,
          .bento-strategi,
          .bento-validasi,
          .bento-metode {
            grid-column: 1 / 2;
            grid-row: auto;
          }
        }

        @media (max-width: 768px) {
          .dungeon-card-glow {
            box-shadow: 0 0 10px rgba(120, 113, 108, 0.25);
          }
        }
      `}</style>
    </div>
  );
}
