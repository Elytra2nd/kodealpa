import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { gameApi } from '@/services/gameApi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function GameLobby() {
  const { auth } = usePage().props as {
    auth: {
      user: {
        id: number;
        name: string;
        email: string;
      }
    }
  };

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>('');
  const [joining, setJoining] = useState(false);
  const [teamCode, setTeamCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<'defuser' | 'expert'>('defuser'); // NEW: Role selection state
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  // Create session with proper response handling
  const handleCreateSession = async () => {
    if (creating) return;

    setCreating(true);
    setError('');

    try {
      console.log('🚀 Starting session creation...');
      
      await gameApi.initialize();
      const response = await gameApi.createSession(1);
      
      // Validate response structure
      if (!response) {
        throw new Error('No response received from API');
      }

      if (!response.session) {
        console.error('❌ Missing session in response:', response);
        throw new Error('Session data missing in API response');
      }

      if (!response.session.id) {
        console.error('❌ Missing session ID in response:', response.session);
        throw new Error('Session ID missing in API response');
      }

      const sessionId = response.session.id;
      console.log('✅ Using session ID for redirect:', sessionId);

      router.visit(`/game/session/${sessionId}`, {
        method: 'get',
        data: { 
          role: 'host',
          participantId: auth.user.id
        },
        onSuccess: () => {
          console.log('✅ Successfully redirected to session');
        },
        onError: (errors) => {
          console.error('❌ Redirect failed:', errors);
          setError('Failed to access session. Please try again.');
          setCreating(false);
        }
      });

    } catch (error: any) {
      console.error('❌ Error creating session:', error);
      
      let errorMessage = 'Failed to create session. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setCreating(false);
    }
  };

  // UPDATED: Join existing session with role selection
  const handleJoinSession = async () => {
    if (!teamCode.trim() || joining) return;

    setJoining(true);
    setError('');

    try {
      await gameApi.initialize();
      
      // Use selectedRole instead of hardcoded 'defuser'
      const result = await gameApi.joinSession(
        teamCode.trim().toUpperCase(), 
        selectedRole, // Use selected role
        auth.user.name
      );
      
      console.log('🔍 Join session result:', result);
      
      if (!result?.session?.id) {
        throw new Error('Invalid join session response');
      }

      router.visit(`/game/session/${result.session.id}`, {
        data: { 
          role: selectedRole, // Use selected role
          participantId: result.participant.id
        }
      });

    } catch (error: any) {
      console.error('❌ Join session error:', error);
      setError(error.response?.data?.message || 'Failed to join session. Please check the team code.');
      setJoining(false);
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
        <div className="max-w-2xl mx-auto sm:px-6 lg:px-8">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 mb-8 text-center">
            <h1 className="text-3xl font-bold mb-3">Welcome, {auth.user.name}!</h1>
            <p className="text-blue-100 text-lg">Ready for a multi-stage collaborative challenge?</p>
          </div>

          <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-8">
              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-8">
                <button
                  onClick={() => setActiveTab('create')}
                  className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'create'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🚀 Create New Session
                </button>
                <button
                  onClick={() => setActiveTab('join')}
                  className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'join'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🎮 Join Existing Session
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-red-600 text-xl mr-3">⚠️</span>
                    <div>
                      <p className="text-red-800 font-medium">Error</p>
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content */}
              {activeTab === 'create' ? (
                <div className="text-center">
                  {/* Host Info */}
                  <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-center justify-center mb-4">
                      <span className="text-yellow-600 text-2xl mr-3">👑</span>
                      <h3 className="text-yellow-800 font-bold text-lg">You will be the Host</h3>
                    </div>
                    <p className="text-yellow-700 text-sm">
                      As the session creator, you'll have host privileges and can manage the game session.
                      You can start the game when both Defuser and Expert players have joined.
                    </p>
                  </div>

                  {/* Create Button */}
                  <button
                    onClick={handleCreateSession}
                    disabled={creating}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-xl font-bold py-6 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                  >
                    {creating ? (
                      <>
                        <span className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></span>
                        Creating Your Session...
                      </>
                    ) : (
                      <>
                        👑 Start New Game Session as Host
                      </>
                    )}
                  </button>

                  <p className="text-gray-500 text-sm mt-4">
                    Click the button above to instantly create a new game session and become the host!
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold mb-6 text-center">Join Existing Session</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="teamCode" className="block text-sm font-medium text-gray-700 mb-2">
                        Team Code
                      </label>
                      <input
                        id="teamCode"
                        type="text"
                        value={teamCode}
                        onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                        placeholder="Enter 6-digit team code"
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono tracking-wider"
                        maxLength={6}
                        disabled={joining}
                      />
                    </div>

                    {/* NEW: Role Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Choose Your Role
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Defuser Role Card */}
                        <div 
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                            selectedRole === 'defuser' 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-gray-300 bg-white hover:border-red-300'
                          }`}
                          onClick={() => setSelectedRole('defuser')}
                        >
                          <div className="text-center">
                            <div className="text-3xl mb-2">💣</div>
                            <h4 className="font-semibold text-gray-800">Defuser</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              You see the bomb and describe it to the Expert
                            </p>
                            <div className="mt-2">
                              <input
                                type="radio"
                                id="defuser"
                                name="role"
                                value="defuser"
                                checked={selectedRole === 'defuser'}
                                onChange={() => setSelectedRole('defuser')}
                                className="w-4 h-4 text-red-600"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Expert Role Card */}
                        <div 
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                            selectedRole === 'expert' 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-300 bg-white hover:border-blue-300'
                          }`}
                          onClick={() => setSelectedRole('expert')}
                        >
                          <div className="text-center">
                            <div className="text-3xl mb-2">📖</div>
                            <h4 className="font-semibold text-gray-800">Expert</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              You have the manual and guide the Defuser
                            </p>
                            <div className="mt-2">
                              <input
                                type="radio"
                                id="expert"
                                name="role"
                                value="expert"
                                checked={selectedRole === 'expert'}
                                onChange={() => setSelectedRole('expert')}
                                className="w-4 h-4 text-blue-600"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Join Button */}
                    <button
                      onClick={handleJoinSession}
                      disabled={joining || !teamCode.trim()}
                      className="w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {joining ? (
                        <>
                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                          Joining Session...
                        </>
                      ) : (
                        `Join as ${selectedRole === 'defuser' ? 'Defuser 💣' : 'Expert 📖'}`
                      )}
                    </button>
                  </div>

                  {/* Role Information */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      <strong>Selected Role:</strong> You will join as the <strong>{selectedRole === 'defuser' ? 'Defuser' : 'Expert'}</strong>.
                      {selectedRole === 'defuser' 
                        ? ' You will see the bomb and describe it to your teammate.' 
                        : ' You will have the manual and guide the Defuser through the defusing process.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Updated Game Rules */}
          <div className="mt-8 bg-white shadow-sm rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🎯 Game Rules</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Roles:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <span className="mr-2">👑</span>
                    <span><strong>Host:</strong> Manages the session and starts the game</span>
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">💣</span>
                    <span><strong>Defuser:</strong> Sees the bomb and describes it</span>
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">📖</span>
                    <span><strong>Expert:</strong> Has the manual and guides the defuser</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Role Selection:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <span className="mr-2">🎯</span>
                    <span>Choose your preferred role when joining</span>
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">👥</span>
                    <span>Each role can only be taken by one player</span>
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">🎮</span>
                    <span>Both roles are essential for success</span>
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">🗣️</span>
                    <span>Communication is key!</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
