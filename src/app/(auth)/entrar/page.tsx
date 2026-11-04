import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function SignInPage() {
  return (
    <>
      <AuthHeading title="Entrar" description="Acesse seus modelos e anamneses." />
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-primary underline-offset-4 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </>
  );
}
