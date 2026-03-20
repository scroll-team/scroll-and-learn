const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | ContentPart[];
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "file"; file: { filename: string; file_data: string } };

const MAX_API_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 10000];

export async function callOpenRouter(
  apiKey: string,
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  plugins?: unknown[],
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_API_RETRIES; attempt++) {
    try {
      const response = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "LearnAnything",
        },
        body: JSON.stringify({ model, messages, plugins }),
      });

      if (response.status === 429 || response.status >= 500) {
        const err = await response.text();
        lastError = new Error(`OpenRouter API error (${response.status}): ${err}`);
        console.warn(`OpenRouter ${response.status}, attempt ${attempt + 1}/${MAX_API_RETRIES}`);
        if (attempt < MAX_API_RETRIES - 1) {
          await sleep(RETRY_DELAYS[attempt]);
          continue;
        }
        throw lastError;
      }

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${err}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("No content returned from OpenRouter");
      return text;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("OpenRouter API error")) {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_API_RETRIES - 1) {
        console.warn(`OpenRouter fetch error, attempt ${attempt + 1}/${MAX_API_RETRIES}:`, lastError.message);
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
    }
  }
  throw lastError ?? new Error("OpenRouter call failed after retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];
  return text;
}

export type { ChatMessage, ContentPart };
