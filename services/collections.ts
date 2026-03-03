import { supabase } from "@/lib/supabase";
import type { Collection } from "@/types";

const DEFAULT_EMOJIS = ["📚", "🧮", "🔬", "🏛️", "💻", "🎨", "🌍", "🧬", "📐", "🎵"];

export function randomEmoji(): string {
  return DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)];
}

export async function createCollection(
  userId: string,
  title: string,
  emoji?: string,
): Promise<{ collection: Collection | null; error: string | null }> {
  const { data, error } = await supabase
    .from("collections")
    .insert({
      user_id: userId,
      title: title.trim(),
      emoji: emoji ?? randomEmoji(),
      status: "active",
    })
    .select()
    .single();

  if (error) return { collection: null, error: error.message };

  return { collection: mapRow(data), error: null };
}

export async function fetchCollections(userId: string): Promise<{
  collections: Collection[];
  error: string | null;
}> {
  // Fetch collections and count their documents in one query
  const { data, error } = await supabase
    .from("collections")
    .select(`
      *,
      documents(count)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { collections: [], error: error.message };

  const collections = (data ?? []).map((row) => ({
    ...mapRow(row),
    documentCount: (row.documents as any)?.[0]?.count ?? 0,
  }));

  return { collections, error: null };
}

export async function fetchCollection(
  collectionId: string,
): Promise<{ collection: Collection | null; error: string | null }> {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("id", collectionId)
    .single();

  if (error) return { collection: null, error: error.message };

  return { collection: mapRow(data), error: null };
}

export async function updateCollectionStatus(
  collectionId: string,
  status: Collection["status"],
): Promise<void> {
  await supabase
    .from("collections")
    .update({ status })
    .eq("id", collectionId);
}

export async function deleteCollection(
  collectionId: string,
): Promise<{ error: string | null }> {
  // Deleting the collection cascades to study_plans → lessons → quizzes.
  // Documents get collection_id = null (set null on delete).
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId);

  return { error: error?.message ?? null };
}

function mapRow(row: any): Collection {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    emoji: row.emoji,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
