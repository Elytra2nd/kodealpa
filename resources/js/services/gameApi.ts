// resources/js/services/gameApi.ts
import axios from 'axios';
import { Stage, GameSession, GameState } from '@/types/game';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Add CSRF token if available
const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
if (token) {
  api.defaults.headers.common['X-CSRF-TOKEN'] = token;
}

export const gameApi = {
  // Get all stages
  getStages: async (): Promise<Stage[]> => {
    const response = await api.get('/stages');
    return response.data;
  },

  // Create new game session
  createSession: async (stageId: number): Promise<GameSession> => {
    const response = await api.post('/sessions', { stage_id: stageId });
    return response.data;
  },

  // Join session
  joinSession: async (teamCode: string, role: 'defuser' | 'expert', nickname: string) => {
    const response = await api.post('/sessions/join', {
      team_code: teamCode,
      role,
      nickname,
    });
    return response.data;
  },

  // Start session
  startSession: async (sessionId: number): Promise<GameSession> => {
    const response = await api.post(`/sessions/${sessionId}/start`);
    return response.data;
  },

  // Get game state with proper error handling
  getGameState: async (sessionId: number): Promise<GameState> => {
    try {
      const response = await api.get(`/sessions/${sessionId}/state`);

      // Ensure response has proper structure
      if (!response.data || !response.data.session) {
        throw new Error('Invalid API response structure');
      }

      // Ensure arrays are always arrays
      const gameState: GameState = {
        session: {
          ...response.data.session,
          participants: Array.isArray(response.data.session.participants)
            ? response.data.session.participants
            : [],
          attempts: Array.isArray(response.data.session.attempts)
            ? response.data.session.attempts
            : [],
        },
        puzzle: response.data.puzzle || {},
        serverTime: response.data.serverTime || new Date().toISOString()
      };

      return gameState;
    } catch (error: any) {
      console.error('GameAPI Error:', error);
      throw error;
    }
  },

  // Submit attempt
  submitAttempt: async (sessionId: number, puzzleKey: string, input: string) => {
    const response = await api.post(`/sessions/${sessionId}/attempt`, {
      puzzle_key: puzzleKey,
      input,
    });
    return response.data;
  },

  // Get hint
  getHint: async (sessionId: number, hintType: 'general' | 'specific' | 'debugging' = 'general') => {
    const response = await api.post(`/sessions/${sessionId}/hint`, {
      hint_type: hintType,
    });
    return response.data;
  },

  // Submit feedback
  submitFeedback: async (sessionId: number, feedback: {
    feedback_type: 'peer_review' | 'learning_reflection' | 'collaboration_rating';
    content: string;
    rating?: number;
    feedback_from: string;
  }) => {
    const response = await api.post(`/sessions/${sessionId}/feedback`, feedback);
    return response.data;
  },

  // Get session analytics
  getAnalytics: async (sessionId: number) => {
    const response = await api.get(`/sessions/${sessionId}/analytics`);
    return response.data;
  },
};
