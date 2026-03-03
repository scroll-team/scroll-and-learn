import { File as ExpoFile, Directory, Paths } from "expo-file-system";
import { supabase } from "@/lib/supabase";
import { generateStudyPlanFromPdfs } from "@/lib/ai/providers/openrouter";
import { updateCollectionStatus } from "@/services/collections";
import { fetchDocumentsForCollection } from "@/services/documents";
import type { StudyPlan, Lesson, Quiz } from "@/types";

const PDF_CACHE_DIR_NAME = "pdf-cache";

interface GenerateResult {
  success: boolean;
  studyPlanId: string | null;
  error: string | null;
}

/**
 * Full pipeline: reads all cached PDFs for a collection, calls the AI,
 * and persists the study plan → lessons → quizzes to Supabase.
 */
export async function generateStudyPlan(
  collectionId: string,
  collectionTitle: string,
  userId: string,
): Promise<GenerateResult> {
  try {
    await updateCollectionStatus(collectionId, "processing");

    // 1. Fetch all documents in the collection
    const { documents, error: docsError } =
      await fetchDocumentsForCollection(collectionId);

    if (docsError) throw new Error(docsError);
    if (!documents.length) {
      throw new Error(
        "No documents in this collection. Upload at least one PDF first.",
      );
    }

    // 2. Read each PDF from local cache
    const cacheDir = new Directory(Paths.cache, PDF_CACHE_DIR_NAME);
    const pdfs: Array<{
      documentId: string;
      filename: string;
      dataUrl: string;
    }> = [];

    for (const doc of documents) {
      const cachedFile = new ExpoFile(cacheDir, `${doc.id}.pdf`);
      if (!cachedFile.exists || cachedFile.size === 0) {
        throw new Error(
          `PDF "${doc.title}" not found in local cache. Please delete and re-upload it.`,
        );
      }
      const base64 = cachedFile.base64Sync();
      pdfs.push({
        documentId: doc.id,
        filename: `${doc.title}.pdf`,
        dataUrl: `data:application/pdf;base64,${base64}`,
      });
    }

    // 3. Call AI with all PDFs in one request
    const numLessons = Math.min(Math.max(documents.length * 2, 3), 8);
    const aiResult = await generateStudyPlanFromPdfs(
      pdfs,
      collectionTitle,
      numLessons,
      5,
    );

    // 4. Insert study plan
    const { data: planData, error: planError } = await supabase
      .from("study_plans")
      .insert({
        collection_id: collectionId,
        user_id: userId,
        title: aiResult.title,
        description: aiResult.description,
        status: "ready",
      })
      .select()
      .single();

    if (planError) throw new Error(`Failed to save study plan: ${planError.message}`);

    // 5. Insert lessons + quizzes
    for (const lessonData of aiResult.lessons) {
      const { data: lessonRow, error: lessonError } = await supabase
        .from("lessons")
        .insert({
          study_plan_id: planData.id,
          user_id: userId,
          title: lessonData.title,
          summary: lessonData.summary,
          order_index: lessonData.orderIndex,
        })
        .select()
        .single();

      if (lessonError) throw new Error(`Failed to save lesson: ${lessonError.message}`);

      const { error: quizError } = await supabase.from("quizzes").insert({
        lesson_id: lessonRow.id,
        document_id: pdfs[0].documentId, // associate with first doc for backward compat
        user_id: userId,
        title: lessonData.quiz.title,
        questions: lessonData.quiz.questions,
        difficulty: "medium",
      });

      if (quizError) throw new Error(`Failed to save quiz: ${quizError.message}`);
    }

    await updateCollectionStatus(collectionId, "ready");

    return { success: true, studyPlanId: planData.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await updateCollectionStatus(collectionId, "error");
    // Update study plan status to error if it was created
    await supabase
      .from("study_plans")
      .update({ status: "error", error_message: message })
      .eq("collection_id", collectionId)
      .eq("status", "generating");
    return { success: false, studyPlanId: null, error: message };
  }
}

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
): Promise<{ lessons: Lesson[]; error: string | null }> {
  const { data, error } = await supabase
    .from("lessons")
    .select(`
      *,
      quizzes(*)
    `)
    .eq("study_plan_id", studyPlanId)
    .order("order_index", { ascending: true });

  if (error) return { lessons: [], error: error.message };

  const lessons = (data ?? []).map((row) => ({
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
    .select(`
      *,
      collections(title, emoji)
    `)
    .eq("user_id", userId)
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  if (error) return { studyPlans: [], error: error.message };

  const studyPlans = (data ?? []).map((row) => ({
    ...mapPlanRow(row),
    collectionTitle: (row.collections as any)?.title,
    collectionEmoji: (row.collections as any)?.emoji,
  }));

  return { studyPlans, error: null };
}

function mapPlanRow(row: any): StudyPlan {
  return {
    id: row.id,
    collectionId: row.collection_id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
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
