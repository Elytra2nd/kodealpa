// resources/js/services/gameApi.ts
import axios from 'axios';
import type {
  Stage,
  GameSession,
  GameState,
  TournamentData,
  TournamentGroup,
  TournamentBracket,
  TournamentJoinRequest,
  TournamentJoinResponse,
  TournamentCreateRequest
} from '@/types/game';

// Interface khusus untuk Voice Chat (tidak ada di game.ts)
export interface VoiceChatSettings {
  enabled: boolean;
  quality: 'low' | 'medium' | 'high';
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

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

// Initialize CSRF Cookie using separate instance
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

  // === STAGE MANAGEMENT ===

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

  // === REGULAR GAME SESSION MANAGEMENT ===

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

  // === TOURNAMENT SYSTEM ===

  // Get all tournaments
  getTournaments: async (): Promise<{ tournaments: TournamentData[] }> => {
    try {
      const response = await api.get('/tournaments');
      console.log('🏆 Tournaments loaded:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to load tournaments:', error);
      throw error;
    }
  },

  // Create new tournament
  createTournament: async (data: {
    name: string;
    max_groups?: number;
    tournament_type?: 'elimination' | 'round_robin';
  }): Promise<{ tournament: TournamentData; success: boolean; message: string }> => {
    try {
      await initializeCSRF();
      console.log('🏆 Creating tournament:', data);

      const response = await api.post('/tournaments', {
        name: data.name,
        max_groups: data.max_groups || 4,
        tournament_type: data.tournament_type || 'elimination'
      });

      console.log('✅ Tournament created:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Tournament creation failed:', error);
      throw error;
    }
  },

  // Join tournament
  joinTournament: async (tournamentId: number, data: TournamentJoinRequest): Promise<TournamentJoinResponse> => {
    try {
      await initializeCSRF();
      console.log('🏆 Joining tournament:', tournamentId, data);

      const response = await api.post(`/tournaments/${tournamentId}/join`, data);

      console.log('✅ Tournament joined:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Tournament join failed:', error);
      throw error;
    }
  },

  // Get tournament details
  getTournament: async (tournamentId: number): Promise<{
    tournament: TournamentData;
    bracket: TournamentBracket[];
  }> => {
    try {
      const response = await api.get(`/tournaments/${tournamentId}`);
      console.log('🏆 Tournament details loaded:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to load tournament details:', error);
      throw error;
    }
  },

  // Get tournament session data
  getTournamentSession: async (tournamentId: number, groupId?: number): Promise<{
    tournament: TournamentData;
    group: TournamentGroup;
    session: GameSession;
    gameState: GameState;
    leaderboard: TournamentGroup[];
  }> => {
    try {
      const params = groupId ? { group_id: groupId } : {};
      const response = await api.get(`/tournaments/${tournamentId}/session`, { params });

      console.log('🏆 Tournament session loaded:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to load tournament session:', error);
      throw error;
    }
  },

  // Complete tournament session
  completeTournamentSession: async (sessionId: number): Promise<{
    success: boolean;
    group: TournamentGroup;
    tournament: TournamentData;
  }> => {
    try {
      await initializeCSRF();
      const response = await api.post(`/tournaments/sessions/${sessionId}/complete`);

      console.log('🏆 Tournament session completed:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Tournament completion failed:', error);
      throw error;
    }
  },

  // Get tournament leaderboard
  getTournamentLeaderboard: async (tournamentId: number): Promise<{
    tournament: { id: number; name: string; status: string };
    leaderboard: Array<{
      id: number;
      name: string;
      rank?: number;
      status: string;
      completion_time?: number;
      score: number;
      participants: Array<{
        nickname: string;
        role: string;
        user: { name: string; email: string };
      }>;
    }>;
  }> => {
    try {
      const response = await api.get(`/tournaments/${tournamentId}/leaderboard`);
      console.log('🏆 Tournament leaderboard loaded:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to load tournament leaderboard:', error);
      throw error;
    }
  },

  // Leave tournament
  leaveTournament: async (tournamentId: number): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      await initializeCSRF();
      const response = await api.delete(`/tournaments/${tournamentId}/leave`);

