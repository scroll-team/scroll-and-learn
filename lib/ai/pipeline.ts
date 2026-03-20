/**
 * Client-side AI pipeline agents.
 * All AI work runs on the user's device via OpenRouter — no Edge Function timeouts.
 *
 * Key design decisions:
 * - The Architect never copies raw source text into its JSON output (avoids LaTeX
 *   escape sequences and token bloat). It only outputs lesson metadata + references.
 * - Source text for each lesson is assembled programmatically from stored extracts.
 * - safeJsonParse() handles models that produce invalid JSON escape sequences.
 */

import { callOpenRouter } from "./providers/openrouter";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface PipelineSettings {
  language?: string;
  difficulty?: "easy" | "medium" | "hard";
  focus?: string;
}

export interface ExtractedDocument {
  documentId: string;
  title: string;
  extractedText: string;
  outline: {
    mainSubject: string;
    totalPages: number | null;
    topics: Array<{
      title: string;
      startSection: string;
      endSection: string;
      summary: string;
    }>;
  };
}

export interface CurriculumLesson {
  title: string;
  objectives: string[];
  sourceText: string;
  orderIndex: number;
}

export interface Curriculum {
  title: string;
  description: string;
  lessons: CurriculumLesson[];
}

export interface SlideshowSlide {
  title: string;
  body: string;
  keyPoints: string[];
  example?: string;
  order: number;
}

export interface StoryCardItem {
  headline: string;
  body: string;
  emoji: string;
  order: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface LessonContent {
  lessonTitle: string;
  orderIndex: number;
  summary: string;
  slideshowCards: SlideshowSlide[];
  storyCards: StoryCardItem[];
  quiz: { title: string; questions: QuizQuestion[] };
  sourceText: string;
}

export interface JudgeVerdict {
  lessonIndex: number;
  approved: boolean;
  feedback: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const MAX_RETRIES = 2;
const BATCH_SIZE = 3;
// Chars of source text passed per lesson to the Creator agent
const MAX_SOURCE_CHARS_PER_LESSON = 12_000;

// ── JSON parsing helpers ──────────────────────────────────────────────────────

/**
 * Extracts a JSON object or array from a possibly-decorated AI response.
 * Handles ```json ... ``` fences and bare JSON objects.
 */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Find the outermost JSON object
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1);
  return text;
}

/**
 * Sanitizes invalid JSON escape sequences produced by AI models when they
 * embed raw document text (LaTeX \chapter, \section, etc.) into JSON strings.
 * Valid JSON escapes: \" \\ \/ \b \f \n \r \t \uXXXX
 */
function sanitizeJsonEscapes(json: string): string {
  // Replace \X where X is NOT a valid JSON escape character with \\X
  return json.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");
}

/**
 * Robustly parses AI-generated JSON with multiple fallback strategies.
 * 1. Direct parse
 * 2. Sanitize invalid escape sequences (handles \p, \c, \s etc. from LaTeX docs)
 * 3. Strip all backslashes except valid JSON escapes more aggressively
 * 4. Give up with a clear error
 */
