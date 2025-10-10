import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { toast } from 'sonner';
import { gsap } from 'gsap';

// ============================================
// TYPES & INTERFACES
// ============================================
interface Bug {
  line: number;
  description: string;
  type: string;
  hint: string;
}

interface Solution {
  line: number;
  correct: string;
}

interface TestCase {
  input: any;
  expected: any;
}

interface DefuserView {
  codeLines: string[];
  testCase?: TestCase;
}

interface ExpertView {
  bugs: Bug[];
  solutions: Solution[];
}

interface Puzzle {
  title: string;
  description?: string;
  defuserView?: DefuserView;
  expertView?: ExpertView;
}

interface Props {
  puzzle: Puzzle;
  role?: 'defuser' | 'expert' | 'host';
  onSubmitAttempt: (input: string) => void;
  submitting: boolean;
}

// ============================================
// CONSTANTS
// ============================================
const CONFIG = {
  MAX_LINE_NUMBER_LENGTH: 3,
  MOBILE_BREAKPOINT: 768,
  DEBOUNCE_DELAY: 300,
  HIGHLIGHT_DURATION: 1000,
} as const;

const ROLE_CONFIG = {
  defuser: {
    icon: '💣',
    title: 'DEFUSER - Code Analysis',
    color: 'red',
    gradient: 'from-red-900/30 to-stone-900',
    border: 'border-red-600',
    glow: 'dungeon-card-glow-red',
  },
  expert: {
    icon: '📖',
    title: 'EXPERT - Solution Manual',
    color: 'blue',
    gradient: 'from-blue-900/30 to-stone-900',
    border: 'border-blue-600',
    glow: 'dungeon-card-glow-blue',
  },
  host: {
    icon: '👑',
    title: 'HOST - Complete View',
    color: 'emerald',
    gradient: 'from-emerald-900/30 to-stone-900',
    border: 'border-emerald-600',
    glow: 'dungeon-card-glow-green',
  },
} as const;

// ============================================
// ANIMATION VARIANTS
// ============================================
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const scaleIn = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

// ============================================
// CUSTOM HOOKS
// ============================================
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < CONFIG.MOBILE_BREAKPOINT);
    checkMobile();
    const handleResize = () => checkMobile();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

const useCodeHighlight = () => {
  const highlightedLineRef = useRef<HTMLDivElement | null>(null);

  const highlightLine = useCallback((lineNumber: number) => {
    const lineElement = document.querySelector(`[data-line="${lineNumber}"]`);
    if (lineElement) {
      highlightedLineRef.current = lineElement as HTMLDivElement;
      gsap.fromTo(
        lineElement,
        { backgroundColor: 'rgba(251, 191, 36, 0.3)' },
        {
          backgroundColor: 'rgba(251, 191, 36, 0)',
          duration: CONFIG.HIGHLIGHT_DURATION / 1000,
          ease: 'power2.out',
        }
      );
    }
  }, []);

  return { highlightLine };
};

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const CodeLine = memo(({ line, index, isMobile }: { line: string; index: number; isMobile: boolean }) => (
  <motion.div
    variants={fadeInUp}
    data-line={index + 1}
    className="flex hover:bg-stone-800/30 transition-colors duration-200 rounded px-2 py-1"
    whileHover={{ x: 2 }}
  >
    <span className={`text-amber-600 mr-3 ${isMobile ? 'w-8' : 'w-10'} text-right flex-shrink-0 font-semibold`}>{index + 1}</span>
    <span className={`text-emerald-400 ${isMobile ? 'text-xs' : 'text-sm'} break-all`}>{line || ' '}</span>
  </motion.div>
));

CodeLine.displayName = 'CodeLine';

