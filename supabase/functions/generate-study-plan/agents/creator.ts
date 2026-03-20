import { callOpenRouter, extractJson } from "../lib/openrouter.ts";
import type {
  CurriculumLesson,
  LessonContent,
  PipelineSettings,
} from "../lib/types.ts";

const BATCH_SIZE = 3;

export async function createAllLessonContent(
  apiKey: string,
  lessons: CurriculumLesson[],
  settings: PipelineSettings,
): Promise<LessonContent[]> {
  const results: LessonContent[] = [];
  for (let i = 0; i < lessons.length; i += BATCH_SIZE) {
    const batch = lessons.slice(i, i + BATCH_SIZE);
    console.log(`Creating lessons ${i + 1}-${Math.min(i + BATCH_SIZE, lessons.length)} of ${lessons.length}`);
    const batchResults = await Promise.all(
      batch.map((lesson) => createLessonContent(apiKey, lesson, settings)),
    );
    results.push(...batchResults);
  }
  return results;
}

export async function createLessonContent(
  apiKey: string,
  lesson: CurriculumLesson,
  settings: PipelineSettings,
  judgeFeedback?: string,
): Promise<LessonContent> {
  const { difficulty = "medium" } = settings;

  const difficultyGuide =
    difficulty === "easy"
      ? "Questions should test basic recall and simple concepts. Slideshows should explain things in the simplest possible terms."
      : difficulty === "hard"
        ? "Questions should challenge deep understanding and require analysis. Slideshows can assume familiarity with basics."
        : "Questions should require understanding and application. Slideshows should balance clarity with depth.";

  const languageRule =
    settings.language && settings.language !== "auto"
      ? `Write ALL content (titles, text, questions, answers, explanations) in ${settings.language}.`
      : "Write in the same language as the source text.";

  const focusRule = settings.focus?.trim()
    ? `The student specifically wants to focus on: "${settings.focus.trim()}". Emphasize this in your content.`
    : "";

  const retryClause = judgeFeedback
    ? `\n\nIMPORTANT — A reviewer found issues with a previous version of this content. Fix them:\n${judgeFeedback}`
    : "";

  const prompt = `You are an expert educational content creator. Create learning content for a single lesson.

ABSOLUTE RULE: You may ONLY use information from the SOURCE TEXT below. Do NOT add outside knowledge, general facts, or anything not present in the provided text. You may rephrase for clarity, but every fact must be traceable to the source.

LESSON: "${lesson.title}"
OBJECTIVES: ${lesson.objectives.join("; ")}

${languageRule}
${focusRule}
${difficultyGuide}

Create three types of content:

1. SLIDESHOW CARDS (6-10 slides): A mini-lecture that teaches the lesson content. Each slide has a title, body text, and key points.
2. STORY CARDS (4-6 cards): Punchy, engaging, TikTok-style cards that highlight the most interesting/important facts from the lesson. Short text, one emoji per card.
3. QUIZ (5 questions): Multiple-choice questions that test what the student learned from the slideshow/story cards.
${retryClause}

Respond with ONLY valid JSON:
{
  "summary": "2-3 sentence summary of what this lesson teaches (from the source text only)",
  "slideshowCards": [
    {
      "title": "Slide title",
      "body": "Detailed explanation (2-4 sentences)",
      "keyPoints": ["Key point 1", "Key point 2"],
      "example": "Optional example from the source text",
      "order": 0
    }
  ],
  "storyCards": [
    {
      "headline": "Attention-grabbing short headline",
      "body": "1-2 sentences — punchy, memorable",
      "emoji": "🔬",
      "order": 0
    }
  ],
  "quiz": {
    "title": "Quiz title",
    "questions": [
      {
        "question": "Question text",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": 0,
        "explanation": "Why this is correct (reference the source text)"
      }
    ]
  }
}

SOURCE TEXT:
${lesson.sourceText}`;

  const text = await callOpenRouter(apiKey, [
    { role: "user", content: prompt },
  ]);

  const parsed = JSON.parse(extractJson(text));

  return {
    lessonTitle: lesson.title,
    orderIndex: lesson.orderIndex,
    summary: parsed.summary ?? "",
    slideshowCards: (parsed.slideshowCards ?? []).map(
      (s: any, i: number) => ({
        title: s.title ?? "",
        body: s.body ?? "",
        keyPoints: s.keyPoints ?? [],
        example: s.example ?? undefined,
        order: s.order ?? i,
      }),
    ),
    storyCards: (parsed.storyCards ?? []).map(
      (s: any, i: number) => ({
        headline: s.headline ?? "",
        body: s.body ?? "",
        emoji: s.emoji ?? "📝",
        order: s.order ?? i,
      }),
    ),
    quiz: {
      title: parsed.quiz?.title ?? `${lesson.title} Quiz`,
      questions: (parsed.quiz?.questions ?? []).map((q: any) => ({
        question: q.question ?? "",
        options: q.options ?? [],
        correctAnswer: q.correctAnswer ?? 0,
        explanation: q.explanation ?? "",
      })),
    },
    sourceText: lesson.sourceText,
  };
}
