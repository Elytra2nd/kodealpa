// resources/js/Components/Game/DungeonMasterChatInGame.tsx
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { gsap } from 'gsap';
import { toast } from 'sonner';
import { usePage } from '@inertiajs/react';

// ============================================
// CONSTANTS
// ============================================
const CONFIG = {
  TORCH_FLICKER_INTERVAL: 150,
  MAX_MESSAGE_LENGTH: 500,
  MOBILE_BREAKPOINT: 768,
} as const;

// ============================================
// TYPES
// ============================================
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Props {
  sessionId: number;
  availableHints: number;
  maxHints: number;
  onHintUsed: () => void;
  disabled?: boolean;
}

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

const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      torchRefs.current.forEach((torch) => {
        if (torch) {
          gsap.to(torch, {
            opacity: Math.random() * 0.3 + 0.7,
            scale: Math.random() * 0.1 + 0.95,
            duration: 0.15,
            ease: 'power1.inOut',
          });
        }
      });
    }, CONFIG.TORCH_FLICKER_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
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

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const MessageBubble = memo(({ message, isMobile }: { message: Message; isMobile: boolean }) => {
  const isDM = message.role === 'assistant';

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className={`flex ${isDM ? 'justify-start' : 'justify-end'} mb-3`}
    >
      <div
        className={`max-w-[85%] ${isMobile ? 'text-xs' : 'text-sm'} rounded-lg p-3 ${
          isDM
            ? 'bg-gradient-to-br from-purple-900/60 to-indigo-900/60 text-purple-100 border border-purple-700/40'
            : 'bg-gradient-to-br from-amber-900/60 to-orange-900/60 text-amber-100 border border-amber-700/40'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg" aria-hidden="true">
            {isDM ? '🧙‍♂️' : '⚔️'}
          </span>
          <span className="font-semibold text-xs">{isDM ? 'Dungeon Master' : 'Anda'}</span>
        </div>
        <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <span className="text-xs opacity-70 mt-1 block">
          {message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// ============================================
// MAIN COMPONENT
// ============================================
export default function DungeonMasterChatInGame({ sessionId, availableHints, maxHints, onHintUsed, disabled = false }: Props) {
  const isMobile = useIsMobile();
  const { setTorchRef } = useDungeonAtmosphere();
  const { auth } = usePage().props as any;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Salam, petualang! Aku adalah Dungeon Master yang akan membantumu dalam perjalanan ini. Gunakan bantuan dengan bijak!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ============================================
  // CALLBACKS
  // ============================================
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const handleAskHelp = useCallback(async () => {
    if (availableHints <= 0) {
      toast.error('Tidak ada hint yang tersisa!');
      return;
    }

    if (!input.trim()) {
      toast.error('Mohon masukkan pertanyaan');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    try {
      // Setup SSE connection
      const eventSource = new EventSource(
        `/game/dm/stream?session_id=${sessionId}&message=${encodeURIComponent(userMessage.content)}`
      );

      eventSourceRef.current = eventSource;
      let fullContent = '';

      eventSource.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        fullContent += data.content;
        setStreamingContent(fullContent);
      });

      eventSource.addEventListener('done', (event) => {
        const data = JSON.parse(event.data);

        // Add complete AI message
        const aiMessage: Message = {
          id: data.message_id.toString(),
          role: 'assistant',
          content: fullContent,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
        setStreamingContent('');
        setIsStreaming(false);
        eventSource.close();
        eventSourceRef.current = null;

        // Notify parent that hint was used
        onHintUsed();
        toast.success(`Hint digunakan! Tersisa: ${availableHints - 1}`);
      });

      eventSource.addEventListener('error', (error) => {
        console.error('SSE Error:', error);
        setIsStreaming(false);
        setStreamingContent('');
        eventSource.close();
        eventSourceRef.current = null;
        toast.error('Gagal mendapatkan hint dari Dungeon Master');
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsStreaming(false);
      setStreamingContent('');
      toast.error('Gagal terhubung ke Dungeon Master');
    }
  }, [input, availableHints, sessionId, onHintUsed]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= CONFIG.MAX_MESSAGE_LENGTH) {
      setInput(value);
    }
  }, []);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !isStreaming && !disabled) {
        e.preventDefault();
        handleAskHelp();
      }
    },
    [handleAskHelp, isStreaming, disabled]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <motion.div variants={scaleIn} initial="initial" animate="animate">
      <Card className="border-2 border-purple-700/40 bg-gradient-to-br from-stone-900/90 to-purple-950/40 backdrop-blur-sm dungeon-card-glow-purple">
        <CardHeader className={`relative ${isMobile ? 'p-3 pb-2' : 'p-4 pb-2'}`}>
          <div ref={setTorchRef(0)} className={`absolute ${isMobile ? 'top-2 left-2 text-lg' : 'top-2 left-2 text-xl'} dungeon-torch-flicker`}>
            🔥
          </div>
          <div ref={setTorchRef(1)} className={`absolute ${isMobile ? 'top-2 right-2 text-lg' : 'top-2 right-2 text-xl'} dungeon-torch-flicker`}>
            🔥
          </div>
          <div className="flex items-center justify-between">
            <CardTitle className={`text-purple-300 ${isMobile ? 'text-sm' : 'text-base'} dungeon-glow-text flex items-center gap-2`}>
              <span className="text-2xl" aria-hidden="true">
                🧙‍♂️
              </span>
              Dungeon Master
            </CardTitle>
            <Badge
              className={`${availableHints > 0 ? 'bg-emerald-800 text-emerald-100' : 'bg-red-800 text-red-100'} border ${
                availableHints > 0 ? 'border-emerald-700' : 'border-red-700'
              } text-xs`}
            >
              <span className="mr-1" aria-hidden="true">
                💡
              </span>
              {availableHints}/{maxHints} Hint
            </Badge>
          </div>
        </CardHeader>

        <CardContent className={isMobile ? 'p-3 pt-0' : 'p-4 pt-0'}>
          {/* Messages Area */}
          <div className="bg-stone-950/60 rounded-lg p-3 mb-3 overflow-y-auto border border-stone-700/40" style={{ maxHeight: '300px', minHeight: '200px' }}>
            <AnimatePresence>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} isMobile={isMobile} />
              ))}
            </AnimatePresence>

            {/* Streaming Message */}
            {isStreaming && streamingContent && (
              <motion.div variants={fadeInUp} initial="initial" animate="animate" className="flex justify-start mb-3">
                <div className="bg-gradient-to-br from-purple-900/60 to-indigo-900/60 text-purple-100 border border-purple-700/40 rounded-lg p-3 max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg" aria-hidden="true">
                      🧙‍♂️
                    </span>
                    <span className="font-semibold text-xs">Dungeon Master</span>
                  </div>
                  <p className={`leading-relaxed whitespace-pre-wrap ${isMobile ? 'text-xs' : 'text-sm'}`}>{streamingContent}</p>
                  <div className="flex gap-1 mt-2">
                    <motion.div
                      className="w-2 h-2 bg-purple-400 rounded-full"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-purple-400 rounded-full"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-purple-400 rounded-full"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Typing Indicator */}
            {isStreaming && !streamingContent && (
              <motion.div variants={fadeInUp} initial="initial" animate="animate" className="flex justify-start mb-3">
                <div className="bg-gradient-to-br from-purple-900/60 to-indigo-900/60 text-purple-100 border border-purple-700/40 rounded-lg p-3 max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg" aria-hidden="true">
                      🧙‍♂️
                    </span>
                    <span className="font-semibold text-xs">Dungeon Master</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    <motion.div
                      className="w-2 h-2 bg-purple-400 rounded-full"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-purple-400 rounded-full"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-purple-400 rounded-full"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Tanyakan petunjuk pada Dungeon Master..."
                className={`flex-1 ${
                  isMobile ? 'px-3 py-2 text-xs' : 'px-3 py-2 text-sm'
                } bg-stone-900/70 border border-stone-700/50 rounded-lg text-purple-200 placeholder-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={isStreaming || disabled || availableHints <= 0}
                maxLength={CONFIG.MAX_MESSAGE_LENGTH}
                autoComplete="off"
                aria-label="Input pertanyaan"
              />
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={handleAskHelp}
                  disabled={!input.trim() || isStreaming || disabled || availableHints <= 0}
                  className={`${
                    isMobile ? 'px-3 py-2' : 'px-4 py-2'
                  } bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation`}
                  aria-label="Kirim pertanyaan"
                >
                  {isStreaming ? (
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} aria-hidden="true">
                      ⚙️
                    </motion.span>
                  ) : (
                    <span aria-hidden="true">✨</span>
                  )}
                </Button>
              </motion.div>
            </div>

            {availableHints <= 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 text-center">
                ⚠️ Tidak ada hint yang tersisa. Selesaikan dengan kemampuanmu!
              </motion.div>
            )}

            <div className="text-xs text-stone-400 text-center">💡 Tips: Tanyakan hal spesifik untuk mendapat bantuan yang tepat</div>
          </div>
        </CardContent>
      </Card>

      <style>{`
        .dungeon-torch-flicker { display: inline-block; }
        .dungeon-card-glow-purple { box-shadow: 0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2); }
        .dungeon-glow-text { text-shadow: 0 0 20px rgba(168, 85, 247, 0.6); }
        .overflow-y-auto::-webkit-scrollbar { width: 4px; }
        .overflow-y-auto::-webkit-scrollbar-track { background: rgba(28, 25, 23, 0.5); border-radius: 2px; }
        .overflow-y-auto::-webkit-scrollbar-thumb { background: rgba(147, 51, 234, 0.6); border-radius: 2px; }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: rgba(147, 51, 234, 0.8); }
        .touch-manipulation { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
      `}</style>
    </motion.div>
  );
}
