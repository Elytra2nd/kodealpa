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
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives?: string[];
}

// Main Stage interface - ONLY DECLARE ONCE
export interface GameStage {  // Renamed from 'Stage' to avoid conflicts
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

  // Learning and feedback
  learning_progress?: Array<{
    stage: number;
    completed: boolean;
    score: number;
    time_taken: number;
  }>;
  hint_count?: number;
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

  // Optional stage reference - using renamed interface
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
// TOURNAMENT TYPES - ADDED
// ===========================

// Tournament main interface
export interface TournamentData {
  id: number;
  name: string;
  status: 'waiting' | 'qualification' | 'semifinals' | 'finals' | 'completed';
  current_round: number;
  max_groups: number;
  groups: TournamentGroup[];
  bracket: TournamentBracket[];
  created_at: string;
  starts_at: string;
}

// Tournament group interface
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
  completion_time?: number;
  score: number;
  rank?: number;
}

// Tournament bracket interface
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

// Tournament participant interface
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

// Tournament match interface
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

// Tournament analytics interface
export interface TournamentAnalytics {
  tournament_id: number;
  total_groups: number;
  groups_completed: number;
  average_completion_time: number;
  fastest_group: {
    group_id: number;
    group_name: string;
    completion_time: number;
  };
  slowest_group: {
    group_id: number;
    group_name: string;
    completion_time: number;
  };
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
  gameState: GameState;
  leaderboard: TournamentGroup[];
}

// ===========================
// END TOURNAMENT TYPES
// ===========================

// Legacy aliases for backward compatibility - NO DUPLICATE DECLARATIONS
export type Stage = GameStage;
export type SessionParticipant = GameParticipant;
export type Attempt = GameAttempt;
export type Puzzle = GamePuzzle;
