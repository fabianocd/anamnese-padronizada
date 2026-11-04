"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileQuestion, FileUp, Info, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  clearTemplateDraft,
  parseTemplateDraft,
  readTemplateDraftRaw,
  subscribeTemplateDraft,
} from "@/lib/templates/draft-storage";
import {
  FIELD_TYPE_LABELS,
  type TemplateDraft,
  type TemplateSection,
} from "@/lib/templates/schema";

/** `undefined` no servidor/hidratação: o rascunho só existe no navegador. */
function useTemplateDraft(): TemplateDraft | null | undefined {
  const raw = useSyncExternalStore(
    subscribeTemplateDraft,
    readTemplateDraftRaw,
    () => undefined,
  );
  return useMemo(() => (raw === undefined ? undefined : parseTemplateDraft(raw)), [raw]);
}

export function DraftReview() {
  const router = useRouter();
  const draft = useTemplateDraft();

  if (draft === undefined) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (draft === null) {
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

  const fieldCount = draft.schema.sections.reduce((sum, section) => sum + section.fields.length, 0);

  function startOver() {
    clearTemplateDraft();
    router.push("/modelos/novo");
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="glass flex flex-col gap-4 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-primary uppercase">
            {draft.origin === "ai" ? <Sparkles className="size-3.5" aria-hidden /> : null}
            {draft.origin === "ai" ? "Rascunho gerado pela IA" : "Modelo em branco"}
          </p>
          <h2 className="mt-1 truncate font-heading text-2xl font-semibold tracking-tight">
            {draft.title || "Sem título"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {draft.schema.sections.length} seções · {fieldCount} campos
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-10 rounded-xl px-4"
          onClick={startOver}
        >
          <FileUp aria-hidden />
          Enviar outro arquivo
        </Button>
      </section>

      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p>
          {draft.origin === "ai"
            ? "A IA pode errar: confira se nenhum campo ficou de fora e se os tipos fazem sentido. "
            : ""}
          A edição (títulos, tipos, ordem) e o salvamento do modelo chegam na próxima etapa. Este
          rascunho fica guardado só nesta aba.
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {draft.schema.sections.map((section) => (
          <SectionPreview key={section.id} section={section} />
        ))}
      </ol>
    </div>
  );
}

function SectionPreview({ section }: { section: TemplateSection }) {
  const heading = `#${section.abbreviation ?? section.title}:`;
  return (
    <li className="glass rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-heading text-base font-semibold tracking-tight">{heading}</h3>
        {section.abbreviation ? (
          <span className="text-sm text-muted-foreground">{section.title}</span>
        ) : null}
        {section.singleLine ? (
          <Badge variant="outline" className="ml-auto">
            Linha única
          </Badge>
        ) : null}
      </div>

      <ul className="mt-3 flex flex-col divide-y divide-border">
        {section.fields.map((field) => (
          <li key={field.id} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">-{field.label}</p>
              {field.hint ? (
                <p className="text-xs text-muted-foreground">{field.hint}</p>
              ) : null}
              {field.options?.length ? (
                <p className="text-xs text-muted-foreground">
                  Opções: {field.options.join(" · ")}
                </p>
              ) : null}
            </div>
            <Badge variant="secondary" className="shrink-0">
              {FIELD_TYPE_LABELS[field.type]}
            </Badge>
          </li>
        ))}
      </ul>
    </li>
  );
}
