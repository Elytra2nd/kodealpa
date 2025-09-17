import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';

// ✅ Import from centralized types with normalization utilities
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

export default function TournamentBracket({
  tournament,
  groups,
  loading = false,
  className = '',
  showGroupDetails = true,
  compactMode = false
}: TournamentBracketProps) {

  // ✅ ULTIMATE FIX for TS2345 - Use normalization utilities
  const isCompactMode = normalizeBoolean(compactMode);
  const shouldShowGroupDetails = normalizeBoolean(showGroupDetails);
  const isLoading = normalizeBoolean(loading);

  // ✅ Normalize data to prevent null/undefined issues
  const normalizedTournament = normalizeTournamentData(tournament);
  const normalizedGroups = groups.map(normalizeTournamentGroup);

  // Tournament bracket animations
  const bracketStyles = `
    @keyframes championGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3); }
      50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.5); }
    }
    @keyframes eliminationPulse {
      0%, 100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.5); }
      50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.8); }
    }
    @keyframes battleReady {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    @keyframes connectorLine {
      from { width: 0; }
      to { width: 100%; }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes advancementArrow {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(10px); }
    }
    .champion-glow { animation: championGlow 3s ease-in-out infinite; }
    .elimination-pulse { animation: eliminationPulse 2s ease-in-out infinite; }
    .battle-ready { animation: battleReady 2s ease-in-out infinite; }
    .connector-line { animation: connectorLine 1s ease-out; }
    .fade-in { animation: fadeIn 0.5s ease-out; }
    .advancement-arrow { animation: advancementArrow 2s ease-in-out infinite; }
  `;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      waiting: { color: 'bg-yellow-600', text: 'Waiting', icon: '⏳' },
      ready: { color: 'bg-blue-600', text: 'Ready', icon: '✅' },
      playing: { color: 'bg-green-600', text: 'Playing', icon: '⚔️' },
      completed: { color: 'bg-purple-600', text: 'Completed', icon: '🏁' },
      eliminated: { color: 'bg-red-600', text: 'Eliminated', icon: '💀' },
      champion: { color: 'bg-yellow-500', text: 'Champion', icon: '👑' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.waiting;

    return (
      <Badge className={`${config.color} text-white flex items-center space-x-1 text-xs`}>
        <span>{config.icon}</span>
        <span>{config.text}</span>
      </Badge>
    );
  };

  const getRoundIcon = (round: number) => {
    switch (round) {
      case 1: return '🎯';
      case 2: return '🥊';
      case 3: return '👑';
      default: return '🛡️';
    }
  };

  const formatTime = (seconds?: number | null) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getGroupCard = (group: TournamentGroup, isWinner = false, isEliminated = false, size: 'small' | 'medium' | 'large' = 'medium') => {
    const sizeClasses = {
      small: 'p-2',
      medium: 'p-3',
      large: 'p-4'
    };

    const textSizes = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg'
    };

    return (
      <div
        key={group.id}
        className={`${sizeClasses[size]} rounded-lg border-2 transition-all duration-300 ${
          isWinner
            ? 'border-yellow-500 bg-yellow-900/30 champion-glow'
            : isEliminated
              ? 'border-red-600 bg-red-900/30 elimination-pulse'
              : group.status === 'playing'
                ? 'border-green-600 bg-green-900/30 battle-ready'
                : group.status === 'completed'
                  ? 'border-purple-600 bg-purple-900/30'
                  : 'border-gray-600 bg-gray-900/30'
        }`}
      >
        <div className="text-center">
          <div className={isCompactMode ? 'text-lg mb-2' : 'text-2xl mb-2'}>
            {isWinner ? '👑' :
             isEliminated ? '💀' :
             group.status === 'playing' ? '⚔️' :
             group.status === 'completed' ? '🏁' : '🛡️'}
          </div>

          <h4 className={`font-bold ${textSizes[size]} mb-2 ${
            isWinner ? 'text-yellow-300' :
            isEliminated ? 'text-red-300' :
            group.status === 'champion' ? 'text-yellow-300' : 'text-white'
          }`}>
            {group.name}
          </h4>

          <div className="space-y-1">
            {getStatusBadge(group.status)}

            {group.completion_time && !isCompactMode && (
              <div className="text-xs text-gray-400">
                Time: {formatTime(group.completion_time)}
              </div>
            )}

            {group.rank && (
              <Badge className={`text-xs ${
                group.rank === 1 ? 'bg-yellow-600' :
                group.rank === 2 ? 'bg-gray-500' :
                group.rank === 3 ? 'bg-amber-600' :
                'bg-stone-600'
              } text-white`}>
                #{group.rank}
              </Badge>
            )}

            {group.score !== undefined && !isCompactMode && (
              <div className="text-xs text-gray-300">
                Score: <span className="font-bold text-white">{group.score}</span>
              </div>
            )}
          </div>

          {shouldShowGroupDetails && group.participants && !isCompactMode && (
            <div className="mt-2 text-xs space-y-1">
              {group.participants.slice(0, 2).map((p, index) => (
                <div key={index} className="flex items-center justify-between text-gray-400">
                  <span className="truncate">{p.nickname}</span>
                  <span className={`text-xs ${p.role === 'defuser' ? 'text-red-400' : 'text-blue-400'}`}>
                    {p.role === 'defuser' ? '💣' : '📖'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderConnectorLine = (fromRound: number, toRound: number, isAdvancing = false) => (
    <div className="flex items-center justify-center py-4">
      <div className={`connector-line bg-gradient-to-r ${
        isAdvancing ? 'from-yellow-500 to-amber-500' : 'from-gray-600 to-gray-500'
      } h-1 w-16 rounded-full`}></div>
      {isAdvancing && (
        <div className="advancement-arrow text-yellow-400 text-2xl ml-2">
          ➤
        </div>
      )}
    </div>
  );

  const renderQualificationRound = () => {
    const qualificationGroups = normalizedGroups.slice(0, 4);
    const eliminatedCount = qualificationGroups.filter(g => g.status === 'eliminated').length;
    const completedCount = qualificationGroups.filter(g => g.status === 'completed').length;

    return (
      <div className="mb-12 fade-in">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-purple-300 mb-4 flex items-center justify-center">
            <span className="mr-2">{getRoundIcon(1)}</span>
            Qualification Round
            <span className="ml-2">⚡</span>
          </h3>
          <div className="flex justify-center items-center space-x-4">
            <Badge className="bg-blue-700 text-blue-100 px-4 py-2">
              4 Groups Competing
            </Badge>
            <Badge className="bg-yellow-700 text-yellow-100 px-4 py-2">
              Top 3 Advance
            </Badge>
            {eliminatedCount > 0 && (
              <Badge className="bg-red-700 text-red-100 px-4 py-2">
                {eliminatedCount} Eliminated
              </Badge>
            )}
          </div>
        </div>

        <div className={isCompactMode ? 'grid grid-cols-2 lg:grid-cols-4 gap-6' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'}>
          {qualificationGroups.map(group =>
            getGroupCard(
              group,
              group.status === 'champion' || Boolean(group.rank && group.rank <= 3),
              group.status === 'eliminated',
              isCompactMode ? 'small' : 'medium'
            )
          )}
        </div>

        {/* Progress indicator */}
        <div className="mt-8 text-center">
          <div className="flex justify-center items-center space-x-4">
            <div className={`w-4 h-4 rounded-full ${completedCount >= 4 ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <div className="w-8 h-1 bg-gray-500"></div>
            <div className={`w-4 h-4 rounded-full ${normalizedTournament.current_round >= 2 ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <div className="w-8 h-1 bg-gray-500"></div>
            <div className={`w-4 h-4 rounded-full ${normalizedTournament.current_round >= 3 ? 'bg-green-500' : 'bg-gray-500'}`}></div>
          </div>
          <div className="flex justify-center items-center space-x-8 mt-2 text-xs text-gray-400">
            <span>Qualification</span>
            <span>Semifinals</span>
            <span>Finals</span>
          </div>
        </div>

        {/* Elimination indicator */}
        {eliminatedCount > 0 && (
          <div className="text-center mt-6">
            <div className="inline-flex items-center space-x-2 bg-red-900/30 px-6 py-3 rounded-xl border-2 border-red-600 elimination-pulse">
              <span className="text-red-300 font-bold">💀 Slowest team eliminated</span>
            </div>
          </div>
        )}

        {/* Advancement arrow */}
        {(normalizedTournament.current_round > 1 || normalizedTournament.status !== 'qualification') && (
          renderConnectorLine(1, 2, true)
        )}
      </div>
    );
  };

  const renderSemifinals = () => {
    const semifinalGroups = normalizedGroups.filter(g => g.status !== 'eliminated' && g.rank && g.rank <= 3);

    if (semifinalGroups.length === 0) return null;

    return (
      <div className="mb-12 fade-in">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-blue-300 mb-4 flex items-center justify-center">
            <span className="mr-2">{getRoundIcon(2)}</span>
            Semifinals
            <span className="ml-2">🔥</span>
          </h3>
          <div className="flex justify-center items-center space-x-4">
            <Badge className="bg-blue-700 text-blue-100 px-4 py-2">
              Top 3 Groups
            </Badge>
            <Badge className="bg-purple-700 text-purple-100 px-4 py-2">
              Top 2 Advance
            </Badge>
          </div>
        </div>

        <div className="flex justify-center">
          <div className={isCompactMode ? 'grid grid-cols-3 gap-6 max-w-4xl' : 'grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-4xl'}>
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

        {/* Advancement indicator */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center space-x-2 bg-blue-900/30 px-6 py-3 rounded-xl border-2 border-blue-600">
            <span className="text-blue-300 font-bold">⚡ Top 2 advance to Finals</span>
          </div>
        </div>

        {/* Advancement arrow */}
        {(normalizedTournament.current_round >= 3 || normalizedTournament.status === 'finals' || normalizedTournament.status === 'completed') && (
          renderConnectorLine(2, 3, true)
        )}
      </div>
    );
  };

  const renderFinals = () => {
    const finalists = normalizedGroups.filter(g => g.rank && g.rank <= 2);
    const champion = normalizedGroups.find(g => g.status === 'champion');

    if (finalists.length === 0 && !champion) return null;

    return (
      <div className="mb-12 fade-in">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-bold text-yellow-300 mb-4 champion-glow flex items-center justify-center">
            <span className="mr-2">{getRoundIcon(3)}</span>
            CHAMPIONSHIP FINALS
            <span className="ml-2">🏆</span>
          </h3>
        </div>

        {champion ? (
          <div className="text-center">
            <Card className="border-4 border-yellow-600 bg-gradient-to-br from-yellow-900/50 to-amber-900/50 champion-glow max-w-2xl mx-auto">
              <CardContent className="p-8">
                <div className="text-8xl mb-4">🏆</div>
                <h4 className="text-3xl font-bold text-yellow-300 mb-4">
                  TOURNAMENT CHAMPION!
                </h4>
                <div className="bg-yellow-800/50 p-6 rounded-lg">
                  <h5 className="text-2xl font-bold text-yellow-100 mb-2">
                    {champion.name}
                  </h5>
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    {champion.completion_time && (
                      <div className="bg-yellow-700/30 p-3 rounded">
                        <p className="text-yellow-100 text-sm font-bold">Victory Time</p>
                        <p className="text-yellow-300 text-lg font-bold">
                          {formatTime(champion.completion_time)}
                        </p>
                      </div>
                    )}
                    {champion.score !== undefined && (
                      <div className="bg-yellow-700/30 p-3 rounded">
                        <p className="text-yellow-100 text-sm font-bold">Final Score</p>
                        <p className="text-yellow-300 text-lg font-bold">
                          {champion.score.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  {champion.participants && (
                    <div className="mt-4">
                      <p className="text-yellow-200 text-sm mb-2">Champion Team:</p>
                      <div className="flex justify-center space-x-4">
                        {champion.participants.map((p, index) => (
                          <Badge key={index} className="bg-yellow-600 text-yellow-100">
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
          <div className="flex justify-center">
            <div className={isCompactMode ? 'grid grid-cols-2 gap-8 max-w-3xl' : 'grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-3xl'}>
              {finalists.map(group =>
                getGroupCard(group, group.rank === 1, false, 'large')
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={`border-4 border-amber-600 bg-gradient-to-br from-amber-900/20 to-stone-900 ${className}`}>
        <CardHeader>
          <CardTitle className="text-amber-300 text-center text-2xl">
            🏆 Tournament Bracket
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <TournamentBracketSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (normalizedGroups.length === 0) {
    return (
      <Card className={`border-4 border-amber-600 bg-gradient-to-br from-amber-900/20 to-stone-900 ${className}`}>
        <CardHeader>
          <CardTitle className="text-amber-300 text-center text-2xl">
            🏆 Tournament Bracket
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <div className="text-6xl mb-4">🏟️</div>
          <h3 className="text-xl font-bold text-amber-200 mb-4">
            No Tournament Data
          </h3>
          <p className="text-amber-300">
            Tournament bracket will appear here once teams are registered!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <style>{bracketStyles}</style>

      <Card className={`border-4 border-amber-600 bg-gradient-to-br from-amber-900/20 to-stone-900 ${className}`}>
        <CardHeader>
          <CardTitle className="text-amber-300 text-center text-2xl flex items-center justify-center">
            <span className="mr-2">🏆</span>
            {normalizedTournament.name} - Tournament Bracket
            <span className="ml-2">⚔️</span>
          </CardTitle>
          <div className="text-center">
            <div className="flex justify-center items-center space-x-4">
              <Badge className="bg-purple-700 text-purple-100 text-lg px-4 py-2">
                Round {normalizedTournament.current_round}/3
              </Badge>
              <Badge className={`text-lg px-4 py-2 ${
                normalizedTournament.status === 'qualification' ? 'bg-yellow-700 text-yellow-100' :
                normalizedTournament.status === 'semifinals' ? 'bg-blue-700 text-blue-100' :
                normalizedTournament.status === 'finals' ? 'bg-purple-700 text-purple-100' :
                normalizedTournament.status === 'completed' ? 'bg-green-700 text-green-100' :
                'bg-gray-700 text-gray-100'
              }`}>
                {normalizedTournament.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Qualification Round */}
          {renderQualificationRound()}

          {/* Semifinals */}
          {(normalizedTournament.current_round >= 2 || normalizedTournament.status === 'semifinals' || normalizedTournament.status === 'finals' || normalizedTournament.status === 'completed') &&
            renderSemifinals()
          }

          {/* Finals */}
          {(normalizedTournament.current_round >= 3 || normalizedTournament.status === 'finals' || normalizedTournament.status === 'completed') &&
            renderFinals()
          }
        </CardContent>
      </Card>
    </>
  );
}

// Export skeleton component for loading states
export const TournamentBracketSkeleton = () => (
  <div className="space-y-8">
    <div className="animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-1/3 mx-auto mb-6"></div>
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

// ✅ COMPLETELY FIXED - BracketRound component with ultimate TS2345 fix
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
  // ✅ ULTIMATE FIX for TS2345 error using normalization utility
  const isCompactMode = normalizeBoolean(compactMode);

  // ✅ Helper function to generate safe grid className - no template literals with numbers
  const getGridColumnsClass = (groupCount: number, compact: boolean): string => {
    const baseClasses = 'grid gap-6';

    if (!compact) {
      return `${baseClasses} grid-cols-1 md:grid-cols-2 lg:grid-cols-4`;
    }

    // ✅ Explicit string returns - completely eliminates TS2345 possibility
    switch (groupCount) {
      case 1: return `${baseClasses} grid-cols-1`;
      case 2: return `${baseClasses} grid-cols-2`;
      case 3: return `${baseClasses} grid-cols-3`;
      default: return `${baseClasses} grid-cols-4`;
    }
  };

  return (
    <div className="mb-8 fade-in">
      <div className="text-center mb-6">
        <h3 className={isCompactMode ? 'text-xl font-bold text-purple-300 mb-4 flex items-center justify-center' : 'text-2xl font-bold text-purple-300 mb-4 flex items-center justify-center'}>
          <span className="mr-2">{icon}</span>
          {title}
          <span className="ml-2">⚡</span>
        </h3>
      </div>

      {/* ✅ FIXED LINE 268 - Use helper function with explicit string returns */}
      <div className={getGridColumnsClass(groups.length, isCompactMode)}>
        {groups.map(group => (
          <div key={group.id} className="bg-gray-900/30 border-2 border-gray-600 p-3 rounded-lg">
            <div className="text-center">
              <div className="text-2xl mb-2">🛡️</div>
              <h4 className="font-bold text-white">{group.name}</h4>
              <Badge className="bg-gray-700 text-gray-100 text-xs mt-2">
                {group.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
