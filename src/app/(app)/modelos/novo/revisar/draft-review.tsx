"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileQuestion, FileUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { EditorSkeleton } from "@/components/template-editor/editor-skeleton";
import type { SpecialtyChoice } from "@/components/template-editor/specialty-picker";
import type { EditorState } from "@/components/template-editor/state";
import { TemplateEditor } from "@/components/template-editor/template-editor";
import { Button } from "@/components/ui/button";
import {
  clearTemplateDraft,
  parseTemplateDraft,
  readTemplateDraftRaw,
  saveTemplateDraft,
  subscribeTemplateDraft,
} from "@/lib/templates/draft-storage";
import type { TemplateDraft } from "@/lib/templates/schema";

/** `undefined` no servidor/hidratação: o rascunho só existe no navegador. */
function useTemplateDraft(): TemplateDraft | null | undefined {
  const raw = useSyncExternalStore(
    subscribeTemplateDraft,
    readTemplateDraftRaw,
    () => undefined,
  );
  return useMemo(() => (raw === undefined ? undefined : parseTemplateDraft(raw)), [raw]);
}

export function DraftReview({ specialties }: { specialties: SpecialtyChoice[] }) {
  const router = useRouter();
  const draft = useTemplateDraft();
  // O rascunho do primeiro carregamento alimenta o editor; depois disso o
  // editor é a fonte (e só escreve de volta no sessionStorage).
  const [initialDraft, setInitialDraft] = useState<TemplateDraft | null>(null);
  const [leaving, setLeaving] = useState(false);

  if (draft && !initialDraft && !leaving) setInitialDraft(draft);

  const onDraftChange = useCallback(
    (state: EditorState) => {
      if (!initialDraft) return;
      saveTemplateDraft({
        ...initialDraft,
        title: state.title,
        schema: { sections: state.sections },
        specialtyId: state.specialtyId,
        isDefault: state.isDefault,
      });
    },
    [initialDraft],
  );

  if (leaving) return <EditorSkeleton />;

  if (draft === undefined) return <EditorSkeleton />;

  if (!initialDraft) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Nenhum rascunho aberto"
        description="O rascunho fica só nesta aba do navegador. Envie a ficha de novo ou crie o modelo manualmente."
        action={
          <Button asChild size="lg" className="h-10 rounded-xl px-4">
            <Link href="/modelos/novo">
              <FileUp aria-hidden />
              Novo modelo
            </Link>
          </Button>
        }
      />
    );
  }

  // Especialidade do rascunho pode ter sido excluída em outra aba.
  const specialtyId = specialties.some((item) => item.id === initialDraft.specialtyId)
    ? initialDraft.specialtyId
    : null;

  return (
    <TemplateEditor
      initial={{
        title: initialDraft.title,
        specialtyId,
        isDefault: initialDraft.isDefault,
        schema: initialDraft.schema,
      }}
      specialties={specialties}
      origin={initialDraft.origin}
      sourceFilePath={initialDraft.sourceFilePath}
      onDraftChange={onDraftChange}
      onCreated={() => {
        setLeaving(true);
        clearTemplateDraft();
      }}
      onDiscard={() => {
        setLeaving(true);
        clearTemplateDraft();
        router.push("/modelos/novo");
      }}
    />
  );
}
