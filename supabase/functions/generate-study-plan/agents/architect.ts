import { callOpenRouter, extractJson } from "../lib/openrouter.ts";
import type {
  ExtractedDocument,
  Curriculum,
  PipelineSettings,
} from "../lib/types.ts";

const MAX_CONTEXT_CHARS = 200_000;

export async function designCurriculum(
  apiKey: string,
  extracts: ExtractedDocument[],
  collectionTitle: string,
  settings: PipelineSettings,
): Promise<Curriculum> {
  const totalChars = extracts.reduce(
    (sum, e) => sum + e.extractedText.length,
    0,
  );

  if (totalChars > MAX_CONTEXT_CHARS) {
    return twoPhaseDesign(apiKey, extracts, collectionTitle, settings);
  }
  return singlePhaseDesign(apiKey, extracts, collectionTitle, settings);
}

function buildConstraints(settings: PipelineSettings): string {
  const parts: string[] = [];

  if (settings.language && settings.language !== "auto") {
    parts.push(
      `- Write ALL output (titles, descriptions, objectives) in ${settings.language}`,
    );
  } else {
    parts.push(
      "- Write output in the same language as the source documents",
    );
  }

  if (settings.focus?.trim()) {
    parts.push(
      `- The student specifically asked to focus on: "${settings.focus.trim()}". Prioritize topics related to this when designing the curriculum.`,
    );
  }

  return parts.join("\n");
}

async function singlePhaseDesign(
  apiKey: string,
  extracts: ExtractedDocument[],
  collectionTitle: string,
  settings: PipelineSettings,
): Promise<Curriculum> {
  const allText = extracts
    .map(
      (e) =>
        `=== DOCUMENT: "${e.title}" ===\n${e.extractedText}`,
    )
    .join("\n\n");

  const numLessons = Math.min(Math.max(extracts.length * 2, 3), 8);

  const prompt = `You are an expert curriculum designer. You have the FULL TEXT of ${extracts.length} document(s) from a study collection called "${collectionTitle}".

CRITICAL RULES:
- You may ONLY create lessons about topics that are ACTUALLY PRESENT in the documents below
- Do NOT invent topics, add outside knowledge, or include information not in the source text
- Every lesson objective must reference content that exists in the provided text

Your task is to design a study curriculum with exactly ${numLessons} lessons.
${buildConstraints(settings)}

For each lesson, you must specify:
1. A clear title
2. 2-3 learning objectives (grounded in the document content)
3. The exact source text section(s) that the lesson should cover — copy the relevant text verbatim. This will be given to another AI agent to create learning content, so it must be complete and self-contained.

Respond with ONLY valid JSON:
{
  "title": "Curriculum title",
  "description": "2-3 sentence overview",
  "lessons": [
    {
      "title": "Lesson title",
      "objectives": ["Objective 1", "Objective 2"],
      "sourceText": "The exact text sections from the documents that this lesson covers. Copy relevant passages verbatim — this must be self-contained.",
      "orderIndex": 0
    }
  ]
}

SOURCE DOCUMENTS:
${allText}`;

  const text = await callOpenRouter(apiKey, [
    { role: "user", content: prompt },
  ]);

  return parseCurriculum(text);
}

async function twoPhaseDesign(
  apiKey: string,
  extracts: ExtractedDocument[],
  collectionTitle: string,
  settings: PipelineSettings,
): Promise<Curriculum> {
  const outlineSummary = extracts
    .map(
      (e) =>
        `=== DOCUMENT: "${e.title}" ===\nMain subject: ${e.outline.mainSubject}\nTopics:\n${e.outline.topics
          .map(
            (t) =>
              `  - ${t.title}: ${t.summary}`,
          )
          .join("\n")}`,
    )
    .join("\n\n");

  const numLessons = Math.min(Math.max(extracts.length * 2, 3), 8);

  const planPrompt = `You are an expert curriculum designer. You have OUTLINES of ${extracts.length} document(s) from a study collection called "${collectionTitle}".

CRITICAL RULES:
- You may ONLY create lessons about topics that appear in these outlines
- Do NOT invent topics or add outside knowledge

Design a curriculum with exactly ${numLessons} lessons.
${buildConstraints(settings)}

For each lesson, specify which document(s) and which topic(s) should be included.

Respond with ONLY valid JSON:
{
  "title": "Curriculum title",
  "description": "2-3 sentence overview",
  "lessonPlan": [
    {
      "title": "Lesson title",
      "objectives": ["Objective 1", "Objective 2"],
      "orderIndex": 0,
      "sources": [
        { "documentTitle": "Doc name", "topicTitles": ["Topic A", "Topic B"] }
      ]
    }
  ]
}

DOCUMENT OUTLINES:
${outlineSummary}`;

  const planText = await callOpenRouter(apiKey, [
    { role: "user", content: planPrompt },
  ]);
  const plan = JSON.parse(extractJson(planText));

  const lessons = (plan.lessonPlan ?? []).map(
    (lp: any, idx: number) => {
      const relevantTexts: string[] = [];
      for (const src of lp.sources ?? []) {
        const doc = extracts.find(
          (e) =>
            e.title.toLowerCase() === src.documentTitle?.toLowerCase(),
        );
        if (!doc) continue;
        for (const topicTitle of src.topicTitles ?? []) {
          const topic = doc.outline.topics.find(
            (t) =>
              t.title.toLowerCase() === topicTitle.toLowerCase(),
          );
          if (topic) {
            const startIdx = doc.extractedText.indexOf(
              topic.startSection,
            );
            const endIdx = doc.extractedText.indexOf(
              topic.endSection,
            );
            if (startIdx >= 0 && endIdx >= 0) {
              relevantTexts.push(
                doc.extractedText.slice(startIdx, endIdx + 500),
              );
            } else {
              relevantTexts.push(
                doc.extractedText.slice(0, 5000),
              );
            }
          }
        }
        if (relevantTexts.length === 0 && doc) {
          relevantTexts.push(doc.extractedText.slice(0, 8000));
        }
      }

      return {
        title: lp.title,
        objectives: lp.objectives ?? [],
        sourceText: relevantTexts.join("\n\n---\n\n"),
        orderIndex: lp.orderIndex ?? idx,
      };
    },
  );

  return {
    title: plan.title ?? collectionTitle,
    description: plan.description ?? "",
    lessons,
  };
}

function parseCurriculum(text: string): Curriculum {
  const parsed = JSON.parse(extractJson(text));
  if (!parsed.title || !parsed.lessons?.length) {
    throw new Error("Invalid curriculum response from Architect");
  }
  return {
    title: parsed.title,
    description: parsed.description ?? "",
    lessons: parsed.lessons.map((l: any, idx: number) => ({
      title: l.title,
      objectives: l.objectives ?? [],
      sourceText: l.sourceText ?? "",
      orderIndex: l.orderIndex ?? idx,
    })),
  };
}
