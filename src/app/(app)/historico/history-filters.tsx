"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all";

type HistoryFiltersProps = {
  search: string;
  templateId: string;
  templates: { id: string; title: string }[];
};

/** Busca (com atraso) e filtro por modelo, guardados na URL. */
export function HistoryFilters({ search, templateId, templates }: HistoryFiltersProps) {
  const router = useRouter();
  const [text, setText] = useState(search);
  const [pending, startTransition] = useTransition();
  // Última busca enviada por aqui e último valor visto na URL: se a URL mudar
  // por fora (ex.: "Limpar filtros"), o campo acompanha.
  const [lastSent, setLastSent] = useState(search);
  const [seenSearch, setSeenSearch] = useState(search);
  if (search !== seenSearch) {
    setSeenSearch(search);
    if (search !== lastSent) {
      setLastSent(search);
      setText(search);
    }
  }

  function navigate(nextSearch: string, nextTemplate: string) {
    setLastSent(nextSearch.trim());
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("q", nextSearch.trim());
    if (nextTemplate) params.set("modelo", nextTemplate);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `/historico?${query}` : "/historico", { scroll: false });
    });
  }

  useEffect(() => {
    if (text.trim() === search) return;
    const timer = window.setTimeout(() => navigate(text, templateId), 350);
    return () => window.clearTimeout(timer);
    // navigate muda a cada render; o que importa é o texto digitado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row" role="search">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Buscar por título ou paciente"
          aria-label="Buscar anamneses"
          maxLength={100}
          className="h-10 rounded-xl pr-9 pl-9"
        />
        {pending ? (
          <LoaderCircle
            className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : null}
      </div>
      <Select
        value={templateId || ALL}
        onValueChange={(value) => navigate(text, value === ALL ? "" : value)}
      >
        <SelectTrigger className="h-10! w-full rounded-xl px-3 sm:w-64" aria-label="Filtrar por modelo">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os modelos</SelectItem>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
