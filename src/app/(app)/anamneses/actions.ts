"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  ANSWER_LIMITS,
  sanitizeAnswers,
  saveAnamnesisInputSchema,
} from "@/lib/anamneses/answers";
import { buildAnamnesisExport, type AnamnesisExport } from "@/lib/anamneses/export";
import { describeTemplateUpdate } from "@/lib/anamneses/sync";
import {
  getAnamnesis,
  parseAnswers,
  parseSnapshot,
  parseTemplateSchema,
} from "@/lib/data/anamneses";
import { getProfile } from "@/lib/data/profile";
import { withLongConduta } from "@/lib/templates/normalize";
import { templateSchema } from "@/lib/templates/schema";

export type ActionResult = { ok: true } | { ok: false; message: string };
export type SaveAnamnesisResult =
  | { ok: true; updatedAt: string }
  | { ok: false; message: string };
export type ExportAnamnesisResult =
  | { ok: true; document: AnamnesisExport }
  | { ok: false; message: string };
export type DuplicateAnamnesisResult = { ok: true; id: string } | { ok: false; message: string };

const idSchema = z.uuid();

/** Cria uma anamnese em branco a partir de um modelo e abre o formulário. */
export async function createAnamnesis(formData: FormData): Promise<void> {
  const parsedId = idSchema.safeParse(formData.get("templateId"));
  if (!parsedId.success) redirect("/anamneses/nova?aviso=modelo-indisponivel");

  const { user, supabase } = await requireUser();

  // Anamneses em branco esquecidas (ex.: aba fechada sem preencher) há mais de um dia.
  await supabase
    .from("anamneses")
    .delete()
    .eq("user_id", user.id)
    .filter("answers", "eq", "{}")
    .is("patient_label", null)
    .lt("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const { data: template } = await supabase
    .from("templates")
    .select("id, title, schema")
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .maybeSingle();

  const schema = template ? templateSchema.safeParse(template.schema) : null;
  if (!template || !schema?.success) redirect("/anamneses/nova?aviso=modelo-indisponivel");

  // O snapshot congela a estrutura: editar o modelo depois não muda esta anamnese.
  const { data, error } = await supabase
    .from("anamneses")
    .insert({
      user_id: user.id,
      template_id: template.id,
      template_snapshot: withLongConduta(schema.data),
      title: template.title.slice(0, ANSWER_LIMITS.title),
      answers: {},
    })
    .select("id")
    .single();
  if (error || !data) redirect("/anamneses/nova?aviso=erro-ao-criar");

  redirect(`/anamneses/${data.id}`);
}

/** Salvamento automático do formulário (título, identificação e respostas). */
export async function saveAnamnesis(input: unknown): Promise<SaveAnamnesisResult> {
  const parsed = saveAnamnesisInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Não foi possível ler as respostas.",
    };
  }
  const { id, title, patientLabel, answers } = parsed.data;

  const { user, supabase } = await requireUser();
  const { data: current, error: readError } = await supabase
    .from("anamneses")
    .select("template_snapshot")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) return { ok: false, message: "Não foi possível salvar agora." };
  if (!current) return { ok: false, message: "Esta anamnese não existe mais." };

  const clean = sanitizeAnswers(parseSnapshot(current.template_snapshot), answers);
  const { data, error } = await supabase
    .from("anamneses")
    .update({ title, patient_label: patientLabel || null, answers: clean })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("updated_at")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "Não foi possível salvar agora." };

  return { ok: true, updatedAt: data.updated_at };
}

export async function duplicateAnamnesis(id: string): Promise<DuplicateAnamnesisResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Anamnese inválida." };

  const { user, supabase } = await requireUser();
  const { data: original } = await supabase
    .from("anamneses")
    .select("template_id, template_snapshot, title, patient_label, answers")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!original) return { ok: false, message: "Não foi possível duplicar a anamnese." };

  const suffix = " (CÓPIA)";
  const { data, error } = await supabase
    .from("anamneses")
    .insert({
      user_id: user.id,
      template_id: original.template_id,
      template_snapshot: original.template_snapshot,
      title: `${original.title.slice(0, ANSWER_LIMITS.title - suffix.length).trim()}${suffix}`,
      patient_label: original.patient_label,
      answers: original.answers,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: "Não foi possível duplicar a anamnese." };

  refresh();
  return { ok: true, id: data.id };
}

/**
 * Apaga a anamnese se ela continua em branco (sem respostas nem paciente).
 * Chamado ao sair do formulário; a condição é checada no banco.
 */
export async function discardBlankAnamnesis(id: string): Promise<void> {
  if (!idSchema.safeParse(id).success) return;
  const { user, supabase } = await requireUser();
  await supabase
    .from("anamneses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .filter("answers", "eq", "{}")
    .is("patient_label", null);
}

/** Traz a versão atual do modelo para a anamnese, sem perder respostas (decisão 36). */
export async function syncAnamnesisWithTemplate(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Anamnese inválida." };

  const { user, supabase } = await requireUser();
  const { data: anamnesis } = await supabase
    .from("anamneses")
    .select("template_id, template_snapshot, answers")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!anamnesis) return { ok: false, message: "Esta anamnese não existe mais." };
  if (!anamnesis.template_id) return { ok: false, message: "O modelo desta anamnese foi excluído." };

  const { data: template } = await supabase
    .from("templates")
    .select("schema")
    .eq("id", anamnesis.template_id)
    .eq("user_id", user.id)
    .maybeSingle();
  const current = template ? parseTemplateSchema(template.schema) : null;
  if (!current) return { ok: false, message: "Não foi possível ler o modelo." };

  const answers = parseAnswers(anamnesis.answers);
  const result = describeTemplateUpdate(parseSnapshot(anamnesis.template_snapshot), current, answers);
  if (!result) return { ok: true };

  const { error } = await supabase
    .from("anamneses")
    .update({
      template_snapshot: result.merged,
      answers: sanitizeAnswers(result.merged, answers),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, message: "Não foi possível atualizar a anamnese." };

  return { ok: true };
}

export async function deleteAnamnesis(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Anamnese inválida." };

  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("anamneses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: "Não foi possível excluir a anamnese." };
  if (!data) return { ok: false, message: "Esta anamnese não existe mais." };

  refresh();
  return { ok: true };
}

/** Documento formatado (o que está salvo) para baixar o PDF ou copiar pelo histórico. */
export async function getAnamnesisExport(id: string): Promise<ExportAnamnesisResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Anamnese inválida." };

  try {
    const [anamnesis, profile] = await Promise.all([getAnamnesis(id), getProfile()]);
    if (!anamnesis) return { ok: false, message: "Esta anamnese não existe mais." };
    return {
      ok: true,
      document: buildAnamnesisExport({
        title: anamnesis.title,
        patientLabel: anamnesis.patientLabel,
        createdAt: anamnesis.createdAt,
        snapshot: anamnesis.snapshot,
        answers: anamnesis.answers,
        author: { fullName: profile.fullName, institution: profile.institution },
      }),
    };
  } catch {
    return { ok: false, message: "Não foi possível carregar a anamnese." };
  }
}
