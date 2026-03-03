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

// ── Collections ─────────────────────────────────────────────────────────────

export type CollectionStatus = "active" | "processing" | "ready" | "error";

export interface Collection {
  id: string;
  userId: string;
  title: string;
  emoji: string;
  status: CollectionStatus;
  createdAt: string;
  updatedAt: string;
  /** Populated client-side when fetching collections with document count */
  documentCount?: number;
}

// ── Documents ───────────────────────────────────────────────────────────────

export type DocumentStatus = "uploaded" | "processing" | "ready" | "error";

export interface Document {
  id: string;
  userId: string;
  collectionId: string | null;
  title: string;
  filePath: string;
  fileSize: number | null;
  status: DocumentStatus;
  pageCount: number | null;
  createdAt: string;
}

// ── Study Plans ──────────────────────────────────────────────────────────────

export type StudyPlanStatus = "generating" | "ready" | "error";

export interface StudyPlan {
  id: string;
  collectionId: string;
  userId: string;
  title: string;
  description: string | null;
  status: StudyPlanStatus;
  createdAt: string;
  /** Populated client-side */
  lessons?: Lesson[];
}

// ── Lessons ──────────────────────────────────────────────────────────────────

export interface Lesson {
  id: string;
  studyPlanId: string;
  userId: string;
  title: string;
  summary: string | null;
  orderIndex: number;
  createdAt: string;
  /** Populated client-side */
  quiz?: Quiz;
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
  documentId: string | null;
  lessonId: string | null;
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
