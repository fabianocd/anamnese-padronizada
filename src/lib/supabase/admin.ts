import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";

/**
 * Cliente com a chave secreta: IGNORA o RLS. Usar só no servidor e só para
 * operações que exigem privilégio (hoje: excluir a conta).
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error("Defina SUPABASE_SECRET_KEY no .env.local (só servidor).");
  }
  const { url } = getSupabasePublicEnv();
  return createClient<Database>(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
