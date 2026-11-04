"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialFormState } from "@/lib/form-state";
import { signIn } from "../actions";

const notices: Record<string, { tone: "error" | "success"; text: string }> = {
  link: {
    tone: "error",
    text: "O link de confirmação expirou ou já foi usado. Entre com sua senha ou cadastre-se de novo.",
  },
  "conta-excluida": {
    tone: "success",
    text: "Sua conta e todos os seus dados foram excluídos.",
  },
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [state, action, pending] = useActionState(signIn, initialFormState);
  const notice = notices[searchParams.get("erro") ?? searchParams.get("aviso") ?? ""];

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : notice ? (
        <FormAlert tone={notice.tone}>{notice.text}</FormAlert>
      ) : null}

      <input type="hidden" name="next" value={searchParams.get("next") ?? ""} />

      <FormField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <FormField
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
        labelAside={
          <Link
            href="/recuperar-senha"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Esqueci a senha
          </Link>
        }
      />

      <SubmitButton pending={pending} pendingLabel="Entrando…" className="mt-2 w-full">
        Entrar
      </SubmitButton>
    </form>
  );
}
