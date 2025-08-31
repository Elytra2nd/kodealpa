// resources/js/types/game.ts

export interface Stage {
  id: number;
  mission_id: number;
  name: string;
  config: {
    timeLimit: number;
    difficulty?: string;
    learningObjectives?: string[];
    puzzles: Array<{
      key: string;
      type?: string; // Add type field
      title?: string;
      description?: string;
      symbols?: string[];
      mapping?: Record<string, string>;
      // Stage 2 additions
      sequences?: any[];
      hints?: string[];
      challenges?: any[];
      tree?: any;
      traversalMethods?: any;
      codeSnippet?: string[];
      testInput?: any;
      expectedOutput?: any;
      bugs?: any[];
      solutions?: any[];
    }>;
  };
  mission?: Mission;
}

export interface Mission {
  id: number;
  code: string;
  title: string;
  description: string;
}

export interface GameSession {
  id: number;
  team_code: string;
  status: 'waiting' | 'running' | 'success' | 'failed' | 'paused' | 'ended';
  started_at?: string;
  ends_at?: string;
  participants: SessionParticipant[]; // Always array
  attempts: Attempt[]; // Always array
  stage?: Stage;
  // Stage 2 additions
  learning_progress?: any[];
  hint_count?: number;
  peer_feedback?: any[];
  collaboration_score?: number;
}

export interface SessionParticipant {
  id: number;
  game_session_id: number;
  role: 'defuser' | 'expert';
  nickname: string;
  created_at?: string;
  updated_at?: string;
}

export interface Attempt {
  id: number;
  game_session_id: number;
  puzzle_key: string;
  input: string;
  is_correct: boolean;
  created_at: string;
  updated_at?: string;
}

// Enhanced Puzzle interface for different types
export interface Puzzle {
  key: string;
  type?: string;
  title?: string;
  description?: string;
  learningObjectives?: string[];

  // Symbol mapping (Stage 1)
  symbols?: string[];
  mapping?: Record<string, string>;
  mappingAvailableTo?: 'expert' | 'defuser';

  // Code analysis (Stage 2)
  codeSnippet?: string[];
  testInput?: any;
  expectedOutput?: any;
  defuserView?: {
    codeLines?: string[];
    testCase?: {
      input: any;
      expected: any;
    };
    pattern?: any[];
    hints?: string[];
    sequenceId?: number;
    task?: string;
    traversalOptions?: string[];
  };
  expertView?: {
    bugs?: Array<{
      line: number;
      type: string;
      description: string;
      hint: string;
    }>;
    solutions?: Array<{
      line: number;
      correct: string;
    }>;
    rule?: string;
    answer?: any;
    category?: string;
    tree?: any;
    explanation?: string;
    traversalMethods?: Record<string, any[]>;
  };

  // Pattern analysis
  sequences?: Array<{
    id: number;
    pattern: any[];
    rule: string;
    answer: any;
    category: string;
  }>;
  hints?: string[];

  // Navigation challenge
  tree?: any;
  challenges?: Array<{
    task: string;
    answer: string[];
    explanation: string;
  }>;
  traversalMethods?: Record<string, any[]>;
}

export interface GameState {
  session: GameSession;
  puzzle: Puzzle;
  serverTime: string;
}
