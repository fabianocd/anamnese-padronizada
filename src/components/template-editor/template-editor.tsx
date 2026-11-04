"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Eye,
  FileText,
  Info,
  LoaderCircle,
  PencilLine,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { deleteTemplate, saveTemplate } from "@/app/(app)/modelos/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { isCondutaSection } from "@/lib/templates/normalize";
import { LIMITS, newId, type EditableTemplate } from "@/lib/templates/schema";
import { emptyIssues, validateTemplateForSave } from "@/lib/templates/validate";
import { cn } from "@/lib/utils";
import { SectionCard } from "./section-card";
import { SpecialtyPicker, type SpecialtyChoice } from "./specialty-picker";
import { editorReducer, initEditorState, type EditorState } from "./state";
import { TemplatePreview } from "./template-preview";

export type TemplateEditorProps = {
  /** Sem `templateId`: modelo novo (rascunho); com: edição de um modelo salvo. */
  templateId?: string;
  initial: {
    title: string;
    specialtyId?: string | null;
    isDefault?: boolean;
    schema: EditableTemplate;
  };
  specialties: SpecialtyChoice[];
  origin?: "ai" | "manual";
  sourceFilePath?: string;
  sourceLinks?: { name: string; url: string }[];
  /** Modelo novo: chamado (com atraso) a cada alteração, para guardar o rascunho. */
  onDraftChange?: (state: EditorState) => void;
  /** Modelo novo: chamado depois de salvar, antes de sair da página. */
  onCreated?: () => void;
  /** Modelo novo: descartar o rascunho. */
  onDiscard?: () => void;
};

const EMPTY_ISSUES = emptyIssues();