      console.log('🏆 Left tournament:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to leave tournament:', error);
      throw error;
    }
  },

  // === VOICE CHAT SYSTEM ===

  // Get voice chat token
  getVoiceToken: async (sessionId?: number): Promise<{
    token: string;
    iceServers: Array<{ urls: string }>;
    settings: VoiceChatSettings;
  }> => {
    try {
      const endpoint = sessionId ? `/voice/${sessionId}/token` : '/voice/token';
      const response = await api.get(endpoint);

      console.log('🎙️ Voice token obtained:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get voice token:', error);
      throw error;
    }
  },

  // Join voice chat session
  joinVoiceSession: async (sessionId: number, data: {
    nickname: string;
    role: string;
  }): Promise<{
    success: boolean;
    participants: Array<{
      userId: number;
      nickname: string;
      role: string;
      isConnected: boolean;
    }>;
  }> => {
    try {
      await initializeCSRF();
      const response = await api.post(`/voice/${sessionId}/join`, data);

      console.log('🎙️ Joined voice session:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to join voice session:', error);
      throw error;
    }
  },

  // Leave voice chat session
  leaveVoiceSession: async (sessionId: number): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      await initializeCSRF();
      const response = await api.post(`/voice/${sessionId}/leave`);

      console.log('🎙️ Left voice session:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to leave voice session:', error);
      throw error;
    }
  },

  // Get voice chat participants
  getVoiceParticipants: async (sessionId: number): Promise<{
    participants: Array<{
      id: number;
      user_id: number;
      nickname: string;
      role: string;
      is_online: boolean;
    }>;
  }> => {
    try {
      const response = await api.get(`/voice/${sessionId}/participants`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get voice participants:', error);
      throw error;
    }
  },

  // Toggle mute status
  toggleVoiceMute: async (sessionId: number, muted: boolean): Promise<{
    success: boolean;
    muted: boolean;
  }> => {
    try {
      await initializeCSRF();
      const response = await api.post(`/voice/${sessionId}/mute`, { muted });

      console.log('🎙️ Voice mute toggled:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to toggle voice mute:', error);
      throw error;
    }
  },

  // Set voice volume
  setVoiceVolume: async (sessionId: number, volume: number): Promise<{
    success: boolean;
    volume: number;
  }> => {
    try {
      await initializeCSRF();
      const response = await api.post(`/voice/${sessionId}/volume`, {
        volume: Math.max(0, Math.min(100, volume))
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to set voice volume:', error);
      throw error;
    }
  },

  // Test voice connection
  testVoiceConnection: async (): Promise<{
    success: boolean;
    latency: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    servers: Array<{
      url: string;
      region: string;
      ping: number;
    }>;
  }> => {
    try {
      const response = await api.post('/voice/test/connection');

      console.log('🎙️ Voice connection test result:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Voice connection test failed:', error);
      throw error;
    }
  },

  // Test audio quality
  testAudioQuality: async (audioData: Blob): Promise<{
    success: boolean;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];
  }> => {
    try {
      const formData = new FormData();
      formData.append('audio', audioData, 'test-audio.wav');

      await initializeCSRF();
      const response = await api.post('/voice/test/audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('🎙️ Audio quality test result:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Audio quality test failed:', error);
      throw error;
    }
  },

  // Get voice chat settings
  getVoiceSettings: async (): Promise<VoiceChatSettings> => {
    try {
      const response = await api.get('/voice/settings');
      return response.data.settings;
    } catch (error: any) {
      console.error('❌ Failed to get voice settings:', error);
      throw error;
    }
  },

  // Update voice chat settings
  updateVoiceSettings: async (settings: Partial<VoiceChatSettings>): Promise<{
    success: boolean;
    settings: VoiceChatSettings;
  }> => {
    try {
      await initializeCSRF();
      const response = await api.post('/voice/settings', { settings });

      console.log('🎙️ Voice settings updated:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to update voice settings:', error);
      throw error;
    }
  },

  // Report voice chat issue
  reportVoiceIssue: async (sessionId: number, issue: {
    type: 'connection' | 'audio_quality' | 'echo' | 'noise' | 'other';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }): Promise<{
    success: boolean;
    ticket_id: string;
    message: string;
  }> => {
    try {
      await initializeCSRF();
      const response = await api.post(`/voice/${sessionId}/report`, issue);

      console.log('🎙️ Voice issue reported:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to report voice issue:', error);
      throw error;
    }
  },

  // === WEBRTC SIGNALING ===

  // Handle WebRTC offer
  sendWebRTCOffer: async (sessionId: number, offer: RTCSessionDescriptionInit, targetUserId: number): Promise<{
    success: boolean;
  }> => {
    try {
      await initializeCSRF();
      const response = await api.post(`/signaling/${sessionId}/offer`, {
        offer,
        target_user_id: targetUserId
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to send WebRTC offer:', error);
      throw error;
    }
  },

  // Handle WebRTC answer
  sendWebRTCAnswer: async (sessionId: number, answer: RTCSessionDescriptionInit, targetUserId: number): Promise<{
    success: boolean;
  }> => {
    try {
      await initializeCSRF();
      const response = await api.post(`/signaling/${sessionId}/answer`, {
        answer,
        target_user_id: targetUserId
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to send WebRTC answer:', error);
      throw error;
    }
  },

  // Handle ICE candidate
  sendICECandidate: async (sessionId: number, candidate: RTCIceCandidateInit, targetUserId: number): Promise<{
    success: boolean;
  }> => {
    try {
      await initializeCSRF();
      const response = await api.post(`/signaling/${sessionId}/ice-candidate`, {
        candidate,
        target_user_id: targetUserId
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to send ICE candidate:', error);
      throw error;
    }
  },

  // Get signaling status
  getSignalingStatus: async (): Promise<{
    status: 'online' | 'offline' | 'degraded';
    servers: Array<{
      url: string;
      status: 'online' | 'offline';
      ping: number;
    }>;
  }> => {
    try {
      const response = await api.get('/signaling/status');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get signaling status:', error);
      throw error;
    }
  },

  // === HEALTH CHECKS ===

  // Voice system health check
  checkVoiceHealth: async (): Promise<{
    status: 'healthy' | 'degraded' | 'offline';
    services: {
      signaling: 'online' | 'offline';
      voice_servers: 'online' | 'offline';
      database: 'online' | 'offline';
    };
    timestamp: string;
  }> => {
    try {
      const response = await api.get('/health/voice');
      return response.data;
    } catch (error: any) {
      console.error('❌ Voice health check failed:', error);
      throw error;
    }
  },
};

// Export both instances for advanced usage
export { api, csrfAxios };
