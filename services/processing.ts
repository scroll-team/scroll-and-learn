import { File as ExpoFile, Directory, Paths } from "expo-file-system";
import { supabase } from "@/lib/supabase";
import { generateQuizFromPdfDataUrl } from "@/lib/ai/providers/openrouter";
import type { Document } from "@/types";

const PDF_CACHE_DIR_NAME = "pdf-cache";

interface ProcessResult {
  success: boolean;
  error: string | null;
}

export async function processDocument(doc: Document): Promise<ProcessResult> {
  try {
    await updateDocumentStatus(doc.id, "processing");

    const dataUrl = await getLocalPdfAsDataUrl(doc.id);

    const quizResult = await generateQuizFromPdfDataUrl(dataUrl, 5, "medium");

    const { error: quizError } = await supabase.from("quizzes").insert({
      document_id: doc.id,
      user_id: doc.userId,
      title: quizResult.title,
      questions: quizResult.questions,
      difficulty: "medium",
    });

    if (quizError) {
      throw new Error(`Failed to save quiz: ${quizError.message}`);
    }

    await updateDocumentStatus(doc.id, "ready");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await updateDocumentStatus(doc.id, "error", message);
    return { success: false, error: message };
  }
}

/**
 * Reads a locally cached PDF (saved during upload) and returns it as a
 * base64 data URL. The entire operation is native file I/O — no network,
 * no Blob, no FileReader.
 */
function getLocalPdfAsDataUrl(documentId: string): string {
  const cacheDir = new Directory(Paths.cache, PDF_CACHE_DIR_NAME);
  const cachedFile = new ExpoFile(cacheDir, `${documentId}.pdf`);

  if (!cachedFile.exists) {
    throw new Error(
      "PDF not found in local cache. Please delete and re-upload the document.",
    );
  }

  if (cachedFile.size === 0) {
    throw new Error("Cached PDF is empty. Please delete and re-upload.");
  }

  const base64 = cachedFile.base64Sync();

  return `data:application/pdf;base64,${base64}`;
}

async function updateDocumentStatus(
  documentId: string,
  status: string,
  errorMessage?: string,
) {
  await supabase
    .from("documents")
    .update({
      status,
      error_message: errorMessage ?? null,
    })
    .eq("id", documentId);
}
