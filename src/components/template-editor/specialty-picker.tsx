"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { Check, LoaderCircle, Plus, X } from "lucide-react";
import { createSpecialty } from "@/app/(app)/modelos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SpecialtyChoice = {
  id: string;
  name: string;
  defaultTemplateId: string | null;
  defaultTemplateTitle: string | null;
};

const NONE = "__none";
const NEW = "__new";

type SpecialtyPickerProps = {
  id: string;
  specialties: SpecialtyChoice[];
  value: string | null;
  onChange: (specialtyId: string | null) => void;
  onCreated: (specialty: SpecialtyChoice) => void;
};

export function SpecialtyPicker({ id, specialties, value, onChange, onCreated }: SpecialtyPickerProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createSpecialty(name);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onCreated({ ...result.specialty, defaultTemplateId: null, defaultTemplateTitle: null });
      onChange(result.specialty.id);
      setCreating(false);
      setName("");
    });
  }

  function cancel() {
    setCreating(false);
    setName("");
    setError(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (name.trim() && !pending) create();
    } else if (event.key === "Escape") {
      cancel();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Especialidade</Label>
      {creating ? (
        <div className="flex gap-1.5">
          <Input
            id={id}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ex.: Pediatria"
            maxLength={80}
            autoFocus
            aria-invalid={Boolean(error) || undefined}
            className="h-10 rounded-xl px-3"
          />
          <Button
            type="button"
            size="icon"
            className="size-10 shrink-0 rounded-xl"
            onClick={create}
            disabled={pending || !name.trim()}
            aria-label="Criar especialidade"
          >
            {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check aria-hidden />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 rounded-xl"
            onClick={cancel}
            aria-label="Cancelar"
          >
            <X aria-hidden />
          </Button>
        </div>
      ) : (
        <Select
          value={value ?? NONE}
          onValueChange={(next) => {
            if (next === NEW) setCreating(true);
            else onChange(next === NONE ? null : next);
          }}
        >
          <SelectTrigger id={id} className="h-10! w-full rounded-xl px-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Sem especialidade</SelectItem>
            {specialties.map((specialty) => (
              <SelectItem key={specialty.id} value={specialty.id}>
                {specialty.name}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value={NEW}>
              <Plus aria-hidden />
              Nova especialidade
            </SelectItem>
          </SelectContent>
        </Select>
      )}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
