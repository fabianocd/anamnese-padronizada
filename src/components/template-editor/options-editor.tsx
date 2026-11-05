"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpperCaseInput } from "@/components/ui/upper-case-input";
import { LIMITS } from "@/lib/templates/schema";
import { toUpper } from "@/lib/upper-case";

type OptionsEditorProps = {
  options: string[];
  onChange: (options: string[]) => void;
  fieldName: string;
  error?: string;
};

/** Opções de um campo "Lista de opções": chips + campo para adicionar (Enter). */
export function OptionsEditor({ options, onChange, fieldName, error }: OptionsEditorProps) {
  const [value, setValue] = useState("");
  const full = options.length >= LIMITS.options;

  function add() {
    // Aceita várias de uma vez, separadas por ";" (ex.: colar "Leve; Moderada; Grave").
    const incoming = toUpper(value)
      .split(";")
      .map((item) => item.replace(/\s+/g, " ").trim().slice(0, LIMITS.option).trim())
      .filter(Boolean);
    if (incoming.length === 0) return;
    const existing = new Set(options.map((option) => option.toLocaleLowerCase("pt-BR")));
    const fresh = incoming.filter((item) => !existing.has(item.toLocaleLowerCase("pt-BR")));
    onChange([...options, ...fresh].slice(0, LIMITS.options));
    setValue("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    } else if (event.key === "Backspace" && value === "" && options.length > 0) {
      onChange(options.slice(0, -1));
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-2">
      {options.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label={`Opções de ${fieldName}`}>
          {options.map((option, index) => (
            <li
              key={`${option}-${index}`}
              className="flex items-center gap-0.5 rounded-full border border-border bg-background/50 py-0.5 pr-0.5 pl-2.5 text-xs uppercase"
            >
              {option}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="rounded-full"
                aria-label={`Remover opção ${option}`}
                onClick={() => onChange(options.filter((_, i) => i !== index))}
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-1.5">
        <UpperCaseInput
          value={value}
          onValueChange={setValue}
          onKeyDown={onKeyDown}
          placeholder={full ? "Limite de opções atingido" : "Nova opção (Enter para adicionar)"}
          aria-label={`Nova opção de ${fieldName}`}
          aria-invalid={Boolean(error) || undefined}
          maxLength={LIMITS.option * 4}
          disabled={full}
          className="h-8 rounded-lg text-xs md:text-xs"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 rounded-lg"
          onClick={add}
          disabled={full || !value.trim()}
        >
          <Plus aria-hidden />
          Adicionar
        </Button>
      </div>
      {error ? <p className="mt-1 text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
