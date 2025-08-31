import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Stage } from '@/types/game';
import { gameApi } from '@/services/gameApi';

interface Props {
  stages: Stage[];
}

export default function CreateSessionForm({ stages }: Props) {
  const [selectedStage, setSelectedStage] = useState<number>(stages[0]?.id || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStage) return;

    setLoading(true);
    setError('');

    try {
      const session = await gameApi.createSession(selectedStage);
      router.visit(`/game/session/${session.id}`, {
        data: { role: 'host' },
      });
    } catch (error: any) {
      console.error('Error creating session:', error);
      setError(error.response?.data?.message || 'Failed to create session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedStageData = stages.find(s => s.id === selectedStage);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Create New Game Session</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleCreateSession} className="space-y-4">
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
          >
            <option value="">Select a stage...</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name} {stage.mission && `(${stage.mission.title})`}
              </option>
            ))}
          </select>
        </div>

        {selectedStageData && (
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-medium text-gray-800 mb-2">Stage Information</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Time Limit:</strong> {selectedStageData.config.timeLimit || 180} seconds</p>
              <p><strong>Puzzles:</strong> {selectedStageData.config.puzzles?.length || 0} puzzle(s)</p>
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
          disabled={loading || !selectedStage}
          className="w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              Creating Session...
            </>
          ) : (
            'Create Game Session'
          )}
        </button>
      </form>
    </div>
  );
}
