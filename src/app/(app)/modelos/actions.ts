"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { DOCS_BUCKET, listAllFiles } from "@/lib/storage";
import { LIMITS, type Template } from "@/lib/templates/schema";
import {
  saveTemplateInputSchema,
  validateTemplateForSave,
  type EditorIssues,
} from "@/lib/templates/validate";
import { sourceFolder } from "@/lib/uploads";
import { specialtyNameSchema } from "@/lib/validation/settings";

export type SaveTemplateResult =
  | { ok: true; id: string }
  | { ok: false; message: string; issues?: EditorIssues };

export type ActionResult = { ok: true } | { ok: false; message: string };

const idSchema = z.uuid();

/** Pasta de envio válida só se for do próprio usuário: `{user_id}/sources/{uuid}`. */
function isOwnSourceFolder(path: string, userId: string): boolean {
  const [, , uploadId] = path.split("/");
  return idSchema.safeParse(uploadId).success && path === sourceFolder(userId, uploadId);
}

/** Cria (sem `id`) ou atualiza um modelo, com o padrão da especialidade junto. */
export async function saveTemplate(input: unknown): Promise<SaveTemplateResult> {
  const parsed = saveTemplateInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Não foi possível ler o modelo. Recarregue a página." };
  }
  const { id, specialtyId, isDefault, sourceFilePath } = parsed.data;

  const validation = validateTemplateForSave(parsed.data.title, parsed.data.schema);
  if (!validation.ok) {
    return { ok: false, message: "Confira os campos destacados.", issues: validation.issues };
  }

  const { user, supabase } = await requireUser();
  if (!id && sourceFilePath && !isOwnSourceFolder(sourceFilePath, user.id)) {
    return { ok: false, message: "O arquivo original do rascunho é inválido." };
  }

  // Os tipos gerados marcam todos os argumentos como obrigatórios e não nulos;
  // a função aceita null em p_id (modelo novo), especialidade e arquivo.
  const args = {
    p_id: id ?? null,
    p_title: validation.title,
    p_specialty_id: specialtyId,
    p_schema: validation.schema satisfies Template,
    p_source_file_path: id ? null : (sourceFilePath ?? null),
    p_is_default: Boolean(specialtyId) && isDefault,
  } as unknown as {
    p_id: string;
    p_title: string;
    p_specialty_id: string;
    p_schema: Template;
    p_source_file_path: string;
    p_is_default: boolean;
  };

  const { data, error } = await supabase.rpc("save_template", args);
  if (error || !data) {
    if (error?.code === "P0002") {
      return { ok: false, message: "Este modelo não existe mais. Ele pode ter sido excluído." };
    }
    if (error?.code === "23503") {
      return {
        ok: false,
        message: "A especialidade escolhida não existe mais. Escolha outra.",
      };
    }
    return { ok: false, message: "Não foi possível salvar o modelo. Tente de novo." };
  }

  refresh();
  return { ok: true, id: data };
}

export async function deleteTemplate(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Modelo inválido." };

  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("source_file_path")
    .maybeSingle();
  if (error) return { ok: false, message: "Não foi possível excluir o modelo." };
  if (!data) return { ok: false, message: "Este modelo não existe mais." };

  // Anamneses já preenchidas continuam (têm o snapshot). O arquivo original vai junto.
  const folder = data.source_file_path;
  if (folder && isOwnSourceFolder(folder, user.id)) {
    try {
      const files = await listAllFiles(supabase, folder);
      if (files.length > 0) await supabase.storage.from(DOCS_BUCKET).remove(files);
    } catch {
      // O modelo já foi excluído; um arquivo que sobrar não afeta a pessoa.
    }
  }

  refresh();
  return { ok: true };
}

export async function duplicateTemplate(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Modelo inválido." };

  const { user, supabase } = await requireUser();
  const { data: original, error } = await supabase
    .from("templates")
    .select("title, specialty_id, schema")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !original) return { ok: false, message: "Não foi possível duplicar o modelo." };

  const suffix = " (cópia)";
  const title = `${original.title.slice(0, LIMITS.templateTitle - suffix.length).trim()}${suffix}`;
  // A cópia não aponta para o arquivo original (que some se o original for excluído).
  const { error: insertError } = await supabase.from("templates").insert({
    user_id: user.id,
    title,
    specialty_id: original.specialty_id,
    schema: original.schema,
  });
  if (insertError) return { ok: false, message: "Não foi possível duplicar o modelo." };

  refresh();
  return { ok: true };
}

export type CreateSpecialtyResult =
  | { ok: true; specialty: { id: string; name: string } }
  | { ok: false; message: string };

/** Cria uma especialidade direto do editor de modelo. */
export async function createSpecialty(name: string): Promise<CreateSpecialtyResult> {
  const parsed = specialtyNameSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Nome inválido." };
  }

  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("specialties")
    .insert({ user_id: user.id, name: parsed.data.name })
    .select("id, name")
    .single();
  if (error) {
    return {
      ok: false,
      message:
        error.code === "23505"
          ? "Você já tem uma especialidade com esse nome."
          : "Não foi possível criar a especialidade.",
    };
  }
  return { ok: true, specialty: data };
}
