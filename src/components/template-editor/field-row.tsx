"use client";

import { memo, useState, type Dispatch } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Lightbulb, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  LIMITS,
  type EditableField,
  type FieldType,
} from "@/lib/templates/schema";
import type { EditorIssues } from "@/lib/templates/validate";
import { cn } from "@/lib/utils";
import { OptionsEditor } from "./options-editor";
import type { EditorAction } from "./state";

type FieldRowProps = {
  sectionId: string;
  field: EditableField;
  index: number;
  issues?: EditorIssues["fields"][string];
  autoFocus: boolean;
  dispatch: Dispatch<EditorAction>;
};

export const FieldRow = memo(function FieldRow({
  sectionId,
  field,
  index,
  issues,
  autoFocus,
  dispatch,
}: FieldRowProps) {
  const [showHint, setShowHint] = useState(Boolean(field.hint));
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const update = (patch: Partial<Omit<EditableField, "id">>) =>
    dispatch({ type: "updateField", sectionId, fieldId: field.id, patch });

  const labelName = field.label.trim() || `campo ${index + 1}`;
  const hintVisible = showHint || Boolean(field.hint) || Boolean(issues?.hint);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative flex gap-1.5 rounded-xl border border-transparent py-2 pr-1 pl-0.5 sm:gap-2",
        isDragging && "z-10 border-border bg-popover shadow-lg",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Arrastar ${labelName}`}
        className="mt-1.5 grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <Input
              value={field.label}
              onChange={(event) => update({ label: event.target.value })}
              placeholder="Nome do campo (ex.: Idade)"
              aria-label={`Nome do campo ${index + 1}`}
              aria-invalid={Boolean(issues?.label) || undefined}
              maxLength={LIMITS.label}
              autoFocus={autoFocus}
              className="h-9 rounded-lg uppercase placeholder:normal-case"
            />
            {issues?.label ? (
              <p className="mt-1 text-xs font-medium text-destructive">{issues.label}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <Select
              value={field.type}
              onValueChange={(value) => update({ type: value as FieldType })}
            >
              <SelectTrigger
                className="h-9! w-full rounded-lg sm:w-40"
                aria-label={`Tipo de ${labelName}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {FIELD_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("size-9 shrink-0", hintVisible && "text-primary")}
              aria-label={hintVisible ? `Dica de ${labelName}` : `Adicionar dica a ${labelName}`}
              aria-pressed={hintVisible}
              disabled={Boolean(field.hint)}
              onClick={() => setShowHint((value) => !value)}
              title="Dica para quem preenche (não sai no PDF)"
            >
              <Lightbulb aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={`Remover ${labelName}`}
              onClick={() => dispatch({ type: "removeField", sectionId, fieldId: field.id })}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        </div>

        {hintVisible ? (
          <div>
            <Input
              value={field.hint ?? ""}
              onChange={(event) => update({ hint: event.target.value })}
              placeholder="Dica para quem preenche (ex.: Escala de Bristol). Não sai no PDF."
              aria-label={`Dica de ${labelName}`}
              aria-invalid={Boolean(issues?.hint) || undefined}
              maxLength={LIMITS.hint}
              className="h-8 rounded-lg text-xs md:text-xs"
            />
            {issues?.hint ? (
              <p className="mt-1 text-xs font-medium text-destructive">{issues.hint}</p>
            ) : null}
          </div>
        ) : null}

        {field.type === "select" ? (
          <OptionsEditor
            options={field.options ?? []}
            onChange={(options) => update({ options })}
            fieldName={labelName}
            error={issues?.options}
          />
        ) : null}
      </div>
    </li>
  );
});
