"use client";

import { memo, useId } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ANSWER_LIMITS, type AnswerValue, type YesNoAnswer } from "@/lib/anamneses/answers";
import type { EditableField } from "@/lib/templates/schema";
import { cn } from "@/lib/utils";

const EMPTY_YES_NO: YesNoAnswer = { choice: null, note: "" };

/**
 * Cada campo ocupa duas linhas da grade da seção (subgrid): cabeçalho
 * (rótulo + dica) e resposta. Assim as caixas lado a lado ficam alinhadas
 * mesmo quando só um dos campos tem dica ou o rótulo quebra de linha.
 */
const FIELD_CELL = "grid grid-rows-subgrid row-span-2";
const FIELD_HEADER = "flex flex-col gap-1 self-end pb-1";

/** Campos de identificação: lembrete da LGPD (decisão 2). */
const IDENTITY_LABEL = /\b(INICIAIS|NOME)\b/;

type FieldInputProps = {
  field: EditableField;
  value: AnswerValue | undefined;
  onChange: (fieldId: string, value: AnswerValue) => void;
};

export const FieldInput = memo(function FieldInput({ field, value, onChange }: FieldInputProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const text = typeof value === "string" ? value : "";
  const lgpd = IDENTITY_LABEL.test(field.label)
    ? "Use iniciais ou um código, nunca o nome completo."
    : null;
  const hints = [field.hint, lgpd].filter(Boolean);
  const describedBy = hints.length > 0 ? hintId : undefined;
  const set = (next: AnswerValue) => onChange(field.id, next);

  const label = (
    <Label htmlFor={field.type === "yes_no" ? undefined : id} className="leading-snug">
      {field.label}
    </Label>
  );
  const hint =
    hints.length > 0 ? (
      <p id={hintId} className="text-xs text-muted-foreground">
        {hints.join(" · ")}
      </p>
    ) : null;

  if (field.type === "yes_no") {
    const answer = typeof value === "object" ? value : EMPTY_YES_NO;
    return (
      <div
        className={cn(FIELD_CELL, "sm:col-span-2")}
        role="group"
        aria-labelledby={`${id}-label`}
      >
        <div className={FIELD_HEADER}>
          <span id={`${id}-label`} className="text-sm leading-snug font-medium">
            {field.label}
          </span>
          {hint}
        </div>
        <div className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center">
          <div className="flex gap-1.5">
            {(
              [
                { choice: "yes", label: "Sim" },
                { choice: "no", label: "Não" },
              ] as const
            ).map((option) => {
              const selected = answer.choice === option.choice;
              return (
                <Button
                  key={option.choice}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  aria-pressed={selected}
                  className="h-10 min-w-16 flex-1 rounded-xl sm:flex-none"
                  onClick={() => set({ ...answer, choice: selected ? null : option.choice })}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
          <Input
            value={answer.note}
            onChange={(event) => set({ ...answer, note: event.target.value })}
            placeholder="Observação (opcional)"
            aria-label={`Observação de ${field.label}`}
            maxLength={ANSWER_LIMITS.note}
            className="h-10 flex-1 rounded-xl px-3"
          />
        </div>
      </div>
    );
  }

  let control;
  switch (field.type) {
    case "long_text":
      control = (
        <Textarea
          id={id}
          value={text}
          onChange={(event) => set(event.target.value)}
          aria-describedby={describedBy}
          maxLength={ANSWER_LIMITS.longText}
          rows={3}
          className="min-h-20 rounded-xl px-3"
        />
      );
      break;
    case "number":
      control = (
        <Input
          id={id}
          value={text}
          // Aceita vírgula decimal e medidas como "120/80".
          onChange={(event) => set(event.target.value.replace(/[^\d.,\-/\s]/g, ""))}
          inputMode="decimal"
          aria-describedby={describedBy}
          maxLength={ANSWER_LIMITS.number}
          className="h-10 rounded-xl px-3"
        />
      );
      break;
    case "date":
      control = (
        <Input
          id={id}
          type="date"
          value={text}
          onChange={(event) => set(event.target.value)}
          aria-describedby={describedBy}
          className="h-10 rounded-xl px-3"
        />
      );
      break;
    case "select":
      control = (
        <div className="flex gap-1.5">
          {/* value "" mostra o placeholder (Radix Select). */}
          <Select value={text} onValueChange={(next) => set(next)}>
            <SelectTrigger
              id={id}
              aria-describedby={describedBy}
              className="h-10! w-full min-w-0 rounded-xl px-3"
            >
              <SelectValue placeholder="Escolha uma opção" />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {text ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 shrink-0 rounded-xl text-muted-foreground"
              aria-label={`Limpar ${field.label}`}
              onClick={() => set("")}
            >
              <X aria-hidden />
            </Button>
          ) : null}
        </div>
      );
      break;
    default:
      control = (
        <Input
          id={id}
          value={text}
          onChange={(event) => set(event.target.value)}
          aria-describedby={describedBy}
          maxLength={ANSWER_LIMITS.shortText}
          autoComplete="off"
          className="h-10 rounded-xl px-3"
        />
      );
  }

  return (
    <div className={cn(FIELD_CELL, field.type === "long_text" && "sm:col-span-2")}>
      <div className={FIELD_HEADER}>
        {label}
        {hint}
      </div>
      <div className="pb-3">{control}</div>
    </div>
  );
});
