// resources/js/Components/Game/StageTransition.tsx

import React from 'react';

interface Props {
  result: {
    stageComplete?: boolean;
    gameComplete?: boolean;
    nextStage?: number;
    stageScore?: number;
    finalScore?: number;
    message?: string;
  };
  currentStage?: number;
  totalStages?: number;
}

export default function StageTransition({ result, currentStage, totalStages }: Props) {
  if (result.gameComplete) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-green-600 mb-4">Mission Accomplished!</h2>
          <p className="text-gray-600 mb-6">{result.message}</p>
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <div className="text-2xl font-bold text-green-700">{result.finalScore}</div>
            <div className="text-sm text-green-600">Final Score</div>
          </div>
        </div>
      </div>
    );
  }

  if (result.stageComplete) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-blue-600 mb-4">
            Stage {currentStage} Complete!
          </h2>
          <p className="text-gray-600 mb-6">{result.message}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="text-xl font-bold text-blue-700">{result.stageScore}</div>
              <div className="text-sm text-blue-600">Stage Score</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded p-3">
              <div className="text-xl font-bold text-purple-700">{result.nextStage}</div>
              <div className="text-sm text-purple-600">Next Stage</div>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Moving to next stage in 3 seconds...
          </div>
        </div>
      </div>
    );
  }

  return null;
}
