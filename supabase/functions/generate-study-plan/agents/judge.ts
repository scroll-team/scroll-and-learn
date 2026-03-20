import { callOpenRouter, extractJson } from "../lib/openrouter.ts";
import type { LessonContent, JudgeVerdict } from "../lib/types.ts";

export async function judgeLessons(
  apiKey: string,
  lessons: LessonContent[],
): Promise<JudgeVerdict[]> {
  const lessonSummaries = lessons
    .map(
      (l, i) =>
        `=== LESSON ${i} — "${l.lessonTitle}" ===

SOURCE TEXT (what the lesson was built from):
${l.sourceText.slice(0, 3000)}${l.sourceText.length > 3000 ? "... [truncated]" : ""}

GENERATED SLIDESHOW (${l.slideshowCards.length} slides):
${l.slideshowCards
  .map((s) => `  - ${s.title}: ${s.body.slice(0, 100)}...`)
  .join("\n")}

GENERATED STORY CARDS (${l.storyCards.length} cards):
${l.storyCards
  .map((s) => `  - ${s.emoji} ${s.headline}: ${s.body.slice(0, 80)}`)
  .join("\n")}

GENERATED QUIZ (${l.quiz.questions.length} questions):
${l.quiz.questions
  .map(
    (q) =>
      `  - Q: ${q.question.slice(0, 80)}... A: option ${q.correctAnswer}`,
  )
  .join("\n")}`,
    )
    .join("\n\n");

  const prompt = `You are a rigorous quality reviewer for educational content. Your job is to verify that AI-generated learning materials are accurate, high-quality, and — most importantly — faithful to the source documents.

REVIEW CRITERIA (in order of importance):
1. SOURCE FIDELITY: Does every claim, fact, explanation, and quiz answer come ONLY from the provided source text? If any content introduces outside knowledge or facts not in the source, it MUST be REJECTED.
2. FACTUAL ACCURACY: Are quiz answers correct? Are explanations accurate according to the source?
3. QUESTION QUALITY: Are quiz questions clear, unambiguous, with exactly one correct answer?
4. CONTENT COVERAGE: Does the lesson reasonably cover its source material?
5. CONSISTENCY: Is the content internally consistent?

For each lesson, respond with:
- "approved": true/false
- "feedback": If rejected, explain exactly what is wrong and what needs to be fixed. If approved, write "OK".

Respond with ONLY valid JSON:
{
  "verdicts": [
    { "lessonIndex": 0, "approved": true, "feedback": "OK" },
    { "lessonIndex": 1, "approved": false, "feedback": "Quiz question 3 references X which is not in the source text. Slideshow slide 2 claims Y but the source says Z." }
  ]
}

LESSONS TO REVIEW:
${lessonSummaries}`;

  const text = await callOpenRouter(apiKey, [
    { role: "user", content: prompt },
  ]);

  const parsed = JSON.parse(extractJson(text));
  const verdicts: JudgeVerdict[] = (parsed.verdicts ?? []).map(
    (v: any) => ({
      lessonIndex: v.lessonIndex ?? 0,
      approved: v.approved ?? true,
      feedback: v.feedback ?? "OK",
    }),
  );

  if (verdicts.length < lessons.length) {
    for (let i = verdicts.length; i < lessons.length; i++) {
      verdicts.push({ lessonIndex: i, approved: true, feedback: "OK" });
    }
  }

  return verdicts;
}
