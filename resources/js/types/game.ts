// resources/js/types/game.ts

// Mission interface
export interface Mission {
  id: number;
  code: string;
  title: string;
  description: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Stage configuration for multi-stage games
export interface StageConfig {
  title: string;
  timeLimit: number;
  maxAttempts: number;
  maxHints?: number; // ✅ ADDED: Max hints per stage
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives?: string[];
}

// Main Stage interface - ONLY DECLARE ONCE
export interface GameStage {
  id: number;
  mission_id: number;
  name: string;
  order: number;
  config: StageConfig;
  is_active: boolean;
  mission?: Mission;
  created_at?: string;
  updated_at?: string;
}

// Game session participant
export interface GameParticipant {
  id: number;
  game_session_id: number;
  role: 'defuser' | 'expert';
  nickname: string;
  user_id?: number;
  joined_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Game attempt with enhanced tracking
export interface GameAttempt {
  id: number;
  game_session_id: number;
  stage: number;
  puzzle_key: string;
  input: string;
  is_correct: boolean;
  points_earned?: number;
  time_taken?: number;
  hints_used?: number;
  attempt_metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

// Enhanced game session with multi-stage support
export interface GameSession {
  id: number;
  team_code: string;
  status: 'waiting' | 'running' | 'success' | 'failed' | 'paused' | 'ended';
  seed?: number;
  started_at?: string;
  completed_at?: string;
  ends_at?: string;

  // Multi-stage properties
  current_stage?: number;
  stages_completed?: number[];
  total_score?: number;
  stage_started_at?: string;
  collaboration_score?: number;
  failed_stage?: number;

  // ✅ ADDED: Hint system properties
  hint_usage?: Record<number, number>; // Track hints used per stage { stage_number: hints_used }
  max_hints_per_stage?: number; // Maximum hints allowed per stage
  total_hints_used?: number; // Total hints used across all stages

  // Learning and feedback
  learning_progress?: Array<{
    stage: number;
    completed: boolean;
    score: number;
    time_taken: number;
  }>;
  hint_count?: number; // Legacy hint count (kept for backward compatibility)
  peer_feedback?: Array<{
    from: string;
    to: string;
    content: string;
    rating?: number;
    type: 'peer_review' | 'learning_reflection' | 'collaboration_rating';
  }>;

  // Always arrays for consistency
  participants: GameParticipant[];
  attempts: GameAttempt[];

  // Optional stage reference
  stage?: GameStage;
  mission?: Mission;

  created_at?: string;
  updated_at?: string;
}

// Puzzle interface supporting all game types
export interface GamePuzzle {
  key: string;
  type: 'pattern_analysis' | 'code_analysis' | 'navigation_challenge' | 'symbol_mapping';
  title?: string;
  description?: string;
  instruction?: string;
  learningObjectives?: string[];
  answer?: string | number | string[];

  // Symbol mapping puzzle (classic bomb defusal)
  symbols?: string[];
  mapping?: Record<string, string>;
  mappingAvailableTo?: 'expert' | 'defuser';

  // Pattern analysis puzzle
  defuserView?: {
    pattern?: (number | string)[];
    hints?: string[];
    sequenceId?: string;
    task?: string;
    category?: string;
    // Code analysis specific
    codeLines?: string[];
    testCase?: {
      input: any;
      expected: any;
    };
    // Navigation specific
    traversalOptions?: string[];
    startPosition?: string;
    grid_size?: string;
    max_moves?: number;
  };

  expertView?: {
    // Pattern analysis
    rule?: string;
    answer?: string | number;
    category?: string;
    explanation?: string;

    // Code analysis
    bugs?: Array<{
      line: number;
      type: string;
      description: string;
      hint: string;
      severity?: 'low' | 'medium' | 'high';
    }>;
    solutions?: Array<{
      line: number;
      correct: string;
      explanation?: string;
    }>;
    codeSnippet?: string[];
    testInput?: any;
    expectedOutput?: any;

    // Navigation challenge
    tree?: any;
    traversalMethods?: Record<string, any[]>;
    optimal_path?: string;
    grid_layout?: {
      size: string;
      start: string;
      end: string;
    };
  };

