// resources/js/services/gameApi.ts
import axios from 'axios';
import { Stage, GameSession, GameState } from '@/types/game';

// Create separate axios instance for CSRF calls (no baseURL prefix)
const csrfAxios = axios.create({
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  }
});

// Create main API instance for other calls (with /api prefix)
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
});

// FIXED: Initialize CSRF Cookie using separate instance
export const initializeCSRF = async (): Promise<void> => {
  try {
    // Use csrfAxios (no /api prefix) for CSRF cookie
    await csrfAxios.get('/sanctum/csrf-cookie');
    console.log('✅ CSRF cookie initialized');
  } catch (error) {
    console.error('❌ Failed to initialize CSRF cookie:', error);
    throw error;
  }
};

// Get CSRF token from meta tag and set as default header
const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
if (token) {
  api.defaults.headers.common['X-CSRF-TOKEN'] = token;
  csrfAxios.defaults.headers.common['X-CSRF-TOKEN'] = token;
}

// Add response interceptor to handle CSRF token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 419 CSRF Token Mismatch error
    if (error.response && error.response.status === 419) {
      console.log('🔄 CSRF token expired, refreshing...');

      try {
        // Get fresh CSRF token using correct endpoint
        await initializeCSRF();

        // Update token in default headers from meta tag
        const newToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (newToken) {
          api.defaults.headers.common['X-CSRF-TOKEN'] = newToken;
          csrfAxios.defaults.headers.common['X-CSRF-TOKEN'] = newToken;
        }

        // Retry the original request
        return api(error.config);
      } catch (refreshError) {
        console.error('❌ Failed to refresh CSRF token:', refreshError);

        if (typeof window !== 'undefined') {
          window.location.reload();
        }

        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response) {
      const status = error.response.status;

      switch (status) {
        case 401:
          console.error('❌ Unauthorized - Please login');
          break;
        case 403:
          console.error('❌ Forbidden - Access denied');
          break;
        case 404:
          console.error('❌ Not found - Resource does not exist');
          break;
        case 500:
          console.error('❌ Server error - Please try again later');
          break;
        default:
          console.error(`❌ HTTP Error ${status}:`, error.response.data);
      }
    }

    return Promise.reject(error);
  }
);

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

export const gameApi = {
  // Initialize CSRF before making authenticated requests
  async initialize(): Promise<void> {
    await initializeCSRF();
  },

  // Get all stages
  createSampleStages: async () => {
    await initializeCSRF(); // Ensure fresh token before creation
    const response = await api.post('/stages/sample');
    return response.data;

  },

  getStages: async (): Promise<Stage[]> => {
    const response = await api.get('/stages');
    return response.data;
  },

  // Create new game session
  createSession: async (stageId: number): Promise<any> => {
  await initializeCSRF(); // Ensure fresh token before creation

  console.log('🚀 Creating session with stage_id:', stageId);

  const response = await api.post('/sessions', { stage_id: stageId });

  // DEBUG: Log full response structure
  console.log('🔍 Full createSession response:', response);
  console.log('🔍 Response data:', response.data);
  console.log('🔍 Session object:', response.data.session);
  console.log('🔍 Session ID:', response.data.session?.id);

  // Validate response structure
  if (!response.data || !response.data.session || !response.data.session.id) {
    console.error('❌ Invalid response structure from createSession API');
    throw new Error('Invalid session data received from server');
  }

  return response.data; // Return full response data
},

  // Join session
  joinSession: async (teamCode: string, role: 'defuser' | 'expert', nickname: string) => {
    await initializeCSRF(); // Ensure fresh token
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

      // Ensure arrays are always arrays and add stage data if available
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
        stage: response.data.stage || undefined, // Include stage data for multi-stage
        serverTime: response.data.serverTime || new Date().toISOString()
      };

      return gameState;
    } catch (error: any) {
      console.error('🎮 GameAPI getGameState Error:', error);
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

// Export both instances for advanced usage
export { api, csrfAxios };
