"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialFormState } from "@/lib/form-state";
import { requestPasswordReset } from "../actions";

export function ResetRequestForm() {
  const searchParams = useSearchParams();
  const [state, action, pending] = useActionState(requestPasswordReset, initialFormState);
  const expiredLink = searchParams.get("erro") === "link";

  if (state.status === "success") {
    return <FormAlert tone="success">{state.message}</FormAlert>;
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : expiredLink ? (
        <FormAlert tone="error">
          O link de redefinição expirou ou já foi usado. Peça um novo abaixo.
        </FormAlert>
      ) : null}

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

      <SubmitButton pending={pending} pendingLabel="Enviando…" className="mt-2 w-full">
        Enviar link
      </SubmitButton>
    </form>
  );
}
