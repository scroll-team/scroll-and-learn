import { supabase } from "@/lib/supabase";
import type { Quiz, QuizAttempt } from "@/types";

export async function fetchQuizzesForDocument(
  documentId: string,
): Promise<{ quizzes: Quiz[]; error: string | null }> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (error) return { quizzes: [], error: error.message };

  return {
    quizzes: (data ?? []).map(mapQuizRow),
    error: null,
  };
}

export async function fetchAllQuizzes(
  userId: string,
): Promise<{ quizzes: (Quiz & { documentTitle?: string })[]; error: string | null }> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*, documents(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { quizzes: [], error: error.message };

  return {
    quizzes: (data ?? []).map((row: any) => ({
      ...mapQuizRow(row),
      documentTitle: row.documents?.title,
    })),
    error: null,
  };
}

export async function submitQuizAttempt(
  quizId: string,
  userId: string,
  answers: number[],
  score: number,
  totalQuestions: number,
): Promise<{ attempt: QuizAttempt | null; error: string | null }> {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: userId,
      score,
      total_questions: totalQuestions,
      answers,
    })
    .select()
    .single();

  if (error) return { attempt: null, error: error.message };

  return {
    attempt: {
      id: data.id,
      userId: data.user_id,
      quizId: data.quiz_id,
      score: data.score,
      totalQuestions: data.total_questions,
      answers: data.answers,
      completedAt: data.completed_at,
    },
    error: null,
  };
}

function mapQuizRow(row: any): Quiz {
  return {
    id: row.id,
    documentId: row.document_id,
    title: row.title,
    questions: row.questions,
    difficulty: row.difficulty,
    createdAt: row.created_at,
  };
}