export function TemplateEditor({
  templateId,
  initial,
  specialties: initialSpecialties,
  origin,
  sourceFilePath,
  sourceLinks = [],
  onDraftChange,
  onCreated,
  onDiscard,
}: TemplateEditorProps) {
  const router = useRouter();
  const isNew = !templateId;
  const titleId = useId();
  const specialtyFieldId = useId();
  const defaultSwitchId = useId();

  const [state, dispatch] = useReducer(editorReducer, initial, initEditorState);
  const serialized = useMemo(() => JSON.stringify(state), [state]);
  const [baseline, setBaseline] = useState(serialized);
  const dirty = isNew || serialized !== baseline;

  const [specialties, setSpecialties] = useState(initialSpecialties);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [showIssues, setShowIssues] = useState(false);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Depois da primeira tentativa de salvar, os erros acompanham a edição.
  const issues = useMemo(
    () =>
      showIssues
        ? (() => {
            const result = validateTemplateForSave(state.title, { sections: state.sections });
            return result.ok ? EMPTY_ISSUES : result.issues;
          })()
        : EMPTY_ISSUES,
    [showIssues, state.title, state.sections],
  );

  // Rascunho de modelo novo guardado na aba (sessionStorage) enquanto edita.
  useEffect(() => {
    if (!onDraftChange) return;
    const timer = window.setTimeout(() => onDraftChange(state), 400);
    return () => window.clearTimeout(timer);
  }, [state, onDraftChange]);

  // Avisa antes de fechar/recarregar com alterações não salvas.
  useEffect(() => {
    if (!dirty || isNew) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, isNew]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const movable = state.sections.filter((section) => !isCondutaSection(section));
  const conduta = state.sections.filter(isCondutaSection);
  const fieldCount = state.sections.reduce((sum, section) => sum + section.fields.length, 0);
  const allCollapsed = state.sections.every((section) => collapsed.has(section.id));
  const specialty = specialties.find((item) => item.id === state.specialtyId) ?? null;
  const replacesDefault =
    specialty?.defaultTemplateId && specialty.defaultTemplateId !== templateId
      ? specialty.defaultTemplateTitle
      : null;

  const toggleCollapse = useCallback((sectionId: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  const removeSection = useCallback((sectionId: string) => {
    const sections = stateRef.current.sections;
    const index = sections.findIndex((section) => section.id === sectionId);
    const section = sections[index];
    if (!section) return;
    dispatch({ type: "removeSection", sectionId });
    const name = (section.abbreviation || section.title).trim().toLocaleUpperCase("pt-BR");
    toast(name ? `Seção #${name} removida.` : "Seção removida.", {
      action: {
        label: "Desfazer",
        onClick: () => dispatch({ type: "restoreSection", section, index }),
      },
    });
  }, []);

  const onFieldAdded = useCallback((fieldId: string) => setFocusId(fieldId), []);

  function addSection() {
    const id = newId();
    dispatch({ type: "addSection", id });
    setFocusId(id);
  }

  function onSectionDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      dispatch({ type: "moveSection", activeId: String(active.id), overId: String(over.id) });
    }
  }

  function revealErrors(sectionIds: string[]) {
    setView("edit");
    setCollapsed((previous) => {
      const next = new Set(previous);
      sectionIds.forEach((id) => next.delete(id));
      return next;
    });
    window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>("[data-template-editor] [aria-invalid=true]");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
    }, 50);
  }

  function save() {
    const validation = validateTemplateForSave(state.title, { sections: state.sections });
    if (!validation.ok) {
      setShowIssues(true);
      const invalidSections = validation.prepared.sections
        .filter(
          (section) =>
            validation.issues.sections[section.id] ||
            section.fields.some((field) => validation.issues.fields[field.id]),
        )
        .map((section) => section.id);
      revealErrors(invalidSections);
      toast.error(validation.issues.general ?? "Confira os campos destacados.");
      return;
    }

    startSaving(async () => {
      const result = await saveTemplate({
        id: templateId,
        title: state.title,
        specialtyId: state.specialtyId,
        isDefault: state.isDefault,
        schema: { sections: state.sections },
        sourceFilePath: isNew ? sourceFilePath : undefined,
      });

      if (!result.ok) {
        if (result.issues) setShowIssues(true);
        toast.error(result.message);
        return;
      }

      if (isNew) {
        onCreated?.();
        router.push("/modelos?aviso=modelo-criado");
        return;
      }

      // Adota a versão normalizada (a mesma que o servidor salvou).
      const saved: EditorState = {
        ...state,
        title: validation.title,
        sections: validation.schema.sections,
      };
      dispatch({ type: "setTitle", title: saved.title });
      dispatch({ type: "replaceSections", sections: saved.sections });
      setBaseline(JSON.stringify(saved));
      setShowIssues(false);
      setSpecialties((list) =>
        list.map((item) => {
          if (item.id === state.specialtyId && state.isDefault) {
            return { ...item, defaultTemplateId: result.id, defaultTemplateTitle: saved.title };
          }
          if (item.defaultTemplateId === result.id) {
            return { ...item, defaultTemplateId: null, defaultTemplateTitle: null };
          }
          return item;
        }),
      );
      toast.success("Modelo salvo.");
    });
  }

  function remove() {
    if (!templateId) return;
    startDeleting(async () => {
      const result = await deleteTemplate(templateId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      router.push("/modelos?aviso=modelo-excluido");
    });
  }

  return (
    <div className="flex flex-col gap-4" data-template-editor>
      <section className="glass flex flex-col gap-4 rounded-3xl p-4 sm:p-6">
        {isNew ? (
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-primary uppercase">
            {origin === "ai" ? <Sparkles className="size-3.5" aria-hidden /> : null}
            {origin === "ai" ? "Rascunho gerado pela IA" : "Modelo em branco"}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor={titleId}>Título do modelo</Label>
          <Input
            id={titleId}
            value={state.title}
            onChange={(event) => dispatch({ type: "setTitle", title: event.target.value })}
            placeholder="Ex.: Anamnese Pediátrica"
            maxLength={LIMITS.templateTitle}
            aria-invalid={Boolean(issues.title) || undefined}
            className="h-11 rounded-xl px-3 font-heading text-lg font-semibold md:text-lg"
          />
          {issues.title ? (
            <p className="text-xs font-medium text-destructive">{issues.title}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SpecialtyPicker
            id={specialtyFieldId}
            specialties={specialties}
            value={state.specialtyId}
            onChange={(specialtyId) => dispatch({ type: "setSpecialty", specialtyId })}
            onCreated={(created) =>
              setSpecialties((list) =>
                [...list, created].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
              )
            }
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm leading-none font-medium select-none">Modelo padrão</span>
            <div className="flex min-h-10 items-start gap-3 rounded-xl border border-border bg-background/30 px-3 py-2.5">
              <Switch
                id={defaultSwitchId}
                checked={state.isDefault}
                disabled={!specialty}
                onCheckedChange={(checked) => dispatch({ type: "setDefault", isDefault: checked })}
                className="mt-0.5"
              />
              <label htmlFor={defaultSwitchId} className="text-sm">
                <span className={cn("font-medium", !specialty && "text-muted-foreground")}>
                  {specialty ? `Padrão de ${specialty.name}` : "Padrão da especialidade"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {!specialty
                    ? "Escolha uma especialidade para marcar."
                    : state.isDefault && replacesDefault
                      ? `Substitui o padrão atual: "${replacesDefault}".`
                      : "Sugerido ao criar uma nova anamnese dessa especialidade."}
                </span>
              </label>
            </div>
          </div>
        </div>

        {sourceLinks.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>Ficha original:</span>
            {sourceLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
              >
                <FileText className="size-3.5" aria-hidden />
                {link.name}
              </a>
            ))}
          </div>
        ) : null}
      </section>

      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p>
          Aqui você monta a <strong className="text-foreground">estrutura</strong> do modelo: os
          nomes dos campos (ex.: Iniciais, Idade), não as respostas. Os dados do paciente são
          preenchidos depois, em <strong className="text-foreground">Nova anamnese</strong>.
          {isNew && origin === "ai"
            ? " A IA pode errar: confira se nenhum campo ficou de fora e se os tipos fazem sentido."
            : ""}
          {isNew ? " O rascunho fica guardado só nesta aba até você salvar." : ""}
        </p>
      </div>

      <div
        className="glass flex rounded-xl p-1 lg:hidden"
        role="group"
        aria-label="Alternar entre edição e prévia"
      >
        {(
          [
            { value: "edit", label: "Editar", icon: PencilLine },
            { value: "preview", label: "Prévia", icon: Eye },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setView(value)}
            aria-pressed={view === value}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-muted-foreground transition-colors",
              view === value && "bg-primary text-primary-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className={cn("flex min-w-0 flex-col gap-3", view === "preview" && "hidden lg:flex")}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-sm text-muted-foreground">
              {state.sections.length} seções · {fieldCount} campos
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setCollapsed(
                  allCollapsed ? new Set() : new Set(state.sections.map((section) => section.id)),
                )
              }
            >
              {allCollapsed ? <ChevronsUpDown aria-hidden /> : <ChevronsDownUp aria-hidden />}
              {allCollapsed ? "Expandir todas" : "Recolher todas"}
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={onSectionDragEnd}
          >
            <SortableContext
              items={movable.map((section) => section.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="flex flex-col gap-3">
                {movable.map((section, index) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    index={index}
                    movableCount={movable.length}
                    locked={false}
                    collapsed={collapsed.has(section.id)}
                    issues={issues}
                    focusFieldId={focusId}
                    dispatch={dispatch}
                    onToggleCollapse={toggleCollapse}
                    onRemove={removeSection}
                    onFieldAdded={onFieldAdded}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 rounded-2xl border-dashed"
            onClick={addSection}
            disabled={state.sections.length >= LIMITS.sections}
          >
            <Plus aria-hidden />
            {state.sections.length >= LIMITS.sections
              ? "Limite de seções atingido"
              : "Adicionar seção"}
          </Button>

          <ol className="flex flex-col gap-3">
            {conduta.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                index={movable.length}
                movableCount={movable.length}
                locked
                collapsed={collapsed.has(section.id)}
                issues={issues}
                focusFieldId={focusId}
                dispatch={dispatch}
                onToggleCollapse={toggleCollapse}
                onRemove={removeSection}
                onFieldAdded={onFieldAdded}
              />
            ))}
          </ol>
        </div>

        {/*
          No desktop a prévia gruda entre as barras fixas, sem ficar por baixo delas:
          topo = barra do topo (top-3 + h-16) + espaço (5.5rem);
          base = barra de salvar (bottom-3 + ~4rem de altura) + espaço (5.75rem).
        */}
        <aside
          className={cn(
            "glass min-w-0 rounded-3xl p-4 sm:p-5 lg:sticky lg:top-[5.5rem] lg:max-h-[calc(100dvh-11.25rem)] lg:overflow-y-auto",
            view === "edit" && "hidden lg:block",
          )}
          aria-label="Prévia do modelo"
        >
          <p className="mb-3 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Eye className="size-3.5" aria-hidden />
            Prévia ao vivo
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            Os espaços tracejados são onde as respostas vão entrar.
          </p>
          <TemplatePreview title={state.title} sections={state.sections} />
        </aside>
      </div>

      <div className="glass-bar sticky bottom-3 z-30 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="px-1 text-sm text-muted-foreground" aria-live="polite">
          {isNew
            ? "Rascunho ainda não salvo na conta."
            : dirty
              ? "Alterações não salvas."
              : "Tudo salvo."}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          {isNew ? (
            <ConfirmButton
              label="Descartar"
              title="Descartar o rascunho?"
              description="As seções e campos deste rascunho serão perdidos."
              confirmLabel="Descartar"
              onConfirm={() => onDiscard?.()}
            />
          ) : (
            <>
              <ConfirmButton
                label="Excluir"
                title="Excluir este modelo?"
                description="As anamneses já preenchidas com ele continuam no histórico. O arquivo original enviado também é apagado."
                confirmLabel="Excluir modelo"
                pending={deleting}
                onConfirm={remove}
              />
              <Button asChild variant="ghost" size="lg" className="h-10 rounded-xl px-4">
                <Link href="/modelos">Voltar</Link>
              </Button>
            </>
          )}
          <Button
            type="button"
            size="lg"
            className="h-10 rounded-xl px-4"
            onClick={save}
            disabled={saving || deleting || (!isNew && !dirty)}
            aria-busy={saving || undefined}
          >
            {saving ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />}
            {saving ? "Salvando…" : isNew ? "Salvar modelo" : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmButton({
  label,
  title,
  description,
  confirmLabel,
  pending = false,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="h-10 rounded-xl px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={pending}
        >
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
