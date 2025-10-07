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
  MAX_ACCORDION_HEIGHT: 200,
  NODE_SIZE: 36,
  LEVEL_HEIGHT: 70,
  NODE_SPACING: 50,
} as const;


const RUNE_MAP: Record<string, string> = {
  '0': '◇', '1': '†', '2': '♁', '3': '♆', '4': '♄',
  '5': '♃', '6': '☿', '7': '☼', '8': '◈', '9': '★',
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
interface TreeNodeData {
  value: any;
  x: number;
  y: number;
  index: number;
}


interface TreeConnection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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


// Calculate positions for tree nodes and connections
const calculateTreeLayout = (arr: any[]): { nodes: TreeNodeData[]; connections: TreeConnection[] } => {
  const nodes: TreeNodeData[] = [];
  const connections: TreeConnection[] = [];

  const maxDepth = Math.floor(Math.log2(arr.length)) + 1;
  const maxWidth = Math.pow(2, maxDepth - 1) * CONFIG.NODE_SPACING;

  arr.forEach((value, index) => {
    if (value == null) return;

    const level = Math.floor(Math.log2(index + 1));
    const positionInLevel = index - (Math.pow(2, level) - 1);
    const nodesInLevel = Math.pow(2, level);

    const x = maxWidth / 2 + (positionInLevel - nodesInLevel / 2 + 0.5) * (maxWidth / nodesInLevel);
    const y = level * CONFIG.LEVEL_HEIGHT + 30;

    nodes.push({ value, x, y, index });

    // Add connections to children
    const leftChildIndex = 2 * index + 1;
    const rightChildIndex = 2 * index + 2;

    if (leftChildIndex < arr.length && arr[leftChildIndex] != null) {
      const leftLevel = Math.floor(Math.log2(leftChildIndex + 1));
      const leftPosInLevel = leftChildIndex - (Math.pow(2, leftLevel) - 1);
      const leftNodesInLevel = Math.pow(2, leftLevel);
      const leftX = maxWidth / 2 + (leftPosInLevel - leftNodesInLevel / 2 + 0.5) * (maxWidth / leftNodesInLevel);
      const leftY = leftLevel * CONFIG.LEVEL_HEIGHT + 30;

      connections.push({ x1: x, y1: y + CONFIG.NODE_SIZE / 2, x2: leftX, y2: leftY - CONFIG.NODE_SIZE / 2 });
    }

    if (rightChildIndex < arr.length && arr[rightChildIndex] != null) {
      const rightLevel = Math.floor(Math.log2(rightChildIndex + 1));
      const rightPosInLevel = rightChildIndex - (Math.pow(2, rightLevel) - 1);
      const rightNodesInLevel = Math.pow(2, rightLevel);
      const rightX = maxWidth / 2 + (rightPosInLevel - rightNodesInLevel / 2 + 0.5) * (maxWidth / rightNodesInLevel);
      const rightY = rightLevel * CONFIG.LEVEL_HEIGHT + 30;

      connections.push({ x1: x, y1: y + CONFIG.NODE_SIZE / 2, x2: rightX, y2: rightY - CONFIG.NODE_SIZE / 2 });
    }
  });

  return { nodes, connections };
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


  const setTorchRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    torchRefs.current[index] = el;
  }, []);


  return { setTorchRef };
};


