import React, { useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { gsap } from 'gsap';

import type { TournamentGroup, TournamentData } from '@/types/game';
import {
  normalizeBoolean,
  normalizeTournamentGroup,
  normalizeTournamentData,
} from '@/types/game';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const STATUS_CONFIG = {
  waiting: { color: 'bg-amber-500', text: 'Menunggu di Gerbang', icon: '⏳', glow: 'shadow-amber-500/50' },
  ready: { color: 'bg-blue-500', text: 'Siap Bertarung', icon: '✅', glow: 'shadow-blue-500/50' },
  playing: { color: 'bg-green-500', text: 'Sedang Bertempur', icon: '⚔️', glow: 'shadow-green-500/50' },
  completed: { color: 'bg-purple-500', text: 'Selesai Bertarung', icon: '🏁', glow: 'shadow-purple-500/50' },
  eliminated: { color: 'bg-red-500', text: 'Gugur di Arena', icon: '💀', glow: 'shadow-red-500/50' },
  champion: { color: 'bg-yellow-400', text: 'Juara Dungeon', icon: '👑', glow: 'shadow-yellow-500/50' },
} as const;

const ROUND_CONFIG = {
  1: { icon: '🎯', title: 'Babak Kualifikasi Dungeon' },
  2: { icon: '🥊', title: 'Pertempuran Semi Final' },
  3: { icon: '👑', title: 'Pertarungan Final Legendaris' },
} as const;

const ANIMATION_CONFIG = {
  CARD_ENTRANCE_DURATION: 0.6,
  CARD_STAGGER: 0.1,
  TORCH_FLICKER_INTERVAL: 150,
  PULSE_DURATION: 2000,
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================
interface TournamentBracketProps {
  tournament: TournamentData;
  groups: TournamentGroup[];
  loading?: boolean;
  className?: string;
  showGroupDetails?: boolean;
  compactMode?: boolean;
}

type GroupStatus = 'waiting' | 'ready' | 'playing' | 'completed' | 'eliminated' | 'champion';
type CardSize = 'small' | 'medium' | 'large';

// ============================================
// CUSTOM HOOKS
// ============================================
const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // Torch flicker animation
    const torchInterval = setInterval(() => {
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
    }, ANIMATION_CONFIG.TORCH_FLICKER_INTERVAL);

    return () => clearInterval(torchInterval);
  }, []);

  useEffect(() => {
    // Card entrance animation
    const validCards = cardRefs.current.filter((card): card is HTMLElement => card !== null);
    if (validCards.length > 0) {
      gsap.fromTo(
        validCards,
        {
          opacity: 0,
          y: 30,
          scale: 0.9,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: ANIMATION_CONFIG.CARD_ENTRANCE_DURATION,
          stagger: ANIMATION_CONFIG.CARD_STAGGER,
          ease: 'back.out(1.4)',
        }
      );
    }
  }, []);

  const setTorchRef = (index: number) => (el: HTMLSpanElement | null) => {
    torchRefs.current[index] = el;
  };

  const setCardRef = (index: number) => (el: HTMLDivElement | null) => {
    cardRefs.current[index] = el;
  };

  return { setTorchRef, setCardRef };
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const formatTime = (seconds?: number | null): string | null => {
  if (!seconds) return null;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const StatusBadge = memo(({ status }: { status: string }) => {
  const config = STATUS_CONFIG[status as GroupStatus] || STATUS_CONFIG.waiting;

  return (
    <Badge
      className={`${config.color} text-white flex items-center gap-1.5 text-xs font-semibold shadow-md px-2.5 py-1 ${config.glow} dungeon-badge-glow`}
    >
      <span className="text-sm">{config.icon}</span>
      <span>{config.text}</span>
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';

const GroupCard = memo(
  ({
    group,
    isWinner,
    isEliminated,
    size,
    showGroupDetails,
    isCompactMode,
    index,
  }: {
    group: TournamentGroup;
    isWinner: boolean;
    isEliminated: boolean;
    size: CardSize;
    showGroupDetails: boolean;
    isCompactMode: boolean;
    index: number;
  }) => {
    const { setCardRef } = useDungeonAtmosphere();

    const sizeClasses = {
      small: 'p-3',
      medium: 'p-4',
      large: 'p-5',
    };

    const textSizes = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
    };

    const iconSizes = {
      small: 'text-2xl',
      medium: 'text-3xl',
      large: 'text-4xl',
    };

    const getCardClasses = (): string => {
      const baseClasses =
        'rounded-xl border-2 transition-all duration-500 transform hover:scale-105 shadow-lg dungeon-card';

      if (isWinner) {
        return `${baseClasses} border-yellow-400 bg-gradient-to-br from-yellow-900/40 to-amber-950/40 shadow-yellow-500/50 dungeon-pulse dungeon-card-glow-yellow`;
      }
      if (isEliminated) {
        return `${baseClasses} border-red-500 bg-gradient-to-br from-red-950/40 to-stone-950/40 shadow-red-500/30 opacity-75 dungeon-card-glow-red`;
      }
      if (group.status === 'playing') {
        return `${baseClasses} border-green-500 bg-gradient-to-br from-green-950/40 to-emerald-950/40 shadow-green-500/40 dungeon-pulse dungeon-card-glow-green`;
      }
      if (group.status === 'completed') {
        return `${baseClasses} border-purple-500 bg-gradient-to-br from-purple-950/40 to-indigo-950/40 shadow-purple-500/30 dungeon-card-glow-purple`;
      }
      return `${baseClasses} border-stone-600 bg-gradient-to-br from-stone-900/40 to-stone-950/40 shadow-stone-700/20`;
    };

    return (
      <div ref={setCardRef(index)} className={`${sizeClasses[size]} ${getCardClasses()}`}>
        <div className="text-center space-y-3">
          <div
            className={`${iconSizes[size]} mb-2 transition-transform duration-300 hover:scale-125 dungeon-icon-float`}
          >
            {isWinner
              ? '👑'
              : isEliminated
              ? '💀'
              : group.status === 'playing'
              ? '⚔️'
              : group.status === 'completed'
              ? '🏁'
              : '🛡️'}
          </div>

          <h4
            className={`font-bold ${textSizes[size]} ${
              isWinner
                ? 'text-yellow-300 dungeon-glow-text'
                : isEliminated
                ? 'text-red-300'
                : group.status === 'champion'
                ? 'text-yellow-300 dungeon-glow-text'
                : 'text-stone-200'
            }`}
          >
            {group.name}
          </h4>

          <div className="space-y-2">
            <StatusBadge status={group.status} />

            {group.completion_time && !isCompactMode && (
              <div className="text-xs font-medium text-stone-300 bg-stone-800/50 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                Waktu Takluk:{' '}
                <span className="text-amber-300 font-bold">{formatTime(group.completion_time)}</span>
              </div>
            )}

            {group.rank && (
              <Badge
                className={`text-xs font-bold shadow-md ${
                  group.rank === 1
                    ? 'bg-gradient-to-r from-yellow-600 to-amber-700 text-yellow-100 dungeon-badge-glow'
                    : group.rank === 2
                    ? 'bg-gradient-to-r from-stone-400 to-stone-500 text-stone-100'
                    : group.rank === 3
                    ? 'bg-gradient-to-r from-amber-700 to-orange-800 text-amber-100'
                    : 'bg-gradient-to-r from-stone-700 to-stone-800 text-stone-300'
                }`}
              >
                Peringkat #{group.rank}
              </Badge>
            )}

            {group.score !== undefined && !isCompactMode && (
              <div className="text-xs text-stone-300 bg-stone-800/50 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                Skor Penaklukan:{' '}
                <span className="font-bold text-amber-300 text-base">{group.score}</span>
              </div>
            )}
          </div>

          {showGroupDetails && group.participants && !isCompactMode && (
            <div className="mt-3 space-y-1.5 pt-3 border-t border-stone-600/50">
              <p className="text-xs text-stone-400 font-semibold mb-2">Anggota Guild:</p>
              {group.participants.slice(0, 2).map((p, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs bg-stone-800/40 px-2.5 py-1.5 rounded-lg border border-stone-700/30"
                >
                  <span className="truncate font-medium text-stone-300">{p.nickname}</span>
                  <span
                    className={`text-sm font-semibold ${
                      p.role === 'defuser' ? 'text-red-400' : 'text-blue-400'
                    }`}
                  >
                    {p.role === 'defuser' ? '💣' : '📖'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);

GroupCard.displayName = 'GroupCard';

const ConnectorLine = memo(({ isAdvancing }: { isAdvancing: boolean }) => (
  <div className="flex items-center justify-center py-6">
    <div
      className={`h-1 w-20 sm:w-24 rounded-full ${
        isAdvancing
          ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 shadow-lg shadow-yellow-500/50 dungeon-line-glow'
          : 'bg-gradient-to-r from-stone-600 to-stone-500'
      } transition-all duration-500`}
    ></div>
    {isAdvancing && (
      <div className="text-yellow-400 text-2xl ml-3 animate-bounce dungeon-glow-text">➤</div>
    )}
  </div>
));

ConnectorLine.displayName = 'ConnectorLine';

// ============================================
// MAIN COMPONENT
// ============================================
export default function TournamentBracket({
  tournament,
  groups,
  loading = false,
  className = '',
  showGroupDetails = true,
  compactMode = false,
}: TournamentBracketProps) {
  const { setTorchRef } = useDungeonAtmosphere();

  const isCompactMode = normalizeBoolean(compactMode);
  const shouldShowGroupDetails = normalizeBoolean(showGroupDetails);
  const isLoading = normalizeBoolean(loading);

  const normalizedTournament = useMemo(() => normalizeTournamentData(tournament), [tournament]);
  const normalizedGroups = useMemo(() => groups.map(normalizeTournamentGroup), [groups]);

  const renderQualificationRound = useCallback(() => {
    const qualificationGroups = normalizedGroups.slice(0, 4);
    const eliminatedCount = qualificationGroups.filter((g) => g.status === 'eliminated').length;
    const completedCount = qualificationGroups.filter((g) => g.status === 'completed').length;

    return (
      <div className="mb-12 animate-[fadeIn_0.5s_ease-out]">
        <div className="text-center mb-8">
          <h3 className="text-2xl sm:text-3xl font-bold text-purple-300 mb-4 flex items-center justify-center flex-wrap gap-2 dungeon-glow-text">
            <span>{ROUND_CONFIG[1].icon}</span>
            <span>{ROUND_CONFIG[1].title}</span>
            <span>⚡</span>
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-3">
            <Badge className="bg-blue-600 text-blue-100 px-4 py-2 text-sm font-semibold shadow-md dungeon-badge-glow">
              4 Guild Berkompetisi
            </Badge>
            <Badge className="bg-yellow-600 text-yellow-100 px-4 py-2 text-sm font-semibold shadow-md dungeon-badge-glow">
              3 Teratas Maju ke Arena Berikutnya
            </Badge>
            {eliminatedCount > 0 && (
              <Badge className="bg-red-600 text-red-100 px-4 py-2 text-sm font-semibold shadow-md dungeon-pulse dungeon-badge-glow">
                {eliminatedCount} Gugur di Kegelapan
              </Badge>
            )}
          </div>
        </div>

        <div
          className={
            isCompactMode
              ? 'grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6'
          }
        >
          {qualificationGroups.map((group, index) => (
            <GroupCard
              key={group.id}
              group={group}
              isWinner={group.status === 'champion' || Boolean(group.rank && group.rank <= 3)}
              isEliminated={group.status === 'eliminated'}
              size={isCompactMode ? 'small' : 'medium'}
              showGroupDetails={shouldShowGroupDetails}
              isCompactMode={isCompactMode}
              index={index}
            />
          ))}
        </div>

        <div className="mt-8 text-center">
          <div className="flex justify-center items-center gap-3 sm:gap-4">
            <div
              className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-500 ${
                completedCount >= 4
                  ? 'bg-green-500 shadow-lg shadow-green-500/50 dungeon-pulse'
                  : 'bg-stone-600'
              }`}
            ></div>
            <div className="w-6 sm:w-8 h-1 bg-stone-600 rounded-full"></div>
            <div
              className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-500 ${
                normalizedTournament.current_round >= 2
                  ? 'bg-green-500 shadow-lg shadow-green-500/50 dungeon-pulse'
                  : 'bg-stone-600'
              }`}
            ></div>
            <div className="w-6 sm:w-8 h-1 bg-stone-600 rounded-full"></div>
            <div
              className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-500 ${
                normalizedTournament.current_round >= 3
                  ? 'bg-green-500 shadow-lg shadow-green-500/50 dungeon-pulse'
                  : 'bg-stone-600'
              }`}
            ></div>
          </div>
          <div className="flex justify-center items-center gap-6 sm:gap-8 mt-3 text-xs sm:text-sm text-stone-400 font-medium">
            <span>Kualifikasi</span>
            <span>Semi Final</span>
            <span>Final</span>
          </div>
        </div>

        {eliminatedCount > 0 && (
          <div className="text-center mt-6">
            <div className="inline-flex items-center gap-2 bg-red-950/40 px-6 py-3 rounded-xl border-2 border-red-600 shadow-lg shadow-red-500/20 dungeon-pulse backdrop-blur-sm">
              <span className="text-red-300 font-bold text-sm sm:text-base dungeon-glow-text">
                💀 Guild terlambat gugur di kegelapan dungeon
              </span>
            </div>
          </div>
        )}

        {(normalizedTournament.current_round > 1 || normalizedTournament.status !== 'qualification') && (
          <ConnectorLine isAdvancing={true} />
        )}
      </div>
    );
  }, [normalizedGroups, normalizedTournament, isCompactMode, shouldShowGroupDetails]);

  const renderSemifinals = useCallback(() => {
    const semifinalGroups = normalizedGroups.filter(
      (g) => g.status !== 'eliminated' && g.rank && g.rank <= 3
    );

    if (semifinalGroups.length === 0) return null;

    return (
      <div className="mb-12 animate-[fadeIn_0.5s_ease-out]">
        <div className="text-center mb-8">
          <h3 className="text-2xl sm:text-3xl font-bold text-blue-300 mb-4 flex items-center justify-center flex-wrap gap-2 dungeon-glow-text">
            <span>{ROUND_CONFIG[2].icon}</span>
            <span>{ROUND_CONFIG[2].title}</span>
            <span>🔥</span>
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-3">
            <Badge className="bg-blue-600 text-blue-100 px-4 py-2 text-sm font-semibold shadow-md dungeon-badge-glow">
              3 Guild Elit Tersisa
            </Badge>
            <Badge className="bg-purple-600 text-purple-100 px-4 py-2 text-sm font-semibold shadow-md dungeon-badge-glow">
              2 Terkuat Maju ke Final
            </Badge>
          </div>
        </div>

        <div className="flex justify-center">
          <div
            className={
              isCompactMode
                ? 'grid grid-cols-3 gap-4 sm:gap-6 max-w-5xl w-full'
                : 'grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-5xl w-full px-4'
            }
          >
            {semifinalGroups.map((group, index) => (
              <GroupCard
                key={group.id}
                group={group}
                isWinner={group.rank === 1 || group.rank === 2}
                isEliminated={group.status === 'eliminated'}
                size={isCompactMode ? 'small' : 'medium'}
                showGroupDetails={shouldShowGroupDetails}
                isCompactMode={isCompactMode}
                index={index}
              />
            ))}
          </div>
        </div>

        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-2 bg-blue-950/40 px-6 py-3 rounded-xl border-2 border-blue-600 shadow-lg shadow-blue-500/20 backdrop-blur-sm">
            <span className="text-blue-300 font-bold text-sm sm:text-base dungeon-glow-text">
              ⚡ 2 Guild Terkuat memasuki arena final legendaris
            </span>
          </div>
        </div>

        {(normalizedTournament.current_round >= 3 ||
          normalizedTournament.status === 'finals' ||
          normalizedTournament.status === 'completed') && <ConnectorLine isAdvancing={true} />}
      </div>
    );
  }, [normalizedGroups, normalizedTournament, isCompactMode, shouldShowGroupDetails]);

  const renderFinals = useCallback(() => {
    const finalists = normalizedGroups.filter((g) => g.rank && g.rank <= 2);
    const champion = normalizedGroups.find((g) => g.status === 'champion');

    if (finalists.length === 0 && !champion) return null;

    return (
      <div className="mb-12 animate-[fadeIn_0.5s_ease-out]">
        <div className="text-center mb-8">
          <h3 className="text-2xl sm:text-4xl font-bold text-yellow-300 mb-4 flex items-center justify-center flex-wrap gap-2 dungeon-pulse dungeon-glow-text">
            <span>{ROUND_CONFIG[3].icon}</span>
            <span>FINAL KEJUARAAN DUNGEON</span>
            <span>🏆</span>
          </h3>
        </div>

        {champion ? (
          <div className="text-center px-4">
            <Card className="border-4 border-yellow-500 bg-gradient-to-br from-yellow-900/40 to-amber-950/40 shadow-2xl shadow-yellow-500/50 max-w-2xl mx-auto dungeon-pulse dungeon-card-glow-yellow">
              <CardContent className="p-6 sm:p-8">
                <div className="text-6xl sm:text-8xl mb-4 animate-bounce dungeon-icon-float">
                  🏆
                </div>
                <h4 className="text-2xl sm:text-3xl font-bold text-yellow-300 mb-4 dungeon-glow-text">
                  PENAKLUK DUNGEON LEGENDARIS!
                </h4>
                <div className="bg-yellow-900/50 p-4 sm:p-6 rounded-xl shadow-inner border-2 border-yellow-600/40 backdrop-blur-sm">
                  <h5 className="text-xl sm:text-2xl font-bold text-yellow-100 mb-4">
                    {champion.name}
                  </h5>
                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    {champion.completion_time && (
                      <div className="bg-yellow-800/40 p-4 rounded-lg shadow-md border border-yellow-600/30">
                        <p className="text-yellow-100 text-sm font-bold mb-1">
                          Waktu Kemenangan
                        </p>
                        <p className="text-yellow-300 text-lg sm:text-xl font-bold">
                          {formatTime(champion.completion_time)}
                        </p>
                      </div>
                    )}
                    {champion.score !== undefined && (
                      <div className="bg-yellow-800/40 p-4 rounded-lg shadow-md border border-yellow-600/30">
                        <p className="text-yellow-100 text-sm font-bold mb-1">Skor Akhir</p>
                        <p className="text-yellow-300 text-lg sm:text-xl font-bold">
                          {champion.score.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  {champion.participants && (
                    <div className="mt-4">
                      <p className="text-yellow-200 text-sm mb-3 font-semibold">
                        Petualang Legendaris:
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                        {champion.participants.map((p, index) => (
                          <Badge
                            key={index}
                            className="bg-yellow-600 text-yellow-100 text-sm font-semibold shadow-md px-3 py-1.5 dungeon-badge-glow"
                          >
                            {p.role === 'defuser' ? '💣' : '📖'} {p.nickname}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex justify-center px-4">
            <div
              className={
                isCompactMode
                  ? 'grid grid-cols-2 gap-6 sm:gap-8 max-w-4xl w-full'
                  : 'grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-4xl w-full'
              }
            >
              {finalists.map((group, index) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  isWinner={group.rank === 1}
                  isEliminated={false}
                  size="large"
                  showGroupDetails={shouldShowGroupDetails}
                  isCompactMode={isCompactMode}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }, [normalizedGroups, isCompactMode, shouldShowGroupDetails]);

  if (isLoading) {
    return (
      <Card
        className={`border-4 border-amber-600 bg-gradient-to-br from-amber-950/40 to-stone-950 shadow-2xl ${className} dungeon-card-glow`}
      >
        <CardHeader>
          <CardTitle className="text-amber-300 text-center text-xl sm:text-2xl font-bold dungeon-glow-text">
            🏆 Bracket Turnamen Dungeon
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-8 text-center">
          <TournamentBracketSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (normalizedGroups.length === 0) {
    return (
      <Card
        className={`border-4 border-amber-600 bg-gradient-to-br from-amber-950/40 to-stone-950 shadow-2xl ${className} dungeon-card-glow`}
      >
        <CardHeader>
          <div className="absolute top-4 left-4 text-2xl">
            <span ref={setTorchRef(0)} className="dungeon-torch-flicker">
              🔥
            </span>
          </div>
          <div className="absolute top-4 right-4 text-2xl">
            <span ref={setTorchRef(1)} className="dungeon-torch-flicker">
              🔥
            </span>
          </div>
          <CardTitle className="text-amber-300 text-center text-xl sm:text-2xl font-bold dungeon-glow-text relative z-10">
            🏆 Bracket Turnamen Dungeon
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="text-5xl sm:text-6xl mb-4 animate-bounce dungeon-icon-float">🏟️</div>
          <h3 className="text-lg sm:text-xl font-bold text-amber-200 mb-4 dungeon-glow-text">
            Arena Masih Sunyi
          </h3>
          <p className="text-sm sm:text-base text-amber-300/80">
            Bracket turnamen akan muncul di arena ini setelah guild-guild legendaris terdaftar!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`border-4 border-amber-600 bg-gradient-to-br from-amber-950/40 to-stone-950 shadow-2xl ${className} dungeon-card-glow relative overflow-hidden`}
    >
      <CardHeader className="relative">
        <div className="absolute top-4 left-4 text-2xl">
          <span ref={setTorchRef(0)} className="dungeon-torch-flicker">
            🔥
          </span>
        </div>
        <div className="absolute top-4 right-4 text-2xl">
          <span ref={setTorchRef(1)} className="dungeon-torch-flicker">
            🔥
          </span>
        </div>
        <CardTitle className="text-amber-300 text-center text-xl sm:text-2xl font-bold flex items-center justify-center flex-wrap gap-2 relative z-10 dungeon-glow-text">
          <span>🏆</span>
          <span className="text-base sm:text-2xl">
            {normalizedTournament.name} - Bracket Turnamen
          </span>
          <span>⚔️</span>
        </CardTitle>
        <div className="text-center mt-4 relative z-10">
          <div className="flex flex-wrap justify-center items-center gap-3">
            <Badge className="bg-purple-700 text-purple-100 text-sm sm:text-base px-4 py-2 font-bold shadow-md dungeon-badge-glow">
              Babak {normalizedTournament.current_round}/3
            </Badge>
            <Badge
              className={`text-sm sm:text-base px-4 py-2 font-bold shadow-md dungeon-badge-glow ${
                normalizedTournament.status === 'qualification'
                  ? 'bg-yellow-700 text-yellow-100'
                  : normalizedTournament.status === 'semifinals'
                  ? 'bg-blue-700 text-blue-100'
                  : normalizedTournament.status === 'finals'
                  ? 'bg-purple-700 text-purple-100'
                  : normalizedTournament.status === 'completed'
                  ? 'bg-green-700 text-green-100'
                  : 'bg-stone-700 text-stone-100'
              }`}
            >
              {normalizedTournament.status === 'qualification'
                ? 'KUALIFIKASI'
                : normalizedTournament.status === 'semifinals'
                ? 'SEMI FINAL'
                : normalizedTournament.status === 'finals'
                ? 'FINAL'
                : normalizedTournament.status === 'completed'
                ? 'SELESAI'
                : normalizedTournament.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {renderQualificationRound()}

        {(normalizedTournament.current_round >= 2 ||
          normalizedTournament.status === 'semifinals' ||
          normalizedTournament.status === 'finals' ||
          normalizedTournament.status === 'completed') &&
          renderSemifinals()}

        {(normalizedTournament.current_round >= 3 ||
          normalizedTournament.status === 'finals' ||
          normalizedTournament.status === 'completed') &&
          renderFinals()}
      </CardContent>

      {/* ========================================
          CUSTOM DUNGEON STYLES
          ======================================== */}
      <style>{`
        /* Torch Flicker */
        .dungeon-torch-flicker {
          display: inline-block;
        }

        /* Card Glows */
        .dungeon-card-glow {
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.2);
        }

        .dungeon-card-glow-yellow {
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.6), 0 0 60px rgba(251, 191, 36, 0.4);
        }

        .dungeon-card-glow-green {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2);
        }

        .dungeon-card-glow-purple {
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2);
        }

        .dungeon-card-glow-red {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2);
        }

        /* Badge Glow */
        .dungeon-badge-glow {
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
        }

        /* Text Glow */
        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4);
        }

        /* Line Glow */
        .dungeon-line-glow {
          filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.6));
        }

        /* Pulse Animation */
        .dungeon-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        /* Icon Float */
        .dungeon-icon-float {
          display: inline-block;
          animation: iconFloat 3s ease-in-out infinite;
        }

        @keyframes iconFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        /* Fade In Animation */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .dungeon-card-glow,
          .dungeon-card-glow-yellow,
          .dungeon-card-glow-green,
          .dungeon-card-glow-purple,
          .dungeon-card-glow-red {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.3), 0 0 30px rgba(251, 191, 36, 0.15);
          }
        }
      `}</style>
    </Card>
  );
}

// ============================================
// SKELETON COMPONENT
// ============================================
export const TournamentBracketSkeleton = () => (
  <div className="space-y-8">
    <div className="animate-pulse">
      <div className="h-5 sm:h-6 bg-stone-700 rounded w-1/3 mx-auto mb-6"></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="bg-stone-800/50 p-4 rounded-lg">
            <div className="w-8 h-8 bg-stone-700 rounded-full mx-auto mb-2"></div>
            <div className="h-4 bg-stone-700 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-3 bg-stone-700 rounded w-1/2 mx-auto"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
