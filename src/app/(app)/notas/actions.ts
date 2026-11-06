"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { saveNoteInputSchema } from "@/lib/notes/schema";

export type NoteActionResult = { ok: true } | { ok: false; message: string };
export type SaveNoteResult = { ok: true; updatedAt: string } | { ok: false; message: string };

const idSchema = z.uuid();

/** Cria uma nota em branco e abre para editar. */
export async function createNote(): Promise<void> {
  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: user.id })
    .select("id")
    .single();
  if (error || !data) redirect("/notas?aviso=erro-ao-criar-nota");
  redirect(`/notas/${data.id}`);
}

/** Salvamento automático do título e do texto. */
export async function saveNote(input: unknown): Promise<SaveNoteResult> {
  const parsed = saveNoteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Não foi possível ler a nota." };
  }
  const { id, title, content } = parsed.data;

  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("notes")
    .update({ title, content })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("updated_at")
    .maybeSingle();
  if (error) return { ok: false, message: "Não foi possível salvar agora." };
  if (!data) return { ok: false, message: "Esta nota não existe mais." };
  return { ok: true, updatedAt: data.updated_at };
}

export async function deleteNote(id: string): Promise<NoteActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Nota inválida." };

  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: "Não foi possível excluir a nota." };
  if (!data) return { ok: false, message: "Esta nota não existe mais." };

  refresh();
  return { ok: true };
}
