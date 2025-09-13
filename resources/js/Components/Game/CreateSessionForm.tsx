// resources/js/Components/Game/CreateSessionForm.tsx
import React, { useState } from 'react';

interface FlexibleStage {
  id: number;
  name: string;
  mission_id?: number;
  order?: number;
  config: {
    title?: string;
    timeLimit?: number;
    maxAttempts?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    learningObjectives?: string[];
    puzzles?: Array<any>;
  };
  mission?: {
    id: number;
    title: string;
    description: string;
    code: string;
  };
  is_active: boolean;
}

interface Props {
  stages: FlexibleStage[];
  onCreateSession: (stageId: number) => Promise<void>;
  isCreating: boolean;
}

export default function CreateSessionForm({ stages, onCreateSession, isCreating }: Props) {
  const [selectedStage, setSelectedStage] = useState<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStage || isCreating) return;
    
    await onCreateSession(selectedStage);
  };

  const selectedStageData = stages.find(s => s.id === selectedStage);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Create New Game Session</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="stage" className="block text-sm font-medium text-gray-700 mb-2">
            Select Stage
          </label>
          <select
            id="stage"
            value={selectedStage || ''}
            onChange={(e) => setSelectedStage(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={isCreating}
          >
            <option value="">Select a stage...</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name} {stage.mission && `(${stage.mission.title})`}
              </option>
            ))}
          </select>
        </div>

        {/* Stage Info Preview */}
        {selectedStageData && (
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-medium text-gray-800 mb-2">Stage Information</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Time Limit:</strong> {selectedStageData.config?.timeLimit || 300} seconds</p>
              <p><strong>Max Attempts:</strong> {selectedStageData.config?.maxAttempts || 3}</p>
              <p><strong>Difficulty:</strong> {selectedStageData.config?.difficulty || 'intermediate'}</p>
              {selectedStageData.mission && (
                <>
                  <p><strong>Mission:</strong> {selectedStageData.mission.title}</p>
                  <p><strong>Description:</strong> {selectedStageData.mission.description}</p>
                </>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isCreating || !selectedStage}
          className="w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isCreating ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              Creating Session as Host...
            </>
          ) : (
            '👑 Create Game Session as Host'
          )}
        </button>
      </form>
    </div>
  );
}
