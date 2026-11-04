import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, History, Plus, SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listAnamneses,
  listTemplateOptions,
  type AnamnesisSummary,
} from "@/lib/data/anamneses";
import { AnamnesisActions } from "./anamnesis-actions";
import { HistoryFilters } from "./history-filters";

export const metadata: Metadata = { title: "Histórico" };

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Filters = { search: string; templateId: string; page: number };

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function readFilters(params: Record<string, string | string[] | undefined>): Filters {
  const templateId = first(params.modelo);
  const page = Number.parseInt(first(params.pagina), 10);
  return {
    search: first(params.q).slice(0, 100),
    templateId: UUID.test(templateId) ? templateId : "",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

function pageHref(filters: Filters, page: number): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.templateId) params.set("modelo", filters.templateId);
  if (page > 1) params.set("pagina", String(page));
  const query = params.toString();
  return query ? `/historico?${query}` : "/historico";
}

export default function HistoryPage({ searchParams }: PageProps<"/historico">) {
  return (
    <>
      <PageHeader
        title="Histórico"
        description="Anamneses preenchidas. Busque pelo título ou pela identificação do paciente e filtre por modelo."
      />
      <Suspense fallback={<HistorySkeleton />}>
        {searchParams.then((params) => (
          <HistoryContent filters={readFilters(params)} />
        ))}
      </Suspense>
    </>
  );
}

async function HistoryContent({ filters }: { filters: Filters }) {
  const [{ items, hasMore }, templates] = await Promise.all([
    listAnamneses(filters),
    listTemplateOptions(),
  ]);
  const filtering = Boolean(filters.search || filters.templateId);

  if (items.length === 0 && !filtering && filters.page === 1) {
    return (
      <EmptyState
        icon={History}
        title="Nenhuma anamnese preenchida"
        description="As anamneses que você preencher aparecem aqui."
        action={
          <Button asChild size="lg" className="h-10 rounded-xl px-4">
            <Link href="/anamneses/nova">
              <Plus aria-hidden />
              Nova anamnese
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <HistoryFilters
        search={filters.search}
        templateId={filters.templateId}
        templates={templates}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nada encontrado"
          description="Nenhuma anamnese corresponde à busca ou ao filtro escolhido."
          action={
            <Button asChild variant="outline" size="lg" className="h-10 rounded-xl px-4">
              <Link href="/historico">Limpar filtros</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <HistoryRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      {filters.page > 1 || hasMore ? (
        <nav className="flex items-center justify-between gap-2" aria-label="Páginas">
          {filters.page > 1 ? (
            <Button asChild variant="ghost" size="lg" className="h-10 rounded-xl px-3">
              <Link href={pageHref(filters, filters.page - 1)}>
                <ChevronLeft aria-hidden />
                Anteriores
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">Página {filters.page}</span>
          {hasMore ? (
            <Button asChild variant="ghost" size="lg" className="h-10 rounded-xl px-3">
              <Link href={pageHref(filters, filters.page + 1)}>
                Próximas
                <ChevronRight aria-hidden />
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}

function HistoryRow({ item }: { item: AnamnesisSummary }) {
  const complete = item.total > 0 && item.answered === item.total;
  return (
    <li className="glass relative flex items-center gap-3 rounded-2xl p-4 transition-shadow hover:shadow-lg">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="min-w-0 truncate font-heading text-base font-semibold tracking-tight">
            {/* O link cobre a linha inteira; o menu de ações fica por cima. */}
            <Link
              href={`/anamneses/${item.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
            >
              {item.title}
            </Link>
          </h2>
          {item.patientLabel ? <Badge variant="secondary">{item.patientLabel}</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {item.templateTitle ?? (item.templateId ? "Modelo" : "Modelo excluído")} ·{" "}
          <span className={complete ? "text-primary" : undefined}>
            {item.answered === 0 ? "em branco" : `${item.answered}/${item.total} campos`}
          </span>{" "}
          · atualizada em {dateTimeFormatter.format(new Date(item.updatedAt))}
        </p>
      </div>
      <div className="relative z-10">
        <AnamnesisActions id={item.id} title={item.title} />
      </div>
    </li>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy>
      <Skeleton className="h-12 rounded-2xl" />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-20 rounded-2xl" />
      ))}
    </div>
  );
}
