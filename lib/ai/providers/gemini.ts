import type {
  AIProvider,
  GenerateQuizParams,
  GenerateQuizResult,
  GenerateStoryCardsParams,
  GenerateStoryCardsResult,
  GenerateSummaryParams,
  GenerateEmbeddingParams,
} from "../types";

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY!;
const GEMINI_MODEL = "gemini-2.0-flash";
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`;

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

async function callGemini(
  parts: GeminiPart[],
  jsonMode = true,
): Promise<string> {
  const response = await fetch(
    `${BASE_URL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: jsonMode
          ? { responseMimeType: "application/json" }
          : undefined,
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No content returned from Gemini");
  }

  return text;
}

export async function generateQuizFromPdf(
  pdfBase64: string,
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

Respond with this exact JSON structure:
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

  const text = await callGemini([
    { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
    { text: prompt },
  ]);

  const result = JSON.parse(text) as GenerateQuizResult;

  if (!result.title || !result.questions?.length) {
    throw new Error("Invalid quiz response from Gemini");
  }

  return result;
}

export const geminiProvider: AIProvider = {
  name: "gemini",

  async generateQuiz(params: GenerateQuizParams): Promise<GenerateQuizResult> {
    const prompt = `You are an expert educator. Based on the following content, generate a quiz.

Content:
${params.context}

Requirements:
- Generate exactly ${params.numQuestions} multiple-choice questions
- Difficulty: ${params.difficulty ?? "medium"}
- Each question has exactly 4 options
- Cover the most important concepts

Respond with this exact JSON structure:
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

    const text = await callGemini([{ text: prompt }]);
    return JSON.parse(text) as GenerateQuizResult;
  },

  async generateStoryCards(
    _params: GenerateStoryCardsParams,
  ): Promise<GenerateStoryCardsResult> {
    throw new Error("Story cards not yet implemented for Gemini provider");
  },

  async generateSummary(_params: GenerateSummaryParams): Promise<string> {
    throw new Error("Summary not yet implemented for Gemini provider");
  },

  async generateEmbedding(_params: GenerateEmbeddingParams): Promise<number[]> {
    throw new Error("Embeddings not yet implemented for Gemini provider");
  },
};
