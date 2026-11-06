import "server-only";
import { requireUser } from "@/lib/auth";

export type NoteDetail = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteSummary = {
  id: string;
  title: string;
  /** Começo do texto, para a lista. */
  excerpt: string;
  updatedAt: string;
};

const EXCERPT_LENGTH = 160;

export async function getNote(id: string): Promise<NoteDetail | null> {
  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar a nota.");
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function listNotes(): Promise<NoteSummary[]> {
  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("notes")
    // Só o começo do texto: notas longas não precisam vir inteiras para a lista.
    .select("id, title, content, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error("Não foi possível carregar as notas.");
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    excerpt: row.content.replace(/\s+/g, " ").trim().slice(0, EXCERPT_LENGTH),
    updatedAt: row.updated_at,
  }));
}
