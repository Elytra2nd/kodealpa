import React, { useMemo, useState, useCallback, useRef, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/Components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { gsap } from 'gsap';


// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  TORCH_FLICKER_INTERVAL: 2200,
  MAX_INPUT_LENGTH: 20,
  MAX_ACCORDION_HEIGHT: 300,
} as const;


const RUNE_MAP: Record<string, string> = {
  '0': '◇',
  '1': '†',
  '2': '♁',
  '3': '♆',
  '4': '♄',
  '5': '♃',
  '6': '☿',
  '7': '☼',
  '8': '◈',
  '9': '★',
} as const;


const OBFUSCATION_PATTERNS = [
  { pattern: /\d/g, replacer: (d: string) => RUNE_MAP[d] ?? d },
  { pattern: /\b(kali|perkalian)\b/gi, replacer: () => 'ritual penggandaan' },
  { pattern: /\b(tambah|penjumlahan)\b/gi, replacer: () => 'ritus penambahan' },
  { pattern: /\b(kurang|pengurangan)\b/gi, replacer: () => 'pemotongan runik' },
  { pattern: /\b(bagi|pembagian)\b/gi, replacer: () => 'pemisahan sigil' },
  { pattern: /\b(pangkat|eksponen)\b/gi, replacer: () => 'sigil eksponensial' },
] as const;


// ============================================
// TYPE DEFINITIONS
// ============================================
interface TreeNode {
  value: number | string;
  left?: TreeNode;
  right?: TreeNode;
}


interface Props {
  puzzle: any;
  role?: 'defuser' | 'expert' | 'host';
  onSubmitAttempt: (input: string) => void;
  submitting: boolean;
}


// ============================================
// UTILITY FUNCTIONS
// ============================================
const obfuscateText = (text: string): string => {
  try {
    let result = String(text);
    OBFUSCATION_PATTERNS.forEach(({ pattern, replacer }) => {
      result = result.replace(pattern, replacer as any);
    });
    return result;
  } catch (error) {
    console.error('Error obfuscating text:', error);
    return text;
  }
};


const dungeonizeRule = (rule?: string): string => {
  const base = rule ? String(rule) : 'Jejak perubahan antar-suku menuntun peziarah angka';
  return obfuscateText(`Petuah lorong: ${base}`);
};


// Build binary tree from array
const buildTree = (arr: any[], index = 0): TreeNode | null => {
  if (index >= arr.length || arr[index] == null) return null;

  const node: TreeNode = {
    value: arr[index],
  };

  const leftIndex = 2 * index + 1;
  const rightIndex = 2 * index + 2;

  if (leftIndex < arr.length) {
    const leftChild = buildTree(arr, leftIndex);
    if (leftChild) node.left = leftChild;
  }

  if (rightIndex < arr.length) {
    const rightChild = buildTree(arr, rightIndex);
    if (rightChild) node.right = rightChild;
  }

  return node;
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
            opacity: Math.random() * 0.15 + 0.85,
            duration: 0.22,
            ease: 'power1.inOut',
          });
        }
      });
    }, CONFIG.TORCH_FLICKER_INTERVAL);


    return () => clearInterval(torchInterval);
  }, []);


  const setTorchRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      torchRefs.current[index] = el;
    },
    []
  );


  return { setTorchRef };
};


