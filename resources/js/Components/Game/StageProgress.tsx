// resources/js/Components/Game/StageProgress.tsx

import React from 'react';

interface Props {
  current: number;
  total: number;
  completed: number[];
  totalScore: number;
}

export default function StageProgress({ current, total, completed, totalScore }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Mission Progress</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{totalScore}</div>
          <div className="text-sm text-gray-500">Total Score</div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {Array.from({ length: total }, (_, index) => {
          const stageNumber = index + 1;
          const isCompleted = completed.includes(stageNumber);
          const isCurrent = stageNumber === current;
          const isPending = stageNumber > current;

          return (
            <React.Fragment key={stageNumber}>
              <div className={`
                flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold
                ${isCompleted
                  ? 'bg-green-500 text-white'
                  : isCurrent
                    ? 'bg-blue-500 text-white animate-pulse'
                    : 'bg-gray-200 text-gray-500'
                }
              `}>
                {isCompleted ? '✓' : stageNumber}
              </div>

              {stageNumber < total && (
                <div className={`
                  flex-1 h-1 rounded
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                `} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div className="font-semibold text-green-600">{completed.length}</div>
          <div className="text-gray-500">Completed</div>
        </div>
        <div>
          <div className="font-semibold text-blue-600">{current}</div>
          <div className="text-gray-500">Current</div>
        </div>
        <div>
          <div className="font-semibold text-gray-600">{total - current}</div>
          <div className="text-gray-500">Remaining</div>
        </div>
      </div>
    </div>
  );
}
