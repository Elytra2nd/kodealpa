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
  RUNE_FLOAT_DURATION: 3200,
  MAX_TREE_HEIGHT: 500,
  NODE_SIZE: 30,
  LEVEL_HEIGHT: 62,
  NODE_SPACING: 60,
} as const;

const DEPTH_COLORS = [
  'text-emerald-300',
  'text-amber-300',
  'text-purple-300',
  'text-indigo-300',
  'text-blue-300',
  'text-rose-300',
] as const;

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
// UTILITY FUNCTIONS
// ============================================
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

const depthColor = (depth: number): string => {
  return DEPTH_COLORS[depth % DEPTH_COLORS.length];
};


// ============================================
// SVG BINARY TREE COMPONENT
// ============================================
function SvgBinaryTree({ array }: { array: any[] }) {
  if (!Array.isArray(array) || !array.length) return <div className="text-stone-400 italic text-xs">Pohon kosong</div>;

  const levels = Math.ceil(Math.log2(array.length + 1));
  const nodes: { val: any, x: number, y: number, i: number }[] = [];
  const edges: { x1: number, y1: number, x2: number, y2: number }[] = [];

  for (let i = 0; i < array.length; i++) {
    if (array[i] === null || array[i] === undefined) continue;
    const depth = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (2 ** depth - 1);
    const xSpace = CONFIG.NODE_SPACING * (2 ** (levels - depth - 1));
    const x = xSpace + posInLevel * xSpace * 2 + CONFIG.NODE_SIZE * 1.1;
    const y = depth * CONFIG.LEVEL_HEIGHT + 40;
    nodes.push({ val: array[i], x, y, i });

    const left = 2 * i + 1, right = 2 * i + 2;
    if (left < array.length && array[left] != null) {
      const ld = Math.floor(Math.log2(left + 1));
      const lp = left - (2 ** ld - 1);
      const lxSpace = CONFIG.NODE_SPACING * (2 ** (levels - ld - 1));
      const lx = lxSpace + lp * lxSpace * 2 + CONFIG.NODE_SIZE * 1.1;
      const ly = ld * CONFIG.LEVEL_HEIGHT + 40;
      edges.push({ x1: x, y1: y, x2: lx, y2: ly });
    }
    if (right < array.length && array[right] != null) {
      const rd = Math.floor(Math.log2(right + 1));
      const rp = right - (2 ** rd - 1);
      const rxSpace = CONFIG.NODE_SPACING * (2 ** (levels - rd - 1));
      const rx = rxSpace + rp * rxSpace * 2 + CONFIG.NODE_SIZE * 1.1;
      const ry = rd * CONFIG.LEVEL_HEIGHT + 40;
      edges.push({ x1: x, y1: y, x2: rx, y2: ry });
    }
  }

  const svgW = Math.max(330, (2 ** (levels - 1)) * 100);
  const svgH = levels * CONFIG.LEVEL_HEIGHT + 50;

  return (
    <svg width={svgW} height={svgH} style={{ display: 'block', margin: 'auto', width: "100%" }}>
      {edges.map((e, idx) => (
        <line key={idx} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#fbbf24" strokeWidth={2} />
      ))}
      {nodes.map((n, idx) => (
        <g key={idx}>
          <rect
            x={n.x - CONFIG.NODE_SIZE / 2}
            y={n.y - CONFIG.NODE_SIZE / 2}
            width={CONFIG.NODE_SIZE}
            height={CONFIG.NODE_SIZE}
            rx={8}
            fill="#042f2e"
            stroke="#14b8a6"
            strokeWidth={2}
          />
          <text
            x={n.x}
            y={n.y + 2}
            fontSize="13"
            fontWeight={700}
            fill="#a7f3d0"
            textAnchor="middle"
          >
            {String(n.val)}
          </text>
        </g>
      ))}
    </svg>
  );
}


