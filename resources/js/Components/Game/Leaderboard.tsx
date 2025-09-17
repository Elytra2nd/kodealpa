import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';

interface LeaderboardTeam {
  id: number;
  name: string;
  rank?: number;
  score: number;
  status: 'waiting' | 'ready' | 'playing' | 'completed' | 'eliminated' | 'champion';
  completion_time?: number;
  participants: Array<{
    id?: number;
    nickname: string;
    role: 'defuser' | 'expert';
    user?: {
      name: string;
      email?: string;
    };
  }>;
}

interface LeaderboardProps {
  teams: LeaderboardTeam[];
  currentUserTeamId?: number;
  title?: string;
  loading?: boolean;
  showParticipants?: boolean;
  showCompletionTime?: boolean;
  className?: string;
  maxTeams?: number;
  emptyMessage?: string;
}

export default function Leaderboard({
  teams,
  currentUserTeamId,
  title = "Tournament Rankings",
  loading = false,
  showParticipants = true,
  showCompletionTime = true,
  className = '',
  maxTeams,
  emptyMessage = "No rankings available yet"
}: LeaderboardProps) {

  // Leaderboard animations
  const leaderboardStyles = `
    @keyframes championGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3); }
      50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.5); }
    }
    @keyframes podiumRise {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes scoreCount {
      from { transform: scale(0.8); }
      to { transform: scale(1); }
    }
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
      50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
    }
    .champion-glow { animation: championGlow 3s ease-in-out infinite; }
    .podium-rise { animation: podiumRise 0.5s ease-out; }
    .score-count { animation: scoreCount 0.3s ease-out; }
    .pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
  `;

  const getRankIcon = (rank?: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      case 4: return '🏅';
      case 5: return '🎖️';
      default: return '🛡️';
    }
  };

  const getRankColor = (rank?: number, isCurrentUser = false) => {
    if (isCurrentUser) {
      return 'from-green-600 to-green-800 border-green-500';
    }

    switch (rank) {
      case 1: return 'from-yellow-600 to-yellow-800 border-yellow-500';
      case 2: return 'from-gray-500 to-gray-700 border-gray-400';
      case 3: return 'from-amber-600 to-amber-800 border-amber-500';
      default: return 'from-stone-600 to-stone-800 border-stone-500';
    }
  };

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

  const formatTime = (seconds?: number) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Sort teams by rank, then by score, then by completion time
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.rank && b.rank) return a.rank - b.rank;
    if (a.rank && !b.rank) return -1;
    if (!a.rank && b.rank) return 1;
    if (a.score !== b.score) return b.score - a.score;
    if (a.completion_time && b.completion_time) return a.completion_time - b.completion_time;
    return 0;
  });

  const displayTeams = maxTeams ? sortedTeams.slice(0, maxTeams) : sortedTeams;

  if (loading) {
    return (
      <Card className={`border-3 border-amber-600 bg-amber-900/20 ${className}`}>
        <CardHeader>
          <CardTitle className="text-amber-300 text-center">
            🏆 {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <LeaderboardSkeleton count={5} />
        </CardContent>
      </Card>
    );
  }

  if (displayTeams.length === 0) {
    return (
      <Card className={`border-3 border-amber-600 bg-amber-900/20 ${className}`}>
        <CardHeader>
          <CardTitle className="text-amber-300 text-center">
            🏆 {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <div className="text-6xl mb-4">🏟️</div>
          <h3 className="text-xl font-bold text-amber-200 mb-4">
            No Rankings Yet
          </h3>
          <p className="text-amber-300">
            {emptyMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <style>{leaderboardStyles}</style>

      <Card className={`border-3 border-amber-600 bg-amber-900/20 ${className}`}>
        <CardHeader>
          <CardTitle className="text-amber-300 text-center flex items-center justify-center">
            <span className="mr-2">🏆</span>
            {title}
            <span className="ml-2">⚡</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {displayTeams.map((team, index) => {
            const isCurrentUser = team.id === currentUserTeamId;
            const isTopThree = team.rank && team.rank <= 3;
            const isChampion = team.status === 'champion';
            const isEliminated = team.status === 'eliminated';

            return (
              <div
                key={team.id}
                className={`podium-rise transition-all duration-300 ${
                  isCurrentUser
                    ? 'border-4 border-green-500 bg-green-900/30 pulse-glow scale-105'
                    : isEliminated
                      ? 'border-3 border-red-600 bg-red-900/20'
                      : isChampion
                        ? `border-3 bg-gradient-to-r ${getRankColor(1)} champion-glow`
                        : isTopThree
                          ? `border-3 bg-gradient-to-r ${getRankColor(team.rank)}`
                          : 'border-2 border-gray-600 bg-gray-900/20'
                } p-4 rounded-lg`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Rank Icon */}
                    <div className="text-3xl">
                      {getRankIcon(team.rank)}
                    </div>

                    {/* Team Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className={`font-bold text-lg ${
                          isCurrentUser ? 'text-green-300' :
                          isEliminated ? 'text-red-300' :
                          isChampion ? 'text-yellow-300' :
                          'text-white'
                        }`}>
                          {team.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-sm text-green-400">(Your Team)</span>
                          )}
                        </h4>

                        {team.rank && (
                          <Badge className={`${
                            team.rank === 1 ? 'bg-yellow-600' :
                            team.rank === 2 ? 'bg-gray-500' :
                            team.rank === 3 ? 'bg-amber-600' :
                            'bg-stone-600'
                          } text-white font-bold`}>
                            #{team.rank}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusBadge(team.status)}

                        {showCompletionTime && team.completion_time && (
                          <Badge className="bg-gray-700 text-gray-200 text-xs">
                            ⏱️ {formatTime(team.completion_time)}
                          </Badge>
                        )}
                      </div>

                      {/* Participants */}
                      {showParticipants && team.participants.length > 0 && (
                        <div className="flex items-center space-x-4 text-sm">
                          {team.participants.map((participant, pIndex) => (
                            <div key={pIndex} className="flex items-center space-x-2">
                              <span className={`text-lg ${
                                participant.role === 'defuser' ? 'text-red-400' : 'text-blue-400'
                              }`}>
                                {participant.role === 'defuser' ? '💣' : '📖'}
                              </span>
                              <span className="text-gray-300 truncate max-w-24">
                                {participant.nickname}
                              </span>
                              <Badge className={`text-xs ${
                                participant.role === 'defuser'
                                  ? 'bg-red-600 text-red-100'
                                  : 'bg-blue-600 text-blue-100'
                              }`}>
                                {participant.role}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className={`text-2xl font-bold score-count ${
                      isCurrentUser ? 'text-green-300' :
                      isEliminated ? 'text-red-300' :
                      isChampion ? 'text-yellow-300' :
                      'text-white'
                    }`}>
                      {team.score.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      Score
                    </div>
                  </div>
                </div>

                {/* Champion Banner */}
                {isChampion && (
                  <div className="mt-3 text-center">
                    <div className="inline-flex items-center space-x-2 bg-yellow-800/50 px-4 py-2 rounded-lg border border-yellow-600">
                      <span className="text-yellow-300 font-bold text-sm">👑 TOURNAMENT CHAMPION 👑</span>
                    </div>
                  </div>
                )}

                {/* Elimination Banner */}
                {isEliminated && (
                  <div className="mt-3 text-center">
                    <div className="inline-flex items-center space-x-2 bg-red-800/50 px-4 py-2 rounded-lg border border-red-600">
                      <span className="text-red-300 font-bold text-sm">💀 ELIMINATED</span>
                    </div>
                  </div>
                )}

                {/* Current User Highlight */}
                {isCurrentUser && !isChampion && (
                  <div className="mt-3 text-center">
                    <div className="inline-flex items-center space-x-2 bg-green-800/50 px-4 py-2 rounded-lg border border-green-600">
                      <span className="text-green-300 font-bold text-sm">⭐ YOUR TEAM ⭐</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Show more indicator */}
          {maxTeams && teams.length > maxTeams && (
            <div className="text-center pt-4 border-t border-gray-600">
              <p className="text-gray-400 text-sm">
                And {teams.length - maxTeams} more team{teams.length - maxTeams > 1 ? 's' : ''}...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// Export skeleton component for loading states
export const LeaderboardSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="animate-pulse">
        <div className="flex items-center space-x-4 p-4 bg-gray-800/30 rounded-lg">
          <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/4"></div>
          </div>
          <div className="w-16 h-6 bg-gray-700 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

// Export individual leaderboard item for custom layouts
export const LeaderboardItem = ({
  team,
  currentUserTeamId,
  showParticipants = true,
  showCompletionTime = true,
  index = 0
}: {
  team: LeaderboardTeam;
  currentUserTeamId?: number;
  showParticipants?: boolean;
  showCompletionTime?: boolean;
  index?: number;
}) => {
  const isCurrentUser = team.id === currentUserTeamId;
  const isTopThree = team.rank && team.rank <= 3;
  const isChampion = team.status === 'champion';
  const isEliminated = team.status === 'eliminated';

  const getRankIcon = (rank?: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🎖️';
    }
  };

  const getRankColor = (rank?: number, isCurrentUser = false) => {
    if (isCurrentUser) return 'from-green-600 to-green-800 border-green-500';
    switch (rank) {
      case 1: return 'from-yellow-600 to-yellow-800 border-yellow-500';
      case 2: return 'from-gray-500 to-gray-700 border-gray-400';
      case 3: return 'from-amber-600 to-amber-800 border-amber-500';
      default: return 'from-stone-600 to-stone-800 border-stone-500';
    }
  };

  return (
    <div
      className={`transition-all duration-300 ${
        isCurrentUser
          ? 'border-4 border-green-500 bg-green-900/30 scale-105'
          : isEliminated
            ? 'border-3 border-red-600 bg-red-900/20'
            : isChampion
              ? `border-3 bg-gradient-to-r ${getRankColor(1)} champion-glow`
              : isTopThree
                ? `border-3 bg-gradient-to-r ${getRankColor(team.rank)}`
                : 'border-2 border-gray-600 bg-gray-900/20'
      } p-4 rounded-lg`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4 flex-1">
          <div className="text-3xl">{getRankIcon(team.rank)}</div>

          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h4 className={`font-bold text-lg ${
                isCurrentUser ? 'text-green-300' :
                isEliminated ? 'text-red-300' :
                isChampion ? 'text-yellow-300' :
                'text-white'
              }`}>
                {team.name}
                {isCurrentUser && (
                  <span className="ml-2 text-sm text-green-400">(Your Team)</span>
                )}
              </h4>

              {team.rank && (
                <Badge className={`${
                  team.rank === 1 ? 'bg-yellow-600' :
                  team.rank === 2 ? 'bg-gray-500' :
                  team.rank === 3 ? 'bg-amber-600' :
                  'bg-stone-600'
                } text-white font-bold`}>
                  #{team.rank}
                </Badge>
              )}
            </div>

            {showParticipants && team.participants.length > 0 && (
              <div className="flex items-center space-x-4 text-sm">
                {team.participants.map((participant, pIndex) => (
                  <div key={pIndex} className="flex items-center space-x-2">
                    <span className={`text-lg ${
                      participant.role === 'defuser' ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {participant.role === 'defuser' ? '💣' : '📖'}
                    </span>
                    <span className="text-gray-300 truncate max-w-24">
                      {participant.nickname}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className={`text-2xl font-bold ${
            isCurrentUser ? 'text-green-300' :
            isEliminated ? 'text-red-300' :
            isChampion ? 'text-yellow-300' :
            'text-white'
          }`}>
            {team.score.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">Score</div>
        </div>
      </div>
    </div>
  );
};
