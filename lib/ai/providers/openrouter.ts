import type {
  AIProvider,
  GenerateEmbeddingParams,
  GenerateQuizParams,
  GenerateQuizResult,
  GenerateStoryCardsParams,
  GenerateStoryCardsResult,
  GenerateSummaryParams,
  GenerateStudyPlanResult,
} from "../types";

const API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY!;
const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";
//"anthropic/claude-sonnet-4.6";
//"google/gemini-2.5-flash";

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
  language: "en" | "es" | "fr" | "de" | "it" | "pt" | "ru" | "zh" = "it",
): Promise<GenerateQuizResult> {
  const prompt = `You are an expert educator. Analyze this PDF document and generate a quiz to test comprehension.

Requirements:
- Generate exactly ${numQuestions} multiple-choice questions
- Difficulty level: ${difficulty}
- Language: ${language}
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

export interface StudyPlanGenerationOptions {
  language?: string;
  difficulty?: "easy" | "medium" | "hard";
  focus?: string;
}

export async function generateStudyPlanFromPdfs(
  pdfs: Array<{ documentId: string; filename: string; dataUrl: string }>,
  collectionTitle: string,
  numLessons: number = 5,
  questionsPerLesson: number = 5,
  options: StudyPlanGenerationOptions = {},
): Promise<GenerateStudyPlanResult> {
  const { language, difficulty = "medium", focus } = options;

  const languageInstruction = language && language !== "auto"
    ? `- Write EVERYTHING (titles, descriptions, questions, answers, explanations) in ${language}`
    : "- Write everything in the same language as the documents";

  const difficultyInstruction = `- Quiz difficulty: ${difficulty}. ${
    difficulty === "easy"
      ? "Questions should test basic recall and simple concepts."
      : difficulty === "hard"
        ? "Questions should challenge deep understanding, require analysis, and involve complex reasoning."
        : "Questions should require understanding and application of concepts, not just memorization."
  }`;

  const focusInstruction = focus?.trim()
    ? `- Special instructions from the student: "${focus.trim()}". Prioritize this guidance when selecting topics and writing questions.`
    : "";

  const prompt = `You are an expert curriculum designer. You have been given ${pdfs.length} PDF document(s) from a study collection called "${collectionTitle}".

Your task is to analyze ALL the documents together and create a structured study plan that covers the material progressively, like a Duolingo course.

Requirements:
- Create exactly ${numLessons} lessons that logically build on each other
- Each lesson should cover a distinct topic or concept from the material
- Order lessons from foundational to advanced
- For each lesson, generate exactly ${questionsPerLesson} multiple-choice questions
- Questions must be grounded in the actual content of the documents
${languageInstruction}
${difficultyInstruction}${focusInstruction ? `\n${focusInstruction}` : ""}

You MUST respond with ONLY valid JSON in this exact structure, no other text:
{
  "title": "Study plan title based on the collection topic",
  "description": "2-3 sentence overview of what this study plan covers",
  "lessons": [
    {
      "title": "Lesson title",
      "summary": "2-3 sentence summary of what this lesson covers",
      "orderIndex": 0,
      "quiz": {
        "title": "Quiz title for this lesson",
        "questions": [
          {
            "question": "The question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": 0,
            "explanation": "Brief explanation of why this answer is correct"
          }
        ]
      }
    }
  ]
}`;

  const fileContentParts: ContentPart[] = pdfs.map((pdf) => ({
    type: "file" as const,
    file: {
      filename: pdf.filename,
      file_data: pdf.dataUrl,
    },
  }));

  const text = await callOpenRouter(
    [
      {
        role: "user",
        content: [{ type: "text", text: prompt }, ...fileContentParts],
      },
    ],
    DEFAULT_MODEL,
    [{ id: "file-parser", pdf: { engine: "pdf-text" } }],
  );

  const jsonStr = extractJson(text);
  const result = JSON.parse(jsonStr) as GenerateStudyPlanResult;

  if (!result.title || !result.lessons?.length) {
    throw new Error("Invalid study plan response from AI");
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