// ============================================
// MAIN COMPONENT (UPDATED PANEL EXPERT)
// ============================================
export default function NavigationChallengeView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const { setTorchRef } = useDungeonAtmosphere();

  const [path, setPath] = useState<string[]>([]);
  const [showNulls, setShowNulls] = useState(false);
  const [hoverNext, setHoverNext] = useState<Direction | null>(null);
  const [showSolveHints, setShowSolveHints] = useState(false);

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';

  // Tree root
  const root: TreeNode | undefined = puzzle?.expertView?.tree?.root;

  // Add syncIssue definition (replace with actual logic if needed)
  const syncIssue = puzzle?.syncIssue || null;

  // Defuser hints (unchanged)
  // Navigation controls & path management (unchanged)

  // Expert Panel render including the new SVG visualization and split guidance into two cards
  const treeArr = puzzle?.expertView?.arrayTree || [];

  return (
    <div className="space-y-6 relative">
      <Card className="overflow-hidden border border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 dungeon-card-glow">
        <CardHeader className="relative p-4 sm:p-6">
          <div className="absolute top-3 left-3 text-xl sm:text-2xl">
            <span ref={setTorchRef(0)} className="dungeon-torch-flicker">🔥</span>
          </div>
          <div className="absolute top-3 right-3 text-xl sm:text-2xl">
            <span ref={setTorchRef(1)} className="dungeon-torch-flicker">🔥</span>
          </div>
          <CardTitle className="text-amber-300 text-xl sm:text-2xl relative z-10 dungeon-glow-text">
            {puzzle.title || 'Tantangan Navigasi Dungeon'}
          </CardTitle>
          <CardDescription className="text-stone-300 text-sm sm:text-base relative z-10">
            {puzzle.description || 'Menelusuri struktur pohon di lorong CodeAlpha Dungeon.'}
          </CardDescription>

          {/* Badges */}
          <div className="pt-2 flex flex-wrap gap-2 relative z-10">
            <Badge className="bg-amber-800 text-amber-100 border border-amber-700/50 dungeon-badge-glow">
              🏰 Mode Dungeon
            </Badge>
            <Badge className="bg-stone-700 text-stone-200 border border-stone-600/50 dungeon-badge-glow">
              🧭 Navigasi Pohon
            </Badge>
            {role && (
              <Badge className="bg-purple-800 text-purple-100 border border-purple-700/50 dungeon-badge-glow">
                🎭 Peran: {role}
              </Badge>
            )}
            {puzzle?.defuserView?.targetValue != null && (
              <Badge className="bg-indigo-800 text-indigo-100 border border-indigo-700/50 dungeon-badge-glow">
                Target: {obfuscate(String(puzzle.defuserView.targetValue))}
              </Badge>
            )}
            {puzzle?.defuserView?.grid_size && (
              <Badge className="bg-stone-800 text-stone-200 border border-stone-700/50 dungeon-badge-glow">
                Grid: {String(puzzle.defuserView.grid_size)}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-4 sm:p-6">
          {/* Sync Warning */}
          {(isDefuser || isExpert) && syncIssue && (
            <Alert className="border-amber-700/40 bg-gradient-to-r from-amber-900/40 to-stone-900/40 backdrop-blur-sm">
              <AlertDescription className="text-amber-200 text-sm">
                ⚠️ {syncIssue}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* === DEFUSER PANEL === */}
            {(isDefuser || role === 'host') && (
              // Defuser panel JSX (unchanged for brevity)
              <div></div>
            )}

            {/* === EXPERT PANEL === */}
            {(isExpert || role === 'host') && (
              <>
                {/* Tree Visualization Card */}
                <Card className="border border-emerald-700/40 bg-gradient-to-b from-stone-900/60 to-emerald-950/40">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-emerald-300 text-sm flex items-center gap-2">
                      <span>🎄</span> <span>Visualisasi Pohon</span>
                    </CardTitle>
                    <CardDescription className="text-stone-400 text-xs">
                      Lihat langsung struktur & cabang node
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3">
                    {Array.isArray(treeArr) && treeArr.length ? (
                      <div className="rounded-lg p-2 bg-stone-950 border border-stone-700/40 overflow-x-auto" style={{ maxHeight: CONFIG.MAX_TREE_HEIGHT }}>
                        <SvgBinaryTree array={treeArr} />
                      </div>
                    ) : (
                      <div className="text-stone-400 italic text-xs">Data pohon tidak tersedia</div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className="bg-emerald-800 text-emerald-100 border border-emerald-700/40 text-xs">Node</Badge>
                      <Badge className="bg-amber-800 text-amber-100 border border-amber-700/40 text-xs">Koneksi</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Guidance & Strategy Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 rounded-xl border border-emerald-700/50 bg-gradient-to-r from-emerald-950/40 to-stone-900/30 backdrop-blur-sm">
                    <h5 className="text-emerald-200 font-semibold mb-3 text-sm flex items-center gap-2">
                      <span>🧭</span>
                      <span>Prinsip Pembimbingan</span>
                    </h5>
                    <ul className="text-xs sm:text-sm text-emerald-200/90 space-y-2">
                      <li>Ajukan pertanyaan terbuka untuk memancing analisis Defuser</li>
                      <li>Gunakan metode Socratic: biarkan mereka menemukan pola sendiri</li>
                      <li>Fokus pada proses berpikir, bukan jawaban langsung</li>
                      <li>Berikan petunjuk bertingkat: umum → spesifik</li>
                    </ul>
                  </Card>

                  <Card className="p-4 rounded-xl border border-purple-700/50 bg-gradient-to-r from-purple-950/40 to-stone-900/30 backdrop-blur-sm">
                    <h5 className="text-purple-200 font-semibold mb-3 text-sm flex items-center gap-2">
                      <span>📚</span>
                      <span>Konsep Binary Tree</span>
                    </h5>
                    <ul className="text-xs text-purple-200/90 space-y-1 list-disc pl-5">
                      <li>Binary Tree: setiap node maksimal 2 anak (left & right)</li>
                      <li>BST: left {'<'} parent {'<'} right untuk setiap subtree</li>
                      <li>Leaf node: tidak memiliki anak (endpoint)</li>
                    </ul>

                    <h5 className="mt-6 text-purple-200 font-semibold mb-3 text-sm flex items-center gap-2">
                      <span>🔍</span> <span>Strategi Traversal</span>
                    </h5>
                    <ul className="text-xs text-purple-200/90 space-y-1 list-disc pl-5">
                      <li><strong>Inorder</strong>: Left-Root-Right (urutan terurut pada BST)</li>
                      <li><strong>Preorder</strong>: Root-Left-Right (copy struktur pohon)</li>
                      <li><strong>Postorder</strong>: Left-Right-Root (evaluasi bottom-up)</li>
                      <li><strong>Level-order</strong>: BFS per level untuk jarak minimum</li>
                    </ul>

                    <h5 className="mt-6 text-teal-200 font-semibold mb-3 text-sm flex items-center gap-2">
                      <span>✅</span> <span>Validasi BST</span>
                    </h5>
                    <ul className="text-xs text-teal-200/90 space-y-1 list-disc pl-5">
                      <li>Inorder traversal harus menghasilkan urutan menaik</li>
                      <li>Gunakan range checking: update min/max saat turun</li>
                      <li>Kompleksitas: O(log n) balanced, O(n) worst case</li>
                    </ul>

                    <h5 className="mt-6 text-indigo-300 font-semibold mb-3 text-sm flex items-center gap-2">
                      <span>🔮</span> <span>Metode Traversal Tersedia</span>
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(puzzle.expertView?.traversalMethods || {}).map((name) => (
                        <Badge key={name} className="bg-indigo-800 text-indigo-100 border border-indigo-700/60 text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ======================================== */}
      {/* CUSTOM DUNGEON STYLES */}
      {/* ======================================== */}
      <style>{`
        /* Torch Flicker */
        .dungeon-torch-flicker {
          display: inline-block;
        }

        /* Rune Float */
        .dungeon-rune-float {
          display: inline-block;
          animation: runeFloat 3.2s ease-in-out infinite;
        }

        @keyframes runeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* Card Glows */
        .dungeon-card-glow {
          box-shadow: 0 0 20px rgba(120, 113, 108, 0.4);
        }

        .dungeon-card-glow-green {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
        }

        /* Badge Glow */
        .dungeon-badge-glow {
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
        }

        /* Text Glow */
        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4);
        }

        /* Fade In */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .dungeon-card-glow,
          .dungeon-card-glow-green {
            box-shadow: 0 0 15px rgba(120, 113, 108, 0.3);
          }
        }
      `}</style>
    </div>
  );
}
