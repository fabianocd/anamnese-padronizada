"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialFormState } from "@/lib/form-state";
import { PASSWORD_MIN } from "@/lib/validation/auth";
import { signUp } from "../actions";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initialFormState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span className="grid size-14 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <p role="status" className="text-sm">
          {state.message}
        </p>
        <p className="text-xs text-muted-foreground">
          Não chegou? Confira o spam. O envio pode levar alguns minutos.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}

      <FormField
        label="Nome"
        name="fullName"
        autoComplete="name"
        required
        defaultValue={state.values?.fullName}
        errors={state.fieldErrors?.fullName}
      />
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
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        required
        hint={`Pelo menos ${PASSWORD_MIN} caracteres.`}
        errors={state.fieldErrors?.password}
      />
      <FormField
        label="Confirmar senha"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirmPassword}
      />

      <SubmitButton pending={pending} pendingLabel="Criando conta…" className="mt-2 w-full">
        Criar conta
      </SubmitButton>
    </form>
  );
}
