import type { AuthError } from "@supabase/supabase-js";

/** Traduz os erros mais comuns do Supabase Auth para mensagens amigáveis. */
export function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de entrar. Procure a mensagem na sua caixa de entrada (e no spam).";
    case "user_already_exists":
    case "email_exists":
      return "Já existe uma conta com este e-mail.";
    case "weak_password":
      return "Senha fraca. Use uma senha mais longa, misturando letras e números.";
    case "same_password":
      return "A nova senha precisa ser diferente da atual.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
    case "signup_disabled":
      return "Novos cadastros estão desativados no momento.";
    case "otp_expired":
      return "O link expirou ou já foi usado. Peça um novo.";
    case "session_not_found":
    case "session_expired":
      return "Sua sessão expirou. Entre novamente.";
    default:
      return "Não foi possível concluir agora. Tente de novo em instantes.";
  }
}
