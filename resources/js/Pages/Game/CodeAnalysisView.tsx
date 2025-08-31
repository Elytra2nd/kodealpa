// resources/js/Pages/Game/CodeAnalysisView.tsx
import React, { useState } from 'react';

interface Props {
  puzzle: any;
  role?: 'defuser' | 'expert' | 'host';
  onSubmitAttempt: (input: string) => void;
  submitting: boolean;
}

export default function CodeAnalysisView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const [input, setInput] = useState('');

  console.log('🔍 CodeAnalysisView props:', { puzzle, role });
  console.log('🔍 DefuserView exists:', !!puzzle?.defuserView);
  console.log('🔍 ExpertView exists:', !!puzzle?.expertView);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmitAttempt(input.trim());
      setInput('');
    }
  };

  if (!puzzle) {
    return <div className="p-4 text-center">No puzzle data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* DEBUG INFO - TEMPORARY */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h3 className="font-bold text-orange-800 mb-2">🐛 CodeAnalysisView Debug:</h3>
        <p className="text-sm text-orange-700">Role: <strong>{role}</strong></p>
        <p className="text-sm text-orange-700">Puzzle Title: <strong>{puzzle.title}</strong></p>
        <p className="text-sm text-orange-700">Has defuserView: <strong>{!!puzzle.defuserView ? 'YES' : 'NO'}</strong></p>
        <p className="text-sm text-orange-700">Has expertView: <strong>{!!puzzle.expertView ? 'YES' : 'NO'}</strong></p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* DEFUSER VIEW */}
        {(role === 'defuser' || role === 'host') && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
            <h3 className="text-xl font-bold text-red-800 mb-4 text-center">
              💣 DEFUSER - Code Analysis
            </h3>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Your Task:</h4>
              <p className="text-gray-700 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                {puzzle.description || 'Find the bug in the code and enter the line number'}
              </p>
            </div>

            {/* Code Display */}
            {puzzle.defuserView?.codeLines && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Code to Analyze:</h4>
                <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto">
                  {puzzle.defuserView.codeLines.map((line: string, index: number) => (
                    <div key={index} className="flex">
                      <span className="text-gray-500 mr-3 w-6 text-right">
                        {index + 1}
                      </span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Case Info */}
            {puzzle.defuserView?.testCase && (
              <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                <h4 className="font-semibold mb-2">Test Case:</h4>
                <p><strong>Input:</strong> {JSON.stringify(puzzle.defuserView.testCase.input)}</p>
                <p><strong>Expected:</strong> {JSON.stringify(puzzle.defuserView.testCase.expected)}</p>
              </div>
            )}

            {/* Input Form for Defuser */}
            {role === 'defuser' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter the line number with the bug:
                  </label>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-xl font-bold"
                    disabled={submitting}
                    maxLength={2}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || submitting}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  {submitting ? 'SUBMITTING...' : 'SUBMIT ANSWER'}
                </button>
              </form>
            )}

            {/* Instructions for Defuser */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <h5 className="font-medium text-blue-800 mb-2">Instructions:</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Read the code carefully</li>
                <li>• Look for logical errors or mistakes</li>
                <li>• Ask the Expert for help if needed</li>
                <li>• Enter only the line number (e.g., 4)</li>
              </ul>
            </div>
          </div>
        )}

        {/* EXPERT VIEW */}
        {(role === 'expert' || role === 'host') && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
            <h3 className="text-xl font-bold text-blue-800 mb-4 text-center">
              📖 EXPERT - Solution Manual
            </h3>

            <div className="space-y-4">
              {/* Bug Information */}
              {puzzle.expertView?.bugs && (
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-bold text-red-600 mb-3">🐛 Bug Information:</h4>
                  <div className="space-y-3">
                    {puzzle.expertView.bugs.map((bug: any, index: number) => (
                      <div key={index} className="p-3 bg-red-50 rounded border-l-4 border-red-400">
                        <p className="font-semibold">Line {bug.line}: {bug.description}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Type:</strong> {bug.type}
                        </p>
                        <p className="text-sm text-blue-600 mt-1">
                          <strong>Hint:</strong> {bug.hint}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Solution Information */}
              {puzzle.expertView?.solutions && (
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-bold text-green-600 mb-3">✅ Correct Solutions:</h4>
                  <div className="space-y-2">
                    {puzzle.expertView.solutions.map((solution: any, index: number) => (
                      <div key={index} className="p-3 bg-green-50 rounded border-l-4 border-green-400">
                        <p><strong>Line {solution.line}:</strong></p>
                        <p className="font-mono text-sm bg-gray-100 p-2 rounded mt-1">
                          {solution.correct}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Instructions for Expert */}
            {role === 'expert' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <h5 className="font-medium text-yellow-800 mb-2">Your Role:</h5>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Help guide the Defuser to find the bug</li>
                  <li>• Give hints without directly stating the answer</li>
                  <li>• Explain the logic and reasoning</li>
                  <li>• Be patient and supportive</li>
                </ul>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
