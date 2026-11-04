import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/auth-routes";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
};

/**
 * Camada de acesso: valida o JWT da sessão (getClaims) e devolve o usuário.
 * Sem sessão válida, redireciona para /entrar. Lê cookies, então só pode
 * rodar dentro de <Suspense> ou em Server Actions/Route Handlers.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) {
    redirect(LOGIN_PATH);
  }
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
});

/** Usuário + cliente Supabase já autenticado, para consultas e mutações. */
export async function requireUser() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  return { user, supabase };
}
