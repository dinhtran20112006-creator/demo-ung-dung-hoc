// Shared interfaces, moved from App.tsx
export interface StudyRecord {
    confidence: string;
    id: number;
    date: string;
}

export interface Topic {
    id: number;
    question: string;
    answer: string;
    studies: StudyRecord[];
    isAI: boolean;
    stability?: number;
    interval?: number;
    repetitions?: number;
    dueDate?: string;
    algorithm?: string;
    difficulty?: 'easy' | 'medium' | 'hard' | string | number;
    type?: 'concept' | 'application' | 'analysis' | 'evaluation' | string;
    createdAt?: string;
    chapterId?: number;
    chapterName?: string;
    feedback?: 'good' | 'bad' | null;
}

export interface Chapter {
    id: number;
    name: string;
    topics: Topic[];
    feynmanNotes: string;
}

export interface Subject {
    id: number;
    name: string;
    chapters: Chapter[];
}

export interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    unlocked: boolean;
    date?: string;
}

export interface AIPromptVersion {
  id: string;
  name: string;
  prompt: string;
  qualityScore: number;
  usageCount: number;
  positiveFeedback: number;
  negativeFeedback: number;
  isDefault?: boolean;
}

export interface AIQuestionQuality {
  promptVersion: string;
  topicId: number;
  feedback: 'good' | 'bad' | null;
  userRating?: number;
  autoQualityScore: number;
}


// Interfaces for the new Quiz feature
export interface QuizConfig {
  id: string;
  name: string;
  subjectId: number;
  chapterIds: number[];
  questionCount: number;
  timeLimit: number; // in minutes
  questionTypes: QuestionType[];
  difficulties: ('easy' | 'medium' | 'hard')[];
  scoring: {
    pointsPerQuestion: number;
    timeBonus: boolean;
    streakBonus: boolean;
    penaltyForWrong: boolean;
  };
  retryMode: 'immediate' | 'end' | 'none';
  showExplanations: boolean;
}

export interface QuizSession {
  id: string;
  config: QuizConfig;
  questions: QuizQuestion[];
  userAnswers: UserAnswer[];
  startTime: Date;
  endTime?: Date;
  currentQuestionIndex: number;
  status: 'active' | 'completed' | 'paused';
  score: number;
  streak: number;
  maxStreak: number;
  timeSpent: number;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  timeAllotted: number; // seconds
  topicId?: number;
  metadata?: {
    imageUrl?: string;
    codeSnippet?: string;
    hint?: string;
  };
}

export interface UserAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  confidence?: number;
  timestamp: Date;
}

export type QuestionType = 
  | 'multiple-choice' 
  | 'true-false' 
  | 'fill-blank' 
  | 'short-answer'
  | 'matching'
  | 'ordering';

export interface QuizResult {
  session: QuizSession;
  totalScore: number;
  maxPossibleScore: number;
  accuracy: number;
  averageTimePerQuestion: number;
  categoryBreakdown: {
    byType: { [type: string]: { correct: number; total: number; accuracy: number } };
    byDifficulty: { [difficulty: string]: { correct: number; total: number; accuracy: number } };
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  rank: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  badgesEarned: string[];
}