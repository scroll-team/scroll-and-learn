/**
 * Study plan service — all AI work runs on-device via OpenRouter.
 * Results are saved directly to Supabase (no Edge Function = no timeout).
 */

import { supabase } from "@/lib/supabase";
import { extractTextFromPdf } from "@/lib/ai/providers/openrouter";
import { File as ExpoFile, Directory, Paths } from "expo-file-system";
import {
  designCurriculum,
  createAllLessonContent,
  createLessonContent,
  judgeLessons,
  MAX_RETRIES,
  type ExtractedDocument,
} from "@/lib/ai/pipeline";
import type { StudyPlan, Lesson, Quiz, PipelineStep } from "@/types";

// ── Save helpers ──────────────────────────────────────────────────────────────

/**
 * Retries a Supabase write up to 3 times with exponential back-off.
 * Handles transient "Network request failed" errors that occur after
 * long-running AI pipelines (20-30 min) where the connection may have dropped.
 */
async function saveWithRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3,
): Promise<T> {
  const delays = [2000, 5000, 10000];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === maxAttempts - 1;
      if (isLast) throw new Error(`Failed to save ${label}: ${(err as Error).message}`);
      console.warn(`Save attempt ${attempt + 1} failed for ${label}, retrying in ${delays[attempt]}ms...`);
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw new Error(`Failed to save ${label} after ${maxAttempts} attempts`);
}

export interface StudyPlanGenerationOptions {
  language?: string;
  difficulty?: "easy" | "medium" | "hard";
  focus?: string;
}

interface GenerateResult {
  success: boolean;
  studyPlanId: string | null;
  error: string | null;
}

type ProgressCallback = (step: PipelineStep) => void;

// ── Main generation function ──────────────────────────────────────────────────

