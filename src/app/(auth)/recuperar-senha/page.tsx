import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ResetRequestForm } from "./reset-request-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ResetRequestPage() {
  return (
    <>
      <AuthHeading
        title="Recuperar senha"
        description="Informe seu e-mail e enviaremos um link para criar uma nova senha."
      />
      <Suspense>
        <ResetRequestForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Lembrou?{" "}
        <Link href="/entrar" className="font-medium text-primary underline-offset-4 hover:underline">
          Voltar para entrar
        </Link>
      </p>
    </>
  );
}
