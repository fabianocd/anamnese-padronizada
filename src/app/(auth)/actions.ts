"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authErrorMessage } from "@/lib/auth-errors";
import { LOGIN_PATH, safeNextPath } from "@/lib/auth-routes";
import { errorState, pickValues, successState, type FormState } from "@/lib/form-state";
import { getRequestOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import {
  newPasswordSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

function invalid(error: z.ZodError, values?: Record<string, string>): FormState {
  return errorState("Confira os campos destacados.", z.flattenError(error).fieldErrors, values);
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = pickValues(formData, ["email"]);
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, values);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return errorState(authErrorMessage(error), undefined, values);

  redirect(safeNextPath(parsed.data.next));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = pickValues(formData, ["fullName", "email"]);
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, values);

  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/confirm?next=/modelos`,
    },
  });
  if (error) return errorState(authErrorMessage(error), undefined, values);

  // Confirmação de e-mail desligada no Supabase: a conta já vem com sessão.
  if (data.session) redirect("/modelos");

  // Com confirmação de e-mail ligada, um e-mail já cadastrado volta sem
  // identidades (o Supabase não revela que a conta existe).
  if (data.user && data.user.identities?.length === 0) {
    return successState(
      "Se este e-mail ainda não tiver conta, enviamos um link de confirmação. Se já tiver, entre ou recupere a senha.",
    );
  }

  return successState(
    "Conta criada! Enviamos um link de confirmação para o seu e-mail. Abra-o para ativar a conta.",
  );
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = pickValues(formData, ["email"]);
  const parsed = resetRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, values);

  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/redefinir-senha`,
  });
  if (error?.code?.startsWith("over_")) {
    return errorState(authErrorMessage(error), undefined, values);
  }

  // Mesma resposta exista ou não a conta, para não revelar e-mails cadastrados.
  return successState(
    "Se houver uma conta com este e-mail, você vai receber um link para criar uma nova senha.",
  );
}

export async function updatePasswordAfterReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    redirect("/recuperar-senha?erro=link");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return errorState(authErrorMessage(error));

  redirect("/modelos?aviso=senha-alterada");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(LOGIN_PATH);
}