// ============================================
// MEMOIZED COMPONENTS
// ============================================
const RuneLegendBadge = memo(({ num, sym }: { num: string; sym: string }) => (
  <Badge className="bg-stone-800 text-amber-100 border border-amber-700/60 text-[9px] px-1 py-0">
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


  const treeLayout = useMemo(() => {
    if (Array.isArray(puzzle?.defuserView?.pattern)) {
      return calculateTreeLayout(puzzle.defuserView.pattern);
    }
    return { nodes: [], connections: [] };
  }, [puzzle?.defuserView?.pattern]);


  const transformedHints = useMemo(() => {
    const base = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];
    const extra = [
      'Amati selisih yang tidak selalu tetap; terkadang ia berulang dalam siklus kabur.',
      'Jejak perubahan bisa bertumpuk: selisih dari selisih kerap membisikkan pola.',
    ];
    return [...base, ...extra].slice(0, 2).map(obfuscateText);
  }, [puzzle]);


  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = jawaban.trim();
    if (!trimmed) return;
    onSubmitAttempt(trimmed);
    setJawaban('');
  }, [jawaban, onSubmitAttempt]);


  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= CONFIG.MAX_INPUT_LENGTH) {
      setJawaban(value);
    }
  }, []);


  if (!puzzle) {
    return <LoadingState />;
  }


  const svgHeight = treeLayout.nodes.length > 0
    ? Math.max(...treeLayout.nodes.map(n => n.y)) + 50
    : 200;
  const svgWidth = 400;


  return (
    <div className="space-y-2 max-w-7xl mx-auto">
      <Card className="overflow-hidden border-2 border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
        <CardHeader className="relative p-2">
          <div ref={setTorchRef(0)} className="absolute top-1 left-2 text-base">🔥</div>
          <div ref={setTorchRef(1)} className="absolute top-1 right-2 text-base">🔥</div>
          <CardTitle className="text-amber-300 text-sm sm:text-base text-center relative z-10">
            {puzzle.title || 'Analisis Pola Mistis'}
          </CardTitle>
          <CardDescription className="text-stone-300 text-[9px] sm:text-[10px] text-center relative z-10">
            {puzzle.description || 'Temukan pola tersembunyi'}
          </CardDescription>
        </CardHeader>


        <CardContent className="p-2 space-y-2">
          {/* Rule hint */}
          {(isExpert || isHost) && puzzle.expertView?.rule && (
            <div className="p-1 rounded border border-stone-700/40 bg-stone-800/40">
              <p className="text-stone-300 italic text-[9px] text-center">
                "{dungeonizeRule(puzzle.expertView.rule)}"
              </p>
            </div>
          )}


          {/* MAIN GRID - 3 columns: Defuser | Expert Panel 1 | Expert Panel 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {/* DEFUSER PANEL */}
            {(isDefuser || isHost) && (
              <Card className="border border-blue-700/40 bg-gradient-to-b from-stone-900/90 to-blue-950/30">
                <CardHeader className="p-1.5 pb-1">
                  <CardTitle className="text-[10px] text-blue-300 text-center">
                    🌳 Panel Defuser
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-1.5 space-y-1.5">
                  {treeLayout.nodes.length > 0 ? (
                    <>
                      {/* SVG TREE WITH VISIBLE LINES */}
                      <div className="tree-svg-container">
                        <svg
                          width="100%"
                          height={svgHeight}
                          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                          className="tree-svg"
                        >
                          {/* Draw connections first (behind nodes) */}
                          {treeLayout.connections.map((conn, idx) => (
                            <line
                              key={`conn-${idx}`}
                              x1={conn.x1}
                              y1={conn.y1}
                              x2={conn.x2}
                              y2={conn.y2}
                              stroke="rgba(251, 191, 36, 0.7)"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          ))}

                          {/* Draw nodes */}
                          {treeLayout.nodes.map((node) => {
                            const isEmpty = node.value === '?' || node.value == null;
                            return (
                              <g key={node.index}>
                                <rect
                                  x={node.x - CONFIG.NODE_SIZE / 2}
                                  y={node.y - CONFIG.NODE_SIZE / 2}
                                  width={CONFIG.NODE_SIZE}
                                  height={CONFIG.NODE_SIZE}
                                  rx="6"
                                  fill={isEmpty ? 'rgba(127, 29, 29, 0.6)' : 'rgba(6, 78, 59, 0.6)'}
                                  stroke={isEmpty ? 'rgb(220, 38, 38)' : 'rgb(5, 150, 105)'}
                                  strokeWidth="2"
                                  className="tree-node-rect"
                                />
                                <text
                                  x={node.x}
                                  y={node.y}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fill={isEmpty ? 'rgb(254, 202, 202)' : 'rgb(167, 243, 208)'}
                                  fontSize="13"
                                  fontWeight="700"
                                  className="tree-node-text"
                                >
                                  {isEmpty ? '?' : node.value}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>


                      {/* Legend - ultra compact */}
                      <div className="flex gap-1.5 text-[8px] justify-center">
                        <div className="flex items-center gap-0.5">
                          <div className="w-1.5 h-1.5 rounded border border-emerald-600 bg-emerald-900/40"></div>
                          <span className="text-emerald-300">Node</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <div className="w-1.5 h-1.5 rounded border border-red-600 bg-red-900/40"></div>
                          <span className="text-red-300">Missing</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <div className="w-2 h-0.5 bg-amber-500"></div>
                          <span className="text-amber-300">Edge</span>
                        </div>
                      </div>


                      {/* Input form - ultra compact */}
                      {isDefuser && (
                        <form onSubmit={handleSubmit} className="space-y-1">
                          <input
                            type="number"
                            value={jawaban}
                            onChange={handleInputChange}
                            placeholder="Angka..."
                            className="w-full h-8 text-center text-xs font-bold bg-stone-900/70 border border-amber-600/60 rounded-md text-amber-200 placeholder-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            disabled={submitting}
                            maxLength={CONFIG.MAX_INPUT_LENGTH}
                          />
                          <Button
                            type="submit"
                            disabled={!jawaban.trim() || submitting}
                            className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-900 font-semibold py-1 rounded-md disabled:opacity-50 text-[9px] h-7"
                          >
                            {submitting ? '⚙️' : '✨'} Kirim
                          </Button>


                          {/* Hints - ultra compact */}
                          {transformedHints.length > 0 && (
                            <Accordion type="single" collapsible>
                              <AccordionItem value="hints" className="border-blue-700/40">
                                <AccordionTrigger className="text-blue-200 text-[9px] hover:text-blue-300 py-0.5">
                                  💡 Petunjuk
                                </AccordionTrigger>
                                <AccordionContent
                                  className="p-1 rounded bg-blue-950/40 overflow-y-auto"
                                  style={{ maxHeight: `${CONFIG.MAX_ACCORDION_HEIGHT}px` }}
                                >
                                  <ul className="text-[8px] text-blue-200/90 space-y-0.5 list-disc pl-2">
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
                    <div className="p-1.5 rounded border border-red-700/40 bg-red-950/40 text-red-200 text-center text-[9px]">
                      Data tidak ditemukan
                    </div>
                  )}
                </CardContent>
              </Card>
            )}


            {/* EXPERT PANEL 1 - Panduan & Rune */}
            {(isExpert || isHost) && puzzle.expertView && (
              <Card className="border border-emerald-700/40 bg-gradient-to-b from-stone-900/90 to-emerald-950/30">
                <CardHeader className="p-1.5 pb-1">
                  <CardTitle className="text-[10px] text-emerald-300 text-center">
                    📖 Panel Expert - Panduan
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-1.5 space-y-1">
                  <Accordion type="single" collapsible className="space-y-0.5">
                    <AccordionItem value="runes" className="border-stone-700/40">
                      <AccordionTrigger className="text-stone-200 text-[9px] py-0.5">
                        ✨ Legenda Rune
                      </AccordionTrigger>
                      <AccordionContent className="p-1">
                        <div className="flex flex-wrap gap-0.5 justify-center">
                          {runeLegend.slice(0, 10).map(({ num, sym }) => (
                            <RuneLegendBadge key={num} num={num} sym={sym} />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>


                    <AccordionItem value="konsep" className="border-stone-700/40">
                      <AccordionTrigger className="text-stone-200 text-[9px] py-0.5">
                        📚 Konsep Binary Tree
                      </AccordionTrigger>
                      <AccordionContent className="p-1 text-[8px] text-stone-300 space-y-0.5">
                        <p>• Root: node teratas</p>
                        <p>• Parent → Left & Right child</p>
                        <p>• Leaf: node tanpa child</p>
                        <p>• Level: kedalaman dari root</p>
                      </AccordionContent>
                    </AccordionItem>


                    <AccordionItem value="pembimbingan" className="border-stone-700/40">
                      <AccordionTrigger className="text-stone-200 text-[9px] py-0.5">
                        🧭 Prinsip Pembimbingan
                      </AccordionTrigger>
                      <AccordionContent className="p-1 text-[8px] text-stone-300 space-y-0.5">
                        <p>• Ajukan pertanyaan terbuka</p>
                        <p>• Pandu pada pola, bukan angka</p>
                        <p>• Validasi hipotesis bersama</p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            )}


            {/* EXPERT PANEL 2 - Strategi & Tools */}
            {(isExpert || isHost) && puzzle.expertView && (
              <Card className="border border-purple-700/40 bg-gradient-to-b from-stone-900/90 to-purple-950/30">
                <CardHeader className="p-1.5 pb-1">
                  <CardTitle className="text-[10px] text-purple-300 text-center">
                    🛠️ Panel Expert - Strategi
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-1.5 space-y-1">
                  <Accordion type="single" collapsible className="space-y-0.5">
                    <AccordionItem value="traversal" className="border-stone-700/40">
                      <AccordionTrigger className="text-stone-200 text-[9px] py-0.5">
                        🔍 Strategi Traversal
                      </AccordionTrigger>
                      <AccordionContent className="p-1 text-[8px] text-stone-300 space-y-0.5">
                        <p>• In-order: Left→Root→Right</p>
                        <p>• Pre-order: Root→Left→Right</p>
                        <p>• Post-order: Left→Right→Root</p>
                        <p>• Level-order: Per tingkat</p>
                      </AccordionContent>
                    </AccordionItem>


                    <AccordionItem value="validasi" className="border-stone-700/40">
                      <AccordionTrigger className="text-stone-200 text-[9px] py-0.5">
                        ✅ Validasi BST
                      </AccordionTrigger>
                      <AccordionContent className="p-1 text-[8px] text-stone-300 space-y-0.5">
                        <p>• Left child {'<'} Parent</p>
                        <p>• Right child {'>'} Parent</p>
                        <p>• Rekursif ke subtree</p>
                      </AccordionContent>
                    </AccordionItem>


                    <AccordionItem value="metode" className="border-stone-700/40">
                      <AccordionTrigger className="text-stone-200 text-[9px] py-0.5">
                        🔮 Metode Traversal
                      </AccordionTrigger>
                      <AccordionContent className="p-1 text-[8px] text-stone-300 space-y-0.5">
                        <p>• DFS: Stack/Rekursi</p>
                        <p>• BFS: Queue</p>
                        <p>• Iteratif vs Rekursif</p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>


      {/* MINIMAL STYLES */}
      <style>{`
        .tree-svg-container {
          background: radial-gradient(circle at center, rgba(0,0,0,0.15) 0%, transparent 70%);
          border-radius: 6px;
          padding: 5px;
          overflow-x: auto;
        }


        .tree-svg {
          display: block;
          margin: 0 auto;
        }


        .tree-node-rect {
          transition: all 0.3s;
        }


        .tree-node-rect:hover {
          filter: brightness(1.3);
        }


        .tree-svg-container::-webkit-scrollbar {
          height: 4px;
        }


        .tree-svg-container::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.5);
        }


        .tree-svg-container::-webkit-scrollbar-thumb {
          background: rgba(180, 83, 9, 0.6);
        }


        .overflow-y-auto::-webkit-scrollbar {
          width: 3px;
        }


        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.5);
        }


        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(180, 83, 9, 0.6);
        }
      `}</style>
    </div>
  );
}
