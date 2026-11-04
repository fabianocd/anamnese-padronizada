"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialFormState } from "@/lib/form-state";
import { PASSWORD_MIN } from "@/lib/validation/auth";
import { changePassword } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialFormState);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message && !state.fieldErrors ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}

      <FormField
        label="Senha atual"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.currentPassword}
      />
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

      <div>
        <SubmitButton pending={pending} pendingLabel="Alterando…">
          Alterar senha
        </SubmitButton>
      </div>
    </form>
  );
}
