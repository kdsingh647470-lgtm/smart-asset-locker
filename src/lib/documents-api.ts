import { supabase } from "@/integrations/supabase/client";

export type DocType = "any" | "invoice" | "warranty" | "insurance" | "manual" | "amc";

export type ItemDocument = {
  id: string;
  user_id: string;
  item_id: string | null;
  doc_type: DocType;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  extracted_json: unknown;
  created_at: string;
  updated_at: string;
};

const BUCKET = "item-documents";

export async function listDocuments(): Promise<ItemDocument[]> {
  const { data, error } = await supabase
    .from("item_documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ItemDocument[];
}

export async function uploadDocument(args: {
  userId: string;
  itemId: string;
  docType: DocType;
  file: File;
  extracted?: unknown;
}): Promise<ItemDocument> {
  const { userId, itemId, docType, file, extracted } = args;
  const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "_");
  const path = `${userId}/${itemId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safe}`;
  const up = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (up.error) throw up.error;

  const { data, error } = await supabase
    .from("item_documents")
    .insert({
      user_id: userId,
      item_id: itemId,
      doc_type: docType,
      file_path: path,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      extracted_json: (extracted ?? null) as any,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ItemDocument;
}

export async function getDocSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(doc: ItemDocument): Promise<void> {
  await supabase.storage.from(BUCKET).remove([doc.file_path]);
  const { error } = await supabase.from("item_documents").delete().eq("id", doc.id);
  if (error) throw error;
}
