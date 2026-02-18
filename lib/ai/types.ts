/**
 * AI Provider abstraction layer.
 *
 * Every AI provider (OpenAI, Claude, Gemini, etc.) implements this interface.
 * The app never calls a specific provider directly -- always go through
 * the provider factory in ./provider.ts.
 */

import type { QuizQuestion, StoryCard } from "@/types";

export interface GenerateQuizParams {
  context: string;
  numQuestions: number;
  difficulty?: "easy" | "medium" | "hard";
}

export interface GenerateQuizResult {
  title: string;
  questions: QuizQuestion[];
}

export interface GenerateStoryCardsParams {
  context: string;
  numCards: number;
}

export interface GenerateStoryCardsResult {
  title: string;
  cards: StoryCard[];
}

export interface GenerateSummaryParams {
  context: string;
  maxLength?: number;
}

export interface GenerateEmbeddingParams {
  text: string;
}

export interface AIProvider {
  readonly name: string;

  generateQuiz(params: GenerateQuizParams): Promise<GenerateQuizResult>;
  generateStoryCards(
    params: GenerateStoryCardsParams,
  ): Promise<GenerateStoryCardsResult>;
  generateSummary(params: GenerateSummaryParams): Promise<string>;
  generateEmbedding(params: GenerateEmbeddingParams): Promise<number[]>;
}