const BugCard = memo(({ bug, index, isMobile }: { bug: Bug; index: number; isMobile: boolean }) => (
  <motion.div variants={fadeInUp} whileHover={{ scale: 1.02, x: 5 }} whileTap={{ scale: 0.98 }}>
    <Card className="bg-red-900/20 border-2 border-red-600 overflow-hidden">
      <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
        <div className="flex items-start gap-2 sm:gap-3">
          <motion.span
            className={`${isMobile ? 'text-2xl' : 'text-3xl'} flex-shrink-0`}
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
            aria-hidden="true"
          >
            🐛
          </motion.span>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-red-300 ${isMobile ? 'text-sm' : 'text-base'} mb-1`}>
              Line {bug.line}: {bug.description}
            </p>
            <div className="space-y-1">
              <p className={`text-stone-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <span className="font-semibold text-amber-400">Type:</span> {bug.type}
              </p>
              <p className={`text-blue-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <span className="font-semibold text-amber-400">Hint:</span> {bug.hint}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
));

BugCard.displayName = 'BugCard';

const SolutionCard = memo(({ solution, index, isMobile }: { solution: Solution; index: number; isMobile: boolean }) => (
  <motion.div variants={fadeInUp} whileHover={{ scale: 1.02, x: 5 }} whileTap={{ scale: 0.98 }}>
    <Card className="bg-emerald-900/20 border-2 border-emerald-600 overflow-hidden">
      <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
        <div className="flex items-start gap-2 sm:gap-3">
          <motion.span
            className={`${isMobile ? 'text-2xl' : 'text-3xl'} flex-shrink-0`}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
            aria-hidden="true"
          >
            ✅
          </motion.span>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-emerald-300 ${isMobile ? 'text-sm' : 'text-base'} mb-2`}>Line {solution.line}:</p>
            <div className="bg-stone-800/60 rounded-lg p-2 sm:p-3 border border-emerald-700/30">
              <code className={`text-emerald-400 ${isMobile ? 'text-xs' : 'text-sm'} break-all`}>{solution.correct}</code>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
));

SolutionCard.displayName = 'SolutionCard';

