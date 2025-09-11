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
  const [input, setInput] = useState(''); // For cipher input

  console.log('🔍 CodeAnalysisView rendered:', { puzzle, role });
  console.log('🔍 DefuserView:', puzzle?.defuserView);
  console.log('🔍 ExpertView:', puzzle?.expertView);

  // Determine puzzle subtype
  const isCipherPuzzle = !!(puzzle?.defuserView?.cipher || puzzle?.expertView?.cipher_type);
  const isBugPuzzle = !!(puzzle?.expertView?.bugs || puzzle?.defuserView?.codeLines);

  console.log('🔍 Puzzle Analysis:', { isCipherPuzzle, isBugPuzzle });

  // Safety checks
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

  // Handle line click for bug detection
  const handleLineClick = (lineNumber: number) => {
    if (role !== 'defuser' || !isBugPuzzle) return;

    setSelectedLine(lineNumber);
    const newFoundBugs = foundBugs.includes(lineNumber)
      ? foundBugs.filter(n => n !== lineNumber)
      : [...foundBugs, lineNumber];

    setFoundBugs(newFoundBugs);
  };

  // Handle submit for both puzzle types
  const handleSubmit = () => {
    if (isCipherPuzzle) {
      onSubmitAttempt(input.trim().toUpperCase());
      setInput('');
    } else if (isBugPuzzle) {
      const bugInput = foundBugs.sort().join(',');
      onSubmitAttempt(bugInput);
      setFoundBugs([]);
    }
  };

  // Render cipher puzzle interface
  const renderCipherPuzzle = () => (
    <div className="space-y-6">
      {/* DEBUG INFO */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-bold text-purple-800 mb-2">🐛 CodeAnalysisView Debug (Cipher Mode):</h3>
        <p className="text-sm text-purple-700">Role: <strong>{role}</strong></p>
        <p className="text-sm text-purple-700">Puzzle Title: <strong>{puzzle.title}</strong></p>
        <p className="text-sm text-purple-700">Cipher: <strong>{puzzle?.defuserView?.cipher}</strong></p>
        <p className="text-sm text-purple-700">Cipher Type: <strong>{puzzle?.expertView?.cipher_type}</strong></p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          {puzzle.title || 'Cipher Analysis Challenge'}
        </h3>
        <p className="text-gray-600 mb-6">
          {puzzle.description || 'Decrypt the cipher below'}
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

        {/* Cipher Display */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">Code to Debug:</h4>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <div className="flex items-center">
              <span className="text-gray-500 w-8 text-right mr-4 select-none">1</span>
              <code className="text-green-400 text-lg font-mono">
                {puzzle?.defuserView?.cipher || 'LOADING...'}
              </code>
            </div>
          </div>
        </div>

        {/* Expert Knowledge for Cipher */}
        {role === 'expert' && puzzle.expertView && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-300">
            <h4 className="font-semibold text-green-800 mb-3">📖 Expert Knowledge:</h4>

            <div className="space-y-4">
              {/* Cipher Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-bold text-blue-800 mb-3">🔍 Cipher Information</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-blue-600">Encryption Type:</p>
                    <p className="font-semibold text-blue-800">{puzzle.expertView.cipher_type || 'Unknown'}</p>
                  </div>
                  {puzzle.expertView.shift !== undefined && (
                    <div>
                      <p className="text-sm text-blue-600">Shift Value:</p>
                      <p className="font-semibold text-blue-800">{puzzle.expertView.shift}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Solution Method */}
              {puzzle.expertView.solution_method && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-bold text-green-800 mb-2">📝 Solution Method</h5>
                  <p className="text-green-700">{puzzle.expertView.solution_method}</p>
                </div>
              )}

              {/* Answer */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h5 className="font-bold text-yellow-800 mb-2">✅ Answer</h5>
                <p className="font-mono text-xl bg-white text-yellow-800 p-3 rounded border border-yellow-300">
                  {puzzle.expertView.answer || 'Not available'}
                </p>
              </div>

              {/* Decryption Steps */}
              {puzzle.expertView.decryption_steps && Array.isArray(puzzle.expertView.decryption_steps) && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h5 className="font-bold text-purple-800 mb-3">🔢 Decryption Steps</h5>
                  <ol className="list-decimal list-inside space-y-1 text-purple-700">
                    {puzzle.expertView.decryption_steps.map((step: string, index: number) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Expert Guidance */}
              {puzzle.expertView.hints_for_expert && Array.isArray(puzzle.expertView.hints_for_expert) && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h5 className="font-bold text-indigo-800 mb-3">💡 Guidance for Expert</h5>
                  <ul className="list-disc list-inside space-y-1 text-indigo-700">
                    {puzzle.expertView.hints_for_expert.map((hint: string, index: number) => (
                      <li key={index}>{hint}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Explanation */}
              {puzzle.expertView.explanation && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h5 className="font-bold text-gray-800 mb-2">📚 Explanation</h5>
                  <p className="text-gray-700">{puzzle.expertView.explanation}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Defuser Input for Cipher */}
        {role === 'defuser' && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
            <h4 className="font-bold text-red-800 mb-4">💣 Your Mission:</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-red-700 mb-2">
                  Enter the decrypted code:
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value.toUpperCase())}
                  placeholder="Enter your answer..."
                  className="w-full px-3 py-2 border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={submitting}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!input.trim() || submitting}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded transition-colors"
              >
                {submitting ? 'SUBMITTING...' : 'SUBMIT ANSWER'}
              </button>

              {!input.trim() && (
                <p className="text-sm text-gray-500 text-center italic">
                  Enter the decrypted text to submit
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render bug detection puzzle interface (original code)
  const renderBugPuzzle = () => (
    <div className="space-y-6">
      {/* Original bug detection interface... */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          {puzzle.title || 'Code Analysis Challenge'}
        </h3>

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
          </div>
        )}

        {/* Expert View for Bug Detection */}
        {role === 'expert' && puzzle.expertView?.bugs && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-300">
            <h4 className="font-semibold text-green-800 mb-3">📖 Expert Knowledge:</h4>
            <div className="space-y-3">
              {puzzle.expertView.bugs.map((bug: any, index: number) => (
                <div key={index} className="bg-white p-3 rounded border-l-4 border-red-400">
                  <p className="font-medium"><strong>Line {bug.line}:</strong> {bug.description}</p>
                  <p className="text-green-700 italic text-sm mt-1">💡 Hint: {bug.hint}</p>
                  <p className="text-gray-600 text-xs mt-1">Type: {bug.type}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Defuser Controls for Bug Detection */}
        {role === 'defuser' && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
            <h4 className="font-bold text-red-800 mb-4">💣 Your Mission:</h4>
            <button
              onClick={handleSubmit}
              disabled={foundBugs.length === 0 || submitting}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded transition-colors"
            >
              {submitting ? 'SUBMITTING...' : `SUBMIT BUG REPORT (${foundBugs.length} bugs)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Main render - choose interface based on puzzle type
  if (isCipherPuzzle) {
    return renderCipherPuzzle();
  } else if (isBugPuzzle) {
    return renderBugPuzzle();
  } else {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-600">Unknown puzzle format. Debug info:</p>
        <pre className="text-xs mt-2 text-left">{JSON.stringify(puzzle, null, 2)}</pre>
      </div>
    );
  }
}
