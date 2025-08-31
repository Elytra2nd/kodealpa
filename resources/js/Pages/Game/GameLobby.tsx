import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { Stage } from '@/types/game';
import { gameApi } from '@/services/gameApi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CreateSessionForm from '@/Components/Game/CreateSessionForm';
import JoinSessionForm from '@/Components/Game/JoinSessionForm';

export default function GameLobby() {
  const { auth } = usePage().props as { auth: { user: { id: number; name: string; email: string } } };
  const [stages, setStages] = useState<Stage[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStages();
  }, []);

  const loadStages = async () => {
    try {
      const data = await gameApi.getStages();
      setStages(data);
    } catch (error) {
      console.error('Error loading stages:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
          Keep Talking & Nobody Explodes - Game Lobby
        </h2>
      }
    >
      <Head title="Game Lobby" />

      <div className="py-12">
        <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6">
              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-6">
                <button
                  onClick={() => setActiveTab('create')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'create'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Create Session
                </button>
                <button
                  onClick={() => setActiveTab('join')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'join'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Join Session
                </button>
              </div>

              {/* Tab Content */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading stages...</p>
                </div>
              ) : (
                <div>
                  {activeTab === 'create' && <CreateSessionForm stages={stages} />}
                  {activeTab === 'join' && <JoinSessionForm />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
