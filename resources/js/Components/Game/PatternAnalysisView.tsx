import React, { useState } from 'react';

interface Props {
  puzzle: any;
  role?: 'defuser' | 'expert' | 'host';
  onSubmitAttempt: (input: string) => void;
  submitting: boolean;
}

export default function PatternAnalysisView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const [answer, setAnswer] = useState('');

  console.log('🔍 PatternAnalysisView props:', { puzzle, role });
  console.log('🔍 DefuserView pattern:', puzzle?.defuserView?.pattern);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    onSubmitAttempt(answer.trim());
    setAnswer(''); // Reset after submit
  };

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';

  // Safety check
  if (!puzzle) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">No puzzle data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DEBUG INFO - TEMPORARY */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h3 className="font-bold text-orange-800 mb-2">🐛 PatternAnalysisView Debug:</h3>
        <p className="text-sm text-orange-700">Role: <strong>{role}</strong></p>
        <p className="text-sm text-orange-700">Puzzle Title: <strong>{puzzle.title}</strong></p>
        <p className="text-sm text-orange-700">Has defuserView: <strong>{!!puzzle.defuserView ? 'YES' : 'NO'}</strong></p>
        <p className="text-sm text-orange-700">Has pattern: <strong>{!!puzzle.defuserView?.pattern ? 'YES' : 'NO'}</strong></p>
        <p className="text-sm text-orange-700">Pattern Length: <strong>{puzzle.defuserView?.pattern?.length || 0}</strong></p>
        <p className="text-sm text-orange-700">Pattern Data: <strong>{JSON.stringify(puzzle.defuserView?.pattern)}</strong></p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          {puzzle.title}
        </h3>
        <p className="text-gray-600 mb-6">{puzzle.description}</p>

        {/* Learning Objectives */}
        {puzzle.learningObjectives && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Learning Objectives:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {puzzle.learningObjectives.map((objective: string, index: number) => (
                <li key={index}>• {objective}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Defuser View - Pattern Display */}
          {(isDefuser || role === 'host') && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
              <h4 className="text-lg font-bold text-yellow-800 mb-4 text-center">
                🔢 PATTERN SEQUENCE
              </h4>

              <div className="bg-white rounded-lg p-6 text-center mb-4">
                <div className="text-sm text-gray-600 mb-3">Complete this sequence:</div>

                {/* NUMBER SEQUENCE - FIX THE MAIN ISSUE */}
                {puzzle.defuserView?.pattern ? (
                  <div className="flex justify-center items-center space-x-3 mb-6">
                    {puzzle.defuserView.pattern.map((item: any, index: number) => (
                      <div
                        key={index}
                        className={`w-16 h-16 border-2 rounded-lg flex items-center justify-center text-xl font-bold ${
                          item === '?' || item === null || item === undefined
                            ? 'border-red-500 bg-red-100 text-red-600'
                            : 'border-blue-500 bg-blue-50 text-blue-800'
                        }`}
                      >
                        {item === null || item === undefined ? '?' : item}
                      </div>
                    ))}
                    {/* Add question mark for missing number */}
                    <div className="w-16 h-16 border-2 border-red-500 bg-red-100 text-red-600 rounded-lg flex items-center justify-center text-xl font-bold">
                      ?
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded mb-4">
                    <p className="text-red-600 font-medium">⚠️ Pattern data not found</p>
                    <p className="text-red-500 text-sm mt-1">
                      The number sequence is missing from puzzle data.
                    </p>
                  </div>
                )}

                {/* Input for defuser */}
                {isDefuser && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <input
                        type="number"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Enter the missing number"
                        className="w-48 h-12 text-center text-xl font-bold bg-white border-2 border-blue-600 rounded focus:outline-none focus:border-blue-400"
                        disabled={submitting}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!answer.trim() || submitting}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded transition-colors"
                    >
                      {submitting ? 'SUBMITTING...' : 'SUBMIT ANSWER'}
                    </button>
                  </form>
                )}
              </div>

              {/* Hints for Defuser */}
              {isDefuser && puzzle.defuserView?.hints && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <h5 className="font-medium text-blue-800 mb-2">Hints:</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {puzzle.defuserView.hints.map((hint: string, index: number) => (
                      <li key={index}>• {hint}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Expert View - Pattern Rules */}
          {(isExpert || role === 'host') && puzzle.expertView && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
              <h4 className="text-lg font-bold text-green-800 mb-4 text-center">
                📚 PATTERN RULES
              </h4>

              <div className="bg-white rounded-lg p-4 border space-y-4">
                {puzzle.expertView.rule && (
                  <div>
                    <h5 className="font-semibold text-gray-800 mb-2">Pattern Rule:</h5>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded italic">
                      "{puzzle.expertView.rule}"
                    </p>
                  </div>
                )}

                {puzzle.expertView.answer !== undefined && (
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-semibold text-gray-800">Correct Answer:</h5>
                      <span className="text-2xl font-bold text-green-600">
                        {puzzle.expertView.answer}
                      </span>
                    </div>
                    {puzzle.expertView.category && (
                      <p className="text-sm text-gray-600">
                        Category: <span className="font-medium">{puzzle.expertView.category}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Expert Instructions */}
              {isExpert && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <h5 className="font-medium text-yellow-800 mb-2">Your Role:</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Guide the Defuser to understand the pattern</li>
                    <li>• Explain the mathematical relationship</li>
                    <li>• Don't give the answer directly - teach the logic</li>
                    <li>• Help them see the pattern step by step</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pattern Analysis Tips */}
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h5 className="font-medium text-purple-800 mb-2">Pattern Analysis Tips:</h5>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-purple-700">
            <div>
              <h6 className="font-medium mb-1">For Defuser:</h6>
              <ul className="space-y-1 text-xs">
                <li>• Look at differences between consecutive numbers</li>
                <li>• Try multiplication, division, addition patterns</li>
                <li>• Consider exponential or recursive relationships</li>
                <li>• Ask Expert for guidance on approach</li>
              </ul>
            </div>
            <div>
              <h6 className="font-medium mb-1">For Expert:</h6>
              <ul className="space-y-1 text-xs">
                <li>• Guide through the mathematical logic</li>
                <li>• Use leading questions to help discovery</li>
                <li>• Explain the underlying mathematical concept</li>
                <li>• Connect to real-world programming applications</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
