import React from 'react';
import { Link } from '@inertiajs/react';
import { GameState } from '@/types/game';

interface Props {
  gameState: GameState;
}

export default function GameResult({ gameState }: Props) {
  const { session } = gameState;
  const isSuccess = session.status === 'success';
  const attempts = session.attempts || [];
  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter(a => a.is_correct).length;

  const participants = session.participants || [];
  const defuser = participants.find(p => p.role === 'defuser');
  const expert = participants.find(p => p.role === 'expert');

  return (
    <div className="space-y-6">
      {/* Result Header */}
      <div className={`text-center p-8 rounded-lg border-2 ${
        isSuccess
          ? 'bg-green-50 border-green-300'
          : 'bg-red-50 border-red-300'
      }`}>
        <div className="text-6xl mb-4">
          {isSuccess ? '🎉' : '💥'}
        </div>
        <h2 className={`text-3xl font-bold mb-2 ${
          isSuccess ? 'text-green-800' : 'text-red-800'
        }`}>
          {isSuccess ? 'BOMB DEFUSED!' : 'BOMB EXPLODED!'}
        </h2>
        <p className={`text-lg ${
          isSuccess ? 'text-green-600' : 'text-red-600'
        }`}>
          {isSuccess
            ? 'Congratulations! You saved the day!'
            : 'Better luck next time! The bomb went off.'}
        </p>
      </div>

      {/* Game Statistics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalAttempts}</div>
          <div className="text-sm text-gray-600">Total Attempts</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{correctAttempts}</div>
          <div className="text-sm text-gray-600">Correct Attempts</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0}%
          </div>
          <div className="text-sm text-gray-600">Success Rate</div>
        </div>
      </div>

      {/* Team Performance */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Team Performance</h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Team Members</h4>
            <div className="space-y-2">
              {defuser && (
                <div className="flex items-center p-3 bg-blue-50 rounded-md">
                  <span className="text-2xl mr-3">💣</span>
                  <div>
                    <div className="font-medium">{defuser.nickname}</div>
                    <div className="text-sm text-gray-600">Defuser</div>
                  </div>
                </div>
              )}
              {expert && (
                <div className="flex items-center p-3 bg-green-50 rounded-md">
                  <span className="text-2xl mr-3">📖</span>
                  <div>
                    <div className="font-medium">{expert.nickname}</div>
                    <div className="text-sm text-gray-600">Expert</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-3">Mission Details</h4>
            {session.stage && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Stage:</span>
                  <span className="font-medium">{session.stage.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time Limit:</span>
                  <span className="font-medium">{session.stage.config.timeLimit || 180}s</span>
                </div>
                {session.stage.mission && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mission:</span>
                    <span className="font-medium">{session.stage.mission.title}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/game"
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-colors text-center"
        >
          🎮 Play Again
        </Link>

        <Link
          href="/dashboard"
          className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors text-center"
        >
          🏠 Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
