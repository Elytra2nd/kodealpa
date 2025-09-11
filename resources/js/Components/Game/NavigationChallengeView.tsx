import React, { useState } from 'react';

interface Props {
  puzzle: any;
  role?: string;
  onSubmitAttempt: (input: string) => void;
  submitting: boolean;
}

export default function NavigationChallengeView({ puzzle, role, onSubmitAttempt, submitting }: Props) {
  const [path, setPath] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState('');

  // FIXED: Helper function to safely render answer
  const renderAnswer = (answer: any): string => {
    if (Array.isArray(answer)) {
      return answer.join(' → ');
    } else if (typeof answer === 'string') {
      return answer;
    } else if (answer !== undefined && answer !== null) {
      return String(answer);
    } else {
      return 'Answer not available';
    }
  };

  // FIXED: Helper function to safely render array data
  const renderArrayData = (data: any): string[] => {
    if (Array.isArray(data)) {
      return data;
    } else if (typeof data === 'string') {
      return [data];
    } else {
      return [];
    }
  };

  const addToPath = (step: string) => {
    setPath([...path, step]);
    setCurrentStep('');
  };

  const removeLastStep = () => {
    setPath(path.slice(0, -1));
  };

  const clearPath = () => {
    setPath([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (path.length === 0) return;
    onSubmitAttempt(path.join(','));
  };

  const isDefuser = role === 'defuser';
  const isExpert = role === 'expert';

  const renderTreeNode = (node: any, depth: number = 0): React.ReactNode => {
    if (!node) return null;

    const indentation = '  '.repeat(depth);

    return (
      <div key={`${depth}-${node.value}`} className="font-mono text-sm">
        <div className={`${depth === 0 ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
          {indentation}├─ {node.value}
        </div>
        {node.left && renderTreeNode(node.left, depth + 1)}
        {node.right && renderTreeNode(node.right, depth + 1)}
      </div>
    );
  };

  // FIXED: Safety checks for puzzle data
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
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-bold text-purple-800 mb-2">🐛 NavigationChallengeView Debug:</h3>
          <div className="text-sm text-purple-700 space-y-1">
            <p><strong>Role:</strong> {role}</p>
            <p><strong>Has Expert View:</strong> {!!puzzle?.expertView ? 'Yes' : 'No'}</p>
            <p><strong>Answer Type:</strong> {typeof puzzle?.expertView?.answer}</p>
            <p><strong>Answer Value:</strong> {JSON.stringify(puzzle?.expertView?.answer)}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          {puzzle.title || 'Navigation Challenge'}
        </h3>
        <p className="text-gray-600 mb-6">{puzzle.description || 'Navigate through the tree structure'}</p>

        {/* Learning Objectives */}
        {puzzle.learningObjectives && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Learning Objectives:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {renderArrayData(puzzle.learningObjectives).map((objective: string, index: number) => (
                <li key={index}>• {objective}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Defuser View - Navigation Task */}
          {(isDefuser || role === 'host') && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6">
              <h4 className="text-lg font-bold text-orange-800 mb-4 text-center">
                🗺️ NAVIGATION TASK
              </h4>

              <div className="bg-white rounded-lg p-4 border mb-4">
                <h5 className="font-semibold text-gray-800 mb-3">Your Mission:</h5>
                <p className="text-gray-700 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                  {puzzle.defuserView?.task || 'Navigate through the tree to find the target'}
                </p>
              </div>

              {/* Path Builder for Defuser */}
              {isDefuser && (
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Build Your Path:</h5>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {renderArrayData(puzzle.defuserView?.traversalOptions).map((option: string) => (
                        <button
                          key={option}
                          onClick={() => addToPath(option)}
                          disabled={submitting}
                          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Current Path Display */}
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Current Path:</h5>
                    <div className="bg-gray-50 p-3 rounded border min-h-[40px] flex items-center">
                      {path.length > 0 ? (
                        <span className="font-mono text-blue-600">
                          {path.join(' → ')}
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">No path selected</span>
                      )}
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={removeLastStep}
                        disabled={path.length === 0 || submitting}
                        className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Remove Last
                      </button>
                      <button
                        onClick={clearPath}
                        disabled={path.length === 0 || submitting}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Clear Path
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <button
                      type="submit"
                      disabled={path.length === 0 || submitting}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded transition-colors"
                    >
                      {submitting ? 'SUBMITTING...' : 'SUBMIT PATH'}
                    </button>
                  </form>
                </div>
              )}

              {/* Instructions for Defuser */}
              {isDefuser && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <h5 className="font-medium text-blue-800 mb-2">Instructions:</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Work with Expert to find the correct path</li>
                    <li>• Build your path step by step</li>
                    <li>• You can remove or clear steps if needed</li>
                    <li>• Think about tree navigation principles</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Expert View - Tree Structure & Answer */}
          {(isExpert || role === 'host') && puzzle.expertView && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
              <h4 className="text-lg font-bold text-green-800 mb-4 text-center">
                🌳 TREE STRUCTURE
              </h4>

              <div className="bg-white rounded-lg p-4 border space-y-4">
                {/* Tree Display */}
                {puzzle.expertView.tree && (
                  <div>
                    <h5 className="font-semibold text-gray-800 mb-3">Binary Tree:</h5>
                    <div className="bg-gray-50 p-3 rounded border overflow-x-auto">
                      {renderTreeNode(puzzle.expertView.tree.root)}
                    </div>
                  </div>
                )}

                {/* FIXED: Safe Answer Display */}
                {puzzle.expertView.answer && (
                  <div className="border-t pt-3">
                    <h5 className="font-semibold text-gray-800 mb-2">Correct Path:</h5>
                    <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                      <p className="font-mono text-green-700">
                        {renderAnswer(puzzle.expertView.answer)}
                      </p>
                    </div>
                    {puzzle.expertView.explanation && (
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Explanation:</strong> {puzzle.expertView.explanation}
                      </p>
                    )}
                  </div>
                )}

                {/* Traversal Methods */}
                {puzzle.expertView.traversalMethods && (
                  <div className="border-t pt-3">
                    <h5 className="font-semibold text-gray-800 mb-2">Tree Traversals:</h5>
                    <div className="space-y-2 text-sm">
                      {Object.entries(puzzle.expertView.traversalMethods).map(([method, values]: [string, any]) => (
                        <div key={method} className="flex justify-between">
                          <span className="font-medium capitalize text-gray-700">{method}:</span>
                          <span className="font-mono text-blue-600">
                            [{renderArrayData(values).join(', ')}]
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Expert Info */}
                {puzzle.expertView.hints && (
                  <div className="border-t pt-3">
                    <h5 className="font-semibold text-gray-800 mb-2">Hints for Expert:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {renderArrayData(puzzle.expertView.hints).map((hint: string, index: number) => (
                        <li key={index}>• {hint}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Expert Instructions */}
              {isExpert && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <h5 className="font-medium text-yellow-800 mb-2">Your Role:</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Guide the Defuser through tree navigation</li>
                    <li>• Explain binary search tree properties</li>
                    <li>• Help them understand left/right decisions</li>
                    <li>• Teach tree traversal concepts</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Show message if expert view is missing */}
          {isExpert && !puzzle.expertView && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h4 className="text-lg font-bold text-yellow-800 mb-4 text-center">
                📖 Expert Knowledge
              </h4>
              <div className="text-center">
                <p className="text-yellow-600">Expert knowledge is loading...</p>
                <p className="text-sm text-yellow-500 mt-2">
                  If this persists, there may be an issue with the puzzle data.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Data Structures Learning Section */}
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h5 className="font-medium text-purple-800 mb-2">Data Structures Concepts:</h5>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-purple-700">
            <div>
              <h6 className="font-medium mb-1">Binary Tree Basics:</h6>
              <ul className="space-y-1 text-xs">
                <li>• Each node has at most two children</li>
                <li>• Left child &lt; parent &lt; Right child (BST)</li>
                <li>• Root is the top node</li>
                <li>• Leaves are nodes without children</li>
              </ul>
            </div>
            <div>
              <h6 className="font-medium mb-1">Navigation Tips:</h6>
              <ul className="space-y-1 text-xs">
                <li>• Start from root, move left or right</li>
                <li>• Compare target with current node value</li>
                <li>• Go left for smaller, right for larger</li>
                <li>• Path represents the sequence of moves</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
