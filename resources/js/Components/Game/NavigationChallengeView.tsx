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
  MAX_TREE_HEIGHT: 450,
  MAX_TREE_HEIGHT_MOBILE: 320,
  NODE_SIZE: 40,
  NODE_SIZE_MOBILE: 32,
  LEVEL_HEIGHT: 85,
  LEVEL_HEIGHT_MOBILE: 65,
  NODE_SPACING: 60,
  NODE_SPACING_MOBILE: 40,
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

const normalizeStep = (step: string): Direction | null => {
  const normalized = step.trim().toLowerCase();
  const leftWords = ['left', 'kiri', 'l'];
  const rightWords = ['right', 'kanan', 'r'];

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

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// ============================================
// SVG BINARY TREE COMPONENT
// ============================================
const SvgBinaryTree = memo(({ array, isMobile = false }: { array: any[]; isMobile?: boolean }) => {
  if (!Array.isArray(array) || array.length === 0) {
    return (
      <div className="text-stone-400 italic text-sm text-center p-6">
        Pohon kosong
      </div>
    );
  }

  const nodeSize = isMobile ? CONFIG.NODE_SIZE_MOBILE : CONFIG.NODE_SIZE;
  const levelHeight = isMobile ? CONFIG.LEVEL_HEIGHT_MOBILE : CONFIG.LEVEL_HEIGHT;
  const nodeSpacing = isMobile ? CONFIG.NODE_SPACING_MOBILE : CONFIG.NODE_SPACING;

  const levels = Math.ceil(Math.log2(array.length + 1));
  const nodes: Array<{ val: any, x: number, y: number, i: number, depth: number }> = [];
  const edges: Array<{ x1: number, y1: number, x2: number, y2: number, label: string }> = [];

  for (let i = 0; i < array.length; i++) {
    if (array[i] === null || array[i] === undefined) continue;

    const depth = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (Math.pow(2, depth) - 1);
    const levelWidth = Math.pow(2, levels - depth - 1) * nodeSpacing;

    const x = levelWidth + posInLevel * levelWidth * 2;
    const y = depth * levelHeight + nodeSize;

    nodes.push({ val: array[i], x, y, i, depth });

    // Left child edge
    const left = 2 * i + 1;
    if (left < array.length && array[left] != null) {
      const ld = Math.floor(Math.log2(left + 1));
      const lp = left - (Math.pow(2, ld) - 1);
      const lLevelWidth = Math.pow(2, levels - ld - 1) * nodeSpacing;
      const lx = lLevelWidth + lp * lLevelWidth * 2;
      const ly = ld * levelHeight + nodeSize;
      edges.push({ x1: x, y1: y, x2: lx, y2: ly, label: 'KIRI' });
    }

    // Right child edge
    const right = 2 * i + 2;
    if (right < array.length && array[right] != null) {
      const rd = Math.floor(Math.log2(right + 1));
      const rp = right - (Math.pow(2, rd) - 1);
      const rLevelWidth = Math.pow(2, levels - rd - 1) * nodeSpacing;
      const rx = rLevelWidth + rp * rLevelWidth * 2;
      const ry = rd * levelHeight + nodeSize;
      edges.push({ x1: x, y1: y, x2: rx, y2: ry, label: 'KANAN' });
    }
  }

  const svgW = Math.max(400, Math.pow(2, levels) * nodeSpacing);
  const svgH = levels * levelHeight + nodeSize * 2;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width="100%"
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto min-w-full"
        style={{ minHeight: isMobile ? '250px' : '300px' }}
      >
        {/* Draw edges with labels */}
        {edges.map((e, idx) => {
          const midX = (e.x1 + e.x2) / 2;
          const midY = (e.y1 + e.y2) / 2;
          return (
            <g key={`edge-${idx}`}>
              <line
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke="#fbbf24"
                strokeWidth={isMobile ? 2 : 3}
                strokeLinecap="round"
                opacity={0.8}
              />
              {/* Edge Label */}
              <rect
                x={midX - (isMobile ? 18 : 22)}
                y={midY - (isMobile ? 8 : 10)}
                width={isMobile ? 36 : 44}
                height={isMobile ? 16 : 20}
                rx={4}
                fill="#78350f"
                stroke="#fbbf24"
                strokeWidth={1.5}
              />
              <text
                x={midX}
                y={midY}
                fontSize={isMobile ? '8' : '9'}
                fontWeight={700}
                fill="#fef3c7"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {e.label}
              </text>
            </g>
          );
        })}

        {/* Draw nodes */}
        {nodes.map((n) => {
          const isRoot = n.i === 0;
          return (
            <g key={`node-${n.i}`}>
              {/* Node background glow */}
              <circle
                cx={n.x}
                cy={n.y}
                r={nodeSize / 2 + 3}
                fill={isRoot ? 'rgba(251, 191, 36, 0.2)' : 'rgba(20, 184, 166, 0.15)'}
                filter="blur(4px)"
              />

              {/* Node shape */}
              <rect
                x={n.x - nodeSize / 2}
                y={n.y - nodeSize / 2}
                width={nodeSize}
                height={nodeSize}
                rx={10}
                fill={isRoot ? '#854d0e' : '#042f2e'}
                stroke={isRoot ? '#fbbf24' : '#14b8a6'}
                strokeWidth={isRoot ? 4 : 3}
              />

              {/* Node value */}
              <text
                x={n.x}
                y={n.y}
                fontSize={isMobile ? '14' : '16'}
                fontWeight={700}
                fill={isRoot ? '#fef3c7' : '#a7f3d0'}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {String(n.val)}
              </text>

              {/* Root label */}
              {isRoot && (
                <text
                  x={n.x}
                  y={n.y - nodeSize / 2 - 8}
                  fontSize={isMobile ? '10' : '11'}
                  fontWeight={600}
                  fill="#fbbf24"
                  textAnchor="middle"
                >
                  AWAL
                </text>
              )}
            </g>
          );
        })}
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
    disabled,
    variant = 'primary',
    isMobile = false,
  }: {
    direction: string;
    label: string;
    onClick: () => void;
    disabled: boolean;
    variant?: 'primary' | 'outline';
    isMobile?: boolean;
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
        onClick={onClick}
        disabled={disabled}
        size="sm"
        className={`${classes} transition-all duration-300 ${isMobile ? 'text-xs py-2' : 'text-sm py-2.5'}`}
      >
        {icons[direction]} {label}
      </Button>
    );
  }
);

