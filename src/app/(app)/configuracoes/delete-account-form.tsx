"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialFormState } from "@/lib/form-state";
import { DELETE_CONFIRMATION } from "@/lib/validation/settings";
import { deleteAccount } from "./actions";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, initialFormState);
  const [typed, setTyped] = useState("");

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message && !state.fieldErrors ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}

      <FormField
        label={`Digite ${DELETE_CONFIRMATION} para confirmar`}
        name="confirmation"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        errors={state.fieldErrors?.confirmation}
      />

      <div>
        <SubmitButton
          pending={pending}
          pendingLabel="Excluindo…"
          variant="destructive"
          disabled={typed !== DELETE_CONFIRMATION}
        >
          <Trash2 aria-hidden />
          Excluir conta e dados
        </SubmitButton>
      </div>
    </form>
  );
}
