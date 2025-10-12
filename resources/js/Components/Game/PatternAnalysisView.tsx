import React, { useMemo, useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/Components/ui/accordion';
import { toast } from 'sonner';

// ===== TYPES =====
interface TreeNode {
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

interface Props {
  puzzle: any;
  role?: 'defuser' | 'expert' | 'host';
  onSubmitAttempt: (input: string) => void;
  submitting: boolean;
}

// ===== TREE VISUALIZATION COMPONENT =====
const TreeNodeComponent = memo(({
  node,
  depth = 0,
  position = 'root',
  isMobile = false,
  highlight = false
}: {
  node: TreeNode | null;
  depth?: number;
  position?: 'root' | 'left' | 'right';
  isMobile?: boolean;
  highlight?: boolean;
}) => {
  if (!node) return null;

  const nodeSize = isMobile ? 'w-10 h-10 text-sm' : 'w-14 h-14 text-base';
  const spacing = isMobile ? 'gap-2' : 'gap-4';
  const lineWidth = isMobile ? 'w-8' : 'w-12';

  return (
    <div className="flex flex-col items-center">
      {/* Current Node */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: depth * 0.1 }}
        className="relative"
      >
        <div
          className={`${nodeSize} rounded-full flex items-center justify-center font-bold border-2 shadow-lg ${
            highlight
              ? 'border-amber-500 bg-gradient-to-br from-amber-600 to-amber-700 text-white ring-4 ring-amber-300/50'
              : 'border-emerald-600/60 bg-gradient-to-br from-emerald-800/80 to-emerald-900/80 text-emerald-200'
          }`}
        >
          {node.value}
        </div>

        {/* Position Label */}
        {position !== 'root' && (
          <div className={`absolute -top-6 left-1/2 -translate-x-1/2 ${isMobile ? 'text-xs' : 'text-sm'} text-stone-400 font-medium`}>
            {position === 'left' ? 'L' : 'R'}
          </div>
        )}
      </motion.div>

      {/* Children */}
      {(node.left || node.right) && (
        <div className={`flex ${spacing} mt-4 relative`}>
          {/* Connection Lines */}
          {node.left && (
            <div className={`absolute left-1/4 top-0 ${lineWidth} h-4 border-l-2 border-t-2 border-emerald-600/40 -translate-x-1/2`} />
          )}
          {node.right && (
            <div className={`absolute right-1/4 top-0 ${lineWidth} h-4 border-r-2 border-t-2 border-emerald-600/40 translate-x-1/2`} />
          )}

          {/* Left Child */}
          <div className="flex-1">
            {node.left ? (
              <TreeNodeComponent
                node={node.left}
                depth={depth + 1}
                position="left"
                isMobile={isMobile}
              />
            ) : (
              <div className={`${nodeSize} mx-auto rounded-full border-2 border-dashed border-stone-700/40 bg-stone-900/40 flex items-center justify-center text-stone-600`}>
                ∅
              </div>
            )}
          </div>

          {/* Right Child */}
          <div className="flex-1">
            {node.right ? (
              <TreeNodeComponent
                node={node.right}
                depth={depth + 1}
                position="right"
                isMobile={isMobile}
              />
            ) : (
              <div className={`${nodeSize} mx-auto rounded-full border-2 border-dashed border-stone-700/40 bg-stone-900/40 flex items-center justify-center text-stone-600`}>
                ∅
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
TreeNodeComponent.displayName = 'TreeNodeComponent';

// ===== PATH TRACKER COMPONENT =====
const PathTracker = memo(({
  path,
  isMobile
}: {
  path: string[];
  isMobile: boolean;
}) => (
  <div className="flex flex-wrap gap-2 items-center justify-center">
    {path.map((step, idx) => (
      <React.Fragment key={idx}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: idx * 0.1 }}
        >
          <Badge className={`${isMobile ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'} bg-amber-700 text-amber-100 border border-amber-600`}>
            {step}
          </Badge>
        </motion.div>
        {idx < path.length - 1 && (
          <span className="text-amber-500 font-bold">→</span>
        )}
      </React.Fragment>
    ))}
  </div>
));
PathTracker.displayName = 'PathTracker';

// ===== MAIN COMPONENT =====
export default function NavigationChallengeView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const [currentPath, setCurrentPath] = useState<string[]>(['ROOT']);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isDefuser = useMemo(() => role === 'defuser', [role]);
  const isExpert = useMemo(() => role === 'expert', [role]);
  const isHost = useMemo(() => role === 'host', [role]);

  const treeData = useMemo(() => puzzle?.expertView?.tree || null, [puzzle]);
  const targetValue = useMemo(() => puzzle?.defuserView?.targetValue || puzzle?.expertView?.targetValue, [puzzle]);

  const handleMove = useCallback((direction: 'LEFT' | 'RIGHT') => {
    setCurrentPath(prev => [...prev, direction]);
    toast.info(`Bergerak ke ${direction}`);
  }, []);

  const handleSubmit = useCallback(() => {
    const pathString = currentPath.join(',');
    onSubmitAttempt(pathString);
    toast.info('Path dikirim untuk validasi');
  }, [currentPath, onSubmitAttempt]);

  const handleReset = useCallback(() => {
    setCurrentPath(['ROOT']);
    toast.info('Path direset');
  }, []);

  if (!puzzle) {
    return (
      <Card className="min-h-[200px] flex items-center justify-center border-4 border-red-600 bg-gradient-to-br from-stone-900 to-red-950">
        <CardContent className="text-center p-6">
          <p className="text-red-200 font-medium">Data navigasi tidak tersedia</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <Card className="border-4 border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
        <CardHeader className={isMobile ? 'p-4' : 'p-6'}>
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-2xl'} text-amber-300 text-center`}>
            {puzzle.title || 'Navigasi Pohon Biner'}
          </CardTitle>
          <CardDescription className={`${isMobile ? 'text-xs' : 'text-sm'} text-stone-300 text-center`}>
            {puzzle.description || 'Temukan nilai target dengan navigasi tree'}
          </CardDescription>
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            <Badge className="bg-purple-800 text-purple-100">
              🎯 Target: {targetValue}
            </Badge>
            {role && (
              <Badge className="bg-blue-800 text-blue-100">
                👤 {role}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DEFUSER PANEL */}
        {(isDefuser || isHost) && (
          <Card className="border-2 border-amber-600/40 bg-gradient-to-b from-stone-900/80 to-stone-800/40">
            <CardHeader className={`pb-2 ${isMobile ? 'p-3' : 'p-4'}`}>
              <CardTitle className={`${isMobile ? 'text-sm' : 'text-base'} text-amber-300 text-center`}>
                🧩 Panel Defuser
              </CardTitle>
            </CardHeader>
            <CardContent className={`space-y-4 ${isMobile ? 'p-3' : 'p-4'}`}>
              {/* Task Description */}
              <div className="p-3 rounded-lg bg-amber-900/30 border border-amber-700/40">
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-amber-200 text-center font-medium`}>
                  {puzzle.defuserView?.task || `Temukan nilai: ${targetValue}`}
                </p>
              </div>

              {/* Current Position Display */}
              <div className="p-3 rounded-lg bg-stone-800/40 border border-stone-700/40">
                <div className="text-center space-y-2">
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-stone-400`}>
                    Posisi Saat Ini
                  </p>
                  <div className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-emerald-300`}>
                    {puzzle.defuserView?.currentValue || '?'}
                  </div>
                </div>
              </div>

              {/* Path Tracker */}
              <div className="space-y-2">
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-stone-400 text-center`}>
                  Jalur yang Ditempuh:
                </p>
                <PathTracker path={currentPath} isMobile={isMobile} />
              </div>

              {/* Move Buttons */}
              {isDefuser && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleMove('LEFT')}
                      disabled={submitting}
                      className={`${isMobile ? 'py-2 text-sm' : 'py-3 text-base'} bg-blue-700 hover:bg-blue-600`}
                    >
                      ⬅ LEFT
                    </Button>
                    <Button
                      onClick={() => handleMove('RIGHT')}
                      disabled={submitting}
                      className={`${isMobile ? 'py-2 text-sm' : 'py-3 text-base'} bg-blue-700 hover:bg-blue-600`}
                    >
                      RIGHT ➡
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleReset}
                      disabled={submitting}
                      variant="outline"
                      className={`${isMobile ? 'py-2 text-sm' : 'py-2.5 text-base'} border-stone-600 hover:bg-stone-800`}
                    >
                      🔄 Reset
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || currentPath.length < 2}
                      className={`${isMobile ? 'py-2 text-sm' : 'py-2.5 text-base'} bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500`}
                    >
                      {submitting ? '⏳ Mengirim...' : '🚀 Submit'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Hints */}
              {puzzle.defuserView?.hints && (
                <Accordion type="single" collapsible>
                  <AccordionItem value="hints">
                    <AccordionTrigger className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-300`}>
                      💡 Petunjuk
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-stone-300 space-y-1 list-disc pl-4`}>
                        {puzzle.defuserView.hints.map((hint: string, i: number) => (
                          <li key={i}>{hint}</li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
          </Card>
        )}

        {/* EXPERT PANEL */}
        {(isExpert || isHost) && treeData && (
          <Card className="border-2 border-emerald-700/40 bg-gradient-to-b from-stone-900/80 to-emerald-950/40">
            <CardHeader className={`pb-2 ${isMobile ? 'p-3' : 'p-4'}`}>
              <CardTitle className={`${isMobile ? 'text-sm' : 'text-base'} text-emerald-300 text-center`}>
                🧙 Panel Expert - Visualisasi Tree
              </CardTitle>
            </CardHeader>
            <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
              {/* Tree Visualization - Responsive with Scroll */}
              <div className={`overflow-x-auto overflow-y-auto ${isMobile ? 'max-h-[300px]' : 'max-h-[500px]'} p-4 rounded-lg bg-stone-900/60 border border-emerald-700/40`}>
                <div className={isMobile ? 'min-w-[280px]' : 'min-w-[400px]'}>
                  <TreeNodeComponent
                    node={treeData}
                    isMobile={isMobile}
                  />
                </div>
              </div>

              {/* Tree Info */}
              <div className="mt-4 space-y-2">
                <div className="p-2 rounded bg-emerald-900/30 border border-emerald-700/40">
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-emerald-200`}>
                    <span className="font-semibold">Target:</span> {targetValue}
                  </p>
                  {puzzle.expertView?.correctPath && (
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-emerald-200 mt-1`}>
                      <span className="font-semibold">Path yang Benar:</span> {puzzle.expertView.correctPath.join(' → ')}
                    </p>
                  )}
                </div>

                {/* Traversal Methods */}
                {puzzle.expertView?.traversalMethods && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="traversal">
                      <AccordionTrigger className={`${isMobile ? 'text-xs' : 'text-sm'} text-emerald-300`}>
                        🔍 Metode Traversal
                      </AccordionTrigger>
                      <AccordionContent className="space-y-1">
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-stone-300`}>
                          <span className="font-semibold text-emerald-300">Inorder:</span> {puzzle.expertView.traversalMethods.inorder.join(', ')}
                        </p>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-stone-300`}>
                          <span className="font-semibold text-emerald-300">Preorder:</span> {puzzle.expertView.traversalMethods.preorder.join(', ')}
                        </p>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-stone-300`}>
                          <span className="font-semibold text-emerald-300">Postorder:</span> {puzzle.expertView.traversalMethods.postorder.join(', ')}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {/* Expert Hints */}
                {puzzle.expertView?.hints && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="expert-hints">
                      <AccordionTrigger className={`${isMobile ? 'text-xs' : 'text-sm'} text-emerald-300`}>
                        💡 Panduan Expert
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-stone-300 space-y-1 list-disc pl-4`}>
                          {puzzle.expertView.hints.map((hint: string, i: number) => (
                            <li key={i}>{hint}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* BST Properties */}
      <Card className="border border-purple-700/40 bg-purple-950/20">
        <CardContent className={isMobile ? 'p-3' : 'p-4'}>
          <Accordion type="single" collapsible>
            <AccordionItem value="bst-info">
              <AccordionTrigger className={`${isMobile ? 'text-xs' : 'text-sm'} text-purple-300`}>
                📚 Tentang Binary Search Tree
              </AccordionTrigger>
              <AccordionContent className={`${isMobile ? 'text-xs' : 'text-sm'} text-stone-300 space-y-2`}>
                <p><span className="font-semibold text-purple-300">Properti BST:</span></p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Semua nilai di sub-tree kiri lebih kecil dari root</li>
                  <li>Semua nilai di sub-tree kanan lebih besar dari root</li>
                  <li>Setiap sub-tree juga merupakan BST</li>
                </ul>
                <p className="mt-2"><span className="font-semibold text-purple-300">Tips Kolaborasi:</span></p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><span className="text-amber-300">Defuser:</span> Minta informasi nilai node untuk menentukan arah</li>
                  <li><span className="text-emerald-300">Expert:</span> Bimbing dengan perbandingan nilai, bukan jawaban langsung</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <style>{`
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
    </motion.div>
  );
}