  // Legacy support for existing puzzles
  sequences?: Array<{
    id: number;
    pattern: (number | string)[];
    rule: string;
    answer: string | number;
    category: string;
  }>;
  hints?: string[];
  challenges?: Array<{
    task: string;
    answer: string[];
    explanation: string;
  }>;
  tree?: any;
  traversalMethods?: Record<string, any[]>;
}

// Multi-stage game state
export interface GameState {
  session: GameSession;
  puzzle: GamePuzzle;
  stage?: {
    current?: number;
    total?: number;
    config?: StageConfig;
    progress?: {
      completed?: number[];
      totalScore?: number;
    };
  };
  serverTime?: string;
}

// Feedback interface
export interface GameFeedback {
  id: number;
  game_session_id: number;
  feedback_type: 'peer_review' | 'learning_reflection' | 'collaboration_rating';
  content: string;
  rating?: number;
  feedback_from: string;
  feedback_to?: string;
  stage?: number;
  created_at: string;
  updated_at?: string;
}

// Hint interface
export interface GameHint {
  id: number;
  game_session_id: number;
  hint_type: 'general' | 'specific' | 'debugging';
  hint: string;
  stage?: number;
  used_at: string;
}

// ✅ ADDED: DM Conversation and Message interfaces
export interface DmConversation {
  id: number;
  game_session_id: number;
  status: 'active' | 'completed' | 'paused';
  total_tokens: number;
  estimated_cost: number;
  created_at: string;
  updated_at: string;
}

export interface DmMessage {
  id: number;
  dm_conversation_id: number;
  user_id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number;
  created_at: string;
  updated_at?: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

// ✅ ADDED: DM Hint usage response
export interface DmHintUsageResponse {
  currentStage: number;
  hintsUsed: number;
  hintsRemaining: number;
  maxHintsPerStage: number;
  totalHintsUsed: number;
  hintHistory?: Array<{
    stage: number;
    hintsUsed: number;
    timestamp: string;
  }>;
}

// ✅ ADDED: DM Hint response
export interface DmHintResponse {
  hint: string;
  hintsRemaining: number;
  hintsUsed: number;
  stage: number;
  timestamp: string;
}

// Analytics interface
export interface GameAnalytics {
  session_id: number;
  total_time: number;
  stages_completed: number;
  total_attempts: number;
  accuracy_rate: number;
  collaboration_score: number;
  hints_used: number;
  stage_breakdown: Array<{
    stage: number;
    time_taken: number;
    attempts: number;
    score: number;
    completed: boolean;
  }>;
  learning_outcomes: string[];
  feedback_summary: {
    peer_reviews: number;
    reflections: number;
    average_rating: number;
  };
}

// API response types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  meta?: {
    current_page?: number;
    total_pages?: number;
    per_page?: number;
    total?: number;
  };
}

// Session creation/join types
export interface SessionCreateRequest {
  stage_id?: number;
  mission_id?: number;
  team_name?: string;
}

export interface SessionJoinRequest {
  team_code: string;
  role: 'defuser' | 'expert';
  nickname: string;
}

// Attempt submission types
export interface AttemptSubmissionRequest {
  puzzle_key: string;
  input: string;
  time_taken?: number;
  hints_used?: number;
}

export interface AttemptSubmissionResponse {
  correct: boolean;
  session: GameSession;
  stageComplete?: boolean;
  gameComplete?: boolean;
  nextStage?: number;
  stageScore?: number;
  finalScore?: number;
  message?: string;
  attemptsRemaining?: number;
}

// Hint request types
export interface HintRequest {
  hint_type: 'general' | 'specific' | 'debugging';
  stage?: number;
}

export interface HintResponse {
  hint: string;
  hint_count: number;
  remaining_hints: number;
}

// Feedback submission types
export interface FeedbackSubmissionRequest {
  feedback_type: 'peer_review' | 'learning_reflection' | 'collaboration_rating';
  content: string;
  rating?: number;
  feedback_from: string;
  feedback_to?: string;
  stage?: number;
}

// ===========================
// TOURNAMENT TYPES
// ===========================

export interface TournamentGroup {
  id: number;
  name: string;
  status: 'waiting' | 'ready' | 'playing' | 'completed' | 'eliminated' | 'champion';
  participants: Array<{
    id: number;
    user_id: number;
    nickname: string;
    role: 'defuser' | 'expert';
  }>;
  completion_time?: number | undefined;
  rank?: number | undefined;
  score: number;
}

export interface TournamentData {
  id: number;
  name: string;
  status: 'waiting' | 'qualification' | 'semifinals' | 'finals' | 'completed';
  current_round: number;
  max_groups: number;
  groups: TournamentGroup[];
  bracket?: TournamentBracket[];
  created_at: string;
  starts_at: string | null;
}

export interface TournamentBracket {
  round: number;
  matches: Array<{
    id: number;
    group1_id: number;
    group2_id: number;
    winner_group_id: number | null;
    status: 'pending' | 'active' | 'completed';
    completion_times: {
      group1_time: number | null;
      group2_time: number | null;
    };
  }>;
}

// Tournament API request/response types
export interface TournamentCreateRequest {
  name: string;
  max_groups: number;
}

export interface TournamentJoinRequest {
  group_name: string;
  role: 'defuser' | 'expert';
  nickname: string;
}

export interface TournamentJoinResponse {
  success: boolean;
  group: TournamentGroup;
  tournament: TournamentData;
  message?: string;
}

export interface TournamentListResponse {
  tournaments: TournamentData[];
  message?: string;
}

export interface TournamentParticipant {
  id: number;
  user_id: number;
  group_id: number;
  tournament_id: number;
  nickname: string;
  role: 'defuser' | 'expert';
  joined_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface TournamentMatch {
  id: number;
  tournament_id: number;
  round: number;
  group1_id: number;
  group2_id: number;
  winner_group_id: number | null;
  status: 'pending' | 'active' | 'completed';
  started_at: string | null;
  completed_at: string | null;
  completion_times: {
    group1_time: number | null;
    group2_time: number | null;
  };
  created_at?: string;
  updated_at?: string;
}

export interface TournamentAnalytics {
  tournament_id: number;
  total_groups: number;
  groups_completed: number;
  average_completion_time: number;
  fastest_group: {
    group_id: number;
    group_name: string;
    completion_time: number;
  } | null;
  slowest_group: {
    group_id: number;
    group_name: string;
    completion_time: number;
  } | null;
  round_breakdown: Array<{
    round: number;
    matches_completed: number;
    total_matches: number;
    average_match_time: number;
  }>;
  elimination_summary: {
    total_eliminated: number;
    elimination_times: number[];
  };
}

export interface TournamentSessionData {
  tournament: TournamentData;
  group: TournamentGroup;
  session: GameSession;
  gameState: GameState | null;
  leaderboard: TournamentGroup[];
}

// ===========================
// END TOURNAMENT TYPES
// ===========================

// Legacy aliases for backward compatibility
export type Stage = GameStage;
export type SessionParticipant = GameParticipant;
export type Attempt = GameAttempt;
export type Puzzle = GamePuzzle;

// ✅ Type guard utilities to prevent TS2345 errors
export const isValidNumber = (value: any): value is number => {
  return typeof value === 'number' && !isNaN(value) && value !== 0;
};

export const isValidBoolean = (value: any): value is boolean => {
  return typeof value === 'boolean';
};

export const normalizeNullableNumber = (value: number | null | undefined): number | undefined => {
  return (value === null || value === undefined) ? undefined : value;
};

export const normalizeBoolean = (value: any): boolean => {
  return value === true;
};

// ✅ Data normalization utilities for API responses
export const normalizeTournamentGroup = (group: any): TournamentGroup => ({
  ...group,
  completion_time: normalizeNullableNumber(group.completion_time),
  rank: normalizeNullableNumber(group.rank),
  participants: Array.isArray(group.participants) ? group.participants : [],
  score: group.score || 0
});

export const normalizeTournamentData = (tournament: any): TournamentData => ({
  ...tournament,
  groups: Array.isArray(tournament.groups)
    ? tournament.groups.map(normalizeTournamentGroup)
    : [],
  bracket: Array.isArray(tournament.bracket) ? tournament.bracket : [],
  starts_at: tournament.starts_at || null
});

// ✅ ADDED: Normalize GameSession with hint data
export const normalizeGameSession = (session: any): GameSession => ({
  ...session,
  participants: Array.isArray(session.participants) ? session.participants : [],
  attempts: Array.isArray(session.attempts) ? session.attempts : [],
  hint_usage: session.hint_usage || {},
  max_hints_per_stage: session.max_hints_per_stage || 3,
  total_hints_used: session.total_hints_used || 0,
  stages_completed: Array.isArray(session.stages_completed) ? session.stages_completed : [],
});

// ✅ ADDED: Helper to get hints remaining for current stage
export const getHintsRemaining = (session: GameSession, currentStage: number): number => {
  const maxHints = session.max_hints_per_stage || 3;
  const hintsUsed = session.hint_usage?.[currentStage] || 0;
  return Math.max(0, maxHints - hintsUsed);
};

// ✅ ADDED: Helper to check if hints are available
export const hasHintsAvailable = (session: GameSession, currentStage: number): boolean => {
  return getHintsRemaining(session, currentStage) > 0;
};
