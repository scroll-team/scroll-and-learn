/**
 * Shared type definitions for LearnAnything.
 *
 * As the app grows, split into domain-specific files:
 *   types/auth.ts, types/documents.ts, types/quiz.ts, etc.
 * Re-export everything from this barrel file.
 */

// ── Auth ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

// ── Documents ───────────────────────────────────────────────────────────────

export type DocumentStatus = "uploaded" | "processing" | "ready" | "error";

export interface Document {
  id: string;
  userId: string;
  title: string;
  filePath: string;
  status: DocumentStatus;
  pageCount: number | null;
  createdAt: string;
}

// ── Quizzes ─────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  documentId: string;
  title: string;
  questions: QuizQuestion[];
  difficulty: "easy" | "medium" | "hard";
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  answers: number[];
  completedAt: string;
}

// ── Story Cards ─────────────────────────────────────────────────────────────

export interface StoryCard {
  headline: string;
  body: string;
  visualPrompt: string;
  order: number;
}

export interface StoryDeck {
  id: string;
  documentId: string;
  title: string;
  cards: StoryCard[];
  createdAt: string;
}

// ── User Stats ──────────────────────────────────────────────────────────────

export interface UserStats {
  userId: string;
  xpTotal: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  documentsProcessed: number;
  quizzesCompleted: number;
}
