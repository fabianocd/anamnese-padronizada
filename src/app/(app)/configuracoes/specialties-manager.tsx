"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { initialFormState } from "@/lib/form-state";
import type { Specialty } from "@/lib/data/specialties";
import { addSpecialty, deleteSpecialty } from "./actions";

export function SpecialtiesManager({ specialties }: { specialties: Specialty[] }) {
  const [state, action, pending] = useActionState(addSpecialty, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.querySelector<HTMLInputElement>("input[name=name]")?.focus();
    }
  }, [state]);

  return (
    <div className="flex flex-col gap-4">
      {specialties.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Suas especialidades">
          {specialties.map((specialty) => (
            <li
              key={specialty.id}
              className="flex items-center gap-1 rounded-full border border-border bg-background/40 py-1 pr-1 pl-3 text-sm"
            >
              {specialty.name}
              <form action={deleteSpecialty}>
                <input type="hidden" name="id" value={specialty.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-xs"
                  className="rounded-full"
                  aria-label={`Remover ${specialty.name}`}
                >
                  <X aria-hidden />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma especialidade ainda. Ex.: Pediatria, Clínica Médica, Ginecologia.
        </p>
      )}

      <form
        ref={formRef}
        action={action}
        className="flex flex-col gap-2 sm:flex-row sm:items-start"
        noValidate
      >
        <div className="flex-1">
          <FormField
            label="Nova especialidade"
            name="name"
            maxLength={80}
            autoComplete="off"
            defaultValue={state.status === "error" ? state.values?.name : ""}
            errors={state.fieldErrors?.name}
          />
        </div>
        <SubmitButton
          pending={pending}
          variant="secondary"
          className="sm:mt-[1.375rem]"
        >
          <Plus aria-hidden />
          Adicionar
        </SubmitButton>
      </form>
    </div>
  );
}
