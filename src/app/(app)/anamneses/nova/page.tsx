import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { FilePlus2, Star } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listTemplates, type TemplateSummary } from "@/lib/data/templates";
import { cn } from "@/lib/utils";
import { createAnamnesis } from "../actions";
import { StartButton } from "./start-button";

export const metadata: Metadata = { title: "Nova anamnese" };

export default function NewAnamnesisPage() {
  return (
    <>
      <PageHeader
        title="Nova anamnese"
        description="Escolha um dos seus modelos para começar. O preenchimento é salvo automaticamente."
      />
      <Suspense fallback={<ChooserSkeleton />}>
        <TemplateChooser />
      </Suspense>
    </>
  );
}

type Group = { name: string; templates: TemplateSummary[] };

/** Agrupa por especialidade (sem especialidade por último), com o padrão primeiro. */
function groupTemplates(templates: TemplateSummary[]): Group[] {
  const groups = new Map<string, Group>();
  for (const template of templates) {
    const key = template.specialtyId ?? "";
    const group = groups.get(key) ?? { name: template.specialtyName ?? "Sem especialidade", templates: [] };
    group.templates.push(template);
    groups.set(key, group);
  }
  const sorted = [...groups.entries()]
    .sort(([keyA, a], [keyB, b]) => {
      if (!keyA) return 1;
      if (!keyB) return -1;
      return a.name.localeCompare(b.name, "pt-BR");
    })
    .map(([, group]) => group);
  for (const group of sorted) {
    group.templates.sort(
      (a, b) => Number(b.isDefault) - Number(a.isDefault) || a.title.localeCompare(b.title, "pt-BR"),
    );
  }
  return sorted;
}

async function TemplateChooser() {
  const templates = await listTemplates();

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={FilePlus2}
        title="Você ainda não tem modelos"
        description="Para preencher uma anamnese, crie primeiro um modelo a partir de uma ficha."
        action={
          <Button asChild size="lg" className="h-10 rounded-xl px-4">
            <Link href="/modelos/novo">Criar modelo</Link>
          </Button>
        }
      />
    );
  }

  const groups = groupTemplates(templates);
  const showGroupNames = groups.length > 1 || Boolean(templates[0].specialtyId);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.name} className="flex flex-col gap-3">
          {showGroupNames ? (
            <h2 className="px-1 font-heading text-lg font-semibold tracking-tight">{group.name}</h2>
          ) : null}
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.templates.map((template) => (
              <li
                key={template.id}
                className={cn(
                  "glass flex flex-col gap-3 rounded-3xl p-5",
                  template.isDefault && "ring-1 ring-primary/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-base leading-snug font-semibold tracking-tight">
                    {template.title}
                  </h3>
                  {template.isDefault ? (
                    <Badge className="gap-1">
                      <Star aria-hidden />
                      Padrão
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {template.sectionCount} seções · {template.fieldCount} campos
                </p>
                <form action={createAnamnesis} className="mt-auto">
                  <input type="hidden" name="templateId" value={template.id} />
                  <StartButton primary={template.isDefault} />
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ChooserSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-40 rounded-3xl" />
      ))}
    </div>
  );
}
