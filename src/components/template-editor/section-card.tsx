"use client";

import { memo, useId, type Dispatch } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  GripVertical,
  Pin,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpperCaseInput } from "@/components/ui/upper-case-input";
import { Switch } from "@/components/ui/switch";
import { sectionHeading } from "@/lib/templates/format";
import { LIMITS, newId, type EditableSection } from "@/lib/templates/schema";
import type { EditorIssues } from "@/lib/templates/validate";
import { cn } from "@/lib/utils";
import { FieldRow } from "./field-row";
import type { EditorAction } from "./state";

type SectionCardProps = {
  section: EditableSection;
  index: number;
  movableCount: number;
  locked: boolean;
  collapsed: boolean;
  issues: EditorIssues;
  focusFieldId: string | null;
  dispatch: Dispatch<EditorAction>;
  onToggleCollapse: (sectionId: string) => void;
  onRemove: (sectionId: string) => void;
  onFieldAdded: (fieldId: string) => void;
};

export const SectionCard = memo(function SectionCard({
  section,
  index,
  movableCount,
  locked,
  collapsed,
  issues,
  focusFieldId,
  dispatch,
  onToggleCollapse,
  onRemove,
  onFieldAdded,
}: SectionCardProps) {
  const bodyId = useId();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: locked });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sectionIssues = issues.sections[section.id];
  const fieldIssueCount = section.fields.filter((field) => issues.fields[field.id]).length;
  const hasErrors = Boolean(sectionIssues) || fieldIssueCount > 0;
  const name = section.title.trim() || section.abbreviation?.trim() || `seção ${index + 1}`;
  const fullFields = section.fields.length >= LIMITS.fieldsPerSection;

  function onDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      dispatch({
        type: "moveField",
        sectionId: section.id,
        activeId: String(active.id),
        overId: String(over.id),
      });
    }
  }

  function addField() {
    const id = newId();
    dispatch({ type: "addField", sectionId: section.id, id });
    onFieldAdded(id);
    if (collapsed) onToggleCollapse(section.id);
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "glass relative rounded-2xl p-3 sm:p-4",
        isDragging && "z-20 shadow-2xl ring-2 ring-primary/40",
        hasErrors && "ring-1 ring-destructive/50",
      )}
      aria-label={`Seção ${sectionHeading(section)}`}
    >
      <div className="flex items-start gap-1.5 sm:gap-2">
        {locked ? (
          <span
            className="mt-1.5 grid size-7 shrink-0 place-items-center text-muted-foreground"
            title="A #CONDUTA fica sempre no fim"
          >
            <Pin className="size-4" aria-hidden />
          </span>
        ) : (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Arrastar seção ${name}`}
            className="mt-1.5 grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 gap-2">
            <UpperCaseInput
              value={section.abbreviation ?? ""}
              onValueChange={(abbreviation) =>
                dispatch({ type: "updateSection", sectionId: section.id, patch: { abbreviation } })
              }
              placeholder="Sigla"
              aria-label={`Sigla da seção ${name}`}
              maxLength={LIMITS.abbreviation}
              disabled={locked}
              className="h-10 w-20 shrink-0 rounded-lg font-semibold uppercase placeholder:font-normal placeholder:normal-case sm:w-24"
            />
            <div className="min-w-0 flex-1">
              <UpperCaseInput
                value={section.title}
                onValueChange={(title) =>
                  dispatch({ type: "updateSection", sectionId: section.id, patch: { title } })
                }
                placeholder="Título da seção (ex.: Alimentação)"
                aria-label={`Título da seção ${index + 1}`}
                aria-invalid={Boolean(sectionIssues?.title) || undefined}
                maxLength={LIMITS.title}
                readOnly={locked}
                autoFocus={focusFieldId === section.id}
                className="h-10 rounded-lg font-heading font-semibold uppercase placeholder:font-sans placeholder:font-normal placeholder:normal-case"
              />
              {sectionIssues?.title ? (
                <p className="mt-1 text-xs font-medium text-destructive">{sectionIssues.title}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-0.5">
            {!locked ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 text-muted-foreground"
                  aria-label={`Mover seção ${name} para cima`}
                  disabled={index === 0}
                  onClick={() =>
                    dispatch({ type: "shiftSection", sectionId: section.id, delta: -1 })
                  }
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 text-muted-foreground"
                  aria-label={`Mover seção ${name} para baixo`}
                  disabled={index >= movableCount - 1}
                  onClick={() =>
                    dispatch({ type: "shiftSection", sectionId: section.id, delta: 1 })
                  }
                >
                  <ArrowDown aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 text-muted-foreground hover:text-destructive"
                  aria-label={`Remover seção ${name}`}
                  onClick={() => onRemove(section.id)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 text-muted-foreground"
              aria-label={collapsed ? `Expandir seção ${name}` : `Recolher seção ${name}`}
              aria-expanded={!collapsed}
              aria-controls={bodyId}
              onClick={() => onToggleCollapse(section.id)}
            >
              <ChevronDown
                className={cn("transition-transform", collapsed && "-rotate-90")}
                aria-hidden
              />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 pl-9 text-xs text-muted-foreground">
        <span className="font-heading font-semibold text-foreground/80">
          {sectionHeading(section)}
        </span>
        <span>
          {section.fields.length === 1 ? "1 campo" : `${section.fields.length} campos`}
        </span>
        {locked ? <span>Sempre no fim do modelo</span> : null}
        <label className="ml-auto flex cursor-pointer items-center gap-2">
          <Switch
            size="sm"
            checked={Boolean(section.singleLine)}
            onCheckedChange={(checked) =>
              dispatch({
                type: "updateSection",
                sectionId: section.id,
                patch: { singleLine: checked },
              })
            }
            aria-label={`Respostas de ${name} em uma linha só`}
          />
          Linha única
        </label>
      </div>

      {hasErrors && collapsed ? (
        <p className="mt-2 pl-9 text-xs font-medium text-destructive">
          Esta seção tem campos para corrigir.
        </p>
      ) : null}

      <div id={bodyId} hidden={collapsed}>
        {section.fields.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={section.fields.map((field) => field.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="mt-2 flex flex-col divide-y divide-border/60">
                {section.fields.map((field, fieldIndex) => (
                  <FieldRow
                    key={field.id}
                    sectionId={section.id}
                    field={field}
                    index={fieldIndex}
                    issues={issues.fields[field.id]}
                    autoFocus={focusFieldId === field.id}
                    dispatch={dispatch}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <p className="mt-3 pl-9 text-sm text-muted-foreground">
            Sem campos: a seção vira um campo de texto livre com o próprio título.
          </p>
        )}

        {sectionIssues?.fields || sectionIssues?.other ? (
          <p className="mt-2 pl-9 text-xs font-medium text-destructive">
            {sectionIssues.fields ?? sectionIssues.other}
          </p>
        ) : null}

        <div className="mt-2 pl-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary"
            onClick={addField}
            disabled={fullFields}
          >
            <Plus aria-hidden />
            {fullFields ? "Limite de campos atingido" : "Adicionar campo"}
          </Button>
        </div>
      </div>
    </li>
  );
});
