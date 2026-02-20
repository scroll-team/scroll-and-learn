import { File as ExpoFile, Directory, Paths } from "expo-file-system";
import { supabase } from "@/lib/supabase";
import type { Document } from "@/types";
import * as DocumentPicker from "expo-document-picker";

const PDF_CACHE_DIR_NAME = "pdf-cache";

function getPdfCacheDir(): Directory {
  const dir = new Directory(Paths.cache, PDF_CACHE_DIR_NAME);
  dir.create({ idempotent: true });
  return dir;
}

interface UploadResult {
  document: Document | null;
  error: string | null;
}

export async function pickDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0];
}

export async function uploadDocument(
  userId: string,
  file: DocumentPicker.DocumentPickerAsset,
): Promise<UploadResult> {
  const fileExt = "pdf";
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const title = file.name?.replace(/\.pdf$/i, "") || "Untitled Document";

  const response = await fetch(file.uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(fileName, blob, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return { document: null, error: uploadError.message };
  }

  const { data, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      title,
      file_path: fileName,
      file_size: file.size ?? null,
      status: "uploaded",
    })
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from("documents").remove([fileName]);
    return { document: null, error: insertError.message };
  }

  // Cache the PDF locally so quiz generation never needs to download.
  // Uses native file I/O — reads the DocumentPicker cache file and copies
  // it to a predictable path keyed by document ID.
  try {
    const cacheDir = getPdfCacheDir();
    const sourceFile = new ExpoFile(file.uri);
    if (sourceFile.exists && sourceFile.size > 0) {
      const cachedFile = new ExpoFile(cacheDir, `${data.id}.pdf`);
      cachedFile.write(await sourceFile.bytes());
    }
  } catch {
    // Non-fatal — generation will ask user to re-upload if cache is missing
  }

  return {
    document: mapRow(data),
    error: null,
  };
}

export async function fetchDocuments(userId: string): Promise<{
  documents: Document[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { documents: [], error: error.message };
  }

  return { documents: (data ?? []).map(mapRow), error: null };
}

export async function deleteDocument(
  documentId: string,
  filePath: string,
): Promise<{ error: string | null }> {
  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([filePath]);

  if (storageError) {
    return { error: storageError.message };
  }

  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  // Clean up local PDF cache
  try {
    const cached = new ExpoFile(getPdfCacheDir(), `${documentId}.pdf`);
    if (cached.exists) cached.delete();
  } catch {}

  return { error: dbError?.message ?? null };
}

function mapRow(row: any): Document {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    filePath: row.file_path,
    fileSize: row.file_size ?? null,
    status: row.status,
    pageCount: row.page_count,
    createdAt: row.created_at,
  };
}
