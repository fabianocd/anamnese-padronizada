"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth-errors";
import { errorState, pickValues, successState, type FormState } from "@/lib/form-state";
import { DOCS_BUCKET, listAllFiles } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { changePasswordSchema } from "@/lib/validation/auth";
import {
  deleteAccountSchema,
  profileSchema,
  specialtyIdSchema,
  specialtyNameSchema,
} from "@/lib/validation/settings";

function invalid(error: z.ZodError, values?: Record<string, string>): FormState {
  return errorState("Confira os campos destacados.", z.flattenError(error).fieldErrors, values);
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = pickValues(formData, ["fullName", "institution"]);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);

  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, institution: parsed.data.institution })
    .eq("user_id", user.id);
  if (error) return errorState("Não foi possível salvar o perfil.", undefined, values);

  refresh();
  return successState("Perfil salvo.", values);
}

export async function addSpecialty(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = pickValues(formData, ["name"]);
  const parsed = specialtyNameSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);

  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("specialties")
    .insert({ user_id: user.id, name: parsed.data.name });
  if (error) {
    // 23505 = unique_violation (nome repetido, ignorando maiúsculas)
    const message =
      error.code === "23505"
        ? "Você já tem uma especialidade com esse nome."
        : "Não foi possível adicionar a especialidade.";
    return errorState(message, { name: [message] }, values);
  }

  refresh();
  return successState("Especialidade adicionada.");
}

export async function deleteSpecialty(formData: FormData): Promise<void> {
  const parsed = specialtyIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;

  const { user, supabase } = await requireUser();
  await supabase.from("specialties").delete().eq("id", parsed.data.id).eq("user_id", user.id);
  refresh();
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const { user, supabase } = await requireUser();
  if (!user.email) return errorState("Não foi possível verificar sua conta.");

  // Confere a senha atual antes de trocar.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) {
    const message =
      verifyError.code === "invalid_credentials"
        ? "Senha atual incorreta."
        : authErrorMessage(verifyError);
    return errorState(message, { currentPassword: [message] });
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return errorState(authErrorMessage(error));

  return successState("Senha alterada.");
}

export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = pickValues(formData, ["confirmation"]);
  const parsed = deleteAccountSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);

  const { user, supabase } = await requireUser();
  const admin = createAdminClient();

  try {
    // Arquivos enviados não somem com o cascade do banco: apagar antes.
    const files = await listAllFiles(admin, user.id);
    for (let i = 0; i < files.length; i += 100) {
      const { error } = await admin.storage.from(DOCS_BUCKET).remove(files.slice(i, i + 100));
      if (error) throw error;
    }

    // Exclui o usuário; perfis, especialidades, modelos e anamneses vão junto (on delete cascade).
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch {
    return errorState(
      "Não foi possível excluir a conta agora. Ela continua ativa; tente de novo em instantes.",
      undefined,
      values,
    );
  }

  await supabase.auth.signOut({ scope: "local" });
  redirect("/entrar?aviso=conta-excluida");
}
