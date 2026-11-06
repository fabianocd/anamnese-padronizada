"use client";

import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";

/** Botão "Nova nota" (mostra carregando enquanto cria). */
export function NewNoteButton() {
  const { pending } = useFormStatus();
  return (
    <SubmitButton pending={pending} pendingLabel="Criando…" className="h-10 rounded-xl px-4">
      <Plus aria-hidden />
      Nova nota
    </SubmitButton>
  );
}
