import type {
  AIProvider,
  GenerateEmbeddingParams,
  GenerateQuizParams,
  GenerateQuizResult,
  GenerateStoryCardsParams,
  GenerateStoryCardsResult,
  GenerateSummaryParams,
} from "../types";

const API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY!;
const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | ContentPart[];
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "file"; file: { filename: string; file_data: string } };

async function callOpenRouter(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  plugins?: any[],
): Promise<string> {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "X-Title": "LearnAnything",
    },
    body: JSON.stringify({
      model,
      messages,
      plugins,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("No content returned from OpenRouter");
  }

  return text;
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];
  return text;
}

export async function generateQuizFromPdfDataUrl(
  pdfDataUrl: string,
  numQuestions: number = 5,
  difficulty: "easy" | "medium" | "hard" = "medium",
): Promise<GenerateQuizResult> {
  const prompt = `You are an expert educator. Analyze this PDF document and generate a quiz to test comprehension.

Requirements:
- Generate exactly ${numQuestions} multiple-choice questions
- Difficulty level: ${difficulty}
- Each question should have exactly 4 options
- Questions should cover the most important concepts in the document
- Explanations should be concise but educational

You MUST respond with ONLY valid JSON in this exact structure, no other text:
{
  "title": "Quiz title based on the document topic",
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}`;

  const text = await callOpenRouter(
    [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "file",
            file: {
              filename: "document.pdf",
              file_data: pdfDataUrl,
            },
          },
        ],
      },
    ],
    DEFAULT_MODEL,
    [{ id: "file-parser", pdf: { engine: "pdf-text" } }],
  );

  const jsonStr = extractJson(text);
  const result = JSON.parse(jsonStr) as GenerateQuizResult;

  if (!result.title || !result.questions?.length) {
    throw new Error("Invalid quiz response from AI");
  }

  return result;
}

export const openrouterProvider: AIProvider = {
  name: "openrouter",

  async generateQuiz(params: GenerateQuizParams): Promise<GenerateQuizResult> {
    const prompt = `You are an expert educator. Based on the following content, generate a quiz.

Content:
${params.context}

Requirements:
- Generate exactly ${params.numQuestions} multiple-choice questions
- Difficulty: ${params.difficulty ?? "medium"}
- Each question has exactly 4 options
- Cover the most important concepts

You MUST respond with ONLY valid JSON in this exact structure, no other text:
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation"
    }
  ]
}`;

    const text = await callOpenRouter([{ role: "user", content: prompt }]);
    const jsonStr = extractJson(text);
    return JSON.parse(jsonStr) as GenerateQuizResult;
  },

  async generateStoryCards(
    _params: GenerateStoryCardsParams,
  ): Promise<GenerateStoryCardsResult> {
    throw new Error("Story cards not yet implemented");
  },

  async generateSummary(_params: GenerateSummaryParams): Promise<string> {
    throw new Error("Summary not yet implemented");
  },

  async generateEmbedding(_params: GenerateEmbeddingParams): Promise<number[]> {
    throw new Error("Embeddings not yet implemented");
  },
};
