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
  RUNE_FLOAT_DURATION: 3600,
  PATTERN_ENTRANCE_DURATION: 0.6,
  PATTERN_STAGGER: 0.1,
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
  children?: TreeNode[];
  isActive?: boolean;
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


// Convert flat array to tree structure for visualization
const buildTreeStructure = (pattern: any[]): TreeNode => {
  if (!Array.isArray(pattern) || pattern.length === 0) {
    return { value: '?', children: [] };
  }


  // Simple binary tree structure: root with left and right children
  const root: TreeNode = {
    value: pattern[0] ?? '?',
    children: [],
  };


  // Level-order insertion for binary tree
  const queue: TreeNode[] = [root];
  let index = 1;


  while (queue.length > 0 && index < pattern.length) {
    const current = queue.shift()!;
    current.children = [];


    // Left child
    if (index < pattern.length) {
      const leftChild: TreeNode = {
        value: pattern[index] ?? '?',
        children: [],
      };
      current.children.push(leftChild);
      queue.push(leftChild);
      index++;
    }


    // Right child
    if (index < pattern.length) {
      const rightChild: TreeNode = {
        value: pattern[index] ?? '?',
        children: [],
      };
      current.children.push(rightChild);
      queue.push(rightChild);
      index++;
    }
  }


  return root;
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
// TREE NODE COMPONENT
// ============================================
const TreeNodeComponent = memo(({ node }: { node: TreeNode }) => {
  const isEmpty = node.value === '?' || node.value == null;


  return (
    <li className="tree-node">
      <div
        className={`node-content ${
          isEmpty
            ? 'border-red-600/60 bg-gradient-to-br from-red-900/40 to-red-950/60 text-red-200'
            : 'border-emerald-600/60 bg-gradient-to-br from-emerald-900/40 to-emerald-950/60 text-emerald-200'
        }`}
      >
        <span className="node-value">{isEmpty ? '?' : node.value}</span>
      </div>


      {node.children && node.children.length > 0 && (
        <ul className="tree-children">
          {node.children.map((child, idx) => (
            <TreeNodeComponent key={idx} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
});


TreeNodeComponent.displayName = 'TreeNodeComponent';


// ============================================
// MEMOIZED COMPONENTS
// ============================================
const RuneLegendBadge = memo(({ num, sym }: { num: string; sym: string }) => (
  <Badge className="bg-stone-800 text-amber-100 border border-amber-700/60 dungeon-badge-glow text-xs">
    {sym}={num}
  </Badge>
));


RuneLegendBadge.displayName = 'RuneLegendBadge';


const LoadingState = memo(() => (
  <div className="min-h-[200px] flex items-center justify-center bg-gradient-to-br from-stone-900 to-red-950 border-2 border-red-700/60 rounded-xl dungeon-card-glow-red">
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


  const treeData = useMemo(() => {
    if (Array.isArray(puzzle?.defuserView?.pattern)) {
      return buildTreeStructure(puzzle.defuserView.pattern);
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
    <div className="space-y-4 relative">
      <Card className="overflow-hidden border-2 border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 shadow-2xl dungeon-card-glow">
        <CardHeader className="relative p-4">
          <div ref={setTorchRef(0)} className="absolute top-3 left-3 text-xl sm:text-2xl dungeon-torch-flicker">
            🔥
          </div>
          <div ref={setTorchRef(1)} className="absolute top-3 right-3 text-xl sm:text-2xl dungeon-torch-flicker">
            🔥
          </div>
          <CardTitle className="text-amber-300 text-xl sm:text-2xl text-center dungeon-glow-text relative z-10">
            {puzzle.title || 'Analisis Pola Mistis'}
          </CardTitle>
          <CardDescription className="text-stone-300 text-sm text-center relative z-10">
            {puzzle.description || 'Temukan pola tersembunyi dalam urutan angka dungeon'}
          </CardDescription>
          <div className="pt-2 flex flex-wrap gap-2 justify-center relative z-10">
            <Badge className="bg-amber-800 text-amber-100 border border-amber-700/50 dungeon-badge-glow">
              🏰 Mode Dungeon
            </Badge>
            <Badge className="bg-stone-700 text-stone-200 border border-stone-600/50 dungeon-badge-glow">
              🧩 Analisis Pola
            </Badge>
            {role && (
              <Badge className="bg-purple-800 text-purple-100 border border-purple-700/50 dungeon-badge-glow">
                🎭 Peran: {role}
              </Badge>
            )}
            {puzzle?.expertView?.category && (
              <Badge className="bg-emerald-800 text-emerald-100 border border-emerald-700/50 dungeon-badge-glow">
                {String(puzzle.expertView.category)}
              </Badge>
            )}
          </div>
        </CardHeader>


        <CardContent className="space-y-4 p-4">
          {/* Rule hint for expert/host */}
          {(isExpert || isHost) && puzzle.expertView?.rule && (
            <Card className="border border-stone-700/40 bg-stone-800/40 backdrop-blur-sm">
              <CardContent className="p-3">
                <p className="text-stone-300 italic text-xs sm:text-sm leading-relaxed text-center">
                  "{dungeonizeRule(puzzle.expertView.rule)}"
                </p>
              </CardContent>
            </Card>
          )}


          {/* MAIN GRID - Side by side layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* DEFUSER PANEL */}
            {(isDefuser || isHost) && (
              <Card className="border-2 border-amber-600/40 bg-gradient-to-b from-stone-900/80 to-stone-800/40 backdrop-blur-sm dungeon-card-glow-blue">
                <CardHeader className="pb-2 p-3">
                  <CardTitle className="text-sm text-amber-300 text-center dungeon-glow-text">
                    🌳 Visualisasi Pohon
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {treeData ? (
                    <>
                      {/* Tree Visualization with connecting lines */}
                      <div className="tree-container overflow-x-auto pb-4">
                        <ul className="tree-root">
                          <TreeNodeComponent node={treeData} />
                        </ul>
                      </div>


                      {/* Legenda */}
                      <div className="flex flex-wrap gap-2 justify-center text-xs">
                        <div className="flex items-center gap-2 px-2 py-1 rounded bg-emerald-900/30 border border-emerald-700/40">
                          <div className="w-3 h-3 rounded border-2 border-emerald-600 bg-emerald-900/40"></div>
                          <span className="text-emerald-200">Node tersorot (jejak aktif)</span>
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1 rounded bg-red-900/30 border border-red-700/40">
                          <div className="w-3 h-3 rounded border-2 border-red-600 bg-red-900/40"></div>
                          <span className="text-red-200">Angka hilang</span>
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1 rounded bg-stone-800/30 border border-stone-700/40">
                          <div className="w-6 h-0.5 bg-amber-600"></div>
                          <span className="text-stone-300">Koneksi cabang</span>
                        </div>
                      </div>


                      {/* Input form */}
                      {isDefuser && (
                        <form onSubmit={handleSubmit} className="space-y-3">
                          <div className="flex justify-center">
                            <input
                              type="number"
                              value={jawaban}
                              onChange={handleInputChange}
                              placeholder="Masukkan angka..."
                              className="w-full max-w-xs h-11 text-center text-lg font-bold bg-stone-900/70 border-2 border-amber-600/60 rounded-xl text-amber-200 placeholder-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                              disabled={submitting}
                              maxLength={CONFIG.MAX_INPUT_LENGTH}
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={!jawaban.trim() || submitting}
                            className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-900 font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-all"
                          >
                            {submitting ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin">⚙️</span>
                                Mengirim...
                              </span>
                            ) : (
                              '✨ Kirim Jawaban'
                            )}
                          </Button>


                          {/* Hints accordion */}
                          {transformedHints.length > 0 && (
                            <Accordion type="single" collapsible>
                              <AccordionItem value="hints" className="border-blue-700/40">
                                <AccordionTrigger className="text-blue-200 text-xs hover:text-blue-300 py-2">
                                  💡 Petunjuk Terselubung
                                </AccordionTrigger>
                                <AccordionContent
                                  className="p-2 rounded-lg bg-blue-950/40 overflow-y-auto"
                                  style={{ maxHeight: `${CONFIG.MAX_ACCORDION_HEIGHT}px` }}
                                >
                                  <ul className="text-xs text-blue-200/90 space-y-1.5 list-disc pl-4">
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
                    <div className="p-3 rounded-xl border border-red-700/40 bg-red-950/40 text-red-200 text-center text-sm">
                      Data urutan tidak ditemukan
                    </div>
                  )}
                </CardContent>
              </Card>
            )}


            {/* EXPERT PANEL */}
            {(isExpert || isHost) && puzzle.expertView && (
              <Card className="border-2 border-emerald-700/40 bg-gradient-to-b from-stone-900/80 to-emerald-950/40 backdrop-blur-sm dungeon-card-glow-green">
                <CardHeader className="pb-2 p-3">
                  <CardTitle className="text-sm text-emerald-300 text-center dungeon-glow-text">
                    📖 Panel Expert
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <Tabs defaultValue="guide" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-stone-900/60">
                      <TabsTrigger value="guide" className="text-xs">
                        📚 Panduan
                      </TabsTrigger>
                      <TabsTrigger value="tools" className="text-xs">
                        🛠️ Tools
                      </TabsTrigger>
                    </TabsList>


                    <TabsContent value="guide" className="space-y-2 mt-2">
                      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                        <Accordion type="single" collapsible className="space-y-2">
                          <AccordionItem value="runes" className="border-stone-700/40">
                            <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-2">
                              ✨ Legenda Rune
                            </AccordionTrigger>
                            <AccordionContent className="p-2 text-xs text-stone-300 space-y-1">
                              <div className="flex justify-center mb-2">
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {runeLegend.slice(0, 10).map(({ num, sym }) => (
                                    <RuneLegendBadge key={num} num={num} sym={sym} />
                                  ))}
                                </div>
                              </div>
                              <p className="text-center">Pulihkan digit dari rune untuk analisis yang akurat</p>
                            </AccordionContent>
                          </AccordionItem>


                          <AccordionItem value="deteksi" className="border-stone-700/40">
                            <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-2">
                              🔍 Deteksi Pola
                            </AccordionTrigger>
                            <AccordionContent className="p-2 text-xs text-stone-300 space-y-1">
                              <p>• Selisih konstan → aritmetika</p>
                              <p>• Rasio konstan → geometri</p>
                              <p>• Uji selisih tingkat-2 jika tidak konstan</p>
                            </AccordionContent>
                          </AccordionItem>


                          <AccordionItem value="struktur" className="border-stone-700/40">
                            <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-2">
                              🌳 Struktur Pohon
                            </AccordionTrigger>
                            <AccordionContent className="p-2 text-xs text-stone-300 space-y-1">
                              <p>• Jejak depth: akar → cabang → daun</p>
                              <p>• Level order: baca per tingkat dari atas</p>
                              <p>• Relasi parent-child membentuk pola</p>
                            </AccordionContent>
                          </AccordionItem>


                          <AccordionItem value="strategi" className="border-stone-700/40">
                            <AccordionTrigger className="text-stone-200 text-xs hover:text-amber-300 py-2">
                              🎯 Strategi
                            </AccordionTrigger>
                            <AccordionContent className="p-2 text-xs text-stone-300 space-y-1">
                              <p>• Validasi hipotesis pada 2-3 suku</p>
                              <p>• Bimbing dengan pertanyaan, bukan jawaban</p>
                              <p>• Iterasi: observasi → analisis → validasi</p>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    </TabsContent>


                    <TabsContent value="tools" className="space-y-2 mt-2">
                      <div className="p-2 rounded-lg bg-stone-900/60 border border-stone-700/40">
                        <h6 className="text-xs text-stone-300 mb-2 font-semibold">Alat Bantu</h6>
                        <ul className="text-xs text-stone-300 space-y-1 list-disc pl-4">
                          <li>Uji modulo kecil (2, 3, 5) untuk siklus</li>
                          <li>Lonjakan tajam → penggandaan/pangkat</li>
                          <li>Validasi dengan suku berikutnya</li>
                          <li>Perhatikan posisi dalam struktur pohon</li>
                        </ul>
                      </div>


                      <div className="p-2 rounded-lg bg-stone-900/60 border border-amber-700/40">
                        <h6 className="text-xs text-amber-300 mb-2 font-semibold">Peran Expert</h6>
                        <ul className="text-xs text-stone-300 space-y-1 list-disc pl-4">
                          <li>Pandu pada transformasi, bukan angka</li>
                          <li>Minta hipotesis dan verifikasi</li>
                          <li>Jaga ritme: amati → analisis → validasi</li>
                          <li>Bantu mengidentifikasi relasi antar-level</li>
                        </ul>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>


          {/* Collaboration tips */}
          <Card className="border border-purple-700/40 bg-purple-950/20 backdrop-blur-sm">
            <CardContent className="p-3">
              <Accordion type="single" collapsible>
                <AccordionItem value="tips" className="border-purple-700/40">
                  <AccordionTrigger className="text-purple-300 text-xs hover:text-purple-400 py-2">
                    💡 Tips Kolaborasi
                  </AccordionTrigger>
                  <AccordionContent className="p-2 text-xs text-stone-300 space-y-2">
                    <div>
                      <span className="font-semibold text-amber-300">Defuser:</span> Telusuri selisih antar-level,
                      uji pola parent-child, minta validasi tanpa mengungkap final
                    </div>
                    <div>
                      <span className="font-semibold text-blue-300">Expert:</span> Mulai observasi kualitatif,
                      batasi petunjuk pada bentuk transformasi dan struktur hierarki
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </CardContent>
      </Card>


      {/* CUSTOM STYLES - Tree View with connecting lines */}
      <style>{`
        /* Tree Container */
        .tree-container {
          min-height: 200px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 20px 10px;
        }


        /* Tree root - no bullets */
        .tree-root {
          list-style-type: none;
          padding: 0;
          margin: 0;
          position: relative;
        }


        /* Tree node */
        .tree-node {
          list-style-type: none;
          position: relative;
          padding: 10px 5px 0 5px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }


        /* Node content - the circle/box */
        .node-content {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          border: 2px solid;
          font-weight: 800;
          font-size: 1.125rem;
          transition: all 0.3s ease;
          z-index: 2;
          position: relative;
        }


        .node-content:hover {
          transform: scale(1.1);
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
        }


        .node-value {
          user-select: none;
        }


        /* Tree children container */
        .tree-children {
          list-style-type: none;
          padding: 30px 0 0 0;
          margin: 0;
          display: flex;
          gap: 20px;
          position: relative;
        }


        /* Vertical line from parent to children */
        .tree-node .tree-children::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          width: 2px;
          height: 30px;
          background: linear-gradient(to bottom, rgba(251, 191, 36, 0.6), rgba(251, 191, 36, 0.3));
          transform: translateX(-50%);
        }


        /* Horizontal line connecting children */
        .tree-node .tree-children::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(to right,
            transparent 0%,
            rgba(251, 191, 36, 0.6) 25%,
            rgba(251, 191, 36, 0.6) 75%,
            transparent 100%
          );
        }


        /* Remove horizontal line if only one child */
        .tree-node .tree-children:has(> .tree-node:only-child)::after {
          display: none;
        }


        /* Vertical line from horizontal line to each child */
        .tree-children > .tree-node::before {
          content: '';
          position: absolute;
          top: -30px;
          left: 50%;
          width: 2px;
          height: 30px;
          background: linear-gradient(to bottom, rgba(251, 191, 36, 0.3), rgba(251, 191, 36, 0.6));
          transform: translateX(-50%);
        }


        /* Hide vertical line for root node */
        .tree-root > .tree-node::before {
          display: none;
        }


        /* Dungeon Atmosphere */
        .dungeon-torch-flicker {
          display: inline-block;
        }


        .dungeon-card-glow {
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.4);
        }


        .dungeon-card-glow-blue {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
        }


        .dungeon-card-glow-green {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
        }


        .dungeon-card-glow-red {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
        }


        .dungeon-badge-glow {
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
        }


        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
        }


        /* Custom scrollbar */
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
          .node-content {
            width: 40px;
            height: 40px;
            font-size: 1rem;
          }


          .tree-children {
            gap: 15px;
          }


          .dungeon-card-glow,
          .dungeon-card-glow-blue,
          .dungeon-card-glow-green,
          .dungeon-card-glow-red {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
          }
        }
      `}</style>
    </div>
  );
}
