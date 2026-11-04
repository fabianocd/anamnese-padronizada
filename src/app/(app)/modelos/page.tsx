import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LayoutTemplate, Plus, Star } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listTemplates, type TemplateSummary } from "@/lib/data/templates";
import { TemplateActions } from "./template-actions";

export const metadata: Metadata = { title: "Modelos" };

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

export default function TemplatesPage() {
  return (
    <>
      <PageHeader
        title="Modelos"
        description="Fichas de anamnese padronizadas a partir dos seus PDFs ou fotos. Use um modelo para preencher novas anamneses."
        actions={
          <Button asChild size="lg" className="h-10 rounded-xl px-4">
            <Link href="/modelos/novo">
              <Plus aria-hidden />
              Novo modelo
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <TemplateList />
      </Suspense>
    </>
  );
}

async function TemplateList() {
  const templates = await listTemplates();

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={LayoutTemplate}
        title="Nenhum modelo ainda"
        description="Envie o PDF ou fotos de uma ficha de anamnese. A IA monta um rascunho das seções e campos, e você revisa antes de salvar."
        action={
          <Button asChild size="lg" className="h-10 rounded-xl px-4">
            <Link href="/modelos/novo">
              <Plus aria-hidden />
              Criar primeiro modelo
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </ul>
  );
}

function TemplateCard({ template }: { template: TemplateSummary }) {
  return (
    <li className="glass group relative flex flex-col gap-3 rounded-3xl p-5 transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 font-heading text-lg leading-snug font-semibold tracking-tight">
          {/* O link cobre o card inteiro; o menu de ações fica por cima. */}
          <Link
            href={`/modelos/${template.id}`}
            className="outline-none after:absolute after:inset-0 after:rounded-3xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {template.title}
          </Link>
        </h2>
        <div className="relative z-10 -mt-1 -mr-2">
          <TemplateActions id={template.id} title={template.title} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {template.specialtyName ? (
          <Badge variant="secondary">{template.specialtyName}</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Sem especialidade
          </Badge>
        )}
        {template.isDefault ? (
          <Badge className="gap-1">
            <Star aria-hidden />
            Padrão
          </Badge>
        ) : null}
      </div>

      <p className="mt-auto text-sm text-muted-foreground">
        {template.sectionCount} seções · {template.fieldCount} campos · atualizado em{" "}
        {dateFormatter.format(new Date(template.updatedAt))}
      </p>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-36 rounded-3xl" />
      ))}
    </div>
  );
}