// ============================================
// TREE VISUALIZATION COMPONENT
// ============================================
const TreeVisualizer = memo(({ node, level = 0 }: { node: TreeNode | null; level?: number }) => {
  if (!node) return null;

  const isEmpty = node.value === '?' || node.value == null;
  const hasChildren = node.left || node.right;


  return (
    <div className="tree-item">
      <div className="tree-node-wrapper">
        <div
          className={`tree-node ${
            isEmpty
              ? 'tree-node-missing'
              : 'tree-node-active'
          }`}
        >
          {isEmpty ? '?' : node.value}
        </div>
      </div>


      {hasChildren && (
        <div className="tree-children-wrapper">
          <div className="tree-children">
            {node.left && (
              <div className="tree-child-branch">
                <TreeVisualizer node={node.left} level={level + 1} />
              </div>
            )}
            {node.right && (
              <div className="tree-child-branch">
                <TreeVisualizer node={node.right} level={level + 1} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});


TreeVisualizer.displayName = 'TreeVisualizer';


// ============================================
// MEMOIZED COMPONENTS
// ============================================
const RuneLegendBadge = memo(({ num, sym }: { num: string; sym: string }) => (
  <Badge className="bg-stone-800 text-amber-100 border border-amber-700/60 text-xs">
    {sym}={num}
  </Badge>
));


RuneLegendBadge.displayName = 'RuneLegendBadge';


const LoadingState = memo(() => (
  <div className="min-h-[200px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-red-950 border-2 border-red-700/60 rounded-xl">
    <p className="text-red-200 font-medium text-lg">Data teka-teki tidak tersedia</p>
  </div>
));


LoadingState.displayName = 'LoadingState';


// ============================================
// MAIN COMPONENT
// ============================================
export default function PatternAnalysisView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const { setTorchRef } = useDungeonAtmosphere();
  const [jawaban, setJawaban] = useState('');


  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';
  const isHost = role === 'host';


  const runeLegend = useMemo(() => Object.entries(RUNE_MAP).map(([num, sym]) => ({ num, sym })), []);


  const treeRoot = useMemo(() => {
    if (Array.isArray(puzzle?.defuserView?.pattern)) {
      return buildTree(puzzle.defuserView.pattern);
    }
    return null;
  }, [puzzle?.defuserView?.pattern]);


  const transformedHints = useMemo(() => {
    const base = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];
    const extra = [
      'Amati selisih yang tidak selalu tetap; terkadang ia berulang dalam siklus kabur.',
      'Jejak perubahan bisa bertumpuk: selisih dari selisih kerap membisikkan pola.',
      'Cermati lonjakan drastis; itu bisa pertanda ritual penggandaan terselubung.',
      'Bila aturan tampak tersembunyi, periksa residu ketika dipecah oleh bilangan kecil.',
    ];
    return [...base, ...extra].slice(0, 4).map(obfuscateText);
  }, [puzzle]);


  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = jawaban.trim();
      if (!trimmed) return;
      onSubmitAttempt(trimmed);
      setJawaban('');
    },
    [jawaban, onSubmitAttempt]
  );


  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= CONFIG.MAX_INPUT_LENGTH) {
      setJawaban(value);
    }
  }, []);


  if (!puzzle) {
    return <LoadingState />;
  }


  return (
    <div className="space-y-3">
      <Card className="overflow-hidden border-2 border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
        <CardHeader className="relative p-3">
          <div ref={setTorchRef(0)} className="absolute top-2 left-2 text-xl">
            🔥
          </div>
          <div ref={setTorchRef(1)} className="absolute top-2 right-2 text-xl">
            🔥
          </div>
          <CardTitle className="text-amber-300 text-lg sm:text-xl text-center relative z-10">
            {puzzle.title || 'Analisis Pola Mistis'}
          </CardTitle>
          <CardDescription className="text-stone-300 text-xs sm:text-sm text-center relative z-10">
            {puzzle.description || 'Temukan pola tersembunyi dalam urutan angka dungeon'}
          </CardDescription>
        </CardHeader>


        <CardContent className="p-3 space-y-3">
          {/* Rule hint for expert/host */}
          {(isExpert || isHost) && puzzle.expertView?.rule && (
            <div className="p-2 rounded-lg border border-stone-700/40 bg-stone-800/40">
              <p className="text-stone-300 italic text-xs text-center">
                "{dungeonizeRule(puzzle.expertView.rule)}"
              </p>
            </div>
          )}


          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* DEFUSER PANEL */}
            {(isDefuser || isHost) && (
              <Card className="border-2 border-blue-700/40 bg-gradient-to-b from-stone-900/90 to-blue-950/30">
                <CardHeader className="pb-2 p-2">
                  <CardTitle className="text-xs text-blue-300 text-center flex items-center justify-center gap-2">
                    🌳 Panel Defuser - Visualisasi Pohon
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-3">
                  {treeRoot ? (
                    <>
                      {/* Tree Container with connecting lines */}
                      <div className="tree-container">
                        <TreeVisualizer node={treeRoot} />
                      </div>


                      {/* Legend */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-900/20 border border-emerald-700/30">
                          <div className="w-3 h-3 rounded-lg border-2 border-emerald-600 bg-emerald-900/40"></div>
                          <span className="text-emerald-200">Node aktif</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-900/20 border border-red-700/30">
                          <div className="w-3 h-3 rounded-lg border-2 border-red-600 bg-red-900/40"></div>
                          <span className="text-red-200">Missing (?)</span>
                        </div>
                      </div>


                      {/* Input form */}
                      {isDefuser && (
                        <form onSubmit={handleSubmit} className="space-y-2">
                          <input
                            type="number"
                            value={jawaban}
                            onChange={handleInputChange}
                            placeholder="Masukkan angka..."
                            className="w-full h-10 text-center text-base font-bold bg-stone-900/70 border-2 border-amber-600/60 rounded-lg text-amber-200 placeholder-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                            disabled={submitting}
                            maxLength={CONFIG.MAX_INPUT_LENGTH}
                          />
                          <Button
                            type="submit"
                            disabled={!jawaban.trim() || submitting}
                            className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-900 font-semibold py-2 rounded-lg disabled:opacity-50 transition-all text-xs"
                          >
                            {submitting ? '⚙️ Mengirim...' : '✨ Kirim Jawaban'}
                          </Button>


                          {/* Hints */}
                          {transformedHints.length > 0 && (
                            <Accordion type="single" collapsible>
                              <AccordionItem value="hints" className="border-blue-700/40">
                                <AccordionTrigger className="text-blue-200 text-xs hover:text-blue-300 py-2">
                                  💡 Petunjuk
                                </AccordionTrigger>
                                <AccordionContent
                                  className="p-2 rounded-lg bg-blue-950/40 overflow-y-auto"
                                  style={{ maxHeight: `${CONFIG.MAX_ACCORDION_HEIGHT}px` }}
                                >
                                  <ul className="text-xs text-blue-200/90 space-y-1 list-disc pl-3">
                                    {transformedHints.map((hint, i) => (
                                      <li key={i}>{hint}</li>
                                    ))}
                                  </ul>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          )}
                        </form>
                      )}
                    </>
                  ) : (
                    <div className="p-3 rounded-lg border border-red-700/40 bg-red-950/40 text-red-200 text-center text-xs">
                      Data urutan tidak ditemukan
                    </div>
                  )}
                </CardContent>
              </Card>
            )}


            {/* EXPERT PANEL */}
            {(isExpert || isHost) && puzzle.expertView && (
              <Card className="border-2 border-emerald-700/40 bg-gradient-to-b from-stone-900/90 to-emerald-950/30">
                <CardHeader className="pb-2 p-2">
                  <CardTitle className="text-xs text-emerald-300 text-center">
                    📖 Panel Expert
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <Tabs defaultValue="guide" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-stone-900/60 h-7">
                      <TabsTrigger value="guide" className="text-xs py-1">
                        📚 Panduan
                      </TabsTrigger>
                      <TabsTrigger value="tools" className="text-xs py-1">
                        🛠️ Tools
                      </TabsTrigger>
                    </TabsList>


                    <TabsContent value="guide" className="space-y-2 mt-2">
                      <div className="max-h-80 overflow-y-auto space-y-2">
                        <Accordion type="single" collapsible className="space-y-1">
                          <AccordionItem value="runes" className="border-stone-700/40">
                            <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-1.5">
                              ✨ Legenda Rune
                            </AccordionTrigger>
                            <AccordionContent className="p-2 text-xs">
                              <div className="flex flex-wrap gap-1 justify-center mb-1">
                                {runeLegend.slice(0, 10).map(({ num, sym }) => (
                                  <RuneLegendBadge key={num} num={num} sym={sym} />
                                ))}
                              </div>
                              <p className="text-stone-300 text-center text-[10px]">
                                Pulihkan digit dari rune
                              </p>
                            </AccordionContent>
                          </AccordionItem>


                          <AccordionItem value="struktur" className="border-stone-700/40">
                            <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-1.5">
                              🌳 Struktur Pohon
                            </AccordionTrigger>
                            <AccordionContent className="p-2 text-xs text-stone-300 space-y-0.5">
                              <p>• Root → Left/Right children</p>
                              <p>• Level-order: baca per tingkat</p>
                              <p>• Relasi parent-child bisa berpola</p>
                            </AccordionContent>
                          </AccordionItem>


                          <AccordionItem value="strategi" className="border-stone-700/40">
                            <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-1.5">
                              🎯 Strategi
                            </AccordionTrigger>
                            <AccordionContent className="p-2 text-xs text-stone-300 space-y-0.5">
                              <p>• Bimbing dengan pertanyaan</p>
                              <p>• Observasi → analisis → validasi</p>
                              <p>• Cek pola per level atau branch</p>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    </TabsContent>


                    <TabsContent value="tools" className="space-y-2 mt-2">
                      <div className="p-2 rounded-lg bg-stone-900/60 border border-stone-700/40">
                        <h6 className="text-xs text-stone-300 mb-1 font-semibold">Alat Analisis</h6>
                        <ul className="text-[10px] text-stone-300 space-y-0.5 list-disc pl-3">
                          <li>Selisih per level</li>
                          <li>Pola parent → children</li>
                          <li>Lonjakan tajam → penggandaan</li>
                        </ul>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>


      {/* TREE STYLES WITH CONNECTING LINES */}
      <style>{`
        /* Tree Container */
        .tree-container {
          padding: 20px 10px;
          overflow-x: auto;
          overflow-y: visible;
          min-height: 200px;
          display: flex;
          justify-content: center;
          background: radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, transparent 70%);
          border-radius: 8px;
        }


        /* Tree Item (each node and its children) */
        .tree-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }


        /* Node Wrapper */
        .tree-node-wrapper {
          position: relative;
          z-index: 2;
          margin-bottom: 10px;
        }


        /* Tree Node (the actual circle/box) */
        .tree-node {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.125rem;
          border: 2px solid;
          transition: all 0.3s ease;
          position: relative;
          z-index: 2;
        }


        .tree-node-active {
          border-color: rgb(5, 150, 105);
          background: linear-gradient(135deg, rgba(6, 78, 59, 0.4) 0%, rgba(6, 95, 70, 0.6) 100%);
          color: rgb(167, 243, 208);
        }


        .tree-node-missing {
          border-color: rgb(220, 38, 38);
          background: linear-gradient(135deg, rgba(127, 29, 29, 0.4) 0%, rgba(153, 27, 27, 0.6) 100%);
          color: rgb(254, 202, 202);
        }


        .tree-node:hover {
          transform: scale(1.1);
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
        }


        /* Children Wrapper */
        .tree-children-wrapper {
          position: relative;
          width: 100%;
          display: flex;
          justify-content: center;
        }


        /* Vertical line from parent to children group */
        .tree-children-wrapper::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          width: 2px;
          height: 30px;
          background: linear-gradient(to bottom,
            rgba(251, 191, 36, 0.7) 0%,
            rgba(251, 191, 36, 0.4) 100%
          );
          transform: translateX(-50%);
          z-index: 1;
        }


        /* Children Container */
        .tree-children {
          display: flex;
          gap: 40px;
          padding-top: 30px;
          position: relative;
        }


        /* Horizontal line connecting siblings */
        .tree-children::before {
          content: '';
          position: absolute;
          top: 30px;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(to right,
            transparent 0%,
            rgba(251, 191, 36, 0.4) 10%,
            rgba(251, 191, 36, 0.7) 50%,
            rgba(251, 191, 36, 0.4) 90%,
            transparent 100%
          );
          z-index: 0;
        }


        /* Hide horizontal line if only one child */
        .tree-children:has(.tree-child-branch:only-child)::before {
          display: none;
        }


        /* Branch (each child column) */
        .tree-child-branch {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }


        /* Vertical line from horizontal connector to each child node */
        .tree-child-branch::before {
          content: '';
          position: absolute;
          top: -30px;
          left: 50%;
          width: 2px;
          height: 30px;
          background: linear-gradient(to bottom,
            rgba(251, 191, 36, 0.4) 0%,
            rgba(251, 191, 36, 0.7) 100%
          );
          transform: translateX(-50%);
          z-index: 1;
        }


        /* Scrollbar styles */
        .overflow-y-auto::-webkit-scrollbar,
        .overflow-x-auto::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }


        .overflow-y-auto::-webkit-scrollbar-track,
        .overflow-x-auto::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.5);
          border-radius: 3px;
        }


        .overflow-y-auto::-webkit-scrollbar-thumb,
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: rgba(180, 83, 9, 0.6);
          border-radius: 3px;
        }


        .overflow-y-auto::-webkit-scrollbar-thumb:hover,
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(180, 83, 9, 0.8);
        }


        /* Responsive adjustments */
        @media (max-width: 768px) {
          .tree-node {
            width: 40px;
            height: 40px;
            font-size: 1rem;
          }


          .tree-children {
            gap: 30px;
          }
        }
      `}</style>
    </div>
  );
}
