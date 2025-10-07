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
  MAX_ACCORDION_HEIGHT: 250,
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


// Build levels for tree visualization
const buildLevels = (arr: any[]): any[][] => {
  const levels: any[][] = [];
  let currentLevel = 0;
  let index = 0;

  while (index < arr.length) {
    const levelSize = Math.pow(2, currentLevel);
    const level: any[] = [];

    for (let i = 0; i < levelSize && index < arr.length; i++) {
      level.push(arr[index] !== undefined ? arr[index] : null);
      index++;
    }

    levels.push(level);
    currentLevel++;

    if (levels.length >= 4) break; // Max 4 levels to prevent too deep
  }

  return levels;
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
// TREE NODE COMPONENT
// ============================================
const TreeNode = memo(({ value, showLeft, showRight }: {
  value: any;
  showLeft?: boolean;
  showRight?: boolean;
}) => {
  const isEmpty = value === '?' || value == null;

  return (
    <div className="tree-cell">
      {/* Top connector line */}
      <div className="connector-top"></div>

      {/* Node */}
      <div className={`node ${isEmpty ? 'node-empty' : 'node-filled'}`}>
        {isEmpty ? '?' : value}
      </div>

      {/* Bottom connector lines */}
      {(showLeft || showRight) && (
        <div className="connector-bottom">
          <div className="connector-vertical"></div>
          <div className="connector-horizontal">
            {showLeft && <div className="connector-left"></div>}
            {showRight && <div className="connector-right"></div>}
          </div>
        </div>
      )}
    </div>
  );
});
TreeNode.displayName = 'TreeNode';


// ============================================
// MEMOIZED COMPONENTS
// ============================================
const RuneLegendBadge = memo(({ num, sym }: { num: string; sym: string }) => (
  <Badge className="bg-stone-800 text-amber-100 border border-amber-700/60 text-[10px] px-1 py-0">
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


  const treeLevels = useMemo(() => {
    if (Array.isArray(puzzle?.defuserView?.pattern)) {
      return buildLevels(puzzle.defuserView.pattern);
    }
    return [];
  }, [puzzle?.defuserView?.pattern]);


  const transformedHints = useMemo(() => {
    const base = Array.isArray(puzzle?.defuserView?.hints) ? puzzle.defuserView.hints : [];
    const extra = [
      'Amati selisih yang tidak selalu tetap; terkadang ia berulang dalam siklus kabur.',
      'Jejak perubahan bisa bertumpuk: selisih dari selisih kerap membisikkan pola.',
      'Cermati lonjakan drastis; itu bisa pertanda ritual penggandaan terselubung.',
    ];
    return [...base, ...extra].slice(0, 3).map(obfuscateText);
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


  return (
    <div className="space-y-2 max-w-7xl mx-auto">
      <Card className="overflow-hidden border-2 border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
        <CardHeader className="relative p-2">
          <div ref={setTorchRef(0)} className="absolute top-1 left-2 text-lg">🔥</div>
          <div ref={setTorchRef(1)} className="absolute top-1 right-2 text-lg">🔥</div>
          <CardTitle className="text-amber-300 text-base sm:text-lg text-center relative z-10">
            {puzzle.title || 'Analisis Pola Mistis'}
          </CardTitle>
          <CardDescription className="text-stone-300 text-[10px] sm:text-xs text-center relative z-10">
            {puzzle.description || 'Temukan pola tersembunyi'}
          </CardDescription>
        </CardHeader>


        <CardContent className="p-2 space-y-2">
          {/* Rule hint */}
          {(isExpert || isHost) && puzzle.expertView?.rule && (
            <div className="p-1.5 rounded border border-stone-700/40 bg-stone-800/40">
              <p className="text-stone-300 italic text-[10px] text-center">
                "{dungeonizeRule(puzzle.expertView.rule)}"
              </p>
            </div>
          )}


          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* DEFUSER PANEL */}
            {(isDefuser || isHost) && (
              <Card className="border border-blue-700/40 bg-gradient-to-b from-stone-900/90 to-blue-950/30">
                <CardHeader className="p-1.5 pb-1">
                  <CardTitle className="text-[11px] text-blue-300 text-center">
                    🌳 Panel Defuser - Struktur Pohon
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-1.5 space-y-2">
                  {treeLevels.length > 0 ? (
                    <>
                      {/* TREE VISUALIZATION WITH CLEAR LINES */}
                      <div className="tree-container">
                        {treeLevels.map((level, levelIndex) => (
                          <div key={levelIndex} className="tree-level">
                            {level.map((value, nodeIndex) => {
                              const globalIndex = Math.pow(2, levelIndex) - 1 + nodeIndex;
                              const leftChildIndex = 2 * globalIndex + 1;
                              const rightChildIndex = 2 * globalIndex + 2;

                              // Check if children exist in next level
                              const hasLeftChild = levelIndex < treeLevels.length - 1 &&
                                                   treeLevels[levelIndex + 1]?.[nodeIndex * 2] != null;
                              const hasRightChild = levelIndex < treeLevels.length - 1 &&
                                                    treeLevels[levelIndex + 1]?.[nodeIndex * 2 + 1] != null;

                              return (
                                <TreeNode
                                  key={nodeIndex}
                                  value={value}
                                  showLeft={hasLeftChild}
                                  showRight={hasRightChild}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>


                      {/* Legend */}
                      <div className="flex gap-2 text-[9px] justify-center">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded border border-emerald-600 bg-emerald-900/40"></div>
                          <span className="text-emerald-300">Aktif</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded border border-red-600 bg-red-900/40"></div>
                          <span className="text-red-300">Missing</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-amber-500"></div>
                          <span className="text-amber-300">Koneksi</span>
                        </div>
                      </div>


                      {/* Input form */}
                      {isDefuser && (
                        <form onSubmit={handleSubmit} className="space-y-1.5">
                          <input
                            type="number"
                            value={jawaban}
                            onChange={handleInputChange}
                            placeholder="Masukkan angka..."
                            className="w-full h-9 text-center text-sm font-bold bg-stone-900/70 border border-amber-600/60 rounded-lg text-amber-200 placeholder-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            disabled={submitting}
                            maxLength={CONFIG.MAX_INPUT_LENGTH}
                          />
                          <Button
                            type="submit"
                            disabled={!jawaban.trim() || submitting}
                            className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-900 font-semibold py-1.5 rounded-lg disabled:opacity-50 text-[11px] h-8"
                          >
                            {submitting ? '⚙️ Mengirim...' : '✨ Kirim'}
                          </Button>


                          {/* Hints */}
                          {transformedHints.length > 0 && (
                            <Accordion type="single" collapsible>
                              <AccordionItem value="hints" className="border-blue-700/40">
                                <AccordionTrigger className="text-blue-200 text-[10px] hover:text-blue-300 py-1">
                                  💡 Petunjuk
                                </AccordionTrigger>
                                <AccordionContent
                                  className="p-1.5 rounded bg-blue-950/40 overflow-y-auto"
                                  style={{ maxHeight: `${CONFIG.MAX_ACCORDION_HEIGHT}px` }}
                                >
                                  <ul className="text-[9px] text-blue-200/90 space-y-1 list-disc pl-2">
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
                    <div className="p-2 rounded border border-red-700/40 bg-red-950/40 text-red-200 text-center text-[10px]">
                      Data tidak ditemukan
                    </div>
                  )}
                </CardContent>
              </Card>
            )}


            {/* EXPERT PANEL */}
            {(isExpert || isHost) && puzzle.expertView && (
              <Card className="border border-emerald-700/40 bg-gradient-to-b from-stone-900/90 to-emerald-950/30">
                <CardHeader className="p-1.5 pb-1">
                  <CardTitle className="text-[11px] text-emerald-300 text-center">
                    📖 Panel Expert
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-1.5">
                  <Tabs defaultValue="guide" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-stone-900/60 h-6">
                      <TabsTrigger value="guide" className="text-[10px] py-0.5">📚 Panduan</TabsTrigger>
                      <TabsTrigger value="tools" className="text-[10px] py-0.5">🛠️ Tools</TabsTrigger>
                    </TabsList>


                    <TabsContent value="guide" className="space-y-1 mt-1">
                      <Accordion type="single" collapsible className="space-y-0.5">
                        <AccordionItem value="runes" className="border-stone-700/40">
                          <AccordionTrigger className="text-stone-200 text-[10px] py-1">
                            ✨ Rune
                          </AccordionTrigger>
                          <AccordionContent className="p-1.5">
                            <div className="flex flex-wrap gap-0.5 justify-center">
                              {runeLegend.slice(0, 10).map(({ num, sym }) => (
                                <RuneLegendBadge key={num} num={num} sym={sym} />
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>


                        <AccordionItem value="struktur" className="border-stone-700/40">
                          <AccordionTrigger className="text-stone-200 text-[10px] py-1">
                            🌳 Struktur Pohon
                          </AccordionTrigger>
                          <AccordionContent className="p-1.5 text-[9px] text-stone-300 space-y-0.5">
                            <p>• Level 0: Root (1 node)</p>
                            <p>• Level 1: 2 children</p>
                            <p>• Level 2: 4 grandchildren</p>
                            <p>• Index child kiri: 2n+1</p>
                            <p>• Index child kanan: 2n+2</p>
                          </AccordionContent>
                        </AccordionItem>


                        <AccordionItem value="strategi" className="border-stone-700/40">
                          <AccordionTrigger className="text-stone-200 text-[10px] py-1">
                            🎯 Strategi
                          </AccordionTrigger>
                          <AccordionContent className="p-1.5 text-[9px] text-stone-300 space-y-0.5">
                            <p>• Cek pola parent → children</p>
                            <p>• Bimbing dengan pertanyaan</p>
                            <p>• Observasi → analisis → validasi</p>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </TabsContent>


                    <TabsContent value="tools" className="space-y-1 mt-1">
                      <div className="p-1.5 rounded bg-stone-900/60 border border-stone-700/40">
                        <h6 className="text-[10px] text-stone-300 mb-0.5 font-semibold">Alat Analisis</h6>
                        <ul className="text-[9px] text-stone-300 space-y-0.5 list-disc pl-2">
                          <li>Selisih per level</li>
                          <li>Pola parent → children</li>
                          <li>Operasi: +, -, ×, ÷, ^</li>
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


      {/* CLEAR VISIBLE TREE STYLES WITH CONNECTING LINES */}
      <style>{`
        /* Tree container */
        .tree-container {
          padding: 15px 10px;
          overflow-x: auto;
          background: radial-gradient(circle at center, rgba(0,0,0,0.15) 0%, transparent 70%);
          border-radius: 8px;
        }


        /* Each level */
        .tree-level {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          margin-bottom: 5px;
        }


        /* Tree cell wrapper */
        .tree-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 1;
          min-width: 60px;
        }


        /* Top connector (from parent) */
        .connector-top {
          width: 2px;
          height: 15px;
          background: linear-gradient(to bottom, rgba(251, 191, 36, 0.8), rgba(251, 191, 36, 0.5));
          margin-bottom: 2px;
        }


        /* Hide top connector for first level */
        .tree-level:first-child .connector-top {
          display: none;
        }


        /* Node itself */
        .node {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          transition: all 0.3s;
          position: relative;
          z-index: 2;
        }


        .node-filled {
          border-color: rgb(5, 150, 105);
          background: linear-gradient(135deg, rgba(6, 78, 59, 0.5), rgba(6, 95, 70, 0.7));
          color: rgb(167, 243, 208);
        }


        .node-empty {
          border-color: rgb(220, 38, 38);
          background: linear-gradient(135deg, rgba(127, 29, 29, 0.5), rgba(153, 27, 27, 0.7));
          color: rgb(254, 202, 202);
        }


        .node:hover {
          transform: scale(1.1);
          box-shadow: 0 0 15px rgba(251, 191, 36, 0.6);
        }


        /* Bottom connector wrapper */
        .connector-bottom {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          margin-top: 2px;
        }


        /* Vertical line going down */
        .connector-vertical {
          width: 2px;
          height: 15px;
          background: linear-gradient(to bottom, rgba(251, 191, 36, 0.5), rgba(251, 191, 36, 0.8));
        }


        /* Horizontal connector */
        .connector-horizontal {
          display: flex;
          width: 100%;
          height: 2px;
          position: relative;
        }


        .connector-left {
          width: 50%;
          height: 2px;
          background: linear-gradient(to right, transparent, rgba(251, 191, 36, 0.8));
          border-top: 2px solid rgba(251, 191, 36, 0.8);
        }


        .connector-right {
          width: 50%;
          height: 2px;
          background: linear-gradient(to left, transparent, rgba(251, 191, 36, 0.8));
          border-top: 2px solid rgba(251, 191, 36, 0.8);
        }


        /* Scrollbar */
        .tree-container::-webkit-scrollbar {
          height: 6px;
        }


        .tree-container::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.5);
          border-radius: 3px;
        }


        .tree-container::-webkit-scrollbar-thumb {
          background: rgba(180, 83, 9, 0.6);
          border-radius: 3px;
        }


        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }


        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.5);
        }


        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(180, 83, 9, 0.6);
        }


        /* Responsive */
        @media (max-width: 768px) {
          .node {
            width: 36px;
            height: 36px;
            font-size: 12px;
          }


          .tree-cell {
            min-width: 50px;
          }
        }
      `}</style>
    </div>
  );
}
