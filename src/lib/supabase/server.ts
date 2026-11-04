import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Lê cookies, então só pode ser usado dentro de <Suspense> ou em ações.
 */
export async function createClient() {
  const cookieStore = await cookies();
  // Dados da conta só com um request real: o auth-js compara a validade do
  // token com Date.now(), e nada disso deve entrar em prerender/prefetch.
  await connection();
  const { url, key } = getSupabasePublicEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado de um Server Component: o proxy já renova a sessão.
        }
      },
    },
  });
}
