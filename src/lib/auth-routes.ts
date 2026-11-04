/** Rotas públicas de autenticação (quem já entrou é mandado para o app). */
export const guestOnlyRoutes = ["/entrar", "/cadastro", "/recuperar-senha"];

/** Rotas que não exigem nem bloqueiam sessão. */
export const publicRoutes = ["/auth/confirm"];

export const LOGIN_PATH = "/entrar";
export const HOME_PATH = "/modelos";

function matches(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isGuestOnlyRoute(pathname: string) {
  return matches(pathname, guestOnlyRoutes);
}

export function isPublicRoute(pathname: string) {
  return matches(pathname, publicRoutes);
}

/**
 * Aceita só caminhos internos (evita open redirect via ?next=https://...).
 */
export function safeNextPath(value: unknown, fallback = HOME_PATH): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