export async function generateStudyPlan(
  collectionId: string,
  collectionTitle: string,
  userId: string,
  options: StudyPlanGenerationOptions = {},
  onProgress?: ProgressCallback,
): Promise<GenerateResult> {
  let studyPlanId: string | null = null;

  try {
    // ── Step 1: Create initial study_plan row ─────────────────────────────
    const { data: planRow, error: planErr } = await supabase
      .from("study_plans")
      .insert({
        collection_id: collectionId,
        user_id: userId,
        title: "Generating…",
        status: "generating",
        pipeline_step: "extracting",
        settings: options,
      })
      .select()
      .single();

    if (planErr) throw new Error(`Failed to create study plan: ${planErr.message}`);
    studyPlanId = planRow.id;

    const updateStep = async (step: string) => {
      onProgress?.(step as PipelineStep);
      await supabase.from("study_plans").update({ pipeline_step: step }).eq("id", studyPlanId!);
    };

    // ── Step 2: Extract PDFs (client-side — reuse cached extracts) ────────
    await updateStep("extracting");

    const { data: docs } = await supabase
      .from("documents")
      .select("id, title")
      .eq("collection_id", collectionId);

    if (!docs?.length) throw new Error("No documents found in this collection");

    const { data: existingExtracts } = await supabase
      .from("document_extracts")
      .select("document_id, extracted_text, outline")
      .in("document_id", docs.map((d) => d.id));

    const extractedIds = new Set((existingExtracts ?? []).map((e: any) => e.document_id));
    const docsNeedingExtraction = docs.filter((d) => !extractedIds.has(d.id));

    const cacheDir = new Directory(Paths.cache, "pdf-cache");

    for (const doc of docsNeedingExtraction) {
      const cachedFile = new ExpoFile(cacheDir, `${doc.id}.pdf`);
      if (!cachedFile.exists || cachedFile.size === 0) {
        console.warn(`Skipping ${doc.title}: no local cache`);
        continue;
      }

      const base64 = cachedFile.base64Sync();
      const dataUrl = `data:application/pdf;base64,${base64}`;
      const { extractedText, outline } = await extractTextFromPdf(dataUrl, doc.title);

      await supabase.from("document_extracts").insert({
        document_id: doc.id,
        user_id: userId,
        extracted_text: extractedText,
        outline,
      });
    }

    // Build extracts array for the pipeline
    const { data: allExtractRows } = await supabase
      .from("document_extracts")
      .select("document_id, extracted_text, outline")
      .in("document_id", docs.map((d) => d.id));

    if (!allExtractRows?.length) throw new Error("No extracted text available. Please re-upload your PDFs.");

    const allExtracts: ExtractedDocument[] = allExtractRows.map((e: any) => ({
      documentId: e.document_id,
      title: docs.find((d) => d.id === e.document_id)?.title ?? "",
      extractedText: e.extracted_text,
      outline: e.outline ?? { topics: [], totalPages: null, mainSubject: "" },
    }));

    // ── Step 3: Architect — design curriculum ─────────────────────────────
    await updateStep("planning");

    const curriculum = await designCurriculum(allExtracts, collectionTitle, options);

    await supabase
      .from("study_plans")
      .update({ title: curriculum.title, description: curriculum.description })
      .eq("id", studyPlanId);

    // ── Step 4: Content Creators — generate lessons (batched) ─────────────
    await updateStep("creating");

    let lessonContents = await createAllLessonContent(curriculum.lessons, options);

    // ── Step 5: Judge — quality review ────────────────────────────────────
    await updateStep("reviewing");

    const verdicts = await judgeLessons(lessonContents);
    let rejectedIndices = verdicts.filter((v) => !v.approved).map((v) => v.lessonIndex);

    // ── Step 6: Retry rejected lessons ───────────────────────────────────
    for (let attempt = 0; attempt < MAX_RETRIES && rejectedIndices.length > 0; attempt++) {
      await updateStep("retrying");

      const retryResults = await Promise.all(
        rejectedIndices.map((idx) => {
          const verdict = verdicts.find((v) => v.lessonIndex === idx);
          return createLessonContent(curriculum.lessons[idx], options, verdict?.feedback);
        }),
      );

      rejectedIndices.forEach((idx, i) => {
        lessonContents[idx] = retryResults[i];
      });

      if (attempt < MAX_RETRIES - 1) {
        const reVerdicts = await judgeLessons(lessonContents);
        rejectedIndices = reVerdicts.filter((v) => !v.approved).map((v) => v.lessonIndex);
      } else {
        rejectedIndices = [];
      }
    }

    // ── Step 7: Refresh session + save lessons and quizzes ───────────────
    await updateStep("saving");

    // Refresh the auth token — the pipeline can take 20-30 min and the
    // underlying connection may have timed out by the time we reach saving.
    await supabase.auth.refreshSession();

    for (const lc of lessonContents) {
      const lessonRow = await saveWithRetry(async () => {
        const { data, error } = await supabase
          .from("lessons")
          .insert({
            study_plan_id: studyPlanId,
            user_id: userId,
            title: lc.lessonTitle,
            summary: lc.summary,
            order_index: lc.orderIndex,
            slideshow_cards: lc.slideshowCards,
            story_cards: lc.storyCards,
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      }, `lesson "${lc.lessonTitle}"`);

      await saveWithRetry(async () => {
        const { error } = await supabase.from("quizzes").insert({
          lesson_id: lessonRow.id,
          user_id: userId,
          title: lc.quiz.title,
          questions: lc.quiz.questions,
          difficulty: options.difficulty ?? "medium",
        });
        if (error) throw new Error(error.message);
      }, `quiz for "${lc.lessonTitle}"`);
    }

    // ── Step 8: Mark complete ─────────────────────────────────────────────
    await supabase
      .from("study_plans")
      .update({ status: "ready", pipeline_step: "ready" })
      .eq("id", studyPlanId);

    await supabase
      .from("collections")
      .update({ status: "ready" })
      .eq("id", collectionId);

    onProgress?.("ready");
    return { success: true, studyPlanId, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Mark as error in DB if we created the row
    if (studyPlanId) {
      await supabase
        .from("study_plans")
        .update({ status: "error", pipeline_step: "error", error_message: message })
        .eq("id", studyPlanId);
    }

    await supabase
      .from("collections")
      .update({ status: "error" })
      .eq("id", collectionId);

    onProgress?.("error" as PipelineStep);
    return { success: false, studyPlanId: null, error: message };
  }
}

// ── Poll pipeline step ────────────────────────────────────────────────────────

export async function pollPipelineStep(
  collectionId: string,
): Promise<{ step: PipelineStep | null; status: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("study_plans")
    .select("pipeline_step, status, error_message")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { step: null, status: null, error: error.message };
  if (!data) return { step: null, status: null, error: null };

  return {
    step: data.pipeline_step as PipelineStep | null,
    status: data.status,
    error: data.error_message ?? null,
  };
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

export async function fetchStudyPlanForCollection(
  collectionId: string,
): Promise<{ studyPlan: StudyPlan | null; error: string | null }> {
  const { data, error } = await supabase
    .from("study_plans")
    .select("*")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { studyPlan: null, error: error.message };
  if (!data) return { studyPlan: null, error: null };

  return { studyPlan: mapPlanRow(data), error: null };
}

export async function fetchLessonsForPlan(
  studyPlanId: string,
): Promise<{ lessons: (Lesson & { quiz?: Quiz })[]; error: string | null }> {
  const { data, error } = await supabase
    .from("lessons")
    .select(`*, quizzes(*)`)
    .eq("study_plan_id", studyPlanId)
    .order("order_index", { ascending: true });

  if (error) return { lessons: [], error: error.message };

  const lessons = (data ?? []).map((row: any) => ({
    ...mapLessonRow(row),
    quiz: row.quizzes?.[0] ? mapQuizRow(row.quizzes[0]) : undefined,
  }));

  return { lessons, error: null };
}

export async function fetchAllStudyPlans(userId: string): Promise<{
  studyPlans: Array<StudyPlan & { collectionTitle?: string; collectionEmoji?: string }>;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("study_plans")
    .select(`*, collections(title, emoji)`)
    .eq("user_id", userId)
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  if (error) return { studyPlans: [], error: error.message };

  const studyPlans = (data ?? []).map((row: any) => ({
    ...mapPlanRow(row),
    collectionTitle: (row.collections as any)?.title,
    collectionEmoji: (row.collections as any)?.emoji,
  }));

  return { studyPlans, error: null };
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function mapPlanRow(row: any): StudyPlan {
  return {
    id: row.id,
    collectionId: row.collection_id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    pipelineStep: row.pipeline_step ?? null,
    createdAt: row.created_at,
  };
}

function mapLessonRow(row: any): Lesson {
  return {
    id: row.id,
    studyPlanId: row.study_plan_id,
    userId: row.user_id,
    title: row.title,
    summary: row.summary ?? null,
    orderIndex: row.order_index,
    slideshowCards: row.slideshow_cards ?? [],
    storyCards: row.story_cards ?? [],
    createdAt: row.created_at,
  };
}

function mapQuizRow(row: any): Quiz {
  return {
    id: row.id,
    documentId: row.document_id ?? null,
    lessonId: row.lesson_id ?? null,
    title: row.title,
    questions: row.questions,
    difficulty: row.difficulty,
    createdAt: row.created_at,
  };
}
