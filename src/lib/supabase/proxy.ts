import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  HOME_PATH,
  LOGIN_PATH,
  isGuestOnlyRoute,
  isPublicRoute,
} from "@/lib/auth-routes";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";

/**
 * Renova a sessão do Supabase a cada request e faz o redirecionamento
 * otimista (sem sessão → /entrar). A autorização de verdade fica no RLS e
 * na camada de dados (src/lib/auth.ts).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabasePublicEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([header, value]) =>
          response.headers.set(header, value),
        );
      },
    },
  });

  // Não colocar código entre createServerClient e getClaims().
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (isPublicRoute(pathname)) return response;

  if (signedIn && isGuestOnlyRoute(pathname)) {
    return redirectKeepingCookies(request, response, HOME_PATH);
  }

  if (!signedIn && !isGuestOnlyRoute(pathname)) {
    if (pathname === "/redefinir-senha") {
      return redirectKeepingCookies(request, response, "/recuperar-senha?erro=link");
    }
    const target = new URL(LOGIN_PATH, request.url);
    if (pathname !== "/" && pathname !== HOME_PATH) {
      target.searchParams.set("next", `${pathname}${search}`);
    }
    return redirectKeepingCookies(request, response, target);
  }

  return response;
}

function redirectKeepingCookies(
  request: NextRequest,
  from: NextResponse,
  to: string | URL,
) {
  const redirect = NextResponse.redirect(typeof to === "string" ? new URL(to, request.url) : to);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  from.headers.forEach((value, header) => {
    if (header.toLowerCase() === "cache-control") redirect.headers.set(header, value);
  });
  return redirect;
}
