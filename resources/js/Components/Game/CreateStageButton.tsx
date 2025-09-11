import React, { useState } from 'react';
import { gameApi } from '@/services/gameApi';

interface Props {
  onStagesCreated: () => void;
  userRole?: string;
}

export default function CreateStageButton({ onStagesCreated, userRole }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Only show to authenticated users (hosts can create stages)
  if (!userRole) {
    return null;
  }

  const handleCreateSampleStages = async () => {
    setLoading(true);
    setError('');

    try {
      await gameApi.createSampleStages();
      console.log('✅ Sample stages created successfully');
      onStagesCreated(); // Refresh stages list
    } catch (error: any) {
      console.error('❌ Failed to create sample stages:', error);
      setError(error.response?.data?.message || 'Failed to create sample stages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center py-12">
      <div className="text-gray-400 text-6xl mb-6">🎯</div>
      <h3 className="text-xl font-semibold text-gray-700 mb-3">No Game Stages Available</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        To start playing the multi-stage challenge, we need to create some game stages first.
        Click the button below to create sample stages automatically.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md mx-auto">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleCreateSampleStages}
          disabled={loading}
          className={`px-8 py-4 rounded-lg font-medium text-lg transition-all duration-200 ${
            loading
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-lg transform hover:scale-105'
          }`}
        >
          {loading ? (
            <>
              <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
              Creating Sample Stages...
            </>
          ) : (
            <>
              🚀 Create Sample Stages
            </>
          )}
        </button>

        <p className="text-gray-400 text-sm">
          This will create 3 progressive challenge stages for you to play
        </p>
      </div>

      {/* Preview of stages that will be created */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-2xl mx-auto">
        <h4 className="font-medium text-gray-800 mb-4">Stages that will be created:</h4>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <span className="font-bold text-blue-700">1</span>
            </div>
            <p className="font-medium text-blue-700">Pattern Analysis</p>
            <p className="text-gray-500 text-xs">5 min • 3 attempts</p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <span className="font-bold text-purple-700">2</span>
            </div>
            <p className="font-medium text-purple-700">Code Analysis</p>
            <p className="text-gray-500 text-xs">7 min • 3 attempts</p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <span className="font-bold text-green-700">3</span>
            </div>
            <p className="font-medium text-green-700">Navigation Challenge</p>
            <p className="text-gray-500 text-xs">8 min • 3 attempts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
