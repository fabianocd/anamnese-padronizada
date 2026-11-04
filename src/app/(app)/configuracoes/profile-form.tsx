"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialFormState } from "@/lib/form-state";
import { updateProfile } from "./actions";

type ProfileFormProps = {
  email: string;
  fullName: string | null;
  institution: string | null;
};

export function ProfileForm({ email, fullName, institution }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, initialFormState);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
  }, [state]);

  const values = state.values;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}

      <FormField label="E-mail" name="email" type="email" value={email} readOnly disabled />
      <FormField
        label="Nome"
        name="fullName"
        autoComplete="name"
        defaultValue={values?.fullName ?? fullName ?? ""}
        errors={state.fieldErrors?.fullName}
      />
      <FormField
        label="Instituição"
        name="institution"
        autoComplete="organization"
        placeholder="Ex.: Faculdade de Medicina…"
        hint="Opcional. Pode aparecer no cabeçalho do PDF."
        defaultValue={values?.institution ?? institution ?? ""}
        errors={state.fieldErrors?.institution}
      />

      <div>
        <SubmitButton pending={pending} pendingLabel="Salvando…">
          Salvar perfil
        </SubmitButton>
      </div>
    </form>
  );
}
