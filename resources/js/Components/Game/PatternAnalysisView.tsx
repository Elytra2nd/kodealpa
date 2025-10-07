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


// Render tree as nested lists (proven method from StackOverflow)
const renderTreeNode = (arr: any[], index: number = 0, level: number = 0): JSX.Element | null => {
  if (index >= arr.length || arr[index] == null) return null;

  const value = arr[index];
  const isEmpty = value === '?' || value == null;
  const leftIndex = 2 * index + 1;
  const rightIndex = 2 * index + 2;
  const hasChildren = (leftIndex < arr.length && arr[leftIndex] != null) ||
                      (rightIndex < arr.length && arr[rightIndex] != null);


  return (
    <li key={index}>
      <div className={`tree-node ${isEmpty ? 'empty' : 'filled'}`}>
        {isEmpty ? '?' : value}
      </div>
      {hasChildren && (
        <ul>
          {leftIndex < arr.length && renderTreeNode(arr, leftIndex, level + 1)}
          {rightIndex < arr.length && renderTreeNode(arr, rightIndex, level + 1)}
        </ul>
      )}
    </li>
  );
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


          {/* MAIN GRID - 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* DEFUSER PANEL */}
            {(isDefuser || isHost) && (
              <Card className="border border-blue-700/40 bg-gradient-to-b from-stone-900/90 to-blue-950/30">
                <CardHeader className="p-1.5 pb-1">
                  <CardTitle className="text-[11px] text-blue-300 text-center">
                    🌳 Panel Defuser
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-1.5 space-y-2">
                  {Array.isArray(puzzle?.defuserView?.pattern) ? (
                    <>
                      {/* TREE VISUALIZATION */}
                      <div className="tree-wrapper">
                        <div className="tree">
                          <ul>
                            {renderTreeNode(puzzle.defuserView.pattern, 0, 0)}
                          </ul>
                        </div>
                      </div>


                      {/* Legend - ultra compact */}
                      <div className="flex gap-2 text-[9px] justify-center">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded border border-emerald-600 bg-emerald-900/40"></div>
                          <span className="text-emerald-300">Aktif</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded border border-red-600 bg-red-900/40"></div>
                          <span className="text-red-300">Missing</span>
                        </div>
                      </div>


                      {/* Input form - compact */}
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


                          {/* Hints - compact */}
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


            {/* EXPERT PANEL - compact */}
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
                            🌳 Struktur
                          </AccordionTrigger>
                          <AccordionContent className="p-1.5 text-[9px] text-stone-300 space-y-0.5">
                            <p>• Root → Left/Right children</p>
                            <p>• Relasi parent-child berpola</p>
                          </AccordionContent>
                        </AccordionItem>


                        <AccordionItem value="strategi" className="border-stone-700/40">
                          <AccordionTrigger className="text-stone-200 text-[10px] py-1">
                            🎯 Strategi
                          </AccordionTrigger>
                          <AccordionContent className="p-1.5 text-[9px] text-stone-300 space-y-0.5">
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


      {/* PROVEN CSS TREE WITH CONNECTING LINES - From StackOverflow */}
      <style>{`
        /* Tree wrapper with scroll */
        .tree-wrapper {
          overflow-x: auto;
          overflow-y: visible;
          padding: 10px 5px;
          background: radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, transparent 70%);
          border-radius: 6px;
          max-height: 300px;
        }


        /* Base tree structure */
        .tree {
          display: flex;
          justify-content: center;
          min-width: max-content;
        }


        .tree ul {
          padding-top: 15px;
          position: relative;
          transition: all 0.3s;
          display: flex;
          justify-content: center;
        }


        .tree li {
          float: left;
          text-align: center;
          list-style-type: none;
          position: relative;
          padding: 15px 5px 0 5px;
          transition: all 0.3s;
        }


        /* Connecting lines - WORKING METHOD */
        .tree li::before,
        .tree li::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          border-top: 2px solid rgba(251, 191, 36, 0.6);
          width: 50%;
          height: 15px;
        }


        .tree li::after {
          right: auto;
          left: 50%;
          border-left: 2px solid rgba(251, 191, 36, 0.6);
        }


        .tree li:only-child::after,
        .tree li:only-child::before {
          display: none;
        }


        .tree li:only-child {
          padding-top: 0;
        }


        .tree li:first-child::before,
        .tree li:last-child::after {
          border: 0 none;
        }


        .tree li:last-child::before {
          border-right: 2px solid rgba(251, 191, 36, 0.6);
          border-radius: 0 4px 0 0;
        }


        .tree li:first-child::after {
          border-radius: 4px 0 0 0;
        }


        .tree ul ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 2px solid rgba(251, 191, 36, 0.6);
          width: 0;
          height: 15px;
        }


        /* Tree node styling */
        .tree-node {
          border: 2px solid;
          padding: 6px 10px;
          text-decoration: none;
          font-family: arial, verdana, tahoma;
          font-size: 14px;
          font-weight: 700;
          display: inline-block;
          border-radius: 8px;
          transition: all 0.3s;
          min-width: 36px;
        }


        .tree-node.filled {
          border-color: rgb(5, 150, 105);
          background: linear-gradient(135deg, rgba(6, 78, 59, 0.4), rgba(6, 95, 70, 0.6));
          color: rgb(167, 243, 208);
        }


        .tree-node.empty {
          border-color: rgb(220, 38, 38);
          background: linear-gradient(135deg, rgba(127, 29, 29, 0.4), rgba(153, 27, 27, 0.6));
          color: rgb(254, 202, 202);
        }


        .tree-node:hover {
          background: rgba(251, 191, 36, 0.2);
          transform: scale(1.05);
          box-shadow: 0 0 15px rgba(251, 191, 36, 0.5);
        }


        /* Scrollbar */
        .tree-wrapper::-webkit-scrollbar {
          height: 6px;
        }


        .tree-wrapper::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.5);
          border-radius: 3px;
        }


        .tree-wrapper::-webkit-scrollbar-thumb {
          background: rgba(180, 83, 9, 0.6);
          border-radius: 3px;
        }


        .tree-wrapper::-webkit-scrollbar-thumb:hover {
          background: rgba(180, 83, 9, 0.8);
        }


        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }


        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.5);
          border-radius: 2px;
        }


        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(180, 83, 9, 0.6);
          border-radius: 2px;
        }


        /* Responsive */
        @media (max-width: 768px) {
          .tree-node {
            font-size: 12px;
            padding: 4px 8px;
            min-width: 30px;
          }


          .tree li {
            padding: 12px 4px 0 4px;
          }


          .tree ul {
            padding-top: 12px;
          }
        }
      `}</style>
    </div>
  );
}
