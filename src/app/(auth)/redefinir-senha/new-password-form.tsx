"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialFormState } from "@/lib/form-state";
import { PASSWORD_MIN } from "@/lib/validation/auth";
import { updatePasswordAfterReset } from "../actions";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAfterReset, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}

      <FormField
        label="Nova senha"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        required
        hint={`Pelo menos ${PASSWORD_MIN} caracteres.`}
        errors={state.fieldErrors?.password}
      />
      <FormField
        label="Confirmar nova senha"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirmPassword}
      />

      <SubmitButton pending={pending} pendingLabel="Salvando…" className="mt-2 w-full">
        Salvar nova senha
      </SubmitButton>
    </form>
  );
}
