import React, { useState, useEffect } from 'react';
import { GameState } from '@/types/game';
import { gameApi } from '@/services/gameApi';
import CodeAnalysisView from './CodeAnalysisView';
import PatternAnalysisView from './PatternAnalysisView';
import NavigationChallengeView from './NavigationChallengeView';

interface Props {
  gameState: GameState;
  role?: 'defuser' | 'expert' | 'host';
  onGameStateUpdate: (newState: GameState) => void;
  onSubmitAttempt?: (input: string) => Promise<void>; // Added for MultiStageGame support
  submitting?: boolean; // Added for external submitting control
}

export default function GamePlay({
  gameState,
  role,
  onGameStateUpdate,
  onSubmitAttempt,
  submitting: externalSubmitting
}: Props) {
  const [input, setInput] = useState('');
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentHint, setCurrentHint] = useState<string>('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Use external submitting state if provided, otherwise use internal
  const submitting = externalSubmitting !== undefined ? externalSubmitting : internalSubmitting;

  // Fixed: Changed feedback_type to match API
  const [feedbackData, setFeedbackData] = useState({
    feedback_type: 'learning_reflection' as 'peer_review' | 'learning_reflection' | 'collaboration_rating',
    content: '',
    rating: 5
  });

  useEffect(() => {
    if (gameState.session.ends_at) {
      const endTime = new Date(gameState.session.ends_at).getTime();
      const updateTimer = () => {
        const now = new Date().getTime();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeLeft(remaining);

        if (remaining === 0) {
          // Time's up, refresh game state
          setTimeout(() => {
            gameApi.getGameState(gameState.session.id).then(onGameStateUpdate);
          }, 1000);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState.session.ends_at, gameState.session.id, onGameStateUpdate]);

  const handleSubmitAttempt = async (inputValue: string) => {
    // Use external submit handler if provided (for MultiStageGame)
    if (onSubmitAttempt) {
      try {
        await onSubmitAttempt(inputValue);
        setInput(''); // Clear input after successful submission
      } catch (error) {
        console.error('Error in external submit handler:', error);
      }
      return;
    }

    // Fallback to internal logic for backward compatibility
    if (internalSubmitting) return;

    setInternalSubmitting(true);

    try {
      const result = await gameApi.submitAttempt(
        gameState.session.id,
        gameState.puzzle.key,
        inputValue
      );

      const newGameState = {
        ...gameState,
        session: result.session
      };
      onGameStateUpdate(newGameState);

      setInput('');

      // Show feedback form after success
      if (result.session.status === 'success') {
        setShowFeedbackForm(true);
      }

    } catch (error: any) {
      console.error('Error submitting attempt:', error);
      alert(error.response?.data?.message || 'Failed to submit attempt');
    } finally {
      setInternalSubmitting(false);
    }
  };

  const handleGetHint = async (hintType: 'general' | 'specific' | 'debugging' = 'general') => {
    if (hintsUsed >= 3) {
      alert('You have used all available hints!');
      return;
    }

    try {
      const response = await gameApi.getHint(gameState.session.id, hintType);
      setCurrentHint(response.hint);
      setHintsUsed(response.hint_count);
    } catch (error: any) {
      console.error('Error getting hint:', error);
      alert('Failed to get hint');
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      await gameApi.submitFeedback(gameState.session.id, {
        ...feedbackData,
        feedback_from: role || 'host'
      });

      setShowFeedbackForm(false);
      setFeedbackData({ feedback_type: 'learning_reflection', content: '', rating: 5 });
      alert('Feedback submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (seconds: number) => {
    if (seconds <= 30) return 'text-red-600 animate-pulse';
    if (seconds <= 60) return 'text-orange-600';
    return 'text-green-600';
  };

  const renderSymbolMappingView = () => {
    const isDefuser = role === 'defuser';

    return (
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bomb Interface (Defuser View) */}
        {(isDefuser || role === 'host') && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
            <h3 className="text-xl font-bold text-red-800 mb-4 text-center">
              💣 BOMB INTERFACE
            </h3>

            <div className="bg-black rounded-lg p-6 text-center">
              <div className="text-red-400 text-sm mb-4 font-mono">DEFUSING MODULE</div>

              {/* Display the symbols */}
              <div className="flex justify-center space-x-4 mb-6">
                {gameState.puzzle.symbols?.map((symbol: string, index: number) => (
                  <div
                    key={index}
                    className="w-16 h-16 bg-red-900 border-2 border-red-500 rounded flex items-center justify-center text-2xl text-red-200 font-mono"
                  >
                    {symbol}
                  </div>
                ))}
              </div>

              {/* Input for defuser */}
              {isDefuser && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAttempt(input); }} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value.toUpperCase().slice(0, 3))}
                      placeholder="ABC"
                      className="w-32 h-12 text-center text-2xl font-mono bg-gray-800 text-green-400 border-2 border-green-600 rounded focus:outline-none focus:border-green-400"
                      maxLength={3}
                      disabled={submitting}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={input.length !== 3 || submitting}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded transition-colors"
                  >
                    {submitting ? 'SUBMITTING...' : 'DEFUSE'}
                  </button>
                </form>
              )}
            </div>

            {/* Instructions for Defuser */}
            {isDefuser && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <h5 className="font-medium text-blue-800 mb-2">Instructions:</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Describe the symbols you see to the Expert</li>
                  <li>• Enter the 3-letter code the Expert gives you</li>
                  <li>• Double-check before submitting!</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Manual Interface (Expert View) */}
        {((role === 'expert') || role === 'host') && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
            <h3 className="text-xl font-bold text-blue-800 mb-4 text-center">
              📖 EXPERT MANUAL
            </h3>

            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-bold text-gray-800 mb-3">Symbol Mapping:</h4>

              {gameState.puzzle.mapping && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(gameState.puzzle.mapping).map(([symbol, letter]) => (
                    <div key={symbol} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-mono text-lg">{symbol}</span>
                      <span className="font-bold text-blue-600">&rarr; {String(letter)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instructions for Expert */}
            {role === 'expert' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <h5 className="font-medium text-yellow-800 mb-2">Your Role:</h5>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Listen to the Defuser's symbol descriptions</li>
                  <li>• Use the mapping table to convert symbols to letters</li>
                  <li>• Tell the Defuser the correct 3-letter sequence</li>
                  <li>• Work quickly but carefully!</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPuzzleView = () => {
    const puzzleType = gameState.puzzle.type || 'symbol_mapping';

    // DEBUG LOGGING - CRITICAL FOR TROUBLESHOOTING
    console.log('🔍 GamePlay renderPuzzleView called');
    console.log('🔍 Puzzle type:', puzzleType);
    console.log('🔍 Full puzzle:', gameState.puzzle);
    console.log('🔍 Role:', role);

    switch (puzzleType) {
      case 'code_analysis':
        console.log('🔍 Rendering CodeAnalysisView');
        return (
          <CodeAnalysisView
            puzzle={gameState.puzzle}
            role={role}
            onSubmitAttempt={handleSubmitAttempt}
            submitting={submitting}
          />
        );

      case 'pattern_analysis':
        console.log('🔍 Rendering PatternAnalysisView');
        return (
          <PatternAnalysisView
            puzzle={gameState.puzzle}
            role={role}
            onSubmitAttempt={handleSubmitAttempt}
            submitting={submitting}
          />
        );

      case 'navigation_challenge':
        console.log('🔍 Rendering NavigationChallengeView');
        return (
          <NavigationChallengeView
            puzzle={gameState.puzzle}
            role={role}
            onSubmitAttempt={handleSubmitAttempt}
            submitting={submitting}
          />
        );

      default:
        console.log('🔍 Rendering default symbol mapping view');
        return renderSymbolMappingView();
    }
  };

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';
  const attempts = gameState.session.attempts || [];
  const recentAttempts = attempts.slice(-5).reverse();
  const puzzleType = gameState.puzzle.type || 'symbol_mapping';

  // DEBUG LOGGING FOR MAIN RENDER
  console.log('🔍 GamePlay main render:', {
    puzzleType,
    role,
    sessionStatus: gameState.session.status,
    hasExternalSubmit: !!onSubmitAttempt
  });

  return (
    <div className="space-y-6">
      {/* DEBUG INFO - Show external/internal mode */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-bold text-yellow-800 mb-2">🐛 GamePlay Debug Info:</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-yellow-700">
          <div>
            <p><strong>Puzzle Type:</strong> {puzzleType}</p>
            <p><strong>Role:</strong> {role}</p>
            <p><strong>Session Status:</strong> {gameState.session.status}</p>
          </div>
          <div>
            <p><strong>Has Puzzle:</strong> {!!gameState.puzzle ? 'YES' : 'NO'}</p>
            <p><strong>Submit Mode:</strong> {onSubmitAttempt ? 'EXTERNAL (MultiStage)' : 'INTERNAL'}</p>
            <p><strong>Submitting:</strong> {submitting ? 'YES' : 'NO'}</p>
          </div>
        </div>
      </div>

      {/* Timer & Game Info */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gray-900 text-white rounded-lg p-6 text-center">
          <div className="text-sm text-gray-300 mb-2">TIME REMAINING</div>
          <div className={`text-4xl font-mono font-bold ${getTimeColor(timeLeft)}`}>
            {formatTime(timeLeft)}
          </div>
          {timeLeft <= 30 && (
            <div className="text-red-400 text-sm mt-2 animate-bounce">
              ⚠️ DANGER ZONE ⚠️
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-sm text-gray-600 mb-2">ATTEMPTS</div>
          <div className="text-4xl font-bold text-blue-600">{attempts.length}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-sm text-gray-600 mb-2">HINTS USED</div>
          <div className="text-4xl font-bold text-purple-600">{hintsUsed}/3</div>
        </div>
      </div>

      {/* Current Hint Display */}
      {currentHint && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">💡</div>
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">Hint #{hintsUsed}</h4>
              <p className="text-yellow-700">{currentHint}</p>
            </div>
          </div>
        </div>
      )}

      {/* MAIN PUZZLE INTERFACE */}
      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
        <h3 className="font-bold text-green-800 mb-2">🎯 PUZZLE INTERFACE:</h3>
        <p className="text-sm text-green-700 mb-4">
          About to render puzzle type: <strong>{puzzleType}</strong>
        </p>

        {/* RENDER THE PUZZLE VIEW */}
        {renderPuzzleView()}
      </div>

      {/* Hint System - Hide in external mode to avoid conflicts */}
      {!onSubmitAttempt && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-gray-800">Need Help?</h4>
            <div className="text-sm text-gray-500">Hints remaining: {3 - hintsUsed}</div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <button
              onClick={() => handleGetHint('general')}
              disabled={hintsUsed >= 3}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 px-4 rounded text-sm transition-colors"
            >
              General Hint
            </button>

            {puzzleType !== 'symbol_mapping' && (
              <>
                <button
                  onClick={() => handleGetHint('specific')}
                  disabled={hintsUsed >= 3}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 px-4 rounded text-sm transition-colors"
                >
                  Specific Hint
                </button>

                <button
                  onClick={() => handleGetHint('debugging')}
                  disabled={hintsUsed >= 3}
                  className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white py-2 px-4 rounded text-sm transition-colors"
                >
                  Debug Hint
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Attempt History */}
      {attempts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            Recent Attempts ({attempts.length} total)
          </h4>

          <div className="space-y-2">
            {recentAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className={`flex items-center justify-between p-3 rounded-md border ${
                  attempt.is_correct
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <span className="font-mono text-lg font-bold">
                    {attempt.input}
                  </span>
                  <span className="text-sm">
                    {new Date(attempt.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center">
                  {attempt.is_correct ? (
                    <span className="text-green-600">✅ Correct</span>
                  ) : (
                    <span className="text-red-600">❌ Wrong</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Communication & Collaboration Tips */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-purple-800 mb-3">
          💬 Communication Tips
        </h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-purple-700">
          <div>
            <h5 className="font-medium mb-2">{isDefuser ? 'As Defuser:' : 'As Expert:'}</h5>
            <ul className="space-y-1 text-xs">
              {isDefuser ? (
                <>
                  <li>• Describe what you see clearly and precisely</li>
                  <li>• Ask questions if you're unsure</li>
                  <li>• Confirm instructions before acting</li>
                  <li>• Stay calm under pressure</li>
                </>
              ) : (
                <>
                  <li>• Listen carefully to descriptions</li>
                  <li>• Give clear, step-by-step instructions</li>
                  <li>• Double-check your guidance</li>
                  <li>• Be patient and supportive</li>
                </>
              )}
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">Collaboration Keys:</h5>
            <ul className="space-y-1 text-xs">
              <li>• Use specific, unambiguous language</li>
              <li>• Repeat important information</li>
              <li>• Ask for confirmation when needed</li>
              <li>• Work as a team, not individuals</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Peer Learning Section */}
      {puzzleType !== 'symbol_mapping' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-indigo-800 mb-3">
            🎓 Learning Objectives
          </h4>
          {gameState.puzzle.learningObjectives && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-indigo-700 mb-2">What you're learning:</h5>
                <ul className="text-sm text-indigo-600 space-y-1">
                  {gameState.puzzle.learningObjectives.map((objective: string, index: number) => (
                    <li key={index}>• {objective}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-indigo-700 mb-2">Peer Learning Tips:</h5>
                <ul className="text-sm text-indigo-600 space-y-1">
                  <li>• Explain your reasoning to your partner</li>
                  <li>• Ask "why" and "how" questions</li>
                  <li>• Share different approaches to solving</li>
                  <li>• Learn from each other's perspectives</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback Button - Hide in external mode */}
      {!onSubmitAttempt && (
        <div className="text-center">
          <button
            onClick={() => setShowFeedbackForm(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            💬 Provide Feedback
          </button>
        </div>
      )}

      {/* Feedback Form Modal */}
      {showFeedbackForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Share Your Experience</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback Type
                </label>
                <select
                  value={feedbackData.feedback_type}
                  onChange={(e) => setFeedbackData({...feedbackData, feedback_type: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="learning_reflection">Learning Reflection</option>
                  <option value="peer_review">Peer Review</option>
                  <option value="collaboration_rating">Collaboration Rating</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Feedback
                </label>
                <textarea
                  value={feedbackData.content}
                  onChange={(e) => setFeedbackData({...feedbackData, content: e.target.value})}
                  placeholder="Share what you learned, how you collaborated, or suggestions for improvement..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {feedbackData.feedback_type === 'collaboration_rating' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Collaboration Rating (1-5)
                  </label>
                  <select
                    value={feedbackData.rating}
                    onChange={(e) => setFeedbackData({...feedbackData, rating: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1,2,3,4,5].map(rating => (
                      <option key={rating} value={rating}>
                        {rating} - {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating-1]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSubmitFeedback}
                disabled={!feedbackData.content.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 px-4 rounded transition-colors"
              >
                Submit Feedback
              </button>
              <button
                onClick={() => setShowFeedbackForm(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
