"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";

/** Botão "Preencher" do card do modelo (mostra carregando enquanto cria). */
export function StartButton({ primary }: { primary: boolean }) {
  const { pending } = useFormStatus();
  return (
    <SubmitButton
      pending={pending}
      pendingLabel="Abrindo…"
      variant={primary ? "default" : "secondary"}
      className="w-full"
    >
      Preencher
      <ArrowRight aria-hidden />
    </SubmitButton>
  );
}
