import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "@/components/auth/auth-heading";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignUpPage() {
  return (
    <>
      <AuthHeading
        title="Criar conta"
        description="Você vai receber um e-mail para confirmar o cadastro."
      />
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-primary underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
