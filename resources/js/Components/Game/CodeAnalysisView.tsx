import React, { useState } from 'react';

interface Props {
  puzzle: any;
  role?: 'defuser' | 'expert' | 'host';
  onSubmitAttempt: (input: string) => void;
  submitting: boolean;
}

export default function CodeAnalysisView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const [foundBugs, setFoundBugs] = useState<number[]>([]);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  console.log('🔍 CodeAnalysisView rendered:', { puzzle, role });
  console.log('🔍 DefuserView exists:', !!puzzle?.defuserView);
  console.log('🔍 ExpertView exists:', !!puzzle?.expertView);

  const handleLineClick = (lineNumber: number) => {
    if (role !== 'defuser') return;

    setSelectedLine(lineNumber);
    const newFoundBugs = foundBugs.includes(lineNumber)
      ? foundBugs.filter(n => n !== lineNumber)
      : [...foundBugs, lineNumber];

    setFoundBugs(newFoundBugs);
  };

  const handleSubmit = () => {
    const input = foundBugs.sort().join(',');
    onSubmitAttempt(input);
    setFoundBugs([]); // Reset after submit
  };

  // Add safety checks
  if (!puzzle) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">No puzzle data available</p>
      </div>
    );
  }

  if (!puzzle.defuserView && !puzzle.expertView) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-600">Puzzle data is loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DEBUG INFO - TEMPORARY */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-bold text-purple-800 mb-2">🐛 CodeAnalysisView Debug:</h3>
        <p className="text-sm text-purple-700">Role: <strong>{role}</strong></p>
        <p className="text-sm text-purple-700">Puzzle Title: <strong>{puzzle.title}</strong></p>
        <p className="text-sm text-purple-700">DefuserView: <strong>{!!puzzle.defuserView ? 'EXISTS' : 'MISSING'}</strong></p>
        <p className="text-sm text-purple-700">ExpertView: <strong>{!!puzzle.expertView ? 'EXISTS' : 'MISSING'}</strong></p>
        <p className="text-sm text-purple-700">CodeLines Length: <strong>{puzzle.defuserView?.codeLines?.length || 0}</strong></p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          {puzzle.title || 'Code Analysis Challenge'}
        </h3>
        <p className="text-gray-600 mb-6">
          {puzzle.description || 'Find the bugs in the code below'}
        </p>

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

        {/* Code Display */}
        {puzzle.defuserView?.codeLines && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">Code to Debug:</h4>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm">
                {puzzle.defuserView.codeLines.map((line: string, index: number) => (
                  <div
                    key={index}
                    className={`flex items-center hover:bg-gray-800 px-2 py-1 rounded cursor-pointer transition-colors ${
                      foundBugs.includes(index + 1) ? 'bg-red-800' : ''
                    } ${selectedLine === index + 1 ? 'ring-2 ring-yellow-400' : ''}`}
                    onClick={() => handleLineClick(index + 1)}
                  >
                    <span className="text-gray-500 w-8 text-right mr-4 select-none">
                      {index + 1}
                    </span>
                    <code className="text-green-400">{line}</code>
                  </div>
                ))}
              </pre>
            </div>

            {role === 'defuser' && (
              <p className="text-sm text-gray-600 mt-2">
                💡 Click on line numbers to mark bugs
              </p>
            )}
          </div>
        )}

        {/* Test Case */}
        {puzzle.defuserView?.testCase && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Test Case:</h4>
            <div className="text-sm space-y-1">
              <p><strong>Input:</strong> {JSON.stringify(puzzle.defuserView.testCase.input)}</p>
              <p><strong>Expected Output:</strong> {JSON.stringify(puzzle.defuserView.testCase.expected)}</p>
            </div>
          </div>
        )}

        {/* Expert View */}
        {role === 'expert' && puzzle.expertView && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-300">
            <h4 className="font-semibold text-green-800 mb-3">📖 Expert Knowledge:</h4>
            <div className="space-y-3">
              {puzzle.expertView.bugs?.map((bug: any, index: number) => (
                <div key={index} className="bg-white p-3 rounded border-l-4 border-red-400">
                  <p className="font-medium"><strong>Line {bug.line}:</strong> {bug.description}</p>
                  <p className="text-green-700 italic text-sm mt-1">💡 Hint: {bug.hint}</p>
                  <p className="text-gray-600 text-xs mt-1">Type: {bug.type}</p>
                </div>
              ))}
            </div>

            {/* Solutions */}
            {puzzle.expertView.solutions && (
              <div className="mt-4">
                <h5 className="font-semibold text-green-800 mb-2">✅ Solutions:</h5>
                <div className="space-y-2">
                  {puzzle.expertView.solutions.map((solution: any, index: number) => (
                    <div key={index} className="bg-green-100 p-2 rounded text-sm">
                      <strong>Line {solution.line}:</strong> {solution.correct}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Defuser Controls */}
        {role === 'defuser' && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
            <h4 className="font-bold text-red-800 mb-4">💣 Your Mission:</h4>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-700 mb-2">
                  Click on line numbers to mark bugs. Found bugs: <strong>{foundBugs.length}</strong>
                </p>
                {foundBugs.length > 0 && (
                  <div className="p-2 bg-yellow-100 rounded border border-yellow-300">
                    <p className="text-sm text-yellow-800">
                      Lines marked as bugs: <strong>{foundBugs.sort().join(', ')}</strong>
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={foundBugs.length === 0 || submitting}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded transition-colors"
              >
                {submitting ? 'SUBMITTING...' : `SUBMIT BUG REPORT (${foundBugs.length} bugs)`}
              </button>

              {foundBugs.length === 0 && (
                <p className="text-sm text-gray-500 text-center italic">
                  Select at least one line to submit
                </p>
              )}
            </div>
          </div>
        )}

        {/* Observer View */}
        {role === 'host' && (
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
            <h4 className="font-bold text-gray-800 mb-4">👁️ Observer View:</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-semibold text-red-600">Bugs:</h5>
                <ul className="text-sm space-y-1">
                  {puzzle.expertView?.bugs?.map((bug: any, index: number) => (
                    <li key={index}>Line {bug.line}: {bug.description}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="font-semibold text-green-600">Player Progress:</h5>
                <p className="text-sm">Bugs found: {foundBugs.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="font-medium text-blue-800 mb-2">Instructions:</h5>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h6 className="font-medium text-blue-700">For Defuser:</h6>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>• Read through the code carefully</li>
                <li>• Look for logical errors</li>
                <li>• Click line numbers to mark bugs</li>
                <li>• Ask Expert for guidance if needed</li>
              </ul>
            </div>
            <div>
              <h6 className="font-medium text-blue-700">For Expert:</h6>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>• Guide the Defuser to find bugs</li>
                <li>• Give hints without direct answers</li>
                <li>• Explain programming concepts</li>
                <li>• Encourage collaborative thinking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
