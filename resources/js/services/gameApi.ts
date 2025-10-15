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


// ✅ NEW: Interface untuk Tournament Cleanup Stats
export interface TournamentCleanupStats {
  enabled: boolean;
  last_cleanup: {
    executed_at: string;
    total_deleted: number;
    breakdown: {
      completed: number;
      empty: number;
      inactive: number;
      stuck: number;
    };
  } | null;
  next_cleanup: string;
  stats: {
    total_tournaments: number;
    active: number;
    completed: number;
    stale_tournaments: {
      completed_old: number;
      empty_waiting: number;
      stuck: number;
    };
  };
  config: {
    completed_after_days: number;
    waiting_empty_after_hours: number;
    waiting_inactive_after_hours: number;
    minimum_active_groups: number;
    stuck_after_hours: number;
    auto_cleanup_enabled: boolean;
  };
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
    if (error.response && error.response.status === 419) {
      console.log('🔄 CSRF token expired, refreshing...');

      try {
        await initializeCSRF();

        const newToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (newToken) {
          api.defaults.headers.common['X-CSRF-TOKEN'] = newToken;
          csrfAxios.defaults.headers.common['X-CSRF-TOKEN'] = newToken;
        }

        return api(error.config);
      } catch (refreshError) {
        console.error('❌ Failed to refresh CSRF token:', refreshError);

        if (typeof window !== 'undefined') {
          window.location.reload();
        }

        return Promise.reject(refreshError);
      }
    }

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

  createSampleStages: async () => {
    await initializeCSRF();
    const response = await api.post('/stages/sample');
    return response.data;
  },

  getStages: async (): Promise<Stage[]> => {
    const response = await api.get('/stages');
    return response.data;
  },

  // === REGULAR GAME SESSION MANAGEMENT ===

  createSession: async (stageId: number): Promise<any> => {
    await initializeCSRF();

    console.log('🚀 Creating session with stage_id:', stageId);

    const response = await api.post('/sessions', { stage_id: stageId });

    console.log('🔍 Full createSession response:', response);
    console.log('🔍 Response data:', response.data);
    console.log('🔍 Session object:', response.data.session);
    console.log('🔍 Session ID:', response.data.session?.id);

    if (!response.data || !response.data.session || !response.data.session.id) {
      console.error('❌ Invalid response structure from createSession API');
      throw new Error('Invalid session data received from server');
    }

    return response.data;
  },

  joinSession: async (teamCode: string, role: 'defuser' | 'expert', nickname: string) => {
    await initializeCSRF();
    const response = await api.post('/sessions/join', {
      team_code: teamCode,
      role,
      nickname,
    });
    return response.data;
  },

  startSession: async (sessionId: number): Promise<GameSession> => {
    const response = await api.post(`/sessions/${sessionId}/start`);
    return response.data;
  },

  // ✅ NEW: End session for regular games (non-tournament)
  endSession: async (sessionId: number): Promise<{
    success: boolean;
    session: GameSession;
    message: string;
  }> => {
    try {
      await initializeCSRF();
      const response = await api.post(`/sessions/${sessionId}/end`);

      console.log('🏁 Session ended:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to end session:', error);
      throw error;
    }
  },

  getGameState: async (sessionId: number): Promise<GameState> => {
    try {
      const response = await api.get(`/sessions/${sessionId}/state`);

      if (!response.data || !response.data.session) {
        throw new Error('Invalid API response structure');
      }

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
        stage: response.data.stage || undefined,
        serverTime: response.data.serverTime || new Date().toISOString()
      };

      return gameState;
    } catch (error: any) {
      console.error('🎮 GameAPI getGameState Error:', error);
      throw error;
    }
  },

  submitAttempt: async (sessionId: number, puzzleKey: string, input: string) => {
    const response = await api.post(`/sessions/${sessionId}/attempt`, {
      puzzle_key: puzzleKey,
      input,
    });
    return response.data;
  },

  // ✅ UPDATED: Legacy hint system (kept for backward compatibility)
  getHint: async (sessionId: number, hintType: 'general' | 'specific' | 'debugging' = 'general') => {
    const response = await api.post(`/sessions/${sessionId}/hint`, {
      hint_type: hintType,
    });
    return response.data;
  },

  submitFeedback: async (sessionId: number, feedback: {
    feedback_type: 'peer_review' | 'learning_reflection' | 'collaboration_rating';
    content: string;
    rating?: number;
    feedback_from: string;
  }) => {
    const response = await api.post(`/sessions/${sessionId}/feedback`, feedback);
    return response.data;
  },

  getAnalytics: async (sessionId: number) => {
    const response = await api.get(`/sessions/${sessionId}/analytics`);
    return response.data;
  },

  // === ✅ DUNGEON MASTER AI HINT SYSTEM ===

  /**
   * Use a hint from DM (decrements available hints)
   * Note: This is a server-side decrement endpoint, NOT the streaming chat
   * The streaming chat uses SSE endpoint: /game/dm/stream (handled separately)
   */
  useDMHint: async (sessionId: number, stage: number): Promise<{
    hint: string;
    hintsRemaining: number;
    hintsUsed: number;
  }> => {
    try {
      await initializeCSRF();
      const response = await api.post(`/sessions/${sessionId}/dm-hint`, {
        stage,
      });

      console.log('🧙‍♂️ DM Hint used:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to use DM hint:', error);
      throw error;
    }
  },

  /**
   * Get hint usage statistics for current stage
   */
  getDMHintUsage: async (sessionId: number): Promise<{
    currentStage: number;
    hintsUsed: number;
    hintsRemaining: number;
    maxHintsPerStage: number;
    totalHintsUsed: number;
  }> => {
    try {
      const response = await api.get(`/sessions/${sessionId}/dm-hint/usage`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get DM hint usage:', error);
      throw error;
    }
  },

  // === TOURNAMENT SYSTEM ===

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

  // ✅ NEW: Delete Tournament (Admin/Host only - optional, backend will validate)
  deleteTournament: async (tournamentId: number): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      await initializeCSRF();
      const response = await api.delete(`/tournaments/${tournamentId}`);

      console.log('🏆 Tournament deleted:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to delete tournament:', error);
      throw error;
    }
  },

  // ✅ NEW: Get Tournament Cleanup Statistics
  getTournamentCleanupStats: async (): Promise<TournamentCleanupStats> => {
    try {
      const response = await api.get('/tournaments/cleanup-stats');
      console.log('🧹 Tournament cleanup stats loaded:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to load tournament cleanup stats:', error);
      throw error;
    }
  },

  // === VOICE CHAT SYSTEM ===

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

  getVoiceSettings: async (): Promise<VoiceChatSettings> => {
    try {
      const response = await api.get('/voice/settings');
      return response.data.settings;
    } catch (error: any) {
      console.error('❌ Failed to get voice settings:', error);
      throw error;
    }
  },

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
