import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth-routes";
import { createClient } from "@/lib/supabase/server";

const otpTypes: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Destino dos links de e-mail (confirmação de cadastro e recuperação de senha).
 * Aceita os dois formatos do Supabase:
 * - `?code=...` (fluxo PKCE, template padrão de e-mail);
 * - `?token_hash=...&type=...` (template customizado; funciona em outro navegador).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type && otpTypes.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (ok) {
    const target = type === "recovery" ? "/redefinir-senha" : next;
    const url = new URL(target, request.url);
    if (target === "/modelos") url.searchParams.set("aviso", "conta-confirmada");
    return NextResponse.redirect(url);
  }

  const isRecovery = type === "recovery" || next === "/redefinir-senha";
  return NextResponse.redirect(
    new URL(isRecovery ? "/recuperar-senha?erro=link" : "/entrar?erro=link", request.url),
  );
}
