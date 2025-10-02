import React, { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';

import type {
  TournamentGroup,
  TournamentData
} from '@/types/game';
import {
  normalizeBoolean,
  normalizeTournamentGroup,
  normalizeTournamentData
} from '@/types/game';

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

const STATUS_CONFIG = {
  waiting: { color: 'bg-amber-500', text: 'Menunggu', icon: '⏳' },
  ready: { color: 'bg-blue-500', text: 'Siap', icon: '✅' },
  playing: { color: 'bg-green-500', text: 'Bermain', icon: '⚔️' },
  completed: { color: 'bg-purple-500', text: 'Selesai', icon: '🏁' },
  eliminated: { color: 'bg-red-500', text: 'Tersingkir', icon: '💀' },
  champion: { color: 'bg-yellow-400', text: 'Juara', icon: '👑' },
} as const;

const ROUND_CONFIG = {
  1: { icon: '🎯', title: 'Babak Kualifikasi' },
  2: { icon: '🥊', title: 'Semi Final' },
  3: { icon: '👑', title: 'Final' },
} as const;

export default function TournamentBracket({
  tournament,
  groups,
  loading = false,
  className = '',
  showGroupDetails = true,
  compactMode = false
}: TournamentBracketProps) {

  const isCompactMode = normalizeBoolean(compactMode);
  const shouldShowGroupDetails = normalizeBoolean(showGroupDetails);
  const isLoading = normalizeBoolean(loading);

  const normalizedTournament = useMemo(() => normalizeTournamentData(tournament), [tournament]);
  const normalizedGroups = useMemo(() => groups.map(normalizeTournamentGroup), [groups]);

  const getStatusBadge = useCallback((status: string) => {
    const config = STATUS_CONFIG[status as GroupStatus] || STATUS_CONFIG.waiting;

    return (
      <Badge className={`${config.color} text-white flex items-center gap-1.5 text-xs font-semibold shadow-sm px-2.5 py-1`}>
        <span className="text-sm">{config.icon}</span>
        <span>{config.text}</span>
      </Badge>
    );
  }, []);

  const formatTime = useCallback((seconds?: number | null) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const getCardClasses = useCallback((
    group: TournamentGroup,
    isWinner: boolean,
    isEliminated: boolean
  ): string => {
    const baseClasses = 'rounded-xl border-2 transition-all duration-500 transform hover:scale-105 shadow-lg';

    if (isWinner) {
      return `${baseClasses} border-yellow-400 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 shadow-yellow-500/50 animate-pulse`;
    }
    if (isEliminated) {
      return `${baseClasses} border-red-500 bg-gradient-to-br from-red-500/20 to-red-700/20 shadow-red-500/30 opacity-75`;
    }
    if (group.status === 'playing') {
      return `${baseClasses} border-green-500 bg-gradient-to-br from-green-500/20 to-emerald-600/20 shadow-green-500/40 animate-pulse`;
    }
    if (group.status === 'completed') {
      return `${baseClasses} border-purple-500 bg-gradient-to-br from-purple-500/20 to-indigo-600/20 shadow-purple-500/30`;
    }
    return `${baseClasses} border-gray-600 bg-gradient-to-br from-gray-700/20 to-gray-800/20 shadow-gray-700/20`;
  }, []);

  const getGroupCard = useCallback((
    group: TournamentGroup,
    isWinner = false,
    isEliminated = false,
    size: CardSize = 'medium'
  ) => {
    const sizeClasses = {
      small: 'p-3',
      medium: 'p-4',
      large: 'p-5'
    };

    const textSizes = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg'
    };

    const iconSizes = {
      small: 'text-2xl',
      medium: 'text-3xl',
      large: 'text-4xl'
    };

    const cardClasses = getCardClasses(group, isWinner, isEliminated);

    return (
      <div key={group.id} className={`${sizeClasses[size]} ${cardClasses}`}>
        <div className="text-center space-y-3">
          <div className={`${iconSizes[size]} mb-2 transition-transform duration-300 hover:scale-125`}>
            {isWinner ? '👑' :
             isEliminated ? '💀' :
             group.status === 'playing' ? '⚔️' :
             group.status === 'completed' ? '🏁' : '🛡️'}
          </div>

          <h4 className={`font-bold ${textSizes[size]} ${
            isWinner ? 'text-yellow-300 drop-shadow-lg' :
            isEliminated ? 'text-red-300' :
            group.status === 'champion' ? 'text-yellow-300' : 'text-white'
          }`}>
            {group.name}
          </h4>

          <div className="space-y-2">
            {getStatusBadge(group.status)}

            {group.completion_time && !isCompactMode && (
              <div className="text-xs font-medium text-gray-300 bg-gray-800/50 px-3 py-1.5 rounded-lg">
                Waktu: <span className="text-white font-bold">{formatTime(group.completion_time)}</span>
              </div>
            )}

            {group.rank && (
              <Badge className={`text-xs font-bold shadow-md ${
                group.rank === 1 ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white' :
                group.rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white' :
                group.rank === 3 ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white' :
                'bg-gradient-to-r from-stone-600 to-stone-700 text-white'
              }`}>
                Peringkat #{group.rank}
              </Badge>
            )}

            {group.score !== undefined && !isCompactMode && (
              <div className="text-xs text-gray-300 bg-gray-800/50 px-3 py-1.5 rounded-lg">
                Skor: <span className="font-bold text-white text-base">{group.score}</span>
              </div>
            )}
          </div>

          {shouldShowGroupDetails && group.participants && !isCompactMode && (
            <div className="mt-3 space-y-1.5 pt-3 border-t border-gray-600/50">
              {group.participants.slice(0, 2).map((p, index) => (
                <div key={index} className="flex items-center justify-between text-xs bg-gray-800/30 px-2.5 py-1.5 rounded-lg">
                  <span className="truncate font-medium text-gray-300">{p.nickname}</span>
                  <span className={`text-sm font-semibold ${p.role === 'defuser' ? 'text-red-400' : 'text-blue-400'}`}>
                    {p.role === 'defuser' ? '💣' : '📖'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }, [getCardClasses, getStatusBadge, formatTime, isCompactMode, shouldShowGroupDetails]);

  const renderConnectorLine = useCallback((isAdvancing = false) => (
    <div className="flex items-center justify-center py-6">
      <div className={`h-1 w-20 sm:w-24 rounded-full ${
        isAdvancing
          ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 shadow-lg shadow-yellow-500/50'
          : 'bg-gradient-to-r from-gray-600 to-gray-500'
      } transition-all duration-500`}></div>
      {isAdvancing && (
        <div className="text-yellow-400 text-2xl ml-3 animate-bounce">
          ➤
        </div>
      )}
    </div>
  ), []);

  const renderQualificationRound = useCallback(() => {
    const qualificationGroups = normalizedGroups.slice(0, 4);
    const eliminatedCount = qualificationGroups.filter(g => g.status === 'eliminated').length;
    const completedCount = qualificationGroups.filter(g => g.status === 'completed').length;

    return (
      <div className="mb-12 animate-[fadeIn_0.5s_ease-out]">
        <div className="text-center mb-8">
          <h3 className="text-2xl sm:text-3xl font-bold text-purple-300 mb-4 flex items-center justify-center flex-wrap gap-2">
            <span>{ROUND_CONFIG[1].icon}</span>
            <span>{ROUND_CONFIG[1].title}</span>
            <span>⚡</span>
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-3">
            <Badge className="bg-blue-600 text-blue-100 px-4 py-2 text-sm font-semibold shadow-md">
              4 Tim Berkompetisi
            </Badge>
            <Badge className="bg-yellow-600 text-yellow-100 px-4 py-2 text-sm font-semibold shadow-md">
              3 Teratas Lolos
            </Badge>
            {eliminatedCount > 0 && (
              <Badge className="bg-red-600 text-red-100 px-4 py-2 text-sm font-semibold shadow-md animate-pulse">
                {eliminatedCount} Tersingkir
              </Badge>
            )}
          </div>
        </div>

        <div className={isCompactMode
          ? 'grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6'
          : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6'
        }>
          {qualificationGroups.map(group =>
            getGroupCard(
              group,
              group.status === 'champion' || Boolean(group.rank && group.rank <= 3),
              group.status === 'eliminated',
              isCompactMode ? 'small' : 'medium'
            )
          )}
        </div>

        <div className="mt-8 text-center">
          <div className="flex justify-center items-center gap-3 sm:gap-4">
            <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-500 ${
              completedCount >= 4 ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-gray-600'
            }`}></div>
            <div className="w-6 sm:w-8 h-1 bg-gray-600 rounded-full"></div>
            <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-500 ${
              normalizedTournament.current_round >= 2 ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-gray-600'
            }`}></div>
            <div className="w-6 sm:w-8 h-1 bg-gray-600 rounded-full"></div>
            <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-500 ${
              normalizedTournament.current_round >= 3 ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-gray-600'
            }`}></div>
          </div>
          <div className="flex justify-center items-center gap-6 sm:gap-8 mt-3 text-xs sm:text-sm text-gray-400 font-medium">
            <span>Kualifikasi</span>
            <span>Semi Final</span>
            <span>Final</span>
          </div>
        </div>

        {eliminatedCount > 0 && (
          <div className="text-center mt-6">
            <div className="inline-flex items-center gap-2 bg-red-900/30 px-6 py-3 rounded-xl border-2 border-red-500 shadow-lg shadow-red-500/20 animate-pulse">
              <span className="text-red-300 font-bold text-sm sm:text-base">💀 Tim terlambat tersingkir</span>
            </div>
          </div>
        )}

        {(normalizedTournament.current_round > 1 || normalizedTournament.status !== 'qualification') && (
          renderConnectorLine(true)
        )}
      </div>
    );
  }, [normalizedGroups, normalizedTournament, isCompactMode, getGroupCard, renderConnectorLine]);

  const renderSemifinals = useCallback(() => {
    const semifinalGroups = normalizedGroups.filter(g => g.status !== 'eliminated' && g.rank && g.rank <= 3);

    if (semifinalGroups.length === 0) return null;

    return (
      <div className="mb-12 animate-[fadeIn_0.5s_ease-out]">
        <div className="text-center mb-8">
          <h3 className="text-2xl sm:text-3xl font-bold text-blue-300 mb-4 flex items-center justify-center flex-wrap gap-2">
            <span>{ROUND_CONFIG[2].icon}</span>
            <span>{ROUND_CONFIG[2].title}</span>
            <span>🔥</span>
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-3">
            <Badge className="bg-blue-600 text-blue-100 px-4 py-2 text-sm font-semibold shadow-md">
              3 Tim Teratas
            </Badge>
            <Badge className="bg-purple-600 text-purple-100 px-4 py-2 text-sm font-semibold shadow-md">
              2 Teratas Lolos
            </Badge>
          </div>
        </div>

        <div className="flex justify-center">
          <div className={isCompactMode
            ? 'grid grid-cols-3 gap-4 sm:gap-6 max-w-5xl w-full'
            : 'grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-5xl w-full px-4'
          }>
            {semifinalGroups.map(group =>
              getGroupCard(
                group,
                group.rank === 1 || group.rank === 2,
                group.status === 'eliminated',
                isCompactMode ? 'small' : 'medium'
              )
            )}
          </div>
        </div>

        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-2 bg-blue-900/30 px-6 py-3 rounded-xl border-2 border-blue-500 shadow-lg shadow-blue-500/20">
            <span className="text-blue-300 font-bold text-sm sm:text-base">⚡ 2 Teratas lolos ke Final</span>
          </div>
        </div>

        {(normalizedTournament.current_round >= 3 || normalizedTournament.status === 'finals' || normalizedTournament.status === 'completed') && (
          renderConnectorLine(true)
        )}
      </div>
    );
  }, [normalizedGroups, normalizedTournament, isCompactMode, getGroupCard, renderConnectorLine]);

  const renderFinals = useCallback(() => {
    const finalists = normalizedGroups.filter(g => g.rank && g.rank <= 2);
    const champion = normalizedGroups.find(g => g.status === 'champion');

    if (finalists.length === 0 && !champion) return null;

    return (
      <div className="mb-12 animate-[fadeIn_0.5s_ease-out]">
        <div className="text-center mb-8">
          <h3 className="text-2xl sm:text-4xl font-bold text-yellow-300 mb-4 flex items-center justify-center flex-wrap gap-2 animate-pulse drop-shadow-lg">
            <span>{ROUND_CONFIG[3].icon}</span>
            <span>FINAL KEJUARAAN</span>
            <span>🏆</span>
          </h3>
        </div>

        {champion ? (
          <div className="text-center px-4">
            <Card className="border-4 border-yellow-500 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 shadow-2xl shadow-yellow-500/50 max-w-2xl mx-auto animate-pulse">
              <CardContent className="p-6 sm:p-8">
                <div className="text-6xl sm:text-8xl mb-4 animate-bounce">🏆</div>
                <h4 className="text-2xl sm:text-3xl font-bold text-yellow-300 mb-4 drop-shadow-lg">
                  JUARA TURNAMEN!
                </h4>
                <div className="bg-yellow-800/50 p-4 sm:p-6 rounded-xl shadow-inner">
                  <h5 className="text-xl sm:text-2xl font-bold text-yellow-100 mb-4">
                    {champion.name}
                  </h5>
                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    {champion.completion_time && (
                      <div className="bg-yellow-700/40 p-4 rounded-lg shadow-md">
                        <p className="text-yellow-100 text-sm font-bold mb-1">Waktu Kemenangan</p>
                        <p className="text-yellow-300 text-lg sm:text-xl font-bold">
                          {formatTime(champion.completion_time)}
                        </p>
                      </div>
                    )}
                    {champion.score !== undefined && (
                      <div className="bg-yellow-700/40 p-4 rounded-lg shadow-md">
                        <p className="text-yellow-100 text-sm font-bold mb-1">Skor Akhir</p>
                        <p className="text-yellow-300 text-lg sm:text-xl font-bold">
                          {champion.score.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  {champion.participants && (
                    <div className="mt-4">
                      <p className="text-yellow-200 text-sm mb-3 font-semibold">Tim Juara:</p>
                      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                        {champion.participants.map((p, index) => (
                          <Badge key={index} className="bg-yellow-600 text-yellow-100 text-sm font-semibold shadow-md px-3 py-1.5">
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
            <div className={isCompactMode
              ? 'grid grid-cols-2 gap-6 sm:gap-8 max-w-4xl w-full'
              : 'grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-4xl w-full'
            }>
              {finalists.map(group =>
                getGroupCard(group, group.rank === 1, false, 'large')
              )}
            </div>
          </div>
        )}
      </div>
    );
  }, [normalizedGroups, isCompactMode, getGroupCard, formatTime]);

  if (isLoading) {
    return (
      <Card className={`border-4 border-amber-600 bg-gradient-to-br from-amber-900/20 to-stone-900 shadow-2xl ${className}`}>
        <CardHeader>
          <CardTitle className="text-amber-300 text-center text-xl sm:text-2xl font-bold">
            🏆 Bracket Turnamen
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
      <Card className={`border-4 border-amber-600 bg-gradient-to-br from-amber-900/20 to-stone-900 shadow-2xl ${className}`}>
        <CardHeader>
          <CardTitle className="text-amber-300 text-center text-xl sm:text-2xl font-bold">
            🏆 Bracket Turnamen
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="text-5xl sm:text-6xl mb-4 animate-bounce">🏟️</div>
          <h3 className="text-lg sm:text-xl font-bold text-amber-200 mb-4">
            Belum Ada Data Turnamen
          </h3>
          <p className="text-sm sm:text-base text-amber-300">
            Bracket turnamen akan muncul di sini setelah tim terdaftar!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-4 border-amber-600 bg-gradient-to-br from-amber-900/20 to-stone-900 shadow-2xl ${className}`}>
      <CardHeader>
        <CardTitle className="text-amber-300 text-center text-xl sm:text-2xl font-bold flex items-center justify-center flex-wrap gap-2">
          <span>🏆</span>
          <span className="text-base sm:text-2xl">{normalizedTournament.name} - Bracket Turnamen</span>
          <span>⚔️</span>
        </CardTitle>
        <div className="text-center mt-4">
          <div className="flex flex-wrap justify-center items-center gap-3">
            <Badge className="bg-purple-700 text-purple-100 text-sm sm:text-base px-4 py-2 font-bold shadow-md">
              Babak {normalizedTournament.current_round}/3
            </Badge>
            <Badge className={`text-sm sm:text-base px-4 py-2 font-bold shadow-md ${
              normalizedTournament.status === 'qualification' ? 'bg-yellow-700 text-yellow-100' :
              normalizedTournament.status === 'semifinals' ? 'bg-blue-700 text-blue-100' :
              normalizedTournament.status === 'finals' ? 'bg-purple-700 text-purple-100' :
              normalizedTournament.status === 'completed' ? 'bg-green-700 text-green-100' :
              'bg-gray-700 text-gray-100'
            }`}>
              {normalizedTournament.status === 'qualification' ? 'KUALIFIKASI' :
               normalizedTournament.status === 'semifinals' ? 'SEMI FINAL' :
               normalizedTournament.status === 'finals' ? 'FINAL' :
               normalizedTournament.status === 'completed' ? 'SELESAI' :
               normalizedTournament.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {renderQualificationRound()}

        {(normalizedTournament.current_round >= 2 || normalizedTournament.status === 'semifinals' || normalizedTournament.status === 'finals' || normalizedTournament.status === 'completed') &&
          renderSemifinals()
        }

        {(normalizedTournament.current_round >= 3 || normalizedTournament.status === 'finals' || normalizedTournament.status === 'completed') &&
          renderFinals()
        }
      </CardContent>
    </Card>
  );
}

export const TournamentBracketSkeleton = () => (
  <div className="space-y-8">
    <div className="animate-pulse">
      <div className="h-5 sm:h-6 bg-gray-700 rounded w-1/3 mx-auto mb-6"></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="bg-gray-800/50 p-4 rounded-lg">
            <div className="w-8 h-8 bg-gray-700 rounded-full mx-auto mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const BracketRound = ({
  round,
  groups,
  title,
  icon,
  compactMode = false
}: {
  round: number;
  groups: TournamentGroup[];
  title: string;
  icon: string;
  compactMode?: boolean;
}) => {
  const isCompactMode = normalizeBoolean(compactMode);

  const getGridClass = useCallback((groupCount: number, compact: boolean): string => {
    const base = 'grid gap-4 sm:gap-6';

    if (!compact) {
      return `${base} grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`;
    }

    if (groupCount <= 1) return `${base} grid-cols-1`;
    if (groupCount === 2) return `${base} grid-cols-2`;
    if (groupCount === 3) return `${base} grid-cols-3`;
    return `${base} grid-cols-4`;
  }, []);

  return (
    <div className="mb-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="text-center mb-6">
        <h3 className={`font-bold text-purple-300 mb-4 flex items-center justify-center flex-wrap gap-2 ${
          isCompactMode ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
        }`}>
          <span>{icon}</span>
          <span>{title}</span>
          <span>⚡</span>
        </h3>
      </div>

      <div className={getGridClass(groups.length, isCompactMode)}>
        {groups.map(group => (
          <div key={group.id} className="bg-gray-900/30 border-2 border-gray-600 p-3 sm:p-4 rounded-xl hover:scale-105 transition-transform duration-300 shadow-lg">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl mb-2">🛡️</div>
              <h4 className="font-bold text-white text-sm sm:text-base">{group.name}</h4>
              <Badge className="bg-gray-700 text-gray-100 text-xs mt-2 font-semibold">
                {group.status === 'waiting' ? 'Menunggu' :
                 group.status === 'playing' ? 'Bermain' :
                 group.status === 'completed' ? 'Selesai' :
                 group.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
