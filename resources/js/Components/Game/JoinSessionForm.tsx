import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { gameApi } from '@/services/gameApi';

export default function JoinSessionForm() {
  const [formData, setFormData] = useState({
    teamCode: '',
    role: '' as 'defuser' | 'expert' | '',
    nickname: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teamCode || !formData.role || !formData.nickname) return;

    setLoading(true);
    setError('');

    try {
      const result = await gameApi.joinSession(
        formData.teamCode.toUpperCase(),
        formData.role,
        formData.nickname
      );

      router.visit(`/game/session/${result.session.id}`, {
        data: {
          role: formData.role,
          participantId: result.participant.id
        },
      });
    } catch (error: any) {
      console.error('Error joining session:', error);
      const message = error.response?.data?.message || 'Failed to join session. Please check the team code and try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setFormData({ ...formData, teamCode: value });
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Join Existing Session</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="teamCode" className="block text-sm font-medium text-gray-700 mb-2">
            Team Code
          </label>
          <input
            type="text"
            id="teamCode"
            value={formData.teamCode}
            onChange={handleTeamCodeChange}
            placeholder="Enter 6-character team code"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase font-mono text-center text-lg tracking-widest"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Your Role
          </label>
          <div className="space-y-3">
            <label className="flex items-start p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                value="defuser"
                checked={formData.role === 'defuser'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'defuser' })}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">💣 Defuser</div>
                <div className="text-sm text-gray-600">
                  You see the bomb and must describe it to the Expert.
                </div>
              </div>
            </label>

            <label className="flex items-start p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                value="expert"
                checked={formData.role === 'expert'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'expert' })}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">📖 Expert</div>
                <div className="text-sm text-gray-600">
                  You have the manual and guide the Defuser.
                </div>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
            Your Nickname
          </label>
          <input
            type="text"
            id="nickname"
            value={formData.nickname}
            onChange={(e) => setFormData({ ...formData, nickname: e.target.value.slice(0, 32) })}
            placeholder="Enter your nickname"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !formData.teamCode || !formData.role || !formData.nickname}
          className="w-full bg-green-500 text-white py-3 px-4 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              Joining Session...
            </>
          ) : (
            'Join Game Session'
          )}
        </button>
      </form>
    </div>
  );
}
