import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-heading";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Nova senha" };

// O proxy só deixa chegar aqui quem abriu o link de recuperação (com sessão).
export default function NewPasswordPage() {
  return (
    <>
      <AuthHeading title="Criar nova senha" description="Escolha uma senha nova para sua conta." />
      <NewPasswordForm />
    </>
  );
}