function safeJsonParse(text: string): any {
  const raw = extractJson(text);

  // Attempt 1: direct parse
  try { return JSON.parse(raw); } catch { /* continue */ }

  // Attempt 2: sanitize invalid escape sequences
  try { return JSON.parse(sanitizeJsonEscapes(raw)); } catch { /* continue */ }

  // Attempt 3: more aggressive — replace ALL backslashes, then restore valid ones
  try {
    const aggressive = raw
      .replace(/\\(["\\\/bfnrt])/g, "\x00VALID$1\x00") // protect valid escapes
      .replace(/\\u([0-9a-fA-F]{4})/g, "\x00VALIDu$1\x00") // protect \uXXXX
      .replace(/\\/g, "\\\\") // escape all remaining lone backslashes
      .replace(/\x00VALID([^u\x00])\x00/g, "\\$1") // restore valid escapes
      .replace(/\x00VALIDu([0-9a-fA-F]{4})\x00/g, "\\u$1"); // restore \uXXXX
    return JSON.parse(aggressive);
  } catch { /* continue */ }

  throw new Error(`Could not parse AI response as JSON. Response preview: ${raw.slice(0, 300)}`);
}

// ── Prompt helpers ────────────────────────────────────────────────────────────

function buildConstraints(settings: PipelineSettings): string {
  const parts: string[] = [];
  if (settings.language && settings.language !== "auto") {
    parts.push(`- Write ALL output (titles, descriptions, objectives) in ${settings.language}`);
  } else {
    parts.push("- Write output in the same language as the source documents");
  }
  if (settings.focus?.trim()) {
    parts.push(`- The student asked to focus on: "${settings.focus.trim()}". Prioritize related topics.`);
  }
  return parts.join("\n");
}

// ── Source text assembly ──────────────────────────────────────────────────────

/**
 * Given a lesson's source references from the Architect, extracts the relevant
 * text from the stored document extracts. Never requires the AI to copy text.
 */
function assembleSourceText(
  sources: Array<{ documentTitle: string; topicTitles?: string[]; sectionKeywords?: string[] }>,
  extracts: ExtractedDocument[],
  fallbackCharsPerDoc = 6_000,
): string {
  const parts: string[] = [];

  for (const src of sources) {
    const doc = extracts.find(
      (e) => e.title.toLowerCase().trim() === src.documentTitle?.toLowerCase().trim(),
    );
    if (!doc) continue;

    const fullText = doc.extractedText;

    // Try to find relevant sections by topic titles from the outline
    const topicTitles = src.topicTitles ?? [];
    const sectionTexts: string[] = [];

    for (const topicTitle of topicTitles) {
      const topic = doc.outline.topics.find(
        (t) => t.title.toLowerCase().includes(topicTitle.toLowerCase()) ||
               topicTitle.toLowerCase().includes(t.title.toLowerCase()),
      );
      if (topic && topic.startSection) {
        const startIdx = fullText.indexOf(topic.startSection);
        if (startIdx >= 0) {
          // Take text from startSection up to ~6000 chars
          sectionTexts.push(fullText.slice(startIdx, startIdx + 6_000));
          continue;
        }
      }
      // Fall back: search for the topic title directly in the text
      const keywordIdx = fullText.toLowerCase().indexOf(topicTitle.toLowerCase());
      if (keywordIdx >= 0) {
        sectionTexts.push(fullText.slice(Math.max(0, keywordIdx - 200), keywordIdx + 5_000));
      }
    }

    if (sectionTexts.length > 0) {
      parts.push(`=== ${doc.title} ===\n${sectionTexts.join("\n\n---\n\n")}`);
    } else {
      // No specific sections found — use the beginning of the document
      parts.push(`=== ${doc.title} ===\n${fullText.slice(0, fallbackCharsPerDoc)}`);
    }
  }

  return parts.join("\n\n").slice(0, MAX_SOURCE_CHARS_PER_LESSON);
}

/**
 * Simple fallback: split the combined extracted text evenly across N lessons.
 */
function splitTextIntoLessonChunks(
  extracts: ExtractedDocument[],
  numLessons: number,
): string[] {
  const combined = extracts
    .map((e) => `=== ${e.title} ===\n${e.extractedText}`)
    .join("\n\n");

  const chunkSize = Math.ceil(combined.length / numLessons);
  const chunks: string[] = [];
  for (let i = 0; i < numLessons; i++) {
    chunks.push(combined.slice(i * chunkSize, (i + 1) * chunkSize + 500)); // 500 char overlap
  }
  return chunks;
}

// ── Agent 1: Architect ────────────────────────────────────────────────────────

export async function designCurriculum(
  extracts: ExtractedDocument[],
  collectionTitle: string,
  settings: PipelineSettings,
): Promise<Curriculum> {
  const numLessons = Math.min(Math.max(extracts.length * 2, 3), 8);

  // Build a compact document summary for the Architect (NO raw text — only metadata)
  const docSummary = extracts
    .map((e) => {
      const topicList = e.outline.topics.length > 0
        ? e.outline.topics.map((t) => `    - "${t.title}": ${t.summary}`).join("\n")
        : "    (no structured topics detected)";
      return `Document: "${e.title}"\nSubject: ${e.outline.mainSubject || "Unknown"}\nTopics:\n${topicList}`;
    })
    .join("\n\n");

  const prompt = `You are an expert curriculum designer. Below are the topics and structure of ${extracts.length} document(s) from a study collection called "${collectionTitle}".

CRITICAL RULES:
- Only create lessons about topics ACTUALLY PRESENT in the documents listed below
- Do NOT invent topics or add outside knowledge
- Every lesson objective must reference content from the listed documents

Design exactly ${numLessons} lessons.
${buildConstraints(settings)}

For each lesson, specify:
1. A clear title
2. 2-3 learning objectives grounded in the documents
3. Which documents and topic titles each lesson should cover (so the source text can be retrieved)

IMPORTANT: Do NOT copy or quote any document text. Only reference document titles and topic names.

Respond with ONLY valid JSON (no other text):
{
  "title": "Curriculum title",
  "description": "2-3 sentence overview of the full curriculum",
  "lessons": [
    {
      "title": "Lesson title",
      "objectives": ["Objective 1", "Objective 2"],
      "orderIndex": 0,
      "sources": [
        {
          "documentTitle": "Exact document title from the list below",
          "topicTitles": ["Exact topic title 1", "Exact topic title 2"]
        }
      ]
    }
  ]
}

AVAILABLE DOCUMENTS:
${docSummary}`;

  const text = await callOpenRouter([{ role: "user", content: prompt }]);
  const parsed = safeJsonParse(text);

  if (!parsed.title || !parsed.lessons?.length) {
    throw new Error("Invalid curriculum response from Architect agent");
  }

  // Assemble source text for each lesson programmatically (no AI text copying)
  const textChunks = splitTextIntoLessonChunks(extracts, parsed.lessons.length);

  const lessons: CurriculumLesson[] = parsed.lessons.map((l: any, idx: number) => {
    let sourceText = "";

    if (l.sources?.length) {
      sourceText = assembleSourceText(l.sources, extracts);
    }

    // Fallback to evenly-split chunk if no source text found
    if (!sourceText || sourceText.length < 200) {
      sourceText = textChunks[idx] ?? extracts[0]?.extractedText?.slice(0, MAX_SOURCE_CHARS_PER_LESSON) ?? "";
    }

    return {
      title: l.title ?? `Lesson ${idx + 1}`,
      objectives: l.objectives ?? [],
      sourceText,
      orderIndex: l.orderIndex ?? idx,
    };
  });

  return {
    title: parsed.title,
    description: parsed.description ?? "",
    lessons,
  };
}

// ── Agent 2: Content Creator ──────────────────────────────────────────────────

export async function createAllLessonContent(
  lessons: CurriculumLesson[],
  settings: PipelineSettings,
): Promise<LessonContent[]> {
  const results: LessonContent[] = [];
  for (let i = 0; i < lessons.length; i += BATCH_SIZE) {
    const batch = lessons.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((lesson) => createLessonContent(lesson, settings)),
    );
    results.push(...batchResults);
  }
  return results;
}

export async function createLessonContent(
  lesson: CurriculumLesson,
  settings: PipelineSettings,
  judgeFeedback?: string,
  _attempt = 0,
): Promise<LessonContent> {
  // Retry up to 2 times on parse failures before propagating the error
  try {
    return await _createLessonContent(lesson, settings, judgeFeedback);
  } catch (err) {
    if (_attempt < 2) {
      console.warn(`createLessonContent attempt ${_attempt + 1} failed for "${lesson.title}", retrying...`);
      return createLessonContent(lesson, settings, judgeFeedback, _attempt + 1);
    }
    throw err;
  }
}

async function _createLessonContent(
  lesson: CurriculumLesson,
  settings: PipelineSettings,
  judgeFeedback?: string,
): Promise<LessonContent> {
  const { difficulty = "medium" } = settings;

  const difficultyGuide =
    difficulty === "easy"
      ? "Questions should test basic recall. Slideshows should use the simplest possible language."
      : difficulty === "hard"
        ? "Questions should challenge deep understanding and require analysis."
        : "Questions should require understanding and application of concepts.";

  const languageRule =
    settings.language && settings.language !== "auto"
      ? `Write ALL content (titles, body text, questions, answers, explanations) in ${settings.language}.`
      : "Write in the same language as the source text.";

  const focusRule = settings.focus?.trim()
    ? `The student wants to focus on: "${settings.focus.trim()}". Emphasize this in your content.`
    : "";

  const retryClause = judgeFeedback
    ? `\n\nA reviewer rejected a previous version. Fix these issues:\n${judgeFeedback}`
    : "";

  const prompt = `You are an expert educational content creator. Create learning content for one lesson.

ABSOLUTE RULE: Use ONLY information from the SOURCE TEXT below. Do NOT add outside knowledge.

LESSON: "${lesson.title}"
OBJECTIVES: ${lesson.objectives.join("; ")}

${languageRule}
${focusRule ? focusRule + "\n" : ""}${difficultyGuide}
${retryClause}

Create the following and respond with ONLY valid JSON:
{
  "summary": "2-3 sentence summary of what this lesson teaches (from source text only)",
  "slideshowCards": [
    {"title": "Slide title", "body": "2-4 sentence explanation", "keyPoints": ["Key point 1", "Key point 2"], "example": "Optional example from source", "order": 0}
  ],
  "storyCards": [
    {"headline": "Short punchy headline", "body": "1-2 sentences", "emoji": "📚", "order": 0}
  ],
  "quiz": {
    "title": "Quiz title",
    "questions": [
      {"question": "Question text", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "Why this is correct per the source text"}
    ]
  }
}

Rules:
- slideshowCards: 6-10 slides (mini-lecture)
- storyCards: 4-6 cards (TikTok-style, one emoji each)
- quiz: exactly 5 multiple-choice questions

SOURCE TEXT:
${lesson.sourceText}`;

  const text = await callOpenRouter([{ role: "user", content: prompt }]);
  const parsed = safeJsonParse(text);

  return {
    lessonTitle: lesson.title,
    orderIndex: lesson.orderIndex,
    summary: parsed.summary ?? "",
    slideshowCards: (parsed.slideshowCards ?? []).map((s: any, i: number) => ({
      title: s.title ?? "",
      body: s.body ?? "",
      keyPoints: Array.isArray(s.keyPoints) ? s.keyPoints : [],
      example: s.example ?? undefined,
      order: s.order ?? i,
    })),
    storyCards: (parsed.storyCards ?? []).map((s: any, i: number) => ({
      headline: s.headline ?? "",
      body: s.body ?? "",
      emoji: s.emoji ?? "📝",
      order: s.order ?? i,
    })),
    quiz: {
      title: parsed.quiz?.title ?? `${lesson.title} Quiz`,
      questions: (parsed.quiz?.questions ?? []).map((q: any) => ({
        question: q.question ?? "",
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: typeof q.correctAnswer === "number" ? q.correctAnswer : 0,
        explanation: q.explanation ?? "",
      })),
    },
    sourceText: lesson.sourceText,
  };
}

// ── Agent 3: Judge ────────────────────────────────────────────────────────────

export async function judgeLessons(lessons: LessonContent[]): Promise<JudgeVerdict[]> {
  const lessonSummaries = lessons
    .map((l, i) => {
      const slides = l.slideshowCards
        .map((s) => `  - ${s.title}: ${s.body.slice(0, 120)}`)
        .join("\n");
      const stories = l.storyCards
        .map((s) => `  - ${s.emoji} ${s.headline}: ${s.body.slice(0, 80)}`)
        .join("\n");
      const quiz = l.quiz.questions
        .map((q) => `  - Q: ${q.question.slice(0, 80)} | Answer: option ${q.correctAnswer}`)
        .join("\n");
      const src = l.sourceText.slice(0, 2_000) + (l.sourceText.length > 2_000 ? "…[truncated]" : "");
      return [
        `=== LESSON ${i}: "${l.lessonTitle}" ===`,
        `SOURCE (first 2000 chars):\n${src}`,
        `SLIDESHOW (${l.slideshowCards.length} slides):\n${slides}`,
        `STORY CARDS (${l.storyCards.length} cards):\n${stories}`,
        `QUIZ (${l.quiz.questions.length} questions):\n${quiz}`,
      ].join("\n\n");
    })
    .join("\n\n" + "─".repeat(60) + "\n\n");

  const prompt = `You are a quality reviewer for educational content. Your job: verify AI-generated materials are faithful to their source documents.

REVIEW CRITERIA (most important first):
1. SOURCE FIDELITY: Every fact, claim, and quiz answer must come ONLY from the provided source text. Any outside knowledge = REJECT.
2. FACTUAL ACCURACY: Quiz answers must be correct per the source.
3. QUESTION QUALITY: Questions must be clear with exactly one correct answer.
4. CONTENT COVERAGE: Lesson should reasonably cover its source material.

For each lesson output approved (true/false) and feedback.

Respond with ONLY valid JSON:
{
  "verdicts": [
    { "lessonIndex": 0, "approved": true, "feedback": "OK" },
    { "lessonIndex": 1, "approved": false, "feedback": "Specific issues to fix" }
  ]
}

LESSONS:
${lessonSummaries}`;

  const text = await callOpenRouter([{ role: "user", content: prompt }]);
  const parsed = safeJsonParse(text);

  const verdicts: JudgeVerdict[] = (parsed.verdicts ?? []).map((v: any) => ({
    lessonIndex: typeof v.lessonIndex === "number" ? v.lessonIndex : 0,
    approved: v.approved !== false, // default to approved if missing
    feedback: v.feedback ?? "OK",
  }));

  // Fill missing verdicts as approved
  for (let i = verdicts.length; i < lessons.length; i++) {
    verdicts.push({ lessonIndex: i, approved: true, feedback: "OK" });
  }

  return verdicts;
}
