/**
 * AI Provider factory.
 *
 * Returns the currently configured AI provider. Swap implementations
 * here without changing any consuming code.
 *
 * Usage:
 *   import { getAIProvider } from "@/lib/ai/provider";
 *   const ai = getAIProvider();
 *   const quiz = await ai.generateQuiz({ context, numQuestions: 5 });
 */

import type { AIProvider } from "./types";

type ProviderName = "openai" | "anthropic" | "gemini";

const ACTIVE_PROVIDER: ProviderName = "openai";

export function getAIProvider(): AIProvider {
  switch (ACTIVE_PROVIDER) {
    case "openai":
      // Will be implemented in Step 5 (AI Pipeline)
      throw new Error(
        "OpenAI provider not yet implemented. See lib/ai/providers/openai.ts",
      );
    case "anthropic":
      throw new Error("Anthropic provider not yet implemented.");
    case "gemini":
      throw new Error("Gemini provider not yet implemented.");
    default:
      throw new Error(`Unknown AI provider: ${ACTIVE_PROVIDER}`);
  }
}

export { type AIProvider } from "./types";
