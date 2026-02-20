import type { AIProvider } from "./types";
import { openrouterProvider } from "./providers/openrouter";

type ProviderName = "openrouter" | "openai" | "anthropic" | "gemini";

const ACTIVE_PROVIDER: ProviderName = "openrouter";

export function getAIProvider(): AIProvider {
  switch (ACTIVE_PROVIDER) {
    case "openrouter":
      return openrouterProvider;
    case "openai":
      throw new Error("OpenAI provider not yet implemented.");
    case "anthropic":
      throw new Error("Anthropic provider not yet implemented.");
    case "gemini":
      throw new Error("Gemini provider not yet implemented.");
    default:
      throw new Error(`Unknown AI provider: ${ACTIVE_PROVIDER}`);
  }
}

export { type AIProvider } from "./types";
