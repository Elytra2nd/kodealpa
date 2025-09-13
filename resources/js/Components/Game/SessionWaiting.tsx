import React from 'react';
import { GameState } from '@/types/game';

interface Props {
  gameState: GameState;
  role?: 'defuser' | 'expert' | 'host';
  onStartSession: () => void;
}

export default function SessionWaiting({ gameState, role, onStartSession }: Props) {
  const { session } = gameState;
  const participants = session.participants || [];
  const defuser = participants.find(p => p.role === 'defuser');
  const expert = participants.find(p => p.role === 'expert');
  const canStart = defuser && expert;
  const isHost = role === 'host';

  return (
    <div className="space-y-6">
      {/* Team Code Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          Share this Team Code
        </h3>
        <div className="text-4xl font-mono font-bold text-blue-600 tracking-widest mb-2">
          {session.team_code}
        </div>
        <p className="text-blue-700 text-sm">
          Other players can use this code to join your session
        </p>
      </div>

      {/* Session Info */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Participants */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            Players ({participants.length}/2)
          </h4>

          <div className="space-y-3">
            <div className={`p-3 rounded-md border ${defuser ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">💣</span>
                  <span className="font-medium">Defuser</span>
                </div>
                {defuser ? (
                  <span className="text-green-600 font-medium">{defuser.nickname}</span>
                ) : (
                  <span className="text-gray-500 text-sm">Waiting...</span>
                )}
              </div>
            </div>

            <div className={`p-3 rounded-md border ${expert ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📖</span>
                  <span className="font-medium">Expert</span>
                </div>
                {expert ? (
                  <span className="text-green-600 font-medium">{expert.nickname}</span>
                ) : (
                  <span className="text-gray-500 text-sm">Waiting...</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Game Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Game Information</h4>

          {session.stage && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Stage:</span>
                <span className="font-medium">{session.stage.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time Limit:</span>
                <span className="font-medium">{session.stage.config?.timeLimit || 180}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Challenges:</span>
                <span className="font-medium">
                  {/* FIXED: Use safe property access instead of puzzles */}
                  {(session.stage.config as any)?.puzzles?.length ||
                   (session.stage as any)?.puzzles?.length ||
                   'Multiple'}
                </span>
              </div>
              {session.stage.mission && (
                <div className="pt-2 border-t">
                  <span className="text-gray-600">Mission:</span>
                  <p className="text-gray-800 font-medium mt-1">
                    {session.stage.mission.title}
                  </p>
                  <p className="text-gray-600 text-xs mt-1">
                    {session.stage.mission.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-yellow-800 mb-3">
          🎯 Before Starting
        </h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-yellow-700">
          <div>
            <h5 className="font-medium mb-2">For the Defuser:</h5>
            <ul className="space-y-1 text-xs">
              <li>• You'll see the bomb interface</li>
              <li>• Describe what you see clearly</li>
              <li>• Follow the Expert's instructions exactly</li>
              <li>• Don't guess - ask if unsure</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">For the Expert:</h5>
            <ul className="space-y-1 text-xs">
              <li>• You'll see the manual and mapping</li>
              <li>• Listen carefully to the Defuser</li>
              <li>• Give clear, step-by-step instructions</li>
              <li>• Double-check before confirming</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="text-center">
        {!canStart ? (
          <div className="text-gray-600">
            <div className="text-lg mb-2">⏳ Waiting for players...</div>
            <p className="text-sm">Both Defuser and Expert roles must be filled to start</p>
          </div>
        ) : isHost ? (
          <button
            onClick={onStartSession}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
          >
            🚀 Start Game
          </button>
        ) : (
          <div className="text-gray-600">
            <div className="text-lg mb-2">✅ Ready to start!</div>
            <p className="text-sm">Waiting for the host to start the game...</p>
          </div>
        )}
      </div>
    </div>
  );
}