const InstructionCard = memo(({ role, instructions, isMobile }: { role: string; instructions: string[]; isMobile: boolean }) => {
  const roleConfig = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.defuser;

  return (
    <motion.div variants={fadeInUp}>
      <Card className={`bg-amber-900/20 border-2 border-amber-600`}>
        <CardHeader className={isMobile ? 'p-3 pb-2' : 'p-4 pb-3'}>
          <CardTitle className={`text-amber-300 ${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
            <span aria-hidden="true">💡</span>
            {role === 'expert' ? 'Your Role' : 'Instructions'}
          </CardTitle>
        </CardHeader>
        <CardContent className={isMobile ? 'p-3 pt-0' : 'p-4 pt-0'}>
          <ul className="space-y-1 sm:space-y-2">
            {instructions.map((instruction, index) => (
              <motion.li
                key={index}
                variants={fadeInUp}
                className={`text-amber-200 ${isMobile ? 'text-xs' : 'text-sm'} flex items-start gap-2`}
              >
                <span className="text-amber-400 flex-shrink-0" aria-hidden="true">
                  •
                </span>
                <span>{instruction}</span>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
});

InstructionCard.displayName = 'InstructionCard';

// ============================================
// MAIN COMPONENT
// ============================================
export default function CodeAnalysisView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const isMobile = useIsMobile();
  const { highlightLine } = useCodeHighlight();
  const [input, setInput] = useState('');
  const [focusedLine, setFocusedLine] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const hasDefuserView = useMemo(() => !!puzzle?.defuserView, [puzzle?.defuserView]);
  const hasExpertView = useMemo(() => !!puzzle?.expertView, [puzzle?.expertView]);

  const shouldShowDefuserView = useMemo(() => role === 'defuser' || role === 'host', [role]);
  const shouldShowExpertView = useMemo(() => role === 'expert' || role === 'host', [role]);

  const defuserInstructions = useMemo(
    () => ['Read the code carefully', 'Look for logical errors or mistakes', 'Ask the Expert for help if needed', 'Enter only the line number (e.g., 4)'],
    []
  );

  const expertInstructions = useMemo(
    () => ['Help guide the Defuser to find the bug', 'Give hints without directly stating the answer', 'Explain the logic and reasoning', 'Be patient and supportive'],
    []
  );

  // ============================================
  // CALLBACKS
  // ============================================
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedInput = input.trim();
      if (!trimmedInput) {
        toast.error('Mohon masukkan nomor baris');
        return;
      }

      const lineNumber = parseInt(trimmedInput);
      if (isNaN(lineNumber) || lineNumber < 1) {
        toast.error('Nomor baris harus berupa angka positif');
        return;
      }

      if (puzzle?.defuserView?.codeLines && lineNumber > puzzle.defuserView.codeLines.length) {
        toast.error(`Nomor baris harus antara 1 dan ${puzzle.defuserView.codeLines.length}`);
        return;
      }

      highlightLine(lineNumber);
      onSubmitAttempt(trimmedInput);
      setInput('');
    },
    [input, puzzle?.defuserView?.codeLines, onSubmitAttempt, highlightLine]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setInput(value);
      const lineNum = parseInt(value);
      if (!isNaN(lineNum) && lineNum > 0) {
        setFocusedLine(lineNum);
      } else {
        setFocusedLine(null);
      }
    }
  }, []);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    // Auto-focus input when component mounts (desktop only)
    if (!isMobile && inputRef.current && role === 'defuser') {
      inputRef.current.focus();
    }
  }, [isMobile, role]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !submitting && input.trim() && role === 'defuser') {
        handleSubmit(e as any);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleSubmit, submitting, input, role]);

  // ============================================
  // RENDER CONDITIONS
  // ============================================
  if (!puzzle) {
    return (
      <motion.div variants={scaleIn} initial="initial" animate="animate" className="p-4 sm:p-6 text-center">
        <Card className="border-4 border-red-600 bg-gradient-to-b from-stone-900 to-red-950 dungeon-card-glow-red">
          <CardContent className="p-6 sm:p-8">
            <motion.div
              className="text-5xl sm:text-6xl mb-4"
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              aria-hidden="true"
            >
              ⚠️
            </motion.div>
            <h3 className="text-xl sm:text-2xl font-bold text-red-300 mb-2">No Puzzle Data Available</h3>
            <p className="text-red-200 text-sm sm:text-base">The puzzle data could not be loaded. Please try again.</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4 sm:space-y-6">
      {/* Puzzle Header */}
      <motion.div variants={fadeInUp}>
        <Card className="border-2 sm:border-4 border-amber-600 bg-gradient-to-r from-amber-900/30 to-stone-900 dungeon-card-glow">
          <CardHeader className={isMobile ? 'p-4' : 'p-6'}>
            <CardTitle className={`text-amber-300 ${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'} text-center dungeon-glow-text`}>
              {puzzle.title}
            </CardTitle>
            {puzzle.description && (
              <CardDescription className={`text-stone-300 text-center ${isMobile ? 'text-xs' : 'text-sm sm:text-base'} mt-2`}>
                {puzzle.description}
              </CardDescription>
            )}
          </CardHeader>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* DEFUSER VIEW */}
        <AnimatePresence mode="wait">
          {shouldShowDefuserView && hasDefuserView && (
            <motion.div key="defuser-view" variants={fadeInUp} initial="initial" animate="animate" exit="exit">
              <Card className={`border-2 sm:border-4 ${ROLE_CONFIG.defuser.border} bg-gradient-to-br ${ROLE_CONFIG.defuser.gradient} ${ROLE_CONFIG.defuser.glow}`}>
                <CardHeader className={isMobile ? 'p-4' : 'p-6'}>
                  <CardTitle className={`text-red-300 ${isMobile ? 'text-base' : 'text-lg sm:text-xl'} text-center dungeon-glow-text`}>
                    <span className="mr-2" aria-hidden="true">
                      {ROLE_CONFIG.defuser.icon}
                    </span>
                    {ROLE_CONFIG.defuser.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className={`space-y-4 ${isMobile ? 'p-4 pt-0' : 'p-6 pt-0'}`}>
                  {/* Code Display */}
                  {puzzle?.defuserView?.codeLines && (
                    <motion.div variants={fadeInUp}>
                      <h4 className={`font-semibold text-stone-200 mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}>Code to Analyze:</h4>
                      <Card className="bg-stone-950 border-2 border-stone-700 overflow-hidden">
                        <CardContent className={`${isMobile ? 'p-3' : 'p-4'} font-mono ${isMobile ? 'text-xs' : 'text-sm'} overflow-x-auto`}>
                          <motion.div variants={staggerContainer} className="space-y-0.5">
                            {puzzle.defuserView.codeLines.map((line, index) => (
                              <CodeLine key={index} line={line} index={index} isMobile={isMobile} />
                            ))}
                          </motion.div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Test Case Info */}
                  {puzzle.defuserView?.testCase && (
                    <motion.div variants={fadeInUp}>
                      <Card className="bg-blue-900/20 border-2 border-blue-600">
                        <CardHeader className={isMobile ? 'p-3' : 'p-4'}>
                          <CardTitle className={`text-blue-300 ${isMobile ? 'text-sm' : 'text-base'}`}>
                            <span className="mr-2" aria-hidden="true">
                              🧪
                            </span>
                            Test Case
                          </CardTitle>
                        </CardHeader>
                        <CardContent className={`space-y-2 ${isMobile ? 'p-3 pt-0' : 'p-4 pt-0'}`}>
                          <div className="bg-stone-800/60 rounded-lg p-2 sm:p-3">
                            <p className={`text-blue-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              <span className="font-semibold text-amber-400">Input:</span>{' '}
                              <code className="text-emerald-400">{JSON.stringify(puzzle.defuserView.testCase.input)}</code>
                            </p>
                          </div>
                          <div className="bg-stone-800/60 rounded-lg p-2 sm:p-3">
                            <p className={`text-blue-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              <span className="font-semibold text-amber-400">Expected:</span>{' '}
                              <code className="text-emerald-400">{JSON.stringify(puzzle.defuserView.testCase.expected)}</code>
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Input Form for Defuser */}
                  {role === 'defuser' && (
                    <motion.form onSubmit={handleSubmit} variants={fadeInUp} className="space-y-3 sm:space-y-4">
                      <div>
                        <label
                          htmlFor="line-number-input"
                          className={`block font-medium text-stone-200 mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}
                        >
                          Enter the line number with the bug:
                        </label>
                        <input
                          ref={inputRef}
                          id="line-number-input"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={input}
                          onChange={handleInputChange}
                          placeholder="4"
                          className={`w-full px-4 py-3 sm:py-4 bg-stone-800 border-2 border-red-600 rounded-lg text-center font-bold text-amber-300 placeholder-stone-600 focus:outline-none focus:ring-4 focus:ring-red-500/50 transition-all ${
                            isMobile ? 'text-lg' : 'text-xl sm:text-2xl'
                          } touch-manipulation`}
                          disabled={submitting}
                          maxLength={CONFIG.MAX_LINE_NUMBER_LENGTH}
                          autoComplete="off"
                          aria-describedby="line-number-help"
                        />
                        <p id="line-number-help" className="sr-only">
                          Enter the line number where you found the bug
                        </p>
                        {focusedLine && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`text-amber-400 text-center mt-2 ${isMobile ? 'text-xs' : 'text-sm'}`}
                          >
                            Checking line {focusedLine}...
                          </motion.p>
                        )}
                      </div>
                      <motion.div whileTap={{ scale: 0.98 }}>
                        <Button
                          type="submit"
                          disabled={!input.trim() || submitting}
                          className={`w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-lg transition-all shadow-lg dungeon-button-glow disabled:opacity-50 disabled:cursor-not-allowed ${
                            isMobile ? 'py-3 text-base' : 'py-4 text-lg'
                          } touch-manipulation`}
                          aria-busy={submitting}
                        >
                          {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} aria-hidden="true">
                                ⚙️
                              </motion.span>
                              <span>SUBMITTING...</span>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <span aria-hidden="true">🎯</span>
                              <span>SUBMIT ANSWER</span>
                            </span>
                          )}
                        </Button>
                      </motion.div>
                    </motion.form>
                  )}

                  {/* Instructions for Defuser */}
                  <InstructionCard role="defuser" instructions={defuserInstructions} isMobile={isMobile} />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* EXPERT VIEW */}
        <AnimatePresence mode="wait">
          {shouldShowExpertView && hasExpertView && (
            <motion.div key="expert-view" variants={fadeInUp} initial="initial" animate="animate" exit="exit">
              <Card className={`border-2 sm:border-4 ${ROLE_CONFIG.expert.border} bg-gradient-to-br ${ROLE_CONFIG.expert.gradient} ${ROLE_CONFIG.expert.glow}`}>
                <CardHeader className={isMobile ? 'p-4' : 'p-6'}>
                  <CardTitle className={`text-blue-300 ${isMobile ? 'text-base' : 'text-lg sm:text-xl'} text-center dungeon-glow-text`}>
                    <span className="mr-2" aria-hidden="true">
                      {ROLE_CONFIG.expert.icon}
                    </span>
                    {ROLE_CONFIG.expert.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className={`space-y-4 ${isMobile ? 'p-4 pt-0' : 'p-6 pt-0'}`}>
                  {/* Bug Information */}
                  {puzzle.expertView?.bugs && puzzle.expertView.bugs.length > 0 && (
                    <motion.div variants={fadeInUp}>
                      <h4 className={`font-bold text-red-300 mb-3 ${isMobile ? 'text-sm' : 'text-base sm:text-lg'} flex items-center gap-2`}>
                        <span aria-hidden="true">🐛</span>
                        Bug Information
                      </h4>
                      <motion.div variants={staggerContainer} className="space-y-3">
                        {puzzle.expertView.bugs.map((bug, index) => (
                          <BugCard key={index} bug={bug} index={index} isMobile={isMobile} />
                        ))}
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Solution Information */}
                  {puzzle.expertView?.solutions && puzzle.expertView.solutions.length > 0 && (
                    <motion.div variants={fadeInUp}>
                      <h4 className={`font-bold text-emerald-300 mb-3 ${isMobile ? 'text-sm' : 'text-base sm:text-lg'} flex items-center gap-2`}>
                        <span aria-hidden="true">✅</span>
                        Correct Solutions
                      </h4>
                      <motion.div variants={staggerContainer} className="space-y-3">
                        {puzzle.expertView.solutions.map((solution, index) => (
                          <SolutionCard key={index} solution={solution} index={index} isMobile={isMobile} />
                        ))}
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Instructions for Expert */}
                  {role === 'expert' && <InstructionCard role="expert" instructions={expertInstructions} isMobile={isMobile} />}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Styles */}
      <style>{`
        /* Card Glows */
        .dungeon-card-glow {
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.2);
        }

        .dungeon-card-glow-red {
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.4), 0 0 60px rgba(239, 68, 68, 0.2);
        }

        .dungeon-card-glow-blue {
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.4), 0 0 60px rgba(59, 130, 246, 0.2);
        }

        .dungeon-card-glow-green {
          box-shadow: 0 0 30px rgba(34, 197, 94, 0.4), 0 0 60px rgba(34, 197, 94, 0.2);
        }

        /* Button Glow */
        .dungeon-button-glow:hover:not(:disabled) {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.3);
        }

        /* Text Glow */
        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4);
        }

        /* Touch optimization */
        .touch-manipulation {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        /* Focus styles */
        *:focus-visible {
          outline: 2px solid rgba(251, 191, 36, 0.8);
          outline-offset: 2px;
        }

        /* Smooth transitions */
        * {
          transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </motion.div>
  );
}