DirectionButton.displayName = 'DirectionButton';

const PathDisplay = memo(({ path, isMobile = false }: { path: string[]; isMobile?: boolean }) => (
  <div className={`min-h-[50px] rounded-lg ${isMobile ? 'p-2' : 'p-3'} border border-amber-700/50 bg-stone-900/70 flex items-center backdrop-blur-sm`}>
    {path.length > 0 ? (
      <span className={`font-mono ${isMobile ? 'text-xs' : 'text-sm'} text-amber-300 break-all`}>
        {path.join(' → ')}
      </span>
    ) : (
      <span className={`text-stone-400 italic ${isMobile ? 'text-xs' : 'text-sm'}`}>
        Belum ada langkah yang dipilih
      </span>
    )}
  </div>
));

PathDisplay.displayName = 'PathDisplay';

// ============================================
// MAIN COMPONENT
// ============================================
export default function NavigationChallengeView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const { setTorchRef } = useDungeonAtmosphere();
  const isMobile = useIsMobile();

  const [path, setPath] = useState<string[]>([]);

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';
  const isHost = role === 'host';

  const pickLabel = useCallback(
    (dir: 'left' | 'right' | 'up' | 'down'): string => {
      const defaults = { left: 'Kiri', right: 'Kanan', up: 'Kembali', down: 'Otomatis' };
      return defaults[dir];
    },
    []
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

  const defuserHints = useMemo(() => {
    const base = toArray(puzzle?.defuserView?.hints);
    return base.slice(0, 3);
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
          Data teka-teki tidak tersedia
        </AlertDescription>
      </Alert>
    );
  }

  const maxTreeHeight = isMobile ? CONFIG.MAX_TREE_HEIGHT_MOBILE : CONFIG.MAX_TREE_HEIGHT;

  return (
    <div className="space-y-4 relative w-full mx-auto px-2 sm:px-4">
      <Card className="overflow-hidden border border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 dungeon-card-glow">
        <CardHeader className={`relative ${isMobile ? 'p-3' : 'p-4 sm:p-6'}`}>
          <div className={`absolute ${isMobile ? 'top-2 left-2 text-lg' : 'top-2 left-2 text-lg sm:text-xl'}`}>
            <span ref={setTorchRef(0)} className="dungeon-torch-flicker">🔥</span>
          </div>
          <div className={`absolute ${isMobile ? 'top-2 right-2 text-lg' : 'top-2 right-2 text-lg sm:text-xl'}`}>
            <span ref={setTorchRef(1)} className="dungeon-torch-flicker">🔥</span>
          </div>
          <CardTitle className={`text-amber-300 ${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'} relative z-10 dungeon-glow-text text-center`}>
            {puzzle.title || 'Tantangan Navigasi Pohon'}
          </CardTitle>
          <CardDescription className={`text-stone-300 ${isMobile ? 'text-xs' : 'text-sm sm:text-base'} relative z-10 text-center`}>
            {puzzle.description || 'Temukan jalan dalam struktur pohon!'}
          </CardDescription>

          <div className="pt-2 flex flex-wrap gap-2 justify-center relative z-10">
            <Badge className={`bg-amber-800 text-amber-100 border border-amber-700/50 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              🏰 Mode Dungeon
            </Badge>
            <Badge className={`bg-stone-700 text-stone-200 border border-stone-600/50 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              🧭 Navigasi Pohon
            </Badge>
            {role && (
              <Badge className={`bg-purple-800 text-purple-100 border border-purple-700/50 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                🎭 {role}
              </Badge>
            )}
            {puzzle?.defuserView?.targetValue != null && (
              <Badge className={`bg-indigo-800 text-indigo-100 border border-indigo-700/50 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Target: {puzzle.defuserView.targetValue}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className={`space-y-4 ${isMobile ? 'p-3' : 'p-4 sm:p-6'}`}>
          {/* RESPONSIVE GRID LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* DEFUSER PANEL - 3 cols on desktop */}
            {(isDefuser || isHost) && (
              <div className="lg:col-span-3">
                <Card className="border border-amber-600/40 bg-gradient-to-b from-stone-900/60 to-stone-800/40 h-full">
                  <CardHeader className={`${isMobile ? 'p-2 pb-1' : 'p-3 pb-2'}`}>
                    <CardTitle className={`${isMobile ? 'text-sm' : 'text-base'} text-amber-300 flex items-center gap-2`}>
                      <span>🗺️</span>
                      <span>Panel Pemain</span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className={`space-y-3 ${isMobile ? 'p-2' : 'p-3'}`}>
                    {/* Task */}
                    <div className={`rounded-lg ${isMobile ? 'p-2' : 'p-3'} border border-stone-700/40 bg-stone-800/40`}>
                      <h5 className={`text-stone-200 font-semibold mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        📜 Tugas
                      </h5>
                      <p className={`text-stone-300 ${isMobile ? 'text-xs' : 'text-sm'} leading-relaxed`}>
                        {puzzle.defuserView?.task || 'Temukan angka target dengan cara berjalan dari awal ke titik tujuan.'}
                      </p>
                    </div>

                    {/* Navigation Controls */}
                    <div>
                      <h5 className={`text-stone-200 font-semibold mb-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        🧭 Tombol Navigasi
                      </h5>
                      <div className="grid grid-cols-2 gap-2">
                        <DirectionButton
                          direction="up"
                          label={pickLabel('up')}
                          onClick={removeLastStep}
                          disabled={path.length === 0 || submitting}
                          variant="outline"
                          isMobile={isMobile}
                        />

                        <DirectionButton
                          direction="down"
                          label={pickLabel('down')}
                          onClick={descendOne}
                          disabled={submitting || availableDirections.length !== 1}
                          variant="outline"
                          isMobile={isMobile}
                        />

                        {availableDirections.includes('left') && (
                          <DirectionButton
                            direction="left"
                            label={pickLabel('left')}
                            onClick={() => addDirection('left')}
                            disabled={submitting}
                            isMobile={isMobile}
                          />
                        )}

                        {availableDirections.includes('right') && (
                          <DirectionButton
                            direction="right"
                            label={pickLabel('right')}
                            onClick={() => addDirection('right')}
                            disabled={submitting}
                            isMobile={isMobile}
                          />
                        )}
                      </div>

                      {availableDirections.length === 0 && (
                        <Badge className={`bg-red-800 text-red-100 border border-red-700/60 mt-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          Tidak ada cabang
                        </Badge>
                      )}
                    </div>

                    {/* Path Display */}
                    <div>
                      <h5 className={`text-stone-200 font-semibold mb-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        🛤️ Langkah yang Dipilih
                      </h5>
                      <PathDisplay path={path} isMobile={isMobile} />

                      <div className="flex gap-2 mt-2">
                        <Button
                          onClick={removeLastStep}
                          disabled={path.length === 0 || submitting}
                          variant="outline"
                          size="sm"
                          className={`border-amber-600/60 text-amber-300 hover:bg-amber-900/30 ${isMobile ? 'text-xs' : 'text-sm'} flex-1`}
                        >
                          Hapus
                        </Button>
                        <Button
                          onClick={clearPath}
                          disabled={path.length === 0 || submitting}
                          variant="outline"
                          size="sm"
                          className={`border-red-600/60 text-red-300 hover:bg-red-900/30 ${isMobile ? 'text-xs' : 'text-sm'} flex-1`}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <form onSubmit={handleSubmit}>
                      <Button
                        type="submit"
                        disabled={path.length === 0 || submitting}
                        className={`w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-900 font-semibold ${isMobile ? 'text-xs py-2' : 'text-sm py-2.5'}`}
                      >
                        {submitting ? '⚙️ Mengirim...' : '✨ Kirim Jawaban'}
                      </Button>
                    </form>

                    {/* Hints */}
                    {defuserHints.length > 0 && (
                      <div className={`${isMobile ? 'p-2' : 'p-3'} rounded-lg border border-blue-700/40 bg-gradient-to-r from-blue-950/40 to-stone-900/30`}>
                        <h5 className={`text-blue-200 font-medium mb-1 ${isMobile ? 'text-xs' : 'text-sm'} flex items-center gap-1`}>
                          <span>💡</span>
                          <span>Petunjuk</span>
                        </h5>
                        <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90 space-y-1 list-disc pl-4`}>
                          {defuserHints.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* EXPERT PANEL - 9 cols on desktop, responsive grid inside */}
            {(isExpert || isHost) && (
              <div className="lg:col-span-9">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                  {/* Tree Visualization - spans 2 cols on md+ */}
                  <Card className="md:col-span-2 border border-emerald-700/40 bg-gradient-to-b from-stone-900/60 to-emerald-950/40">
                    <CardHeader className={`${isMobile ? 'pb-2 pt-2 px-3' : 'pb-2 pt-3 px-4'}`}>
                      <CardTitle className={`${isMobile ? 'text-sm' : 'text-base'} text-emerald-300 flex items-center gap-2`}>
                        <span>🎄</span>
                        <span>Gambar Pohon</span>
                      </CardTitle>
                      <CardDescription className={`text-stone-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        Kotak emas = Titik awal | Label KIRI/KANAN pada garis | Kotak hijau = Titik cabang
                      </CardDescription>
                    </CardHeader>
                    <CardContent className={isMobile ? 'p-3' : 'p-4'}>
                      {treeArray && treeArray.length > 0 ? (
                        <div
                          className="rounded-lg p-3 bg-stone-950 border border-stone-700/40 overflow-x-auto overflow-y-auto"
                          style={{ maxHeight: `${maxTreeHeight}px` }}
                        >
                          <SvgBinaryTree array={treeArray} isMobile={isMobile} />
                        </div>
                      ) : (
                        <div className={`text-stone-400 italic ${isMobile ? 'text-sm' : 'text-base'} text-center p-4`}>
                          Data pohon tidak tersedia
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className={`bg-amber-800 text-amber-100 border border-amber-700/40 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          🟡 Titik Awal
                        </Badge>
                        <Badge className={`bg-emerald-800 text-emerald-100 border border-emerald-700/40 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          🟢 Titik Cabang
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Panduan Membimbing */}
                  <Card className={`${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-emerald-700/50 bg-gradient-to-r from-emerald-950/40 to-stone-900/30`}>
                    <h5 className={`text-emerald-200 font-semibold mb-2 ${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
                      <span>🧭</span>
                      <span>Cara Membimbing Pemain</span>
                    </h5>
                    <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-emerald-200/90 space-y-1.5 list-disc pl-5`}>
                      <li>Tanyakan ke pemain apa yang dia lihat</li>
                      <li>Biarkan mereka berpikir sendiri dulu</li>
                      <li>Berikan petunjuk bertahap, jangan langsung kasih jawaban</li>
                      <li>Fokus pada cara berpikir, bukan hasil akhir</li>
                    </ul>
                  </Card>

                  {/* Konsep Pohon Biner */}
                  <Card className={`${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-purple-700/50 bg-gradient-to-r from-purple-950/40 to-stone-900/30`}>
                    <h5 className={`text-purple-200 font-semibold mb-2 ${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
                      <span>📚</span>
                      <span>Tentang Pohon Biner</span>
                    </h5>
                    <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-purple-200/90 space-y-1.5 list-disc pl-5`}>
                      <li>Pohon Biner: setiap titik punya maksimal 2 cabang (kiri & kanan)</li>
                      <li>BST: cabang kiri lebih kecil, cabang kanan lebih besar dari titik saat ini</li>
                      <li>Titik akhir: tidak punya cabang lagi</li>
                      <li>Titik awal: tempat mulai pencarian</li>
                    </ul>
                  </Card>

                  {/* Cara Menjelajah Pohon */}
                  <Card className={`md:col-span-2 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-blue-700/50 bg-gradient-to-r from-blue-950/40 to-stone-900/30`}>
                    <h5 className={`text-blue-200 font-semibold mb-2 ${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
                      <span>🔍</span>
                      <span>Cara Menjelajah Pohon</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-100 font-semibold mb-1`}>Inorder</p>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90`}>Kiri → Tengah → Kanan (urutan terurut)</p>
                      </div>
                      <div>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-100 font-semibold mb-1`}>Preorder</p>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90`}>Tengah → Kiri → Kanan (salin struktur)</p>
                      </div>
                      <div>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-100 font-semibold mb-1`}>Postorder</p>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-200/90`}>Kiri → Kanan → Tengah (evaluasi)</p>
                      </div>
                    </div>
                  </Card>

                </div>
              </div>
            )}

          </div>
        </CardContent>
      </Card>

      {/* STYLES */}
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

        @media (max-width: 768px) {
          .dungeon-card-glow {
            box-shadow: 0 0 10px rgba(120, 113, 108, 0.25);
          }
        }

        /* Scrollbar styling */
        .overflow-x-auto::-webkit-scrollbar,
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .overflow-x-auto::-webkit-scrollbar-track,
        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.5);
          border-radius: 3px;
        }

        .overflow-x-auto::-webkit-scrollbar-thumb,
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(52, 211, 153, 0.6);
          border-radius: 3px;
        }

        .overflow-x-auto::-webkit-scrollbar-thumb:hover,
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(52, 211, 153, 0.8);
        }
      `}</style>
    </div>
  );
}
